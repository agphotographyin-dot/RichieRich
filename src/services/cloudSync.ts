import {
  collection,
  doc,
  setDoc,
  getDocs,
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
  private isWritingToCloud = false;
  private isApplyingRemoteUpdate = false;
  private debounceTimers: Record<string, any> = {};

  // External notification hooks (injected from storage / warehouseStorage)
  private onStorageChangeNotify?: () => void;
  private onWarehouseChangeNotify?: () => void;

  public registerNotifiers(storageNotify: () => void, warehouseNotify: () => void) {
    this.onStorageChangeNotify = storageNotify;
    this.onWarehouseChangeNotify = warehouseNotify;
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

      // 1. Check if Firestore is already seeded with inventory
      const invSnap = await getDocs(collection(db, COLLECTIONS.INVENTORY));
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
   * Listen to remote collection changes in real time
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
      const unsub = onSnapshot(
        colRef,
        (snapshot) => {
          if (this.isWritingToCloud) return; // Prevent echoing local optimistic writes

          // If snapshot is empty, don't wipe out local defaults on initial sync
          if (snapshot.empty) return;

          const remoteDocs: T[] = [];
          snapshot.forEach((docSnap) => {
            remoteDocs.push(docSnap.data() as T);
          });

          this.isApplyingRemoteUpdate = true;
          try {
            // Save to browser cache
            safeStorage.setItem(storageKey, JSON.stringify(remoteDocs));
            
            // Notify UI subscribers
            if (isWarehouse) {
              this.onWarehouseChangeNotify?.();
            } else {
              this.onStorageChangeNotify?.();
            }

            this.setState({
              status: 'connected',
              isLive: true,
              lastSyncedAt: new Date(),
              itemsSynced: this.state.itemsSynced + snapshot.docChanges().length,
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
   * Push a document to Firestore in real-time when changed locally
   */
  public async syncDocument(collectionName: string, id: string, data: any) {
    if (!isFirebaseConfigured() || !db || this.isApplyingRemoteUpdate) return;

    try {
      this.isWritingToCloud = true;
      const cleanId = String(id || Date.now());
      const docRef = doc(db, collectionName, cleanId);
      
      // Clean undefined values for Firestore
      const sanitized = JSON.parse(JSON.stringify(data));
      await setDoc(docRef, { ...sanitized, _updatedAt: serverTimestamp() }, { merge: true });

      this.setState({
        status: 'connected',
        lastSyncedAt: new Date(),
      });
    } catch (err: any) {
      console.warn(`[CloudSync] Failed to sync document to ${collectionName}:`, err);
    } finally {
      this.isWritingToCloud = false;
    }
  }

  /**
   * Sync an entire collection in debounced batches
   */
  public debouncedSyncCollection(collectionName: string, items: any[], delay = 300) {
    if (!isFirebaseConfigured() || !db || this.isApplyingRemoteUpdate) return;

    if (this.debounceTimers[collectionName]) {
      clearTimeout(this.debounceTimers[collectionName]);
    }

    this.debounceTimers[collectionName] = setTimeout(async () => {
      try {
        this.isWritingToCloud = true;
        this.setState({ status: 'syncing' });

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
      } finally {
        this.isWritingToCloud = false;
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
