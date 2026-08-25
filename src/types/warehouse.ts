export type WarehouseSubRole =
  | 'admin'
  | 'warehouse_manager'
  | 'store_manager'
  | 'purchase_manager'
  | 'accountant';

export type WarehouseTab =
  | 'dashboard'
  | 'inventory'
  | 'transfers'
  | 'purchases'
  | 'locations'
  | 'adjustments'
  | 'audit_trail'
  | 'reports';

export type WarehouseLocationType = 'central_hub' | 'regional_depot' | 'cold_storage' | 'transit_hub';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  type: WarehouseLocationType;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson: string;
  phone: string;
  email: string;
  totalCapacitySqFt: number;
  utilizationPercent: number;
  temperatureControlled: boolean;
  temperatureRange?: string;
  isActive: boolean;
  managerName: string;
  operatingHours: string;
  storageZones: string[]; // e.g. ['Aisle A - Betel Leaves Cold Storage', 'Aisle B - Premium Supari & Dry Fruits', 'Aisle C - Vark & Fragrances', 'Aisle D - Syrups & Beverages']
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  panNumber: string;
  address: string;
  city: string;
  state: string;
  paymentTerms: string; // e.g. 'Net 15 Days', 'Net 30 Days', 'Immediate'
  creditLimit: number;
  currentOutstanding: number;
  totalPurchases: number;
  totalPaid: number;
  rating: number; // 1-5
  isActive: boolean;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
}

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  type: 'purchase_bill' | 'payment_made' | 'debit_note_return' | 'opening_balance';
  referenceNo: string;
  debit: number; // money paid or debit note
  credit: number; // bill amount credited to supplier
  runningBalance: number;
  paymentMode?: 'bank_neft' | 'upi_qr' | 'cheque' | 'cash';
  notes?: string;
}

export interface POItem {
  itemId: string;
  sku: string;
  name: string;
  category: string;
  quantityOrdered: number;
  quantityReceived: number;
  unit: string;
  unitPrice: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
}

export type PurchaseOrderItem = POItem;

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierGstin: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  orderDate: string;
  expectedDeliveryDate: string;
  status: 'draft' | 'approved' | 'sent_to_supplier' | 'partially_received' | 'received' | 'cancelled';
  items: POItem[];
  subtotal: number;
  taxTotal: number;
  freightCharge: number;
  grandTotal: number;
  createdByName: string;
  approvedByName?: string;
  paymentTerms: string;
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  notes?: string;
}

export interface PurchaseBillItem {
  itemId: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  unitCost: number;
  taxRate: number;
  taxAmount: number;
  totalCost: number;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
}

export interface PurchaseBill {
  id: string;
  billNumber: string; // Internal PB Number
  poReferenceId?: string;
  poNumber?: string;
  supplierId: string;
  supplierName: string;
  supplierInvoiceNo: string; // Supplier's original invoice
  warehouseId: string;
  warehouseName: string;
  billDate: string;
  receivedDate: string;
  items: PurchaseBillItem[];
  subtotal: number;
  gstAmount: number;
  freightCharges: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  paymentStatus: 'paid' | 'partial' | 'due' | 'overdue';
  grnStatus: 'verified_stocked' | 'qc_pending' | 'rejected';
  receivedBy: string;
  notes?: string;
}

export interface BatchRecord {
  id: string;
  itemId: string;
  sku: string;
  name: string;
  category: string;
  batchNumber: string;
  warehouseId: string;
  warehouseName: string;
  mfgDate: string;
  expiryDate: string;
  initialQuantity: number;
  quantityInStock: number;
  unit: string;
  unitCost: number;
  purchaseBillRef: string;
  supplierName: string;
  daysToExpiry: number;
  status: 'active' | 'near_expiry' | 'expired' | 'depleted';
}

export interface TransferItem {
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  batchNumber?: string;
  requestedQty: number;
  dispatchedQty: number;
  receivedQty: number;
  damagedQty?: number;
  unitCost: number;
}

export type StockTransferItem = TransferItem;

export interface StockTransfer {
  id: string;
  transferNumber: string;
  type: 'warehouse_to_store' | 'store_to_warehouse_return' | 'warehouse_to_warehouse';
  sourceType: 'warehouse' | 'store';
  sourceId: string;
  sourceName: string;
  destinationType: 'warehouse' | 'store';
  destinationId: string;
  destinationName: string;
  requestedDate: string;
  dispatchDate?: string;
  receivedDate?: string;
  status: 'requested' | 'approved' | 'dispatched_in_transit' | 'partially_received' | 'completed' | 'rejected' | 'cancelled';
  items: TransferItem[];
  carrierName?: string;
  vehicleNumber?: string;
  driverContact?: string;
  trackingRef?: string;
  otpOrPin?: string;
  dispatchedBy?: string;
  receivedBy?: string;
  reasonForReturn?: string;
  notes?: string;
  totalValuation: number;
}

export interface StoreStockIndentItem {
  itemId: string;
  sku: string;
  name: string;
  currentStoreStock: number;
  minThreshold?: number;
  requestedQty: number;
  approvedQty?: number;
  unit: string;
}

export interface StoreStockIndent {
  id: string;
  indentNumber: string;
  storeId: string;
  storeName: string;
  targetWarehouseId: string;
  targetWarehouseName: string;
  urgency: 'routine' | 'urgent_low_stock' | 'emergency_event';
  requestDate: string;
  status: 'pending' | 'approved' | 'converted_to_transfer' | 'declined';
  items: StoreStockIndentItem[];
  requestedBy: string;
  notes?: string;
}

export interface StockAdjustment {
  id: string;
  adjustmentNumber: string;
  locationType: 'warehouse' | 'store';
  locationId: string;
  locationName: string;
  date: string;
  reason: 'damaged_spoilage' | 'expired_batch' | 'physical_count_discrepancy' | 'sampling_tasting' | 'theft_loss' | 'other';
  items: {
    itemId: string;
    sku: string;
    name: string;
    batchNumber?: string;
    previousStock: number;
    adjustedQty: number; // positive = found excess, negative = written off
    unit: string;
    unitCost: number;
    totalValueImpact: number;
    itemNotes?: string;
  }[];
  totalLossValue: number;
  authorizedBy: string;
  status: 'approved_applied' | 'pending_review';
  notes?: string;
}

export interface StockMovementAudit {
  id: string;
  timestamp: string;
  referenceNumber: string;
  itemId: string;
  sku: string;
  itemName: string;
  batchNumber?: string;
  movementType:
    | 'purchase_inward'
    | 'warehouse_transfer_out'
    | 'store_transfer_in'
    | 'store_return_in'
    | 'pos_sales_consumption'
    | 'damage_scrap'
    | 'physical_adjustment';
  fromLocation: string;
  toLocation: string;
  quantity: number;
  unit: string;
  balanceAfter: number;
  unitCost: number;
  totalCostImpact: number;
  performedBy: string;
  userRole: string;
  notes: string;
}

export interface WarehouseOverviewStats {
  totalWarehousesCount: number;
  totalStoresCount: number;
  totalSuppliersCount: number;
  centralWarehouseStockUnits: number;
  storesTotalStockUnits: number;
  inTransitStockUnits: number;
  totalInventoryValuationFIFO: number;
  totalInventoryValuationAvg: number;
  lowStockItemsCount: number;
  criticalStockItemsCount: number;
  outOfStockItemsCount: number;
  expiredStockUnits: number;
  nearExpiryBatchesCount: number;
  pendingTransfersCount: number;
  pendingIndentsCount: number;
  totalSupplierOutstanding: number;
  overdueBillsCount: number;
}
