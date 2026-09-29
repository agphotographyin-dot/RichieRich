import { pb, getPocketBaseUrl, setCustomPocketBaseUrl, DEFAULT_VPS_IP } from './pocketbaseClient';
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

export type SyncEngine = 'vps_stream' | 'pocketbase' | 'firebase' | 'hybrid' | 'offline';
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
  SYNC_QUEUE: 'rr_offline_sync_queue',
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

// Mapping collections to storage keys
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

class UniversalRealtimeSyncService {
  private state: CloudSyncState = {
    status: 'connecting',
    isLive: false,
    engine: 'vps_stream',
    serverUrl: getPocketBaseUrl() || DEFAULT_VPS_IP,
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
  private clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Connections
  private sseEventSource: EventSource | null = null;
  private isPocketBaseActive = false;
  private isVPSActive = false;
  private isFirestoreActive = false;
  private isFirestoreQuotaExceeded = false;
  private activeVpsBaseUrl = '';

  // Internal memory caches & debounce timers
  private collectionDocsMap = new Map<string, Map<string, any>>();
  private persistDebounceTimers: Record<string, any> = {};
  private collectionDebounceTimers: Record<string, any> = {};
  private reconnectTimeout: any = null;

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

  /**
   * Initializes real-time synchronization.
   * LOCAL-FIRST & ZERO LOAD TIME: Returns immediately in 0ms without blocking UI.
   * Background asynchronous probe connects to VPS Real-Time Stream, PocketBase, and Firestore.
   */
  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Pre-populate memory maps from local storage for instant 0ms access
    this.seedMemoryFromLocalStorage();

    // Start background sync asynchronously without blocking
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.connectAllEngines();
      }, 50);
    }
  }

  /**
   * Seed in-memory map from fast local storage
   */
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
   * Non-blocking background connection to all real-time transports
   */
  private async connectAllEngines() {
    // 1. First priority: Direct VPS Real-Time Server (Unlimited Credits, <5ms latency)
    const vpsConnected = await this.connectVPSStream();

    // 2. Parallel check: PocketBase Real-Time SSE
    if (!vpsConnected) {
      await this.connectPocketBase();
    }

    // 3. Dual-Cloud fallback: Google Cloud Firestore (if configured)
    if (isFirebaseConfigured() && db) {
      this.connectFirestore();
    }

    // 4. Update combined engine status
    this.updateEngineStatus();

    // 5. Drain any queued offline writes
    this.drainOfflineQueue();
  }

  /**
   * Connect to VPS Real-Time Stream (Server-Sent Events)
   */
  private async connectVPSStream(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return false;

    const baseCandidates = [
      getPocketBaseUrl(),
      DEFAULT_VPS_IP,
      window.location ? window.location.origin : '',
      'http://187.126.115.40',
      'http://187.126.115.40:8090',
    ].filter((u): u is string => Boolean(u && u.trim()));

    const uniqueCandidates = Array.from(new Set(baseCandidates)).map((u) => u.replace(/\/+$/, ''));

    for (const testUrl of uniqueCandidates) {
      try {
        // Fast ping with 2.5s timeout (never hangs)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const healthRes = await fetch(`${testUrl}/api/health`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        }).catch(() => null);
        clearTimeout(timeoutId);

        if (healthRes && healthRes.ok) {
          this.activeVpsBaseUrl = testUrl;
          this.setupVpsEventSource(testUrl);
          this.isVPSActive = true;
          console.log(`[CloudSync] ✅ Connected to VPS Real-Time Hub at ${testUrl}`);
          return true;
        }
      } catch {
        // Try next candidate
      }
    }

    return false;
  }

  /**
   * Setup EventSource SSE listener for instant VPS updates
   */
  private setupVpsEventSource(baseUrl: string) {
    if (this.sseEventSource) {
      try {
        this.sseEventSource.close();
      } catch {}
      this.sseEventSource = null;
    }

    try {
      const streamUrl = `${baseUrl}/api/sync/events`;
      this.sseEventSource = new EventSource(streamUrl);

      this.sseEventSource.onopen = () => {
        this.isVPSActive = true;
        this.updateEngineStatus();
      };

      this.sseEventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (!payload) return;

          // Ignore own broadcasts
          if (payload.senderId && payload.senderId === this.clientId) return;

          const { collection: colName, action, data } = payload;
          if (!colName || !COLLECTION_STORAGE_MAP[colName]) return;

          const { storageKey, isWarehouse } = COLLECTION_STORAGE_MAP[colName];
          let map = this.collectionDocsMap.get(colName);
          if (!map) {
            map = new Map<string, any>();
            this.collectionDocsMap.set(colName, map);
          }

          if (action === 'delete') {
            if (data && data.id) {
              map.delete(String(data.id));
            }
          } else if (action === 'batch' && Array.isArray(data)) {
            data.forEach((item) => {
              if (item && item.id) map!.set(String(item.id), item);
            });
          } else if (data && (data.id || data.sku)) {
            const id = String(data.id || data.sku);
            map.set(id, data);
          }

          const remoteDocs = Array.from(map.values());
          this.applyRemoteUpdate(storageKey, remoteDocs, isWarehouse, 1);
        } catch (err) {
          console.warn('[CloudSync] Error parsing VPS event stream:', err);
        }
      };

      this.sseEventSource.onerror = () => {
        this.isVPSActive = false;
        this.updateEngineStatus();
        // EventSource automatically attempts auto-reconnect
      };
    } catch (err) {
      console.warn('[CloudSync] VPS EventSource initialization:', err);
    }
  }

  /**
   * PocketBase Real-Time connection fallback
   */
  private async connectPocketBase(): Promise<boolean> {
    try {
      const targetUrl = getPocketBaseUrl() || DEFAULT_VPS_IP;
      pb.baseUrl = targetUrl;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const health = await pb.health.check({ signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);

      if (health && health.code === 200) {
        this.isPocketBaseActive = true;
        this.activeVpsBaseUrl = targetUrl;
        console.log(`[CloudSync] ✅ PocketBase connected at ${targetUrl}`);
        this.bindPocketBaseSubscriptions();
        return true;
      }
    } catch {}
    return false;
  }

  /**
   * Subscribes to PocketBase collections
   */
  private async bindPocketBaseSubscriptions() {
    const bindCollection = async (colName: string, storageKey: string, isWarehouse: boolean) => {
      try {
        const unsub = await pb.collection(colName).subscribe('*', (e) => {
          const { action, record } = e;
          const appData = record.data ? { ...record.data, id: record.recordId || record.id } : record;
          const id = String(appData.id || record.id);

          let map = this.collectionDocsMap.get(colName);
          if (!map) {
            map = new Map<string, any>();
            this.collectionDocsMap.set(colName, map);
          }

          if (action === 'delete') {
            map.delete(id);
          } else {
            map.set(id, appData);
          }

          const remoteDocs = Array.from(map.values());
          this.applyRemoteUpdate(storageKey, remoteDocs, isWarehouse, 1);
        }).catch(() => null);

        if (unsub) {
          this.unsubscribes.push(unsub);
        }
      } catch {}
    };

    for (const [colName, info] of Object.entries(COLLECTION_STORAGE_MAP)) {
      bindCollection(colName, info.storageKey, info.isWarehouse);
    }
  }

  /**
   * Firestore real-time onSnapshot listeners
   */
  private connectFirestore() {
    if (!db || this.isFirestoreActive) return;
    this.isFirestoreActive = true;

    const bindCollection = (colName: string, storageKey: string, isWarehouse: boolean) => {
      try {
        const colRef = collection(db!, colName);
        const unsub: Unsubscribe = onSnapshot(
          colRef,
          { includeMetadataChanges: false },
          (snapshot) => {
            if (snapshot.metadata.hasPendingWrites) return;

            let map = this.collectionDocsMap.get(colName);
            if (!map) {
              map = new Map<string, any>();
              this.collectionDocsMap.set(colName, map);
            }

            snapshot.docs.forEach((docSnap) => {
              const data = docSnap.data();
              const item = { ...data, id: data.id || docSnap.id };
              map!.set(String(item.id), item);
            });

            const remoteDocs = Array.from(map!.values());
            this.applyRemoteUpdate(storageKey, remoteDocs, isWarehouse, snapshot.docChanges().length || 1);
          },
          (err) => {
            console.warn(`[CloudSync] Firestore listener notice for ${colName}:`, err?.message || err);
          }
        );
        this.unsubscribes.push(unsub);
      } catch (err) {
        console.warn(`[CloudSync] Firestore bind error for ${colName}:`, err);
      }
    };

    for (const [colName, info] of Object.entries(COLLECTION_STORAGE_MAP)) {
      bindCollection(colName, info.storageKey, info.isWarehouse);
    }
  }

  /**
   * Merge remote updates into local memory & UI in 0ms
   */
  private applyRemoteUpdate(storageKey: string, remoteDocs: any[], isWarehouse: boolean, count: number) {
    this.isApplyingRemoteUpdate = true;
    try {
      let resolvedDocs = remoteDocs;

      // Preserve local inventory changes if remote catalog is smaller
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
        console.warn(`[CloudSync] Local persist notice for ${storageKey}:`, err);
      }
    }, 50);
  }

  private updateEngineStatus() {
    let engine: SyncEngine = 'offline';
    let status: SyncStatus = 'offline';
    let serverUrl = this.activeVpsBaseUrl || getPocketBaseUrl() || DEFAULT_VPS_IP;

    if (this.isVPSActive && this.isFirestoreActive) {
      engine = 'hybrid';
      status = 'connected';
      serverUrl = `VPS Hub (${this.activeVpsBaseUrl}) + Cloud Firestore`;
    } else if (this.isVPSActive) {
      engine = 'vps_stream';
      status = 'connected';
      serverUrl = `VPS Real-Time Hub (${this.activeVpsBaseUrl})`;
    } else if (this.isPocketBaseActive) {
      engine = 'pocketbase';
      status = 'connected';
      serverUrl = `PocketBase (${this.activeVpsBaseUrl})`;
    } else if (this.isFirestoreActive) {
      engine = 'firebase';
      status = 'connected';
      serverUrl = `Firestore (${firebaseConfig?.projectId || 'Google Cloud'})`;
    }

    this.setState({
      engine,
      status,
      isLive: status === 'connected',
      serverUrl,
      activeListenersCount: this.unsubscribes.length + (this.sseEventSource ? 1 : 0),
    });
  }

  /**
   * Sync a single document immediately across all devices in real time.
   * COMPLETELY NON-BLOCKING & AUTOMATIC: 0ms load time!
   */
  public async syncDocument(collectionName: string, id: string, data: any) {
    if (this.isApplyingRemoteUpdate) return;

    try {
      const cleanId = String(id || Date.now()).trim().replace(/\//g, '_');
      const sanitized = JSON.parse(JSON.stringify(data));

      // 1. Update in-memory map instantly (0ms)
      let map = this.collectionDocsMap.get(collectionName);
      if (!map) {
        map = new Map<string, any>();
        this.collectionDocsMap.set(collectionName, map);
      }
      map.set(cleanId, sanitized);

      // 2. Dispatch to VPS Real-Time Server via fast non-blocking fetch
      const vpsUrl = this.activeVpsBaseUrl || getPocketBaseUrl() || DEFAULT_VPS_IP;
      fetch(`${vpsUrl.replace(/\/+$/, '')}/api/sync/${collectionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': this.clientId,
        },
        body: JSON.stringify({ ...sanitized, id: cleanId }),
      }).catch(() => {
        // If VPS fails, queue for retry
        this.queueOfflineDoc(collectionName, cleanId, sanitized, 'upsert');
      });

      // 3. Parallel write to Google Cloud Firestore (if active and quota available)
      if (db && !this.isFirestoreQuotaExceeded) {
        const docRef = doc(db, collectionName, cleanId);
        setDoc(docRef, { ...sanitized, updatedAt: new Date().toISOString() }, { merge: true }).catch((err) => {
          if (err?.code === 'resource-exhausted' || err?.message?.includes('RESOURCE_EXHAUSTED')) {
            this.isFirestoreQuotaExceeded = true;
            console.warn('[CloudSync] Firestore free daily quota reached. Switched 100% to VPS Real-Time Engine (Unlimited Credits).');
          }
        });
      }

      this.setState({
        status: 'connected',
        isLive: true,
        lastSyncedAt: new Date(),
        itemsSynced: this.state.itemsSynced + 1,
      });
    } catch (err: any) {
      console.warn(`[CloudSync] Notice for ${collectionName}:`, err?.message || err);
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

      // 1. Memory update
      const map = this.collectionDocsMap.get(collectionName);
      if (map) {
        map.delete(cleanId);
      }

      // 2. VPS Server delete
      const vpsUrl = this.activeVpsBaseUrl || getPocketBaseUrl() || DEFAULT_VPS_IP;
      fetch(`${vpsUrl.replace(/\/+$/, '')}/api/sync/${collectionName}/${cleanId}`, {
        method: 'DELETE',
        headers: { 'x-client-id': this.clientId },
      }).catch(() => {
        this.queueOfflineDoc(collectionName, cleanId, null, 'delete');
      });

      // 3. Firestore delete
      if (db) {
        const docRef = doc(db, collectionName, cleanId);
        deleteDoc(docRef).catch(() => {});
      }

      return true;
    } catch (err: any) {
      console.warn(`[CloudSync] Delete notice for ${collectionName}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Batch upsert collection (for CSV/Excel imports)
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

      // 1. VPS batch push (single high-performance HTTP call)
      const vpsUrl = this.activeVpsBaseUrl || getPocketBaseUrl() || DEFAULT_VPS_IP;
      fetch(`${vpsUrl.replace(/\/+$/, '')}/api/sync/batch/${collectionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': this.clientId,
        },
        body: JSON.stringify({ items }),
      }).catch(() => {});

      // 2. Firestore batch chunking (350 records per chunk)
      if (db && !this.isFirestoreQuotaExceeded) {
        const batchSize = 350;
        let synced = 0;
        for (let i = 0; i < total; i += batchSize) {
          const chunk = items.slice(i, i + batchSize);
          const batch = writeBatch(db);
          chunk.forEach((item) => {
            if (item && (item.id || item.sku)) {
              const cleanId = String(item.id || item.sku).replace(/\//g, '_');
              const docRef = doc(db!, collectionName, cleanId);
              batch.set(docRef, { ...item, updatedAt: new Date().toISOString() }, { merge: true });
            }
          });
          await batch.commit().catch((err) => {
            if (err?.code === 'resource-exhausted' || err?.message?.includes('RESOURCE_EXHAUSTED')) {
              this.isFirestoreQuotaExceeded = true;
            }
          });
          synced += chunk.length;
          onProgress?.(synced, total, Math.round((synced / total) * 100));
        }
      } else {
        onProgress?.(total, total, 100);
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
   * Upload all local records to cloud/VPS
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
   * Delete ALL records in a cloud collection and reset local cache
   */
  public async clearCollection(collectionName: string): Promise<{ deletedCount: number; success: boolean }> {
    try {
      const map = this.collectionDocsMap.get(collectionName);
      let count = 0;
      if (map) {
        count = map.size;
        map.clear();
      }

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
            }
          }
        } catch {}
      }

      this.setState({ status: 'connected', isLive: true, lastSyncedAt: new Date() });
      return { deletedCount: count, success: true };
    } catch {
      return { deletedCount: 0, success: false };
    }
  }

  /**
   * Dynamically update VPS / PocketBase server address and re-connect
   */
  public async reconnectWithServerUrl(newUrl?: string): Promise<boolean> {
    if (newUrl) {
      setCustomPocketBaseUrl(newUrl);
    }
    if (this.sseEventSource) {
      try {
        this.sseEventSource.close();
      } catch {}
      this.sseEventSource = null;
    }
    this.isVPSActive = false;
    this.isPocketBaseActive = false;

    this.setState({
      status: 'connecting',
      serverUrl: newUrl || getPocketBaseUrl() || DEFAULT_VPS_IP,
    });

    return await this.connectVPSStream();
  }

  // -------------------------------------------------------------
  // Offline Sync Queue Management
  // -------------------------------------------------------------
  private queueOfflineDoc(collectionName: string, id: string, data: any, action: 'upsert' | 'delete') {
    try {
      const rawQueue = safeStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      const queue: any[] = rawQueue ? JSON.parse(rawQueue) : [];
      queue.push({ collectionName, id, data, action, timestamp: Date.now() });
      // Keep queue manageable (last 500 items max)
      const trimmed = queue.slice(-500);
      safeStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(trimmed));
    } catch {}
  }

  private async drainOfflineQueue() {
    try {
      const rawQueue = safeStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      if (!rawQueue) return;
      const queue: any[] = JSON.parse(rawQueue);
      if (!Array.isArray(queue) || queue.length === 0) return;

      safeStorage.removeItem(STORAGE_KEYS.SYNC_QUEUE);
      console.log(`[CloudSync] Draining ${queue.length} offline queued records...`);

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
    if (this.sseEventSource) {
      try {
        this.sseEventSource.close();
      } catch {}
      this.sseEventSource = null;
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

export const cloudSync = new UniversalRealtimeSyncService();
