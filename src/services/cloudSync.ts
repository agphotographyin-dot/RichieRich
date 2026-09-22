import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  limit,
  onSnapshot,
  writeBatch,
  Unsubscribe,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, firebaseConfig } from './firebaseClient';
import { safeStorage } from '../utils/safeStorage';
import { InventoryItem, Order, StoreLocation, Customer, StoreExpense } from '../types';
import { PurchaseOrder, PurchaseBill, StockTransfer, StoreStockIndent, Supplier } from '../types/warehouse';

export type SyncStatus = 'connected' | 'connecting' | 'syncing' | 'offline' | 'error';

export interface CloudSyncState {
  status: SyncStatus;
  isLive: boolean;
  projectId: string;
  databaseId?: string;
  lastSyncedAt: Date | null;
  itemsSynced: number;
  errorMessage?: string;
  activeListenersCount: number;
}

type SyncListener = (state: CloudSyncState) => void;

// Local storage keys to mirror
const STORAGE_KEYS = {
  INVENTORY: 'rr_panhouse_inventory',
  ORDERS: 'rr_panhouse_orders',
  STORES: 'rr_panhouse_stores',
  CUSTOMERS: 'rr_panhouse_customers',
  EXPENSES: 'rr_panhouse_store_expenses',
  PURCHASE_ORDERS: 'wh_purchase_orders',
  INWARD_BILLS: 'wh_inward_bills',
  TRANSFERS: 'wh_stock_transfers',
  INDENTS: 'wh_store_indents',
  SUPPLIERS: 'wh_suppliers',
};

// Cloud Firestore Collection Names
const COLLECTIONS = {
  INVENTORY: 'inventory',
  ORDERS: 'orders',
  STORES: 'stores',
  CUSTOMERS: 'customers',
  EXPENSES: 'store_expenses',
  PURCHASE_ORDERS: 'purchase_orders',
  INWARD_BILLS: 'inward_bills',
  TRANSFERS: 'stock_transfers',
  INDENTS: 'store_indents',
  SUPPLIERS: 'suppliers',
  META: '_system_metadata',
};

class CloudSyncService {
  private state: CloudSyncState = {
    status: 'connecting',
    isLive: false,
    projectId: firebaseConfig?.projectId || '',
    databaseId: firebaseConfig?.firestoreDatabaseId,
    lastSyncedAt: null,
    itemsSynced: 0,
    activeListenersCount: 0,
  };

  private listeners = new Set<SyncListener>();
  private unsubscribes: Unsubscribe[] = [];
  private isInitialized = false;
  private isApplyingRemoteUpdate = false;
  private debounceTimers: Record<string, any> = {};
  private collectionDocsMap = new Map<string, Map<string, any>>();
  private persistDebounceTimers: Record<string, any> = {};

  // External notification & cache hooks (injected to prevent circular imports)
  private onStorageChangeNotify?: () => void;
  private onWarehouseChangeNotify?: () => void;
  private onStorageCacheUpdate?: (key: string, val: any) => void;
  private onWarehouseCacheUpdate?: (key: string, val: any) => void;

  public registerNotifiers(storageNotify: () => void, warehouseNotify: () => void) {
    this.onStorageChangeNotify = storageNotify;
    this.onWarehouseChangeNotify = warehouseNotify;
  }

  public registerCacheUpdaters(
    storageUpdater: (key: string, val: any) => void,
    warehouseUpdater: (key: string, val: any) => void
  ) {
    this.onStorageCacheUpdate = storageUpdater;
    this.onWarehouseCacheUpdate = warehouseUpdater;
  }

