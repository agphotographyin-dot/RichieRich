import {
  pb,
  getPocketBaseUrl,
  getCandidatePocketBaseUrls,
  setCustomPocketBaseUrl,
  DEFAULT_POCKETBASE_URL,
} from './pocketbaseClient';
import { safeStorage } from '../utils/safeStorage';

export type SyncEngine = 'pocketbase';
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

class PocketBaseTwoWayRealtimeSyncService {
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
  private reconnectTimer: any = null;
  private clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // In-memory document map for instant zero-latency UI access
  private collectionDocsMap = new Map<string, Map<string, any>>();
  private persistDebounceTimers: Record<string, any> = {};

  // UI change notification hooks
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
   * Initializes two-way real-time sync with PocketBase.
   * Local-First: returns immediately (0ms) so the UI loads instantly.
   */
  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.seedMemoryFromLocalStorage();

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
   * Schedules an automatic reconnection attempt if disconnected
   */
  private scheduleReconnect(delay = 5000) {
    if (this.reconnectTimer || !this.isInitialized) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.isInitialized && !this.state.isLive) {
        this.connectPocketBase();
      }
    }, delay);
  }

  /**
   * Connect to PocketBase and establish bidirectional real-time streaming
   */
  public async connectPocketBase(): Promise<boolean> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const candidateUrls = getCandidatePocketBaseUrls();
    const primaryUrl = getPocketBaseUrl() || DEFAULT_POCKETBASE_URL;

    try {
      this.setState({ status: 'connecting', serverUrl: primaryUrl });

      // Find the first responding healthy PocketBase endpoint among candidates
      let connectedUrl = '';
      for (const candidate of candidateUrls) {
        pb.baseUrl = candidate;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const health = await pb.health.check({ signal: controller.signal }).catch(() => null);
          clearTimeout(timeoutId);
          if (health && health.code === 200) {
            connectedUrl = candidate;
            break;
          }
        } catch {
          // Continue to next candidate
        }
      }

      if (connectedUrl) {
        pb.baseUrl = connectedUrl;

        // 1. Bind Real-Time Inbound Subscriptions (Server -> Device)
        await this.bindPocketBaseSubscriptions();

        // 2. Perform initial background two-way state reconciliation
        this.performTwoWayReconciliation();

        this.setState({
          status: 'connected',
          isLive: true,
          engine: 'pocketbase',
          serverUrl: connectedUrl,
          activeListenersCount: this.unsubscribes.length,
          errorMessage: undefined,
        });

        // 3. Drain any pending offline queue items
        this.drainOfflineQueue();
        return true;
      } else {
        // Fall back to primary target URL for subsequent retry attempts
        pb.baseUrl = primaryUrl;
        this.setState({
          status: 'offline',
          isLive: false,
          serverUrl: primaryUrl,
          errorMessage: 'PocketBase server not reachable on configured port',
        });
        this.scheduleReconnect(5000);
        return false;
      }
    } catch (err: any) {
      this.setState({
        status: 'offline',
        isLive: false,
        serverUrl: primaryUrl,
        errorMessage: err?.message || 'Connection failed',
      });
      this.scheduleReconnect(5000);
      return false;
    }
  }

  /**
   * INBOUND SYNC: Real-time SSE stream from Server -> Device
   * Whenever ANY counter, terminal, or admin changes a record in PocketBase,
   * it is pushed here instantly and updates the UI in <10ms.
   */
  private async bindPocketBaseSubscriptions() {
    this.unsubscribes.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.unsubscribes = [];

    // Hook onto PB_CONNECT event to verify EventSource handshake
    try {
      const unsubConnect = await pb.realtime.subscribe('PB_CONNECT', (e) => {
        const activeClientId = e?.clientId || pb.realtime.clientId || this.clientId;
        this.setState({
          status: 'connected',
          isLive: true,
          errorMessage: undefined,
        });
      }).catch(() => null);

      if (unsubConnect) {
        this.unsubscribes.push(unsubConnect);
      }
    } catch {}

    // Hook onto realtime onDisconnect to automatically handle connection loss
    pb.realtime.onDisconnect = (activeSubscriptions) => {
      console.warn('[PocketBase] Realtime EventSource disconnected. Active subs:', activeSubscriptions?.length);
      this.setState({
        status: 'connecting',
        isLive: false,
        errorMessage: 'Realtime event source connection lost. Reconnecting...',
      });
      this.scheduleReconnect(3000);
    };

    const subscribeCollection = async (colName: string, storageKey: string, isWarehouse: boolean) => {
      try {
        const unsub = await pb.collection(colName).subscribe('*', (e) => {
          const { action, record } = e;
          if (!record) return;

          let docData = record.data;
          if (typeof docData === 'string') {
            try {
              docData = JSON.parse(docData);
            } catch {}
          }
          if (!docData || typeof docData !== 'object') {
            docData = { ...record };
          }

          // Ignore own outbound echo messages to prevent loops
          if (
            (record._senderId && record._senderId === this.clientId) ||
            (docData._senderId && docData._senderId === this.clientId)
          ) {
            return;
          }

          const id = String(docData.id || record.recordId || record.id || (docData as any).sku);

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
          this.applyRemoteUpdate(storageKey, remoteDocs, isWarehouse);
        }).catch((err) => {
          console.warn(`[PocketBase] Subscribe note for collection ${colName}:`, err?.message || err);
          return null;
        });

        if (unsub) {
          this.unsubscribes.push(unsub);
        }
      } catch {}
    };

    for (const [colName, info] of Object.entries(COLLECTION_STORAGE_MAP)) {
      await subscribeCollection(colName, info.storageKey, info.isWarehouse);
    }
  }

  /**
   * Initial Bi-Directional Reconciliation:
   * 1. Pulls existing server records and merges into local cache
   * 2. Pushes local records that are not yet on the server
   */
  public async performTwoWayReconciliation(): Promise<void> {
    for (const [colName, info] of Object.entries(COLLECTION_STORAGE_MAP)) {
      try {
        // A. Pull from Server (Server -> Device)
        const serverRecords = await pb.collection(colName).getFullList({ requestKey: null }).catch(() => null);

        let map = this.collectionDocsMap.get(colName);
        if (!map) {
          map = new Map<string, any>();
          this.collectionDocsMap.set(colName, map);
        }

        if (Array.isArray(serverRecords) && serverRecords.length > 0) {
          serverRecords.forEach((record: any) => {
            const docData = record.data ? { ...record.data, id: record.recordId || record.id } : record;
            const id = String(docData.id || record.recordId || record.id);
            map!.set(id, docData);
          });
          const merged = Array.from(map.values());
          this.applyRemoteUpdate(info.storageKey, merged, info.isWarehouse);
        }

        // B. Push Local-Only Records (Device -> Server)
        const localDocs = Array.from(map.values());
        if (localDocs.length > 0) {
          const serverDocIds = new Set(
            (serverRecords || []).map((r: any) => String(r.recordId || r.id))
          );
          for (const doc of localDocs) {
            const docId = String(doc.id || doc.sku);
            if (!serverDocIds.has(docId)) {
              this.pushToPocketBase(colName, docId, doc);
            }
          }
        }
      } catch {}
    }

    this.setState({
      status: 'connected',
      isLive: true,
      lastSyncedAt: new Date(),
    });
  }

  private applyRemoteUpdate(storageKey: string, remoteDocs: any[], isWarehouse: boolean) {
    this.isApplyingRemoteUpdate = true;
    try {
      let resolvedDocs = remoteDocs;

      // Ensure local inventory items aren't overwritten if remote is empty
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

      // Synchronously persist to local storage before notifying UI to eliminate race conditions
      try {
        safeStorage.setItem(storageKey, JSON.stringify(resolvedDocs));
      } catch (err) {
        console.warn(`[PocketBase] Local persist note for ${storageKey}:`, err);
      }

      if (isWarehouse) {
        this.onWarehouseChangeNotify?.();
      } else {
        this.onStorageChangeNotify?.();
      }

      // Cross-tab realtime bus broadcast to ensure all views/counters sync in zero milliseconds
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bus = new BroadcastChannel('richie_rich_sync_bus');
          bus.postMessage({
            type: isWarehouse ? 'WAREHOUSE_STATE_CHANGED' : 'STATE_CHANGED',
            key: storageKey,
            val: resolvedDocs,
            timestamp: Date.now(),
          });
          bus.close();
        } catch {}
      }

      this.setState({
        status: 'connected',
        isLive: true,
        lastSyncedAt: new Date(),
        itemsSynced: this.state.itemsSynced + 1,
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
        console.warn(`[PocketBase] Local persist note for ${storageKey}:`, err);
      }
    }, 50);
  }

  /**
   * OUTBOUND SYNC: Device -> Server
   * Called immediately whenever a sales order is completed, inventory is updated,
   * an expense is recorded, or stock is transferred.
   */
  public async syncDocument(collectionName: string, id: string, data: any) {
    if (this.isApplyingRemoteUpdate) return;

    try {
      const cleanId = String(id || Date.now()).trim().replace(/\//g, '_');
      const sanitized = JSON.parse(JSON.stringify(data));

      // 1. Instant local memory update (0ms)
      let map = this.collectionDocsMap.get(collectionName);
      if (!map) {
        map = new Map<string, any>();
        this.collectionDocsMap.set(collectionName, map);
      }
      map.set(cleanId, sanitized);

      // 2. Asynchronous push to PocketBase
      this.pushToPocketBase(collectionName, cleanId, sanitized);

      this.setState({
        status: 'connected',
        isLive: true,
        lastSyncedAt: new Date(),
        itemsSynced: this.state.itemsSynced + 1,
      });
    } catch (err: any) {
      console.warn(`[PocketBase] Outbound sync note:`, err?.message);
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

      const existing = await pb
        .collection(collectionName)
        .getFirstListItem(`recordId="${docId}"`, { requestKey: null })
        .catch(() => null);

      if (existing) {
        await pb.collection(collectionName).update(existing.id, payload, { requestKey: null }).catch(() => null);
      } else {
        await pb.collection(collectionName).create(payload, { requestKey: null }).catch(() => null);
      }
    } catch {
      this.queueOfflineDoc(collectionName, docId, data, 'upsert');
    }
  }

  /**
   * OUTBOUND DELETE: Device -> Server
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

      pb.collection(collectionName)
        .getFirstListItem(`recordId="${cleanId}"`, { requestKey: null })
        .then((rec) => {
          if (rec) pb.collection(collectionName).delete(rec.id, { requestKey: null }).catch(() => null);
        })
        .catch(() => {
          this.queueOfflineDoc(collectionName, cleanId, null, 'delete');
        });

      return true;
    } catch {
      return false;
    }
  }

  public async syncCollectionBatch(
    collectionName: string,
    items: any[],
    onProgress?: (synced: number, total: number, percent: number) => void
  ): Promise<{ success: boolean; synced: number }> {
    if (!items || items.length === 0) return { success: true, synced: 0 };

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
  }

  public debouncedSyncCollection(collectionName: string, items: any[], delay = 100) {
    if (this.isApplyingRemoteUpdate) return;
    setTimeout(() => {
      this.syncCollectionBatch(collectionName, items);
    }, delay);
  }

  /**
   * Upload all local records to PocketBase and pull any missing records
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

      await this.performTwoWayReconciliation();

      this.setState({ status: 'connected', lastSyncedAt: new Date(), isLive: true });
      return true;
    } catch (err: any) {
      this.setState({ status: 'error', errorMessage: err?.message });
      return false;
    }
  }

  public async clearCollection(collectionName: string): Promise<{ deletedCount: number; success: boolean }> {
    const map = this.collectionDocsMap.get(collectionName);
    let count = 0;
    if (map) {
      count = map.size;
      map.clear();
    }
    return { deletedCount: count, success: true };
  }

  public async reconnectWithServerUrl(newUrl?: string): Promise<boolean> {
    if (newUrl) {
      setCustomPocketBaseUrl(newUrl);
    }
    return await this.connectPocketBase();
  }

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

  /**
   * Returns whether the PocketBase realtime EventSource connection is live
   */
  public isRealtimeConnected(): boolean {
    return this.state.isLive && (pb as any)?.realtime?.isConnected === true;
  }

  /**
   * Returns the count of active PocketBase collection subscriptions
   */
  public getActiveSubscriptionsCount(): number {
    return this.unsubscribes.length;
  }

  public destroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if ((pb as any)?.realtime) {
      (pb as any).realtime.onDisconnect = undefined;
    }
    this.unsubscribes.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.unsubscribes = [];
    this.isInitialized = false;
  }
}

export const cloudSync = new PocketBaseTwoWayRealtimeSyncService();
