import { pb, getPocketBaseUrl } from './pocketbaseClient';
import { db, isFirebaseConfigured, firebaseConfig } from './firebaseClient';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { safeStorage } from '../utils/safeStorage';
import { InventoryItem, Order, StoreLocation, Customer, StoreExpense } from '../types';
import { PurchaseOrder, PurchaseBill, StockTransfer, StoreStockIndent, Supplier } from '../types/warehouse';

export type SyncEngine = 'pocketbase' | 'firebase' | 'hybrid';
export type SyncStatus = 'connected' | 'connecting' | 'syncing' | 'offline' | 'error';

export interface CloudSyncState {
  status: SyncStatus;
  isLive: boolean;
  engine: SyncEngine;
  serverUrl: string;
  projectId?: string;
  databaseId?: string;
  lastSyncedAt: Date | null;
  itemsSynced: number;
  errorMessage?: string;
  activeListenersCount: number;
}

type SyncListener = (state: CloudSyncState) => void;

// Local storage keys to mirror
export const STORAGE_KEYS = {
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

// Collection Names
export const COLLECTIONS = {
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
  META: 'system_metadata',
};

class CloudSyncService {
  private state: CloudSyncState = {
    status: 'connecting',
    isLive: false,
    engine: 'firebase',
    serverUrl: isFirebaseConfigured() ? `Firestore (${firebaseConfig.projectId})` : getPocketBaseUrl(),
    projectId: firebaseConfig?.projectId,
    databaseId: firebaseConfig?.firestoreDatabaseId,
    lastSyncedAt: null,
    itemsSynced: 0,
    activeListenersCount: 0,
  };

  private listeners = new Set<SyncListener>();
  private unsubscribes: Array<() => void> = [];
  private isInitialized = false;
  private isApplyingRemoteUpdate = false;
  private isPocketBaseLive = false;
  private debounceTimers: Record<string, any> = {};
  private collectionDocsMap = new Map<string, Map<string, any>>();
  private pbIdMap = new Map<string, string>();
  private persistDebounceTimers: Record<string, any> = {};

  // External notification & cache hooks
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
        console.error('Error in sync status listener:', err);
      }
    });
  }

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
   * Initializes real-time synchronization.
   * Prioritizes Google Cloud Firestore bidirectional WebSockets for instant, zero-push real-time sync.
   * Also connects PocketBase in background if available for dual-cloud coverage.
   */
  public async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.setState({
      status: 'connecting',
      engine: isFirebaseConfigured() ? 'firebase' : 'pocketbase',
      serverUrl: isFirebaseConfigured()
        ? `Firestore: ${firebaseConfig.firestoreDatabaseId || firebaseConfig.projectId}`
        : getPocketBaseUrl(),
      projectId: firebaseConfig?.projectId,
      databaseId: firebaseConfig?.firestoreDatabaseId,
    });

    let firestoreConnected = false;

    // 1. Establish Google Cloud Firestore Real-Time Stream (WebSockets)
    if (isFirebaseConfigured() && db) {
      try {
        console.log('[CloudSync] Connecting Google Cloud Firestore Real-Time Engine...');
        this.setupFirestoreListeners();
        firestoreConnected = true;

        this.setState({
          status: 'connected',
          isLive: true,
          engine: 'firebase',
          serverUrl: `Firestore: ${firebaseConfig.firestoreDatabaseId || firebaseConfig.projectId}`,
          lastSyncedAt: new Date(),
          errorMessage: undefined,
        });
        console.log('[CloudSync] ✅ Firestore Real-Time listeners active across all store channels.');
      } catch (err: any) {
        console.warn('[CloudSync] Firestore initialization warning:', err);
      }
    }

    // 2. Background probe for PocketBase VPS (for secondary or dual synchronization)
    this.probePocketBase(firestoreConnected);
  }

  /**
   * Background probe for PocketBase
   */
  private async probePocketBase(firestoreAlreadyLive: boolean) {
    try {
      const candidateUrls = [
        getPocketBaseUrl(),
        typeof window !== 'undefined' ? window.location.origin : '',
        'http://187.126.115.40:8090',
        'http://187.126.115.40',
      ].filter((u): u is string => Boolean(u && u.trim()));

      const uniqueCandidates = Array.from(new Set(candidateUrls));
      let workingUrl: string | null = null;

      for (const testUrl of uniqueCandidates) {
        try {
          pb.baseUrl = testUrl;
          const health = await pb.health.check().catch(() => null);
          if (health && health.code === 200) {
            workingUrl = testUrl;
            break;
          }
        } catch {
          // Probe next
        }
      }

      if (workingUrl) {
        pb.baseUrl = workingUrl;
        this.isPocketBaseLive = true;
        console.log(`[CloudSync] PocketBase VPS connected at ${workingUrl}`);
        await this.setupPocketBaseListeners();

        this.setState({
          engine: firestoreAlreadyLive ? 'hybrid' : 'pocketbase',
          serverUrl: firestoreAlreadyLive
            ? `Firestore + VPS (${workingUrl})`
            : workingUrl,
          status: 'connected',
          isLive: true,
        });
      } else if (!firestoreAlreadyLive) {
        // If neither Firestore nor PocketBase is reachable
        this.setState({
          status: 'offline',
          isLive: false,
          errorMessage: 'Operating in local offline cache mode.',
        });
      }
    } catch {
      // Background probe failure is non-fatal when Firestore is live
    }
  }

  /**
   * Subscribes to real-time events on Firestore collections via onSnapshot
   * Every open window, device, store counter, and warehouse updates automatically without reload or push.
   */
  private setupFirestoreListeners() {
    if (!db) return;

    const bindFirestoreCollection = <T extends { id: string }>(
      collectionName: string,
      storageKey: string,
      isWarehouse = false
    ) => {
      try {
        let map = this.collectionDocsMap.get(collectionName);
        if (!map) {
          map = new Map<string, any>();
          this.collectionDocsMap.set(collectionName, map);
        }

        const colRef = collection(db, collectionName);
        let isFirstSnapshot = true;

        const unsubscribe: Unsubscribe = onSnapshot(
          colRef,
          { includeMetadataChanges: false },
          (snapshot) => {
            // If local pending write, our in-memory state is already updated
            if (snapshot.metadata.hasPendingWrites) {
              return;
            }

            if (snapshot.empty && isFirstSnapshot) {
              isFirstSnapshot = false;
              // If cloud database is fresh/empty on first visit, auto-seed from local data so cloud is populated
              const rawLocal = safeStorage.getItem(storageKey);
              if (rawLocal) {
                try {
                  const localItems: any[] = JSON.parse(rawLocal);
                  if (Array.isArray(localItems) && localItems.length > 0) {
                    console.log(`[CloudSync] Auto-seeding ${localItems.length} records to Firestore collection "${collectionName}"...`);
                    this.syncCollectionBatch(collectionName, localItems);
                  }
                } catch {}
              }
              return;
            }

            isFirstSnapshot = false;

            // Map all remote documents
            map!.clear();
            snapshot.docs.forEach((docSnap) => {
              const data = docSnap.data();
              const item = { ...data, id: data.id || docSnap.id };
              map!.set(String(item.id), item);
            });

            const remoteDocs = Array.from(map!.values()) as T[];
            this.applyRemoteUpdate(storageKey, remoteDocs, isWarehouse, snapshot.docChanges().length || 1);
          },
          (err) => {
            console.warn(`[CloudSync] Firestore real-time listener for ${collectionName}:`, err?.message || err);
          }
        );

        this.unsubscribes.push(unsubscribe);
      } catch (err) {
        console.warn(`[CloudSync] Error binding Firestore collection ${collectionName}:`, err);
      }
    };

    // Bind all 10 operational collections to Firestore
    bindFirestoreCollection<InventoryItem>(COLLECTIONS.INVENTORY, STORAGE_KEYS.INVENTORY, false);
    bindFirestoreCollection<Order>(COLLECTIONS.ORDERS, STORAGE_KEYS.ORDERS, false);
    bindFirestoreCollection<StoreLocation>(COLLECTIONS.STORES, STORAGE_KEYS.STORES, false);
    bindFirestoreCollection<Customer>(COLLECTIONS.CUSTOMERS, STORAGE_KEYS.CUSTOMERS, false);
    bindFirestoreCollection<StoreExpense>(COLLECTIONS.EXPENSES, STORAGE_KEYS.EXPENSES, false);
    bindFirestoreCollection<PurchaseOrder>(COLLECTIONS.PURCHASE_ORDERS, STORAGE_KEYS.PURCHASE_ORDERS, true);
    bindFirestoreCollection<PurchaseBill>(COLLECTIONS.INWARD_BILLS, STORAGE_KEYS.INWARD_BILLS, true);
    bindFirestoreCollection<StockTransfer>(COLLECTIONS.TRANSFERS, STORAGE_KEYS.TRANSFERS, true);
    bindFirestoreCollection<StoreStockIndent>(COLLECTIONS.INDENTS, STORAGE_KEYS.INDENTS, true);
    bindFirestoreCollection<Supplier>(COLLECTIONS.SUPPLIERS, STORAGE_KEYS.SUPPLIERS, true);

    this.setState({ activeListenersCount: this.unsubscribes.length });
  }

  /**
   * Subscribes to PocketBase SSE events (when PocketBase VPS is reachable)
   */
  private async setupPocketBaseListeners() {
    const bindPbCollection = async <T extends { id: string }>(
      collectionName: string,
      storageKey: string,
      isWarehouse = false
    ) => {
      try {
        let map = this.collectionDocsMap.get(collectionName);
        if (!map) {
          map = new Map<string, any>();
          this.collectionDocsMap.set(collectionName, map);
        }

        const unsubscribeFunc = await pb.collection(collectionName).subscribe('*', (e) => {
          const { action, record } = e;
          const appData = record.data ? { ...record.data, id: record.recordId || record.id } : record;
          const id = String(appData.id || record.id);

          if (action === 'delete') {
            map!.delete(id);
            this.pbIdMap.delete(`${collectionName}:${id}`);
          } else {
            map!.set(id, appData);
            this.pbIdMap.set(`${collectionName}:${id}`, record.id);
          }

          const remoteDocs = Array.from(map!.values()) as T[];
          this.applyRemoteUpdate(storageKey, remoteDocs, isWarehouse, 1);
        }).catch(() => () => {});

        if (unsubscribeFunc) {
          this.unsubscribes.push(unsubscribeFunc);
        }
      } catch {
        // PocketBase collection might not exist yet
      }
    };

    await bindPbCollection<InventoryItem>(COLLECTIONS.INVENTORY, STORAGE_KEYS.INVENTORY, false);
    await bindPbCollection<Order>(COLLECTIONS.ORDERS, STORAGE_KEYS.ORDERS, false);
    await bindPbCollection<StoreLocation>(COLLECTIONS.STORES, STORAGE_KEYS.STORES, false);
    await bindPbCollection<Customer>(COLLECTIONS.CUSTOMERS, STORAGE_KEYS.CUSTOMERS, false);
    await bindPbCollection<StoreExpense>(COLLECTIONS.EXPENSES, STORAGE_KEYS.EXPENSES, false);
    await bindPbCollection<PurchaseOrder>(COLLECTIONS.PURCHASE_ORDERS, STORAGE_KEYS.PURCHASE_ORDERS, true);
    await bindPbCollection<PurchaseBill>(COLLECTIONS.INWARD_BILLS, STORAGE_KEYS.INWARD_BILLS, true);
    await bindPbCollection<StockTransfer>(COLLECTIONS.TRANSFERS, STORAGE_KEYS.TRANSFERS, true);
    await bindPbCollection<StoreStockIndent>(COLLECTIONS.INDENTS, STORAGE_KEYS.INDENTS, true);
    await bindPbCollection<Supplier>(COLLECTIONS.SUPPLIERS, STORAGE_KEYS.SUPPLIERS, true);

    this.setState({ activeListenersCount: this.unsubscribes.length });
  }

  private applyRemoteUpdate(storageKey: string, remoteDocs: any[], isWarehouse: boolean, count: number) {
    this.isApplyingRemoteUpdate = true;
    try {
      let resolvedDocs = remoteDocs;
      if (storageKey === STORAGE_KEYS.INVENTORY && Array.isArray(remoteDocs)) {
        try {
          const rawLocal = safeStorage.getItem(STORAGE_KEYS.INVENTORY);
          if (rawLocal) {
            const localItems: any[] = JSON.parse(rawLocal);
            if (Array.isArray(localItems) && localItems.length > remoteDocs.length) {
              const remoteIdSet = new Set(remoteDocs.map((r: any) => String(r.id || r.sku)));
              const unSyncedLocal = localItems.filter(
                (loc) => loc && !remoteIdSet.has(String(loc.id)) && (!loc.sku || !remoteIdSet.has(String(loc.sku)))
              );
              if (unSyncedLocal.length > 0) {
                resolvedDocs = [...remoteDocs, ...unSyncedLocal];
              }
            }
          }
        } catch {
          // fallback to remoteDocs
        }
      }

      if (this.onStorageCacheUpdate) {
        this.onStorageCacheUpdate(storageKey, resolvedDocs);
      }
      if (isWarehouse && this.onWarehouseCacheUpdate) {
        this.onWarehouseCacheUpdate(storageKey, resolvedDocs);
      }

      this.scheduleStoragePersist(storageKey, resolvedDocs);

      if (isWarehouse) {
        this.onWarehouseChangeNotify?.();
      } else {
        this.onStorageChangeNotify?.();
      }

      this.setState({
        status: 'connected',
        isLive: true,
        lastSyncedAt: new Date(),
        itemsSynced: this.state.itemsSynced + count,
      });
    } finally {
      this.isApplyingRemoteUpdate = false;
    }
  }

  /**
   * Push a document to Firestore in real-time immediately when changed locally.
   * Completely non-blocking and automated: NO manual push button required!
   */
  public async syncDocument(collectionName: string, id: string, data: any) {
    if (this.isApplyingRemoteUpdate) return;

    try {
      const cleanId = String(id || Date.now()).trim().replace(/\//g, '_');
      const sanitized = JSON.parse(JSON.stringify(data));

      // 1. Update in-memory map
      const map = this.collectionDocsMap.get(collectionName);
      if (map) {
        map.set(cleanId, sanitized);
      }

      // 2. Real-Time Write to Google Cloud Firestore
      if (db) {
        const docRef = doc(db, collectionName, cleanId);
        setDoc(docRef, { ...sanitized, updatedAt: new Date().toISOString() }, { merge: true }).catch((err) => {
          console.warn(`[CloudSync] Firestore real-time sync warning for ${collectionName}/${cleanId}:`, err?.message || err);
        });
      }

      // 3. Optional sync to PocketBase if live
      if (this.isPocketBaseLive) {
        this.syncPocketBaseDoc(collectionName, cleanId, sanitized).catch(() => {});
      }

      this.setState({
        status: 'connected',
        isLive: true,
        lastSyncedAt: new Date(),
        itemsSynced: this.state.itemsSynced + 1,
      });
    } catch (err: any) {
      console.warn(`[CloudSync] Notice: Queued write locally for ${collectionName}:`, err?.message || err);
    }
  }

  /**
   * Internal PocketBase document sync
   */
  private async syncPocketBaseDoc(collectionName: string, cleanId: string, sanitized: any) {
    const mapKey = `${collectionName}:${cleanId}`;
    let pbId = this.pbIdMap.get(mapKey);

    if (pbId) {
      await pb.collection(collectionName).update(pbId, {
        recordId: cleanId,
        data: sanitized,
        updatedAt: new Date().toISOString(),
      }).catch(async () => {
        const created = await pb.collection(collectionName).create({
          recordId: cleanId,
          data: sanitized,
          updatedAt: new Date().toISOString(),
        });
        this.pbIdMap.set(mapKey, created.id);
      });
    } else {
      const created = await pb.collection(collectionName).create({
        recordId: cleanId,
        data: sanitized,
        updatedAt: new Date().toISOString(),
      }).catch(() => null);
      if (created) this.pbIdMap.set(mapKey, created.id);
    }
  }

  /**
   * Delete a single document from cloud database in real-time
   */
  public async deleteDocument(collectionName: string, id: string): Promise<boolean> {
    if (this.isApplyingRemoteUpdate) return false;

    try {
      const cleanId = String(id || '').trim().replace(/\//g, '_');
      if (!cleanId) return false;

      const map = this.collectionDocsMap.get(collectionName);
      if (map) {
        map.delete(cleanId);
      }

      // 1. Delete from Firestore
      if (db) {
        const docRef = doc(db, collectionName, cleanId);
        deleteDoc(docRef).catch((err) => {
          console.warn(`[CloudSync] Firestore delete warning for ${collectionName}/${cleanId}:`, err);
        });
      }

      // 2. Delete from PocketBase if live
      if (this.isPocketBaseLive) {
        const mapKey = `${collectionName}:${cleanId}`;
        const pbId = this.pbIdMap.get(mapKey);
        if (pbId) {
          pb.collection(collectionName).delete(pbId).catch(() => {});
          this.pbIdMap.delete(mapKey);
        }
      }

      return true;
    } catch (err: any) {
      console.warn(`[CloudSync] Document deletion error for ${collectionName}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Delete ALL records in a cloud collection and reset local cache
   */
  public async clearCollection(collectionName: string): Promise<{ deletedCount: number; success: boolean }> {
    try {
      let deletedCount = 0;

      // Clear memory map
      const map = this.collectionDocsMap.get(collectionName);
      if (map) {
        map.clear();
      }

      // 1. Delete from Firestore using writeBatch
      if (db) {
        try {
          const colRef = collection(db, collectionName);
          const snap = await getDocs(colRef).catch(() => null);
          if (snap && snap.docs.length > 0) {
            const batchSize = 350;
            for (let i = 0; i < snap.docs.length; i += batchSize) {
              const chunk = snap.docs.slice(i, i + batchSize);
              const batch = writeBatch(db);
              chunk.forEach((d) => batch.delete(d.ref));
              await batch.commit().catch(() => {});
              deletedCount += chunk.length;
            }
          }
        } catch (fErr) {
          console.warn(`[CloudSync] Firestore clear error for ${collectionName}:`, fErr);
        }
      }

      // 2. Delete from PocketBase if live
      if (this.isPocketBaseLive) {
        try {
          const records = await pb.collection(collectionName).getFullList({
            fields: 'id,recordId',
            requestKey: null,
          }).catch(() => []);
          for (const r of records) {
            await pb.collection(collectionName).delete(r.id).catch(() => {});
          }
        } catch {}
      }

      this.setState({
        status: 'connected',
        isLive: true,
        lastSyncedAt: new Date(),
      });

      return { deletedCount, success: true };
    } catch (err: any) {
      console.warn(`[CloudSync] Clear collection warning for ${collectionName}:`, err?.message || err);
      return { deletedCount: 0, success: false };
    }
  }

  /**
   * High-reliability batch sync with progress callback (ideal for Excel/CSV import)
   */
  public async syncCollectionBatch(
    collectionName: string,
    items: any[],
    onProgress?: (synced: number, total: number, percent: number) => void
  ): Promise<{ success: boolean; synced: number; error?: string }> {
    if (this.isApplyingRemoteUpdate || !items || items.length === 0) {
      return { success: true, synced: 0 };
    }

    try {
      this.setState({ status: 'syncing' });

      // Update in-memory map
      const map = this.collectionDocsMap.get(collectionName);
      if (map) {
        items.forEach((item) => {
          if (item && item.id) {
            map.set(String(item.id), item);
          }
        });
      }

      let synced = 0;
      const total = items.length;

      // 1. Transactional Firestore Batch Writing (chunks of 350)
      if (db) {
        const batchSize = 350;
        for (let i = 0; i < total; i += batchSize) {
          const chunk = items.slice(i, i + batchSize);
          const batch = writeBatch(db);
          chunk.forEach((item) => {
            if (item && item.id) {
              const cleanId = String(item.id).replace(/\//g, '_');
              const docRef = doc(db, collectionName, cleanId);
              const sanitized = JSON.parse(JSON.stringify(item));
              batch.set(docRef, { ...sanitized, updatedAt: new Date().toISOString() }, { merge: true });
            }
          });
          await batch.commit();
          synced += chunk.length;
          const percent = Math.min(100, Math.round((synced / total) * 100));
          onProgress?.(synced, total, percent);
        }
      } else {
        synced = total;
        onProgress?.(total, total, 100);
      }

      // 2. Sync to PocketBase in background if live
      if (this.isPocketBaseLive) {
        const pbBatchSize = 6;
        for (let i = 0; i < total; i += pbBatchSize) {
          const chunk = items.slice(i, i + pbBatchSize);
          await Promise.all(
            chunk.map(async (item) => {
              if (item && item.id) {
                await this.syncPocketBaseDoc(collectionName, String(item.id), item).catch(() => {});
              }
            })
          );
        }
      }

      this.setState({
        status: 'connected',
        isLive: true,
        lastSyncedAt: new Date(),
        itemsSynced: this.state.itemsSynced + synced,
      });

      return { success: true, synced };
    } catch (err: any) {
      console.warn(`[CloudSync] syncCollectionBatch error for ${collectionName}:`, err);
      return { success: false, synced: 0, error: err?.message };
    }
  }

  /**
   * Sync an entire collection in debounced batches
   */
  public debouncedSyncCollection(collectionName: string, items: any[], delay = 100) {
    if (this.isApplyingRemoteUpdate) return;

    if (this.debounceTimers[collectionName]) {
      clearTimeout(this.debounceTimers[collectionName]);
    }

    this.debounceTimers[collectionName] = setTimeout(async () => {
      try {
        await this.syncCollectionBatch(collectionName, items);
      } catch (err: any) {
        console.warn(`[CloudSync] Debounced sync for ${collectionName}:`, err?.message || err);
      }
    }, delay);
  }

  /**
   * Force Full Cloud Re-Sync: Pushes all local stores, products, orders, and expenses to cloud
   */
  public async uploadAllLocalData(): Promise<boolean> {
    try {
      this.setState({ status: 'syncing' });

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
      const customers = getLocalOrEmpty(STORAGE_KEYS.CUSTOMERS);
      const expenses = getLocalOrEmpty(STORAGE_KEYS.EXPENSES);
      const purchaseOrders = getLocalOrEmpty(STORAGE_KEYS.PURCHASE_ORDERS);
      const suppliers = getLocalOrEmpty(STORAGE_KEYS.SUPPLIERS);
      const inwardBills = getLocalOrEmpty(STORAGE_KEYS.INWARD_BILLS);
      const transfers = getLocalOrEmpty(STORAGE_KEYS.TRANSFERS);
      const indents = getLocalOrEmpty(STORAGE_KEYS.INDENTS);

      if (stores.length > 0) await this.syncCollectionBatch(COLLECTIONS.STORES, stores);
      if (inventory.length > 0) await this.syncCollectionBatch(COLLECTIONS.INVENTORY, inventory);
      if (suppliers.length > 0) await this.syncCollectionBatch(COLLECTIONS.SUPPLIERS, suppliers);
      if (orders.length > 0) await this.syncCollectionBatch(COLLECTIONS.ORDERS, orders);
      if (customers.length > 0) await this.syncCollectionBatch(COLLECTIONS.CUSTOMERS, customers);
      if (expenses.length > 0) await this.syncCollectionBatch(COLLECTIONS.EXPENSES, expenses);
      if (purchaseOrders.length > 0) await this.syncCollectionBatch(COLLECTIONS.PURCHASE_ORDERS, purchaseOrders);
      if (inwardBills.length > 0) await this.syncCollectionBatch(COLLECTIONS.INWARD_BILLS, inwardBills);
      if (transfers.length > 0) await this.syncCollectionBatch(COLLECTIONS.TRANSFERS, transfers);
      if (indents.length > 0) await this.syncCollectionBatch(COLLECTIONS.INDENTS, indents);

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
    this.unsubscribes.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.unsubscribes = [];
    this.isInitialized = false;
  }
}

export const cloudSync = new CloudSyncService();
