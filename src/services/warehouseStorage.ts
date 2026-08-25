import {
  Warehouse,
  Supplier,
  SupplierLedgerEntry,
  PurchaseOrder,
  PurchaseBill,
  BatchRecord,
  StockTransfer,
  StoreStockIndent,
  StockAdjustment,
  StockMovementAudit,
  WarehouseOverviewStats,
  WarehouseSubRole,
} from '../types/warehouse';
import { storage } from './storage';

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
    name: 'Richie Rich Central Master Warehouse (Ahmedabad Hub)',
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

// Initial Seed Suppliers
export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-01',
    code: 'SUP-BAN-01',
    name: 'Banaras Royal Betel Farms & Mills',
    category: 'Paan',
    contactPerson: 'Pandit Radheshyam Mishra',
    phone: '+91 94152 77810',
    email: 'orders@banarasbetelfarms.com',
    gstin: '09AAACB1234D1Z5',
    panNumber: 'AAACB1234D',
    address: 'Kashi Vishwanath Marg, Chowk',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    paymentTerms: 'Net 15 Days',
    creditLimit: 500000,
    currentOutstanding: 145000,
    totalPurchases: 1850000,
    totalPaid: 1705000,
    rating: 4.9,
    isActive: true,
    bankDetails: {
      accountName: 'Banaras Royal Betel Farms',
      accountNumber: '50200038910234',
      ifscCode: 'HDFC0001042',
      bankName: 'HDFC Bank, Varanasi Chowk',
    },
  },
  {
    id: 'sup-02',
    code: 'SUP-SUP-02',
    name: 'Shree Krishna Supari & Areca Nut Traders',
    category: 'Paan',
    contactPerson: 'Suresh Sheth',
    phone: '+91 98450 66201',
    email: 'sales@krishnasupari.in',
    gstin: '29AAGCK4512L1Z8',
    panNumber: 'AAGCK4512L',
    address: 'Market Yard, APMC Complex',
    city: 'Shimoga',
    state: 'Karnataka',
    paymentTerms: 'Net 30 Days',
    creditLimit: 800000,
    currentOutstanding: 220000,
    totalPurchases: 2450000,
    totalPaid: 2230000,
    rating: 4.8,
    isActive: true,
    bankDetails: {
      accountName: 'Shree Krishna Supari Traders',
      accountNumber: '0812101004523',
      ifscCode: 'CNRB0000812',
      bankName: 'Canara Bank, Shimoga Main',
    },
  },
  {
    id: 'sup-03',
    code: 'SUP-VRK-03',
    name: 'Kohinoor Silver & Gold Leaf (Vark) Crafts',
    category: 'Essentials',
    contactPerson: 'Mohammad Tariq',
    phone: '+91 98290 12849',
    email: 'contact@kohinoorvark.com',
    gstin: '08AAFCK9982E1Z2',
    panNumber: 'AAFCK9982E',
    address: 'Johari Bazar, Pink City',
    city: 'Jaipur',
    state: 'Rajasthan',
    paymentTerms: 'Immediate / Advance',
    creditLimit: 300000,
    currentOutstanding: 0,
    totalPurchases: 980000,
    totalPaid: 980000,
    rating: 5.0,
    isActive: true,
    bankDetails: {
      accountName: 'Kohinoor Vark Crafts',
      accountNumber: '918020045182901',
      ifscCode: 'UTIB0000142',
      bankName: 'Axis Bank, Johari Bazar Jaipur',
    },
  },
  {
    id: 'sup-04',
    code: 'SUP-MUK-04',
    name: 'Navkar Royal Mukhwas & Dry Fruits Hub',
    category: 'Essentials',
    contactPerson: 'Jitendra Shah',
    phone: '+91 98250 99401',
    email: 'info@navkarmukhwas.com',
    gstin: '24AADFN8831K1ZU',
    panNumber: 'AADFN8831K',
    address: 'Grain Market, Maskati Cloth Market Area',
    city: 'Ahmedabad',
    state: 'Gujarat',
    paymentTerms: 'Net 20 Days',
    creditLimit: 400000,
    currentOutstanding: 68500,
    totalPurchases: 1250000,
    totalPaid: 1181500,
    rating: 4.7,
    isActive: true,
    bankDetails: {
      accountName: 'Navkar Royal Food Products',
      accountNumber: '33410100019283',
      ifscCode: 'BARB0GRAINM',
      bankName: 'Bank of Baroda, Grain Market',
    },
  },
  {
    id: 'sup-05',
    code: 'SUP-BEV-05',
    name: 'Monin & Gourmet Beverage Imports India',
    category: 'Cafe',
    contactPerson: 'Rajiv Mehra',
    phone: '+91 99201 88402',
    email: 'delhi@gourmetbeverages.in',
    gstin: '07AACCG9912M1Z0',
    panNumber: 'AACCG9912M',
    address: 'Okhla Industrial Area Phase III',
    city: 'New Delhi',
    state: 'Delhi',
    paymentTerms: 'Net 30 Days',
    creditLimit: 600000,
    currentOutstanding: 95000,
    totalPurchases: 1420000,
    totalPaid: 1325000,
    rating: 4.8,
    isActive: true,
  },
];