  public subscribe(cb: SyncListener): () => void {
    this.listeners.add(cb);
    cb(this.state);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public getState(): CloudSyncState {
    return { ...this.state };
  }

  private setState(updates: Partial<CloudSyncState>) {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach((cb) => {
      try {
        cb(this.state);
      } catch (err) {
        console.error('Error in cloud sync status listener:', err);
      }
    });
  }

  /**
   * Schedules non-blocking asynchronous writing to localStorage in background,
   * avoiding synchronous freezes on the main UI thread during large sync events.
   */
  private scheduleStoragePersist(storageKey: string, docs: any[]) {
    if (this.persistDebounceTimers[storageKey]) {
      clearTimeout(this.persistDebounceTimers[storageKey]);
    }
    this.persistDebounceTimers[storageKey] = setTimeout(() => {
      try {
        safeStorage.setItem(storageKey, JSON.stringify(docs));
      } catch (err) {
        console.warn(`[CloudSync] Background persist error for ${storageKey}:`, err);
      }
    }, 60);
  }

  /**
   * Initializes real-time Firestore listeners and performs first-time seeding if DB is empty
   */
  public async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (!isFirebaseConfigured() || !db) {
      this.setState({
        status: 'offline',
        isLive: false,
        errorMessage: 'Firestore not configured. Using local offline storage.',
      });
      return;
    }

    try {
      this.setState({ status: 'connecting' });

      // 1. Ultra-fast check with limit(1) to test if Firestore has data without downloading thousands of items
      const invSnap = await getDocs(query(collection(db, COLLECTIONS.INVENTORY), limit(1)));
      if (invSnap.empty) {
        console.log('[CloudSync] Firestore is fresh. Seeding initial baseline data...');
        await this.seedBaselineData();
      }

      // 2. Setup Real-time Snapshots on all major operational collections
      this.setupRealtimeListeners();

      this.setState({
        status: 'connected',
        isLive: true,
        lastSyncedAt: new Date(),
        errorMessage: undefined,
      });
      console.log('[CloudSync] Real-time Cloud Firestore synchronization active.');
    } catch (err: any) {
      console.warn('[CloudSync] Realtime initialization error (falling back to local):', err);
      this.setState({
        status: 'error',
        isLive: false,
        errorMessage: err?.message || 'Failed to connect to Cloud Firestore',
      });
    }
  }

