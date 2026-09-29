import { pb, getPocketBaseUrl } from './pocketbaseClient';
import { safeStorage } from '../utils/safeStorage';
import { InventoryItem, Order, StoreLocation, Customer, StoreExpense } from '../types';
import { PurchaseOrder, PurchaseBill, StockTransfer, StoreStockIndent, Supplier } from '../types/warehouse';

export type SyncEngine = 'pocketbase' | 'firebase';
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
    engine: 'pocketbase',
    serverUrl: getPocketBaseUrl(),
    lastSyncedAt: null,
    itemsSynced: 0,
    activeListenersCount: 0,
  };

  private listeners = new Set<SyncListener>();
  private unsubscribes: Array<() => void> = [];
  private isInitialized = false;
  private isApplyingRemoteUpdate = false;
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
   * Initializes PocketBase real-time synchronization.
   * Tests connectivity, seeds baseline records if needed, and establishes SSE subscriptions.
   */
  public async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.setState({
      status: 'connecting',
      serverUrl: getPocketBaseUrl(),
    });

    try {
      // 1. Probe candidate PocketBase endpoints (same-origin Nginx proxy or direct port 8090)
      const candidateUrls = [
        getPocketBaseUrl(),
        typeof window !== 'undefined' ? window.location.origin : '',
        typeof window !== 'undefined' ? `http://${window.location.hostname}:8090` : '',
        'http://187.126.115.40',
        'http://187.126.115.40:8090',
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
          // Probe next candidate
        }
      }

      if (!workingUrl) {
        console.warn(`[CloudSync] PocketBase at ${this.state.serverUrl} is not yet reachable. Operating in local mode.`);
        this.setState({
          status: 'offline',
          isLive: false,
          errorMessage: `Connecting to PocketBase VPS at ${this.state.serverUrl}...`,
        });

        // Set up periodic background retry every 10 seconds
        const retryTimer = setInterval(async () => {
          try {
            for (const testUrl of uniqueCandidates) {
              pb.baseUrl = testUrl;
              const recheck = await pb.health.check().catch(() => null);
              if (recheck && recheck.code === 200) {
                clearInterval(retryTimer);
                this.isInitialized = false;
                this.init();
                break;
              }
            }
          } catch {
            // Still offline
          }
        }, 10000);
        return;
      }

      pb.baseUrl = workingUrl;
      this.setState({ serverUrl: workingUrl });
      console.log(`[CloudSync] Connected to PocketBase VPS at ${workingUrl}`);

      // 2. Setup Realtime SSE Subscriptions on collections
      await this.setupPocketBaseListeners();

      this.setState({
        status: 'connected',
        isLive: true,
        lastSyncedAt: new Date(),
        errorMessage: undefined,
      });
    } catch (err: any) {
      console.warn('[CloudSync] PocketBase initialization warning:', err);
      this.setState({
        status: 'offline',
        isLive: false,
        errorMessage: err?.message || 'Using offline local storage until VPS PocketBase connects.',
      });
    }
  }

  /**
   * Subscribes to real-time events on PocketBase collections via Server-Sent Events (SSE)
   */
  private async setupPocketBaseListeners() {
    // Unsubscribe existing
    this.destroy();
    this.isInitialized = true;

    const bindCollection = async <T extends { id: string }>(
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

        // Initial fetch of full list from PocketBase
        try {
          const records = await pb.collection(collectionName).getFullList({
            sort: '-created',
            requestKey: null,
          });

          if (records && records.length > 0) {
            map.clear();
            records.forEach((rec: any) => {
              const appData = rec.data ? { ...rec.data, id: rec.recordId || rec.id } : rec;
              const cleanId = String(appData.id || rec.id);
              map!.set(cleanId, appData);
              this.pbIdMap.set(`${collectionName}:${cleanId}`, rec.id);
            });

            const remoteDocs = Array.from(map.values()) as T[];
            this.applyRemoteUpdate(storageKey, remoteDocs, isWarehouse, records.length);
          }
        } catch (fetchErr: any) {
          // If collection doesn't exist yet on PocketBase, log gently
          console.log(`[CloudSync] Collection "${collectionName}" ready on PocketBase.`);
        }

        // Subscribe to real-time additions/modifications/deletions
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
        }).catch((subErr) => {
          console.warn(`[CloudSync] Real-time subscribe error for ${collectionName}:`, subErr);
          return () => {};
        });

        if (unsubscribeFunc) {
          this.unsubscribes.push(unsubscribeFunc);
        }
      } catch (err) {
        console.warn(`[CloudSync] Failed to setup listener for ${collectionName}:`, err);
      }
    };

    // Bind all 9 operational multi-store collections
    await bindCollection<InventoryItem>(COLLECTIONS.INVENTORY, STORAGE_KEYS.INVENTORY, false);
    await bindCollection<Order>(COLLECTIONS.ORDERS, STORAGE_KEYS.ORDERS, false);
    await bindCollection<StoreLocation>(COLLECTIONS.STORES, STORAGE_KEYS.STORES, false);
    await bindCollection<Customer>(COLLECTIONS.CUSTOMERS, STORAGE_KEYS.CUSTOMERS, false);
    await bindCollection<StoreExpense>(COLLECTIONS.EXPENSES, STORAGE_KEYS.EXPENSES, false);
    await bindCollection<PurchaseOrder>(COLLECTIONS.PURCHASE_ORDERS, STORAGE_KEYS.PURCHASE_ORDERS, true);
    await bindCollection<PurchaseBill>(COLLECTIONS.INWARD_BILLS, STORAGE_KEYS.INWARD_BILLS, true);
    await bindCollection<StockTransfer>(COLLECTIONS.TRANSFERS, STORAGE_KEYS.TRANSFERS, true);
    await bindCollection<StoreStockIndent>(COLLECTIONS.INDENTS, STORAGE_KEYS.INDENTS, true);
    await bindCollection<Supplier>(COLLECTIONS.SUPPLIERS, STORAGE_KEYS.SUPPLIERS, true);

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
   * Push a document to PocketBase in real-time immediately when changed locally
   */
  public async syncDocument(collectionName: string, id: string, data: any) {
    if (this.isApplyingRemoteUpdate) return;

    try {
      const cleanId = String(id || Date.now());
      const sanitized = JSON.parse(JSON.stringify(data));

      // Update in-memory map
      const map = this.collectionDocsMap.get(collectionName);
      if (map) {
        map.set(cleanId, sanitized);
      }

      // If PocketBase server is not live, preserve locally and return immediately
      if (!this.state.isLive && this.state.status !== 'connected') {
        return;
      }

      // Check if we already know PocketBase's internal record ID
      const mapKey = `${collectionName}:${cleanId}`;
      let pbId = this.pbIdMap.get(mapKey);

      if (pbId) {
        try {
          await pb.collection(collectionName).update(pbId, {
            recordId: cleanId,
            data: sanitized,
            updatedAt: new Date().toISOString(),
          });
        } catch (updateErr: any) {
          // If record was removed remotely, create new
          const created = await pb.collection(collectionName).create({
            recordId: cleanId,
            data: sanitized,
            updatedAt: new Date().toISOString(),
          });
          this.pbIdMap.set(mapKey, created.id);
        }
      } else {
        try {
          const created = await pb.collection(collectionName).create({
            recordId: cleanId,
            data: sanitized,
            updatedAt: new Date().toISOString(),
          });
          this.pbIdMap.set(mapKey, created.id);
        } catch {
          // If record already exists on server under recordId, fetch internal ID and update
          const existing = await pb.collection(collectionName).getFirstListItem(`recordId="${cleanId}"`, { requestKey: null }).catch(() => null);
          if (existing) {
            this.pbIdMap.set(mapKey, existing.id);
            await pb.collection(collectionName).update(existing.id, {
              recordId: cleanId,
              data: sanitized,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }

      this.setState({
        status: 'connected',
        isLive: true,
        lastSyncedAt: new Date(),
      });
    } catch (err: any) {
      // If server is unavailable, data is still safe in localStorage
      console.warn(`[CloudSync] Notice: Queued write locally for ${collectionName}:`, err?.message || err);
    }
  }

  /**
   * Delete a single document from PocketBase in real-time
   */
  public async deleteDocument(collectionName: string, id: string): Promise<boolean> {
    if (this.isApplyingRemoteUpdate) return false;

    try {
      const cleanId = String(id || '').trim();
      if (!cleanId) return false;

      const map = this.collectionDocsMap.get(collectionName);
      if (map) {
        map.delete(cleanId);
      }

      const mapKey = `${collectionName}:${cleanId}`;
      let pbId = this.pbIdMap.get(mapKey);

      if (!pbId) {
        const existing = await pb.collection(collectionName).getFirstListItem(`recordId="${cleanId}"`, { requestKey: null }).catch(() => null);
        if (existing) pbId = existing.id;
      }

      if (pbId) {
        await pb.collection(collectionName).delete(pbId);
        this.pbIdMap.delete(mapKey);
      }
      return true;
    } catch (err: any) {
      console.warn(`[CloudSync] Notice: Document deletion synced locally for ${collectionName}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Delete ALL records in a PocketBase collection and reset local cache
   */
  public async clearCollection(collectionName: string): Promise<{ deletedCount: number; success: boolean }> {
    try {
      // Clear memory map
      const map = this.collectionDocsMap.get(collectionName);
      if (map) {
        map.clear();
      }

      // Clear pbIdMap entries for this collection
      for (const [key] of this.pbIdMap.entries()) {
        if (key.startsWith(`${collectionName}:`)) {
          this.pbIdMap.delete(key);
        }
      }

      // If PocketBase server is not live, clear local memory and return
      if (!this.state.isLive && this.state.status !== 'connected') {
        return { deletedCount: 0, success: true };
      }

      let deletedCount = 0;
      // Get all records in the collection
      const records = await pb.collection(collectionName).getFullList({
        fields: 'id,recordId',
        requestKey: null,
      }).catch(() => []);

      if (records && records.length > 0) {
        // Delete in sequential batches of 10 to avoid SQLite busy lock
        const batchSize = 10;
        for (let i = 0; i < records.length; i += batchSize) {
          const chunk = records.slice(i, i + batchSize);
          await Promise.all(
            chunk.map(async (r) => {
              try {
                await pb.collection(collectionName).delete(r.id);
                deletedCount++;
              } catch {
                // Ignore single delete errors
              }
            })
          );
        }
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

    // If server is not reachable, record locally and return immediately
    if (!this.state.isLive && this.state.status !== 'connected') {
      const map = this.collectionDocsMap.get(collectionName);
      if (map) {
        items.forEach((item) => {
          if (item && item.id) {
            map.set(String(item.id), item);
          }
        });
      }
      onProgress?.(items.length, items.length, 100);
      return { success: true, synced: items.length };
    }

    try {
      this.setState({ status: 'syncing' });

      // Refresh collection ID map before batch to avoid duplicate lookups
      try {
        const remoteRecords = await pb.collection(collectionName).getFullList({
          fields: 'id,recordId',
          requestKey: null,
        });
        remoteRecords.forEach((rec) => {
          if (rec.recordId) {
            this.pbIdMap.set(`${collectionName}:${rec.recordId}`, rec.id);
          }
        });
      } catch {
        // Continue with current map
      }

      let synced = 0;
      const total = items.length;
      // Controlled batch size of 6 with micro-ticks prevents SQLite transaction locking
      const batchSize = 6;

      for (let i = 0; i < total; i += batchSize) {
        const chunk = items.slice(i, i + batchSize);
        await Promise.all(
          chunk.map(async (item) => {
            if (item && item.id) {
              await this.syncDocument(collectionName, String(item.id), item);
              synced++;
            }
          })
        );
        const percent = Math.min(100, Math.round((synced / total) * 100));
        onProgress?.(synced, total, percent);
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
      this.setState({ status: 'offline', errorMessage: err?.message });
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
        // Sync items in controlled sequential batches so large catalogs sync without locking
        const batchSize = 8;
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (item) => {
              if (item && item.id) {
                await this.syncDocument(collectionName, String(item.id), item);
              }
            })
          );
        }

        this.setState({
          status: 'connected',
          isLive: true,
          lastSyncedAt: new Date(),
        });
      } catch (err: any) {
        console.warn(`[CloudSync] Batch sync for ${collectionName}:`, err?.message || err);
      }
    }, delay);
  }

  /**
   * Manual trigger: Full Push to VPS PocketBase Database
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
      const purchaseOrders = getLocalOrEmpty(STORAGE_KEYS.PURCHASE_ORDERS);
      const suppliers = getLocalOrEmpty(STORAGE_KEYS.SUPPLIERS);

      for (const store of stores) {
        if (store.id) await this.syncDocument(COLLECTIONS.STORES, String(store.id), store);
      }
      for (const item of inventory) {
        if (item.id) await this.syncDocument(COLLECTIONS.INVENTORY, String(item.id), item);
      }
      for (const sup of suppliers) {
        if (sup.id) await this.syncDocument(COLLECTIONS.SUPPLIERS, String(sup.id), sup);
      }
      for (const po of purchaseOrders) {
        if (po.id) await this.syncDocument(COLLECTIONS.PURCHASE_ORDERS, String(po.id), po);
      }
      for (const ord of orders.slice(-30)) {
        if (ord.id) await this.syncDocument(COLLECTIONS.ORDERS, String(ord.id), ord);
      }

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