// Initial Seed Supplier Ledgers
export const INITIAL_LEDGER_ENTRIES: SupplierLedgerEntry[] = [
  {
    id: 'led-01',
    supplierId: 'sup-01',
    supplierName: 'Banaras Royal Betel Farms & Mills',
    date: '2026-08-05',
    type: 'purchase_bill',
    referenceNo: 'PB-2026-068',
    debit: 0,
    credit: 120000,
    runningBalance: 120000,
    notes: 'Inward Banarasi & Maghai Betel leaves consignment (400 Bundles)',
  },
  {
    id: 'led-02',
    supplierId: 'sup-01',
    supplierName: 'Banaras Royal Betel Farms & Mills',
    date: '2026-08-12',
    type: 'payment_made',
    referenceNo: 'PAY-2026-033',
    debit: 100000,
    credit: 0,
    runningBalance: 20000,
    paymentMode: 'bank_neft',
    notes: 'NEFT Payment Ref: HDFC99281039 against PB-2026-068',
  },
  {
    id: 'led-03',
    supplierId: 'sup-01',
    supplierName: 'Banaras Royal Betel Farms & Mills',
    date: '2026-08-20',
    type: 'purchase_bill',
    referenceNo: 'PB-2026-082',
    debit: 0,
    credit: 125000,
    runningBalance: 145000,
    notes: 'Inward Premium Meetha leaves & Gulkand drums',
  },
  {
    id: 'led-04',
    supplierId: 'sup-02',
    supplierName: 'Shree Krishna Supari & Areca Nut Traders',
    date: '2026-08-10',
    type: 'purchase_bill',
    referenceNo: 'PB-2026-074',
    debit: 0,
    credit: 220000,
    runningBalance: 220000,
    notes: 'Roasted Tukda Supari 200kg + Diamond Scented Supari 150kg',
  },
  {
    id: 'led-05',
    supplierId: 'sup-04',
    supplierName: 'Navkar Royal Mukhwas & Dry Fruits Hub',
    date: '2026-08-18',
    type: 'purchase_bill',
    referenceNo: 'PB-2026-079',
    debit: 0,
    credit: 68500,
    runningBalance: 68500,
    notes: 'Kashmiri Mukhwas 100 Jars + Royal Kashmiri Saffron Mix',
  },
];

// Initial Seed Purchase Orders
export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-01',
    poNumber: 'PO-2026-088',
    supplierId: 'sup-01',
    supplierName: 'Banaras Royal Betel Farms & Mills',
    supplierGstin: '09AAACB1234D1Z5',
    destinationWarehouseId: 'wh-central-amd',
    destinationWarehouseName: 'Ahmedabad Central Master Warehouse (Gota Hub)',
    orderDate: '2026-08-21',
    expectedDeliveryDate: '2026-08-27',
    status: 'approved',
    items: [
      {
        itemId: 'item-01',
        sku: 'PAAN-MAG-01',
        name: 'Maghai Meetha Paan Leaves (Fresh Crates)',
        category: 'Betel Leaves & Essentials',
        quantityOrdered: 300,
        quantityReceived: 0,
        unit: 'bundles',
        unitPrice: 220,
        taxPercent: 5,
        taxAmount: 3300,
        totalAmount: 69300,
      },
      {
        itemId: 'item-02',
        sku: 'PAAN-BAN-02',
        name: 'Banarasi Sada Paan Leaves',
        category: 'Betel Leaves & Essentials',
        quantityOrdered: 200,
        quantityReceived: 0,
        unit: 'bundles',
        unitPrice: 180,
        taxPercent: 5,
        taxAmount: 1800,
        totalAmount: 37800,
      },
    ],
    subtotal: 102000,
    taxTotal: 5100,
    freightCharge: 2500,
    grandTotal: 109600,
    createdByName: 'Karan Patel (Purchase Mgr)',
    approvedByName: 'Vikramsinh Vaghela (Admin)',
    paymentTerms: 'Net 15 Days',
    paymentStatus: 'unpaid',
    notes: 'Urgent weekend restocking for Gota & Sindhu Bhavan branches.',
  },
  {
    id: 'po-02',
    poNumber: 'PO-2026-087',
    supplierId: 'sup-03',
    supplierName: 'Kohinoor Silver & Gold Leaf (Vark) Crafts',
    supplierGstin: '08AAFCK9982E1Z2',
    destinationWarehouseId: 'wh-central-amd',
    destinationWarehouseName: 'Ahmedabad Central Master Warehouse (Gota Hub)',
    orderDate: '2026-08-15',
    expectedDeliveryDate: '2026-08-20',
    status: 'received',
    items: [
      {
        itemId: 'item-03',
        sku: 'VRK-SLV-01',
        name: 'Pure Silver Vark (Chandi Leaf - Food Grade 100s)',
        category: 'Luxury Vark & Fragrance',
        quantityOrdered: 50,
        quantityReceived: 50,
        unit: 'boxes',
        unitPrice: 1200,
        taxPercent: 5,
        taxAmount: 3000,
        totalAmount: 63000,
      },
      {
        itemId: 'item-04',
        sku: 'VRK-GLD-02',
        name: '24K Edible Gold Leaf Booklets',
        category: 'Luxury Vark & Fragrance',
        quantityOrdered: 20,
        quantityReceived: 20,
        unit: 'booklets',
        unitPrice: 3200,
        taxPercent: 5,
        taxAmount: 3200,
        totalAmount: 67200,
      },
    ],
    subtotal: 124000,
    taxTotal: 6200,
    freightCharge: 800,
    grandTotal: 131000,
    createdByName: 'Karan Patel (Purchase Mgr)',
    approvedByName: 'Vikramsinh Vaghela (Admin)',
    paymentTerms: 'Immediate',
    paymentStatus: 'paid',
    notes: 'High security shipment verified by warehouse manager.',
  },
];

