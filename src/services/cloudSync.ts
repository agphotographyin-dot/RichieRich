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
  autoFetchIntervalSeconds: number;
  nextAutoFetchAt: Date | null;
}

type SyncListener = (state: CloudSyncState) => void;

// Local storage keys mirrored by the sync engine
export const STORAGE_KEYS = {
  INVENTORY: 'rr_panhouse_inventory',
  ORDERS: 'rr_panhouse_orders',
  STORES: 'rr_panhouse_stores',
  CUSTOMERS: 'rr_panhouse_customers',
  EXPENSES: 'rr_panhouse_store_expenses',
  PURCHASE_ORDERS: 'rr_wh_purchase_orders',
  INWARD_BILLS: 'rr_wh_purchase_bills',
  TRANSFERS: 'rr_wh_transfers',
  INDENTS: 'rr_wh_indents',
  SUPPLIERS: 'rr_wh_suppliers',
  SUPPLIER_LEDGER: 'rr_wh_supplier_ledger',
  AUDIT_TRAIL: 'rr_wh_audit_trail',
  BATCHES: 'rr_wh_batches',
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
  SUPPLIER_LEDGER: 'supplier_ledger',
  AUDIT_TRAIL: 'stock_audit_trail',
  BATCHES: 'warehouse_batches',
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
  [COLLECTIONS.SUPPLIER_LEDGER]: { storageKey: STORAGE_KEYS.SUPPLIER_LEDGER, isWarehouse: true },
  [COLLECTIONS.AUDIT_TRAIL]: { storageKey: STORAGE_KEYS.AUDIT_TRAIL, isWarehouse: true },
  [COLLECTIONS.BATCHES]: { storageKey: STORAGE_KEYS.BATCHES, isWarehouse: true },
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
    autoFetchIntervalSeconds: 0,
    nextAutoFetchAt: null,
  };

  private listeners = new Set<SyncListener>();
  private unsubscribes: Array<() => void> = [];
  private isInitialized = false;
  private isApplyingRemoteUpdate = false;
  private reconnectTimer: any = null;
  private autoFetchIntervalSeconds = 0;
  private autoFetchTimer: any = null;
  private nextAutoFetchAt: Date | null = null;
  private onVisibilityChangeHandler?: () => void;
  private clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // In-memory document map for instant zero-latency UI access
  private collectionDocsMap = new Map<string, Map<string, any>>();
  private persistDebounceTimers: Record<string, any> = {};
  private collectionSyncDebounceTimers: Record<string, any> = {};
  private debouncedCommitTimers: Record<string, any> = {};
  private lastPushedHashes = new Map<string, string>();

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

    // Load persisted auto-fetch interval preference (default: 30 seconds)
    try {
      const savedInterval = safeStorage.getItem('rr_pb_auto_fetch_sec');
      if (savedInterval !== null) {
        const parsed = parseInt(savedInterval, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          this.autoFetchIntervalSeconds = parsed;
        }
      }
    } catch {}

    this.state.autoFetchIntervalSeconds = this.autoFetchIntervalSeconds;

    // Migrate any legacy warehouse storage keys into standard rr_wh_* keys
    try {
      const legacyKeyMap: Record<string, string> = {
        'wh_stock_transfers': 'rr_wh_transfers',
        'wh_store_indents': 'rr_wh_indents',
        'wh_purchase_orders': 'rr_wh_purchase_orders',
        'wh_inward_bills': 'rr_wh_purchase_bills',
        'wh_suppliers': 'rr_wh_suppliers',
      };
      for (const [oldKey, newKey] of Object.entries(legacyKeyMap)) {
        const oldVal = safeStorage.getItem(oldKey);
        const newVal = safeStorage.getItem(newKey);
        if (oldVal && (!newVal || newVal === '[]')) {
          safeStorage.setItem(newKey, oldVal);
        }
      }
    } catch {}

    this.seedMemoryFromLocalStorage();

    // Reconcile immediately when tab regains visibility (if idle for >10s)
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.onVisibilityChangeHandler = () => {
        if (document.visibilityState === 'visible' && this.state.isLive) {
          const now = Date.now();
          const last = this.state.lastSyncedAt?.getTime() || 0;
          if (now - last > 10000) {
            this.performTwoWayReconciliation().catch(() => null);
          }
        }
      };
      document.addEventListener('visibilitychange', this.onVisibilityChangeHandler);
    }

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

        // 4. Start periodic background auto-fetch cycle (heartbeat safety-net)
        this.startAutoFetchLoop();
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
   * Two-Way Server Reconciliation:
   * Pulls existing server records and updates local state.
   * If server collection is empty or records are deleted on server, local state is synchronized cleanly.
   */
  public async performTwoWayReconciliation(): Promise<void> {
    for (const [colName, info] of Object.entries(COLLECTION_STORAGE_MAP)) {
      try {
        const serverRecords = await pb.collection(colName).getFullList({ requestKey: null }).catch(() => null);

        if (Array.isArray(serverRecords)) {
          const newMap = new Map<string, any>();
          serverRecords.forEach((record: any) => {
            const docData = record.data ? { ...record.data, id: record.recordId || record.id } : record;
            const id = String(docData.id || record.recordId || record.id || (docData as any).sku);
            newMap.set(id, docData);
          });
          this.collectionDocsMap.set(colName, newMap);

          const syncedDocs = Array.from(newMap.values());
          this.applyRemoteUpdate(info.storageKey, syncedDocs, info.isWarehouse);
        }
      } catch {}
    }

    this.setState({
      status: 'connected',
      isLive: true,
      lastSyncedAt: new Date(),
    });
  }

  private fastItemHash(item: any): string {
    if (!item) return '';
    if (typeof item === 'object') {
      try {
        return JSON.stringify(item);
      } catch {
        const id = item.id || item.sku || item.transferNumber || item.poNumber || item.billNumber || '';
        const outstanding = item.currentOutstanding !== undefined ? item.currentOutstanding : '';
        const due = item.dueAmount !== undefined ? item.dueAmount : '';
        const paid = item.paidAmount !== undefined ? item.paidAmount : (item.totalPaid !== undefined ? item.totalPaid : '');
        const payStatus = item.paymentStatus || '';
        const stock = item.stockQuantity !== undefined ? item.stockQuantity : '';
        const lastMod = item.lastStockChange || item.updatedAt || item.lastUpdated || '';
        return `${id}_${lastMod}_${outstanding}_${due}_${paid}_${payStatus}_${stock}`;
      }
    }
    return String(item);
  }

  private applyRemoteUpdate(storageKey: string, remoteDocs: any[], isWarehouse: boolean) {
    this.isApplyingRemoteUpdate = true;
    try {
      let resolvedDocs = Array.isArray(remoteDocs) ? remoteDocs : [];

      // Normalize remote documents by collection type to guarantee reliable numbers
      if (Array.isArray(resolvedDocs)) {
        if (storageKey === STORAGE_KEYS.INWARD_BILLS) {
          resolvedDocs = resolvedDocs.map((b: any) => ({
            ...b,
            id: b.id || `pb-${Date.now()}`,
            billNumber: b.billNumber || 'PB-RECORD',
            supplierName: b.supplierName || 'Unknown Supplier',
            supplierInvoiceNo: b.supplierInvoiceNo || 'N/A',
            warehouseName: b.warehouseName || 'Central Warehouse',
            grandTotal: Number(b.grandTotal) || 0,
            dueAmount: Number(b.dueAmount) || 0,
            paidAmount: Number(b.paidAmount) || 0,
            subtotal: Number(b.subtotal) || 0,
            gstAmount: Number(b.gstAmount) || 0,
            paymentStatus: b.paymentStatus || (Number(b.dueAmount) > 0 ? 'due' : 'paid'),
            grnStatus: b.grnStatus || 'verified_stocked',
            items: Array.isArray(b.items)
              ? b.items.map((it: any) => ({
                  ...it,
                  sku: it.sku || 'SKU',
                  name: it.name || 'Product',
                  quantity: Number(it.quantity) || 1,
                  unitCost: Number(it.unitCost) || 0,
                  totalCost: Number(it.totalCost) || 0,
                }))
              : [],
          }));
        } else if (storageKey === STORAGE_KEYS.PURCHASE_ORDERS) {
          resolvedDocs = resolvedDocs.map((po: any) => ({
            ...po,
            id: po.id || `po-${Date.now()}`,
            poNumber: po.poNumber || 'PO-RECORD',
            supplierName: po.supplierName || 'Supplier',
            status: po.status || 'approved',
            grandTotal: Number(po.grandTotal) || 0,
            subtotal: Number(po.subtotal) || 0,
            taxTotal: Number(po.taxTotal) || 0,
            freightCharge: Number(po.freightCharge) || 0,
            items: Array.isArray(po.items)
              ? po.items.map((it: any) => ({
                  ...it,
                  sku: it.sku || 'SKU',
                  name: it.name || 'Product',
                  quantityOrdered: Number(it.quantityOrdered) || 1,
                  quantityReceived: Number(it.quantityReceived) || 0,
                  unitPrice: Number(it.unitPrice) || 0,
                  totalAmount: Number(it.totalAmount) || 0,
                }))
              : [],
          }));
        } else if (storageKey === STORAGE_KEYS.SUPPLIERS) {
          resolvedDocs = resolvedDocs.map((s: any) => ({
            ...s,
            currentOutstanding: Number(s.currentOutstanding) || 0,
            totalPurchases: Number(s.totalPurchases) || 0,
            totalPaid: Number(s.totalPaid) || 0,
          }));
        } else if (storageKey === STORAGE_KEYS.SUPPLIER_LEDGER) {
          resolvedDocs = resolvedDocs.map((l: any) => ({
            ...l,
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            runningBalance: Number(l.runningBalance) || 0,
          }));
        }
      }

      // 1. Immediately update in-memory cache for zero-latency UI response
      if (this.onStorageCacheUpdate) {
        this.onStorageCacheUpdate(storageKey, resolvedDocs);
      }
      if (isWarehouse && this.onWarehouseCacheUpdate) {
        this.onWarehouseCacheUpdate(storageKey, resolvedDocs);
      }

      // 2. Debounce writing to local storage and notifying React subscribers (150ms buffer)
      // This eliminates DOM re-rendering freezes and heavy JSON serialization during bulk SSE streaming
      if (this.debouncedCommitTimers[storageKey]) {
        clearTimeout(this.debouncedCommitTimers[storageKey]);
      }
      this.debouncedCommitTimers[storageKey] = setTimeout(() => {
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

        // Cross-tab realtime bus broadcast
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
      }, 150);
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

      // 2. Asynchronous push to PocketBase with dirty tracking
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

  private async pushToPocketBase(collectionName: string, docId: string, data: any, knownNew = false) {
    const key = `${collectionName}:${docId}`;
    const hash = this.fastItemHash(data);

    // Skip if unchanged (0 network calls, 0 CPU load)
    if (!knownNew && this.lastPushedHashes.get(key) === hash) {
      return;
    }

    try {
      const payload = {
        recordId: docId,
        data,
        _senderId: this.clientId,
        updatedAt: new Date().toISOString(),
      };

      if (knownNew) {
        await pb.collection(collectionName).create(payload, { requestKey: null }).catch(() => null);
      } else {
        const existing = await pb
          .collection(collectionName)
          .getFirstListItem(`recordId="${docId}"`, { requestKey: null })
          .catch(() => null);

        if (existing) {
          await pb.collection(collectionName).update(existing.id, payload, { requestKey: null }).catch(() => null);
        } else {
          await pb.collection(collectionName).create(payload, { requestKey: null }).catch(() => null);
        }
      }

      this.lastPushedHashes.set(key, hash);
    } catch {
      this.queueOfflineDoc(collectionName, docId, data, 'upsert');
    }
  }

  private async throttledBatchPush(
    collectionName: string,
    items: any[],
    knownNew = false,
    onProgress?: (synced: number, total: number, percent: number) => void
  ): Promise<void> {
    const CONCURRENCY = 3;
    const total = items.length;
    let completed = 0;

    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const slice = items.slice(i, i + CONCURRENCY);
      await Promise.all(
        slice.map(async (item) => {
          const docId = String(item.id || item.sku);
          await this.pushToPocketBase(collectionName, docId, item, knownNew);
          completed++;
          if (completed % 15 === 0 || completed === total) {
            onProgress?.(completed, total, Math.round((completed / total) * 100));
          }
        })
      );

      // 15ms pause between concurrent slices yields the browser & Node.js event loop
      if (i + CONCURRENCY < items.length) {
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
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
      this.lastPushedHashes.delete(`${collectionName}:${cleanId}`);

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

    // Only process items that actually changed!
    const changedItems = items.filter((item) => {
      if (!item || (!item.id && !item.sku)) return false;
      const docId = String(item.id || item.sku);
      const key = `${collectionName}:${docId}`;
      const hash = this.fastItemHash(item);
      return this.lastPushedHashes.get(key) !== hash;
    });

    if (changedItems.length === 0) {
      return { success: true, synced: 0 };
    }

    await this.throttledBatchPush(collectionName, changedItems, false, onProgress);

    this.setState({
      status: 'connected',
      isLive: true,
      lastSyncedAt: new Date(),
      itemsSynced: this.state.itemsSynced + changedItems.length,
    });

    return { success: true, synced: changedItems.length };
  }

  public debouncedSyncCollection(collectionName: string, items: any[], delay = 150) {
    if (this.isApplyingRemoteUpdate) return;
    if (this.collectionSyncDebounceTimers[collectionName]) {
      clearTimeout(this.collectionSyncDebounceTimers[collectionName]);
    }
    this.collectionSyncDebounceTimers[collectionName] = setTimeout(() => {
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

  /**
   * Sets the periodic background auto-fetch interval in seconds (0 = disabled, real-time SSE only)
   */
  public setAutoFetchInterval(seconds: number) {
    this.autoFetchIntervalSeconds = Math.max(0, seconds);
    try {
      safeStorage.setItem('rr_pb_auto_fetch_sec', String(this.autoFetchIntervalSeconds));
    } catch {}
    this.startAutoFetchLoop();
  }

  /**
   * Gets current auto-fetch interval in seconds
   */
  public getAutoFetchInterval(): number {
    return this.autoFetchIntervalSeconds;
  }

  /**
   * Starts or updates the background periodic auto-fetch timer
   */
  public startAutoFetchLoop() {
    if (this.autoFetchTimer) {
      clearInterval(this.autoFetchTimer);
      this.autoFetchTimer = null;
    }

    if (this.autoFetchIntervalSeconds <= 0 || !this.state.isLive) {
      this.nextAutoFetchAt = null;
      this.setState({
        autoFetchIntervalSeconds: this.autoFetchIntervalSeconds,
        nextAutoFetchAt: null,
      });
      return;
    }

    const intervalMs = this.autoFetchIntervalSeconds * 1000;
    this.nextAutoFetchAt = new Date(Date.now() + intervalMs);
    this.setState({
      autoFetchIntervalSeconds: this.autoFetchIntervalSeconds,
      nextAutoFetchAt: this.nextAutoFetchAt,
    });

    this.autoFetchTimer = setInterval(async () => {
      if (!this.state.isLive) return;
      try {
        await this.performTwoWayReconciliation();
      } catch (err) {
        console.warn('[PocketBase] Periodic auto-fetch note:', err);
      } finally {
        if (this.autoFetchIntervalSeconds > 0) {
          this.nextAutoFetchAt = new Date(Date.now() + this.autoFetchIntervalSeconds * 1000);
          this.setState({ nextAutoFetchAt: this.nextAutoFetchAt });
        }
      }
    }, intervalMs);
  }

  public destroy() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.autoFetchTimer) {
      clearInterval(this.autoFetchTimer);
      this.autoFetchTimer = null;
    }
    if (this.onVisibilityChangeHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChangeHandler);
      this.onVisibilityChangeHandler = undefined;
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