  /**
   * Listen to remote collection changes in real time with delta processing
   */
  private setupRealtimeListeners() {
    if (!db) return;

    // Clean any prior listeners
    this.unsubscribes.forEach((unsub) => unsub());
    this.unsubscribes = [];

    // Helper to bind a collection
    const bindCollection = <T extends { id: string }>(
      collectionName: string,
      storageKey: string,
      isWarehouse = false
    ) => {
      if (!db) return;
      const colRef = collection(db, collectionName);
      let isFirstSnapshot = true;

      const unsub = onSnapshot(
        colRef,
        { includeMetadataChanges: false },
        (snapshot) => {
          // If this snapshot contains local pending writes from this client,
          // our optimistic in-memory state already has it. Skip to prevent echoing.
          if (snapshot.metadata.hasPendingWrites) {
            return;
          }

          if (snapshot.empty && !isFirstSnapshot) return;

          let map = this.collectionDocsMap.get(collectionName);
          if (!map) {
            map = new Map<string, any>();
            this.collectionDocsMap.set(collectionName, map);
          }

          if (isFirstSnapshot) {
            isFirstSnapshot = false;
            // Initial load: populate map with all documents
            map.clear();
            snapshot.forEach((docSnap) => {
              const data = docSnap.data();
              const id = String(data.id || docSnap.id);
              map!.set(id, data);
            });
          } else {
            // Real-time delta update: ONLY process changed, added, or removed docs (sub-millisecond O(1))
            const changes = snapshot.docChanges();
            if (changes.length === 0) return;

            for (const change of changes) {
              const data = change.doc.data();
              const id = String(data.id || change.doc.id);
              if (change.type === 'removed') {
                map.delete(id);
              } else {
                map.set(id, data);
              }
            }
          }

          const remoteDocs = Array.from(map.values()) as T[];

          this.isApplyingRemoteUpdate = true;
          try {
            // 1. Immediately update in-memory caches so getters return fresh data instantly
            if (this.onStorageCacheUpdate) {
              this.onStorageCacheUpdate(storageKey, remoteDocs);
            }
            if (isWarehouse && this.onWarehouseCacheUpdate) {
              this.onWarehouseCacheUpdate(storageKey, remoteDocs);
            }

            // 2. Schedule non-blocking async disk write in background
            this.scheduleStoragePersist(storageKey, remoteDocs);

            // 3. Immediately trigger UI subscribers (zero delay!)
            if (isWarehouse) {
              this.onWarehouseChangeNotify?.();
            } else {
              this.onStorageChangeNotify?.();
            }

            this.setState({
              status: 'connected',
              isLive: true,
              lastSyncedAt: new Date(),
              itemsSynced: this.state.itemsSynced + (isFirstSnapshot ? snapshot.size : snapshot.docChanges().length),
            });
          } finally {
            this.isApplyingRemoteUpdate = false;
          }
        },
        (error) => {
          console.warn(`[CloudSync] Error listening to ${collectionName}:`, error);
          this.setState({ status: 'error', errorMessage: error.message });
        }
      );

      this.unsubscribes.push(unsub);
    };

    // Bind real-time collections
    bindCollection<InventoryItem>(COLLECTIONS.INVENTORY, STORAGE_KEYS.INVENTORY, false);
    bindCollection<Order>(COLLECTIONS.ORDERS, STORAGE_KEYS.ORDERS, false);
    bindCollection<StoreLocation>(COLLECTIONS.STORES, STORAGE_KEYS.STORES, false);
    bindCollection<Customer>(COLLECTIONS.CUSTOMERS, STORAGE_KEYS.CUSTOMERS, false);
    bindCollection<PurchaseOrder>(COLLECTIONS.PURCHASE_ORDERS, STORAGE_KEYS.PURCHASE_ORDERS, true);
    bindCollection<PurchaseBill>(COLLECTIONS.INWARD_BILLS, STORAGE_KEYS.INWARD_BILLS, true);
    bindCollection<StockTransfer>(COLLECTIONS.TRANSFERS, STORAGE_KEYS.TRANSFERS, true);
    bindCollection<StoreStockIndent>(COLLECTIONS.INDENTS, STORAGE_KEYS.INDENTS, true);
    bindCollection<Supplier>(COLLECTIONS.SUPPLIERS, STORAGE_KEYS.SUPPLIERS, true);

    this.setState({ activeListenersCount: this.unsubscribes.length });
  }

  /**
   * Push a document to Firestore in real-time immediately when changed locally
   */
  public async syncDocument(collectionName: string, id: string, data: any) {
    if (!isFirebaseConfigured() || !db || this.isApplyingRemoteUpdate) return;

    try {
      const cleanId = String(id || Date.now());
      const docRef = doc(db, collectionName, cleanId);

      // Clean undefined values for Firestore
      const sanitized = JSON.parse(JSON.stringify(data));

      // Optimistically update internal collection map
      const map = this.collectionDocsMap.get(collectionName);
      if (map) {
        map.set(cleanId, sanitized);
      }

      await setDoc(docRef, { ...sanitized, _updatedAt: serverTimestamp() }, { merge: true });

      this.setState({
        status: 'connected',
        isLive: true,
        lastSyncedAt: new Date(),
      });
    } catch (err: any) {
      console.warn(`[CloudSync] Failed to sync document to ${collectionName}:`, err);
    }
  }

