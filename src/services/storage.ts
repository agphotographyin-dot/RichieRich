import {
  InventoryItem,
  Category,
  Customer,
  Order,
  Promotion,
  PushNotification,
  BackupSnapshot,
  StoreFinancialStats,
  StoreLocation,
  CounterInfo,
  POSSession,
  StoreAdminCredential,
  StoreExpense,
  StoreExpenseCategory,
  StoreFinancialSummary,
  ItemStockSummary,
  CatalogStockMetrics,
} from '../types';
import { soundEffects } from './audio';
import { validateAndSanitizeBackupPayload } from './backupIntegrityService';
import { safeStorage } from '../utils/safeStorage';
import { getLocalDateString, isToday, isSameDay } from '../utils/dateUtils';
import { cloudSync } from './cloudSync';

const STORAGE_KEYS = {
  INVENTORY: 'rr_panhouse_inventory',
  CATEGORIES: 'rr_panhouse_categories',
  CUSTOMERS: 'rr_panhouse_customers',
  ORDERS: 'rr_panhouse_orders',
  PROMOTIONS: 'rr_panhouse_promotions',
  NOTIFICATIONS: 'rr_panhouse_notifications',
  BACKUPS: 'rr_panhouse_backups',
  LAST_BACKUP_DATE: 'rr_panhouse_last_backup_date',
  POS_SESSION: 'rr_panhouse_pos_session',
  STORES: 'rr_panhouse_stores',
  STORE_ADMINS: 'rr_panhouse_store_admins',
  STORE_EXPENSES: 'rr_panhouse_store_expenses',
  CURRENCY_SYMBOL: '₹',
};

export const CURRENCY = '₹';

/**
 * Normalizes any category string:
 * - If category is Paan (or pan, cat-paan, etc.) -> 'Paan'
 * - If category is Cafe (or cafe, coffee, shakes, beverages, etc.) -> 'Cafe'
 * - If category is ANYTHING ELSE -> automatically keep in 'Essentials'
 */
export function normalizeProductCategory(rawCat?: string): 'Paan' | 'Cafe' | 'Essentials' {
  if (!rawCat) return 'Essentials';
  const clean = String(rawCat).trim().toLowerCase();

  // Paan matches
  if (
    clean === 'paan' ||
    clean === 'pan' ||
    clean === 'cat-paan' ||
    clean.includes('paan') ||
    clean.includes('pan ') ||
    clean.startsWith('pan-') ||
    clean.startsWith('paan-') ||
    clean === 'meetha paan' ||
    clean === 'sada paan' ||
    clean === 'specialty paan'
  ) {
    return 'Paan';
  }

  // Cafe matches
  if (
    clean === 'cafe' ||
    clean === 'café' ||
    clean === 'coffee' ||
    clean === 'cat-coffee' ||
    clean === 'cat-shakes' ||
    clean === 'shakes' ||
    clean === 'shake' ||
    clean === 'beverages' ||
    clean === 'beverage' ||
    clean === 'tea' ||
    clean === 'chai' ||
    clean.includes('cafe') ||
    clean.includes('café') ||
    clean.includes('coffee') ||
    clean.includes('espresso') ||
    clean.includes('frappe') ||
    clean.includes('shake') ||
    clean.includes('falooda')
  ) {
    return 'Cafe';
  }

  // Any category other than Paan or Cafe is automatically kept in Essentials
  return 'Essentials';
}

/**
 * --- BOX & LOOSE PRODUCT INVENTORY TYPES & HELPERS ---
 */
export interface BoxLooseStock {
  fullBoxes: number;
  loosePieces: number;
  piecesPerBox: number;
  totalPieces: number;
}

/**
 * Helper to determine if an inventory unit represents boxes/cartons
 */
export function isBoxDenominatedUnit(unit?: string): boolean {
  if (!unit) return false;
  const u = unit.trim().toLowerCase();
  return u === 'boxes' || u === 'box' || u === 'carton' || u === 'cartons' || u === 'case' || u === 'cases';
}

/**
 * Calculates current Stock Units for any product (Box, Pack, Bottle, Piece, etc.).
 * CORE RULE: Inventory count strictly equals the number of physical order/stock units (SKU count).
 * No multiplying by piecesPerBox; piecesPerBox is informational only.
 */
export function getProductBoxLooseStock(item: InventoryItem, storeId?: string): BoxLooseStock {
  const isBoxUnit = isBoxDenominatedUnit(item.unit);
  const piecesPerBox = item.piecesPerBox && item.piecesPerBox > 0 ? item.piecesPerBox : 1;

  const rawQty = storeId
    ? Math.max(0, Math.floor(Number(item.storeAllocations?.[storeId]) || 0))
    : Math.max(0, Math.floor(Number(item.stockQuantity) || 0));

  return {
    fullBoxes: isBoxUnit ? rawQty : 0,
    loosePieces: 0,
    piecesPerBox,
    totalPieces: rawQty,
  };
}

