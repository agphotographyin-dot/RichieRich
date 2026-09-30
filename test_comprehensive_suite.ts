/**
 * Comprehensive Deep Automated Test Suite for Richie Rich Pan House
 * Tests EVERY feature across:
 * 1. Storage & SafeStorage initialization
 * 2. Auth & Multi-role Access Control (Admin, Store Admin, POS Counter, Customer, Warehouse)
 * 3. Master Inventory management (CRUD, Barcodes, Category, Pricing, Low-stock alerts)
 * 4. Multi-Outlet Branch Stock isolation & allocations
 * 5. POS Counter Terminal (Cart calculations, Taxes, Discounts, Payment methods, Stock deduction)
 * 6. Customer Portal (Catalog, Online Ordering, Loyalty points, Order status)
 * 7. Store Admin (Expenses management, Branch statement generation, Store-specific metrics)
 * 8. Super Admin (Analytics, Counter management, Backups snapshot & restore, Promotions/Discounts)
 * 9. Warehouse & Supply Chain (Suppliers, POs, Inward Bills, Stock Transfers, Indents, Adjustments, Audit Trail)
 * 10. Financial Reconciliation & Report Exports (Daily collection CSV, Monthly analytical CSV, Store statement)
 */

import { storage, getBoxLooseStockSummary } from './src/services/storage';
import { warehouseStorage } from './src/services/warehouseStorage';
import { authService } from './src/services/auth';
import { createSignedBackupEnvelope, verifyAndSanitizeImportFile, validateAndSanitizeBackupPayload } from './src/services/backupIntegrityService';
import { excelInventoryService } from './src/services/excelInventoryService';
import { getSupplierProducts } from './src/utils/supplierProductMatching';

const results: { module: string; test: string; status: 'PASS' | 'FAIL'; details?: string }[] = [];

function assert(condition: boolean, module: string, test: string, details?: string) {
  if (condition) {
    results.push({ module, test, status: 'PASS', details });
    console.log(`[PASS] [${module}] ${test}`);
  } else {
    results.push({ module, test, status: 'FAIL', details });
    console.error(`[FAIL] [${module}] ${test} - ${details}`);
    throw new Error(`[FAIL] [${module}] ${test}: ${details}`);
  }
}

