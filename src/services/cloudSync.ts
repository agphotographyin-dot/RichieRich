import { pb, getPocketBaseUrl, setCustomPocketBaseUrl, DEFAULT_POCKETBASE_URL } from './pocketbaseClient';
import { safeStorage } from '../utils/safeStorage';

export type SyncEngine = 'pocketbase' | 'offline';
export type SyncStatus = 'connected' | 'connecting' | 'syncing' | 'offline' | 'error';

export interface CloudSyncState {
  status: SyncStatus;
  isLive: boolean;
  engine: SyncEngine;
  serverUrl: string;
  lastSyncedAt: Date | null;
  itemsSynced: number;
  errorMessage?: string;
  activeListenersCount: number;
}

type SyncListener = (state: CloudSyncState) => void;

// Local storage keys mirrored by the sync engine
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
  SYNC_QUEUE: 'rr_pocketbase_sync_queue',
};

// PocketBase Collection Names
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

// Collection mapping to local storage keys
const COLLECTION_STORAGE_MAP: Record<string, { storageKey: string; isWarehouse: boolean }> = {
  [COLLECTIONS.INVENTORY]: { storageKey: STORAGE_KEYS.INVENTORY, isWarehouse: false },
  [COLLECTIONS.ORDERS]: { storageKey: STORAGE_KEYS.ORDERS, isWarehouse: false },
  [COLLECTIONS.STORES]: { storageKey: STORAGE_KEYS.STORES, isWarehouse: false },
  [COLLECTIONS.CUSTOMERS]: { storageKey: STORAGE_KEYS.CUSTOMERS, isWarehouse: false },
  [COLLECTIONS.EXPENSES]: { storageKey: STORAGE_KEYS.EXPENSES, isWarehouse: false },
  [COLLECTIONS.PURCHASE_ORDERS]: { storageKey: STORAGE_KEYS.PURCHASE_ORDERS, isWarehouse: true },
  [COLLECTIONS.INWARD_BILLS]: { storageKey: STORAGE_KEYS.INWARD_BILLS, isWarehouse: true },
  [COLLECTIONS.TRANSFERS]: { storageKey: STORAGE_KEYS.TRANSFERS, isWarehouse: true },
  [COLLECTIONS.INDENTS]: { storageKey: STORAGE_KEYS.INDENTS, isWarehouse: true },
  [COLLECTIONS.SUPPLIERS]: { storageKey: STORAGE_KEYS.SUPPLIERS, isWarehouse: true },
};

class PocketBaseRealtimeSyncService {
  private state: CloudSyncState = {
    status: 'connecting',
    isLive: false,
    engine: 'pocketbase',
    serverUrl: getPocketBaseUrl() || DEFAULT_POCKETBASE_URL,
    lastSyncedAt: null,
    itemsSynced: 0,
    activeListenersCount: 0,
  };

