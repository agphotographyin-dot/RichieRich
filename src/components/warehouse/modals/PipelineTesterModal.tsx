import React, { useState } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Truck,
  Building2,
  FileSpreadsheet,
  PackagePlus,
  Store,
  Sparkles,
  RefreshCw,
  Layers,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { warehouseStorage } from '../../../services/warehouseStorage';
import { storage, CURRENCY } from '../../../services/storage';
import { Supplier, PurchaseOrder, StockTransfer, BatchRecord, WarehouseTab } from '../../../types/warehouse';
import { InventoryItem, StoreLocation } from '../../../types';

interface PipelineTesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: WarehouseTab) => void;
}

interface StepLog {
  step: number;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  details?: string;
  data?: any;
}

export const PipelineTesterModal: React.FC<PipelineTesterModalProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<'Paan' | 'Cafe' | 'Essentials'>('Paan');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('bopal');

  const [createdSupplier, setCreatedSupplier] = useState<Supplier | null>(null);
  const [createdPO, setCreatedPO] = useState<PurchaseOrder | null>(null);
  const [createdBatch, setCreatedBatch] = useState<BatchRecord | null>(null);
  const [createdTransfer, setCreatedTransfer] = useState<StockTransfer | null>(null);
  const [testItem, setTestItem] = useState<InventoryItem | null>(null);

  const [stepLogs, setStepLogs] = useState<StepLog[]>([
    {
      step: 1,
      title: '1. Add Supplier / Distributor',
      status: 'pending',
      details: 'Create a new verified supplier under Paan, Cafe, or Essentials category.',
    },
    {
      step: 2,
      title: '2. Place Purchase Order (PO)',
      status: 'pending',
      details: 'Issue a formal PO to the new supplier with quantities, landed cost, and taxes.',
    },
    {
      step: 3,
      title: '3. Receive Inward Stock from Supplier',
      status: 'pending',
      details: 'Generate GRN & Inward Bill: Central Warehouse stock increases, batch created with expiry, PO marked received.',
    },
    {
      step: 4,
      title: '4. Send Inventory to Store (Dispatch & Delivery)',
      status: 'pending',
      details: 'Transfer stock from Central Warehouse to Store: WH stock decrements, Store allocation increments upon OTP receipt.',
    },
    {
      step: 5,
      title: '5. In-Store Stock Dips Below Minimum',
      status: 'pending',
      details: 'Simulate in-store POS sales taking store units below minimum threshold: Triggers Warehouse Low Stock Alert.',
    },
    {
      step: 6,
      title: '6. Warehouse Live Inventory Breakdown',
      status: 'pending',
      details: 'Verify live Central Master Warehouse stock vs individual store allocations across all branches.',
    },
  ]);

  const updateStepStatus = (
    stepNum: number,
    status: StepLog['status'],
    details?: string,
    data?: any
  ) => {
    setStepLogs((prev) =>
      prev.map((log) =>
        log.step === stepNum ? { ...log, status, details: details || log.details, data } : log
      )
    );
  };

  // -------------------------------------------------------------
  // STEP 1: Add New Supplier
  // -------------------------------------------------------------
  const executeStep1 = () => {
    updateStepStatus(1, 'running', 'Adding new supplier to directory...');
    const timestamp = Date.now().toString().slice(-4);
    const supplierName =
      selectedCategory === 'Paan'
        ? `Royal Banaras Agro & Betel Traders #${timestamp}`
        : selectedCategory === 'Cafe'
        ? `Artisan Roast & Beverage Imports #${timestamp}`
        : `Heritage Shahi Dryfruits & Vark Hub #${timestamp}`;

    const newSupplier = warehouseStorage.addSupplier({
      name: supplierName,
      code: `SUP-${selectedCategory.toUpperCase().slice(0, 3)}-${timestamp}`,
      category: selectedCategory,
      contactPerson: 'Devendra Sharma',
      phone: '+91 98980 12345',
      email: `orders@${selectedCategory.toLowerCase()}-supplies.in`,
      gstin: '24AABCS9821E1Z8',
      panNumber: 'AABCS9821E',
      address: 'Near Agriculture Market Yard, Ring Road',
      city: 'Ahmedabad',
      state: 'Gujarat',
      paymentTerms: 'Net 15 Days',
      creditLimit: 500000,
      bankDetails: {
        bankName: 'HDFC Bank',
        accountName: supplierName,
        accountNumber: '50200099881122',
        ifscCode: 'HDFC0001234',
      },
      rating: 5,
      isActive: true,
    });

    setCreatedSupplier(newSupplier);
    updateStepStatus(
      1,
      'completed',
      `Supplier created: "${newSupplier.name}" [Category: ${newSupplier.category}, Code: ${newSupplier.code}]`,
      newSupplier
    );
    setCurrentStep(1);
  };

  // -------------------------------------------------------------
  // STEP 2: Place Purchase Order (PO)
  // -------------------------------------------------------------
  const executeStep2 = () => {
    if (!createdSupplier) {
      executeStep1();
    }
    const sup = createdSupplier || warehouseStorage.getSuppliers()[0];
    const inventory = storage.getInventory();
    const item =
      inventory.find((i) => i.category === sup.category) || inventory[0];
    setTestItem(item);

    updateStepStatus(2, 'running', `Creating Purchase Order to ${sup.name}...`);

    const orderQty = 150;
    const unitPrice = item.costPrice || 25;
    const subtotal = orderQty * unitPrice;
    const taxTotal = Math.round(subtotal * 0.05);
    const grandTotal = subtotal + taxTotal;

    const po = warehouseStorage.createPurchaseOrder({
      supplierId: sup.id,
      supplierName: sup.name,
      supplierGstin: sup.gstin,
      destinationWarehouseId: 'wh-central-amd',
      destinationWarehouseName: 'Central Warehouse',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      items: [
        {
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          quantityOrdered: orderQty,
          quantityReceived: 0,
          unitPrice,
          unit: item.unit,
          taxPercent: 5,
          taxAmount: taxTotal,
          totalAmount: grandTotal,
        },
      ],
      subtotal,
      taxTotal,
      freightCharge: 0,
      grandTotal,
      status: 'approved',
      createdByName: 'Purchase Officer',
      approvedByName: 'Warehouse Admin',
      paymentTerms: sup.paymentTerms,
      paymentStatus: 'unpaid',
      notes: `Pipeline Test PO for ${item.name}`,
    });

    setCreatedPO(po);
    updateStepStatus(
      2,
      'completed',
      `PO Issued: ${po.poNumber} for ${orderQty} ${item.unit} of "${item.name}" (Total: ${CURRENCY}${grandTotal.toLocaleString('en-IN')})`,
      po
    );
    setCurrentStep(2);
  };

  // -------------------------------------------------------------
  // STEP 3: Receive Inward Inventory from Supplier
  // -------------------------------------------------------------
  const executeStep3 = () => {
    const sup = createdSupplier || warehouseStorage.getSuppliers()[0];
    const po = createdPO;
    const inventory = storage.getInventory();
    const item =
      testItem || inventory.find((i) => i.category === sup.category) || inventory[0];

    updateStepStatus(3, 'running', 'Inwarding goods into Central Master Warehouse Hub...');

    const receivedQty = 150;
    const unitCost = item.costPrice || 25;
    const batchCode = `BATCH-${Date.now().toString().slice(-5)}`;
    const expiryDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const bill = warehouseStorage.createPurchaseBill({
      poReferenceId: po?.id,
      supplierId: sup.id,
      supplierName: sup.name,
      warehouseId: 'wh-central-amd',
      warehouseName: 'Central Warehouse',
      supplierInvoiceNo: `INV-TEST-${Date.now().toString().slice(-4)}`,
      billDate: new Date().toISOString().split('T')[0],
      receivedDate: new Date().toISOString().split('T')[0],
      items: [
        {
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          quantity: receivedQty,
          unitCost,
          unit: item.unit,
          taxRate: 5,
          taxAmount: Math.round(receivedQty * unitCost * 0.05),
          totalCost: Math.round(receivedQty * unitCost * 1.05),
          batchNumber: batchCode,
          mfgDate: new Date().toISOString().split('T')[0],
          expiryDate,
        },
      ],
      subtotal: receivedQty * unitCost,
      gstAmount: Math.round(receivedQty * unitCost * 0.05),
      freightCharges: 0,
      roundOff: 0,
      grandTotal: Math.round(receivedQty * unitCost * 1.05),
      paidAmount: 0,
      dueAmount: Math.round(receivedQty * unitCost * 1.05),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      paymentStatus: 'due',
      grnStatus: 'verified_stocked',
      receivedBy: 'Warehouse Inward Officer',
      notes: 'Inward verified via Pipeline Tester',
    });

    const batches = warehouseStorage.getBatches();
    const createdB = batches.find((b) => b.batchNumber === batchCode) || null;
    setCreatedBatch(createdB);

    updateStepStatus(
      3,
      'completed',
      `Goods Received (GRN ${bill.billNumber}): +${receivedQty} ${item.unit} stocked into Central Warehouse Hub. Batch #${batchCode} created (Expires: ${expiryDate}). PO marked RECEIVED.`,
      bill
    );
    setCurrentStep(3);
  };

  // -------------------------------------------------------------
  // STEP 4: Send Inventory to Store (Dispatch & Deliver)
  // -------------------------------------------------------------
  const executeStep4 = () => {
    const inventory = storage.getInventory();
    const stores = storage.getStores();
    const targetStore =
      stores.find((s) => s.id === selectedStoreId) || stores[0];
    const item =
      testItem || inventory.find((i) => i.stockQuantity > 20) || inventory[0];

    updateStepStatus(
      4,
      'running',
      `Dispatching transfer from Central Warehouse ➔ ${targetStore.shortName}...`
    );

    const dispatchQty = 40;
    const batchNumber = createdBatch?.batchNumber || 'BATCH-AMD-01';

    // 1. Create dispatched transfer
    const transfer = warehouseStorage.createStockTransfer({
      type: 'warehouse_to_store',
      sourceType: 'warehouse',
      sourceId: 'wh-central-amd',
      sourceName: 'Central Warehouse',
      destinationType: 'store',
      destinationId: targetStore.id,
      destinationName: targetStore.name,
      requestedDate: new Date().toISOString().split('T')[0],
      dispatchDate: new Date().toISOString().split('T')[0],
      status: 'dispatched_in_transit',
      items: [
        {
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          batchNumber,
          requestedQty: dispatchQty,
          dispatchedQty: dispatchQty,
          receivedQty: 0,
          unit: item.unit,
          unitCost: item.costPrice || 25,
        },
      ],
      vehicleNumber: 'GJ-01-RR-9090',
      carrierName: 'Richie Rich Express Van',
      driverContact: 'Sanjay Rawat (+91 98251 44332)',
      dispatchedBy: 'Warehouse Dispatch Officer',
      notes: 'Dispatched via Pipeline Tester',
    });

    setCreatedTransfer(transfer);

    // 2. Immediately receive at store with OTP
    warehouseStorage.receiveTransfer(transfer.id, `${targetStore.shortName} Manager`, {
      [item.id]: dispatchQty,
    });

    updateStepStatus(
      4,
      'completed',
      `Transfer Complete (${transfer.transferNumber}): ${dispatchQty} ${item.unit} transferred from Central WH ➔ ${targetStore.shortName}. (Central WH decremented, Store stock incremented).`,
      transfer
    );
    setCurrentStep(4);
  };

  // -------------------------------------------------------------
  // STEP 5: In-Store Stock Dips Below Minimum (Trigger Alert)
  // -------------------------------------------------------------
  const executeStep5 = () => {
    const inventory = storage.getInventory();
    const stores = storage.getStores();
    const targetStore =
      stores.find((s) => s.id === selectedStoreId) || stores[0];
    const item = testItem || inventory[0];

    updateStepStatus(
      5,
      'running',
      `Simulating POS retail sales at ${targetStore.shortName}...`
    );

    const minThreshold = Math.max(2, Math.round((item.lowStockThreshold || 10) * 0.4));
    const lowStockLevel = 1; // set to 1 unit (below minimum threshold)

    // Adjust store stock to low stock level
    warehouseStorage.adjustStoreStock(
      item.id,
      targetStore.id,
      lowStockLevel,
      'High Volume Weekend POS Sales Simulation',
      `${targetStore.shortName} POS Cashier`
    );

    // Emitted notification
    storage.addNotification({
      title: `⚠️ In-Store Low Stock: ${targetStore.shortName} - ${item.name}`,
      message: `URGENT: ${targetStore.shortName} stock dipped to ${lowStockLevel} ${item.unit} (Below Store Min Threshold: ${minThreshold} ${item.unit}). Replenish from Central Warehouse Hub immediately!`,
      type: 'low_stock',
      targetRole: 'admin',
      read: false,
      linkTab: 'store_stock',
    });

    updateStepStatus(
      5,
      'completed',
      `Low Stock Triggered! ${targetStore.shortName} stock is now ${lowStockLevel} ${item.unit} (Min Threshold: ${minThreshold}). Real-time notification & audio alert sent to Warehouse Dashboard.`,
      { store: targetStore.shortName, item: item.name, units: lowStockLevel, minThreshold }
    );
    setCurrentStep(5);
  };

  // -------------------------------------------------------------
  // STEP 6: Multi-Hub Inventory Verification
  // -------------------------------------------------------------
  const executeStep6 = () => {
    const stats = warehouseStorage.getOverviewStats();
    const inventory = storage.getInventory();
    const stores = storage.getStores();

    updateStepStatus(
      6,
      'completed',
      `Multi-Hub Verification: Central Master Warehouse = ${stats.centralWarehouseStockUnits} units | Total Across 4 Stores = ${stats.storesTotalStockUnits} units | In-Transit = ${stats.inTransitStockUnits} units.`,
      { stats, storesCount: stores.length, totalSKUs: inventory.length }
    );
    setCurrentStep(6);
  };

  // -------------------------------------------------------------
  // Run All Pipeline Steps Automatically
  // -------------------------------------------------------------
  const handleRunFullPipeline = async () => {
    setIsRunning(true);
    try {
      executeStep1();
      await new Promise((r) => setTimeout(r, 600));

      executeStep2();
      await new Promise((r) => setTimeout(r, 600));

      executeStep3();
      await new Promise((r) => setTimeout(r, 600));

      executeStep4();
      await new Promise((r) => setTimeout(r, 600));

      executeStep5();
      await new Promise((r) => setTimeout(r, 600));

      executeStep6();
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setCreatedSupplier(null);
    setCreatedPO(null);
    setCreatedBatch(null);
    setCreatedTransfer(null);
    setStepLogs([
      {
        step: 1,
        title: '1. Add Supplier / Distributor',
        status: 'pending',
        details: 'Create a new verified supplier under Paan, Cafe, or Essentials category.',
      },
      {
        step: 2,
        title: '2. Place Purchase Order (PO)',
        status: 'pending',
        details: 'Issue a formal PO to the new supplier with quantities, landed cost, and taxes.',
      },
      {
        step: 3,
        title: '3. Receive Inward Stock from Supplier',
        status: 'pending',
        details: 'Generate GRN & Inward Bill: Central Warehouse stock increases, batch created with expiry, PO marked received.',
      },
      {
        step: 4,
        title: '4. Send Inventory to Store (Dispatch & Delivery)',
        status: 'pending',
        details: 'Transfer stock from Central Warehouse to Store: WH stock decrements, Store allocation increments upon OTP receipt.',
      },
      {
        step: 5,
        title: '5. In-Store Stock Dips Below Minimum',
        status: 'pending',
        details: 'Simulate in-store POS sales taking store units below minimum threshold: Triggers Warehouse Low Stock Alert.',
      },
      {
        step: 6,
        title: '6. Warehouse Live Inventory Breakdown',
        status: 'pending',
        details: 'Verify live Central Master Warehouse stock vs individual store allocations across all branches.',
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden my-8 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">Warehouse Logic Pipeline Simulator</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LIVE END-TO-END TEST
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Execute and verify the full supply chain: Supplier ➔ PO ➔ Central WH ➔ Store Dispatch ➔ Low Stock Alert
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="p-5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Test Category
              </label>
              <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                {(['Paan', 'Cafe', 'Essentials'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      selectedCategory === cat
                        ? 'bg-indigo-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                Destination Store Outlet
              </label>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
              >
                <option value="bopal">Bopal Branch</option>
                <option value="gota">Gota Main</option>
                <option value="sindhubhavan">Sindhu Bhavan Lounge</option>
                <option value="sg_highway">SG Highway Drive-Thru</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleReset}
              disabled={isRunning}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleRunFullPipeline}
              disabled={isRunning}
              className="px-5 py-2 rounded-xl bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
              <span>Run Automated Pipeline Test</span>
            </button>
          </div>
        </div>

        {/* Step-by-Step Pipeline Logs */}
        <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto">
          {stepLogs.map((log) => (
            <div
              key={log.step}
              className={`p-4 rounded-2xl border transition-all ${
                log.status === 'completed'
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : log.status === 'running'
                  ? 'bg-indigo-50/50 border-indigo-200 shadow-xs'
                  : 'bg-white border-slate-200/80 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      log.status === 'completed'
                        ? 'bg-emerald-600 text-white'
                        : log.status === 'running'
                        ? 'bg-indigo-600 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {log.status === 'completed' ? <Check className="w-4 h-4" /> : log.step}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{log.title}</h4>
                    <p className="text-xs text-slate-600 mt-1">{log.details}</p>

                    {log.data && log.status === 'completed' && (
                      <div className="mt-2.5 p-2.5 bg-white rounded-xl border border-slate-200/80 font-mono text-[11px] text-slate-700 flex flex-wrap gap-x-4 gap-y-1">
                        {log.step === 1 && (
                          <>
                            <span>Supplier ID: <strong>{log.data.code}</strong></span>
                            <span>Category: <strong>{log.data.category}</strong></span>
                            <span>Terms: <strong>{log.data.paymentTerms}</strong></span>
                          </>
                        )}
                        {log.step === 2 && (
                          <>
                            <span>PO Number: <strong>{log.data.poNumber}</strong></span>
                            <span>Total: <strong>{CURRENCY}{log.data.grandTotal.toLocaleString('en-IN')}</strong></span>
                            <span>Status: <strong className="text-indigo-700">{log.data.status.toUpperCase()}</strong></span>
                          </>
                        )}
                        {log.step === 3 && (
                          <>
                            <span>GRN Ref: <strong>{log.data.billNumber}</strong></span>
                            <span>Items: <strong>{log.data.items?.length || 1} SKU</strong></span>
                            <span>Stock Inward: <strong className="text-emerald-700">Central Master Hub</strong></span>
                          </>
                        )}
                        {log.step === 4 && (
                          <>
                            <span>Transfer: <strong>{log.data.transferNumber}</strong></span>
                            <span>Route: <strong>Central Hub ➔ {log.data.destinationName}</strong></span>
                            <span>Delivery Status: <strong className="text-emerald-700">COMPLETED</strong></span>
                          </>
                        )}
                        {log.step === 5 && (
                          <>
                            <span>Outlet: <strong>{log.data.store}</strong></span>
                            <span>Stock Left: <strong className="text-rose-600">{log.data.units} units</strong></span>
                            <span>Threshold: <strong>{log.data.minThreshold} units</strong></span>
                          </>
                        )}
                        {log.step === 6 && (
                          <>
                            <span>Central Master Stock: <strong>{log.data.stats.centralWarehouseStockUnits} units</strong></span>
                            <span>Stores Total Stock: <strong>{log.data.stats.storesTotalStockUnits} units</strong></span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Step Manual Trigger */}
                <div className="shrink-0">
                  {log.status === 'pending' && (
                    <button
                      onClick={() => {
                        if (log.step === 1) executeStep1();
                        else if (log.step === 2) executeStep2();
                        else if (log.step === 3) executeStep3();
                        else if (log.step === 4) executeStep4();
                        else if (log.step === 5) executeStep5();
                        else if (log.step === 6) executeStep6();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-semibold text-[11px] border border-slate-200 transition-colors cursor-pointer"
                    >
                      Run Step {log.step}
                    </button>
                  )}
                  {log.status === 'completed' && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer with Direct Hub Navigation */}
        <div className="p-5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>All test mutations are committed to active real-time storage & audit log.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onNavigateTab('store_stock');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Store className="w-3.5 h-3.5 text-emerald-400" />
              <span>Inspect Store Stock</span>
            </button>
            <button
              onClick={() => {
                onClose();
                onNavigateTab('purchases');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
              <span>Inspect POs & Suppliers</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold transition-colors"
            >
              Close Tester
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
