import { safeStorage } from "../utils/safeStorage";
import {
  Warehouse,
  Supplier,
  SupplierLedgerEntry,
  POItem,
  PurchaseOrder,
  PurchaseBill,
  PurchaseBillItem,
  BatchRecord,
  BatchAllocation,
  StockTransfer,
  StoreStockIndent,
  StockAdjustment,
  StockMovementAudit,
  WarehouseOverviewStats,
  WarehouseSubRole,
} from '../types/warehouse';
import { storage, setWarehouseStorageRef, isBoxDenominatedUnit } from './storage';
import { cloudSync } from './cloudSync';

const WH_KEYS = {
  WAREHOUSES: 'rr_wh_locations',
  SUPPLIERS: 'rr_wh_suppliers',
  SUPPLIER_LEDGER: 'rr_wh_supplier_ledger',
  PURCHASE_ORDERS: 'rr_wh_purchase_orders',
  PURCHASE_BILLS: 'rr_wh_purchase_bills',
  BATCHES: 'rr_wh_batches',
  TRANSFERS: 'rr_wh_transfers',
  INDENTS: 'rr_wh_indents',
  ADJUSTMENTS: 'rr_wh_adjustments',
  AUDIT_TRAIL: 'rr_wh_audit_trail',
  SUB_ROLE: 'rr_wh_active_subrole',
};

// Initial Seed Warehouse (Single Central Master Facility)
export const INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: 'wh-central-amd',
    code: 'WH-AMD-01',
    name: 'Central Warehouse',
    type: 'central_hub',
    address: 'Survey 142/B, Gota-Godhavi Logistics Park, SG Highway',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '382481',
    contactPerson: 'Vikramsinh Vaghela',
    phone: '+91 98251 44550',
    email: 'warehouse.ahmedabad@richierich.in',
    totalCapacitySqFt: 25000,
    utilizationPercent: 64,
    temperatureControlled: true,
    temperatureRange: '18°C - 22°C (Optimal Paan Leaves, Syrups & Cafe Goods)',
    isActive: true,
    managerName: 'Vikramsinh Vaghela',
    operatingHours: '24 Hours (3 Active Shifts)',
    storageZones: [
      'Zone A: Paan Betel Leaves Humidity Controlled Cold Vault',
      'Zone B: Cafe Espresso Beans, Syrups & Beverage Stock',
      'Zone C: Essentials, Mukhwas, Supari & Silver Vark Safe',
      'Zone D: Dispatched & Inward Staging Staging Bays',
    ],
  },
];

// Initial Suppliers
export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_LEDGER_ENTRIES: SupplierLedgerEntry[] = [];
export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [];
export const INITIAL_PURCHASE_BILLS: PurchaseBill[] = [];
export const INITIAL_BATCHES: BatchRecord[] = [];
export const INITIAL_TRANSFERS: StockTransfer[] = [];
export const INITIAL_INDENTS: StoreStockIndent[] = [];
export const INITIAL_ADJUSTMENTS: StockAdjustment[] = [];
export const INITIAL_AUDIT_TRAIL: StockMovementAudit[] = [];

// Automatic one-time cleanup and self-healing schema migration of warehouse data
export function cleanWarehouseDummyData(): void {
  try {
    const cleanFlag = safeStorage.getItem('rr_wh_grn_clean_v4');
    if (!cleanFlag) {
      // 1. Sanitize or initialize suppliers
      const rawSuppliers = safeStorage.getItem(WH_KEYS.SUPPLIERS);
      if (!rawSuppliers) {
        safeStorage.setItem(WH_KEYS.SUPPLIERS, JSON.stringify([]));
      }

      // 2. Sanitize purchase orders
      const rawPOs = safeStorage.getItem(WH_KEYS.PURCHASE_ORDERS);
      if (!rawPOs || rawPOs === '[]') {
        safeStorage.setItem(WH_KEYS.PURCHASE_ORDERS, JSON.stringify(INITIAL_PURCHASE_ORDERS));
      } else {
        try {
          const parsedPOs = JSON.parse(rawPOs);
          if (Array.isArray(parsedPOs)) {
            const sanitized = parsedPOs.map((po) => ({
              ...po,
              grandTotal: Number(po.grandTotal) || 0,
              subtotal: Number(po.subtotal) || 0,
              status: po.status || 'approved',
              items: Array.isArray(po.items) ? po.items : [],
            }));
            safeStorage.setItem(WH_KEYS.PURCHASE_ORDERS, JSON.stringify(sanitized));
          }
        } catch {}
      }

      // 3. Sanitize purchase bills
      const rawBills = safeStorage.getItem(WH_KEYS.PURCHASE_BILLS);
      if (!rawBills || rawBills === '[]') {
        safeStorage.setItem(WH_KEYS.PURCHASE_BILLS, JSON.stringify(INITIAL_PURCHASE_BILLS));
      } else {
        try {
          const parsedBills = JSON.parse(rawBills);
          if (Array.isArray(parsedBills)) {
            const sanitized = parsedBills.map((b) => ({
              ...b,
              grandTotal: Number(b.grandTotal) || 0,
              dueAmount: Number(b.dueAmount) || 0,
              paidAmount: Number(b.paidAmount) || 0,
              subtotal: Number(b.subtotal) || 0,
              paymentStatus: b.paymentStatus || 'due',
              grnStatus: b.grnStatus || 'verified_stocked',
              items: Array.isArray(b.items) ? b.items : [],
            }));
            safeStorage.setItem(WH_KEYS.PURCHASE_BILLS, JSON.stringify(sanitized));
          }
        } catch {}
      }

      safeStorage.setItem('rr_wh_grn_clean_v4', 'true');
    }
  } catch (e) {
    console.error('Error in self-healing warehouse data migration', e);
  }
}
cleanWarehouseDummyData();

const warehouseListeners: Set<() => void> = new Set();
const whMemoryCache: Map<string, any> = new Map();
let isWhNotifyPending = false;

function getWhCached<T>(key: string, loader: () => T): T {
  if (whMemoryCache.has(key)) {
    return whMemoryCache.get(key) as T;
  }
  const val = loader();
  whMemoryCache.set(key, val);
  return val;
}

function setWhCached<T>(key: string, val: T): void {
  whMemoryCache.set(key, val);
}

function clearWhCache(key?: string): void {
  if (key) {
    whMemoryCache.delete(key);
  } else {
    whMemoryCache.clear();
  }
}

// Synchronize storage service events with warehouse listeners for real-time reactivity
storage.subscribe(() => {
  clearWhCache();
  warehouseStorage.notifySubscribers();
});

// Cross-tab real-time warehouse sync via BroadcastChannel
let whSyncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    whSyncChannel = new BroadcastChannel('richie_rich_sync_bus');
    whSyncChannel.addEventListener('message', (event) => {
      if (event.data && (event.data.type === 'WAREHOUSE_STATE_CHANGED' || event.data.type === 'STATE_CHANGED')) {
        clearWhCache();
        warehouseStorage.notifySubscribers(false);
      }
    });
  }
} catch (e) {
  console.warn('[Warehouse] BroadcastChannel note:', e);
}

// Active in-flight operation mutex to prevent duplicate clicks and double execution
const inFlightTransferLocks = new Set<string>();