  private listeners = new Set<SyncListener>();
  private unsubscribes: Array<() => void> = [];
  private isInitialized = false;
  private isApplyingRemoteUpdate = false;
  private clientId = `pb_client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Memory map of records for zero-millisecond access
  private collectionDocsMap = new Map<string, Map<string, any>>();
  private persistDebounceTimers: Record<string, any> = {};
  private collectionDebounceTimers: Record<string, any> = {};

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
        console.error('Error in PocketBase sync status listener:', err);
      }
    });
  }

  /**
   * Initializes real-time synchronization with PocketBase.
   * Completely local-first: returns in 0ms without delaying UI.
   * Connects to PocketBase subscriptions in background.
   */
  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Seed memory maps from local storage for instant zero-latency access
    this.seedMemoryFromLocalStorage();

    // Start PocketBase connection in background
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.connectPocketBase();
      }, 50);
    }
  }

  private seedMemoryFromLocalStorage() {
    for (const [colName, info] of Object.entries(COLLECTION_STORAGE_MAP)) {
      let map = this.collectionDocsMap.get(colName);
      if (!map) {
        map = new Map<string, any>();
        this.collectionDocsMap.set(colName, map);
      }
      try {
        const raw = safeStorage.getItem(info.storageKey);
        if (raw) {
          const items: any[] = JSON.parse(raw);
          if (Array.isArray(items)) {
            items.forEach((item) => {
              if (item && (item.id || item.sku)) {
                map!.set(String(item.id || item.sku), item);
              }
            });
          }
        }
      } catch {}
    }
  }

  /**
   * Connect and subscribe to PocketBase real-time SSE stream
   */
  public async connectPocketBase(): Promise<boolean> {
    const targetUrl = getPocketBaseUrl() || DEFAULT_POCKETBASE_URL;
    pb.baseUrl = targetUrl;

    try {
      this.setState({ status: 'connecting', serverUrl: targetUrl });

      // Fast non-blocking health check
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const health = await pb.health.check({ signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);

      if (health && health.code === 200) {
        console.log(`[PocketBase] ✅ Connected to PocketBase server at ${targetUrl}`);
        await this.bindPocketBaseSubscriptions();
        this.setState({
          status: 'connected',
          isLive: true,
          engine: 'pocketbase',
          serverUrl: targetUrl,
          activeListenersCount: this.unsubscribes.length,
        });

        // Drain any offline writes that were queued
        this.drainOfflineQueue();
        return true;
      } else {
        this.setState({
          status: 'offline',
          isLive: false,
          serverUrl: targetUrl,
          errorMessage: 'PocketBase server not reachable on port 8090',
        });
        return false;
      }
    } catch (err: any) {
      this.setState({
        status: 'offline',
        isLive: false,
        serverUrl: targetUrl,
        errorMessage: err?.message || 'Connection failed',
      });
      return false;
    }
  }

  /**
   * Bind real-time subscriptions to all PocketBase collections
   */
  private async bindPocketBaseSubscriptions() {
    // Clean old subscriptions
    this.unsubscribes.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.unsubscribes = [];

    const subscribeOne = async (colName: string, storageKey: string, isWarehouse: boolean) => {
      try {
        const unsub = await pb.collection(colName).subscribe('*', (e) => {
          const { action, record } = e;
          // Ignore own dispatched messages
          if (record && record._senderId === this.clientId) return;

          const docData = record.data ? { ...record.data, id: record.recordId || record.id } : record;
          const id = String(docData.id || record.recordId || record.id);

          let map = this.collectionDocsMap.get(colName);
          if (!map) {
            map = new Map<string, any>();
            this.collectionDocsMap.set(colName, map);
          }

          if (action === 'delete') {
            map.delete(id);
          } else {
            map.set(id, docData);
          }

          const remoteDocs = Array.from(map.values());
          this.applyRemoteUpdate(storageKey, remoteDocs, isWarehouse, 1);
        }).catch((err) => {
          // If collection does not exist in PocketBase yet, silently ignore until created
          return null;
        });

        if (unsub) {
          this.unsubscribes.push(unsub);
        }
      } catch {}
    };

    for (const [colName, info] of Object.entries(COLLECTION_STORAGE_MAP)) {
      await subscribeOne(colName, info.storageKey, info.isWarehouse);
    }
  }

  /**
   * Merge remote updates into local memory & UI in 0ms
   */
  private applyRemoteUpdate(storageKey: string, remoteDocs: any[], isWarehouse: boolean, count: number) {
    this.isApplyingRemoteUpdate = true;
    try {
      let resolvedDocs = remoteDocs;

      // Preserve local inventory items if remote catalog is temporarily smaller
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
        } catch {}
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

  private scheduleStoragePersist(storageKey: string, docs: any[]) {
    if (this.persistDebounceTimers[storageKey]) {
      clearTimeout(this.persistDebounceTimers[storageKey]);
    }
    this.persistDebounceTimers[storageKey] = setTimeout(() => {
      try {
        safeStorage.setItem(storageKey, JSON.stringify(docs));
      } catch (err) {
        console.warn(`[PocketBase] Local persist notice for ${storageKey}:`, err);
      }
    }, 50);
  }

  /**
   * Sync a single document immediately across all POS devices via PocketBase.
   * LOCAL-FIRST & ZERO LOAD TIME: Updates memory and UI immediately, then syncs asynchronously.
   */
  public async syncDocument(collectionName: string, id: string, data: any) {
    if (this.isApplyingRemoteUpdate) return;

    try {
      const cleanId = String(id || Date.now()).trim().replace(/\//g, '_');
      const sanitized = JSON.parse(JSON.stringify(data));

      // 1. Instant local update (0ms)
      let map = this.collectionDocsMap.get(collectionName);
      if (!map) {
        map = new Map<string, any>();
        this.collectionDocsMap.set(collectionName, map);
      }
      map.set(cleanId, sanitized);

      // 2. Asynchronous push to PocketBase (non-blocking)
      this.pushToPocketBase(collectionName, cleanId, sanitized);

      this.setState({
        status: 'connected',
        isLive: true,
        lastSyncedAt: new Date(),
        itemsSynced: this.state.itemsSynced + 1,
      });
    } catch (err: any) {
      console.warn(`[PocketBase] Document sync notice for ${collectionName}:`, err?.message || err);
    }
  }

  private async pushToPocketBase(collectionName: string, docId: string, data: any) {
    try {
      const payload = {
        recordId: docId,
        data,
        _senderId: this.clientId,
        updatedAt: new Date().toISOString(),
      };

      // Try finding existing record in PocketBase
      const existing = await pb
        .collection(collectionName)
        .getFirstListItem(`recordId="${docId}"`)
        .catch(() => null);

      if (existing) {
        await pb.collection(collectionName).update(existing.id, payload).catch(() => null);
      } else {
        await pb.collection(collectionName).create(payload).catch(() => null);
      }
    } catch {
      // Offline fallback: queue for retry
      this.queueOfflineDoc(collectionName, docId, data, 'upsert');
    }
  }

  /**
   * Delete a single document in real time
   */
  public async deleteDocument(collectionName: string, id: string): Promise<boolean> {
    if (this.isApplyingRemoteUpdate) return false;

    try {
      const cleanId = String(id || '').trim().replace(/\//g, '_');
      if (!cleanId) return false;

      // 1. Instant local memory update
      const map = this.collectionDocsMap.get(collectionName);
      if (map) {
        map.delete(cleanId);
      }

      // 2. Asynchronous PocketBase delete
      pb.collection(collectionName)
        .getFirstListItem(`recordId="${cleanId}"`)
        .then((rec) => {
          if (rec) pb.collection(collectionName).delete(rec.id).catch(() => null);
        })
        .catch(() => {
          this.queueOfflineDoc(collectionName, cleanId, null, 'delete');
        });

      return true;
    } catch (err: any) {
      console.warn(`[PocketBase] Delete notice for ${collectionName}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Batch upload collection (e.g. initial inventory import or CSV seed)
   */
  public async syncCollectionBatch(
    collectionName: string,
    items: any[],
    onProgress?: (synced: number, total: number, percent: number) => void
  ): Promise<{ success: boolean; synced: number; error?: string }> {
    if (!items || items.length === 0) return { success: true, synced: 0 };

    try {
      this.setState({ status: 'syncing' });

      // Update in-memory map
      let map = this.collectionDocsMap.get(collectionName);
      if (!map) {
        map = new Map<string, any>();
        this.collectionDocsMap.set(collectionName, map);
      }
      items.forEach((item) => {
        if (item && (item.id || item.sku)) {
          map!.set(String(item.id || item.sku), item);
        }
      });

      const total = items.length;
      let synced = 0;

      // Asynchronous background upload to PocketBase in chunks
      for (const item of items) {
        if (item && (item.id || item.sku)) {
          const docId = String(item.id || item.sku);
          this.pushToPocketBase(collectionName, docId, item);
          synced++;
          if (synced % 20 === 0 || synced === total) {
            onProgress?.(synced, total, Math.round((synced / total) * 100));
          }
        }
      }

      this.setState({
        status: 'connected',
        isLive: true,
        lastSyncedAt: new Date(),
        itemsSynced: this.state.itemsSynced + total,
      });

      return { success: true, synced: total };
    } catch (err: any) {
      return { success: false, synced: 0, error: err?.message };
    }
  }