  /**
   * Sync an entire collection in debounced batches
   */
  public debouncedSyncCollection(collectionName: string, items: any[], delay = 50) {
    if (!isFirebaseConfigured() || !db || this.isApplyingRemoteUpdate) return;

    if (this.debounceTimers[collectionName]) {
      clearTimeout(this.debounceTimers[collectionName]);
    }

    this.debounceTimers[collectionName] = setTimeout(async () => {
      try {
        const batch = writeBatch(db!);
        // Limit to top 250 items per batch to stay safely within Firestore batch limits
        const slice = items.slice(0, 250);
        for (const item of slice) {
          if (!item || !item.id) continue;
          const ref = doc(db!, collectionName, String(item.id));
          const sanitized = JSON.parse(JSON.stringify(item));
          batch.set(ref, sanitized, { merge: true });
        }
        await batch.commit();

        this.setState({
          status: 'connected',
          isLive: true,
          lastSyncedAt: new Date(),
        });
      } catch (err: any) {
        console.warn(`[CloudSync] Batch sync error for ${collectionName}:`, err);
        this.setState({ status: 'error', errorMessage: err.message });
      }
    }, delay);
  }

  /**
   * Seed baseline initial data if database is fresh
   */
  private async seedBaselineData() {
    if (!db) return;

    try {
      const getLocalOrEmpty = (key: string) => {
        try {
          const raw = safeStorage.getItem(key);
          return raw ? JSON.parse(raw) : [];
        } catch {
          return [];
        }
      };

      const inventory = getLocalOrEmpty(STORAGE_KEYS.INVENTORY);
      const stores = getLocalOrEmpty(STORAGE_KEYS.STORES);
      const orders = getLocalOrEmpty(STORAGE_KEYS.ORDERS);
      const purchaseOrders = getLocalOrEmpty(STORAGE_KEYS.PURCHASE_ORDERS);
      const suppliers = getLocalOrEmpty(STORAGE_KEYS.SUPPLIERS);

      const batch = writeBatch(db);

      // Seed stores
      for (const store of stores) {
        if (store.id) {
          batch.set(doc(db, COLLECTIONS.STORES, String(store.id)), store, { merge: true });
        }
      }

      // Seed inventory
      for (const item of inventory) {
        if (item.id) {
          batch.set(doc(db, COLLECTIONS.INVENTORY, String(item.id)), item, { merge: true });
        }
      }

      // Seed suppliers
      for (const sup of suppliers) {
        if (sup.id) {
          batch.set(doc(db, COLLECTIONS.SUPPLIERS, String(sup.id)), sup, { merge: true });
        }
      }

      // Seed recent POs
      for (const po of purchaseOrders) {
        if (po.id) {
          batch.set(doc(db, COLLECTIONS.PURCHASE_ORDERS, String(po.id)), po, { merge: true });
        }
      }

      // Seed recent orders
      for (const ord of orders.slice(-30)) {
        if (ord.id) {
          batch.set(doc(db, COLLECTIONS.ORDERS, String(ord.id)), ord, { merge: true });
        }
      }

      // Meta doc
      batch.set(doc(db, COLLECTIONS.META, 'sync_info'), {
        initializedAt: serverTimestamp(),
        appName: 'Richie Rich Pan House ERP & POS',
        version: '1.0.0',
        projectId: firebaseConfig.projectId,
      });

      await batch.commit();
      console.log('[CloudSync] Initial baseline dataset seeded to Cloud Firestore successfully.');
    } catch (seedErr) {
      console.error('[CloudSync] Seed error:', seedErr);
    }
  }

  /**
   * Manual trigger: Full Push to Cloud
   */
  public async uploadAllLocalData(): Promise<boolean> {
    if (!db) return false;
    try {
      this.setState({ status: 'syncing' });
      await this.seedBaselineData();
      this.setState({ status: 'connected', lastSyncedAt: new Date(), isLive: true });
      return true;
    } catch (err: any) {
      this.setState({ status: 'error', errorMessage: err?.message });
      return false;
    }
  }

  /**
   * Clean up on unmount
   */
  public destroy() {
    this.unsubscribes.forEach((unsub) => unsub());
    this.unsubscribes = [];
    this.isInitialized = false;
  }
}

export const cloudSync = new CloudSyncService();