// Initial Store Admin Login Credentials
export const INITIAL_STORE_ADMINS: StoreAdminCredential[] = [
  {
    id: 'sa-bopal',
    username: 'admin_bopal',
    password: 'RRbopal',
    name: 'Rajesh Shah',
    storeId: 'bopal',
    storeName: 'Richie Rich Pan House - Bopal Branch',
    phone: '+91 98250 11201',
    email: 'bopal.admin@richierich.in',
    roleTitle: 'Store Branch Manager',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sa-gota',
    username: 'admin_gota',
    password: 'RRgota',
    name: 'Hardik Patel',
    storeId: 'gota',
    storeName: 'Richie Rich Pan House & Coffee Lounge - Gota Main',
    phone: '+91 98250 11202',
    email: 'gota.admin@richierich.in',
    roleTitle: 'Store Operations Lead',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sa-sbr',
    username: 'admin_sbr',
    password: 'RRsbr',
    name: 'Manish Varma',
    storeId: 'sindhubhavan',
    storeName: 'Richie Rich Pan House - Sindhubhavan Road (SBR)',
    phone: '+91 98250 11203',
    email: 'sbr.admin@richierich.in',
    roleTitle: 'Lounge & Store Manager',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sa-sg',
    username: 'admin_sg',
    password: 'RRsg',
    name: 'Sameer Dave',
    storeId: 'sg_highway',
    storeName: 'Richie Rich Pan House - SG Highway Express',
    phone: '+91 98250 11204',
    email: 'sg.admin@richierich.in',
    roleTitle: 'Highway Express Supervisor',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

// Initial Store Expenses
export const INITIAL_STORE_EXPENSES: StoreExpense[] = [];

// Initial Store Locations
export const INITIAL_STORES: StoreLocation[] = [
  {
    id: 'bopal',
    name: 'Richie Rich Pan House - Bopal Branch',
    shortName: 'Bopal',
    area: 'South Bopal, Ahmedabad',
    countersCount: 2,
    counters: [
      { id: 1, name: 'Counter 1 (Main Billing)', defaultPin: '1001', cashierName: 'Karan Patel', shift: '24x7 Active (Shift A)' },
      { id: 2, name: 'Counter 2 (Quick Express & Pan)', defaultPin: '1002', cashierName: 'Sanjay Rawal', shift: '24x7 Active (Shift B)' },
    ],
    address: 'Shop 12-14, Gala Empire, South Bopal, Ahmedabad, Gujarat 380058',
    phone: '+91 98250 11201',
    is24x7: true,
    landmark: 'Opp. Bopal Lake Garden',
  },
  {
    id: 'gota',
    name: 'Richie Rich Pan House & Coffee Lounge - Gota Main',
    shortName: 'Gota',
    area: 'Vandemataram Road, Gota, Ahmedabad',
    countersCount: 4,
    counters: [
      { id: 1, name: 'Counter 1 (Royal Paan Special)', defaultPin: '2001', cashierName: 'Mahesh Solanki', shift: '24x7 Active (Day)' },
      { id: 2, name: 'Counter 2 (Espresso & Hot Coffee Bar)', defaultPin: '2002', cashierName: 'Rahul Joshi', shift: '24x7 Active (Evening)' },
      { id: 3, name: 'Counter 3 (Mukhwas & Essentials)', defaultPin: '2003', cashierName: 'Amit Shah', shift: '24x7 Active (Night Owl)' },
      { id: 4, name: 'Counter 4 (Drive-thru / Express Takeaway)', defaultPin: '2004', cashierName: 'Dhaval Prajapati', shift: '24x7 Active (Round-the-Clock)' },
    ],
    address: 'Ground Floor, Royal Arcade, Vandemataram Cross Road, Gota, Ahmedabad, Gujarat 382481',
    phone: '+91 98250 11202',
    is24x7: true,
    landmark: 'Near Vandemataram Square',
  },
  {
    id: 'sindhubhavan',
    name: 'Richie Rich Pan House - Sindhubhavan Road (SBR)',
    shortName: 'Sindhubhavan',
    area: 'Sindhubhavan Road, Bodakdev, Ahmedabad',
    countersCount: 2,
    counters: [
      { id: 1, name: 'Counter 1 (VIP Lounge & Pan)', defaultPin: '3001', cashierName: 'Pritesh Dave', shift: '24x7 Active (Shift A)' },
      { id: 2, name: 'Counter 2 (Beverages & Mukhwas Bar)', defaultPin: '3002', cashierName: 'Kavita Sharma', shift: '24x7 Active (Shift B)' },
    ],
    address: 'Block A, Titanium Business Park, Sindhubhavan Marg, Bodakdev, Ahmedabad 380054',
    phone: '+91 98250 11203',
    is24x7: true,
    landmark: 'Opp. Symphony House',
  },
  {
    id: 'sg_highway',
    name: 'Richie Rich Pan House - SG Highway Express',
    shortName: 'SG Highway',
    area: 'SG Highway, Thaltej / Prahladnagar, Ahmedabad',
    countersCount: 2,
    counters: [
      { id: 1, name: 'Counter 1 (Highway 24x7 Express)', defaultPin: '4001', cashierName: 'Vikram Rajput', shift: '24x7 Active (Day/Night)' },
      { id: 2, name: 'Counter 2 (Quick Brews & Cigars/Essentials)', defaultPin: '4002', cashierName: 'Anil Desai', shift: '24x7 Active (Late Night)' },
    ],
    address: 'Shop 4-5, Shapath V, Near Crowne Plaza, SG Highway, Ahmedabad 380015',
    phone: '+91 98250 11204',
    is24x7: true,
    landmark: 'Near Iscon Cross Road',
  },
];

// Initial Categories (Strictly Paan, Cafe, Essentials)
export const INITIAL_CATEGORIES: Category[] = [
  { id: 'Paan', name: 'Paan', icon: 'Leaf', description: 'Royal Meetha, Fire, Ice, Chocolate, Sada & 24K Gold Vark creations' },
  { id: 'Cafe', name: 'Cafe', icon: 'Coffee', description: '24x7 Fresh Coffee, Artisanal Espresso, Cold Brews, Kulhad Chai & Rich Shakes' },
  { id: 'Essentials', name: 'Essentials', icon: 'ShoppingBag', description: 'Mukhwas, Supari, Pocket Mouth Sprays, Chilled Hydration, Energy Drinks & Confections' },
];

// Initial Inventory Items
export const INITIAL_INVENTORY: InventoryItem[] = [];

// Initial Customers
export const INITIAL_CUSTOMERS: Customer[] = [];

// Initial Promotions
export const INITIAL_PROMOTIONS: Promotion[] = [];

// Initial Recent Orders
export const INITIAL_ORDERS: Order[] = [];

// Initial System Notifications
export const INITIAL_NOTIFICATIONS: PushNotification[] = [];

// Cross-tab real-time sync via BroadcastChannel
let syncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel('richie_rich_sync_bus');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported', e);
}

export class StorageService {
  private static instance: StorageService;
  private listeners: Set<() => void> = new Set();
  private memoryCache: Map<string, any> = new Map();
  private isNotifyPending = false;
  private isRealtimeBusConnected = false;

  private constructor() {
    this.initDefaultData();
    this.setupSyncListener();
    this.checkDailyBackupScheduler();
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Check if storage service listeners are currently attached to the realtime bus
   */
  public isRealtimeBusAttached(): boolean {
    return this.isRealtimeBusConnected;
  }

  /**
   * Ensure that the storage service listeners are attached to the cross-tab/client realtime bus
   */
  public attachRealtimeBus(): boolean {
    return this.setupSyncListener();
  }

  getCached<T>(key: string, loader: () => T): T {
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key) as T;
    }
    const val = loader();
    this.memoryCache.set(key, val);
    return val;
  }

  setCached<T>(key: string, val: T): void {
    this.memoryCache.set(key, val);
  }

  invalidateCache(key?: string): void {
    if (key) {
      this.memoryCache.delete(key);
    } else {
      this.memoryCache.clear();
    }
  }

  // Subscribe to real-time changes
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifySubscribers(broadcast = true) {
    this.notify(broadcast);
  }

  private notify(broadcast = true) {
    if (this.isNotifyPending) return;
    this.isNotifyPending = true;
    queueMicrotask(() => {
      this.isNotifyPending = false;
      this.listeners.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.error('Subscriber error in storage:', err);
        }
      });
      if (broadcast && syncChannel) {
        try {
          syncChannel.postMessage({ type: 'STATE_CHANGED', timestamp: Date.now() });
        } catch {
          // ignore
        }
      }
    });
  }

  public setupSyncListener(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      if (!syncChannel && 'BroadcastChannel' in window) {
        syncChannel = new BroadcastChannel('richie_rich_sync_bus');
      }

      if (syncChannel) {
        // Use addEventListener or onmessage to handle cross-client sync bus messages
        syncChannel.onmessage = (event) => {
          if (!event || !event.data) return;
          const { type, key, val } = event.data;
          if (type === 'STATE_CHANGED' || type === 'SYNC_UPDATE' || type === 'STORAGE_UPDATE') {
            if (key && val !== undefined) {
              this.setCached(key, val);
            } else {
              this.memoryCache.clear();
            }
            this.notify(false); // Do not echo back to prevent tab ping-pong loops
          }
        };
        this.isRealtimeBusConnected = true;
      }

      // Also listen to storage event as fallback
      window.addEventListener('storage', (e) => {
        if (e.key && (Object.values(STORAGE_KEYS).includes(e.key) || e.key.startsWith('rr_') || e.key.startsWith('wh_'))) {
          this.memoryCache.clear();
          this.notify(false); // Do not echo back
        }
      });

      return this.isRealtimeBusConnected;
    } catch (err) {
      console.warn('[Storage] Error setting up realtime bus sync listener:', err);
      return false;
    }
  }

  private initDefaultData() {
    if (typeof window === 'undefined') return;

    if (!safeStorage.getItem(STORAGE_KEYS.INVENTORY)) {
      safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify([]));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
      safeStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      safeStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.ORDERS)) {
      safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.PROMOTIONS)) {
      safeStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify([]));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      safeStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.BACKUPS)) {
      safeStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify([]));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.STORES)) {
      safeStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(INITIAL_STORES));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.STORE_ADMINS)) {
      safeStorage.setItem(STORAGE_KEYS.STORE_ADMINS, JSON.stringify(INITIAL_STORE_ADMINS));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.STORE_EXPENSES)) {
      safeStorage.setItem(STORAGE_KEYS.STORE_EXPENSES, JSON.stringify([]));
    }

    // Run active purge of legacy dummy mock entries
    this.purgeAllDummyData();
  }

  /**
   * Purges all mock/dummy test records from storage
   */
  public purgeAllDummyData(): void {
    if (typeof window === 'undefined') return;

    try {
      // 1. Purge dummy orders
      const rawOrders = safeStorage.getItem(STORAGE_KEYS.ORDERS);
      if (rawOrders) {
        try {
          const orders: Order[] = JSON.parse(rawOrders);
          if (Array.isArray(orders)) {
            const cleanOrders = orders.filter(
              (o) =>
                o &&
                !String(o.id).startsWith('ord-10') &&
                !String(o.orderNumber).startsWith('RR-2026-10') &&
                o.customerName !== 'Rajesh Sharma' &&
                o.customerName !== 'Pooja Mehta' &&
                o.customerName !== 'Amitabh Verma'
            );
            safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(cleanOrders));
            this.setCached(STORAGE_KEYS.ORDERS, cleanOrders);
          }
        } catch {}
      }

      // 2. Purge dummy customers
      const rawCustomers = safeStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (rawCustomers) {
        try {
          const customers: Customer[] = JSON.parse(rawCustomers);
          if (Array.isArray(customers)) {
            const cleanCustomers = customers.filter(
              (c) =>
                c &&
                c.id !== 'cust-1' &&
                c.id !== 'cust-2' &&
                c.id !== 'cust-3' &&
                c.name !== 'Rajesh Sharma' &&
                c.name !== 'Pooja Mehta' &&
                c.name !== 'Amitabh Verma'
            );
            safeStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(cleanCustomers));
            this.setCached(STORAGE_KEYS.CUSTOMERS, cleanCustomers);
          }
        } catch {}
      }

      // 3. Purge dummy store expenses
      const rawExpenses = safeStorage.getItem(STORAGE_KEYS.STORE_EXPENSES);
      if (rawExpenses) {
        try {
          const expenses: StoreExpense[] = JSON.parse(rawExpenses);
          if (Array.isArray(expenses)) {
            const cleanExpenses = expenses.filter(
              (e) =>
                e &&
                !['exp-101', 'exp-102', 'exp-103', 'exp-104', 'exp-105'].includes(e.id) &&
                !['Torrent Power & Fuel Station', 'Gala Packaging Hub', 'CleanCare Solutions'].includes(e.paidTo)
            );
            safeStorage.setItem(STORAGE_KEYS.STORE_EXPENSES, JSON.stringify(cleanExpenses));
            this.setCached(STORAGE_KEYS.STORE_EXPENSES, cleanExpenses);
          }
        } catch {}
      }

      // 4. Purge dummy promotions
      const rawPromos = safeStorage.getItem(STORAGE_KEYS.PROMOTIONS);
      if (rawPromos) {
        try {
          const promos: Promotion[] = JSON.parse(rawPromos);
          if (Array.isArray(promos)) {
            const cleanPromos = promos.filter(
              (p) => p && !['promo-1', 'promo-2', 'promo-3'].includes(p.id) && !['ROYALPAN20', 'FESTIVE50', 'VIPROYALTY'].includes(p.code)
            );
            safeStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(cleanPromos));
            this.setCached(STORAGE_KEYS.PROMOTIONS, cleanPromos);
          }
        } catch {}
      }

      // 5. Purge dummy notifications
      const rawNotifs = safeStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (rawNotifs) {
        try {
          const notifs: PushNotification[] = JSON.parse(rawNotifs);
          if (Array.isArray(notifs)) {
            const cleanNotifs = notifs.filter((n) => n && !['notif-1', 'notif-2', 'notif-3', 'notif-4'].includes(n.id));
            safeStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(cleanNotifs));
            this.setCached(STORAGE_KEYS.NOTIFICATIONS, cleanNotifs);
          }
        } catch {}
      }

      // 6. Purge dummy suppliers
      const rawSuppliers = safeStorage.getItem('rr_wh_suppliers');
      if (rawSuppliers) {
        try {
          const suppliers: any[] = JSON.parse(rawSuppliers);
          if (Array.isArray(suppliers)) {
            const cleanSuppliers = suppliers.filter(
              (s) =>
                s &&
                !['sup-101', 'sup-102', 'sup-103', 'sup-104'].includes(s.id) &&
                !['Gujarat Betel Traders', 'Shreeji Spices & Supari', 'Apex Cafe & Beverage Distributors', 'Royal Luxury Packaging & Vark'].includes(s.name)
            );
            safeStorage.setItem('rr_wh_suppliers', JSON.stringify(cleanSuppliers));
          }
        } catch {}
      }

      // 7. Purge dummy inventory items if they are old mock template items
      const rawInv = safeStorage.getItem(STORAGE_KEYS.INVENTORY);
      if (rawInv) {
        try {
          const inv: InventoryItem[] = JSON.parse(rawInv);
          if (Array.isArray(inv)) {
            const cleanInv = inv.filter(
              (i) =>
                i &&
                !['item-101', 'item-102', 'item-103', 'item-104', 'item-105', 'item-106', 'item-201', 'item-202', 'item-203', 'item-204', 'item-301', 'item-302', 'item-303', 'item-304', 'item-305', 'item-401'].includes(i.id)
            );
            safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(cleanInv));
            this.setCached(STORAGE_KEYS.INVENTORY, cleanInv);
          }
        } catch {}
      }

      this.memoryCache.clear();
      this.notify(true);
    } catch (err) {
      console.warn('Error purging dummy data:', err);
    }
  }

  // --- MULTI-STORE & POS COUNTER / SALESPERSON MANAGEMENT METHODS ---

  getStores(): StoreLocation[] {
    return this.getCached(STORAGE_KEYS.STORES, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.STORES);
        if (!data) return INITIAL_STORES;
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_STORES;
      } catch {
        return INITIAL_STORES;
      }
    });
  }

  saveStores(stores: StoreLocation[]): void {
    this.setCached(STORAGE_KEYS.STORES, stores);
    safeStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
    this.notify();
    cloudSync.debouncedSyncCollection('stores', stores);
  }

  getStoreById(storeId: string): StoreLocation | undefined {
    const stores = this.getStores();
    return stores.find((s) => s.id === storeId);
  }

  updateStore(storeId: string, updates: Partial<StoreLocation>): StoreLocation | null {
    const stores = this.getStores();
    const store = stores.find((s) => s.id === storeId);
    if (!store) return null;

    Object.assign(store, updates);
    this.saveStores(stores);

    this.addNotification({
      title: `🏪 Store Details Updated`,
      message: `Updated details for ${store.name} (${store.shortName}).`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });

    return store;
  }

  addCounter(
    storeId: string,
    counterData: { name: string; cashierName: string; defaultPin: string; shift: string; phone?: string }
  ): CounterInfo | null {
    const stores = this.getStores();
    const store = stores.find((s) => s.id === storeId);
    if (!store) return null;

    const maxId = store.counters.reduce((max, c) => Math.max(max, c.id), 0);
    const newCounterId = maxId + 1;

    const newCounter: CounterInfo = {
      id: newCounterId,
      name: counterData.name || `Counter ${newCounterId} (${counterData.cashierName})`,
      cashierName: counterData.cashierName,
      defaultPin: counterData.defaultPin || `${store.counters.length + 1}001`,
      shift: counterData.shift || '24x7 Active (General Shift)',
      phone: counterData.phone || '',
      isActive: true,
    };

    store.counters.push(newCounter);
    store.countersCount = store.counters.length;

    this.saveStores(stores);

    this.addNotification({
      title: `👤 Salesperson & Counter Added`,
      message: `Added ${newCounter.cashierName} to ${store.shortName} (${newCounter.name}) with PIN ${newCounter.defaultPin}.`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });

    return newCounter;
  }

  updateCounter(
    storeId: string,
    counterId: number,
    updates: Partial<CounterInfo>
  ): CounterInfo | null {
    const stores = this.getStores();
    const store = stores.find((s) => s.id === storeId);
    if (!store) return null;

    const counter = store.counters.find((c) => c.id === counterId);
    if (!counter) return null;

    const oldPin = counter.defaultPin;
    const oldCashier = counter.cashierName;

    Object.assign(counter, updates);

    this.saveStores(stores);

    if (updates.defaultPin && updates.defaultPin !== oldPin) {
      this.addNotification({
        title: `🔑 POS Login PIN Changed`,
        message: `PIN for ${counter.cashierName} (${store.shortName} - Counter ${counter.id}) updated to ${updates.defaultPin}.`,
        type: 'order_update',
        targetRole: 'admin',
        read: false,
      });
    }

    if (updates.cashierName && updates.cashierName !== oldCashier) {
      this.addNotification({
        title: `👤 Salesperson Updated`,
        message: `Assigned ${updates.cashierName} in place of ${oldCashier} at ${store.shortName} Counter ${counter.id}.`,
        type: 'order_update',
        targetRole: 'admin',
        read: false,
      });
    }

    return counter;
  }

  deleteCounter(storeId: string, counterId: number): boolean {
    const stores = this.getStores();
    const store = stores.find((s) => s.id === storeId);
    if (!store) return false;

    if (store.counters.length <= 1) {
      alert('Cannot delete the only remaining counter for this store outlet.');
      return false;
    }

    const removedCounter = store.counters.find((c) => c.id === counterId);
    store.counters = store.counters.filter((c) => c.id !== counterId);
    store.countersCount = store.counters.length;

    this.saveStores(stores);

    if (removedCounter) {
      this.addNotification({
        title: `🗑️ Salesperson / Counter Removed`,
        message: `Removed ${removedCounter.cashierName} (${removedCounter.name}) from ${store.shortName}.`,
        type: 'order_update',
        targetRole: 'admin',
        read: false,
      });
    }

    return true;
  }

  changeCounterPin(storeId: string, counterId: number, newPin: string): boolean {
    return !!this.updateCounter(storeId, counterId, { defaultPin: newPin });
  }

  updateCounterPin(storeId: string, counterId: number, newPin: string): boolean {
    return this.changeCounterPin(storeId, counterId, newPin);
  }

  updateCounterDetails(storeId: string, counterId: number, updates: Partial<CounterInfo>): boolean {
    return !!this.updateCounter(storeId, counterId, updates);
  }

  getActivePOSSession(): POSSession | null {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.POS_SESSION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  setActivePOSSession(session: POSSession): void {
    safeStorage.setItem(STORAGE_KEYS.POS_SESSION, JSON.stringify(session));
    this.notify();
  }

  clearPOSSession(): void {
    safeStorage.removeItem(STORAGE_KEYS.POS_SESSION);
    this.notify();
  }

  transferStock(itemId: string, fromStoreId: string, toStoreId: string, quantity: number): boolean {
    if (quantity <= 0 || fromStoreId === toStoreId) return false;
    const items = this.getInventory();
    const item = items.find((i) => i.id === itemId);
    if (!item) return false;

    if (!item.storeAllocations) {
      item.storeAllocations = {};
    }

    const isFromWH = fromStoreId === 'warehouse' || fromStoreId === 'central' || fromStoreId === 'wh-central-amd';
    const isToWH = toStoreId === 'warehouse' || toStoreId === 'central' || toStoreId === 'wh-central-amd';

    const currentWarehouseStock = Math.max(0, Number(item.stockQuantity) || 0);
    const currentFromStoreStock = isFromWH ? currentWarehouseStock : Math.max(0, Number(item.storeAllocations[fromStoreId]) || 0);
    if (currentFromStoreStock < quantity) return false;

    const isBoxUnit = isBoxDenominatedUnit(item.unit);

    // 1. Explicitly calculate and validate deduction from source
    if (isFromWH) {
      const newWarehouseStock = Math.max(0, currentWarehouseStock - quantity);
      item.stockQuantity = newWarehouseStock;
      item.fullBoxStock = isBoxUnit ? newWarehouseStock : 0;
      item.loosePieceStock = 0;
      item.totalPieceEquivalent = newWarehouseStock;
      item.total_piece_equivalent = newWarehouseStock;
    } else {
      const newFromStoreStock = Math.max(0, currentFromStoreStock - quantity);
      item.storeAllocations[fromStoreId] = newFromStoreStock;
      if (!item.storeBoxAllocations) item.storeBoxAllocations = {};
      item.storeBoxAllocations[fromStoreId] = {
        fullBoxes: isBoxUnit ? newFromStoreStock : 0,
        loosePieces: 0,
        totalPieces: newFromStoreStock,
        total_piece_equivalent: newFromStoreStock,
      };
    }

    // 2. Explicitly calculate and validate addition to destination
    if (isToWH) {
      const newWarehouseStock = currentWarehouseStock + quantity;
      item.stockQuantity = newWarehouseStock;
      item.fullBoxStock = isBoxUnit ? newWarehouseStock : 0;
      item.loosePieceStock = 0;
      item.totalPieceEquivalent = newWarehouseStock;
      item.total_piece_equivalent = newWarehouseStock;
    } else {
      const currentToStoreStock = Math.max(0, Number(item.storeAllocations[toStoreId]) || 0);
      const newStoreStock = currentToStoreStock + quantity;
      item.storeAllocations[toStoreId] = newStoreStock;
      if (!item.storeBoxAllocations) item.storeBoxAllocations = {};
      item.storeBoxAllocations[toStoreId] = {
        fullBoxes: isBoxUnit ? newStoreStock : 0,
        loosePieces: 0,
        totalPieces: newStoreStock,
        total_piece_equivalent: newStoreStock,
      };
    }

    this.saveInventory(items);

    const fromStoreName = isFromWH ? 'Central Warehouse' : (this.getStoreById(fromStoreId)?.shortName || fromStoreId);
    const toStoreName = isToWH ? 'Central Warehouse' : (this.getStoreById(toStoreId)?.shortName || toStoreId);

    this.addNotification({
      title: `📦 Stock Transfer Complete`,
      message: `Transferred ${quantity} ${item.unit} of "${item.name}" from ${fromStoreName} to ${toStoreName}.`,
      type: 'low_stock',
      targetRole: 'admin',
      read: false,
      linkTab: 'inventory',
    });

    return true;
  }

  // --- INVENTORY METHODS ---

  getInventory(): InventoryItem[] {
    return this.getCached(STORAGE_KEYS.INVENTORY, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.INVENTORY);
        if (!data) return [];
        const rawList: any = JSON.parse(data);
        if (!Array.isArray(rawList)) return [];

        const seenIds = new Set<string>();
        const seenSkus = new Set<string>();
        const sanitized: InventoryItem[] = [];
        let hadDuplicatesOrUnnormalized = false;

        for (let i = 0; i < rawList.length; i++) {
          const item = rawList[i];
          if (!item || typeof item !== 'object') continue;

          let itemId = item.id ? String(item.id).trim() : '';
          let itemSku = item.sku ? String(item.sku).trim().toUpperCase() : '';

          // If empty SKU, attempt to restore from INITIAL_INVENTORY or generate
          if (!itemSku) {
            const matchedInit = INITIAL_INVENTORY.find(
              (init) => init.id === itemId || (init.name && item.name && init.name.trim().toLowerCase() === String(item.name).trim().toLowerCase())
            );
            if (matchedInit && matchedInit.sku) {
              itemSku = matchedInit.sku.toUpperCase();
            } else {
              const catPrefix = normalizeProductCategory(item.category).substring(0, 3).toUpperCase();
              itemSku = `SKU-${catPrefix}-${String(i + 1).padStart(3, '0')}`;
            }
            item.sku = itemSku;
            hadDuplicatesOrUnnormalized = true;
          } else {
            item.sku = itemSku;
          }

          // If duplicate ID, drop duplicate item
          if (!itemId || seenIds.has(itemId)) {
            hadDuplicatesOrUnnormalized = true;
            continue;
          }

          // Exact case-insensitive duplicate SKU check
          let skuKey = itemSku.toLowerCase();
          if (seenSkus.has(skuKey)) {
            itemSku = `${itemSku}-${i + 1}`;
            item.sku = itemSku;
            skuKey = itemSku.toLowerCase();
            hadDuplicatesOrUnnormalized = true;
          }

          // Normalize Category: Any category other than Paan or Cafe is automatically kept in Essentials
          const normalizedCategory = normalizeProductCategory(item.category);
          if (item.category !== normalizedCategory) {
            item.category = normalizedCategory;
            hadDuplicatesOrUnnormalized = true;
          }

          seenIds.add(itemId);
          seenSkus.add(skuKey);

          sanitized.push(item);
        }

        if (hadDuplicatesOrUnnormalized && typeof window !== 'undefined') {
          try {
            safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(sanitized));
          } catch {
            // ignore storage quota errors
          }
        }

        return sanitized;
      } catch {
        return [];
      }
    });
  }

  saveInventory(items: InventoryItem[]) {
    // calculate profit and margin on each item and guarantee unique IDs & normalized categories
    const seenIds = new Set<string>();
    const seenSkus = new Set<string>();
    const sanitized: InventoryItem[] = [];

    items.forEach((item, idx) => {
      if (!item) return;
      let itemId = item.id ? String(item.id).trim() : '';
      if (!itemId) {
        itemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${idx}`;
      }
      if (seenIds.has(itemId)) return;

      let itemSku = item.sku ? String(item.sku).trim().toUpperCase() : `SKU-${idx + 1}`;
      let skuKey = itemSku.toLowerCase();
      if (seenSkus.has(skuKey)) {
        itemSku = `${itemSku}-${idx + 1}`;
        skuKey = itemSku.toLowerCase();
      }

      seenIds.add(itemId);
      seenSkus.add(skuKey);

      const category = normalizeProductCategory(item.category);
      const profitPerUnit = item.sellingPrice - item.costPrice;
      const marginPercentage = item.sellingPrice > 0 ? (profitPerUnit / item.sellingPrice) * 100 : 0;
      const nowIso = new Date().toISOString();
      const lastMod = (item as any).lastStockChange || Date.now();
      sanitized.push({
        ...item,
        id: itemId,
        sku: itemSku,
        category,
        profitPerUnit: Math.round(profitPerUnit * 100) / 100,
        marginPercentage: Math.round(marginPercentage * 10) / 10,
        updatedAt: item.updatedAt || nowIso,
        lastStockChange: lastMod,
      } as any);
    });

    this.setCached(STORAGE_KEYS.INVENTORY, sanitized);
    safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(sanitized));
    this.notify();
    cloudSync.debouncedSyncCollection('inventory', sanitized);

    // Defer low stock alert evaluation so UI operations remain immediate
    setTimeout(() => {
      this.checkAndTriggerLowStockAlerts(sanitized);
    }, 40);
  }

  addInventoryItem(item: Omit<InventoryItem, 'id' | 'profitPerUnit' | 'marginPercentage'>): InventoryItem {
    const items = this.getInventory();
    const normalizedCategory = normalizeProductCategory(item.category);
    const newItem: InventoryItem = {
      ...item,
      category: normalizedCategory,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      profitPerUnit: item.sellingPrice - item.costPrice,
      marginPercentage: Math.round(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 1000) / 10,
    };
    items.unshift(newItem);
    this.saveInventory(items);
    cloudSync.syncDocument('inventory', newItem.id, newItem);
    return newItem;
  }

  updateInventoryItem(id: string, updates: Partial<InventoryItem>): InventoryItem | null {
    const items = this.getInventory();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) return null;

    const current = items[index];
    const updated: InventoryItem = { ...current, ...updates };
    if (updates.category !== undefined) {
      updated.category = normalizeProductCategory(updates.category);
    }
    updated.profitPerUnit = updated.sellingPrice - updated.costPrice;
    updated.marginPercentage =
      updated.sellingPrice > 0
        ? Math.round(((updated.sellingPrice - updated.costPrice) / updated.sellingPrice) * 1000) / 10
        : 0;

    items[index] = updated;
    this.saveInventory(items);
    cloudSync.syncDocument('inventory', updated.id, updated);
    return updated;
  }

  deleteInventoryItem(id: string): boolean {
    const items = this.getInventory();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length !== items.length) {
      this.saveInventory(filtered);
      if (id) {
        cloudSync.deleteDocument('inventory', id);
      }
      return true;
    }
    return false;
  }

  /**
   * Purge and clean all Master Catalog SKUs completely from local cache and PocketBase database
   */
  async clearAllInventory(): Promise<{ count: number }> {
    const previous = this.getInventory();
    const count = previous.length;

    // 1. Wipe local cache and safeStorage
    this.setCached(STORAGE_KEYS.INVENTORY, []);
    safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify([]));
    this.notify();

    // 2. Wipe from PocketBase cloud database
    await cloudSync.clearCollection('inventory');

    this.addNotification({
      title: '🧹 Master Inventory Catalog Purged',
      message: `Successfully cleared all ${count} SKUs from Master Catalog and cloud database. Ready for fresh import.`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
      linkTab: 'inventory',
    });

    return { count };
  }

  importInventoryBatch(
    parsedItems: Array<{
      isUpdate: boolean;
      existingId?: string;
      name: string;
      sku: string;
      barcode: string;
      category: string;
      brand: string;
      vendors: string[];
      vendor: string;
      priceType: 'fixed' | 'variable';
      costPrice: number;
      sellingPrice: number;
      stockQuantity: number;
      lowStockThreshold: number;
      unit: string;
      isTaxApplicable: boolean;
      taxRate: number;
      status: 'active' | 'inactive';
      description: string;
      imageUrl?: string;
    }>,
    options: { updateExisting: boolean; cleanBeforeImport?: boolean } = { updateExisting: true, cleanBeforeImport: false }
  ): { importedCount: number; updatedCount: number } {
    const currentInventory = options.cleanBeforeImport ? [] : this.getInventory();
    let importedCount = 0;
    let updatedCount = 0;

    // Track newly added/updated items during batch to avoid intra-batch duplicate creations
    const skuIndexMap = new Map<string, number>();
    const idIndexMap = new Map<string, number>();

    if (!options.cleanBeforeImport) {
      currentInventory.forEach((item, idx) => {
        if (item.id) idIndexMap.set(item.id, idx);
        if (item.sku) skuIndexMap.set(item.sku.trim().toLowerCase(), idx);
      });
    }

    parsedItems.forEach((row, rowIdx) => {
      const cleanSku = row.sku ? row.sku.trim().toLowerCase() : '';
      const normalizedCat = normalizeProductCategory(row.category);
      let existingIndex = -1;

      if (row.existingId && idIndexMap.has(row.existingId)) {
        existingIndex = idIndexMap.get(row.existingId)!;
      } else if (cleanSku && skuIndexMap.has(cleanSku)) {
        existingIndex = skuIndexMap.get(cleanSku)!;
      }

      if (existingIndex >= 0 && existingIndex < currentInventory.length) {
        if (options.updateExisting) {
          const existing = currentInventory[existingIndex];
          const profit = row.sellingPrice - row.costPrice;
          const margin = row.sellingPrice > 0 ? Math.round((profit / row.sellingPrice) * 1000) / 10 : 0;

          currentInventory[existingIndex] = {
            ...existing,
            name: row.name || existing.name,
            sku: row.sku || existing.sku,
            barcode: row.barcode || existing.barcode,
            category: normalizedCat,
            brand: row.brand || existing.brand,
            vendors: row.vendors && row.vendors.length > 0 ? row.vendors : existing.vendors,
            vendor: row.vendor || existing.vendor,
            priceType: row.priceType,
            costPrice: row.costPrice,
            sellingPrice: row.priceType === 'variable' ? 0 : row.sellingPrice,
            stockQuantity: row.stockQuantity > 0 ? row.stockQuantity : existing.stockQuantity,
            lowStockThreshold: row.lowStockThreshold || existing.lowStockThreshold,
            unit: row.unit || existing.unit,
            isTaxApplicable: row.isTaxApplicable,
            taxRate: row.taxRate,
            status: row.status,
            description: row.description || existing.description,
            profitPerUnit: profit,
            marginPercentage: margin,
          };
          updatedCount++;
        }
      } else {
        const profit = row.sellingPrice - row.costPrice;
        const margin = row.sellingPrice > 0 ? Math.round((profit / row.sellingPrice) * 1000) / 10 : 0;
        const initialStock = row.stockQuantity || 0;

        // Central Warehouse receives imported stock. Retail stores start at 0 until transferred via Stock Transfer.
        const storeAllocations = {
          gota: 0,
          bopal: 0,
          sindhubhavan: 0,
          sg_highway: 0,
        };

        const newItemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${rowIdx}`;

        const newItem: InventoryItem = {
          id: newItemId,
          name: row.name,
          sku: row.sku,
          barcode: row.barcode || `890100${Math.floor(1000 + Math.random() * 9000)}`,
          category: normalizedCat,
          brand: row.brand || 'Richie Rich Signature',
          vendors: row.vendors && row.vendors.length > 0 ? row.vendors : [row.vendor || 'Central Supply'],
          vendor: row.vendor || 'Central Supply',
          priceType: row.priceType || 'fixed',
          costPrice: row.costPrice,
          sellingPrice: row.priceType === 'variable' ? 0 : row.sellingPrice,
          stockQuantity: initialStock,
          lowStockThreshold: row.lowStockThreshold || 5,
          unit: row.unit || 'pieces',
          isTaxApplicable: row.isTaxApplicable !== false,
          taxRate: row.taxRate ?? (normalizedCat === 'Paan' ? 5 : normalizedCat === 'Cafe' ? 5 : 18),
          status: row.status || 'active',
          isAvailableForOnline: true,
          description: row.description || `${row.name} - Catalog Product`,
          ingredients: ['Artisanal Spices', 'Premium Quality Ingredients'],
          tags: row.priceType === 'variable' ? ['Variable Price', 'New Import'] : ['New Import'],
          imageUrl: row.imageUrl || '',
          profitPerUnit: profit,
          marginPercentage: margin,
          storeAllocations,
        };

        currentInventory.push(newItem);
        idIndexMap.set(newItemId, currentInventory.length - 1);
        if (cleanSku) skuIndexMap.set(cleanSku, currentInventory.length - 1);

        importedCount++;
      }
    });

    this.saveInventory(currentInventory);

    this.addNotification({
      title: `📊 Excel Inventory Import Completed`,
      message: `Successfully processed ${parsedItems.length} records (${importedCount} new products added, ${updatedCount} existing products updated).`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
      linkTab: 'inventory',
    });

    return { importedCount, updatedCount };
  }

  findItemByBarcode(barcode: string): InventoryItem | undefined {
    const items = this.getInventory();
    const clean = barcode.trim().toLowerCase();
    return items.find(
      (i) =>
        i.barcode.trim().toLowerCase() === clean ||
        (i.boxBarcode && i.boxBarcode.trim().toLowerCase() === clean) ||
        (i.looseBarcode && i.looseBarcode.trim().toLowerCase() === clean) ||
        i.sku.trim().toLowerCase() === clean ||
        clean.includes(i.barcode.trim().toLowerCase()) ||
        (i.looseBarcode && clean.includes(i.looseBarcode.trim().toLowerCase()))
    );
  }

  findItemByBarcodeWithMeta(barcode: string): { item: InventoryItem; matchedType: 'box' | 'loose' } | undefined {
    const items = this.getInventory();
    const clean = barcode.trim().toLowerCase();
    for (const i of items) {
      // Check loose barcode first if product allows selling loose
      if (
        i.sellAsLoose &&
        i.looseBarcode &&
        (i.looseBarcode.trim().toLowerCase() === clean || clean.includes(i.looseBarcode.trim().toLowerCase()))
      ) {
        return { item: i, matchedType: 'loose' };
      }
      if (
        i.barcode.trim().toLowerCase() === clean ||
        (i.boxBarcode && i.boxBarcode.trim().toLowerCase() === clean) ||
        i.sku.trim().toLowerCase() === clean ||
        clean.includes(i.barcode.trim().toLowerCase())
      ) {
        return { item: i, matchedType: 'box' };
      }
    }
    return undefined;
  }

  adjustStock(id: string, delta: number, reason: string = 'Manual Adjustment'): boolean {
    const items = this.getInventory();
    const cleanId = String(id || '').trim().toLowerCase();
    const item = items.find((i) => i.id === id || (i.sku && i.sku.trim().toLowerCase() === cleanId));
    if (!item) return false;

    const prevStock = item.stockQuantity || 0;
    const newStock = Math.max(0, prevStock + delta);
    const actualDelta = newStock - prevStock;
    if (actualDelta === 0 && delta !== 0 && prevStock === 0) {
      return false; // Prevent negative stock
    }

    item.stockQuantity = newStock;
    const isBoxUnit = isBoxDenominatedUnit(item.unit);
    item.fullBoxStock = isBoxUnit ? newStock : 0;
    item.full_box_stock = isBoxUnit ? newStock : 0;
    item.loosePieceStock = 0;
    item.loose_piece_stock = 0;
    item.totalPieceEquivalent = newStock;
    item.total_piece_equivalent = newStock;
    const nowTs = Date.now();
    const nowIso = new Date().toISOString();
    (item as any).lastStockChange = nowTs;
    item.updatedAt = nowIso;

    this.saveInventory(items);
    cloudSync.syncDocument('inventory', item.id, item);

    // Register movement in audit ledger
    const auditRecord = {
      transactionId: `TXN-${nowTs.toString().slice(-5)}${Math.floor(10 + Math.random() * 90)}`,
      referenceNumber: `ADJ-${nowTs.toString().slice(-6)}`,
      itemId: item.id,
      sku: item.sku,
      itemName: item.name,
      movementType: (actualDelta < 0 ? 'damage_scrap' : 'physical_adjustment') as any,
      fromLocation: actualDelta < 0 ? 'Central Warehouse' : 'Stock Adjustment',
      toLocation: actualDelta < 0 ? 'Inventory Reduction / Write-off' : 'Central Warehouse',
      quantity: actualDelta,
      quantityChanged: actualDelta,
      previousStock: prevStock,
      newStock,
      status: 'Completed',
      unit: item.unit || 'units',
      balanceAfter: newStock,
      unitCost: item.costPrice || 0,
      totalCostImpact: actualDelta * (item.costPrice || 0),
      performedBy: 'System / Manager',
      userRole: 'Manager',
      notes: reason || 'Manual Stock Adjustment',
    };

    if (warehouseStorageRef && typeof warehouseStorageRef.addAuditRecords === 'function') {
      warehouseStorageRef.addAuditRecords([auditRecord]);
    }

    if (delta < 0 && item.stockQuantity <= item.lowStockThreshold) {
      setTimeout(() => soundEffects.playWarningChime(), 50);
    }
    return true;
  }

  batchAdjustStock(adjustments: Array<{ id: string; delta: number; reason?: string }>): boolean {
    if (!adjustments || adjustments.length === 0) return true;
    const items = this.getInventory();
    let modified = false;
    let anyLowStockWarning = false;
    const nowIso = new Date().toISOString();
    const nowTs = Date.now();
    const auditRecords: any[] = [];

    adjustments.forEach(({ id, delta, reason }) => {
      const cleanId = String(id || '').trim().toLowerCase();
      const item = items.find((i) => i.id === id || (i.sku && i.sku.trim().toLowerCase() === cleanId));
      if (item) {
        const prevStock = item.stockQuantity || 0;
        const newStock = Math.max(0, prevStock + delta);
        const actualDelta = newStock - prevStock;
        item.stockQuantity = newStock;
        const isBoxUnit = isBoxDenominatedUnit(item.unit);
        item.fullBoxStock = isBoxUnit ? newStock : 0;
        item.full_box_stock = isBoxUnit ? newStock : 0;
        item.loosePieceStock = 0;
        item.loose_piece_stock = 0;
        item.totalPieceEquivalent = newStock;
        item.total_piece_equivalent = newStock;
        (item as any).lastStockChange = nowTs;
        item.updatedAt = nowIso;
        modified = true;

        auditRecords.push({
          transactionId: `TXN-${nowTs.toString().slice(-5)}${Math.floor(10 + Math.random() * 90)}`,
          referenceNumber: `ADJ-${nowTs.toString().slice(-6)}`,
          itemId: item.id,
          sku: item.sku,
          itemName: item.name,
          movementType: (actualDelta < 0 ? 'damage_scrap' : 'physical_adjustment') as any,
          fromLocation: actualDelta < 0 ? 'Central Warehouse' : 'Batch Adjustment',
          toLocation: actualDelta < 0 ? 'Inventory Reduction' : 'Central Warehouse',
          quantity: actualDelta,
          quantityChanged: actualDelta,
          previousStock: prevStock,
          newStock,
          status: 'Completed',
          unit: item.unit || 'units',
          balanceAfter: newStock,
          unitCost: item.costPrice || 0,
          totalCostImpact: actualDelta * (item.costPrice || 0),
          performedBy: 'System / Manager',
          userRole: 'Manager',
          notes: reason || 'Batch Inventory Adjustment',
        });

        if (delta < 0 && item.stockQuantity <= item.lowStockThreshold) {
          anyLowStockWarning = true;
        }
      }
    });

    if (modified) {
      this.saveInventory(items);
      if (auditRecords.length > 0 && warehouseStorageRef && typeof warehouseStorageRef.addAuditRecords === 'function') {
        warehouseStorageRef.addAuditRecords(auditRecords);
      }
    }
    if (anyLowStockWarning) {
      setTimeout(() => soundEffects.playWarningChime(), 50);
    }
    return modified;
  }

  /**
   * Applies a manual/physical stock audit to a store outlet's allocation with discrepancy tracking
   * and immutable audit log entry.
   */
  auditStoreStock(
    storeId: string,
    audits: Array<{
      itemId: string;
      countedStock: number;
      reason: string;
      notes?: string;
    }>,
    auditorName: string = 'Store Admin'
  ): { success: boolean; modifiedCount: number; auditReference: string; error?: string } {
    if (!audits || audits.length === 0) {
      return { success: false, modifiedCount: 0, auditReference: '', error: 'No items provided for stock audit.' };
    }

    const store = this.getStoreById(storeId);
    const storeName = store ? store.name : storeId;
    const items = this.getInventory();
    const nowIso = new Date().toISOString();
    const nowTs = Date.now();
    const auditReference = `AUD-${storeId.toUpperCase()}-${nowTs.toString().slice(-6)}`;
    const auditRecords: any[] = [];
    let modifiedCount = 0;

    audits.forEach((audit) => {
      const item = items.find((i) => i.id === audit.itemId || (i.sku && i.sku.toUpperCase() === audit.itemId.toUpperCase()));
      if (!item) return;

      if (!item.storeAllocations) {
        item.storeAllocations = {};
      }

      const prevStock = Math.max(0, Number(item.storeAllocations[storeId]) || 0);
      const newStock = Math.max(0, Number(audit.countedStock) || 0);
      const delta = newStock - prevStock;

      // Update store allocation
      item.storeAllocations[storeId] = newStock;

      const isBoxUnit = isBoxDenominatedUnit(item.unit);
      if (!item.storeBoxAllocations) item.storeBoxAllocations = {};
      item.storeBoxAllocations[storeId] = {
        fullBoxes: isBoxUnit ? newStock : 0,
        loosePieces: 0,
        totalPieces: newStock,
        total_piece_equivalent: newStock,
      };

      (item as any).lastStockChange = nowTs;
      item.updatedAt = nowIso;
      modifiedCount++;

      // Register Movement Audit Record
      const isShortage = delta < 0;
      const discrepancyReason = audit.reason || 'Physical Count Audit';

      auditRecords.push({
        transactionId: `TXN-${nowTs.toString().slice(-5)}${Math.floor(10 + Math.random() * 90)}`,
        referenceNumber: auditReference,
        itemId: item.id,
        sku: item.sku,
        itemName: item.name,
        movementType: isShortage ? 'damage_scrap' : 'physical_adjustment',
        fromLocation: isShortage ? `Store: ${storeName}` : `Stock Audit: ${discrepancyReason}`,
        toLocation: isShortage ? `Write-off (${discrepancyReason})` : `Store: ${storeName}`,
        quantity: Math.abs(delta),
        quantityChanged: delta,
        previousStock: prevStock,
        newStock: newStock,
        status: 'Completed',
        unit: item.unit || 'units',
        balanceAfter: newStock,
        unitCost: item.costPrice || 0,
        totalCostImpact: delta * (item.costPrice || 0),
        performedBy: auditorName,
        userRole: 'Store Admin',
        notes: `[Physical Store Audit - ${storeName}] Counted: ${newStock} ${item.unit} (Prev: ${prevStock}, Diff: ${delta >= 0 ? '+' : ''}${delta}). Reason: ${discrepancyReason}. Remarks: ${audit.notes || 'None'}`,
      });
    });

    if (modifiedCount > 0) {
      this.saveInventory(items);
      if (auditRecords.length > 0 && warehouseStorageRef && typeof warehouseStorageRef.addAuditRecords === 'function') {
        warehouseStorageRef.addAuditRecords(auditRecords);
      }

      this.addNotification({
        title: `📋 Physical Stock Audit Applied: ${store?.shortName || storeName}`,
        message: `Audited ${modifiedCount} SKU(s) under Ref #${auditReference}. Verified by ${auditorName}.`,
        type: 'low_stock',
        targetRole: 'admin',
        read: false,
        linkTab: 'inventory',
      });
    }

    return { success: true, modifiedCount, auditReference };
  }

  /**
   * Executes an atomic inventory transaction with rollback safety.
   * If any step fails or stock is insufficient, original inventory is restored.
   */
  executeAtomicInventoryTransaction(
    operations: (inv: InventoryItem[]) => { success: boolean; error?: string; auditRecords?: any[] }
  ): { success: boolean; error?: string } {
    const backup = this.getInventory();
    const workingCopy: InventoryItem[] = JSON.parse(JSON.stringify(backup));
    try {
      const res = operations(workingCopy);
      if (!res.success) {
        return { success: false, error: res.error || 'Transaction rejected during validation' };
      }
      const nowIso = new Date().toISOString();
      const nowTs = Date.now();
      workingCopy.forEach((item) => {
        item.updatedAt = nowIso;
        (item as any).lastStockChange = nowTs;
      });
      this.saveInventory(workingCopy);

      if (res.auditRecords && res.auditRecords.length > 0) {
        if (warehouseStorageRef && typeof warehouseStorageRef.addAuditRecords === 'function') {
          warehouseStorageRef.addAuditRecords(res.auditRecords);
        }
      }
      return { success: true };
    } catch (err: any) {
      console.error('[InventoryTransaction] Rollback triggered:', err);
      return { success: false, error: err?.message || 'Transaction failed. Rolled back changes.' };
    }
  }

  private checkAndTriggerLowStockAlerts(items: InventoryItem[]) {
    const lowStockItems = items.filter((i) => i.stockQuantity <= i.lowStockThreshold);
    const notifications = this.getNotifications();
    const stores = this.getStores();
    const newNotifications: PushNotification[] = [];

    // 1. Central Master Warehouse Low Stock Alerts
    lowStockItems.forEach((item) => {
      const alreadyAlertedRecently = notifications.some(
        (n) =>
          n.type === 'low_stock' &&
          n.title.includes(`Central Warehouse`) &&
          n.title.includes(item.name) &&
          Date.now() - new Date(n.timestamp).getTime() < 1000 * 60 * 60 * 4 // 4 hours
      );

      if (!alreadyAlertedRecently) {
        newNotifications.push({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: `⚠️ Central WH Low Stock: ${item.name}`,
          message: `Central Master Warehouse has only ${item.stockQuantity} ${item.unit} available (Minimum Threshold: ${item.lowStockThreshold}). Issue a Supplier Purchase Order to replenish.`,
          type: 'low_stock',
          timestamp: new Date().toISOString(),
          read: false,
          targetRole: 'admin',
          linkTab: 'inventory',
        });
      }
    });

    // 2. Individual In-Store Low Stock Alerts (Gota, Bopal, Sindhu Bhavan, SG Highway)
    items.forEach((item) => {
      if (!item.storeAllocations) return;
      const storeMinThreshold = Math.max(2, Math.round((item.lowStockThreshold || 10) * 0.4));

      Object.entries(item.storeAllocations).forEach(([storeId, storeQty]) => {
        if (storeQty <= storeMinThreshold) {
          const storeObj = stores.find((s) => s.id === storeId);
          const storeName = storeObj ? storeObj.shortName || storeObj.name : storeId.toUpperCase();

          const alreadyAlertedStore = notifications.some(
            (n) =>
              n.type === 'low_stock' &&
              n.title.includes(storeName) &&
              n.title.includes(item.name) &&
              Date.now() - new Date(n.timestamp).getTime() < 1000 * 60 * 60 * 3 // 3 hours
          );

          if (!alreadyAlertedStore) {
            newNotifications.push({
              id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              title: `⚠️ In-Store Low Stock: ${storeName} - ${item.name}`,
              message: `${storeName} currently has only ${storeQty} ${item.unit} remaining (Store Min Threshold: ${storeMinThreshold}). Dispatch replenishment from Central Master Warehouse.`,
              type: 'low_stock',
              timestamp: new Date().toISOString(),
              read: false,
              targetRole: 'admin',
              linkTab: 'store_stock',
            });
          }
        }
      });
    });

    if (newNotifications.length > 0) {
      this.saveNotifications([...newNotifications, ...notifications]);
    }
  }

  // --- CATEGORIES ---

  getCategories(): Category[] {
    return this.getCached(STORAGE_KEYS.CATEGORIES, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.CATEGORIES);
        return data ? JSON.parse(data) : INITIAL_CATEGORIES;
      } catch {
        return INITIAL_CATEGORIES;
      }
    });
  }

  // --- CUSTOMERS & LOYALTY ---

  getCustomers(): Customer[] {
    return this.getCached(STORAGE_KEYS.CUSTOMERS, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.CUSTOMERS);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    });
  }

  saveCustomers(customers: Customer[]) {
    this.setCached(STORAGE_KEYS.CUSTOMERS, customers);
    safeStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    this.notify();
    cloudSync.debouncedSyncCollection('customers', customers);
  }

  findCustomerByPhone(phone: string): Customer | undefined {
    const customers = this.getCustomers();
    const cleanPhone = phone.replace(/\D/g, '');
    return customers.find((c) => c.phone.replace(/\D/g, '').includes(cleanPhone) || cleanPhone.includes(c.phone.replace(/\D/g, '')));
  }

  upsertCustomer(customerData: Partial<Customer> & { name: string; phone: string }): Customer {
    const customers = this.getCustomers();
    const existingIndex = customers.findIndex((c) => c.phone === customerData.phone);

    if (existingIndex >= 0) {
      const current = customers[existingIndex];
      const updated: Customer = {
        ...current,
        ...customerData,
      };
      customers[existingIndex] = updated;
      this.saveCustomers(customers);
      return updated;
    } else {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email || '',
        loyaltyPoints: 50, // Welcome gift 50 points
        tier: 'Silver',
        totalSpent: 0,
        totalOrders: 0,
        joinDate: new Date().toISOString().split('T')[0],
        preferences: customerData.preferences || [],
      };
      customers.push(newCust);
      this.saveCustomers(customers);
      cloudSync.syncDocument('customers', newCust.id, newCust);

      this.addNotification({
        title: `🎉 New Customer Joined Loyalty Club!`,
        message: `${newCust.name} (${newCust.phone}) enrolled with 50 welcome loyalty bonus points!`,
        type: 'loyalty_reward',
        targetRole: 'pos',
        read: false,
        linkTab: 'loyalty',
      });

      return newCust;
    }
  }

  // --- ORDERS & REAL-TIME STOCK DEDUCTION ---

  getOrders(): Order[] {
    return this.getCached(STORAGE_KEYS.ORDERS, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.ORDERS);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    });
  }

  saveOrders(orders: Order[]) {
    this.setCached(STORAGE_KEYS.ORDERS, orders);
    safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    this.notify();
    cloudSync.debouncedSyncCollection('orders', orders);
  }

  processOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Order {
    const orders = this.getOrders();
    const orderNumber = `RR-${new Date().getFullYear()}-${1000 + orders.length + 1}`;
    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
      orderNumber,
      createdAt: new Date().toISOString(),
    };

    // 1. Deduct Inventory Stock in Real-Time (Store Specific Allocation or Central Warehouse)
    const inventory = this.getInventory();
    const stores = this.getStores();
    let triggeredStoreLowStock = false;
    const auditRecords: any[] = [];
    const locName = orderData.storeName || (orderData.storeId ? `Store (${orderData.storeId})` : 'Central Warehouse');

    orderData.items.forEach((item) => {
      const invItem = inventory.find((i) => i.id === item.itemId || i.sku === item.sku);
      if (invItem) {
        const ppb = Math.max(1, invItem.piecesPerBox || 1);
        const qtyToDeduct = Math.max(1, Math.floor(Number(item.quantity) || 1));
        const isLooseSale = item.saleType === 'loose';
        const piecesSold = isLooseSale ? qtyToDeduct : (qtyToDeduct * ppb);

        let prevStock = 0;
        let finalStock = 0;
        let totalPiecesAfter = 0;

        if (orderData.storeId) {
          // Strictly deduct from STORE ONLY
          if (!invItem.storeAllocations) invItem.storeAllocations = {};
          if (!invItem.storeBoxAllocations) invItem.storeBoxAllocations = {};

          const curBoxes = Math.max(0, Number(invItem.storeAllocations[orderData.storeId]) || 0);
          const curAlloc = invItem.storeBoxAllocations[orderData.storeId];
          const curLoose = curAlloc && curAlloc.loosePieces !== undefined ? Math.max(0, Number(curAlloc.loosePieces) || 0) : 0;
          const totalPiecesBefore = (curBoxes * ppb) + curLoose;

          totalPiecesAfter = Math.max(0, totalPiecesBefore - piecesSold);
          const newFullBoxes = Math.floor(totalPiecesAfter / ppb);
          const newLoosePieces = totalPiecesAfter % ppb;

          prevStock = curBoxes;
          finalStock = newFullBoxes;

          invItem.storeAllocations[orderData.storeId] = newFullBoxes;
          invItem.storeBoxAllocations[orderData.storeId] = {
            fullBoxes: newFullBoxes,
            loosePieces: newLoosePieces,
            totalPieces: totalPiecesAfter,
            total_piece_equivalent: totalPiecesAfter,
          };

          const storeMinThreshold = Math.max(2, Math.round((invItem.lowStockThreshold || 10) * 0.4));
          if (finalStock <= storeMinThreshold && totalPiecesAfter <= storeMinThreshold * ppb) {
            triggeredStoreLowStock = true;
            const stObj = stores.find((s) => s.id === orderData.storeId);
            const stName = stObj ? stObj.shortName || stObj.name : orderData.storeId.toUpperCase();
            this.addNotification({
              title: `⚠️ In-Store Low Stock: ${stName} - ${invItem.name}`,
              message: `Post-Sale Alert: ${stName} stock dropped to ${finalStock} ${invItem.unit} + ${newLoosePieces} loose pieces (${totalPiecesAfter} total pieces). Threshold: ${storeMinThreshold}. Warehouse replenishment needed!`,
              type: 'low_stock',
              targetRole: 'admin',
              read: false,
              linkTab: 'store_stock',
            });
          }
        } else {
          // Central Warehouse direct dispatch (online/unallocated)
          const curBoxes = Math.max(0, Number(invItem.stockQuantity) || 0);
          const curLoose = Math.max(0, Number(invItem.loosePieceStock) || 0);
          const totalPiecesBefore = (curBoxes * ppb) + curLoose;

          totalPiecesAfter = Math.max(0, totalPiecesBefore - piecesSold);
          const newFullBoxes = Math.floor(totalPiecesAfter / ppb);
          const newLoosePieces = totalPiecesAfter % ppb;

          prevStock = curBoxes;
          finalStock = newFullBoxes;

          invItem.stockQuantity = newFullBoxes;
          invItem.fullBoxStock = newFullBoxes;
          invItem.loosePieceStock = newLoosePieces;
          invItem.totalPieceEquivalent = totalPiecesAfter;
          invItem.total_piece_equivalent = totalPiecesAfter;
        }

        item.boxEquivalentSold = isLooseSale ? Number((qtyToDeduct / ppb).toFixed(3)) : qtyToDeduct;

        // Consume actual inventory batches (FIFO)
        let batchNote = '';
        if (warehouseStorageRef && typeof warehouseStorageRef.consumeBatchesForSale === 'function') {
          const batchRes = warehouseStorageRef.consumeBatchesForSale(
            invItem.id,
            orderData.storeId || 'central',
            isLooseSale ? Math.ceil(qtyToDeduct / ppb) : qtyToDeduct
          );
          if (batchRes.success && batchRes.allocations.length > 0) {
            (item as any).batchAllocations = batchRes.allocations;
            batchNote = ` • Batches: ${batchRes.allocations.map((a) => a.batchNumber).join(', ')}`;
          }
        }

        // Record sale in audit log
        auditRecords.push({
          transactionId: `TXN-${Date.now().toString().slice(-5)}${Math.floor(10 + Math.random() * 90)}`,
          referenceNumber: orderNumber,
          itemId: invItem.id,
          sku: invItem.sku,
          itemName: invItem.name,
          movementType: 'pos_sales_consumption',
          fromLocation: locName,
          toLocation: `Customer (${orderData.customerName || 'Walk-in Guest'})`,
          quantity: isLooseSale ? -qtyToDeduct : -qtyToDeduct,
          quantityChanged: isLooseSale ? -qtyToDeduct : -qtyToDeduct,
          previousStock: prevStock,
          newStock: finalStock,
          status: 'Completed',
          unit: isLooseSale ? 'pieces' : (invItem.unit || 'units'),
          balanceAfter: finalStock,
          unitCost: invItem.costPrice || 0,
          totalCostImpact: -(item.costPrice * qtyToDeduct),
          performedBy: orderData.cashierName || 'POS Cashier',
          userRole: 'POS Cashier',
          notes: isLooseSale
            ? `POS Sale: Sold ${qtyToDeduct} Single Piece(s) (1 Box = ${ppb} Pcs). Remaining Store Stock: ${finalStock} Box(es) + ${invItem.storeBoxAllocations?.[orderData.storeId || '']?.loosePieces || 0} Loose Pcs = ${totalPiecesAfter} Total Pcs${batchNote}.`
            : `POS Sale: Sold ${qtyToDeduct} Unit(s)/Box(es) (${qtyToDeduct * ppb} Pcs). Remaining Stock: ${finalStock} ${invItem.unit || 'units'}${batchNote}.`,
        });
      }
    });

    // Record audits via registered warehouseStorageRef or direct fallback
    if (auditRecords.length > 0) {
      if (warehouseStorageRef && typeof warehouseStorageRef.addAuditRecords === 'function') {
        warehouseStorageRef.addAuditRecords(auditRecords);
      } else {
        try {
          const raw = safeStorage.getItem('rr_wh_audit_trail');
          const list = raw ? JSON.parse(raw) : [];
          const now = Date.now();
          const newRecs = auditRecords.map((a, idx) => ({
            ...a,
            id: `aud-${now}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toISOString(),
          }));
          safeStorage.setItem('rr_wh_audit_trail', JSON.stringify([...newRecs, ...list].slice(0, 1000)));
        } catch {}
      }
    }

    // Deduct stock in memory and persist via saveInventory so subscribers and Firestore are updated
    this.saveInventory(inventory);

    if (triggeredStoreLowStock) {
      setTimeout(() => soundEffects.playWarningChime(), 60);
    }

    // 2. Award or Deduct Loyalty Points
    if (orderData.customerPhone || orderData.customerId) {
      const customers = this.getCustomers();
      const cust = customers.find(
        (c) => c.id === orderData.customerId || (orderData.customerPhone && c.phone === orderData.customerPhone)
      );

      if (cust) {
        // 1 point per ₹10 spent
        const pointsEarned = Math.floor(orderData.grandTotal / 10);
        const pointsUsed = orderData.loyaltyPointsUsed || 0;

        cust.loyaltyPoints = Math.max(0, cust.loyaltyPoints - pointsUsed + pointsEarned);
        cust.totalSpent += orderData.grandTotal;
        cust.totalOrders += 1;

        // Tier upgrades
        if (cust.totalSpent >= 3000 && cust.tier !== 'Platinum Royal') {
          cust.tier = 'Platinum Royal';
          setTimeout(() => {
            this.addNotification({
              title: `👑 VIP Tier Upgrade: ${cust.name}`,
              message: `${cust.name} has been upgraded to Platinum Royal! Enjoy 25% VIP perks.`,
              type: 'loyalty_reward',
              targetRole: 'customer',
              read: false,
            });
          }, 80);
        } else if (cust.totalSpent >= 1200 && cust.tier === 'Silver') {
          cust.tier = 'Gold';
        }

        newOrder.loyaltyPointsEarned = pointsEarned;
        this.setCached(STORAGE_KEYS.CUSTOMERS, customers);
        safeStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
      }
    }

    // 3. Save order
    orders.unshift(newOrder);
    this.setCached(STORAGE_KEYS.ORDERS, orders);
    safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

    // Single unified notification broadcast for state synchronization
    this.notify();
    cloudSync.syncDocument('orders', newOrder.id, newOrder);
    newOrder.items.forEach((item) => {
      const invItem = inventory.find((i) => i.id === item.itemId || (item.sku && i.sku === item.sku));
      if (invItem) {
        cloudSync.syncDocument('inventory', invItem.id, invItem);
      }
    });
    cloudSync.debouncedSyncCollection('inventory', inventory, 50);

    // 4. Trigger audio & background notifications asynchronously (zero UI lag)
    setTimeout(() => {
      soundEffects.playSuccessChime();

      this.addNotification({
        title: `🛍️ New Order #${orderNumber} (${newOrder.source === 'customer_online' ? 'Online' : 'POS Counter'})`,
        message: `${newOrder.items.length} items • Total ${CURRENCY}${newOrder.grandTotal.toFixed(2)} [${newOrder.paymentMethod.toUpperCase()}]`,
        type: 'order_update',
        targetRole: 'all',
        read: false,
        linkTab: 'orders',
      });
    }, 10);

    return newOrder;
  }

  updateOrderStatus(orderId: string, newStatus: Order['status']): boolean {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    order.status = newStatus;
    this.saveOrders(orders);
    cloudSync.syncDocument('orders', order.id, order);

    this.addNotification({
      title: `Order #${order.orderNumber} Status: ${newStatus.toUpperCase()}`,
      message: `Your pan house order is now ${newStatus.toUpperCase()}!`,
      type: 'order_update',
      targetRole: 'customer',
      read: false,
      linkTab: 'orders',
    });

    return true;
  }

  // --- PROMOTIONS ---

  getPromotions(): Promotion[] {
    return this.getCached(STORAGE_KEYS.PROMOTIONS, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.PROMOTIONS);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    });
  }

  savePromotions(promos: Promotion[]) {
    this.setCached(STORAGE_KEYS.PROMOTIONS, promos);
    safeStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(promos));
    this.notify();
  }

  addPromotion(promo: Omit<Promotion, 'id' | 'usageCount'>): Promotion {
    const promos = this.getPromotions();
    const newPromo: Promotion = {
      ...promo,
      id: `promo-${Date.now()}`,
      usageCount: 0,
    };
    promos.unshift(newPromo);
    this.savePromotions(promos);

    // Send push notification for new promotion
    this.addNotification({
      title: `🔥 Special Deal Alert: ${newPromo.title}`,
      message: `Use code ${newPromo.code} to get ${newPromo.discountType === 'percentage' ? newPromo.discountValue + '%' : CURRENCY + newPromo.discountValue} OFF!`,
      type: 'discount_promo',
      targetRole: 'customer',
      read: false,
      linkTab: 'promos',
    });

    return newPromo;
  }

  togglePromotion(id: string): boolean {
    const promos = this.getPromotions();
    const promo = promos.find((p) => p.id === id);
    if (!promo) return false;
    promo.isActive = !promo.isActive;
    this.savePromotions(promos);
    return true;
  }

  deletePromotion(id: string): boolean {
    const promos = this.getPromotions();
    const filtered = promos.filter((p) => p.id !== id);
    if (filtered.length !== promos.length) {
      this.savePromotions(filtered);
      return true;
    }
    return false;
  }

  // --- NOTIFICATIONS ---

  getNotifications(): PushNotification[] {
    return this.getCached(STORAGE_KEYS.NOTIFICATIONS, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    });
  }

  saveNotifications(notifs: PushNotification[]) {
    const trimmed = notifs.slice(0, 50);
    this.setCached(STORAGE_KEYS.NOTIFICATIONS, trimmed);
    safeStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(trimmed));
    this.notify();
  }

  addNotification(notif: Omit<PushNotification, 'id' | 'timestamp'>) {
    const notifs = this.getNotifications();
    const newNotif: PushNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    notifs.unshift(newNotif);
    this.saveNotifications(notifs);

    // Browser Notification API trigger if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const nativeNotif = new Notification(newNotif.title, {
          body: newNotif.message,
          icon: '/favicon.ico',
        });
        nativeNotif.onclick = () => {
          try {
            window.focus();
            window.dispatchEvent(new CustomEvent('rr_navigate_notification', { detail: newNotif }));
          } catch (err) {
            console.warn('Native notification click handling failed', err);
          }
        };
      } catch (e) {
        console.warn('Native notification failed', e);
      }
    }
  }

  markNotificationAsRead(id: string) {
    const notifs = this.getNotifications();
    const notif = notifs.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      this.saveNotifications(notifs);
    }
  }

  markAllNotificationsAsRead() {
    const notifs = this.getNotifications();
    notifs.forEach((n) => (n.read = true));
    this.saveNotifications(notifs);
  }

  clearNotifications() {
    this.saveNotifications([]);
  }

  // --- BACKUP MANAGEMENT (Daily 12:00 AM and Manual) ---

  getBackups(): BackupSnapshot[] {
    return this.getCached(STORAGE_KEYS.BACKUPS, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.BACKUPS);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    });
  }

  createBackup(type: 'automated_daily' | 'manual' = 'manual', note?: string): BackupSnapshot {
    const backups = this.getBackups();
    const inventory = this.getInventory();
    const orders = this.getOrders();
    const customers = this.getCustomers();
    const promotions = this.getPromotions();
    const stores = this.getStores();
    const storeExpenses = this.getStoreExpenses();

    // Pull warehouse & supply chain data from warehouseStorageRef or safeStorage
    let warehouses: any[] = [];
    let suppliers: any[] = [];
    let purchaseOrders: any[] = [];
    let purchaseBills: any[] = [];
    let batches: any[] = [];
    let transfers: any[] = [];
    let indents: any[] = [];
    let adjustments: any[] = [];
    let auditTrail: any[] = [];

    if (warehouseStorageRef) {
      if (typeof warehouseStorageRef.getWarehouses === 'function') warehouses = warehouseStorageRef.getWarehouses();
      if (typeof warehouseStorageRef.getSuppliers === 'function') suppliers = warehouseStorageRef.getSuppliers();
      if (typeof warehouseStorageRef.getPurchaseOrders === 'function') purchaseOrders = warehouseStorageRef.getPurchaseOrders();
      if (typeof warehouseStorageRef.getPurchaseBills === 'function') purchaseBills = warehouseStorageRef.getPurchaseBills();
      if (typeof warehouseStorageRef.getBatches === 'function') batches = warehouseStorageRef.getBatches();
      if (typeof warehouseStorageRef.getStockTransfers === 'function') transfers = warehouseStorageRef.getStockTransfers();
      if (typeof warehouseStorageRef.getStoreIndents === 'function') indents = warehouseStorageRef.getStoreIndents();
      if (typeof warehouseStorageRef.getStockAdjustments === 'function') adjustments = warehouseStorageRef.getStockAdjustments();
      if (typeof warehouseStorageRef.getAuditTrail === 'function') auditTrail = warehouseStorageRef.getAuditTrail();
    } else {
      try {
        const rawWh = safeStorage.getItem('rr_wh_locations');
        if (rawWh) warehouses = JSON.parse(rawWh);
        const rawSup = safeStorage.getItem('rr_wh_suppliers');
        if (rawSup) suppliers = JSON.parse(rawSup);
        const rawPO = safeStorage.getItem('rr_wh_purchase_orders');
        if (rawPO) purchaseOrders = JSON.parse(rawPO);
        const rawPB = safeStorage.getItem('rr_wh_purchase_bills');
        if (rawPB) purchaseBills = JSON.parse(rawPB);
        const rawBatches = safeStorage.getItem('rr_wh_batches');
        if (rawBatches) batches = JSON.parse(rawBatches);
        const rawTr = safeStorage.getItem('rr_wh_transfers');
        if (rawTr) transfers = JSON.parse(rawTr);
        const rawInd = safeStorage.getItem('rr_wh_indents');
        if (rawInd) indents = JSON.parse(rawInd);
        const rawAdj = safeStorage.getItem('rr_wh_adjustments');
        if (rawAdj) adjustments = JSON.parse(rawAdj);
        const rawAud = safeStorage.getItem('rr_wh_audit_trail');
        if (rawAud) auditTrail = JSON.parse(rawAud);
      } catch {}
    }

    // Calculate store stock and inventory metrics
    let centralWarehouseStockUnits = 0;
    let storesTotalStockUnits = 0;
    const storeStockBreakdown: Record<string, { fullBoxes: number; loosePieces: number; totalUnits: number }> = {};

    stores.forEach((s) => {
      storeStockBreakdown[s.id] = { fullBoxes: 0, loosePieces: 0, totalUnits: 0 };
    });

    inventory.forEach((item) => {
      centralWarehouseStockUnits += (item.stockQuantity || 0);
      if (item.storeAllocations) {
        Object.entries(item.storeAllocations).forEach(([sId, qty]) => {
          storesTotalStockUnits += (qty || 0);
          if (storeStockBreakdown[sId]) {
            storeStockBreakdown[sId].totalUnits += (qty || 0);
          }
        });
      }
      if (item.storeBoxAllocations) {
        Object.entries(item.storeBoxAllocations).forEach(([sId, boxInfo]) => {
          if (storeStockBreakdown[sId]) {
            storeStockBreakdown[sId].fullBoxes += (boxInfo.fullBoxes || 0);
            storeStockBreakdown[sId].loosePieces += (boxInfo.loosePieces || 0);
          }
        });
      }
    });

    const snapshotPayload = {
      storeName: 'Richie Rich Pan House Enterprise',
      system: 'RICHIE_RICH_POS_CLOUD',
      version: '3.0',
      exportDate: new Date().toISOString(),
      note: note || `${type === 'automated_daily' ? 'Daily 12:00 AM Scheduled' : 'Manual Admin'} Full Snapshot`,
      // 1. Core Products, Orders & Customer Data
      inventory,
      orders,
      customers,
      promotions,
      stores,
      storeExpenses,
      // 2. Complete Warehouse, Batches & Logistics
      warehouses,
      suppliers,
      purchaseOrders,
      purchaseBills,
      batches,
      transfers,
      indents,
      adjustments,
      auditTrail,
      // 3. Complete PocketBase / Backend DB Collections Snapshot
      pocketbase_collections: {
        inventory,
        orders,
        customers,
        promotions,
        stores,
        store_expenses: storeExpenses,
        warehouses,
        suppliers,
        purchase_orders: purchaseOrders,
        purchase_bills: purchaseBills,
        batches,
        stock_transfers: transfers,
        store_indents: indents,
        stock_adjustments: adjustments,
        stock_audit_trail: auditTrail,
      },
      // 4. Store Stock & Inventory Aggregation Summary
      storeStockAndInventorySummary: {
        totalInventoryItems: inventory.length,
        centralWarehouseStockUnits,
        storesTotalStockUnits,
        totalNetworkStockUnits: centralWarehouseStockUnits + storesTotalStockUnits,
        storeStockBreakdown,
        totalBatches: batches.length,
        activeBatches: batches.filter((b: any) => (b.quantityInStock || 0) > 0).length,
        totalTransfers: transfers.length,
        inTransitTransfers: transfers.filter((t: any) => t.status === 'dispatched_in_transit').length,
        totalPurchaseBills: purchaseBills.length,
      },
    };

    const dataJson = JSON.stringify(snapshotPayload, null, 2);
    const sizeKb = Math.round((new Blob([dataJson]).size / 1024) * 10) / 10;
    const checksum = `SHA256-RR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const newSnapshot: BackupSnapshot = {
      id: `backup-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      itemCount: inventory.length,
      orderCount: orders.length,
      customerCount: customers.length,
      fileSizeKb: sizeKb,
      checksum,
      dataJson,
    };

    const updatedBackups = [newSnapshot, ...backups].slice(0, 30);
    this.setCached(STORAGE_KEYS.BACKUPS, updatedBackups);
    safeStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(updatedBackups));

    this.addNotification({
      title: `💾 Full Backup Created: ${type === 'automated_daily' ? 'Daily 12:00 AM Auto-Backup' : 'Manual Snapshot'}`,
      message: `Archived ${inventory.length} SKUs, ${orders.length} orders, ${storesTotalStockUnits} store stock units & PocketBase collections (${sizeKb} KB).`,
      type: 'system_backup',
      targetRole: 'admin',
      read: false,
      linkTab: 'backups',
    });

    this.notify();
    return newSnapshot;
  }

  restoreBackup(backupId: string): boolean {
    const backups = this.getBackups();
    const backup = backups.find((b) => b.id === backupId);
    if (!backup) return false;

    try {
      const parsed = JSON.parse(backup.dataJson);
      const target = parsed.payload || parsed;
      const { isValid, sanitized } = validateAndSanitizeBackupPayload(target);

      if (!isValid) {
        console.error('Backup validation failed during restore');
        return false;
      }

      this.restoreSanitizedData(sanitized);

      this.addNotification({
        title: `🔄 System Database Restored`,
        message: `Database successfully verified and restored from snapshot ${backup.checksum} dated ${new Date(backup.timestamp).toLocaleString()}.`,
        type: 'system_backup',
        targetRole: 'admin',
        read: false,
        linkTab: 'backups',
      });

      this.notify();
      return true;
    } catch (e) {
      console.error('Failed to restore backup', e);
      return false;
    }
  }

  public checkDailyBackupScheduler(): void {
    if (typeof window === 'undefined') return;
    try {
      const todayStr = getLocalDateString(new Date());
      const lastBackupDate = safeStorage.getItem(STORAGE_KEYS.LAST_BACKUP_DATE);
      if (lastBackupDate !== todayStr) {
        // Automatically create daily 12:00 AM automated backup with full PocketBase collections, Store Stock and Inventory
        this.createBackup('automated_daily', `Daily 12:00 AM Automated Snapshot [${todayStr}]`);
        safeStorage.setItem(STORAGE_KEYS.LAST_BACKUP_DATE, todayStr);
      }
    } catch (e) {
      console.warn('Daily auto-backup scheduler check error:', e);
    }
  }

  restoreSanitizedData(data: {
    inventory?: InventoryItem[];
    orders?: Order[];
    customers?: Customer[];
    promotions?: Promotion[];
    stores?: StoreLocation[];
    storeExpenses?: any[];
    warehouses?: any[];
    suppliers?: any[];
    purchaseOrders?: any[];
    purchaseBills?: any[];
    batches?: any[];
    transfers?: any[];
    indents?: any[];
    adjustments?: any[];
    auditTrail?: any[];
  }): void {
    this.invalidateCache();
    if (data.inventory && Array.isArray(data.inventory)) {
      safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(data.inventory));
    }
    if (data.orders && Array.isArray(data.orders)) {
      safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(data.orders));
    }
    if (data.customers && Array.isArray(data.customers)) {
      safeStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(data.customers));
    }
    if (data.promotions && Array.isArray(data.promotions)) {
      safeStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(data.promotions));
    }
    if (data.stores && Array.isArray(data.stores)) {
      safeStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(data.stores));
    }
    if (data.storeExpenses && Array.isArray(data.storeExpenses)) {
      safeStorage.setItem('rr_store_expenses', JSON.stringify(data.storeExpenses));
    }

    // Restore warehouse collections if present
    if (warehouseStorageRef) {
      if (data.warehouses && Array.isArray(data.warehouses) && typeof warehouseStorageRef.saveWarehouses === 'function') {
        warehouseStorageRef.saveWarehouses(data.warehouses);
      }
      if (data.suppliers && Array.isArray(data.suppliers) && typeof warehouseStorageRef.saveSuppliers === 'function') {
        warehouseStorageRef.saveSuppliers(data.suppliers);
      }
      if (data.purchaseOrders && Array.isArray(data.purchaseOrders) && typeof warehouseStorageRef.savePurchaseOrders === 'function') {
        warehouseStorageRef.savePurchaseOrders(data.purchaseOrders);
      }
      if (data.purchaseBills && Array.isArray(data.purchaseBills) && typeof warehouseStorageRef.savePurchaseBills === 'function') {
        warehouseStorageRef.savePurchaseBills(data.purchaseBills);
      }
      if (data.batches && Array.isArray(data.batches) && typeof warehouseStorageRef.saveBatches === 'function') {
        warehouseStorageRef.saveBatches(data.batches);
      }
      if (data.transfers && Array.isArray(data.transfers) && typeof warehouseStorageRef.saveStockTransfers === 'function') {
        warehouseStorageRef.saveStockTransfers(data.transfers);
      }
      if (data.indents && Array.isArray(data.indents) && typeof warehouseStorageRef.saveStoreIndents === 'function') {
        warehouseStorageRef.saveStoreIndents(data.indents);
      }
      if (data.adjustments && Array.isArray(data.adjustments) && typeof warehouseStorageRef.saveStockAdjustments === 'function') {
        warehouseStorageRef.saveStockAdjustments(data.adjustments);
      }
      if (data.auditTrail && Array.isArray(data.auditTrail) && typeof warehouseStorageRef.saveAuditTrail === 'function') {
        warehouseStorageRef.saveAuditTrail(data.auditTrail);
      }
    }
    this.notify();
  }

  // --- STOCK SUMMARY & METRICS HELPERS ---

  getItemStockSummary(item: InventoryItem): ItemStockSummary {
    return getItemStockSummary(item);
  }

  getCatalogStockMetrics(inventoryList?: InventoryItem[]): CatalogStockMetrics {
    const list = inventoryList || this.getInventory();
    return getCatalogStockMetrics(list);
  }

  // --- FINANCIAL STATS & ANALYTICS ---

  getFinancialStats(): StoreFinancialStats {
    const inventory = this.getInventory();
    const orders = this.getOrders();
    const customers = this.getCustomers();

    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalProfit = 0;

    orders.forEach((ord) => {
      if (ord.paymentStatus !== 'refunded') {
        totalRevenue += ord.grandTotal;
        totalCOGS += ord.totalCost;
        totalProfit += ord.totalProfit;
      }
    });

    const overallMarginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const metrics = getCatalogStockMetrics(inventory);
    const loyaltyPointsIssued = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCOGS: Math.round(totalCOGS * 100) / 100,
      grossProfit: Math.round(totalProfit * 100) / 100,
      overallMarginPercent: Math.round(overallMarginPercent * 10) / 10,
      totalOrdersCount: orders.length,
      lowStockItemsCount: metrics.lowStockSKUs,
      outOfStockCount: metrics.outOfStockSKUs,
      totalInventoryValue: Math.round(metrics.totalValuationCost * 100) / 100,
      totalCustomersCount: customers.length,
      loyaltyPointsIssued,
      centralStockUnits: metrics.centralWHStockUnits,
      storesStockUnits: metrics.storesTotalStockUnits,
      totalStockUnits: metrics.totalNetworkStockUnits,
      centralInventoryValue: Math.round(metrics.centralValuationCost * 100) / 100,
      storesInventoryValue: Math.round(metrics.storesValuationCost * 100) / 100,
    };
  }

  // --- EXPORT REPORTS (CSV / JSON) ---

  exportMonthlyAnalyticalReportCSV(): string {
    const stats = this.getFinancialStats();
    const inventory = this.getInventory();
    const orders = this.getOrders();
    const currentDate = new Date().toISOString().split('T')[0];

    let csv = `RICHIE RICH PAN HOUSE - MONTHLY ANALYTICAL & FINANCIAL REPORT\n`;
    csv += `Generated Date,${currentDate}\n`;
    csv += `Currency,${CURRENCY} (INR)\n\n`;

    csv += `EXECUTIVE FINANCIAL SUMMARY\n`;
    csv += `Metric,Value\n`;
    csv += `Gross Sales Revenue,${CURRENCY}${stats.totalRevenue.toFixed(2)}\n`;
    csv += `Cost of Goods Sold (COGS),${CURRENCY}${stats.totalCOGS.toFixed(2)}\n`;
    csv += `Net Gross Profit,${CURRENCY}${stats.grossProfit.toFixed(2)}\n`;
    csv += `Overall Profit Margin (%),${stats.overallMarginPercent.toFixed(1)}%\n`;
    csv += `Total Orders Processed,${stats.totalOrdersCount}\n`;
    csv += `Total Active Customer Profiles,${stats.totalCustomersCount}\n`;
    csv += `Central WH Stock Units,${stats.centralStockUnits || 0}\n`;
    csv += `Store Outlets Stock Units,${stats.storesStockUnits || 0}\n`;
    csv += `Total Network Stock Units,${stats.totalStockUnits || 0}\n`;
    csv += `Total Inventory Valuation (Cost),${CURRENCY}${stats.totalInventoryValue.toFixed(2)}\n`;
    csv += `Central WH Valuation (Cost),${CURRENCY}${(stats.centralInventoryValue || 0).toFixed(2)}\n`;
    csv += `Stores Valuation (Cost),${CURRENCY}${(stats.storesInventoryValue || 0).toFixed(2)}\n`;
    csv += `Low Stock Alerts Pending,${stats.lowStockItemsCount}\n\n`;

    csv += `INVENTORY ITEM PROFIT MARGIN & STOCK BREAKDOWN MATRIX\n`;
    csv += `SKU,Barcode,Item Name,Category,Cost Price (${CURRENCY}),Selling Price (${CURRENCY}),Profit/Unit (${CURRENCY}),Margin (%),Central WH Stock,Stores Stock,Total Network Stock,Stock Status\n`;

    inventory.forEach((item) => {
      const summary = getItemStockSummary(item);
      const status = summary.totalNetworkStock === 0 ? 'OUT OF STOCK' : summary.totalNetworkStock <= item.lowStockThreshold ? 'LOW STOCK' : 'HEALTHY';
      csv += `"${item.sku}","${item.barcode}","${item.name.replace(/"/g, '""')}","${item.category}",${item.costPrice},${item.sellingPrice},${item.profitPerUnit || 0},${item.marginPercentage || 0}%,${summary.centralWHStock},${summary.totalStoresStock},${summary.totalNetworkStock},"${status}"\n`;
    });

    csv += `\nTRANSACTION SALES AUDIT LOG\n`;
    csv += `Order #,Date,Channel,Customer,Items Qty,Subtotal (${CURRENCY}),Discount (${CURRENCY}),Grand Total (${CURRENCY}),Total Cost (${CURRENCY}),Profit (${CURRENCY}),Payment Method,Status\n`;

    orders.forEach((o) => {
      const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
      csv += `"${o.orderNumber}","${o.createdAt.split('T')[0]}","${o.source}","${o.customerName || 'Walk-in'}",${itemCount},${o.subtotal},${o.discountAmount},${o.grandTotal},${o.totalCost},${o.totalProfit},"${o.paymentMethod}","${o.status}"\n`;
    });

    return csv;
  }

  exportDailyCollectionReportCSV(selectedDate?: string, storeId?: string): string {
    const orders = this.getOrders();
    const targetDate = selectedDate || getLocalDateString(new Date());
    
    // Filter orders by date & optional store (strictly accurate for 12:00 AM local midnight resets)
    const dayOrders = orders.filter((o) => {
      const orderDate = getLocalDateString(o.createdAt);
      const matchesDate = orderDate === targetDate;
      const matchesStore = !storeId || storeId === 'all' || o.storeId === storeId;
      return matchesDate && matchesStore;
    });

    const cashOrders = dayOrders.filter((o) => o.paymentMethod === 'cash');
    const upiOrders = dayOrders.filter((o) => o.paymentMethod === 'upi_qr');
    const cardOrders = dayOrders.filter((o) => o.paymentMethod === 'card');
    const otherOrders = dayOrders.filter((o) => !['cash', 'upi_qr', 'card'].includes(o.paymentMethod));

    const totalSales = dayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalCash = cashOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalUPI = upiOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalCard = cardOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalOther = otherOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalTax = dayOrders.reduce((sum, o) => sum + o.taxAmount, 0);
    const totalProfit = dayOrders.reduce((sum, o) => sum + o.totalProfit, 0);

    let csv = `RICHIE RICH PAN HOUSE - DAILY SALES & COLLECTION RECONCILIATION REPORT\n`;
    csv += `Audit Date,${targetDate}\n`;
    csv += `Store Filter,${storeId && storeId !== 'all' ? storeId.toUpperCase() : 'ALL STORES & OUTLETS'}\n`;
    csv += `Currency,${CURRENCY} (INR)\n`;
    csv += `Generated Timestamp,${new Date().toISOString()}\n\n`;

    csv += `EXECUTIVE DAILY COLLECTION SUMMARY\n`;
    csv += `Payment Method,Total Amount (${CURRENCY}),Transaction Count,Share of Total (%)\n`;
    csv += `ONLY CASH,${totalCash.toFixed(2)},${cashOrders.length},${totalSales > 0 ? ((totalCash / totalSales) * 100).toFixed(1) : 0}%\n`;
    csv += `ONLY UPI (QR / PhonePe / GPay),${totalUPI.toFixed(2)},${upiOrders.length},${totalSales > 0 ? ((totalUPI / totalSales) * 100).toFixed(1) : 0}%\n`;
    csv += `ONLY CARD (POS Swipe / Tap),${totalCard.toFixed(2)},${cardOrders.length},${totalSales > 0 ? ((totalCard / totalSales) * 100).toFixed(1) : 0}%\n`;
    if (otherOrders.length > 0) {
      csv += `LOYALTY / OTHER,${totalOther.toFixed(2)},${otherOrders.length},${totalSales > 0 ? ((totalOther / totalSales) * 100).toFixed(1) : 0}%\n`;
    }
    csv += `TOTAL SALE TODAY / DAY REVENUE,${totalSales.toFixed(2)},${dayOrders.length},100.0%\n\n`;

    csv += `FINANCIAL BREAKDOWN\n`;
    csv += `Gross Daily Sales,${CURRENCY}${totalSales.toFixed(2)}\n`;
    csv += `Total Tax Collected (GST),${CURRENCY}${totalTax.toFixed(2)}\n`;
    csv += `Estimated Gross Profit,${CURRENCY}${totalProfit.toFixed(2)}\n`;
    csv += `Average Ticket Size,${CURRENCY}${dayOrders.length > 0 ? (totalSales / dayOrders.length).toFixed(2) : '0.00'}\n\n`;

    csv += `TRANSACTION REGISTER LOG FOR ${targetDate}\n`;
    csv += `Order #,Time,Store,Counter,Cashier,Customer,Payment Mode,Items Qty,Subtotal,Discount,Tax,Grand Total,Profit,Status\n`;

    dayOrders.forEach((o) => {
      const timeStr = new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const qty = o.items.reduce((s, i) => s + i.quantity, 0);
      csv += `"${o.orderNumber}","${timeStr}","${o.storeName || 'Main'}","${o.counterName || o.counterNumber || 1}","${o.cashierName || 'Staff'}","${o.customerName || 'Walk-in'}","${o.paymentMethod.toUpperCase()}",${qty},${o.subtotal.toFixed(2)},${o.discountAmount.toFixed(2)},${o.taxAmount.toFixed(2)},${o.grandTotal.toFixed(2)},${o.totalProfit.toFixed(2)},"${o.status}"\n`;
    });

    return csv;
  }

  exportDateRangeStatementCSV(
    startDate: string,
    endDate: string,
    storeId: string = 'all',
    paymentMethod: string = 'all'
  ): string {
    const orders = this.getOrders();
    const startStr = startDate;
    const endStr = endDate;

    // Filter orders by date range, store, and payment method
    const rangeOrders = orders.filter((o) => {
      const orderDate = getLocalDateString(o.createdAt);
      const inDateRange = orderDate >= startStr && orderDate <= endStr;
      const matchesStore =
        !storeId ||
        storeId === 'all' ||
        o.storeId === storeId ||
        (o.storeName && o.storeName.toLowerCase().includes(storeId.toLowerCase()));
      const matchesPayment = !paymentMethod || paymentMethod === 'all' || o.paymentMethod === paymentMethod;
      return inDateRange && matchesStore && matchesPayment;
    });

    const cashOrders = rangeOrders.filter((o) => o.paymentMethod === 'cash');
    const upiOrders = rangeOrders.filter((o) => o.paymentMethod === 'upi_qr');
    const cardOrders = rangeOrders.filter((o) => o.paymentMethod === 'card');
    const otherOrders = rangeOrders.filter((o) => !['cash', 'upi_qr', 'card'].includes(o.paymentMethod));

    const totalSales = rangeOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalCash = cashOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalUPI = upiOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalCard = cardOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalOther = otherOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalTax = rangeOrders.reduce((sum, o) => sum + o.taxAmount, 0);
    const totalProfit = rangeOrders.reduce((sum, o) => sum + o.totalProfit, 0);

    let csv = `RICHIE RICH PAN HOUSE - MASTER ORDERS & SALES STATEMENT\n`;
    csv += `Statement Period,${startStr} to ${endStr}\n`;
    csv += `Store Filter,${storeId && storeId !== 'all' ? storeId.toUpperCase() : 'ALL STORES & OUTLETS'}\n`;
    csv += `Payment Filter,${paymentMethod && paymentMethod !== 'all' ? paymentMethod.toUpperCase() : 'ALL PAYMENT MODES'}\n`;
    csv += `Currency,${CURRENCY} (INR)\n`;
    csv += `Total Transactions,${rangeOrders.length}\n`;
    csv += `Generated Timestamp,${new Date().toISOString()}\n\n`;

    csv += `EXECUTIVE FINANCIAL STATEMENT SUMMARY\n`;
    csv += `Metric,Value\n`;
    csv += `Gross Sales Revenue,${CURRENCY}${totalSales.toFixed(2)}\n`;
    csv += `Total GST Collected,${CURRENCY}${totalTax.toFixed(2)}\n`;
    csv += `Total Estimated Profit,${CURRENCY}${totalProfit.toFixed(2)}\n`;
    csv += `Average Order Value,${CURRENCY}${rangeOrders.length > 0 ? (totalSales / rangeOrders.length).toFixed(2) : '0.00'}\n\n`;

    csv += `PAYMENT METHOD RECONCILIATION\n`;
    csv += `Payment Method,Total Amount (${CURRENCY}),Bills Count,Share (%)\n`;
    csv += `CASH,${totalCash.toFixed(2)},${cashOrders.length},${totalSales > 0 ? ((totalCash / totalSales) * 100).toFixed(1) : 0}%\n`;
    csv += `UPI / QR CODE,${totalUPI.toFixed(2)},${upiOrders.length},${totalSales > 0 ? ((totalUPI / totalSales) * 100).toFixed(1) : 0}%\n`;
    csv += `CARD / POS SWIPE,${totalCard.toFixed(2)},${cardOrders.length},${totalSales > 0 ? ((totalCard / totalSales) * 100).toFixed(1) : 0}%\n`;
    if (otherOrders.length > 0) {
      csv += `LOYALTY / OTHER,${totalOther.toFixed(2)},${otherOrders.length},${totalSales > 0 ? ((totalOther / totalSales) * 100).toFixed(1) : 0}%\n`;
    }
    csv += `TOTAL,${totalSales.toFixed(2)},${rangeOrders.length},100.0%\n\n`;

    csv += `ITEMIZED TRANSACTION LEDGER (${startStr} to ${endStr})\n`;
    csv += `Order #,Date,Time,Outlet / Store,Counter,Cashier / Staff,Customer Name,Customer Phone,Items Summary,Qty,Subtotal,Discount,GST Tax,Grand Total,Profit,Payment Mode,Status\n`;

    rangeOrders.forEach((o) => {
      const orderDate = getLocalDateString(o.createdAt);
      const timeStr = new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const qty = o.items.reduce((s, i) => s + i.quantity, 0);
      const itemsSummary = o.items.map((i) => `${i.quantity}x ${i.name}`).join('; ');
      csv += `"${o.orderNumber}","${orderDate}","${timeStr}","${(o.storeName || 'Main Store').replace(/"/g, '""')}","${o.counterName || o.counterNumber || 1}","${(o.cashierName || 'Staff').replace(/"/g, '""')}","${(o.customerName || 'Walk-in Guest').replace(/"/g, '""')}","${o.customerPhone || ''}","${itemsSummary.replace(/"/g, '""')}",${qty},${o.subtotal.toFixed(2)},${o.discountAmount.toFixed(2)},${o.taxAmount.toFixed(2)},${o.grandTotal.toFixed(2)},${o.totalProfit.toFixed(2)},"${o.paymentMethod.toUpperCase()}","${o.status}"\n`;
    });

    return csv;
  }

  // =========================================================================
  // STORE ADMIN CREDENTIALS MANAGEMENT
  // =========================================================================
  getStoreAdmins(): StoreAdminCredential[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.STORE_ADMINS);
      if (!data) return INITIAL_STORE_ADMINS;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_STORE_ADMINS;
    } catch {
      return INITIAL_STORE_ADMINS;
    }
  }

  saveStoreAdmins(admins: StoreAdminCredential[]): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.STORE_ADMINS, JSON.stringify(admins));
      this.notifySubscribers();
    } catch (e) {
      console.error('Failed to save store admins:', e);
    }
  }

  addStoreAdmin(adminData: Omit<StoreAdminCredential, 'id' | 'createdAt'>): StoreAdminCredential {
    const admins = this.getStoreAdmins();
    const newAdmin: StoreAdminCredential = {
      ...adminData,
      id: `sa-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    admins.push(newAdmin);
    this.saveStoreAdmins(admins);
    return newAdmin;
  }

  updateStoreAdmin(id: string, updates: Partial<StoreAdminCredential>): boolean {
    const admins = this.getStoreAdmins();
    const idx = admins.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    admins[idx] = { ...admins[idx], ...updates };
    this.saveStoreAdmins(admins);
    return true;
  }

  deleteStoreAdmin(id: string): boolean {
    const admins = this.getStoreAdmins();
    const filtered = admins.filter((a) => a.id !== id);
    if (filtered.length === admins.length) return false;
    this.saveStoreAdmins(filtered);
    return true;
  }

  // =========================================================================
  // STORE EXPENSES MANAGEMENT
  // =========================================================================
  getStoreExpenses(storeId?: string): StoreExpense[] {
    const allExpenses = this.getCached(STORAGE_KEYS.STORE_EXPENSES, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.STORE_EXPENSES);
        let expenses: StoreExpense[] = [];
        if (data) {
          const parsed = JSON.parse(data);
          expenses = Array.isArray(parsed) ? parsed : [];
        }
        return expenses;
      } catch {
        return [];
      }
    });

    if (storeId && storeId !== 'all') {
      return allExpenses.filter((e) => e.storeId === storeId);
    }
    return allExpenses;
  }

  saveStoreExpenses(expenses: StoreExpense[]): void {
    try {
      this.setCached(STORAGE_KEYS.STORE_EXPENSES, expenses);
      safeStorage.setItem(STORAGE_KEYS.STORE_EXPENSES, JSON.stringify(expenses));
      this.notifySubscribers();
      cloudSync.debouncedSyncCollection('store_expenses', expenses);
    } catch (e) {
      console.error('Failed to save store expenses:', e);
    }
  }

  addStoreExpense(
    expenseData: Omit<StoreExpense, 'id' | 'createdAt' | 'voucherNumber'> & { voucherNumber?: string }
  ): StoreExpense {
    const expenses = this.getStoreExpenses();
    const storeShort = (expenseData.storeId || 'GEN').toUpperCase().slice(0, 3);
    const voucherNumber =
      expenseData.voucherNumber?.trim() ||
      `EXP-${storeShort}-${Math.floor(100 + Math.random() * 900)}`;

    const newExpense: StoreExpense = {
      ...expenseData,
      voucherNumber,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    expenses.unshift(newExpense);
    this.saveStoreExpenses(expenses);
    cloudSync.syncDocument('store_expenses', newExpense.id, newExpense);

    this.addNotification({
      title: `Store Expense Added: ${CURRENCY}${newExpense.amount}`,
      message: `[${newExpense.storeName}] ${newExpense.description} (${newExpense.category.replace('_', ' ')}) logged by ${newExpense.loggedBy}`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });

    return newExpense;
  }

  updateStoreExpense(id: string, updates: Partial<StoreExpense>): boolean {
    const expenses = this.getStoreExpenses();
    const idx = expenses.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    expenses[idx] = { ...expenses[idx], ...updates };
    this.saveStoreExpenses(expenses);
    cloudSync.syncDocument('store_expenses', expenses[idx].id, expenses[idx]);
    return true;
  }

  deleteStoreExpense(id: string): boolean {
    const expenses = this.getStoreExpenses();
    const filtered = expenses.filter((e) => e.id !== id);
    if (filtered.length === expenses.length) return false;
    this.saveStoreExpenses(filtered);
    cloudSync.deleteDocument('store_expenses', id);
    return true;
  }

  // =========================================================================
  // STORE FINANCIAL SUMMARY (SALES CREDIT - EXPENSES DEBIT = NET BALANCE)
  // =========================================================================
  getStoreFinancialSummary(storeId: string, startDate?: string, endDate?: string): StoreFinancialSummary {
    const stores = this.getStores();
    const storeObj = stores.find((s) => s.id === storeId) || {
      id: storeId,
      name: `Store (${storeId})`,
    };

    const allOrders = this.getOrders();
    const allExpenses = this.getStoreExpenses(storeId);

    // Filter orders by store and date
    const storeOrders = allOrders.filter((o) => {
      const matchStore = !storeId || storeId === 'all' || o.storeId === storeId;
      if (!matchStore) return false;
      if (o.status === 'cancelled') return false;

      const orderDate = o.createdAt.split('T')[0];
      if (startDate && orderDate < startDate) return false;
      if (endDate && orderDate > endDate) return false;
      return true;
    });

    // Filter expenses by date
    const storeExpenses = allExpenses.filter((e) => {
      const matchStore = !storeId || storeId === 'all' || e.storeId === storeId;
      if (!matchStore) return false;
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      return true;
    });

    // Calculate Sales Breakdown (Credit Inflow)
    const salesByPayment = {
      cash: 0,
      upi_qr: 0,
      card: 0,
      loyalty_points: 0,
      split: 0,
    };

    let totalSalesCredit = 0;
    let totalGSTCollected = 0;

    storeOrders.forEach((o) => {
      totalSalesCredit += o.grandTotal;
      totalGSTCollected += o.taxAmount || 0;
      if (o.paymentMethod === 'cash') salesByPayment.cash += o.grandTotal;
      else if (o.paymentMethod === 'upi_qr') salesByPayment.upi_qr += o.grandTotal;
      else if (o.paymentMethod === 'card') salesByPayment.card += o.grandTotal;
      else if (o.paymentMethod === 'loyalty_points') salesByPayment.loyalty_points += o.grandTotal;
      else salesByPayment.split += o.grandTotal;
    });

    // Calculate Expenses Breakdown (Debit Outflow)
    const expensesByCategory: Record<StoreExpenseCategory, number> = {
      rent: 0,
      utilities: 0,
      staff_salary: 0,
      staff_advance: 0,
      maintenance: 0,
      supplies: 0,
      raw_materials_petty: 0,
      marketing: 0,
      logistics: 0,
      cleaning: 0,
      miscellaneous: 0,
      daily_supplies: 0,
      electricity_utility: 0,
      rent_lease: 0,
      maintenance_repairs: 0,
      store_refreshments: 0,
      local_vendor: 0,
      misc: 0,
    };

    const expensesByPayment = {
      cash: 0,
      upi: 0,
      bank_transfer: 0,
      card: 0,
      cheque: 0,
    };

    let totalExpensesDebit = 0;

    storeExpenses.forEach((e) => {
      totalExpensesDebit += e.amount;
      if (expensesByCategory[e.category] !== undefined) {
        expensesByCategory[e.category] += e.amount;
      } else {
        expensesByCategory.miscellaneous += e.amount;
      }

      if (e.paymentMethod === 'cash') expensesByPayment.cash += e.amount;
      else if (e.paymentMethod === 'upi') expensesByPayment.upi += e.amount;
      else if (e.paymentMethod === 'bank_transfer') expensesByPayment.bank_transfer += e.amount;
      else if (e.paymentMethod === 'card') expensesByPayment.card += e.amount;
      else if (e.paymentMethod === 'cheque') expensesByPayment.cheque += e.amount;
      else expensesByPayment.cash += e.amount;
    });

    // Net Balance = Credit (Sales) - Debit (Expenses)
    const netStoreBalance = totalSalesCredit - totalExpensesDebit;

    // Expected Physical Cash in Drawer = Cash Sales - Cash Expenses Paid Out
    const expectedCashInDrawer = salesByPayment.cash - expensesByPayment.cash;

    const totalOrdersCount = storeOrders.length;
    const averageOrderValue = totalOrdersCount > 0 ? totalSalesCredit / totalOrdersCount : 0;
    const profitMarginPercent =
      totalSalesCredit > 0 ? ((netStoreBalance) / totalSalesCredit) * 100 : 0;

    const salesByMode = {
      cash: salesByPayment.cash,
      upi: salesByPayment.upi_qr,
      card: salesByPayment.card,
    };

    const expensesByMode = {
      cash: expensesByPayment.cash,
      online: totalExpensesDebit - expensesByPayment.cash,
    };

    return {
      storeId: storeObj.id,
      storeName: storeObj.name,
      totalSales: totalSalesCredit,
      totalSalesCredit,
      orderCount: totalOrdersCount,
      totalOrdersCount,
      salesByMode,
      salesByPayment,
      totalExpenses: totalExpensesDebit,
      totalExpensesDebit,
      expenseCount: storeExpenses.length,
      expensesByMode,
      categoryBreakdown: expensesByCategory,
      expensesByCategory,
      expensesByPayment,
      netStoreBalance,
      expectedCashInDrawer,
      profitMarginPercent,
      averageOrderValue,
      totalGSTCollected,
    };
  }

  exportStorePnLCSV(storeId: string, startDate?: string, endDate?: string): string {
    const summary = this.getStoreFinancialSummary(storeId, startDate, endDate);
    const expenses = this.getStoreExpenses(storeId);

    let csv = `RICHIE RICH PAN HOUSE - STORE FINANCIAL P&L & EXPENSE LEDGER\n`;
    csv += `Store Outlet,"${summary.storeName}" (${summary.storeId})\n`;
    csv += `Date Period,${startDate || 'All Past'} to ${endDate || 'Present'}\n`;
    csv += `Generated Timestamp,${new Date().toISOString()}\n\n`;

    csv += `EXECUTIVE FINANCIAL POSITION\n`;
    csv += `Metric,Amount (${CURRENCY})\n`;
    csv += `TOTAL STORE SALES (CREDIT INFLOW),${summary.totalSalesCredit.toFixed(2)}\n`;
    csv += `TOTAL STORE EXPENSES (DEBIT OUTFLOW),${summary.totalExpensesDebit.toFixed(2)}\n`;
    csv += `NET STORE BALANCE (PROFIT/LOSS),${summary.netStoreBalance.toFixed(2)}\n`;
    csv += `EXPECTED CASH IN DRAWER (Cash Sales - Cash Expenses),${summary.expectedCashInDrawer.toFixed(2)}\n`;
    csv += `TOTAL GST COLLECTED,${summary.totalGSTCollected.toFixed(2)}\n`;
    csv += `TOTAL ORDERS BILLED,${summary.totalOrdersCount}\n`;
    csv += `AVERAGE ORDER VALUE (AOV),${summary.averageOrderValue.toFixed(2)}\n\n`;

    csv += `SALES COLLECTION BREAKDOWN\n`;
    csv += `Payment Mode,Credit Amount (${CURRENCY})\n`;
    csv += `Cash,${summary.salesByPayment.cash.toFixed(2)}\n`;
    csv += `UPI QR,${summary.salesByPayment.upi_qr.toFixed(2)}\n`;
    csv += `Card,${summary.salesByPayment.card.toFixed(2)}\n`;
    csv += `Loyalty Points,${summary.salesByPayment.loyalty_points.toFixed(2)}\n`;
    csv += `Split / Other,${summary.salesByPayment.split.toFixed(2)}\n\n`;

    csv += `EXPENSE CATEGORY BREAKDOWN\n`;
    csv += `Expense Category,Debit Amount (${CURRENCY})\n`;
    Object.entries(summary.expensesByCategory).forEach(([cat, amt]) => {
      if (amt > 0) {
        csv += `"${cat.replace('_', ' ').toUpperCase()}",${amt.toFixed(2)}\n`;
      }
    });
    csv += `\n`;

    csv += `DETAILED STORE EXPENSES LOG\n`;
    csv += `Date,Voucher #,Category,Description,Paid To,Payment Mode,Logged By,Amount (${CURRENCY})\n`;
    expenses.forEach((e) => {
      const desc = (e.description || e.title || '').replace(/"/g, '""');
      const paidTo = (e.paidTo || e.paidToOrRecipient || '').replace(/"/g, '""');
      const mode = (e.paymentMethod || e.paymentMode || '').toUpperCase();
      const logged = (e.loggedBy || e.paidBy || '').replace(/"/g, '""');
      const amt = (e.amount || 0).toFixed(2);
      csv += `"${e.date || ''}","${e.voucherNumber || ''}","${e.category || ''}","${desc}","${paidTo}","${mode}","${logged}",${amt}\n`;
    });

    return csv;
  }
}

export const storage = StorageService.getInstance();

let warehouseStorageRef: any = null;
export function setWarehouseStorageRef(ref: any) {
  warehouseStorageRef = ref;
}
export function getWarehouseStorageRef() {
  return warehouseStorageRef;
}

/**
 * Calculates current stock for a single inventory item across Central Warehouse and Retail Stores
 */
export function getItemStockSummary(item: InventoryItem): ItemStockSummary {
  const centralWHStock = Math.max(0, Number(item?.stockQuantity) || 0);
  const alloc = item?.storeAllocations || {};
  let totalStoresStock = 0;
  const storesStock: Record<string, number> = {};

  for (const [storeId, qty] of Object.entries(alloc)) {
    const validQty = Math.max(0, typeof qty === 'number' && !isNaN(qty) ? Math.floor(qty) : 0);
    storesStock[storeId] = validQty;
    totalStoresStock += validQty;
  }

  const totalNetworkStock = centralWHStock + totalStoresStock;

  return {
    centralWHStock,
    storesStock,
    totalStoresStock,
    totalNetworkStock,
  };
}

/**
 * Calculates global catalog stock metrics across all items, stores, and Central Warehouse
 */
export function getCatalogStockMetrics(inventoryList: InventoryItem[]): CatalogStockMetrics {
  const list = inventoryList || [];
  let activeSKUs = 0;
  let inStockSKUs = 0;
  let lowStockSKUs = 0;
  let outOfStockSKUs = 0;
  let centralWHStockUnits = 0;
  let storesTotalStockUnits = 0;
  let totalValuationCost = 0;
  let totalValuationRetail = 0;
  let centralValuationCost = 0;
  let storesValuationCost = 0;

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item) continue;

    if (item.status !== 'inactive') {
      activeSKUs++;
    }

    const summary = getItemStockSummary(item);
    centralWHStockUnits += summary.centralWHStock;
    storesTotalStockUnits += summary.totalStoresStock;

    const itemCost = Number(item.costPrice) || 0;
    const itemRetail = Number(item.sellingPrice) || 0;

    centralValuationCost += summary.centralWHStock * itemCost;
    storesValuationCost += summary.totalStoresStock * itemCost;

    totalValuationCost += summary.totalNetworkStock * itemCost;
    totalValuationRetail += summary.totalNetworkStock * itemRetail;

    const threshold = item.lowStockThreshold || 10;
    if (summary.totalNetworkStock === 0) {
      outOfStockSKUs++;
    } else if (summary.totalNetworkStock <= threshold) {
      lowStockSKUs++;
      inStockSKUs++;
    } else {
      inStockSKUs++;
    }
  }

  const totalNetworkStockUnits = centralWHStockUnits + storesTotalStockUnits;

  return {
    totalSKUs: list.length,
    activeSKUs,
    inStockSKUs,
    lowStockSKUs,
    outOfStockSKUs,
    centralWHStockUnits,
    storesTotalStockUnits,
    totalNetworkStockUnits,
    totalValuationCost,
    totalValuationRetail,
    centralValuationCost,
    storesValuationCost,
  };
}

/**
 * Box & Loose Stock Helper
 * Calculates full boxes, loose pieces, pieces/box, and total pieces equivalent.
 * CRITICAL: Loose products and piece-unit items NEVER multiply by piecesPerBox.
 */
/**
 * Box & Loose Stock Helper
 * Calculates stock units, pieces/box descriptor, and order-based quantity.
 * CORE PRINCIPLE: Inventory Count = Number of Order/Stock Units (Boxes, Packs, Bottles, Pieces).
 * Zero piece multiplication.
 */
export function getBoxLooseStockSummary(item: InventoryItem, storeId?: string): {
  fullBoxes: number;
  loosePieces: number;
  piecesPerBox: number;
  totalPieces: number;
  totalPieceEquivalent: number;
  total_piece_equivalent: number;
  isBoxLoose: boolean;
  isLooseOnly: boolean;
  isBoxOnly: boolean;
} {
  const isBoxUnit = isBoxDenominatedUnit(item.unit);
  const piecesPerBox = item.piecesPerBox && item.piecesPerBox > 0 ? item.piecesPerBox : 1;
  const isLooseUnit = !isBoxUnit;

  const rawQty = storeId
    ? Math.max(0, Math.floor(Number(item.storeAllocations?.[storeId]) || 0))
    : Math.max(0, Math.floor(Number(item.stockQuantity) || 0));

  return {
    fullBoxes: isBoxUnit ? rawQty : 0,
    loosePieces: 0,
    piecesPerBox,
    totalPieces: rawQty,
    totalPieceEquivalent: rawQty,
    total_piece_equivalent: rawQty,
    isBoxLoose: Boolean(item.sellAsLoose || piecesPerBox > 1),
    isLooseOnly: isLooseUnit,
    isBoxOnly: isBoxUnit,
  };
}