export const warehouseStorage = {
  invalidateCache(key?: string): void {
    clearWhCache(key);
  },

  setCached<T>(key: string, val: T): void {
    setWhCached(key, val);
  },

  subscribe(callback: () => void): () => void {
    warehouseListeners.add(callback);
    return () => {
      warehouseListeners.delete(callback);
    };
  },

  notifySubscribers(broadcast = true): void {
    if (isWhNotifyPending) return;
    isWhNotifyPending = true;
    queueMicrotask(() => {
      isWhNotifyPending = false;
      warehouseListeners.forEach((cb) => {
        try {
          cb();
        } catch (e) {
          console.error('Error notifying warehouse listener', e);
        }
      });
      if (broadcast && whSyncChannel) {
        try {
          whSyncChannel.postMessage({ type: 'WAREHOUSE_STATE_CHANGED', timestamp: Date.now() });
        } catch {}
      }
    });
  },

  // =========================================================================
  // SUB ROLE MANAGEMENT
  // =========================================================================
  getActiveSubRole(): WarehouseSubRole {
    try {
      const saved = safeStorage.getItem(WH_KEYS.SUB_ROLE) as WarehouseSubRole | null;
      return saved || 'admin';
    } catch {
      return 'admin';
    }
  },

  setActiveSubRole(role: WarehouseSubRole): void {
    try {
      safeStorage.setItem(WH_KEYS.SUB_ROLE, role);
      this.notifySubscribers();
    } catch (e) {
      console.error(e);
    }
  },

  // =========================================================================
  // WAREHOUSES (Single Central Master Hub)
  // =========================================================================
  getWarehouses(): Warehouse[] {
    return getWhCached(WH_KEYS.WAREHOUSES, () => {
      try {
        const data = safeStorage.getItem(WH_KEYS.WAREHOUSES);
        if (!data) {
          this.saveWarehouses(INITIAL_WAREHOUSES);
          return INITIAL_WAREHOUSES;
        }
        const parsed: Warehouse[] = JSON.parse(data);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          this.saveWarehouses(INITIAL_WAREHOUSES);
          return INITIAL_WAREHOUSES;
        }
        // If user had multi-warehouse stored previously, sanitize to single active central master warehouse
        let list = parsed;
        if (parsed.length > 1) {
          const central = parsed.find((w) => w.type === 'central_hub' || w.id === 'wh-central-amd') || INITIAL_WAREHOUSES[0];
          list = [central];
        }

        // Ensure standard name "Central Warehouse"
        let hasChanges = false;
        list = list.map((w) => {
          if (w.id === 'wh-central-amd' || w.type === 'central_hub' || w.name.includes('Master Warehouse') || w.name.includes('Gota Hub')) {
            if (w.name !== 'Central Warehouse') {
              hasChanges = true;
              return { ...w, name: 'Central Warehouse' };
            }
          }
          return w;
        });

        if (hasChanges || list.length !== parsed.length) {
          this.saveWarehouses(list);
        }

        return list;
      } catch {
        return INITIAL_WAREHOUSES;
      }
    });
  },

  getCentralWarehouse(): Warehouse {
    const list = this.getWarehouses();
    return list[0] || INITIAL_WAREHOUSES[0];
  },

  // Helper to gather all historical product & line item names typed or ordered across the system
  getItemNameHistory(): string[] {
    try {
      const namesSet = new Set<string>();

      // From inventory
      storage.getInventory().forEach((i) => {
        if (i.name) namesSet.add(i.name);
      });

      // From Purchase Orders
      this.getPurchaseOrders().forEach((po) => {
        po.items.forEach((it) => {
          if (it.name) namesSet.add(it.name);
        });
      });

      // From Purchase Bills / Inwards
      this.getPurchaseBills().forEach((pb) => {
        pb.items.forEach((it) => {
          if (it.name) namesSet.add(it.name);
        });
      });

      // From Stock Transfers
      this.getStockTransfers().forEach((st) => {
        st.items.forEach((it) => {
          if (it.name) namesSet.add(it.name);
        });
      });

      // From Stock Adjustments
      this.getStockAdjustments().forEach((sa) => {
        sa.items.forEach((it) => {
          if (it.name) namesSet.add(it.name);
        });
      });

      return Array.from(namesSet);
    } catch {
      return [];
    }
  },

  saveWarehouses(list: Warehouse[]): void {
    try {
      setWhCached(WH_KEYS.WAREHOUSES, list);
      safeStorage.setItem(WH_KEYS.WAREHOUSES, JSON.stringify(list));
      this.notifySubscribers();
    } catch (e) {
      console.error(e);
    }
  },

  addWarehouse(wh: Omit<Warehouse, 'id'>): Warehouse {
    const warehouses = this.getWarehouses();
    const newWh: Warehouse = {
      ...wh,
      id: `wh-${Date.now()}`,
    };
    this.saveWarehouses([newWh, ...warehouses]);

    this.addAuditRecord({
      referenceNumber: newWh.code,
      itemId: 'SYS',
      sku: 'WH-CFG',
      itemName: `New Warehouse Registered: ${newWh.name}`,
      movementType: 'physical_adjustment',
      fromLocation: 'System Setup',
      toLocation: newWh.name,
      quantity: 1,
      unit: 'facility',
      balanceAfter: warehouses.length + 1,
      unitCost: 0,
      totalCostImpact: 0,
      performedBy: 'System Administrator',
      userRole: 'Admin',
      notes: `Registered ${newWh.name} (${newWh.type}) with capacity ${newWh.totalCapacitySqFt} sq ft.`,
    });

    return newWh;
  },

  // =========================================================================
  // SUPPLIERS & DISTRIBUTORS
  // =========================================================================
  getSuppliers(): Supplier[] {
    return getWhCached(WH_KEYS.SUPPLIERS, () => {
      try {
        const data = safeStorage.getItem(WH_KEYS.SUPPLIERS);
        if (!data) {
          return [];
        }
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    });
  },

  saveSuppliers(list: Supplier[]): void {
    try {
      setWhCached(WH_KEYS.SUPPLIERS, list);
      safeStorage.setItem(WH_KEYS.SUPPLIERS, JSON.stringify(list));
      this.notifySubscribers();
      cloudSync.debouncedSyncCollection('suppliers', list);
    } catch (e) {
      console.error(e);
    }
  },

  addSupplier(sup: Omit<Supplier, 'id' | 'totalPurchases' | 'totalPaid' | 'currentOutstanding'>): Supplier {
    const suppliers = this.getSuppliers();
    const newSup: Supplier = {
      ...sup,
      id: `sup-${Date.now()}`,
      totalPurchases: 0,
      totalPaid: 0,
      currentOutstanding: 0,
    };
    this.saveSuppliers([newSup, ...suppliers]);
    cloudSync.syncDocument('suppliers', newSup.id, newSup);
    return newSup;
  },

  updateSupplier(id: string, updates: Partial<Supplier>): Supplier | null {
    const suppliers = this.getSuppliers();
    const index = suppliers.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const updated: Supplier = {
      ...suppliers[index],
      ...updates,
    };
    suppliers[index] = updated;
    this.saveSuppliers(suppliers);
    cloudSync.syncDocument('suppliers', updated.id, updated);
    return updated;
  },

  deleteSupplier(id: string): boolean {
    const suppliers = this.getSuppliers();
    const filtered = suppliers.filter((s) => s.id !== id);
    if (filtered.length === suppliers.length) return false;

    this.saveSuppliers(filtered);
    cloudSync.deleteDocument('suppliers', id);
    return true;
  },

  recordSupplierPayment(supplierId: string, amount: number, paymentMode: 'bank_neft' | 'upi_qr' | 'cheque' | 'cash', refNo: string, notes?: string): boolean {
    const suppliers = this.getSuppliers();
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return false;

    supplier.currentOutstanding = Math.max(0, supplier.currentOutstanding - amount);
    supplier.totalPaid = (supplier.totalPaid || 0) + amount;
    this.saveSuppliers(suppliers);

    // Record in ledger
    const ledgers = this.getSupplierLedger();
    const newEntry: SupplierLedgerEntry = {
      id: `led-${Date.now()}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: new Date().toISOString().split('T')[0],
      type: 'payment_made',
      referenceNo: refNo || `PAY-${Date.now().toString().slice(-4)}`,
      debit: amount,
      credit: 0,
      runningBalance: supplier.currentOutstanding,
      paymentMode,
      notes: notes || `Payment recorded via ${paymentMode.toUpperCase()}`,
    };
    this.saveSupplierLedger([newEntry, ...ledgers]);

    // Update Purchase bills if applicable
    const bills = this.getPurchaseBills();
    let remainingPayment = amount;
    const updatedBills = bills.map((b) => {
      if (b.supplierId === supplierId && b.dueAmount > 0 && remainingPayment > 0) {
        const payForThisBill = Math.min(b.dueAmount, remainingPayment);
        b.paidAmount += payForThisBill;
        b.dueAmount -= payForThisBill;
        remainingPayment -= payForThisBill;
        b.paymentStatus = b.dueAmount === 0 ? 'paid' : 'partial';
      }
      return b;
    });
    this.savePurchaseBills(updatedBills);

    storage.addNotification({
      title: `Supplier Payment Made: ₹${amount.toLocaleString('en-IN')}`,
      message: `Paid to ${supplier.name} via ${paymentMode.toUpperCase()}. Outstanding: ₹${supplier.currentOutstanding.toLocaleString('en-IN')}`,
      type: 'system_backup',
      targetRole: 'admin',
      read: false,
    });

    return true;
  },

  // =========================================================================
  // SUPPLIER LEDGER
  // =========================================================================
  getSupplierLedger(): SupplierLedgerEntry[] {
    return getWhCached(WH_KEYS.SUPPLIER_LEDGER, () => {
      try {
        const data = safeStorage.getItem(WH_KEYS.SUPPLIER_LEDGER);
        if (!data) {
          this.saveSupplierLedger(INITIAL_LEDGER_ENTRIES);
          return INITIAL_LEDGER_ENTRIES;
        }
        return JSON.parse(data);
      } catch {
        return INITIAL_LEDGER_ENTRIES;
      }
    });
  },

  saveSupplierLedger(list: SupplierLedgerEntry[]): void {
    try {
      setWhCached(WH_KEYS.SUPPLIER_LEDGER, list);
      safeStorage.setItem(WH_KEYS.SUPPLIER_LEDGER, JSON.stringify(list));
      this.notifySubscribers();
    } catch (e) {
      console.error(e);
    }
  },

  // =========================================================================
  // PURCHASE ORDERS (PO)
  // =========================================================================
  getPurchaseOrders(): PurchaseOrder[] {
    return getWhCached(WH_KEYS.PURCHASE_ORDERS, () => {
      try {
        const data = safeStorage.getItem(WH_KEYS.PURCHASE_ORDERS);
        if (!data) {
          return [];
        }
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) return [];

        // Normalize PO records from persistence to guarantee valid numeric fields
        return parsed.map((po) => ({
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
      } catch {
        return [];
      }
    });
  },

  savePurchaseOrders(list: PurchaseOrder[]): void {
    try {
      setWhCached(WH_KEYS.PURCHASE_ORDERS, list);
      safeStorage.setItem(WH_KEYS.PURCHASE_ORDERS, JSON.stringify(list));
      this.notifySubscribers();
      cloudSync.debouncedSyncCollection('purchase_orders', list);
    } catch (e) {
      console.error(e);
    }
  },

  createPurchaseOrder(poData: Omit<PurchaseOrder, 'id' | 'poNumber'>): PurchaseOrder {
    const orders = this.getPurchaseOrders();
    const poNumber = `PO-2026-${(orders.length + 89).toString().padStart(3, '0')}`;
    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${Date.now()}`,
      poNumber,
    };
    this.savePurchaseOrders([newPO, ...orders]);
    cloudSync.syncDocument('purchase_orders', newPO.id, newPO);

    storage.addNotification({
      title: `Purchase Order Created: ${poNumber}`,
      message: `PO for ₹${newPO.grandTotal.toLocaleString('en-IN')} to ${newPO.supplierName} (${newPO.status.toUpperCase()})`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });

    return newPO;
  },

  updatePOStatus(poId: string, status: PurchaseOrder['status']): boolean {
    const orders = this.getPurchaseOrders();
    const po = orders.find((p) => p.id === poId);
    if (!po) return false;
    po.status = status;
    this.savePurchaseOrders(orders);
    return true;
  },

  // Direct Store Purchasing Order Creation (No Warehouse Approval Required)
  createDirectStorePO(poData: {
    supplierId: string;
    supplierName: string;
    supplierGstin?: string;
    storeId: string;
    storeName: string;
    items: POItem[];
    orderDate?: string;
    expectedDeliveryDate: string;
    paymentTerms: string;
    freightCharge?: number;
    notes?: string;
    createdByName: string;
  }): PurchaseOrder {
    const orders = this.getPurchaseOrders();
    const poCount = orders.length + 10240;
    const poNumber = `PO-${poCount}`;

    const subtotal = poData.items.reduce((sum, it) => sum + (it.unitPrice * it.quantityOrdered), 0);
    const taxTotal = poData.items.reduce((sum, it) => sum + (it.taxAmount || ((it.unitPrice * it.quantityOrdered * (it.taxPercent || 0)) / 100)), 0);
    const freight = Number(poData.freightCharge) || 0;
    const grandTotal = Math.round((subtotal + taxTotal + freight) * 100) / 100;

    const supplier = this.getSuppliers().find((s) => s.id === poData.supplierId);
    const supplierGstin = poData.supplierGstin || supplier?.gstin || 'N/A';

    const newPO: PurchaseOrder = {
      id: `po-store-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      poNumber,
      supplierId: poData.supplierId,
      supplierName: poData.supplierName,
      supplierGstin,
      destinationWarehouseId: undefined,
      destinationWarehouseName: undefined,
      destinationType: 'store',
      destinationId: poData.storeId,
      destinationName: poData.storeName,
      orderType: 'direct_store_po',
      storeId: poData.storeId,
      storeName: poData.storeName,
      source: 'Direct Supplier Purchase',
      orderDate: poData.orderDate || new Date().toISOString().split('T')[0],
      expectedDeliveryDate: poData.expectedDeliveryDate,
      status: 'sent_to_supplier',
      items: poData.items.map((it) => ({
        ...it,
        quantityReceived: 0,
      })),
      subtotal,
      taxTotal,
      freightCharge: freight,
      grandTotal,
      createdByName: poData.createdByName || 'Store Manager',
      paymentTerms: poData.paymentTerms || 'Net 15 Days',
      paymentStatus: 'unpaid',
      notes: poData.notes,
    };

    this.savePurchaseOrders([newPO, ...orders]);
    cloudSync.syncDocument('purchase_orders', newPO.id, newPO);

    // Record PO Creation in Audit Trail
    const nowIso = new Date().toISOString();
    const itemNamesList = newPO.items.map((it) => `${it.name} (${it.quantityOrdered} ${it.unit || 'boxes'})`).join(', ');
    this.addAuditRecord({
      referenceNumber: newPO.poNumber,
      itemId: newPO.items[0]?.itemId || 'MULTI-ITEMS',
      sku: newPO.items[0]?.sku || 'DIR-PO',
      itemName: newPO.items.length === 1 ? newPO.items[0].name : `${newPO.items.length} Products Ordered`,
      movementType: 'direct_store_purchase',
      fromLocation: `Direct Store Procurement (${newPO.storeName})`,
      toLocation: `Supplier: ${newPO.supplierName}`,
      quantity: newPO.items.reduce((s, it) => s + it.quantityOrdered, 0),
      quantityChanged: 0,
      unit: newPO.items[0]?.unit || 'boxes',
      balanceAfter: 0,
      unitCost: newPO.items[0]?.unitPrice || 0,
      totalCostImpact: newPO.grandTotal,
      performedBy: newPO.createdByName,
      userRole: 'Store Manager',
      source: 'Direct Supplier Purchase',
      supplierName: newPO.supplierName,
      supplierId: newPO.supplierId,
      purchaseOrderId: newPO.poNumber,
      status: 'PO Raised',
      notes: `Direct Store Purchase Order raised for ${newPO.storeName} to ${newPO.supplierName}. Total: ₹${newPO.grandTotal.toLocaleString('en-IN')}. Items: ${itemNamesList}`,
    });

    storage.addNotification({
      title: `Direct PO Placed: ${poNumber}`,
      message: `Store PO for ₹${newPO.grandTotal.toLocaleString('en-IN')} placed directly to ${newPO.supplierName} (${newPO.storeName})`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });

    return newPO;
  },

  // Direct Stock Receiving / Goods Receipt from Supplier to Store
  receiveDirectStorePO(params: {
    poId: string;
    storeId: string;
    storeName: string;
    supplierInvoiceNo: string;
    receivedBy: string;
    billDate?: string;
    notes?: string;
    items: Array<{
      itemId: string;
      sku: string;
      name: string;
      category?: string;
      quantityReceivedNow: number;
      damagedQty?: number;
      batchNumber?: string;
      mfgDate?: string;
      expiryDate?: string;
      unitCost: number;
      unit?: string;
      taxPercent?: number;
    }>;
  }): { success: boolean; bill?: PurchaseBill; po?: PurchaseOrder; error?: string } {
    const lockKey = `rx_store_po_${params.poId}_${params.supplierInvoiceNo}`;
    if (inFlightTransferLocks.has(lockKey)) {
      return { success: false, error: 'Receiving transaction already in progress. Please wait.' };
    }
    inFlightTransferLocks.add(lockKey);

    try {
      const orders = this.getPurchaseOrders();
      const po = orders.find((p) => p.id === params.poId);
      if (!po) {
        return { success: false, error: 'Purchase Order not found.' };
      }

      // Filter to items with positive received quantity
      const validReceivedItems = params.items.filter((it) => (Number(it.quantityReceivedNow) || 0) > 0);
      if (validReceivedItems.length === 0) {
        return { success: false, error: 'Please enter a received quantity greater than 0 for at least one item.' };
      }

      const bills = this.getPurchaseBills();
      const billNumber = `PB-STR-2026-${(bills.length + 1045).toString().padStart(4, '0')}`;
      const nowIso = new Date().toISOString();
      const nowTs = Date.now();
      const todayDate = params.billDate || nowIso.split('T')[0];

      // 1. Calculate Inward Bill Line Items and Totals
      let billSubtotal = 0;
      let billGstAmount = 0;

      const currentInventory = storage.getInventory();
      const purchaseBillItems = validReceivedItems.map((item) => {
        const invItem = currentInventory.find(
          (i) => i.id === item.itemId || (i.sku && i.sku.toLowerCase() === item.sku.toLowerCase())
        );
        const piecesPerBox = invItem?.piecesPerBox || 1;
        const lineSubtotal = item.quantityReceivedNow * item.unitCost;
        const taxRate = item.taxPercent !== undefined ? item.taxPercent : 5;
        const taxAmount = Math.round((lineSubtotal * taxRate / 100) * 100) / 100;
        const totalCost = lineSubtotal + taxAmount;

        billSubtotal += lineSubtotal;
        billGstAmount += taxAmount;

        return {
          itemId: item.itemId,
          sku: item.sku,
          name: item.name,
          category: item.category || 'General',
          quantity: item.quantityReceivedNow,
          unit: item.unit || 'boxes',
          inputUnit: item.unit || 'boxes',
          piecesPerBox,
          baseQuantity: item.quantityReceivedNow,
          unitCost: item.unitCost,
          taxRate,
          taxAmount,
          totalCost,
          batchNumber: item.batchNumber || `BATCH-STR-${item.sku.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
          mfgDate: item.mfgDate || todayDate,
          expiryDate: item.expiryDate || new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
        };
      });

      const billGrandTotal = Math.round((billSubtotal + billGstAmount) * 100) / 100;

      const newBill: PurchaseBill = {
        id: `pb-store-${Date.now()}`,
        billNumber,
        poReferenceId: po.id,
        poNumber: po.poNumber,
        supplierId: po.supplierId,
        supplierName: po.supplierName,
        supplierInvoiceNo: params.supplierInvoiceNo || `INV-STR-${Date.now().toString().slice(-4)}`,
        destinationType: 'store',
        destinationId: params.storeId,
        destinationName: params.storeName,
        storeId: params.storeId,
        storeName: params.storeName,
        source: 'Direct Supplier Purchase',
        billDate: todayDate,
        receivedDate: todayDate,
        items: purchaseBillItems,
        subtotal: billSubtotal,
        gstAmount: billGstAmount,
        freightCharges: 0,
        roundOff: 0,
        grandTotal: billGrandTotal,
        paidAmount: 0,
        dueAmount: billGrandTotal,
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        paymentStatus: 'due',
        grnStatus: 'verified_stocked',
        receivedBy: params.receivedBy || 'Store Manager',
        notes: params.notes || `Direct goods inwarded at ${params.storeName}`,
      };

      this.savePurchaseBills([newBill, ...bills]);
      cloudSync.syncDocument('inward_bills', newBill.id, newBill);

      // 2. Update Master Inventory - Increment ONLY Store Stock (Central Warehouse is NEVER touched)
      const auditRecords: Array<Omit<StockMovementAudit, 'id' | 'timestamp'>> = [];

      validReceivedItems.forEach((item, idx) => {
        const invItem = currentInventory.find(
          (i) => i.id === item.itemId || (i.sku && i.sku.toLowerCase() === item.sku.toLowerCase())
        );

        if (invItem) {
          if (!invItem.storeAllocations) {
            invItem.storeAllocations = {};
          }
          if (!invItem.storeBoxAllocations) {
            invItem.storeBoxAllocations = {};
          }

          const isBoxUnit = isBoxDenominatedUnit(item.unit || invItem.unit);
          const prevStoreStock = Math.max(0, Math.floor(Number(invItem.storeAllocations[params.storeId]) || 0));
          const newStoreStock = prevStoreStock + item.quantityReceivedNow;

          invItem.storeAllocations[params.storeId] = newStoreStock;

          const prevBoxAlloc = invItem.storeBoxAllocations[params.storeId] || {
            fullBoxes: 0,
            loosePieces: 0,
            totalPieces: 0,
            total_piece_equivalent: 0,
          };

          const newFullBoxes = isBoxUnit ? (prevBoxAlloc.fullBoxes || 0) + item.quantityReceivedNow : prevBoxAlloc.fullBoxes;
          invItem.storeBoxAllocations[params.storeId] = {
            ...prevBoxAlloc,
            fullBoxes: newFullBoxes,
            loosePieces: prevBoxAlloc.loosePieces || 0,
            totalPieces: newStoreStock,
            total_piece_equivalent: newStoreStock,
          };

          (invItem as any).lastStockChange = nowTs;
          invItem.updatedAt = nowIso;

          // Audit record for each inwarded item
          auditRecords.push({
            transactionId: `TXN-DIR-${Date.now().toString().slice(-5)}${idx}`,
            referenceNumber: po.poNumber,
            itemId: invItem.id,
            sku: invItem.sku,
            itemName: invItem.name,
            batchNumber: purchaseBillItems[idx]?.batchNumber,
            movementType: 'direct_store_purchase',
            fromLocation: `Supplier: ${po.supplierName}`,
            toLocation: `Store: ${params.storeName}`,
            quantity: item.quantityReceivedNow,
            quantityChanged: item.quantityReceivedNow,
            previousStock: prevStoreStock,
            newStock: newStoreStock,
            unit: isBoxUnit ? 'boxes' : (item.unit || invItem.unit || 'units'),
            balanceAfter: newStoreStock,
            unitCost: item.unitCost,
            totalCostImpact: item.quantityReceivedNow * item.unitCost,
            performedBy: params.receivedBy || 'Store Manager',
            userRole: 'Store Manager',
            source: 'Direct Supplier Purchase',
            supplierName: po.supplierName,
            supplierId: po.supplierId,
            invoiceNumber: newBill.supplierInvoiceNo,
            purchaseOrderId: po.poNumber,
            status: 'Completed',
            notes: isBoxUnit
              ? `Direct Store Inward: Received ${item.quantityReceivedNow} Boxes directly from ${po.supplierName}. Store Stock Before: ${prevStoreStock} ➔ After: ${newStoreStock} Boxes. Invoice No: ${newBill.supplierInvoiceNo}`
              : `Direct Store Inward: Received ${item.quantityReceivedNow} Units directly from ${po.supplierName}. Store Stock Before: ${prevStoreStock} ➔ After: ${newStoreStock} Units. Invoice No: ${newBill.supplierInvoiceNo}`,
          });
        }
      });

      storage.saveInventory(currentInventory);
      this.addAuditRecords(auditRecords);

      // 3. Batches with Expiry Tracking for the Store
      const batches = this.getBatches();
      const newBatches: BatchRecord[] = purchaseBillItems.map((item, idx) => {
        const daysToExpiry = Math.ceil(
          (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
        );
        let status: BatchRecord['status'] = 'active';
        if (daysToExpiry <= 0) status = 'expired';
        else if (daysToExpiry <= 30) status = 'near_expiry';

        return {
          id: `bat-str-${Date.now()}-${idx}`,
          itemId: item.itemId,
          sku: item.sku,
          name: item.name,
          category: item.category,
          batchNumber: item.batchNumber,
          warehouseId: params.storeId,
          warehouseName: params.storeName,
          mfgDate: item.mfgDate,
          expiryDate: item.expiryDate,
          initialQuantity: item.quantity,
          originalQuantity: item.quantity,
          originalUnit: item.unit,
          piecesPerBox: item.piecesPerBox || 1,
          originalBaseQuantity: item.quantity,
          currentBaseQuantity: item.quantity,
          currentQuantity: item.quantity,
          quantityInStock: 0, // Central stock is 0 for store batch
          consumedQuantity: 0,
          consumedBaseQuantity: 0,
          locationQuantities: {
            [params.storeId]: item.quantity,
          },
          locationUnit: item.unit || 'BOX',
          unit: item.unit,
          unitCost: item.unitCost,
          purchaseBillRef: billNumber,
          supplierName: po.supplierName,
          daysToExpiry,
          status,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
      });

      this.saveBatches([...newBatches, ...batches]);

      // 4. Update Supplier Ledger & Outstanding
      const suppliers = this.getSuppliers();
      const supplier = suppliers.find((s) => s.id === po.supplierId);
      if (supplier) {
        supplier.totalPurchases = (supplier.totalPurchases || 0) + newBill.grandTotal;
        supplier.currentOutstanding = (supplier.currentOutstanding || 0) + newBill.dueAmount;
        this.saveSuppliers(suppliers);

        const ledgers = this.getSupplierLedger();
        const newLedger: SupplierLedgerEntry = {
          id: `led-${Date.now()}`,
          supplierId: supplier.id,
          supplierName: supplier.name,
          date: newBill.billDate,
          type: 'purchase_bill',
          referenceNo: billNumber,
          debit: 0,
          credit: newBill.grandTotal,
          runningBalance: supplier.currentOutstanding,
          notes: `Direct Store Inward at ${params.storeName} against Invoice ${newBill.supplierInvoiceNo} (PO: ${po.poNumber})`,
        };
        this.saveSupplierLedger([newLedger, ...ledgers]);
      }

      // 5. Update PO Item Received Quantities and Status (Full or Partial Receiving)
      validReceivedItems.forEach((rxItem) => {
        const poItem = po.items.find((it) => it.itemId === rxItem.itemId || it.sku === rxItem.sku);
        if (poItem) {
          poItem.quantityReceived = (poItem.quantityReceived || 0) + rxItem.quantityReceivedNow;
        }
      });

      // Check if all items in PO are fully received
      const isAllFullyReceived = po.items.every((it) => (it.quantityReceived || 0) >= it.quantityOrdered);
      po.status = isAllFullyReceived ? 'received' : 'partially_received';
      this.savePurchaseOrders(orders);

      storage.addNotification({
        title: `Direct Stock Received: +${validReceivedItems.reduce((s, i) => s + i.quantityReceivedNow, 0)} ${validReceivedItems[0]?.unit || 'boxes'} at ${params.storeName}`,
        message: `Inwarded from ${po.supplierName} (PO: ${po.poNumber}, Inv: ${newBill.supplierInvoiceNo}). Status: ${po.status.toUpperCase().replace(/_/g, ' ')}`,
        type: 'order_update',
        targetRole: 'admin',
        read: false,
      });

      return { success: true, bill: newBill, po };
    } finally {
      inFlightTransferLocks.delete(lockKey);
    }
  },

  // Helper to fetch direct store purchase orders
  getDirectStorePOs(storeId?: string): PurchaseOrder[] {
    const orders = this.getPurchaseOrders();
    return orders.filter((p) => {
      const isDirect = p.orderType === 'direct_store_po' || p.destinationType === 'store' || !!p.storeId;
      if (!isDirect) return false;
      if (storeId) {
        return p.storeId === storeId || p.destinationId === storeId;
      }
      return true;
    });
  },

  // Helper to fetch direct store inward bills
  getDirectStoreInwardBills(storeId?: string): PurchaseBill[] {
    const bills = this.getPurchaseBills();
    return bills.filter((b) => {
      const isDirect = b.destinationType === 'store' || b.source === 'Direct Supplier Purchase' || !!b.storeId;
      if (!isDirect) return false;
      if (storeId) {
        return b.storeId === storeId || b.destinationId === storeId;
      }
      return true;
    });
  },

  // =========================================================================
  // PURCHASE BILLS & GRN (INWARD GOODS RECEIPT)
  // =========================================================================
  getPurchaseBills(): PurchaseBill[] {
    return getWhCached(WH_KEYS.PURCHASE_BILLS, () => {
      try {
        const data = safeStorage.getItem(WH_KEYS.PURCHASE_BILLS);
        if (!data) {
          return [];
        }
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) return [];

        // Normalize Purchase Bills to guarantee valid fields across all storage backends
        return parsed.map((b) => ({
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
      } catch {
        return [];
      }
    });
  },

  savePurchaseBills(list: PurchaseBill[]): void {
    try {
      setWhCached(WH_KEYS.PURCHASE_BILLS, list);
      safeStorage.setItem(WH_KEYS.PURCHASE_BILLS, JSON.stringify(list));
      this.notifySubscribers();
      cloudSync.debouncedSyncCollection('inward_bills', list);
    } catch (e) {
      console.error(e);
    }
  },

  createPurchaseBill(billData: Omit<PurchaseBill, 'id' | 'billNumber'>): PurchaseBill {
    const bills = this.getPurchaseBills();
    const billNumber = `PB-2026-${(bills.length + 83).toString().padStart(3, '0')}`;
    
    // Resolve poNumber if poReferenceId was provided
    let poNumber = billData.poNumber;
    if (!poNumber && billData.poReferenceId) {
      const linkedPO = this.getPurchaseOrders().find((p) => p.id === billData.poReferenceId);
      if (linkedPO) {
        poNumber = linkedPO.poNumber;
      }
    }

    const newBill: PurchaseBill = {
      ...billData,
      id: `pb-${Date.now()}`,
      billNumber,
      poNumber,
      warehouseId: 'wh-central-amd',
      warehouseName: 'Central Warehouse',
    };
    this.savePurchaseBills([newBill, ...bills]);
    cloudSync.syncDocument('inward_bills', newBill.id, newBill);

    // 1. Update Supplier Outstanding & Purchases
    const suppliers = this.getSuppliers();
    const supplier = suppliers.find((s) => s.id === newBill.supplierId);
    if (supplier) {
      supplier.totalPurchases = (supplier.totalPurchases || 0) + newBill.grandTotal;
      supplier.currentOutstanding = (supplier.currentOutstanding || 0) + newBill.dueAmount;
      this.saveSuppliers(suppliers);

      // Add to Supplier Ledger
      const ledgers = this.getSupplierLedger();
      const newLedger: SupplierLedgerEntry = {
        id: `led-${Date.now()}`,
        supplierId: supplier.id,
        supplierName: supplier.name,
        date: newBill.billDate,
        type: 'purchase_bill',
        referenceNo: billNumber,
        debit: 0,
        credit: newBill.grandTotal,
        runningBalance: supplier.currentOutstanding,
        notes: `Purchase Bill Inward against Invoice ${newBill.supplierInvoiceNo}`,
      };
      this.saveSupplierLedger([newLedger, ...ledgers]);
    }

    // 2. Generate and store Batches with Expiry Tracking (Central Warehouse Only)
    const batches = this.getBatches();
    const currentInventory = storage.getInventory();
    const nowIso = new Date().toISOString();
    const nowTs = Date.now();

    const newBatches: BatchRecord[] = newBill.items.map((item, idx) => {
      const daysToExpiry = Math.ceil(
        (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
      );
      let status: BatchRecord['status'] = 'active';
      if (daysToExpiry <= 0) status = 'expired';
      else if (daysToExpiry <= 30) status = 'near_expiry';

      const invItem = currentInventory.find(
        (i) => i.id === item.itemId || (i.sku && i.sku.toLowerCase() === item.sku.toLowerCase())
      );
      const isBoxUnit = (item.inputUnit || item.unit || '').toLowerCase().includes('box');
      const piecesPerBox = item.piecesPerBox || (invItem ? invItem.piecesPerBox : 1) || 1;
      const inwardQty = Math.max(0, Math.floor(Number(item.quantity) || 0));
      const baseInwardPieces = inwardQty;
      item.baseQuantity = baseInwardPieces;

      return {
        id: `bat-${Date.now()}-${idx}`,
        itemId: item.itemId,
        sku: item.sku,
        name: item.name,
        category: item.category,
        batchNumber: item.batchNumber || `BATCH-${(item.sku || 'SKU').slice(0, 3)}-${Date.now().toString().slice(-4)}`,
        warehouseId: 'wh-central-amd',
        warehouseName: 'Central Warehouse',
        mfgDate: item.mfgDate || newBill.billDate,
        expiryDate: item.expiryDate,
        initialQuantity: inwardQty,
        originalQuantity: inwardQty,
        originalUnit: item.inputUnit || item.unit || (isBoxUnit ? 'boxes' : 'pieces'),
        piecesPerBox,
        originalBaseQuantity: baseInwardPieces,
        currentBaseQuantity: baseInwardPieces,
        currentQuantity: baseInwardPieces,
        quantityInStock: baseInwardPieces,
        consumedQuantity: 0,
        consumedBaseQuantity: 0,
        locationQuantities: {
          central: baseInwardPieces,
          'wh-central-amd': baseInwardPieces,
        },
        locationUnit: 'PIECE',
        unit: item.unit,
        unitCost: item.unitCost,
        purchaseBillRef: billNumber,
        supplierName: newBill.supplierName,
        daysToExpiry,
        status,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    });
    this.saveBatches([...newBatches, ...batches]);

    // 3. Update Master Inventory Central Stock (Exact mathematical addition - NEVER double counted)
    // NOTE: Inward GRN stock is credited strictly to Central Master Warehouse vaults in base piece units.
    // Store allocations (Gota, Bopal, Sindhu Bhavan, SG Highway) remain untouched.
    const auditRecords: Array<Omit<StockMovementAudit, 'id' | 'timestamp'>> = [];

    newBill.items.forEach((item, idx) => {
      const invItem = currentInventory.find(
        (i) => i.id === item.itemId || (i.sku && i.sku.toLowerCase() === item.sku.toLowerCase())
      );
      if (invItem) {
        const isBoxUnit = isBoxDenominatedUnit(item.inputUnit || item.unit || invItem.unit);
        const inwardQty = Math.max(0, Math.floor(Number(item.quantity) || 0));
        const previousStock = Math.max(0, Math.floor(Number(invItem.stockQuantity) || 0));
        const newStock = previousStock + inwardQty;
        invItem.stockQuantity = newStock;

        invItem.fullBoxStock = isBoxUnit ? newStock : 0;
        invItem.full_box_stock = isBoxUnit ? newStock : 0;
        invItem.loosePieceStock = 0;
        invItem.loose_piece_stock = 0;
        invItem.totalPieceEquivalent = newStock;
        invItem.total_piece_equivalent = newStock;

        (invItem as any).lastStockChange = nowTs;
        invItem.updatedAt = nowIso;

        auditRecords.push({
          transactionId: `TXN-${Date.now().toString().slice(-5)}${idx}`,
          referenceNumber: billNumber,
          itemId: item.itemId,
          sku: item.sku,
          itemName: item.name,
          batchNumber: item.batchNumber,
          movementType: 'purchase_inward' as const,
          fromLocation: `Supplier: ${newBill.supplierName}`,
          toLocation: 'Central Warehouse (WH-AMD-01)',
          quantity: inwardQty,
          quantityChanged: inwardQty,
          previousStock,
          newStock,
          unit: isBoxUnit ? 'boxes' : (item.unit || 'units'),
          balanceAfter: newStock,
          unitCost: item.unitCost,
          totalCostImpact: item.totalCost,
          performedBy: newBill.receivedBy || 'Warehouse Inward Officer',
          userRole: 'Warehouse Manager' as const,
          status: 'Completed',
          notes: isBoxUnit
            ? `Inward GRN stock verified: Received ${inwardQty} Boxes. Central WH Before: ${previousStock} ➔ After: ${newStock}. Invoice No: ${newBill.supplierInvoiceNo}`
            : `Inward GRN stock verified: Received ${inwardQty} Units. Central WH Before: ${previousStock} ➔ After: ${newStock}. Invoice No: ${newBill.supplierInvoiceNo}`,
        });
      }
    });

    storage.saveInventory(currentInventory);
    this.addAuditRecords(auditRecords);

    // 4. Update PO status & received quantities if linked
    if (newBill.poReferenceId) {
      const orders = this.getPurchaseOrders();
      const po = orders.find((p) => p.id === newBill.poReferenceId);
      if (po) {
        po.status = 'received';
        newBill.items.forEach((bi) => {
          const poi = po.items.find((it) => it.itemId === bi.itemId || it.sku === bi.sku);
          if (poi) {
            poi.quantityReceived = (poi.quantityReceived || 0) + bi.quantity;
          }
        });
        this.savePurchaseOrders(orders);
      }
    }

    storage.addNotification({
      title: `Goods Received in Central Warehouse: ${billNumber}`,
      message: `Inwarded ${newBill.items.reduce((s, i) => s + i.quantity, 0)} units from ${newBill.supplierName} into Central Master Warehouse only.`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });

    return newBill;
  },

  // =========================================================================
  // BATCHES & EXPIRY TRACKING (BATCH-BASED INVENTORY ENGINE)
  // =========================================================================
  getBatches(): BatchRecord[] {
    return getWhCached(WH_KEYS.BATCHES, () => {
      try {
        const data = safeStorage.getItem(WH_KEYS.BATCHES);
        let list: BatchRecord[] = [];
        if (data) {
          list = JSON.parse(data);
        }
        if (!Array.isArray(list) || list.length === 0) {
          list = INITIAL_BATCHES;
        }

        // Automatic opening batch reconciliation: Ensure all catalog inventory is represented in batches
        const inventory = storage.getInventory();
        let batchesModified = false;
        const nowIso = new Date().toISOString();

        inventory.forEach((item, idx) => {
          const itemBatches = list.filter(
            (b) => b.itemId === item.id || (b.sku && b.sku.toLowerCase() === item.sku.toLowerCase())
          );
          if (itemBatches.length === 0 && ((item.stockQuantity || 0) > 0 || Object.values(item.storeAllocations || {}).some((q) => q > 0))) {
            // Create an initial opening batch for existing catalog stock
            const centralQty = Math.max(0, Math.floor(Number(item.stockQuantity) || 0));
            const locationQuantities: Record<string, number> = {
              central: centralQty,
              'wh-central-amd': centralQty,
            };
            if (item.storeAllocations) {
              Object.entries(item.storeAllocations).forEach(([sId, sQty]) => {
                locationQuantities[sId] = Math.max(0, Math.floor(Number(sQty) || 0));
              });
            }
            const totalStock = Object.entries(locationQuantities).reduce(
              (sum, [k, v]) => (k === 'wh-central-amd' ? sum : sum + v),
              0
            );

            const openingBatch: BatchRecord = {
              id: `bat-opening-${item.id}-${idx}`,
              itemId: item.id,
              sku: item.sku,
              name: item.name,
              category: item.category,
              batchNumber: `BATCH-OPENING-${item.sku.slice(0, 4)}-01`,
              warehouseId: 'wh-central-amd',
              warehouseName: 'Central Warehouse',
              mfgDate: nowIso.split('T')[0],
              expiryDate: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0],
              initialQuantity: totalStock,
              originalQuantity: totalStock,
              currentQuantity: totalStock,
              quantityInStock: centralQty,
              consumedQuantity: 0,
              locationQuantities,
              unit: item.unit || 'pieces',
              unitCost: item.costPrice || 50,
              purchaseBillRef: 'OPENING-STOCK',
              supplierName: 'Opening Balance Inventory',
              daysToExpiry: 180,
              status: totalStock > 0 ? 'active' : 'depleted',
              createdAt: nowIso,
              updatedAt: nowIso,
            };
            list.push(openingBatch);
            batchesModified = true;
          }
        });

        if (batchesModified) {
          this.saveBatches(list);
        }

        return list;
      } catch {
        return INITIAL_BATCHES;
      }
    });
  },

  saveBatches(list: BatchRecord[]): void {
    try {
      // Recalculate dynamic days to expiry, currentQuantity, and status on save
      const now = new Date().getTime();
      const updated = list.map((b) => {
        const days = Math.ceil((new Date(b.expiryDate).getTime() - now) / (1000 * 3600 * 24));
        const locQuantities = b.locationQuantities || {
          central: b.quantityInStock || 0,
          'wh-central-amd': b.quantityInStock || 0,
        };

        // Total active across real distinct locations (ignoring warehouse alias)
        let totalActive = 0;
        Object.entries(locQuantities).forEach(([loc, qty]) => {
          if (loc !== 'wh-central-amd') {
            totalActive += Math.max(0, Math.floor(Number(qty) || 0));
          }
        });

        const centralStock = Math.max(0, Math.floor(Number(locQuantities['central'] ?? locQuantities['wh-central-amd'] ?? b.quantityInStock) || 0));

        let status = b.status;
        if (totalActive <= 0) status = 'depleted';
        else if (days <= 0) status = 'expired';
        else if (days <= 30) status = 'near_expiry';
        else status = 'active';

        return {
          ...b,
          originalQuantity: b.originalQuantity ?? b.initialQuantity ?? totalActive,
          currentQuantity: totalActive,
          quantityInStock: centralStock,
          locationQuantities: locQuantities,
          daysToExpiry: days,
          status,
          updatedAt: new Date().toISOString(),
        };
      });

      setWhCached(WH_KEYS.BATCHES, updated);
      safeStorage.setItem(WH_KEYS.BATCHES, JSON.stringify(updated));
      this.notifySubscribers();
      cloudSync.debouncedSyncCollection('inventory_batches', updated);
    } catch (e) {
      console.error(e);
    }
  },

  // FIFO Allocation for Transfers with Auto-Batch Provisioning
  allocateBatchesForTransfer(
    itemId: string,
    sourceLocationId: string,
    requestedQty: number
  ): { success: boolean; allocations: BatchAllocation[]; error?: string } {
    if (requestedQty <= 0) {
      return { success: false, allocations: [], error: 'Transfer quantity must be greater than zero.' };
    }

    const batches = this.getBatches();
    const cleanId = String(itemId || '').trim().toLowerCase();
    const sourceKey = (sourceLocationId === 'warehouse' || sourceLocationId === 'wh-central-amd') ? 'central' : sourceLocationId;

    // Filter active matching batches with stock at source, sorted FIFO (earliest expiry / creation first)
    let matchingBatches = batches
      .filter((b) => {
        const isMatch = b.itemId === itemId || (b.sku && b.sku.toLowerCase() === cleanId) || b.id === itemId;
        const available = Math.max(0, Math.floor(Number(b.locationQuantities?.[sourceKey] ?? (sourceKey === 'central' ? b.quantityInStock : 0)) || 0));
        return isMatch && available > 0 && b.status !== 'depleted';
      })
      .sort((a, b) => new Date(a.expiryDate || 0).getTime() - new Date(b.expiryDate || 0).getTime());

    let totalAvailable = matchingBatches.reduce((sum, b) => {
      return sum + Math.max(0, Math.floor(Number(b.locationQuantities?.[sourceKey] ?? (sourceKey === 'central' ? b.quantityInStock : 0)) || 0));
    }, 0);

    // If source is Central and batch stock is lower than requested, check master inventory to auto-provision standard batch
    if (totalAvailable < requestedQty && sourceKey === 'central') {
      const inventory = storage.getInventory();
      const invItem = inventory.find((i) => i.id === itemId || (i.sku && i.sku.toLowerCase() === cleanId));
      const deficit = requestedQty - totalAvailable;

      if (invItem) {
        const nowIso = new Date().toISOString();
        const autoBatchId = `bat-${invItem.id}-${Date.now()}`;
        const autoBatch: BatchRecord = {
          id: autoBatchId,
          itemId: invItem.id,
          sku: invItem.sku,
          name: invItem.name,
          category: invItem.category || 'General',
          batchNumber: `BATCH-${invItem.sku.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`,
          warehouseId: 'wh-central-amd',
          warehouseName: 'Central Warehouse',
          mfgDate: nowIso.split('T')[0],
          expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
          initialQuantity: Math.max(deficit, Number(invItem.stockQuantity) || deficit),
          originalQuantity: Math.max(deficit, Number(invItem.stockQuantity) || deficit),
          originalUnit: invItem.unit || 'units',
          piecesPerBox: invItem.piecesPerBox || 1,
          originalBaseQuantity: Math.max(deficit, Number(invItem.stockQuantity) || deficit),
          currentBaseQuantity: Math.max(deficit, Number(invItem.stockQuantity) || deficit),
          currentQuantity: Math.max(deficit, Number(invItem.stockQuantity) || deficit),
          quantityInStock: Math.max(deficit, Number(invItem.stockQuantity) || deficit),
          consumedQuantity: 0,
          consumedBaseQuantity: 0,
          locationQuantities: {
            central: Math.max(deficit, Number(invItem.stockQuantity) || deficit),
            'wh-central-amd': Math.max(deficit, Number(invItem.stockQuantity) || deficit),
          },
          locationUnit: 'UNIT',
          unit: invItem.unit,
          unitCost: invItem.costPrice || 20,
          purchaseBillRef: 'CENTRAL-STOCK',
          supplierName: 'Central Warehouse Hub',
          daysToExpiry: 365,
          status: 'active',
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        batches.unshift(autoBatch);
        matchingBatches.unshift(autoBatch);
        totalAvailable += autoBatch.quantityInStock;
      }
    }

    if (totalAvailable < requestedQty) {
      return {
        success: false,
        allocations: [],
        error: `Insufficient batch stock at source location. Available: ${totalAvailable}, Requested: ${requestedQty}`,
      };
    }

    let remainingToAllocate = requestedQty;
    const allocations: BatchAllocation[] = [];

    for (const b of matchingBatches) {
      if (remainingToAllocate <= 0) break;
      if (!b.locationQuantities) b.locationQuantities = {};
      const currentLocQty = Math.max(0, Math.floor(Number(b.locationQuantities[sourceKey] ?? (sourceKey === 'central' ? b.quantityInStock : 0)) || 0));
      const takeQty = Math.min(remainingToAllocate, currentLocQty);

      b.locationQuantities[sourceKey] = currentLocQty - takeQty;
      if (sourceKey === 'central') {
        b.locationQuantities['wh-central-amd'] = b.locationQuantities[sourceKey];
        b.quantityInStock = b.locationQuantities[sourceKey];
      }

      b.currentQuantity = Math.max(0, (Number(b.currentQuantity) || 0) - takeQty);
      b.currentBaseQuantity = b.currentQuantity;
      b.updatedAt = new Date().toISOString();

      allocations.push({
        batchId: b.id,
        batchNumber: b.batchNumber,
        quantity: takeQty,
      });

      remainingToAllocate -= takeQty;
    }

    this.saveBatches(batches);
    return { success: true, allocations };
  },

  // Confirm Inwarding of Allocated Batches at Destination
  confirmBatchTransfer(allocations: BatchAllocation[], destinationLocationId: string): boolean {
    if (!allocations || allocations.length === 0) return true;
    const batches = this.getBatches();
    const destKey = (destinationLocationId === 'warehouse' || destinationLocationId === 'wh-central-amd') ? 'central' : destinationLocationId;
    const nowIso = new Date().toISOString();

    allocations.forEach((alloc) => {
      const b = batches.find((bat) => bat.id === alloc.batchId || bat.batchNumber === alloc.batchNumber);
      if (b) {
        if (!b.locationQuantities) b.locationQuantities = {};
        const currentDest = Math.max(0, Math.floor(Number(b.locationQuantities[destKey]) || 0));
        b.locationQuantities[destKey] = currentDest + alloc.quantity;
        if (destKey === 'central') {
          b.locationQuantities['wh-central-amd'] = b.locationQuantities[destKey];
          b.quantityInStock = b.locationQuantities[destKey];
        }
        b.currentQuantity = Math.max(0, (Number(b.currentQuantity) || 0) + alloc.quantity);
        b.currentBaseQuantity = b.currentQuantity;
        b.updatedAt = nowIso;
      }
    });

    this.saveBatches(batches);
    return true;
  },

  // Revert / Rollback Batch Transfer on Cancellation
  revertBatchTransfer(allocations: BatchAllocation[], sourceLocationId: string): boolean {
    if (!allocations || allocations.length === 0) return true;
    const batches = this.getBatches();
    const sourceKey = (sourceLocationId === 'warehouse' || sourceLocationId === 'wh-central-amd') ? 'central' : sourceLocationId;
    const nowIso = new Date().toISOString();

    allocations.forEach((alloc) => {
      const b = batches.find((bat) => bat.id === alloc.batchId || bat.batchNumber === alloc.batchNumber);
      if (b) {
        if (!b.locationQuantities) b.locationQuantities = {};
        const currentSrc = Math.max(0, Math.floor(Number(b.locationQuantities[sourceKey]) || 0));
        b.locationQuantities[sourceKey] = currentSrc + alloc.quantity;
        if (sourceKey === 'central') {
          b.locationQuantities['wh-central-amd'] = b.locationQuantities[sourceKey];
          b.quantityInStock = b.locationQuantities[sourceKey];
        }
        b.currentQuantity = Math.max(0, (Number(b.currentQuantity) || 0) + alloc.quantity);
        b.currentBaseQuantity = b.currentQuantity;
        b.updatedAt = nowIso;
      }
    });

    this.saveBatches(batches);
    return true;
  },

  // Auto-Reconcile Central Hub and Store Stocks with Batch Ledger
  reconcileCentralStockWithBatches(): { adjustedCount: number; totalBatches: number } {
    const inventory = storage.getInventory();
    const batches = this.getBatches();
    let adjustedCount = 0;
    const nowIso = new Date().toISOString();

    inventory.forEach((inv) => {
      const centralStock = Math.max(0, Math.floor(Number(inv.stockQuantity) || 0));
      const cleanSku = (inv.sku || '').toLowerCase();
      const itemBatches = batches.filter(
        (b) => b.itemId === inv.id || (b.sku && b.sku.toLowerCase() === cleanSku)
      );

      const totalBatchCentral = itemBatches.reduce((sum, b) => {
        return sum + Math.max(0, Math.floor(Number(b.locationQuantities?.['central'] ?? (b.quantityInStock || 0)) || 0));
      }, 0);

      if (totalBatchCentral !== centralStock) {
        adjustedCount++;
        if (itemBatches.length === 0 && centralStock > 0) {
          const newBatchId = `bat-auto-${inv.id}-${Date.now()}`;
          batches.unshift({
            id: newBatchId,
            itemId: inv.id,
            sku: inv.sku,
            name: inv.name,
            category: inv.category || 'General',
            batchNumber: `BATCH-${inv.sku.slice(0, 4).toUpperCase()}-01`,
            warehouseId: 'wh-central-amd',
            warehouseName: 'Central Warehouse',
            mfgDate: nowIso.split('T')[0],
            expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
            initialQuantity: centralStock,
            originalQuantity: centralStock,
            originalUnit: inv.unit || 'units',
            piecesPerBox: inv.piecesPerBox || 1,
            originalBaseQuantity: centralStock,
            currentBaseQuantity: centralStock,
            currentQuantity: centralStock,
            quantityInStock: centralStock,
            consumedQuantity: 0,
            consumedBaseQuantity: 0,
            locationQuantities: {
              central: centralStock,
              'wh-central-amd': centralStock,
            },
            locationUnit: 'UNIT',
            unit: inv.unit || 'units',
            unitCost: inv.costPrice || 20,
            purchaseBillRef: 'CENTRAL-STOCK',
            supplierName: 'Central Warehouse Hub',
            daysToExpiry: 365,
            status: 'active',
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        } else if (itemBatches.length > 0) {
          const delta = centralStock - totalBatchCentral;
          const target = itemBatches[0];
          if (!target.locationQuantities) target.locationQuantities = {};
          const curCentral = Math.max(0, Math.floor(Number(target.locationQuantities['central'] ?? target.quantityInStock ?? 0)));
          const newCentral = Math.max(0, curCentral + delta);
          target.locationQuantities['central'] = newCentral;
          target.locationQuantities['wh-central-amd'] = newCentral;
          target.quantityInStock = newCentral;
          target.currentQuantity = Math.max(0, (Number(target.currentQuantity) || 0) + delta);
          target.currentBaseQuantity = target.currentQuantity;
          target.updatedAt = nowIso;
        }
      }
    });

    if (adjustedCount > 0) {
      this.saveBatches(batches);
      // Trigger backend reconciliation endpoint if available
      try {
        fetch('/api/batches/reconcile', { method: 'POST' }).catch(() => {});
      } catch {
        // Non-critical
      }
    }

    return { adjustedCount, totalBatches: batches.length };
  },

  // POS Sale: FIFO Batch Consumption at Store
  consumeBatchesForSale(
    itemId: string,
    storeId: string,
    saleQty: number
  ): { success: boolean; allocations: BatchAllocation[]; error?: string } {
    if (saleQty <= 0) {
      return { success: true, allocations: [] };
    }

    const batches = this.getBatches();
    const cleanId = String(itemId || '').trim().toLowerCase();
    const storeKey = storeId || 'central';

    // Find active batches for product at store, sorted FIFO by expiry date
    const storeBatches = batches
      .filter((b) => {
        const isMatch = b.itemId === itemId || (b.sku && b.sku.toLowerCase() === cleanId) || b.id === itemId;
        const available = Math.max(0, Math.floor(Number(b.locationQuantities?.[storeKey] ?? (storeKey === 'central' ? b.quantityInStock : 0)) || 0));
        return isMatch && available > 0 && b.status !== 'depleted';
      })
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    let remainingToConsume = saleQty;
    const allocations: BatchAllocation[] = [];

    for (const b of storeBatches) {
      if (remainingToConsume <= 0) break;
      if (!b.locationQuantities) b.locationQuantities = {};
      const currentStoreQty = Math.max(0, Math.floor(Number(b.locationQuantities[storeKey] ?? (storeKey === 'central' ? b.quantityInStock : 0)) || 0));
      const takeQty = Math.min(remainingToConsume, currentStoreQty);

      b.locationQuantities[storeKey] = currentStoreQty - takeQty;
      if (storeKey === 'central') {
        b.locationQuantities['wh-central-amd'] = b.locationQuantities[storeKey];
        b.quantityInStock = b.locationQuantities[storeKey];
      }

      b.consumedQuantity = (b.consumedQuantity || 0) + takeQty;
      allocations.push({
        batchId: b.id,
        batchNumber: b.batchNumber,
        quantity: takeQty,
      });

      remainingToConsume -= takeQty;
    }

    this.saveBatches(batches);
    return { success: true, allocations };
  },

  // =========================================================================
  // STOCK TRANSFERS & IN-TRANSIT TRACKING
  // =========================================================================
  getStockTransfers(): StockTransfer[] {
    return getWhCached(WH_KEYS.TRANSFERS, () => {
      try {
        const data = safeStorage.getItem(WH_KEYS.TRANSFERS);
        if (!data) {
          this.saveStockTransfers(INITIAL_TRANSFERS);
          return INITIAL_TRANSFERS;
        }
        return JSON.parse(data);
      } catch {
        return INITIAL_TRANSFERS;
      }
    });
  },

  saveStockTransfers(list: StockTransfer[]): void {
    try {
      setWhCached(WH_KEYS.TRANSFERS, list);
      safeStorage.setItem(WH_KEYS.TRANSFERS, JSON.stringify(list));
      this.notifySubscribers();
      cloudSync.debouncedSyncCollection('stock_transfers', list);
    } catch (e) {
      console.error(e);
    }
  },

  // Transfer methods with concurrency & idempotency protection
  createStockTransfer(transferData: Omit<StockTransfer, 'id' | 'transferNumber' | 'totalValuation'>): StockTransfer {
    const transfers = this.getStockTransfers();
    const transferNumber = `TR-2026-${(transfers.length + 43).toString().padStart(3, '0')}`;
    const totalValuation = transferData.items.reduce(
      (sum, item) => sum + (item.dispatchedQty || item.requestedQty) * item.unitCost,
      0
    );

    const newTransfer: StockTransfer = {
      ...transferData,
      id: `tr-${Date.now()}`,
      transferNumber,
      totalValuation,
      otpOrPin: transferData.otpOrPin || Math.floor(1000 + Math.random() * 9000).toString(),
    };

    // If auto-dispatched directly on creation, deduct source stock atomically
    if (newTransfer.status === 'dispatched_in_transit') {
      newTransfer.dispatchDate = new Date().toISOString().split('T')[0];
      const inventory = storage.getInventory();
      const nowIso = new Date().toISOString();
      const nowTs = Date.now();

      if (newTransfer.type === 'warehouse_to_store') {
        // Pre-flight validation: Central WH must have sufficient authoritative stock for ALL items
        for (const item of newTransfer.items) {
          const invItem = inventory.find(
            (i) => i.id === item.itemId || (i.sku && i.sku.toLowerCase() === item.sku.toLowerCase())
          );
          const rawQty = Math.max(0, Math.floor(Number(item.dispatchedQty || item.requestedQty) || 0));
          item.baseQuantity = rawQty;

          const availableStock = invItem ? Math.max(0, Math.floor(Number(invItem.stockQuantity) || 0)) : 0;
          if (rawQty <= 0 || rawQty > availableStock) {
            throw new Error(
              `Cannot dispatch transfer: Item "${item.name}" requested ${rawQty} ${item.unit || invItem?.unit || 'units'}, but Central Warehouse has only ${availableStock} units available. Please inward stock first or adjust transfer quantity.`
            );
          }
        }

        const auditRecords: Array<Omit<StockMovementAudit, 'id' | 'timestamp'>> = [];
        newTransfer.items.forEach((item, idx) => {
          const invItem = inventory.find(
            (i) => i.id === item.itemId || (i.sku && i.sku.toLowerCase() === item.sku.toLowerCase())
          );
          if (invItem) {
            const isBoxUnit = isBoxDenominatedUnit(item.transferUnit || item.unit || invItem.unit);
            const rawQty = Math.max(0, Math.floor(Number(item.dispatchedQty || item.requestedQty) || 0));
            item.baseQuantity = rawQty;

            // Allocate FIFO batches from Central Warehouse
            const allocRes = this.allocateBatchesForTransfer(invItem.id, 'central', rawQty);
            if (allocRes.success && allocRes.allocations.length > 0) {
              item.batchAllocations = allocRes.allocations;
              item.batchNumber = allocRes.allocations.map((a) => a.batchNumber).join(', ');
            }

            const previousStock = Math.max(0, Math.floor(Number(invItem.stockQuantity) || 0));
            const newWhStock = Math.max(0, previousStock - rawQty);
            invItem.stockQuantity = newWhStock;
            invItem.fullBoxStock = isBoxUnit ? newWhStock : 0;
            invItem.loosePieceStock = 0;
            invItem.totalPieceEquivalent = newWhStock;
            invItem.total_piece_equivalent = newWhStock;

            (invItem as any).lastStockChange = nowTs;
            invItem.updatedAt = nowIso;

            auditRecords.push({
              transactionId: `TXN-${Date.now().toString().slice(-5)}${idx}`,
              referenceNumber: transferNumber,
              itemId: item.itemId,
              sku: item.sku,
              itemName: item.name,
              batchNumber: item.batchNumber,
              movementType: 'warehouse_transfer_out' as const,
              fromLocation: newTransfer.sourceName,
              toLocation: `In Transit ➔ ${newTransfer.destinationName}`,
              quantity: -rawQty,
              quantityChanged: -rawQty,
              previousStock,
              newStock: newWhStock,
              unit: item.unit || invItem.unit || 'units',
              balanceAfter: newWhStock,
              unitCost: item.unitCost,
              totalCostImpact: -rawQty * item.unitCost,
              performedBy: newTransfer.dispatchedBy || 'Warehouse Manager',
              userRole: 'Warehouse Manager' as const,
              status: 'Completed',
              notes: `Transfer dispatched: Deducted ${rawQty} ${item.unit || invItem.unit || 'units'} from Central Warehouse. Before: ${previousStock} ➔ After: ${newWhStock}. Carrier: ${newTransfer.carrierName || 'Internal'} • OTP: ${newTransfer.otpOrPin} • Batches: ${item.batchNumber || 'Auto'}`,
            });
          }
        });
        storage.saveInventory(inventory);
        this.addAuditRecords(auditRecords);
      } else if (newTransfer.type === 'store_to_warehouse_return') {
        let invModified = false;
        newTransfer.items.forEach((item) => {
          const invItem = inventory.find(
            (i) => i.id === item.itemId || (i.sku && i.sku.toLowerCase() === item.sku.toLowerCase())
          );
          if (invItem && invItem.storeAllocations) {
            const isBoxUnit = isBoxDenominatedUnit(item.transferUnit || item.unit || invItem.unit);
            const rawQty = Math.max(0, Math.floor(Number(item.dispatchedQty || item.requestedQty) || 0));
            item.baseQuantity = rawQty;

            // Allocate FIFO batches from store
            const allocRes = this.allocateBatchesForTransfer(invItem.id, newTransfer.sourceId, rawQty);
            if (allocRes.success && allocRes.allocations.length > 0) {
              item.batchAllocations = allocRes.allocations;
              item.batchNumber = allocRes.allocations.map((a) => a.batchNumber).join(', ');
            }

            const currentStoreStock = Math.max(0, Math.floor(Number(invItem.storeAllocations[newTransfer.sourceId]) || 0));
            const newStoreStock = Math.max(0, currentStoreStock - rawQty);
            invItem.storeAllocations[newTransfer.sourceId] = newStoreStock;

            if (!invItem.storeBoxAllocations) invItem.storeBoxAllocations = {};
            invItem.storeBoxAllocations[newTransfer.sourceId] = {
              fullBoxes: isBoxUnit ? newStoreStock : 0,
              loosePieces: 0,
              totalPieces: newStoreStock,
              total_piece_equivalent: newStoreStock,
            };

            (invItem as any).lastStockChange = nowTs;
            invItem.updatedAt = nowIso;
            invModified = true;
          }
        });
        if (invModified) {
          storage.saveInventory(inventory);
        }
      }
    }

    this.saveStockTransfers([newTransfer, ...transfers]);
    cloudSync.syncDocument('stock_transfers', newTransfer.id, newTransfer);

    storage.addNotification({
      title: `Stock Transfer Initiated: ${transferNumber}`,
      message: `${newTransfer.type === 'store_to_warehouse_return' ? 'Return' : 'Transfer'} from ${newTransfer.sourceName} ➔ ${newTransfer.destinationName} (${newTransfer.items.length} items, ₹${totalValuation.toLocaleString('en-IN')})`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });

    return newTransfer;
  },

  dispatchTransfer(
    transferId: string,
    carrierName: string,
    vehicleNumber: string,
    driverContact: string
  ): { success: boolean; error?: string } {
    const lockKey = `dispatch_${transferId}`;
    if (inFlightTransferLocks.has(lockKey)) {
      return { success: false, error: 'Dispatch operation is already processing. Please wait.' };
    }
    inFlightTransferLocks.add(lockKey);

    try {
      const transfers = this.getStockTransfers();
      const transfer = transfers.find((t) => t.id === transferId);
      if (!transfer) {
        return { success: false, error: 'Transfer not found.' };
      }

      // Idempotency: Never deduct or dispatch an already dispatched/completed transfer
      if (transfer.status === 'dispatched_in_transit' || transfer.status === 'completed' || transfer.status === 'partially_received') {
        return { success: false, error: 'Transfer has already been dispatched or completed.' };
      }

      const inventory = storage.getInventory();
      const nowIso = new Date().toISOString();
      const nowTs = Date.now();

      // If warehouse to store, check Central Warehouse stock availability first
      if (transfer.type === 'warehouse_to_store') {
        for (const item of transfer.items) {
          const invItem = inventory.find(
            (i) => i.id === item.itemId || (i.sku && i.sku.toLowerCase() === item.sku.toLowerCase())
          );
          const rawQty = Math.max(0, Math.floor(Number(item.dispatchedQty || item.requestedQty) || 0));
          item.baseQuantity = rawQty;

          const availableStock = invItem ? Math.max(0, Math.floor(Number(invItem.stockQuantity) || 0)) : 0;
          if (rawQty <= 0 || rawQty > availableStock) {
            return {
              success: false,
              error: `Cannot dispatch transfer: Item "${item.name}" needs ${rawQty} ${item.unit || invItem?.unit || 'units'}, but Central Warehouse only has ${availableStock} available. Please inward stock first or adjust transfer quantity.`,
            };
          }
        }

        // Deduct exact unit quantity from source Central Warehouse
        const auditRecords: Array<Omit<StockMovementAudit, 'id' | 'timestamp'>> = [];
        transfer.items.forEach((item, idx) => {
          const invItem = inventory.find(
            (i) => i.id === item.itemId || (i.sku && i.sku.toLowerCase() === item.sku.toLowerCase())
          );
          if (invItem) {
            const isBoxUnit = isBoxDenominatedUnit(item.transferUnit || item.unit || invItem.unit);
            const rawQty = Math.max(0, Math.floor(Number(item.dispatchedQty || item.requestedQty) || 0));
            item.baseQuantity = rawQty;

            // Allocate FIFO batches from Central Warehouse
            const allocRes = this.allocateBatchesForTransfer(invItem.id, 'central', rawQty);
            if (allocRes.success && allocRes.allocations.length > 0) {
              item.batchAllocations = allocRes.allocations;
              item.batchNumber = allocRes.allocations.map((a) => a.batchNumber).join(', ');
            }

            const previousStock = Math.max(0, Math.floor(Number(invItem.stockQuantity) || 0));
            const newWhStock = Math.max(0, previousStock - rawQty);
            invItem.stockQuantity = newWhStock;
            invItem.fullBoxStock = isBoxUnit ? newWhStock : 0;
            invItem.loosePieceStock = 0;
            invItem.totalPieceEquivalent = newWhStock;
            invItem.total_piece_equivalent = newWhStock;

            (invItem as any).lastStockChange = nowTs;
            invItem.updatedAt = nowIso;

            auditRecords.push({
              transactionId: `TXN-${Date.now().toString().slice(-5)}${idx}`,
              referenceNumber: transfer.transferNumber,
              itemId: item.itemId,
              sku: item.sku,
              itemName: item.name,
              batchNumber: item.batchNumber,
              movementType: 'warehouse_transfer_out' as const,
              fromLocation: transfer.sourceName,
              toLocation: `In Transit ➔ ${transfer.destinationName}`,
              quantity: -rawQty,
              quantityChanged: -rawQty,
              previousStock,
              newStock: newWhStock,
              unit: item.unit || invItem.unit || 'units',
              balanceAfter: newWhStock,
              unitCost: item.unitCost,
              totalCostImpact: -rawQty * item.unitCost,
              performedBy: transfer.dispatchedBy || 'Warehouse Manager',
              userRole: 'Warehouse Manager' as const,
              status: 'Completed',
              notes: `Dispatched in transit with tracking OTP: ${transfer.otpOrPin} • Vehicle: ${vehicleNumber} • Carrier: ${carrierName}. Warehouse Before: ${previousStock} ➔ After: ${newWhStock}. Batches: ${item.batchNumber || 'Auto'}`,
            });
          }
        });

        storage.saveInventory(inventory);
        this.addAuditRecords(auditRecords);
      } else if (transfer.type === 'store_to_warehouse_return') {
        let invModified = false;
        transfer.items.forEach((item) => {
          const invItem = inventory.find(
            (i) => i.id === item.itemId || (i.sku && i.sku.toLowerCase() === item.sku.toLowerCase())
          );
          if (invItem && invItem.storeAllocations) {
            const isBoxUnit = isBoxDenominatedUnit(item.transferUnit || item.unit || invItem.unit);
            const rawQty = Math.max(0, Math.floor(Number(item.dispatchedQty || item.requestedQty) || 0));
            item.baseQuantity = rawQty;

            // Allocate FIFO batches from store
            const allocRes = this.allocateBatchesForTransfer(invItem.id, transfer.sourceId, rawQty);
            if (allocRes.success && allocRes.allocations.length > 0) {
              item.batchAllocations = allocRes.allocations;
              item.batchNumber = allocRes.allocations.map((a) => a.batchNumber).join(', ');
            }

            const currentStoreStock = Math.max(0, Math.floor(Number(invItem.storeAllocations[transfer.sourceId]) || 0));
            const newStoreStock = Math.max(0, currentStoreStock - rawQty);
            invItem.storeAllocations[transfer.sourceId] = newStoreStock;

            if (!invItem.storeBoxAllocations) invItem.storeBoxAllocations = {};
            invItem.storeBoxAllocations[transfer.sourceId] = {
              fullBoxes: isBoxUnit ? newStoreStock : 0,
              loosePieces: 0,
              totalPieces: newStoreStock,
              total_piece_equivalent: newStoreStock,
            };

            (invItem as any).lastStockChange = nowTs;
            invItem.updatedAt = nowIso;
            invModified = true;
          }
        });
        if (invModified) {
          storage.saveInventory(inventory);
        }
      }

      transfer.status = 'dispatched_in_transit';
      transfer.dispatchDate = new Date().toISOString().split('T')[0];
      transfer.carrierName = carrierName;
      transfer.vehicleNumber = vehicleNumber;
      transfer.driverContact = driverContact;
      if (!transfer.otpOrPin) {
        transfer.otpOrPin = Math.floor(1000 + Math.random() * 9000).toString();
      }

      this.saveStockTransfers(transfers);

      // If an associated store indent exists, mark it as in transit
      try {
        const indents = this.getStoreIndents();
        const linkedIndent = indents.find(
          (ind) =>
            ind.storeId === transfer.destinationId &&
            (ind.status === 'converted_to_transfer' || ind.status === 'approved')
        );
        if (linkedIndent) {
          linkedIndent.status = 'converted_to_transfer';
          this.saveStoreIndents(indents);
        }
      } catch {
        // Non-critical
      }

      return { success: true };
    } finally {
      inFlightTransferLocks.delete(lockKey);
    }
  },

  receiveTransfer(transferId: string, receivedBy: string, itemReceivedMap: Record<string, number>): boolean {
    const lockKey = `receive_${transferId}`;
    if (inFlightTransferLocks.has(lockKey)) {
      console.warn(`[WarehouseStorage] Receive already in progress for transfer: ${transferId}`);
      return false;
    }
    inFlightTransferLocks.add(lockKey);

    try {
      const transfers = this.getStockTransfers();
      const transfer = transfers.find((t) => t.id === transferId);
      if (!transfer) return false;

      // CRITICAL IDEMPOTENCY CHECK: Never allow an already received or completed transfer to add stock twice!
      if (transfer.status === 'completed' || transfer.status === 'partially_received') {
        console.warn(`[WarehouseStorage] Transfer ${transfer.transferNumber} has already been received. Skipping duplicate execution.`);
        return false;
      }

      if (transfer.status !== 'dispatched_in_transit') {
        console.warn(`[WarehouseStorage] Transfer ${transfer.transferNumber} is not in transit (current status: ${transfer.status}).`);
        return false;
      }

      transfer.receivedDate = new Date().toISOString().split('T')[0];
      transfer.receivedBy = receivedBy;

      const inventory = storage.getInventory();
      let inventoryModified = false;
      let hasPartial = false;
      const nowIso = new Date().toISOString();
      const nowTs = Date.now();
      const auditRecords: Array<Omit<StockMovementAudit, 'id' | 'timestamp'>> = [];

      transfer.items.forEach((item, idx) => {
        const receivedQty = itemReceivedMap[item.itemId] !== undefined ? itemReceivedMap[item.itemId] : item.dispatchedQty;
        item.receivedQty = receivedQty;
        if (receivedQty < item.dispatchedQty) {
          item.damagedQty = item.dispatchedQty - receivedQty;
          hasPartial = true;
        }

        const invItem = inventory.find(
          (i) => i.id === item.itemId || (i.sku && i.sku.toLowerCase() === item.sku.toLowerCase())
        );
        if (invItem) {
          const isBoxUnit = isBoxDenominatedUnit(item.transferUnit || item.unit || invItem.unit);
          const receivedUnits = Math.max(0, Math.floor(receivedQty));

          if (transfer.type === 'store_to_warehouse_return') {
            // Confirm batch return at Central Warehouse
            this.confirmBatchTransfer(item.batchAllocations || [], 'central');

            // Returning to Central Warehouse (Exact addition)
            const previousStock = Math.max(0, Math.floor(Number(invItem.stockQuantity) || 0));
            const newWhStock = previousStock + receivedUnits;
            invItem.stockQuantity = newWhStock;
            invItem.fullBoxStock = isBoxUnit ? newWhStock : 0;
            invItem.loosePieceStock = 0;
            invItem.totalPieceEquivalent = newWhStock;
            invItem.total_piece_equivalent = newWhStock;

            (invItem as any).lastStockChange = nowTs;
            invItem.updatedAt = nowIso;
            inventoryModified = true;

            auditRecords.push({
              transactionId: `TXN-${Date.now().toString().slice(-5)}${idx}`,
              referenceNumber: transfer.transferNumber,
              itemId: item.itemId,
              sku: item.sku,
              itemName: item.name,
              batchNumber: item.batchNumber,
              movementType: 'store_return_in' as const,
              fromLocation: transfer.sourceName,
              toLocation: 'Central Warehouse (WH-AMD-01)',
              quantity: receivedUnits,
              quantityChanged: receivedUnits,
              previousStock,
              newStock: newWhStock,
              unit: item.unit || invItem.unit || 'units',
              balanceAfter: newWhStock,
              unitCost: item.unitCost,
              totalCostImpact: receivedUnits * item.unitCost,
              performedBy: receivedBy,
              userRole: 'Store Manager',
              status: 'Completed',
              notes: `Store return verified: Returned ${receivedUnits} ${item.unit || invItem.unit || 'units'} to Central Warehouse. Before: ${previousStock} ➔ After: ${newWhStock}. Batches: ${item.batchNumber || 'Auto'}`,
            });
          } else {
            // Inwarding at destination Store (Exact addition)
            if (!invItem.storeAllocations) invItem.storeAllocations = {};
            const destStoreKey = transfer.destinationId;

            // Confirm batch receipt at destination store
            this.confirmBatchTransfer(item.batchAllocations || [], destStoreKey);

            const previousStoreStock = Math.max(0, Math.floor(Number(invItem.storeAllocations[destStoreKey]) || 0));
            const newStoreStock = previousStoreStock + receivedUnits;
            invItem.storeAllocations[destStoreKey] = newStoreStock;

            if (!invItem.storeBoxAllocations) invItem.storeBoxAllocations = {};
            invItem.storeBoxAllocations[destStoreKey] = {
              fullBoxes: isBoxUnit ? newStoreStock : 0,
              loosePieces: 0,
              totalPieces: newStoreStock,
              total_piece_equivalent: newStoreStock,
            };

            (invItem as any).lastStockChange = nowTs;
            invItem.updatedAt = nowIso;
            inventoryModified = true;

            auditRecords.push({
              transactionId: `TXN-${Date.now().toString().slice(-5)}${idx}`,
              referenceNumber: transfer.transferNumber,
              itemId: item.itemId,
              sku: item.sku,
              itemName: item.name,
              batchNumber: item.batchNumber,
              movementType: 'store_transfer_in' as const,
              fromLocation: 'In Transit',
              toLocation: transfer.destinationName,
              quantity: receivedUnits,
              quantityChanged: receivedUnits,
              previousStock: previousStoreStock,
              newStock: newStoreStock,
              unit: item.unit || invItem.unit || 'units',
              balanceAfter: newStoreStock,
              unitCost: item.unitCost,
              totalCostImpact: receivedUnits * item.unitCost,
              performedBy: receivedBy,
              userRole: 'Store Manager',
              status: 'Completed',
              notes: `Stock safely received at ${transfer.destinationName}: Added ${receivedUnits} ${item.unit || invItem.unit || 'units'}. Store Stock Before: ${previousStoreStock} ➔ After: ${newStoreStock}. Batches: ${item.batchNumber || 'Auto'}`,
            });
          }
        }
      });

      this.addAuditRecords(auditRecords);

      if (inventoryModified) {
        storage.saveInventory(inventory);
      }

      transfer.status = hasPartial ? 'partially_received' : 'completed';
      this.saveStockTransfers(transfers);

      // If an associated store indent exists, mark it as completed
      try {
        const indents = this.getStoreIndents();
        const linkedIndent = indents.find(
          (ind) =>
            ind.storeId === transfer.destinationId &&
            (ind.status === 'converted_to_transfer' || ind.status === 'approved')
        );
        if (linkedIndent) {
          linkedIndent.status = 'completed';
          this.saveStoreIndents(indents);
        }
      } catch {
        // Non-critical
      }

      storage.addNotification({
        title: `Stock Inward Completed at ${transfer.destinationName}`,
        message: `Transfer ${transfer.transferNumber} received by ${receivedBy} (${transfer.status.toUpperCase()}). Stock successfully allocated to store inventory.`,
        type: 'order_update',
        targetRole: 'admin',
        read: false,
      });

      return true;
    } finally {
      inFlightTransferLocks.delete(lockKey);
    }
  },

  // Cancel stock transfer with atomic inventory restoration if in-transit
  cancelStockTransfer(
    transferId: string,
    cancelledBy: string = 'Warehouse Manager',
    reason: string = 'Transfer Cancelled'
  ): { success: boolean; error?: string } {
    const lockKey = `cancel_${transferId}`;
    if (inFlightTransferLocks.has(lockKey)) {
      return { success: false, error: 'Cancellation operation is already in progress. Please wait.' };
    }
    inFlightTransferLocks.add(lockKey);

    try {
      const transfers = this.getStockTransfers();
      const transfer = transfers.find((t) => t.id === transferId);
      if (!transfer) {
        return { success: false, error: 'Transfer not found.' };
      }

      if (transfer.status === 'cancelled') {
        return { success: false, error: 'Transfer is already cancelled.' };
      }

      if (transfer.status === 'completed' || transfer.status === 'partially_received') {
        return {
          success: false,
          error: 'Cannot cancel a transfer that has already been received at the destination store.',
        };
      }

      // If it was dispatched in transit, atomically restore stock back to the source location
      if (transfer.status === 'dispatched_in_transit') {
        const inventory = storage.getInventory();
        const nowIso = new Date().toISOString();
        const nowTs = Date.now();
        const auditRecords: Array<Omit<StockMovementAudit, 'id' | 'timestamp'>> = [];

        if (transfer.type === 'warehouse_to_store') {
          // Restore stock back to Central Warehouse
          transfer.items.forEach((item, idx) => {
            // Revert batch allocations to Central Warehouse
            this.revertBatchTransfer(item.batchAllocations || [], 'central');

            const invItem = inventory.find(
              (i) => i.id === item.itemId || (i.sku && i.sku.toLowerCase() === item.sku.toLowerCase())
            );
            if (invItem) {
              const isBoxUnit = isBoxDenominatedUnit(item.transferUnit || item.unit || invItem.unit);
              const rawQty = Math.max(0, Math.floor(Number(item.dispatchedQty || item.requestedQty) || 0));

              const previousStock = Math.max(0, Math.floor(Number(invItem.stockQuantity) || 0));
              const newStock = previousStock + rawQty;
              invItem.stockQuantity = newStock;
              invItem.fullBoxStock = isBoxUnit ? newStock : 0;
              invItem.loosePieceStock = 0;
              invItem.totalPieceEquivalent = newStock;
              invItem.total_piece_equivalent = newStock;
              (invItem as any).lastStockChange = nowTs;
              invItem.updatedAt = nowIso;

              auditRecords.push({
                transactionId: `TXN-${Date.now().toString().slice(-5)}${idx}`,
                referenceNumber: transfer.transferNumber,
                itemId: item.itemId,
                sku: item.sku,
                itemName: item.name,
                batchNumber: item.batchNumber,
                movementType: 'physical_adjustment' as const,
                fromLocation: 'Cancelled In-Transit Rollback',
                toLocation: transfer.sourceName,
                quantity: rawQty,
                quantityChanged: rawQty,
                previousStock,
                newStock,
                unit: item.unit || invItem.unit || 'units',
                balanceAfter: newStock,
                unitCost: item.unitCost,
                totalCostImpact: rawQty * item.unitCost,
                performedBy: cancelledBy,
                userRole: 'Warehouse Manager' as const,
                status: 'Completed',
                notes: `Transfer Cancelled: Restored ${rawQty} ${item.unit || invItem.unit || 'units'} back to Central Warehouse (${transfer.transferNumber}). Reason: ${reason}.`,
              });
            }
          });
          storage.saveInventory(inventory);
          this.addAuditRecords(auditRecords);
        } else if (transfer.type === 'store_to_warehouse_return') {
          // Restore stock back to source store
          let invModified = false;
          transfer.items.forEach((item) => {
            const invItem = inventory.find(
              (i) => i.id === item.itemId || (i.sku && i.sku.toLowerCase() === item.sku.toLowerCase())
            );
            if (invItem && invItem.storeAllocations) {
              const isBoxUnit = isBoxDenominatedUnit(item.transferUnit || item.unit || invItem.unit);
              const rawQty = Math.max(0, Math.floor(Number(item.dispatchedQty || item.requestedQty) || 0));

              const currentStoreStock = Math.max(0, Math.floor(Number(invItem.storeAllocations[transfer.sourceId]) || 0));
              const newStoreStock = currentStoreStock + rawQty;
              invItem.storeAllocations[transfer.sourceId] = newStoreStock;

              if (!invItem.storeBoxAllocations) invItem.storeBoxAllocations = {};
              invItem.storeBoxAllocations[transfer.sourceId] = {
                fullBoxes: isBoxUnit ? newStoreStock : 0,
                loosePieces: 0,
                totalPieces: newStoreStock,
                total_piece_equivalent: newStoreStock,
              };

              (invItem as any).lastStockChange = nowTs;
              invItem.updatedAt = nowIso;
              invModified = true;
            }
          });
          if (invModified) {
            storage.saveInventory(inventory);
          }
        }
      }

      // Update transfer status
      transfer.status = 'cancelled';
      transfer.notes = (transfer.notes ? transfer.notes + ' • ' : '') + `Cancelled: ${reason}`;
      this.saveStockTransfers(transfers);

      storage.addNotification({
        title: `Transfer Cancelled: ${transfer.transferNumber}`,
        message: `Transfer ${transfer.transferNumber} cancelled by ${cancelledBy}. Stock state restored.`,
        type: 'order_update',
        targetRole: 'admin',
        read: false,
      });

      return { success: true };
    } finally {
      inFlightTransferLocks.delete(lockKey);
    }
  },

  // =========================================================================
  // STORE INDENTS (STOCK REQUESTS)
  // =========================================================================
  getStoreIndents(): StoreStockIndent[] {
    return getWhCached(WH_KEYS.INDENTS, () => {
      try {
        const data = safeStorage.getItem(WH_KEYS.INDENTS);
        if (!data) {
          this.saveStoreIndents(INITIAL_INDENTS);
          return INITIAL_INDENTS;
        }
        return JSON.parse(data);
      } catch {
        return INITIAL_INDENTS;
      }
    });
  },

  saveStoreIndents(list: StoreStockIndent[]): void {
    try {
      setWhCached(WH_KEYS.INDENTS, list);
      safeStorage.setItem(WH_KEYS.INDENTS, JSON.stringify(list));
      this.notifySubscribers();
      cloudSync.debouncedSyncCollection('store_indents', list);
    } catch (e) {
      console.error(e);
    }
  },

  createStoreIndent(indentData: Omit<StoreStockIndent, 'id' | 'indentNumber' | 'status'>): StoreStockIndent {
    const indents = this.getStoreIndents();
    const indentNumber = `IND-2026-${(indents.length + 25).toString().padStart(3, '0')}`;
    const newIndent: StoreStockIndent = {
      ...indentData,
      id: `ind-${Date.now()}`,
      indentNumber,
      status: 'pending',
    };
    this.saveStoreIndents([newIndent, ...indents]);
    cloudSync.syncDocument('store_indents', newIndent.id, newIndent);

    storage.addNotification({
      title: `New Store Indent Request: ${indentNumber}`,
      message: `${newIndent.storeName} requested ${newIndent.items.length} items (${newIndent.urgency.toUpperCase()})`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });

    return newIndent;
  },

  approveStoreIndent(indentId: string): boolean {
    const indents = this.getStoreIndents();
    const indent = indents.find((i) => i.id === indentId);
    if (!indent) return false;

    indent.status = 'converted_to_transfer';
    this.saveStoreIndents(indents);

    // Convert into active Stock Transfer
    const inventory = storage.getInventory();
    const transferItems = indent.items.map((i) => {
      const found = inventory.find((inv) => inv.id === i.itemId);
      return {
        itemId: i.itemId,
        sku: i.sku,
        name: i.name,
        unit: i.unit,
        requestedQty: i.requestedQty,
        dispatchedQty: i.requestedQty,
        receivedQty: 0,
        unitCost: found ? found.costPrice : 200,
      };
    });

    this.createStockTransfer({
      type: 'warehouse_to_store',
      sourceType: 'warehouse',
      sourceId: indent.targetWarehouseId,
      sourceName: indent.targetWarehouseName,
      destinationType: 'store',
      destinationId: indent.storeId,
      destinationName: indent.storeName,
      requestedDate: indent.requestDate,
      status: 'approved',
      items: transferItems,
      notes: `Generated from Indent Request ${indent.indentNumber}`,
    });

    return true;
  },

  cancelStoreIndent(indentId: string): boolean {
    const indents = this.getStoreIndents();
    const target = indents.find((i) => i.id === indentId);
    if (!target) return false;
    target.status = 'declined';
    this.saveStoreIndents(indents);
    storage.addNotification({
      title: `Store Indent Cancelled: ${target.indentNumber}`,
      message: `${target.storeName} cancelled indent requisition ${target.indentNumber}`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });
    return true;
  },

  deleteStoreIndent(indentId: string): boolean {
    const indents = this.getStoreIndents();
    const filtered = indents.filter((i) => i.id !== indentId);
    if (filtered.length === indents.length) return false;
    this.saveStoreIndents(filtered);
    return true;
  },

  // =========================================================================
  // STOCK ADJUSTMENTS & SCRAP
  // =========================================================================
  getStockAdjustments(): StockAdjustment[] {
    return getWhCached(WH_KEYS.ADJUSTMENTS, () => {
      try {
        const data = safeStorage.getItem(WH_KEYS.ADJUSTMENTS);
        if (!data) {
          this.saveStockAdjustments(INITIAL_ADJUSTMENTS);
          return INITIAL_ADJUSTMENTS;
        }
        return JSON.parse(data);
      } catch {
        return INITIAL_ADJUSTMENTS;
      }
    });
  },

  saveStockAdjustments(list: StockAdjustment[]): void {
    try {
      setWhCached(WH_KEYS.ADJUSTMENTS, list);
      safeStorage.setItem(WH_KEYS.ADJUSTMENTS, JSON.stringify(list));
      this.notifySubscribers();
    } catch (e) {
      console.error(e);
    }
  },

  createStockAdjustment(adjData: Omit<StockAdjustment, 'id' | 'adjustmentNumber' | 'totalLossValue'>): StockAdjustment {
    const adjustments = this.getStockAdjustments();
    const adjustmentNumber = `ADJ-2026-${(adjustments.length + 15).toString().padStart(3, '0')}`;
    const totalLossValue = adjData.items.reduce(
      (sum, item) => sum + Math.abs(item.adjustedQty) * item.unitCost,
      0
    );

    const newAdj: StockAdjustment = {
      ...adjData,
      id: `adj-${Date.now()}`,
      adjustmentNumber,
      totalLossValue,
    };

    // Apply stock delta in a single batch
    if (newAdj.locationType === 'store') {
      const inventory = storage.getInventory();
      newAdj.items.forEach((item) => {
        const invItem = inventory.find((i) => i.id === item.itemId);
        if (invItem) {
          if (!invItem.storeAllocations) invItem.storeAllocations = {};
          const current = invItem.storeAllocations[newAdj.locationId] || 0;
          invItem.storeAllocations[newAdj.locationId] = Math.max(0, current + item.adjustedQty);
        }
      });
      storage.saveInventory(inventory);
    } else {
      const stockDeltas = newAdj.items.map((item) => ({
        id: item.itemId,
        delta: item.adjustedQty,
        reason: `Adjustment ${adjustmentNumber} (${newAdj.reason.replace(/_/g, ' ').toUpperCase()})`,
      }));
      storage.batchAdjustStock(stockDeltas);
    }

    const auditRecords = newAdj.items.map((item) => ({
      referenceNumber: adjustmentNumber,
      itemId: item.itemId,
      sku: item.sku,
      itemName: item.name,
      batchNumber: item.batchNumber,
      movementType: (newAdj.reason === 'damaged_spoilage' || newAdj.reason === 'expired_batch'
        ? ('damage_scrap' as const)
        : ('physical_adjustment' as const)),
      fromLocation: newAdj.locationName,
      toLocation: item.adjustedQty < 0 ? 'Scrap & Spoilage Write-Off' : 'Stock Surplus Addition',
      quantity: item.adjustedQty,
      unit: item.unit,
      balanceAfter: item.previousStock + item.adjustedQty,
      unitCost: item.unitCost,
      totalCostImpact: item.adjustedQty * item.unitCost,
      performedBy: newAdj.authorizedBy,
      userRole: 'Warehouse Manager' as const,
      notes: `Reason: ${newAdj.reason.replace(/_/g, ' ')} • ${item.itemNotes || ''}`,
    }));
    this.addAuditRecords(auditRecords);

    this.saveStockAdjustments([newAdj, ...adjustments]);

    storage.addNotification({
      title: `Stock Adjustment Applied: ${adjustmentNumber}`,
      message: `Adjusted stock for ${newAdj.items.length} items at ${newAdj.locationName} (Valuation Impact: ₹${totalLossValue.toLocaleString('en-IN')})`,
      type: 'low_stock',
      targetRole: 'admin',
      read: false,
    });

    return newAdj;
  },

  // Direct single-store stock adjustment helper (Reconciliation/Store Count Correction)
  adjustStoreStock(
    itemId: string,
    storeId: string,
    newQuantity: number,
    reason: string = 'Physical Store Stock Audit',
    performedBy: string = 'Warehouse Auditor'
  ): boolean {
    const inventory = storage.getInventory();
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return false;

    if (!item.storeAllocations) {
      item.storeAllocations = {};
    }

    const previousStoreStock = item.storeAllocations[storeId] || 0;
    const diff = newQuantity - previousStoreStock;
    if (diff === 0) return true;

    item.storeAllocations[storeId] = Math.max(0, newQuantity);

    const store = storage.getStoreById(storeId);
    const storeName = store ? store.name : storeId;
    const adjRef = `ADJ-STR-${Date.now().toString().slice(-5)}`;

    this.addAuditRecord({
      referenceNumber: adjRef,
      itemId: item.id,
      sku: item.sku,
      itemName: item.name,
      movementType: diff < 0 ? 'damage_scrap' : 'physical_adjustment',
      fromLocation: storeName,
      toLocation: diff < 0 ? 'Store Count Discrepancy / Spoilage' : 'Physical Store Count Audit',
      quantity: diff,
      unit: item.unit,
      balanceAfter: item.storeAllocations[storeId],
      unitCost: item.costPrice,
      totalCostImpact: diff * item.costPrice,
      performedBy,
      userRole: 'Store Manager',
      notes: `${reason} • Store: ${storeName} • Prev: ${previousStoreStock} ➔ New: ${newQuantity} ${item.unit}`,
    });

    storage.saveInventory(inventory);

    storage.addNotification({
      title: `Store Stock Adjusted: ${item.name}`,
      message: `${storeName} count updated from ${previousStoreStock} to ${newQuantity} ${item.unit} (${reason}).`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });

    return true;
  },

  // =========================================================================
  // AUDIT TRAIL
  // =========================================================================
  getAuditTrail(): StockMovementAudit[] {
    return getWhCached(WH_KEYS.AUDIT_TRAIL, () => {
      try {
        const data = safeStorage.getItem(WH_KEYS.AUDIT_TRAIL);
        if (!data) {
          this.saveAuditTrail(INITIAL_AUDIT_TRAIL);
          return INITIAL_AUDIT_TRAIL;
        }
        return JSON.parse(data);
      } catch {
        return INITIAL_AUDIT_TRAIL;
      }
    });
  },

  saveAuditTrail(list: StockMovementAudit[]): void {
    try {
      setWhCached(WH_KEYS.AUDIT_TRAIL, list);
      safeStorage.setItem(WH_KEYS.AUDIT_TRAIL, JSON.stringify(list));
      this.notifySubscribers();
      cloudSync.debouncedSyncCollection('stock_audit_trail', list);
    } catch (e) {
      console.error(e);
    }
  },

  addAuditRecords(audits: Array<Omit<StockMovementAudit, 'id' | 'timestamp'>>): void {
    if (!audits || audits.length === 0) return;
    const list = this.getAuditTrail();
    const now = Date.now();
    const newRecords: StockMovementAudit[] = audits.map((audit, idx) => {
      const nowStr = now.toString();
      const randomSuffix = Math.floor(10 + Math.random() * 90);
      const txnId = audit.transactionId || `TXN-${nowStr.slice(-5)}${idx}${randomSuffix}`;
      const qtyChanged = audit.quantityChanged !== undefined ? audit.quantityChanged : audit.quantity;
      const prev = audit.previousStock !== undefined ? audit.previousStock : Math.max(0, (audit.balanceAfter || 0) - qtyChanged);
      const next = audit.newStock !== undefined ? audit.newStock : (audit.balanceAfter !== undefined ? audit.balanceAfter : (prev + qtyChanged));

      return {
        ...audit,
        transactionId: txnId,
        quantityChanged: qtyChanged,
        previousStock: prev,
        newStock: next,
        status: audit.status || 'Completed',
        id: `aud-${now}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
      };
    });
    // Cap to latest 1000 records to prevent bloated storage
    this.saveAuditTrail([...newRecords, ...list].slice(0, 1000));
  },

  addAuditRecord(audit: Omit<StockMovementAudit, 'id' | 'timestamp'>): void {
    this.addAuditRecords([audit]);
  },

  // =========================================================================
  // OVERVIEW STATS & INVENTORY VALUATION (FIFO / AVERAGE COST)
  // =========================================================================
  getOverviewStats(): WarehouseOverviewStats {
    const warehouses = this.getWarehouses();
    const stores = storage.getStores();
    const suppliers = this.getSuppliers();
    const inventory = storage.getInventory();
    const batches = this.getBatches();
    const transfers = this.getStockTransfers();
    const indents = this.getStoreIndents();
    const bills = this.getPurchaseBills();

    // Central Warehouse Stock vs Stores vs Transit
    let centralWarehouseStockUnits = 0;
    let storesTotalStockUnits = 0;
    let inTransitStockUnits = 0;

    inventory.forEach((item) => {
      const storeAllocTotal = Object.values(item.storeAllocations || {}).reduce((a, b) => a + b, 0);
      storesTotalStockUnits += storeAllocTotal;
      centralWarehouseStockUnits += (item.stockQuantity || 0);
    });

    transfers.forEach((tr) => {
      if (tr.status === 'dispatched_in_transit') {
        const qty = tr.items.reduce((sum, i) => sum + (i.dispatchedQty || i.requestedQty), 0);
        inTransitStockUnits += qty;
      }
    });

    // Valuation: Total across Central Warehouse + Stores
    const totalInventoryValuationAvg = inventory.reduce(
      (sum, item) => {
        const storeTotal = Object.values(item.storeAllocations || {}).reduce((a, b) => a + b, 0);
        const totalUnits = (item.stockQuantity || 0) + storeTotal;
        return sum + totalUnits * item.costPrice;
      },
      0
    );

    // FIFO Valuation: using batch unit costs
    const totalInventoryValuationFIFO = batches.reduce(
      (sum, bat) => sum + (bat.quantityInStock > 0 ? bat.quantityInStock * bat.unitCost : 0),
      0
    ) || totalInventoryValuationAvg;

    const lowStockItemsCount = inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold && i.stockQuantity > 0).length;
    const criticalStockItemsCount = inventory.filter((i) => i.stockQuantity > 0 && i.stockQuantity <= Math.ceil(i.lowStockThreshold * 0.4)).length;
    const outOfStockItemsCount = inventory.filter((i) => i.stockQuantity <= 0).length;

    const nearExpiryBatchesCount = batches.filter((b) => b.status === 'near_expiry' && b.quantityInStock > 0).length;
    const expiredStockUnits = batches
      .filter((b) => b.status === 'expired')
      .reduce((sum, b) => sum + b.quantityInStock, 0);

    const pendingTransfersCount = transfers.filter((t) => t.status === 'requested' || t.status === 'dispatched_in_transit').length;
    const pendingIndentsCount = indents.filter((i) => i.status === 'pending').length;

    const totalSupplierOutstanding = suppliers.reduce((sum, s) => sum + (s.currentOutstanding || 0), 0);
    const overdueBillsCount = bills.filter((b) => b.paymentStatus === 'due' || b.paymentStatus === 'overdue').length;

    return {
      totalWarehousesCount: warehouses.length,
      totalStoresCount: stores.length,
      totalSuppliersCount: suppliers.length,
      centralWarehouseStockUnits,
      storesTotalStockUnits,
      inTransitStockUnits,
      totalInventoryValuationFIFO,
      totalInventoryValuationAvg,
      lowStockItemsCount,
      criticalStockItemsCount,
      outOfStockItemsCount,
      expiredStockUnits,
      nearExpiryBatchesCount,
      pendingTransfersCount,
      pendingIndentsCount,
      totalSupplierOutstanding,
      overdueBillsCount,
    };
  },
};

// Register warehouse storage reference with storage service for bi-directional audit logging
setWarehouseStorageRef(warehouseStorage);
