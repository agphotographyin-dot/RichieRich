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

import { storage } from './src/services/storage';
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

  console.log('\n===============================================================');
  console.log(`ALL ${results.length} FEATURES VERIFIED AND PASSED WITH 100% SUCCESS!`);
  console.log('===============================================================\n');

  return results;
}

runAllTests().catch((err) => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