// Initial Seed Purchase Bills (GRN Inward)
export const INITIAL_PURCHASE_BILLS: PurchaseBill[] = [
  {
    id: 'pb-01',
    billNumber: 'PB-2026-082',
    poReferenceId: 'po-02',
    poNumber: 'PO-2026-087',
    supplierId: 'sup-03',
    supplierName: 'Kohinoor Silver & Gold Leaf (Vark) Crafts',
    supplierInvoiceNo: 'INV-KOH-9921',
    warehouseId: 'wh-central-amd',
    warehouseName: 'Ahmedabad Central Master Warehouse (Gota Hub)',
    billDate: '2026-08-19',
    receivedDate: '2026-08-20',
    items: [
      {
        itemId: 'item-03',
        sku: 'VRK-SLV-01',
        name: 'Pure Silver Vark (Chandi Leaf 100s)',
        category: 'Luxury Vark & Fragrance',
        quantity: 50,
        unit: 'boxes',
        unitCost: 1200,
        taxRate: 5,
        taxAmount: 3000,
        totalCost: 63000,
        batchNumber: 'BATCH-VRK-2608',
        mfgDate: '2026-08-01',
        expiryDate: '2028-08-01',
      },
      {
        itemId: 'item-04',
        sku: 'VRK-GLD-02',
        name: '24K Edible Gold Leaf Booklets',
        category: 'Luxury Vark & Fragrance',
        quantity: 20,
        unit: 'booklets',
        unitCost: 3200,
        taxRate: 5,
        taxAmount: 3200,
        totalCost: 67200,
        batchNumber: 'BATCH-GLD-2608',
        mfgDate: '2026-08-01',
        expiryDate: '2029-08-01',
      },
    ],
    subtotal: 124000,
    gstAmount: 6200,
    freightCharges: 800,
    roundOff: 0,
    grandTotal: 131000,
    paidAmount: 131000,
    dueAmount: 0,
    dueDate: '2026-08-20',
    paymentStatus: 'paid',
    grnStatus: 'verified_stocked',
    receivedBy: 'Vikramsinh Vaghela',
    notes: 'Verified 100% genuine hallmark batch certificate attached.',
  },
  {
    id: 'pb-02',
    billNumber: 'PB-2026-080',
    supplierId: 'sup-01',
    supplierName: 'Banaras Royal Betel Farms & Mills',
    supplierInvoiceNo: 'INV-BNR-4412',
    warehouseId: 'wh-cold-sanand',
    warehouseName: 'Sanand Cold Vault & Fresh Produce Depot',
    billDate: '2026-08-18',
    receivedDate: '2026-08-19',
    items: [
      {
        itemId: 'item-05',
        sku: 'GLK-SHI-01',
        name: 'Organic Damask Rose Gulkand (Clay Jar 1kg)',
        category: 'Gulkand & Chutneys',
        quantity: 120,
        unit: 'jars',
        unitCost: 280,
        taxRate: 5,
        taxAmount: 1680,
        totalCost: 35280,
        batchNumber: 'BATCH-GLK-2607',
        mfgDate: '2026-07-15',
        expiryDate: '2027-01-15',
      },
    ],
    subtotal: 33600,
    gstAmount: 1680,
    freightCharges: 1200,
    roundOff: 0,
    grandTotal: 36480,
    paidAmount: 0,
    dueAmount: 36480,
    dueDate: '2026-09-02',
    paymentStatus: 'due',
    grnStatus: 'verified_stocked',
    receivedBy: 'Chetan Prajapati',
    notes: 'Stored directly into Sanand cold storage Vault 3.',
  },
];

// Initial Seed Batches
export const INITIAL_BATCHES: BatchRecord[] = [
  {
    id: 'bat-01',
    itemId: 'item-01',
    sku: 'PAAN-MAG-01',
    name: 'Maghai Meetha Paan Leaves (Fresh Crates)',
    category: 'Betel Leaves & Essentials',
    batchNumber: 'BATCH-MAG-2608A',
    warehouseId: 'wh-central-amd',
    warehouseName: 'Ahmedabad Central Master Warehouse (Gota Hub)',
    mfgDate: '2026-08-18',
    expiryDate: '2026-09-05',
    initialQuantity: 250,
    quantityInStock: 180,
    unit: 'bundles',
    unitCost: 220,
    purchaseBillRef: 'PB-2026-078',
    supplierName: 'Banaras Royal Betel Farms',
    daysToExpiry: 11,
    status: 'near_expiry',
  },
  {
    id: 'bat-02',
    itemId: 'item-03',
    sku: 'VRK-SLV-01',
    name: 'Pure Silver Vark (Chandi Leaf 100s)',
    category: 'Luxury Vark & Fragrance',
    batchNumber: 'BATCH-VRK-2608',
    warehouseId: 'wh-central-amd',
    warehouseName: 'Ahmedabad Central Master Warehouse (Gota Hub)',
    mfgDate: '2026-08-01',
    expiryDate: '2028-08-01',
    initialQuantity: 50,
    quantityInStock: 44,
    unit: 'boxes',
    unitCost: 1200,
    purchaseBillRef: 'PB-2026-082',
    supplierName: 'Kohinoor Silver & Gold Leaf Crafts',
    daysToExpiry: 706,
    status: 'active',
  },
  {
    id: 'bat-03',
    itemId: 'item-05',
    sku: 'GLK-SHI-01',
    name: 'Organic Damask Rose Gulkand (Clay Jar 1kg)',
    category: 'Gulkand & Chutneys',
    batchNumber: 'BATCH-GLK-2607',
    warehouseId: 'wh-cold-sanand',
    warehouseName: 'Sanand Cold Vault & Fresh Produce Depot',
    mfgDate: '2026-07-15',
    expiryDate: '2027-01-15',
    initialQuantity: 120,
    quantityInStock: 95,
    unit: 'jars',
    unitCost: 280,
    purchaseBillRef: 'PB-2026-080',
    supplierName: 'Banaras Royal Betel Farms',
    daysToExpiry: 143,
    status: 'active',
  },
  {
    id: 'bat-04',
    itemId: 'item-06',
    sku: 'MUK-KSH-01',
    name: 'Royal Kashmiri Saffron Mukhwas 250g',
    category: 'Luxury Mukhwas & Nuts',
    batchNumber: 'BATCH-MUK-2606',
    warehouseId: 'wh-central-amd',
    warehouseName: 'Ahmedabad Central Master Warehouse (Gota Hub)',
    mfgDate: '2026-06-10',
    expiryDate: '2026-12-10',
    initialQuantity: 150,
    quantityInStock: 62,
    unit: 'jars',
    unitCost: 340,
    purchaseBillRef: 'PB-2026-062',
    supplierName: 'Navkar Royal Mukhwas Hub',
    daysToExpiry: 107,
    status: 'active',
  },
  {
    id: 'bat-05',
    itemId: 'item-07',
    sku: 'SUP-DIA-01',
    name: 'Diamond Cut Scented Betel Nut 1kg',
    category: 'Areca Nuts & Spices',
    batchNumber: 'BATCH-SUP-2604',
    warehouseId: 'wh-surat-hub',
    warehouseName: 'Surat & South Gujarat Regional Distribution Depot',
    mfgDate: '2026-04-10',
    expiryDate: '2026-08-20',
    initialQuantity: 80,
    quantityInStock: 8,
    unit: 'kg',
    unitCost: 450,
    purchaseBillRef: 'PB-2026-044',
    supplierName: 'Shree Krishna Supari Traders',
    daysToExpiry: -5,
    status: 'expired',
  },
];