  public debouncedSyncCollection(collectionName: string, items: any[], delay = 100) {
    if (this.isApplyingRemoteUpdate) return;
    if (this.collectionDebounceTimers[collectionName]) {
      clearTimeout(this.collectionDebounceTimers[collectionName]);
    }
    this.collectionDebounceTimers[collectionName] = setTimeout(() => {
      this.syncCollectionBatch(collectionName, items);
    }, delay);
  }

  /**
   * Upload all local records to PocketBase
   */
  public async uploadAllLocalData(): Promise<boolean> {
    try {
      this.setState({ status: 'syncing' });

      for (const [colName, info] of Object.entries(COLLECTION_STORAGE_MAP)) {
        try {
          const raw = safeStorage.getItem(info.storageKey);
          if (raw) {
            const items = JSON.parse(raw);
            if (Array.isArray(items) && items.length > 0) {
              await this.syncCollectionBatch(colName, items);
            }
          }
        } catch {}
      }

      this.setState({ status: 'connected', lastSyncedAt: new Date(), isLive: true });
      return true;
    } catch (err: any) {
      this.setState({ status: 'error', errorMessage: err?.message });
      return false;
    }
  }

  /**
   * Reset / clear collection
   */
  public async clearCollection(collectionName: string): Promise<{ deletedCount: number; success: boolean }> {
    try {
      const map = this.collectionDocsMap.get(collectionName);
      let count = 0;
      if (map) {
        count = map.size;
        map.clear();
      }

      this.setState({ status: 'connected', isLive: true, lastSyncedAt: new Date() });
      return { deletedCount: count, success: true };
    } catch {
      return { deletedCount: 0, success: false };
    }
  }

  /**
   * Reconnect with custom PocketBase URL
   */
  public async reconnectWithServerUrl(newUrl?: string): Promise<boolean> {
    if (newUrl) {
      setCustomPocketBaseUrl(newUrl);
    }
    return await this.connectPocketBase();
  }

  // -------------------------------------------------------------
  // Offline Queue
  // -------------------------------------------------------------
  private queueOfflineDoc(collectionName: string, id: string, data: any, action: 'upsert' | 'delete') {
    try {
      const rawQueue = safeStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      const queue: any[] = rawQueue ? JSON.parse(rawQueue) : [];
      queue.push({ collectionName, id, data, action, timestamp: Date.now() });
      safeStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue.slice(-500)));
    } catch {}
  }

  private async drainOfflineQueue() {
    try {
      const rawQueue = safeStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      if (!rawQueue) return;
      const queue: any[] = JSON.parse(rawQueue);
      if (!Array.isArray(queue) || queue.length === 0) return;

      safeStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
      for (const item of queue) {
        if (item.action === 'upsert' && item.data) {
          await this.syncDocument(item.collectionName, item.id, item.data);
        } else if (item.action === 'delete') {
          await this.deleteDocument(item.collectionName, item.id);
        }
      }
    } catch {}
  }

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

export const cloudSync = new PocketBaseRealtimeSyncService();