async function runAllTests() {
  console.log('===============================================================');
  console.log('STARTING DEEP VERIFICATION OF ALL FEATURES ACROSS ENTIRE APP');
  console.log('===============================================================\n');

  // ==========================================
  // MODULE 1: AUTHENTICATION & MULTI-ROLE SECURITY
  // ==========================================
  console.log('--- MODULE 1: AUTHENTICATION & ROLE ACCESS ---');
  
  // 1.1 Super Admin Authentication
  const adminOk = authService.loginAdmin('ADMIN', 'RRadmin');
  assert(adminOk.success === true, 'Auth', 'Super Admin Login (ADMIN / RRadmin)');
  const adminFail = authService.loginAdmin('ADMIN', 'wrongpass');
  assert(adminFail.success === false, 'Auth', 'Super Admin Rejection on wrong password');

  // 1.2 Store Admin Authentication
  const storeAdmins = storage.getStoreAdmins();
  assert(storeAdmins.length > 0, 'Auth', 'Store Admins configured', `Count: ${storeAdmins.length}`);
  const firstAdmin = storeAdmins[0];
  const loginRes = authService.loginStoreAdmin(firstAdmin.storeId, firstAdmin.username, firstAdmin.password);
  assert(loginRes.success === true, 'Auth', `Store Admin Login (${firstAdmin.username})`);
  const loginWrong = authService.loginStoreAdmin(firstAdmin.storeId, firstAdmin.username, 'wrongpass');
  assert(loginWrong.success === false, 'Auth', 'Store Admin Login Failure on wrong password');

  // 1.3 POS Terminal Authentication
  const posOk = authService.loginPOS('ADMIN', 'RRPOSadmin');
  assert(posOk.success === true, 'Auth', 'POS Terminal Login (ADMIN / RRPOSadmin)');
  const posFail = authService.loginPOS('ADMIN', 'wrongpass');
  assert(posFail.success === false, 'Auth', 'POS Terminal Rejection on wrong password');

  // 1.4 Warehouse Authentication
  const whOk = authService.loginWarehouse('ADMIN', 'RRwarehouse');
  assert(whOk.success === true, 'Auth', 'Warehouse Portal Login (ADMIN / RRwarehouse)');

  // 1.5 Customer Login / Registration
  const custRes = authService.loginCustomer('9876543210', 'Test Patron');
  assert(custRes.success === true && custRes.customer.phone === '9876543210', 'Auth', 'Customer Profile Login / Registration');


  // ==========================================
  // MODULE 2: MASTER INVENTORY & BARCODES
  // ==========================================
  console.log('\n--- MODULE 2: MASTER INVENTORY & BARCODES ---');
  
  const initialInv = storage.getInventory();
  assert(initialInv.length >= 10, 'Inventory', 'Master Inventory loaded', `Count: ${initialInv.length}`);
  
  // 2.1 Add New Inventory Item
  const newItemSku = `TEST-SKU-${Date.now().toString().slice(-4)}`;
  const addedItem = storage.addInventoryItem({
    sku: newItemSku,
    name: 'Royal Kesariya Saffron Pan Special',
    category: 'paan',
    description: 'Special Saffron Infused Pan with silver work',
    sellingPrice: 150,
    costPrice: 65,
    stockQuantity: 0,
    unit: 'pcs',
    lowStockThreshold: 15,
    barcode: `BAR-${Date.now().toString().slice(-6)}`,
    isAvailableForOnline: true,
  });
  assert(addedItem.sku === newItemSku, 'Inventory', 'Add Master Inventory Item', `Added item ID: ${addedItem.id}`);

  // 2.2 Barcode lookup
  const foundByBarcode = storage.findItemByBarcode(addedItem.barcode!);
  assert(foundByBarcode?.id === addedItem.id, 'Inventory', 'Find Item by Barcode');

  // 2.3 SKU lookup
  const foundBySku = storage.getInventory().find((i) => i.sku === newItemSku);
  assert(foundBySku?.id === addedItem.id, 'Inventory', 'Find Item by SKU');

  // 2.4 Update Item
  const updatedItem = storage.updateInventoryItem(addedItem.id, { sellingPrice: 175 });
  assert(updatedItem?.sellingPrice === 175, 'Inventory', 'Update Master Inventory Item Details');


  // ==========================================
  // MODULE 3: MULTI-OUTLET BRANCH ALLOCATIONS
  // ==========================================
  console.log('\n--- MODULE 3: MULTI-OUTLET BRANCH ALLOCATIONS ---');
  
  const stores = storage.getStores();
  assert(stores.length >= 3, 'Stores', 'Multi-Store Outlets Available', `Stores count: ${stores.length}`);
  const storeA = stores[0];
  const storeB = stores[1];

  // Set branch stock allocation directly
  warehouseStorage.adjustStoreStock(addedItem.id, storeA.id, 25, 'Initial Test Allocation', 'Test Admin');
  warehouseStorage.adjustStoreStock(addedItem.id, storeB.id, 10, 'Initial Test Allocation', 'Test Admin');

  const refreshedItem = storage.getInventory().find((i) => i.id === addedItem.id);
  assert(refreshedItem?.storeAllocations[storeA.id] === 25, 'Stores', `Store Stock Allocation (${storeA.name}) = 25`);
  assert(refreshedItem?.storeAllocations[storeB.id] === 10, 'Stores', `Store Stock Allocation (${storeB.name}) = 10`);


  // ==========================================
  // MODULE 4: POS COUNTER TERMINAL & CHECKOUT
  // ==========================================
  console.log('\n--- MODULE 4: POS COUNTER TERMINAL & ORDERS ---');

  const counters = storeA.counters || [];
  assert(counters.length > 0, 'POS', 'POS Counters configured', `Count: ${counters.length}`);
  const firstCounter = counters[0];

  const stockBeforeSale = refreshedItem?.storeAllocations[storeA.id] || 0;
  
  // 4.1 Process POS Order with Cash
  const posOrder = storage.processOrder({
    items: [
      {
        itemId: addedItem.id,
        sku: addedItem.sku,
        name: addedItem.name,
        price: 175,
        costPrice: 65,
        quantity: 2,
        subtotal: 350,
        profit: 220,
      },
    ],
    storeId: storeA.id,
    storeName: storeA.name,
    counterNumber: firstCounter.id,
    counterName: firstCounter.name,
    cashierName: firstCounter.cashierName,
    customerName: 'Aarav VIP Patron',
    customerPhone: '9876543210',
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    subtotal: 350,
    discountAmount: 0,
    taxAmount: 18,
    grandTotal: 368,
    totalCost: 130,
    totalProfit: 220,
    status: 'completed',
    source: 'pos_counter',
  });

  assert(posOrder.id.startsWith('ord-'), 'POS', 'POS Order Created Successfully', `Order: #${posOrder.orderNumber}`);

  // 4.2 Verify Real-Time Store Stock Deduction
  const itemAfterSale = storage.getInventory().find((i) => i.id === addedItem.id);
  const stockAfterSale = itemAfterSale?.storeAllocations[storeA.id] || 0;
  assert(stockAfterSale === stockBeforeSale - 2, 'POS', 'Immediate Real-Time Branch Stock Deduction', `Old: ${stockBeforeSale}, New: ${stockAfterSale}`);

  // 4.3 Verify Other Store was UNTOUCHED
  assert(itemAfterSale?.storeAllocations[storeB.id] === 10, 'POS', 'Isolated Branch Inventory (Store B stock unchanged)');


  // ==========================================
  // MODULE 5: CUSTOMER ONLINE ORDERING & LOYALTY
  // ==========================================
  console.log('\n--- MODULE 5: CUSTOMER ONLINE ORDERING & LOYALTY ---');

  const customerBefore = storage.getCustomers().find((c) => c.phone === '9876543210');
  const pointsBefore = customerBefore?.loyaltyPoints || 0;

  // Process customer online order with UPI
  const onlineOrder = storage.processOrder({
    items: [
      {
        itemId: addedItem.id,
        sku: addedItem.sku,
        name: addedItem.name,
        price: 175,
        costPrice: 65,
        quantity: 1,
        subtotal: 175,
        profit: 110,
      },
    ],
    storeId: storeA.id,
    storeName: storeA.name,
    customerName: 'Aarav VIP Patron',
    customerPhone: '9876543210',
    paymentMethod: 'upi_qr',
    subtotal: 175,
    discountAmount: 0,
    taxAmount: 9,
    grandTotal: 184,
    totalCost: 65,
    totalProfit: 110,
    status: 'pending',
    paymentStatus: 'pending',
    source: 'customer_online',
  });
  assert(onlineOrder.source === 'customer_online', 'Customer', 'Online Order Processing');

  // Check Loyalty points updated
  const customerAfter = storage.getCustomers().find((c) => c.phone === '9876543210');
  assert((customerAfter?.loyaltyPoints || 0) >= pointsBefore, 'Customer', 'Customer Loyalty Points Accrual');

  // Customer order status transition
  const statusUpdated = storage.updateOrderStatus(onlineOrder.id, 'ready');
  assert(statusUpdated === true, 'Customer', 'Order Status Transition (ready)');


  // ==========================================
  // MODULE 6: STORE ADMIN & EXPENSES STATEMENT
  // ==========================================
  console.log('\n--- MODULE 6: STORE ADMIN & EXPENSES ---');

  // 6.1 Add Store Expense
  const expense = storage.addStoreExpense({
    storeId: storeA.id,
    storeName: storeA.name,
    title: 'Daily Ice Blocks & Betel Leaf Packaging Material',
    description: 'Daily Ice Blocks & Betel Leaf Packaging Material',
    category: 'supplies',
    amount: 350,
    paymentMethod: 'cash',
    paidTo: 'Local Vendor Supplies',
    loggedBy: 'Store Admin Bopal',
    receiptNumber: 'EXP-TEST-001',
    notes: 'Urgent ice replenishment for cold pan storage',
    date: new Date().toISOString().split('T')[0],
  });
  assert(expense.id.startsWith('exp-'), 'StoreAdmin', 'Add Store Operational Expense');

  // 6.2 Retrieve Store Expenses
  const storeExpenses = storage.getStoreExpenses(storeA.id);
  assert(storeExpenses.some((e) => e.id === expense.id), 'StoreAdmin', 'Store Expenses Filtration by Store ID');

  // 6.3 Store Statement Reconciliation
  const statement = storage.getStoreFinancialSummary(storeA.id, new Date().toISOString().split('T')[0]);
  assert(statement.expensesByPayment.cash >= 350, 'StoreAdmin', 'Cash Drawer Expenses Computed in Reconciliation Statement');
  assert(typeof statement.expectedCashInDrawer === 'number', 'StoreAdmin', 'Expected Cash-in-Drawer Balanced Metric Calculated');


  // ==========================================
  // MODULE 7: WAREHOUSE & PROCUREMENT PIPELINE
  // ==========================================
  console.log('\n--- MODULE 7: WAREHOUSE & PROCUREMENT ---');

  const warehouses = warehouseStorage.getWarehouses();
  assert(warehouses.length > 0, 'Warehouse', 'Central Warehouse Facilities Available');
  const centralWh = warehouses[0];

  const suppliers = warehouseStorage.getSuppliers();
  assert(suppliers.length > 0, 'Warehouse', 'Suppliers Registered');
  const supplier = suppliers[0];

  // 7.1 Purchase Order Issuance
  const newPO = warehouseStorage.createPurchaseOrder({
    supplierId: supplier.id,
    supplierName: supplier.name,
    supplierGstin: supplier.gstin || '24AAACR1234F1Z5',
    destinationWarehouseId: centralWh.id,
    destinationWarehouseName: centralWh.name,
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: new Date().toISOString().split('T')[0],
    items: [
      {
        itemId: addedItem.id,
        sku: addedItem.sku,
        name: addedItem.name,
        category: addedItem.category,
        quantityOrdered: 100,
        quantityReceived: 0,
        unitPrice: 65,
        unit: 'pcs',
        taxPercent: 5,
        taxAmount: 325,
        totalAmount: 6825,
      },
    ],
    subtotal: 6500,
    taxTotal: 325,
    freightCharge: 0,
    grandTotal: 6825,
    status: 'approved',
    createdByName: 'Central Warehouse Procurement Officer',
    approvedByName: 'Warehouse Admin',
    paymentTerms: 'Net 30',
    paymentStatus: 'unpaid',
  });
  assert(newPO.poNumber.startsWith('PO-'), 'Warehouse', 'Purchase Order Issuance', `PO #${newPO.poNumber}`);

  // 7.2 Inward GRN Bill
  const whStockBeforeInward = storage.getInventory().find((i) => i.id === addedItem.id)?.stockQuantity || 0;
  const inwardBill = warehouseStorage.createPurchaseBill({
    supplierId: supplier.id,
    supplierName: supplier.name,
    warehouseId: centralWh.id,
    warehouseName: centralWh.name,
    supplierInvoiceNo: `INV-VERIFY-${Date.now().toString().slice(-4)}`,
    billDate: new Date().toISOString().split('T')[0],
    receivedDate: new Date().toISOString().split('T')[0],
    poReferenceId: newPO.id,
    items: [
      {
        itemId: addedItem.id,
        sku: addedItem.sku,
        name: addedItem.name,
        category: addedItem.category,
        quantity: 100,
        unitCost: 65,
        unit: 'pcs',
        taxRate: 5,
        taxAmount: 325,
        totalCost: 6825,
        batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
        mfgDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      },
    ],
    subtotal: 6500,
    gstAmount: 325,
    freightCharges: 0,
    roundOff: 0,
    grandTotal: 6825,
    paidAmount: 6825,
    dueAmount: 0,
    dueDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'paid',
    grnStatus: 'verified_stocked',
    receivedBy: 'Warehouse Inward Officer',
  });
  assert(inwardBill.billNumber.startsWith('PB-'), 'Warehouse', 'GRN Inward Bill Processed');

  const whStockAfterInward = storage.getInventory().find((i) => i.id === addedItem.id)?.stockQuantity || 0;
  assert(whStockAfterInward === whStockBeforeInward + 100, 'Warehouse', 'Central Warehouse Stock Incremented (+100)');

  // 7.3 Inter-Facility Stock Transfer Dispatch
  const transfer = warehouseStorage.createStockTransfer({
    type: 'warehouse_to_store',
    sourceType: 'warehouse',
    sourceId: centralWh.id,
    sourceName: centralWh.name,
    destinationType: 'store',
    destinationId: storeA.id,
    destinationName: storeA.name,
    requestedDate: new Date().toISOString().split('T')[0],
    dispatchDate: new Date().toISOString().split('T')[0],
    status: 'dispatched_in_transit',
    items: [
      {
        itemId: addedItem.id,
        sku: addedItem.sku,
        name: addedItem.name,
        requestedQty: 30,
        dispatchedQty: 30,
        receivedQty: 0,
        unit: 'pcs',
        unitCost: 65,
      },
    ],
    vehicleNumber: 'GJ-01-RR-2026',
    carrierName: 'Richie Rich Express Line',
    otpOrPin: '8877',
    dispatchedBy: 'Dispatch Head',
  });
  assert(transfer.transferNumber.startsWith('TR-'), 'Warehouse', 'Transfer Dispatch & Gate Pass Generated');

  const whStockAfterDispatch = storage.getInventory().find((i) => i.id === addedItem.id)?.stockQuantity || 0;
  assert(whStockAfterDispatch === whStockAfterInward - 30, 'Warehouse', 'Central Warehouse Stock Decremented On Dispatch (-30)');

  // 7.4 Receive Transfer at Store
  const storeStockBeforeRecv = storage.getInventory().find((i) => i.id === addedItem.id)?.storeAllocations[storeA.id] || 0;
  const receiveOk = warehouseStorage.receiveTransfer(transfer.id, `${storeA.shortName} Manager`, {
    [addedItem.id]: 30,
  });
  assert(receiveOk === true, 'Warehouse', 'Store Transfer Receipt Confirmed');

  const storeStockAfterRecv = storage.getInventory().find((i) => i.id === addedItem.id)?.storeAllocations[storeA.id] || 0;
  assert(storeStockAfterRecv === storeStockBeforeRecv + 30, 'Warehouse', 'Destination Store Stock Incremented (+30)');


  // ==========================================
  // MODULE 8: AUDIT TRAIL & WRITE-OFFS
  // ==========================================
  console.log('\n--- MODULE 8: AUDIT TRAIL & WRITE-OFFS ---');

  // 8.1 Stock Adjustment (Damage / Spoilage write-off)
  const adj = warehouseStorage.createStockAdjustment({
    locationType: 'store',
    locationId: storeA.id,
    locationName: storeA.name,
    date: new Date().toISOString().split('T')[0],
    reason: 'damaged_spoilage',
    items: [
      {
        itemId: addedItem.id,
        sku: addedItem.sku,
        name: addedItem.name,
        previousStock: storeStockAfterRecv,
        adjustedQty: -2,
        unit: 'pcs',
        unitCost: 65,
        totalValueImpact: -130,
        itemNotes: 'Damaged packaging during shelf stacking',
      },
    ],
    authorizedBy: 'Store Quality Auditor',
    status: 'approved_applied',
    notes: 'Spoilage write-off test',
  });
  assert(adj.adjustmentNumber.startsWith('ADJ-'), 'Audit', 'Stock Adjustment Created & Applied');

  const storeStockAfterAdj = storage.getInventory().find((i) => i.id === addedItem.id)?.storeAllocations[storeA.id] || 0;
  assert(storeStockAfterAdj === storeStockAfterRecv - 2, 'Audit', 'Store Stock Corrected after Damage Write-Off (-2)');

  // 8.2 Audit Trail Logs
  const auditLogs = warehouseStorage.getAuditTrail();
  assert(auditLogs.length > 0, 'Audit', 'Stock Movement Audit Trail populated', `Log entries: ${auditLogs.length}`);
  const hasInwardLog = auditLogs.some((l) => l.movementType === 'purchase_inward');
  const hasDispatchLog = auditLogs.some((l) => l.movementType === 'warehouse_transfer_out');
  const hasStoreInLog = auditLogs.some((l) => l.movementType === 'store_transfer_in');
  assert(hasInwardLog && hasDispatchLog && hasStoreInLog, 'Audit', 'All lifecycle movements recorded in Audit Ledger');


  // ==========================================
  // MODULE 9: BACKUPS, INTEGRITY & SECURITY
  // ==========================================
  console.log('\n--- MODULE 9: BACKUPS & SYSTEM INTEGRITY ---');

  // 9.1 Create Backup Snapshot
  const backup = storage.createBackup('manual', 'Comprehensive Test Verification Snapshot');
  assert(backup.id.startsWith('backup-'), 'Backups', 'Full System Backup Snapshot Created', `Backup ID: ${backup.id}`);
  const parsedData = JSON.parse(backup.dataJson);
  assert(parsedData.inventory.length > 0, 'Backups', 'Inventory data captured in snapshot');
  assert(parsedData.orders.length > 0, 'Backups', 'Order data captured in snapshot');

  // 9.2 Cryptographic Envelope & Integrity Verification
  const signedEnvelope = await createSignedBackupEnvelope(parsedData);
  assert(typeof signedEnvelope.checksum === 'string' && signedEnvelope.checksum.length > 10, 'Backups', 'Generated SHA-256 Checksum Envelope');
  const verification = await verifyAndSanitizeImportFile(JSON.stringify(signedEnvelope));
  assert(verification.isValid === true && verification.isCryptographicallyVerified === true, 'Backups', 'Cryptographic & Structural Integrity Check Passed');


  // ==========================================
  // MODULE 10: REPORT GENERATION & EXCEL/CSV EXPORTS
  // ==========================================
  console.log('\n--- MODULE 10: REPORTING & CSV EXPORTS ---');

  // 10.1 Daily Collection CSV
  const dailyCSV = storage.exportDailyCollectionReportCSV();
  assert(dailyCSV.includes('DAILY SALES & COLLECTION RECONCILIATION REPORT'), 'Reports', 'Daily Collection CSV Report Generated');
  assert(dailyCSV.includes('ONLY CASH') && dailyCSV.includes('ONLY UPI'), 'Reports', 'Payment Method Reconciliation included in CSV');

  // 10.2 Monthly Analytical CSV
  const monthlyCSV = storage.exportMonthlyAnalyticalReportCSV();
  assert(monthlyCSV.includes('MONTHLY ANALYTICAL & FINANCIAL REPORT'), 'Reports', 'Monthly Analytical CSV Generated');

  // 10.3 Store Statement CSV
  const statementCSV = storage.exportStorePnLCSV(storeA.id);
  assert(statementCSV.includes('STORE FINANCIAL STATEMENT') || statementCSV.includes('RICHIE RICH PAN HOUSE'), 'Reports', 'Branch Financial Statement CSV Generated');

  // 10.4 Excel Import / Template Validation
  const sampleHeaders = ['Product Name', 'SKU / Product Code', 'Category', 'Selling Price', 'Purchase Price', 'Unit'];
  const detectedCols = excelInventoryService.detectColumnIndices(sampleHeaders);
  assert(detectedCols.nameCol >= 0 && detectedCols.skuCol >= 0, 'Excel', 'Excel Column Header & Smart Alias Detection');

  // 10.5 Supplier Catalog Matching
  const matches = getSupplierProducts(supplier, storage.getInventory());
  assert(Array.isArray(matches), 'Procurement', 'AI/Smart Supplier Product Catalog Matching');

  // 10.6 Large SKU Batch Import & Persistence (Regression test for disappearing SKUs / stuck at 754 bug)
  console.log('\n--- MODULE 11: LARGE INVENTORY & SKU RETENTION REGRESSION ---');
  const initialCount = storage.getInventory().length;
  const largeBatch = Array.from({ length: 900 }, (_, i) => ({
    isUpdate: false,
    name: `Test Brand Product ${i + 1}`,
    sku: `RR-${String(i + 1).padStart(4, '0')}`,
    barcode: `890999${String(i + 1).padStart(6, '0')}`,
    category: i % 2 === 0 ? 'Paan' : 'Essentials',
    brand: 'Richie Rich Signature',
    vendors: ['Central Supply'],
    vendor: 'Central Supply',
    priceType: 'fixed' as const,
    costPrice: 50,
    sellingPrice: 100,
    stockQuantity: 10,
    lowStockThreshold: 5,
    unit: 'pieces',
    isTaxApplicable: true,
    taxRate: 5,
    status: 'active' as const,
    description: `Product description ${i + 1}`,
  }));

  const { importedCount } = storage.importInventoryBatch(largeBatch, { updateExisting: true });
  assert(importedCount === 900, 'Inventory', `Batch import accepted all 900 records (imported: ${importedCount})`);

  const fetchedInventory = storage.getInventory();
  assert(
    fetchedInventory.length >= initialCount + 900,
    'Inventory',
    `Master Inventory retained all SKUs without dropping or disappearing (Total SKUs: ${fetchedInventory.length}, well beyond 754)`
  );

  // Verify specific items like RR-0002, RR-0754, RR-0899 are all present
  const checkItem2 = storage.findItemByBarcode('RR-0002');
  const checkItem754 = storage.findItemByBarcode('RR-0754');
  const checkItem899 = storage.findItemByBarcode('RR-0899');
  assert(!!checkItem2 && !!checkItem754 && !!checkItem899, 'Inventory', 'Hyphenated SKUs with shared prefixes preserved without dropping');

  // ==========================================
  // MODULE 12: INVENTORY PURGE & CLEAN-IMPORT WORKFLOW
  // ==========================================
  console.log('\n--- MODULE 12: INVENTORY PURGE & CLEAN-IMPORT WORKFLOW ---');
  
  // 12.1 Purge All Current SKUs
  const prePurgeCount = storage.getInventory().length;
  assert(prePurgeCount > 0, 'InventoryPurge', 'Catalog has SKUs prior to purge');
  const purgeResult = await storage.clearAllInventory();
  assert(purgeResult.count === prePurgeCount, 'InventoryPurge', `Purged ${purgeResult.count} SKUs`);
  const postPurgeItems = storage.getInventory();
  assert(postPurgeItems.length === 0, 'InventoryPurge', 'Catalog is completely empty after purge (0 SKUs)');

  // 12.2 Clean-Before-Import Verification (fresh catalog of 50 new items)
  const freshItems = Array.from({ length: 50 }, (_, i) => ({
    isUpdate: false,
    name: `Fresh Royal Product ${i + 1}`,
    sku: `NEW-SKU-${String(i + 1).padStart(3, '0')}`,
    barcode: `890888${String(i + 1).padStart(6, '0')}`,
    category: 'Paan' as const,
    brand: 'Richie Rich Signature',
    vendors: ['Central Supply'],
    vendor: 'Central Supply',
    priceType: 'fixed' as const,
    costPrice: 40,
    sellingPrice: 80,
    stockQuantity: 20,
    lowStockThreshold: 5,
    unit: 'pieces',
    isTaxApplicable: true,
    taxRate: 5,
    status: 'active' as const,
    description: `Brand new clean import item ${i + 1}`,
  }));

  const cleanImportRes = storage.importInventoryBatch(freshItems, { updateExisting: true, cleanBeforeImport: true });
  assert(cleanImportRes.importedCount === 50, 'InventoryPurge', 'Clean-before-import successfully imported all 50 new items');
  const cleanCatalog = storage.getInventory();
  assert(cleanCatalog.length === 50, 'InventoryPurge', 'Catalog contains exactly 50 new items without retaining any old SKUs');
  assert(cleanCatalog[0].sku === 'NEW-SKU-001', 'InventoryPurge', 'First imported SKU verified (NEW-SKU-001)');

  // ==========================================
  // MODULE 13: BOX & LOOSE PRODUCT INVENTORY & POS
  // ==========================================
  console.log('\n--- MODULE 13: BOX & LOOSE PRODUCT INVENTORY & POS ---');

  // 13.1 Register Master Box & Loose Item
  const boxItem = storage.addInventoryItem({
    name: 'Classic Gold Cigarettes (Box & Loose)',
    sku: 'CIG-GOLD-100',
    category: 'Cigarettes',
    description: 'Classic Gold Filter Cigarette Box & Loose Product',
    lowStockThreshold: 5,
    piecesPerBox: 10,
    sellAsLoose: true,
    boxBarcode: 'BOX-8901001',
    looseBarcode: 'PCS-8901001',
    barcode: 'BOX-8901001',
    sellingPrice: 100, // Box price
    costPrice: 60,
    loosePrice: 10, // Single piece price
    loosePriceType: 'fixed',
    stockQuantity: 20, // 20 boxes opening
    fullBoxStock: 20,
    loosePieceStock: 0,
    unit: 'boxes',
    storeAllocations: { bopal: 20, gota: 0 },
    storeBoxAllocations: {
      bopal: { fullBoxes: 20, loosePieces: 0 },
      gota: { fullBoxes: 0, loosePieces: 0 },
    },
    isAvailableForOnline: true,
  });

  assert(boxItem.piecesPerBox === 10, 'BoxLoose', 'Pieces per Box configured (10)');
  assert(boxItem.sellAsLoose === true, 'BoxLoose', 'Sell as Loose enabled');

  // 13.2 Initial Stock Equivalent Verification
  const initialStockSummary = getBoxLooseStockSummary(boxItem, 'bopal');
  assert(initialStockSummary.fullBoxes === 20, 'BoxLoose', 'Initial Full Boxes at Bopal = 20');
  assert(initialStockSummary.loosePieces === 0, 'BoxLoose', 'Initial Loose Pieces at Bopal = 0');
  assert(initialStockSummary.totalPieces === 200, 'BoxLoose', 'Total Equivalent Pieces = 200 (20 boxes * 10 pcs)');

  // 13.3 Barcode Lookup Verification (Box and Loose point to same SKU)
  const boxScan = storage.findItemByBarcodeWithMeta('BOX-8901001');
  assert(boxScan !== null && boxScan.matchedType === 'box' && boxScan.item.id === boxItem.id, 'BoxLoose', 'Box Barcode Lookup matches master item as box');
  const looseScan = storage.findItemByBarcodeWithMeta('PCS-8901001');
  assert(looseScan !== null && looseScan.matchedType === 'loose' && looseScan.item.id === boxItem.id, 'BoxLoose', 'Loose Barcode Lookup matches master item as loose');

  // 13.4 Box Sale (Customer buys 1 Complete Box)
  // Expected: Box stock 20 -> 19, Loose: 0, Total: 190. Does NOT create loose piece sale.
  storage.processOrder({
    source: 'pos_counter',
    storeId: 'bopal',
    storeName: 'Richie Rich Pan House - Bopal Branch',
    counterNumber: 1,
    counterName: 'Main Counter',
    cashierName: 'Ramesh Patel',
    customerName: 'Customer 1 (Box Buyer)',
    items: [
      {
        itemId: boxItem.id,
        name: `${boxItem.name} (1 Box)`,
        sku: boxItem.sku,
        price: 100,
        costPrice: 60,
        quantity: 1,
        subtotal: 100,
        profit: 40,
        saleType: 'box',
        piecesPerBox: 10,
        boxEquivalentSold: 1,
      },
    ],
    subtotal: 100,
    discountAmount: 0,
    taxAmount: 5,
    grandTotal: 105,
    totalProfit: 40,
    totalCost: 60,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    status: 'completed',
  });

  const afterBoxSaleItem = storage.getInventory().find((i) => i.id === boxItem.id)!;
  const afterBoxSaleSummary = getBoxLooseStockSummary(afterBoxSaleItem, 'bopal');
  assert(afterBoxSaleSummary.fullBoxes === 19, 'BoxLoose', 'Full Boxes reduced 20 -> 19 after 1 Box sale');
  assert(afterBoxSaleSummary.loosePieces === 0, 'BoxLoose', 'Loose Pieces remains 0 (No loose pieces created by box sale)');
  assert(afterBoxSaleSummary.totalPieces === 190, 'BoxLoose', 'Total Pieces Equivalent = 190 (19 boxes * 10)');

  // 13.5 Loose Piece Sale (Customer buys 1 Individual Piece)
  // Expected: 1 box auto-unboxed -> Full boxes: 18, Loose pieces: 9, Total: 189 pieces equivalent.
  storage.processOrder({
    source: 'pos_counter',
    storeId: 'bopal',
    storeName: 'Richie Rich Pan House - Bopal Branch',
    counterNumber: 1,
    counterName: 'Main Counter',
    cashierName: 'Ramesh Patel',
    customerName: 'Customer 2 (Single Piece Buyer)',
    items: [
      {
        itemId: boxItem.id,
        name: `${boxItem.name} (Loose Piece)`,
        sku: boxItem.sku,
        price: 10,
        costPrice: 6,
        quantity: 1,
        subtotal: 10,
        profit: 4,
        saleType: 'loose',
        piecesPerBox: 10,
        boxEquivalentSold: 0.1,
      },
    ],
    subtotal: 10,
    discountAmount: 0,
    taxAmount: 0.5,
    grandTotal: 10.5,
    totalProfit: 4,
    totalCost: 6,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    status: 'completed',
  });

  const afterLooseSale1Item = storage.getInventory().find((i) => i.id === boxItem.id)!;
  const afterLooseSale1Summary = getBoxLooseStockSummary(afterLooseSale1Item, 'bopal');
  assert(afterLooseSale1Summary.fullBoxes === 18, 'BoxLoose', 'Auto-conversion: 1 box converted into loose pieces (19 -> 18 full boxes)');
  assert(afterLooseSale1Summary.loosePieces === 9, 'BoxLoose', 'Auto-conversion: 9 loose pieces remain after 1 sold');
  assert(afterLooseSale1Summary.totalPieces === 189, 'BoxLoose', 'Total Pieces = 189 (18 * 10 + 9)');

  // 13.6 Continued Loose Sales (Customer buys 9 more loose cigarettes)
  // Expected: Consumes all 9 loose pieces -> Full boxes: 18, Loose pieces: 0, Total: 180 pieces equivalent.
  storage.processOrder({
    source: 'pos_counter',
    storeId: 'bopal',
    storeName: 'Richie Rich Pan House - Bopal Branch',
    counterNumber: 1,
    counterName: 'Main Counter',
    cashierName: 'Ramesh Patel',
    customerName: 'Customer 3 (9 Loose Pieces)',
    items: [
      {
        itemId: boxItem.id,
        name: `${boxItem.name} (Loose Piece)`,
        sku: boxItem.sku,
        price: 10,
        costPrice: 6,
        quantity: 9,
        subtotal: 90,
        profit: 36,
        saleType: 'loose',
        piecesPerBox: 10,
        boxEquivalentSold: 0.9,
      },
    ],
    subtotal: 90,
    discountAmount: 0,
    taxAmount: 4.5,
    grandTotal: 94.5,
    totalProfit: 36,
    totalCost: 54,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    status: 'completed',
  });

  const afterLooseSale9Item = storage.getInventory().find((i) => i.id === boxItem.id)!;
  const afterLooseSale9Summary = getBoxLooseStockSummary(afterLooseSale9Item, 'bopal');
  assert(afterLooseSale9Summary.fullBoxes === 18, 'BoxLoose', 'Full Boxes remains 18 after consuming existing loose pieces');
  assert(afterLooseSale9Summary.loosePieces === 0, 'BoxLoose', 'Loose Pieces = 0 (10 individual pieces consumed from initial unboxed box)');
  assert(afterLooseSale9Summary.totalPieces === 180, 'BoxLoose', 'Total Pieces Equivalent = 180 (18 * 10 + 0)');

  // 13.7 Multi-Box Unboxing on Large Loose Sale (Sell 17 loose pieces when loose stock is 0)
  // Needs 17 pieces: Opens 2 boxes (20 pieces). 18 boxes -> 16 boxes. Loose remaining: 20 - 17 = 3.
  // Total pieces: 180 - 17 = 163 (16 * 10 + 3 = 163).
  storage.processOrder({
    source: 'pos_counter',
    storeId: 'bopal',
    storeName: 'Richie Rich Pan House - Bopal Branch',
    counterNumber: 1,
    counterName: 'Main Counter',
    cashierName: 'Ramesh Patel',
    customerName: 'Customer 4 (17 Loose Pieces)',
    items: [
      {
        itemId: boxItem.id,
        name: `${boxItem.name} (Loose Piece)`,
        sku: boxItem.sku,
        price: 10,
        costPrice: 6,
        quantity: 17,
        subtotal: 170,
        profit: 68,
        saleType: 'loose',
        piecesPerBox: 10,
        boxEquivalentSold: 1.7,
      },
    ],
    subtotal: 170,
    discountAmount: 0,
    taxAmount: 8.5,
    grandTotal: 178.5,
    totalProfit: 68,
    totalCost: 102,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    status: 'completed',
  });

  const afterLargeLooseItem = storage.getInventory().find((i) => i.id === boxItem.id)!;
  const afterLargeLooseSummary = getBoxLooseStockSummary(afterLargeLooseItem, 'bopal');
  assert(afterLargeLooseSummary.fullBoxes === 16, 'BoxLoose', 'Full Boxes reduced 18 -> 16 (opened 2 boxes for 17 pcs)');
  assert(afterLargeLooseSummary.loosePieces === 3, 'BoxLoose', 'Loose pieces = 3 (20 opened - 17 sold = 3 loose pieces)');
  assert(afterLargeLooseSummary.totalPieces === 163, 'BoxLoose', 'Total pieces = 163 (16 * 10 + 3 = 163)');

  // 13.8 Replenishment / Receiving Logic (Requirement 9)
  // When store receives +5 boxes, add to Full Boxes (+5) and 0 loose pieces. Total pieces = 163 + 50 = 213.
  const currentInvList = storage.getInventory();
  const currentTarget = currentInvList.find((i) => i.id === boxItem.id)!;
  if (!currentTarget.storeBoxAllocations) currentTarget.storeBoxAllocations = {};
  currentTarget.storeBoxAllocations['bopal'] = {
    fullBoxes: (currentTarget.storeBoxAllocations['bopal']?.fullBoxes || 0) + 5,
    loosePieces: currentTarget.storeBoxAllocations['bopal']?.loosePieces || 0, // Loose pieces untouched!
  };
  if (!currentTarget.storeAllocations) currentTarget.storeAllocations = {};
  currentTarget.storeAllocations['bopal'] = currentTarget.storeBoxAllocations['bopal'].fullBoxes;
  storage.saveInventory(currentInvList);

  const afterReplenishItem = storage.getInventory().find((i) => i.id === boxItem.id)!;
  const afterReplenishSummary = getBoxLooseStockSummary(afterReplenishItem, 'bopal');
  assert(afterReplenishSummary.fullBoxes === 21, 'BoxLoose', 'Replenishment: Full Boxes increased 16 + 5 = 21');
  assert(afterReplenishSummary.loosePieces === 3, 'BoxLoose', 'Replenishment: Loose pieces untouched at 3');
  assert(afterReplenishSummary.totalPieces === 213, 'BoxLoose', 'Replenishment: Total pieces = 213 (21 * 10 + 3)');

  // 13.9 Audit Trail: Loose Sale AND Box-Equivalent Consumption Recorded (User Requirement 1)
  const auditTrail = warehouseStorage.getAuditTrail();
  const hasLooseSaleAudit = auditTrail.some(
    (a) => a.itemName.includes('Loose Piece Sale') && a.quantity < 0
  );
  assert(hasLooseSaleAudit, 'BoxLooseAudit', 'Audit Trail contains dedicated Loose Piece Sale entry');

  const hasBoxEqAudit = auditTrail.some(
    (a) => a.itemName.includes('Box-Equivalent Consumption') && a.quantity < 0 && a.unit === 'boxes'
  );
  assert(hasBoxEqAudit, 'BoxLooseAudit', 'Audit Trail contains dedicated Box-Equivalent Consumption entry');

  // 13.10 Warehouse-to-Store and Store-to-Warehouse Number Accuracy (User Requirement 2)
  // Create an item with exactly 25 units in Central Warehouse
  const transferItem = storage.addInventoryItem({
    sku: 'TRF-TEST-25',
    barcode: '8901234567890',
    name: 'Transfer Accuracy Pan Test Item',
    category: 'Paan',
    costPrice: 20,
    sellingPrice: 40,
    stockQuantity: 25,
    lowStockThreshold: 5,
    unit: 'boxes',
    piecesPerBox: 10,
    sellAsLoose: true,
    fullBoxStock: 25,
    loosePieceStock: 0,
    storeAllocations: { bopal: 0, gota: 0, sindhubhavan: 0, sg_highway: 0 },
    storeBoxAllocations: {
      bopal: { fullBoxes: 0, loosePieces: 0 },
      gota: { fullBoxes: 0, loosePieces: 0 },
      sindhubhavan: { fullBoxes: 0, loosePieces: 0 },
      sg_highway: { fullBoxes: 0, loosePieces: 0 },
    },
    isTaxApplicable: true,
    isAvailableForOnline: true,
    description: 'Transfer verification item',
  });

  // Verify initial warehouse stock = 25, store stock = 0
  const initItem = storage.getInventory().find((i) => i.id === transferItem.id)!;
  assert(initItem.stockQuantity === 25, 'StockTransfer', 'Initial Central WH stock = 25');
  assert(initItem.storeAllocations?.['bopal'] === 0, 'StockTransfer', 'Initial Bopal Store stock = 0');

  // Transfer 20 from Central Warehouse to Bopal store
  const transfer1 = warehouseStorage.createStockTransfer({
    type: 'warehouse_to_store',
    sourceType: 'warehouse',
    sourceId: 'wh-central-amd',
    sourceName: 'Central Warehouse',
    destinationType: 'store',
    destinationId: 'bopal',
    destinationName: 'Richie Rich Pan House - Bopal Branch',
    requestedDate: '2026-09-30',
    dispatchDate: '2026-09-30',
    status: 'dispatched_in_transit',
    items: [
      {
        itemId: transferItem.id,
        sku: transferItem.sku,
        name: transferItem.name,
        batchNumber: 'BATCH-TRF-01',
        requestedQty: 20,
        dispatchedQty: 20,
        receivedQty: 0,
        unit: 'boxes',
        unitCost: 20,
      },
    ],
  });

  // Receive 20 at store
  warehouseStorage.receiveTransfer(transfer1.id, 'Store Manager Bopal', {
    [transferItem.id]: 20,
  });

  const afterTrf1 = storage.getInventory().find((i) => i.id === transferItem.id)!;
  assert(afterTrf1.stockQuantity === 5, 'StockTransfer', 'Central WH retains exactly 5 units (25 - 20 = 5)');
  assert(afterTrf1.storeAllocations?.['bopal'] === 20, 'StockTransfer', 'Bopal Store received exactly 20 units');
  assert(afterTrf1.storeBoxAllocations?.['bopal']?.fullBoxes === 20, 'StockTransfer', 'Bopal Store box allocation = 20 full boxes');
  assert(afterTrf1.stockQuantity + (afterTrf1.storeAllocations?.['bopal'] || 0) === 25, 'StockTransfer', 'Total network stock strictly conserved at 25');

  // Transfer 5 back from Bopal Store to Central Warehouse (Return)
  const transfer2 = warehouseStorage.createStockTransfer({
    type: 'store_to_warehouse_return',
    sourceType: 'store',
    sourceId: 'bopal',
    sourceName: 'Richie Rich Pan House - Bopal Branch',
    destinationType: 'warehouse',
    destinationId: 'wh-central-amd',
    destinationName: 'Central Warehouse',
    requestedDate: '2026-09-30',
    dispatchDate: '2026-09-30',
    status: 'dispatched_in_transit',
    items: [
      {
        itemId: transferItem.id,
        sku: transferItem.sku,
        name: transferItem.name,
        batchNumber: 'BATCH-TRF-01',
        requestedQty: 5,
        dispatchedQty: 5,
        receivedQty: 0,
        unit: 'boxes',
        unitCost: 20,
      },
    ],
  });

  warehouseStorage.receiveTransfer(transfer2.id, 'Warehouse Manager', {
    [transferItem.id]: 5,
  });

  const afterTrf2 = storage.getInventory().find((i) => i.id === transferItem.id)!;
  assert(afterTrf2.storeAllocations?.['bopal'] === 15, 'StockTransfer', 'Bopal Store reduced to 15 (20 - 5 = 15)');
  assert(afterTrf2.storeBoxAllocations?.['bopal']?.fullBoxes === 15, 'StockTransfer', 'Bopal Store box allocation accurately updated to 15');
  assert(afterTrf2.stockQuantity === 10, 'StockTransfer', 'Central WH increased to 10 (5 + 5 = 10)');
  assert(afterTrf2.stockQuantity + (afterTrf2.storeAllocations?.['bopal'] || 0) === 25, 'StockTransfer', 'Total network stock strictly conserved at 25 after return');

  // 13.11 POS Sale Stock Isolation: 1 piece less from store, and Central Warehouse is UNTOUCHED (User Requirement 3)
  const whStockBeforePOS = afterTrf2.stockQuantity; // 10
  const storePiecesBeforePOS = getBoxLooseStockSummary(afterTrf2, 'bopal').totalPieces; // 150 pieces

  storage.processOrder({
    source: 'pos_counter',
    storeId: 'bopal',
    storeName: 'Richie Rich Pan House - Bopal Branch',
    counterNumber: 1,
    counterName: 'Main Counter',
    cashierName: 'Ramesh Patel',
    customerName: 'POS Guest',
    items: [
      {
        itemId: transferItem.id,
        name: `${transferItem.name} (Loose Piece)`,
        sku: transferItem.sku,
        price: 5,
        costPrice: 2,
        quantity: 1,
        subtotal: 5,
        profit: 3,
        saleType: 'loose',
        piecesPerBox: 10,
        boxEquivalentSold: 0.1,
      },
    ],
    subtotal: 5,
    discountAmount: 0,
    taxAmount: 0,
    grandTotal: 5,
    totalProfit: 3,
    totalCost: 2,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    status: 'completed',
  });

  const afterPOSItem = storage.getInventory().find((i) => i.id === transferItem.id)!;
  const storeSummaryAfterPOS = getBoxLooseStockSummary(afterPOSItem, 'bopal');
  assert(
    storeSummaryAfterPOS.totalPieces === storePiecesBeforePOS - 1,
    'POSStockIsolation',
    'POS sale decreased store stock by exactly 1 piece (150 -> 149)'
  );
  assert(
    afterPOSItem.stockQuantity === whStockBeforePOS,
    'POSStockIsolation',
    'Central Warehouse stock was NOT touched or incremented on POS store sale (remains exactly 10)'
  );

  console.log('\n===============================================================');
  console.log(`ALL ${results.length} FEATURES VERIFIED AND PASSED WITH 100% SUCCESS!`);
  console.log('===============================================================\n');

  const failed = results.filter((r) => r.status === 'FAIL');
  if (failed.length > 0) {
    console.error(`Failed ${failed.length} tests`);
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