// Initial Seed Stock Transfers & Returns
export const INITIAL_TRANSFERS: StockTransfer[] = [
  {
    id: 'tr-01',
    transferNumber: 'TR-2026-042',
    type: 'warehouse_to_store',
    sourceType: 'warehouse',
    sourceId: 'wh-central-amd',
    sourceName: 'Ahmedabad Central Master Warehouse (Gota Hub)',
    destinationType: 'store',
    destinationId: 'gota',
    destinationName: 'Richie Rich Pan House - Gota Main Lounge',
    requestedDate: '2026-08-23',
    dispatchDate: '2026-08-24',
    status: 'dispatched_in_transit',
    items: [
      {
        itemId: 'item-01',
        sku: 'PAAN-MAG-01',
        name: 'Maghai Meetha Paan Leaves (Fresh Crates)',
        unit: 'bundles',
        batchNumber: 'BATCH-MAG-2608A',
        requestedQty: 50,
        dispatchedQty: 50,
        receivedQty: 0,
        unitCost: 220,
      },
      {
        itemId: 'item-03',
        sku: 'VRK-SLV-01',
        name: 'Pure Silver Vark (Chandi Leaf 100s)',
        unit: 'boxes',
        batchNumber: 'BATCH-VRK-2608',
        requestedQty: 10,
        dispatchedQty: 10,
        receivedQty: 0,
        unitCost: 1200,
      },
    ],
    carrierName: 'Richie Rich Express Van 1',
    vehicleNumber: 'GJ-01-RR-2024',
    driverContact: '+91 98255 11099 (Ramesh Van Driver)',
    trackingRef: 'TRACK-AMD-GOTA-042',
    otpOrPin: '8492',
    dispatchedBy: 'Vikramsinh Vaghela',
    totalValuation: 23000,
    notes: 'Driver in transit. Store manager must verify OTP 8492 upon delivery.',
  },
  {
    id: 'tr-02',
    transferNumber: 'TR-2026-039',
    type: 'warehouse_to_store',
    sourceType: 'warehouse',
    sourceId: 'wh-central-amd',
    sourceName: 'Ahmedabad Central Master Warehouse (Gota Hub)',
    destinationType: 'store',
    destinationId: 'sindhubhavan',
    destinationName: 'Richie Rich Luxury Pan Lounge - Sindhu Bhavan',
    requestedDate: '2026-08-21',
    dispatchDate: '2026-08-22',
    receivedDate: '2026-08-22',
    status: 'completed',
    items: [
      {
        itemId: 'item-06',
        sku: 'MUK-KSH-01',
        name: 'Royal Kashmiri Saffron Mukhwas 250g',
        unit: 'jars',
        batchNumber: 'BATCH-MUK-2606',
        requestedQty: 30,
        dispatchedQty: 30,
        receivedQty: 30,
        unitCost: 340,
      },
    ],
    carrierName: 'Internal Delivery Bike',
    vehicleNumber: 'GJ-01-DX-4410',
    dispatchedBy: 'Vikramsinh Vaghela',
    receivedBy: 'Rajdeep Varma (Store Mgr)',
    totalValuation: 10200,
    notes: 'Received in pristine condition with batch seal intact.',
  },
  {
    id: 'tr-03',
    transferNumber: 'TR-2026-038',
    type: 'store_to_warehouse_return',
    sourceType: 'store',
    sourceId: 'bopal',
    sourceName: 'Richie Rich Pan House - Bopal Branch',
    destinationType: 'warehouse',
    destinationId: 'wh-central-amd',
    destinationName: 'Ahmedabad Central Master Warehouse (Gota Hub)',
    requestedDate: '2026-08-20',
    dispatchDate: '2026-08-21',
    receivedDate: '2026-08-21',
    status: 'completed',
    items: [
      {
        itemId: 'item-07',
        sku: 'SUP-DIA-01',
        name: 'Diamond Cut Scented Betel Nut 1kg',
        unit: 'kg',
        batchNumber: 'BATCH-SUP-2604',
        requestedQty: 4,
        dispatchedQty: 4,
        receivedQty: 4,
        unitCost: 450,
      },
    ],
    dispatchedBy: 'Karan Patel (Bopal Store)',
    receivedBy: 'Vikramsinh Vaghela (WH)',
    reasonForReturn: 'Near expiry batch return for replacement credit.',
    totalValuation: 1800,
    notes: 'Return credited to Bopal branch allocation.',
  },
];

// Initial Seed Store Indents (Stock Requests)
export const INITIAL_INDENTS: StoreStockIndent[] = [
  {
    id: 'ind-01',
    indentNumber: 'IND-2026-024',
    storeId: 'sg_highway',
    storeName: 'Richie Rich Pan House - SG Highway Drive-Thru',
    targetWarehouseId: 'wh-central-amd',
    targetWarehouseName: 'Ahmedabad Central Master Warehouse (Gota Hub)',
    urgency: 'urgent_low_stock',
    requestDate: '2026-08-24',
    status: 'pending',
    items: [
      {
        itemId: 'item-01',
        sku: 'PAAN-MAG-01',
        name: 'Maghai Meetha Paan Leaves (Fresh Crates)',
        currentStoreStock: 4,
        minThreshold: 15,
        requestedQty: 35,
        unit: 'bundles',
      },
      {
        itemId: 'item-05',
        sku: 'GLK-SHI-01',
        name: 'Organic Damask Rose Gulkand (Clay Jar 1kg)',
        currentStoreStock: 2,
        minThreshold: 8,
        requestedQty: 10,
        unit: 'jars',
      },
    ],
    requestedBy: 'Dhaval Prajapati (SG Highway)',
    notes: 'Heavy weekend footfall projected for drive-thru.',
  },
  {
    id: 'ind-02',
    indentNumber: 'IND-2026-023',
    storeId: 'bopal',
    storeName: 'Richie Rich Pan House - Bopal Branch',
    targetWarehouseId: 'wh-central-amd',
    targetWarehouseName: 'Ahmedabad Central Master Warehouse (Gota Hub)',
    urgency: 'routine',
    requestDate: '2026-08-23',
    status: 'approved',
    items: [
      {
        itemId: 'item-04',
        sku: 'VRK-GLD-02',
        name: '24K Edible Gold Leaf Booklets',
        currentStoreStock: 2,
        minThreshold: 5,
        requestedQty: 5,
        approvedQty: 5,
        unit: 'booklets',
      },
    ],
    requestedBy: 'Karan Patel',
    notes: 'Approved by warehouse manager. Scheduled for TR-2026-043 dispatch.',
  },
];

// Initial Seed Adjustments & Scrap
export const INITIAL_ADJUSTMENTS: StockAdjustment[] = [
  {
    id: 'adj-01',
    adjustmentNumber: 'ADJ-2026-014',
    locationType: 'warehouse',
    locationId: 'wh-central-amd',
    locationName: 'Ahmedabad Central Master Warehouse (Gota Hub)',
    date: '2026-08-22',
    reason: 'damaged_spoilage',
    items: [
      {
        itemId: 'item-01',
        sku: 'PAAN-MAG-01',
        name: 'Maghai Meetha Paan Leaves (Fresh Crates)',
        batchNumber: 'BATCH-MAG-2608A',
        previousStock: 190,
        adjustedQty: -10,
        unit: 'bundles',
        unitCost: 220,
        totalValueImpact: -2200,
        itemNotes: '10 bundles water-damaged during severe transit monsoon rain.',
      },
    ],
    totalLossValue: 2200,
    authorizedBy: 'Vikramsinh Vaghela (WH Manager)',
    status: 'approved_applied',
    notes: 'Insurance claim filed under Cargo Transit policy.',
  },
  {
    id: 'adj-02',
    adjustmentNumber: 'ADJ-2026-013',
    locationType: 'warehouse',
    locationId: 'wh-surat-hub',
    locationName: 'Surat Regional Distribution Depot',
    date: '2026-08-20',
    reason: 'expired_batch',
    items: [
      {
        itemId: 'item-07',
        sku: 'SUP-DIA-01',
        name: 'Diamond Cut Scented Betel Nut 1kg',
        batchNumber: 'BATCH-SUP-2604',
        previousStock: 12,
        adjustedQty: -4,
        unit: 'kg',
        unitCost: 450,
        totalValueImpact: -1800,
        itemNotes: 'Scrapped 4kg expired batch safely.',
      },
    ],
    totalLossValue: 1800,
    authorizedBy: 'Kishore Jariwala (Surat WH)',
    status: 'approved_applied',
    notes: 'Written off to Scrap & Spoilage P&L account.',
  },
];

// Initial Seed Stock Movement Audit Trail
export const INITIAL_AUDIT_TRAIL: StockMovementAudit[] = [
  {
    id: 'aud-01',
    timestamp: '2026-08-24T08:30:00Z',
    referenceNumber: 'TR-2026-042',
    itemId: 'item-01',
    sku: 'PAAN-MAG-01',
    itemName: 'Maghai Meetha Paan Leaves',
    batchNumber: 'BATCH-MAG-2608A',
    movementType: 'warehouse_transfer_out',
    fromLocation: 'Ahmedabad Central Master Warehouse (Gota Hub)',
    toLocation: 'In Transit ➔ Gota Main Lounge',
    quantity: -50,
    unit: 'bundles',
    balanceAfter: 180,
    unitCost: 220,
    totalCostImpact: -11000,
    performedBy: 'Vikramsinh Vaghela',
    userRole: 'Warehouse Manager',
    notes: 'Dispatched via Van GJ-01-RR-2024 to Gota Lounge.',
  },
  {
    id: 'aud-02',
    timestamp: '2026-08-22T14:15:00Z',
    referenceNumber: 'ADJ-2026-014',
    itemId: 'item-01',
    sku: 'PAAN-MAG-01',
    itemName: 'Maghai Meetha Paan Leaves',
    batchNumber: 'BATCH-MAG-2608A',
    movementType: 'damage_scrap',
    fromLocation: 'Ahmedabad Central Master Warehouse (Gota Hub)',
    toLocation: 'Scrap & Spoilage Write-Off',
    quantity: -10,
    unit: 'bundles',
    balanceAfter: 230,
    unitCost: 220,
    totalCostImpact: -2200,
    performedBy: 'Vikramsinh Vaghela',
    userRole: 'Warehouse Manager',
    notes: 'Heavy rain moisture spoilage written off.',
  },
  {
    id: 'aud-03',
    timestamp: '2026-08-20T11:00:00Z',
    referenceNumber: 'PB-2026-082',
    itemId: 'item-03',
    sku: 'VRK-SLV-01',
    itemName: 'Pure Silver Vark (Chandi Leaf 100s)',
    batchNumber: 'BATCH-VRK-2608',
    movementType: 'purchase_inward',
    fromLocation: 'Supplier: Kohinoor Silver & Gold Leaf Crafts',
    toLocation: 'Ahmedabad Central Master Warehouse (Gota Hub)',
    quantity: 50,
    unit: 'boxes',
    balanceAfter: 50,
    unitCost: 1200,
    totalCostImpact: 60000,
    performedBy: 'Vikramsinh Vaghela',
    userRole: 'Warehouse Manager',
    notes: 'Inward verification against PO-2026-087 & Invoice INV-KOH-9921.',
  },
  {
    id: 'aud-04',
    timestamp: '2026-08-21T16:20:00Z',
    referenceNumber: 'TR-2026-039',
    itemId: 'item-06',
    sku: 'MUK-KSH-01',
    itemName: 'Royal Kashmiri Saffron Mukhwas 250g',
    batchNumber: 'BATCH-MUK-2606',
    movementType: 'store_transfer_in',
    fromLocation: 'In Transit',
    toLocation: 'Sindhu Bhavan Luxury Lounge',
    quantity: 30,
    unit: 'jars',
    balanceAfter: 30,
    unitCost: 340,
    totalCostImpact: 10200,
    performedBy: 'Rajdeep Varma',
    userRole: 'Store Manager',
    notes: 'Store receiving confirmed and stocked in display shelf.',
  },
];

const warehouseListeners: Set<() => void> = new Set();

export const warehouseStorage = {
  subscribe(callback: () => void): () => void {
    warehouseListeners.add(callback);
    return () => {
      warehouseListeners.delete(callback);
    };
  },

  notifySubscribers(): void {
    warehouseListeners.forEach((cb) => cb());
    storage.notifySubscribers();
  },

  // =========================================================================
  // SUB ROLE MANAGEMENT
  // =========================================================================
  getActiveSubRole(): WarehouseSubRole {
    try {
      const saved = localStorage.getItem(WH_KEYS.SUB_ROLE) as WarehouseSubRole | null;
      return saved || 'admin';
    } catch {
      return 'admin';
    }
  },

  setActiveSubRole(role: WarehouseSubRole): void {
    try {
      localStorage.setItem(WH_KEYS.SUB_ROLE, role);
      storage.notifySubscribers();
    } catch (e) {
      console.error(e);
    }
  },

  // =========================================================================
  // WAREHOUSES (Single Central Master Hub)
  // =========================================================================
  getWarehouses(): Warehouse[] {
    try {
      const data = localStorage.getItem(WH_KEYS.WAREHOUSES);
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
      if (parsed.length > 1) {
        const central = parsed.find((w) => w.type === 'central_hub' || w.id === 'wh-central-amd') || INITIAL_WAREHOUSES[0];
        this.saveWarehouses([central]);
        return [central];
      }
      return parsed;
    } catch {
      return INITIAL_WAREHOUSES;
    }
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
      localStorage.setItem(WH_KEYS.WAREHOUSES, JSON.stringify(list));
      storage.notifySubscribers();
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
    try {
      const data = localStorage.getItem(WH_KEYS.SUPPLIERS);
      if (!data) {
        this.saveSuppliers(INITIAL_SUPPLIERS);
        return INITIAL_SUPPLIERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_SUPPLIERS;
    }
  },

  saveSuppliers(list: Supplier[]): void {
    try {
      localStorage.setItem(WH_KEYS.SUPPLIERS, JSON.stringify(list));
      storage.notifySubscribers();
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
    return newSup;
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
    try {
      const data = localStorage.getItem(WH_KEYS.SUPPLIER_LEDGER);
      if (!data) {
        this.saveSupplierLedger(INITIAL_LEDGER_ENTRIES);
        return INITIAL_LEDGER_ENTRIES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_LEDGER_ENTRIES;
    }
  },

  saveSupplierLedger(list: SupplierLedgerEntry[]): void {
    try {
      localStorage.setItem(WH_KEYS.SUPPLIER_LEDGER, JSON.stringify(list));
      storage.notifySubscribers();
    } catch (e) {
      console.error(e);
    }
  },

  // =========================================================================
  // PURCHASE ORDERS (PO)
  // =========================================================================
  getPurchaseOrders(): PurchaseOrder[] {
    try {
      const data = localStorage.getItem(WH_KEYS.PURCHASE_ORDERS);
      if (!data) {
        this.savePurchaseOrders(INITIAL_PURCHASE_ORDERS);
        return INITIAL_PURCHASE_ORDERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_PURCHASE_ORDERS;
    }
  },

  savePurchaseOrders(list: PurchaseOrder[]): void {
    try {
      localStorage.setItem(WH_KEYS.PURCHASE_ORDERS, JSON.stringify(list));
      storage.notifySubscribers();
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

  // =========================================================================
  // PURCHASE BILLS & GRN (INWARD GOODS RECEIPT)
  // =========================================================================
  getPurchaseBills(): PurchaseBill[] {
    try {
      const data = localStorage.getItem(WH_KEYS.PURCHASE_BILLS);
      if (!data) {
        this.savePurchaseBills(INITIAL_PURCHASE_BILLS);
        return INITIAL_PURCHASE_BILLS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_PURCHASE_BILLS;
    }
  },

  savePurchaseBills(list: PurchaseBill[]): void {
    try {
      localStorage.setItem(WH_KEYS.PURCHASE_BILLS, JSON.stringify(list));
      storage.notifySubscribers();
    } catch (e) {
      console.error(e);
    }
  },

  createPurchaseBill(billData: Omit<PurchaseBill, 'id' | 'billNumber'>): PurchaseBill {
    const bills = this.getPurchaseBills();
    const billNumber = `PB-2026-${(bills.length + 83).toString().padStart(3, '0')}`;
    const newBill: PurchaseBill = {
      ...billData,
      id: `pb-${Date.now()}`,
      billNumber,
    };
    this.savePurchaseBills([newBill, ...bills]);

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

    // 2. Generate and store Batches with Expiry Tracking
    const batches = this.getBatches();
    const newBatches: BatchRecord[] = newBill.items.map((item, idx) => {
      const daysToExpiry = Math.ceil(
        (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
      );
      let status: BatchRecord['status'] = 'active';
      if (daysToExpiry <= 0) status = 'expired';
      else if (daysToExpiry <= 30) status = 'near_expiry';

      return {
        id: `bat-${Date.now()}-${idx}`,
        itemId: item.itemId,
        sku: item.sku,
        name: item.name,
        category: item.category,
        batchNumber: item.batchNumber || `BATCH-${item.sku.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
        warehouseId: newBill.warehouseId,
        warehouseName: newBill.warehouseName,
        mfgDate: item.mfgDate || newBill.billDate,
        expiryDate: item.expiryDate,
        initialQuantity: item.quantity,
        quantityInStock: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
        purchaseBillRef: billNumber,
        supplierName: newBill.supplierName,
        daysToExpiry,
        status,
      };
    });
    this.saveBatches([...newBatches, ...batches]);

    // 3. Update Master Inventory Central Stock
    newBill.items.forEach((item) => {
      storage.adjustStock(
        item.itemId,
        item.quantity,
        `Inward Purchase Bill ${billNumber} (Supplier: ${newBill.supplierName})`
      );

      // Record Audit Trail
      this.addAuditRecord({
        referenceNumber: billNumber,
        itemId: item.itemId,
        sku: item.sku,
        itemName: item.name,
        batchNumber: item.batchNumber,
        movementType: 'purchase_inward',
        fromLocation: `Supplier: ${newBill.supplierName}`,
        toLocation: newBill.warehouseName,
        quantity: item.quantity,
        unit: item.unit,
        balanceAfter: item.quantity,
        unitCost: item.unitCost,
        totalCostImpact: item.totalCost,
        performedBy: newBill.receivedBy || 'Warehouse Manager',
        userRole: 'Warehouse Manager',
        notes: `Inward GRN stock verified. Invoice No: ${newBill.supplierInvoiceNo}`,
      });
    });

    // 4. Update PO status if linked
    if (newBill.poReferenceId) {
      this.updatePOStatus(newBill.poReferenceId, 'received');
    }

    storage.addNotification({
      title: `Goods Received & Stocked: ${billNumber}`,
      message: `Received ₹${newBill.grandTotal.toLocaleString('en-IN')} worth stock from ${newBill.supplierName} into ${newBill.warehouseName}.`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });

    return newBill;
  },

  // =========================================================================
  // BATCHES & EXPIRY TRACKING
  // =========================================================================
  getBatches(): BatchRecord[] {
    try {
      const data = localStorage.getItem(WH_KEYS.BATCHES);
      if (!data) {
        this.saveBatches(INITIAL_BATCHES);
        return INITIAL_BATCHES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_BATCHES;
    }
  },

  saveBatches(list: BatchRecord[]): void {
    try {
      // Recalculate dynamic days to expiry on save/load
      const now = new Date().getTime();
      const updated = list.map((b) => {
        const days = Math.ceil((new Date(b.expiryDate).getTime() - now) / (1000 * 3600 * 24));
        let status = b.status;
        if (b.quantityInStock <= 0) status = 'depleted';
        else if (days <= 0) status = 'expired';
        else if (days <= 30) status = 'near_expiry';
        else status = 'active';

        return { ...b, daysToExpiry: days, status };
      });

      localStorage.setItem(WH_KEYS.BATCHES, JSON.stringify(updated));
      storage.notifySubscribers();
    } catch (e) {
      console.error(e);
    }
  },

  // =========================================================================
  // STOCK TRANSFERS & IN-TRANSIT TRACKING
  // =========================================================================
  getStockTransfers(): StockTransfer[] {
    try {
      const data = localStorage.getItem(WH_KEYS.TRANSFERS);
      if (!data) {
        this.saveStockTransfers(INITIAL_TRANSFERS);
        return INITIAL_TRANSFERS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_TRANSFERS;
    }
  },

  saveStockTransfers(list: StockTransfer[]): void {
    try {
      localStorage.setItem(WH_KEYS.TRANSFERS, JSON.stringify(list));
      storage.notifySubscribers();
    } catch (e) {
      console.error(e);
    }
  },

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
    };

    // If auto dispatched, decrement source stock & audit
    if (newTransfer.status === 'dispatched_in_transit') {
      newTransfer.dispatchDate = new Date().toISOString().split('T')[0];
      newTransfer.items.forEach((item) => {
        const qty = item.dispatchedQty || item.requestedQty;
        // Decrement warehouse stock
        storage.adjustStock(item.itemId, -qty, `Dispatched transfer ${transferNumber} to ${newTransfer.destinationName}`);

        this.addAuditRecord({
          referenceNumber: transferNumber,
          itemId: item.itemId,
          sku: item.sku,
          itemName: item.name,
          batchNumber: item.batchNumber,
          movementType: 'warehouse_transfer_out',
          fromLocation: newTransfer.sourceName,
          toLocation: `In Transit ➔ ${newTransfer.destinationName}`,
          quantity: -qty,
          unit: item.unit,
          balanceAfter: 0,
          unitCost: item.unitCost,
          totalCostImpact: -qty * item.unitCost,
          performedBy: newTransfer.dispatchedBy || 'Warehouse Manager',
          userRole: 'Warehouse Manager',
          notes: `Vehicle: ${newTransfer.vehicleNumber || 'Van'} • Carrier: ${newTransfer.carrierName || 'Internal'} • OTP: ${newTransfer.otpOrPin || 'N/A'}`,
        });
      });
    }

    this.saveStockTransfers([newTransfer, ...transfers]);

    storage.addNotification({
      title: `Stock Transfer Initiated: ${transferNumber}`,
      message: `${newTransfer.type === 'store_to_warehouse_return' ? 'Return' : 'Transfer'} from ${newTransfer.sourceName} ➔ ${newTransfer.destinationName} (${newTransfer.items.length} items, ₹${totalValuation.toLocaleString('en-IN')})`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });

    return newTransfer;
  },

  dispatchTransfer(transferId: string, carrierName: string, vehicleNumber: string, driverContact: string): boolean {
    const transfers = this.getStockTransfers();
    const transfer = transfers.find((t) => t.id === transferId);
    if (!transfer) return false;

    transfer.status = 'dispatched_in_transit';
    transfer.dispatchDate = new Date().toISOString().split('T')[0];
    transfer.carrierName = carrierName;
    transfer.vehicleNumber = vehicleNumber;
    transfer.driverContact = driverContact;
    transfer.otpOrPin = Math.floor(1000 + Math.random() * 9000).toString();

    // Deduct stock from source warehouse
    transfer.items.forEach((item) => {
      const qty = item.dispatchedQty || item.requestedQty;
      storage.adjustStock(item.itemId, -qty, `Dispatched transfer ${transfer.transferNumber} to ${transfer.destinationName}`);

      this.addAuditRecord({
        referenceNumber: transfer.transferNumber,
        itemId: item.itemId,
        sku: item.sku,
        itemName: item.name,
        batchNumber: item.batchNumber,
        movementType: 'warehouse_transfer_out',
        fromLocation: transfer.sourceName,
        toLocation: `In Transit ➔ ${transfer.destinationName}`,
        quantity: -qty,
        unit: item.unit,
        balanceAfter: 0,
        unitCost: item.unitCost,
        totalCostImpact: -qty * item.unitCost,
        performedBy: transfer.dispatchedBy || 'Warehouse Manager',
        userRole: 'Warehouse Manager',
        notes: `Dispatched in transit with tracking OTP: ${transfer.otpOrPin}`,
      });
    });

    this.saveStockTransfers(transfers);
    return true;
  },

  receiveTransfer(transferId: string, receivedBy: string, itemReceivedMap: Record<string, number>): boolean {
    const transfers = this.getStockTransfers();
    const transfer = transfers.find((t) => t.id === transferId);
    if (!transfer) return false;

    transfer.receivedDate = new Date().toISOString().split('T')[0];
    transfer.receivedBy = receivedBy;

    let hasPartial = false;
    transfer.items.forEach((item) => {
      const receivedQty = itemReceivedMap[item.itemId] !== undefined ? itemReceivedMap[item.itemId] : item.dispatchedQty;
      item.receivedQty = receivedQty;
      if (receivedQty < item.dispatchedQty) {
        item.damagedQty = item.dispatchedQty - receivedQty;
        hasPartial = true;
      }

      // Add stock to store allocations in storage
      const inventory = storage.getInventory();
      const invItem = inventory.find((i) => i.id === item.itemId);
      if (invItem) {
        if (!invItem.storeAllocations) invItem.storeAllocations = {};
        const destStoreKey = transfer.destinationId;
        invItem.storeAllocations[destStoreKey] = (invItem.storeAllocations[destStoreKey] || 0) + receivedQty;
        storage.saveInventory(inventory);
      }

      this.addAuditRecord({
        referenceNumber: transfer.transferNumber,
        itemId: item.itemId,
        sku: item.sku,
        itemName: item.name,
        batchNumber: item.batchNumber,
        movementType: 'store_transfer_in',
        fromLocation: 'In Transit',
        toLocation: transfer.destinationName,
        quantity: receivedQty,
        unit: item.unit,
        balanceAfter: receivedQty,
        unitCost: item.unitCost,
        totalCostImpact: receivedQty * item.unitCost,
        performedBy: receivedBy,
        userRole: 'Store Manager',
        notes: `Stock safely received at store. Received Qty: ${receivedQty}/${item.dispatchedQty} ${item.unit}.`,
      });
    });

    transfer.status = hasPartial ? 'partially_received' : 'completed';
    this.saveStockTransfers(transfers);

    storage.addNotification({
      title: `Stock Received at ${transfer.destinationName}`,
      message: `Transfer ${transfer.transferNumber} received by ${receivedBy} (${transfer.status.toUpperCase()}).`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });

    return true;
  },

  // =========================================================================
  // STORE INDENTS (STOCK REQUESTS)
  // =========================================================================
  getStoreIndents(): StoreStockIndent[] {
    try {
      const data = localStorage.getItem(WH_KEYS.INDENTS);
      if (!data) {
        this.saveStoreIndents(INITIAL_INDENTS);
        return INITIAL_INDENTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_INDENTS;
    }
  },

  saveStoreIndents(list: StoreStockIndent[]): void {
    try {
      localStorage.setItem(WH_KEYS.INDENTS, JSON.stringify(list));
      storage.notifySubscribers();
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

  // =========================================================================
  // STOCK ADJUSTMENTS & SCRAP
  // =========================================================================
  getStockAdjustments(): StockAdjustment[] {
    try {
      const data = localStorage.getItem(WH_KEYS.ADJUSTMENTS);
      if (!data) {
        this.saveStockAdjustments(INITIAL_ADJUSTMENTS);
        return INITIAL_ADJUSTMENTS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_ADJUSTMENTS;
    }
  },

  saveStockAdjustments(list: StockAdjustment[]): void {
    try {
      localStorage.setItem(WH_KEYS.ADJUSTMENTS, JSON.stringify(list));
      storage.notifySubscribers();
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

    // Apply stock delta immediately
    newAdj.items.forEach((item) => {
      storage.adjustStock(
        item.itemId,
        item.adjustedQty,
        `Adjustment ${adjustmentNumber} (${newAdj.reason.replace(/_/g, ' ').toUpperCase()})`
      );

      this.addAuditRecord({
        referenceNumber: adjustmentNumber,
        itemId: item.itemId,
        sku: item.sku,
        itemName: item.name,
        batchNumber: item.batchNumber,
        movementType: newAdj.reason === 'damaged_spoilage' || newAdj.reason === 'expired_batch' ? 'damage_scrap' : 'physical_adjustment',
        fromLocation: newAdj.locationName,
        toLocation: item.adjustedQty < 0 ? 'Scrap & Spoilage Write-Off' : 'Stock Surplus Addition',
        quantity: item.adjustedQty,
        unit: item.unit,
        balanceAfter: item.previousStock + item.adjustedQty,
        unitCost: item.unitCost,
        totalCostImpact: item.adjustedQty * item.unitCost,
        performedBy: newAdj.authorizedBy,
        userRole: 'Warehouse Manager',
        notes: `Reason: ${newAdj.reason.replace(/_/g, ' ')} • ${item.itemNotes || ''}`,
      });
    });

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
    try {
      const data = localStorage.getItem(WH_KEYS.AUDIT_TRAIL);
      if (!data) {
        this.saveAuditTrail(INITIAL_AUDIT_TRAIL);
        return INITIAL_AUDIT_TRAIL;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_AUDIT_TRAIL;
    }
  },

  saveAuditTrail(list: StockMovementAudit[]): void {
    try {
      localStorage.setItem(WH_KEYS.AUDIT_TRAIL, JSON.stringify(list));
      storage.notifySubscribers();
    } catch (e) {
      console.error(e);
    }
  },

  addAuditRecord(audit: Omit<StockMovementAudit, 'id' | 'timestamp'>): void {
    const list = this.getAuditTrail();
    const newRecord: StockMovementAudit = {
      ...audit,
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.saveAuditTrail([newRecord, ...list]);
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

    // Central Warehouse Stock vs Stores
    let centralWarehouseStockUnits = 0;
    let storesTotalStockUnits = 0;
    let inTransitStockUnits = 0;

    inventory.forEach((item) => {
      const storeAllocTotal = Object.values(item.storeAllocations || {}).reduce((a, b) => a + b, 0);
      storesTotalStockUnits += storeAllocTotal;
      centralWarehouseStockUnits += Math.max(0, item.stockQuantity - storeAllocTotal);
    });

    transfers.forEach((tr) => {
      if (tr.status === 'dispatched_in_transit') {
        const qty = tr.items.reduce((sum, i) => sum + (i.dispatchedQty || i.requestedQty), 0);
        inTransitStockUnits += qty;
      }
    });

    // Valuation: Weighted Average vs FIFO
    const totalInventoryValuationAvg = inventory.reduce(
      (sum, item) => sum + item.stockQuantity * item.costPrice,
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
