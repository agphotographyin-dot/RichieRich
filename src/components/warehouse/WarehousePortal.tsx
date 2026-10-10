import React, { useState, useEffect, useMemo, useTransition } from 'react';
import {
  FileSpreadsheet,
  PackagePlus,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { WarehouseHeader } from './WarehouseHeader';
import { WarehouseSidebar } from './WarehouseSidebar';
import { WarehouseDashboardView } from './views/WarehouseDashboardView';
import { WarehouseModernDashboardView } from './views/WarehouseModernDashboardView';
import { WarehouseInventoryView } from './views/WarehouseInventoryView';
import { WarehouseStoreStockView } from './views/WarehouseStoreStockView';
import { WarehouseTransfersView } from './views/WarehouseTransfersView';
import { WarehousePurchasesView } from './views/WarehousePurchasesView';
import { WarehouseLocationsView } from './views/WarehouseLocationsView';
import { WarehouseAdjustmentsView } from './views/WarehouseAdjustmentsView';
import { WarehouseAuditTrailView } from './views/WarehouseAuditTrailView';
import { WarehouseReportsView } from './views/WarehouseReportsView';

import { CreatePOModal } from './modals/CreatePOModal';
import { InwardBillModal } from './modals/InwardBillModal';
import { CreateTransferModal } from './modals/CreateTransferModal';
import { CreateIndentModal } from './modals/CreateIndentModal';
import { ReceiveTransferModal } from './modals/ReceiveTransferModal';
import { StockAdjustmentModal } from './modals/StockAdjustmentModal';
import { RecordPaymentModal } from './modals/RecordPaymentModal';
import { AddSupplierModal } from './modals/AddSupplierModal';
import { AddWarehouseModal } from './modals/AddWarehouseModal';
import { PipelineTesterModal } from './modals/PipelineTesterModal';
import { AddItemModal } from '../admin/AddItemModal';
import { RegisterBarcodeModal } from '../admin/RegisterBarcodeModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';

import {
  WarehouseTab,
  WarehouseSubRole,
  Warehouse,
  Supplier,
  PurchaseOrder,
  PurchaseBill,
  BatchRecord,
  StockTransfer,
  StoreStockIndent,
  StockAdjustment,
  StockMovementAudit,
  SupplierLedgerEntry,
} from '../../types/warehouse';
import { InventoryItem, StoreLocation, Category } from '../../types';
import { warehouseStorage } from '../../services/warehouseStorage';
import { storage } from '../../services/storage';

interface WarehousePortalProps {
  currentTab?: WarehouseTab;
  onTabChange?: (tab: WarehouseTab) => void;
  layoutMode?: 'modern' | 'classic';
  onToggleLayoutMode?: () => void;
}

export const WarehousePortal: React.FC<WarehousePortalProps> = ({
  currentTab = 'dashboard',
  onTabChange,
  layoutMode: externalLayoutMode,
  onToggleLayoutMode: externalToggleLayoutMode,
}) => {
  const [activeTab, setActiveTab] = useState<WarehouseTab>(currentTab);
  const [subRole, setSubRole] = useState<WarehouseSubRole>(warehouseStorage.getActiveSubRole());
  const [searchQuery, setSearchQuery] = useState('');

  // Internal layout mode state (syncs with external if provided)
  const [internalLayoutMode, setInternalLayoutMode] = useState<'modern' | 'classic'>(() => {
    try {
      const saved = localStorage.getItem('rr_wh_layout_mode');
      return saved === 'classic' ? 'classic' : 'modern';
    } catch {
      return 'modern';
    }
  });

  const layoutMode = externalLayoutMode ?? internalLayoutMode;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('rr_wh_sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('wh-central-amd');

  const toggleLayoutMode = () => {
    if (externalToggleLayoutMode) {
      externalToggleLayoutMode();
      return;
    }
    const next = layoutMode === 'modern' ? 'classic' : 'modern';
    setInternalLayoutMode(next);
    try {
      localStorage.setItem('rr_wh_layout_mode', next);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSidebarCollapse = () => {
    const next = !isSidebarCollapsed;
    setIsSidebarCollapsed(next);
    try {
      localStorage.setItem('rr_wh_sidebar_collapsed', String(next));
    } catch (e) {
      console.error(e);
    }
  };

  // State entities
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [indents, setIndents] = useState<StoreStockIndent[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [auditTrail, setAuditTrail] = useState<StockMovementAudit[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<SupplierLedgerEntry[]>([]);

  // Base state entities from main storage
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Modal visibility states
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [inwardInitialPO, setInwardInitialPO] = useState<PurchaseOrder | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferInitialData, setTransferInitialData] = useState<Partial<StockTransfer> | null>(null);
  const [isIndentModalOpen, setIsIndentModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<string>('');
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isAddWarehouseModalOpen, setIsAddWarehouseModalOpen] = useState(false);
  const [isPipelineTesterOpen, setIsPipelineTesterOpen] = useState(false);
  const [receivingTransfer, setReceivingTransfer] = useState<StockTransfer | null>(null);

  // Master Inventory and Catalog Modals
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isRegisterBarcodeOpen, setIsRegisterBarcodeOpen] = useState(false);
  const [registerBarcodeTargetItem, setRegisterBarcodeTargetItem] = useState<InventoryItem | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const loadData = () => {
    setWarehouses(warehouseStorage.getWarehouses());
    setSuppliers(warehouseStorage.getSuppliers());
    setPurchaseOrders(warehouseStorage.getPurchaseOrders());
    setPurchaseBills(warehouseStorage.getPurchaseBills());
    setBatches(warehouseStorage.getBatches());
    setTransfers(warehouseStorage.getStockTransfers());
    setIndents(warehouseStorage.getStoreIndents());
    setAdjustments(warehouseStorage.getStockAdjustments());
    setAuditTrail(warehouseStorage.getAuditTrail());
    setLedgerEntries(warehouseStorage.getSupplierLedger());

    setInventory(storage.getInventory());
    setStores(storage.getStores());
    setCategories(storage.getCategories());
  };

  useEffect(() => {
    loadData();
    const unsubWh = warehouseStorage.subscribe(() => {
      loadData();
    });
    const unsubStorage = storage.subscribe(() => {
      loadData();
    });
    return () => {
      unsubWh();
      unsubStorage();
    };
  }, []);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (currentTab && currentTab !== activeTab) {
      startTransition(() => {
        setActiveTab(currentTab);
      });
    }
  }, [currentTab]);

  const handleSelectTab = (tab: WarehouseTab) => {
    startTransition(() => {
      setActiveTab(tab);
    });
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const handleSubRoleChange = (role: WarehouseSubRole) => {
    setSubRole(role);
    warehouseStorage.setActiveSubRole(role);
  };

  // Calculated quick badge counts (memoized to avoid layout shifts and redundant calculations)
  const stats = useMemo(() => warehouseStorage.getOverviewStats(), [
    warehouses,
    suppliers,
    purchaseBills,
    batches,
    transfers,
    indents,
    inventory,
    stores,
  ]);
  const nearExpiryCount = useMemo(() => batches.filter((b) => b.status === 'near_expiry' && b.quantityInStock > 0).length, [batches]);
  const inTransitCount = useMemo(() => transfers.filter((t) => t.status === 'dispatched_in_transit').length, [transfers]);
  const lowStockCount = useMemo(() => inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold).length, [inventory]);
  const overdueBillsCount = useMemo(() => purchaseBills.filter((b) => b.dueAmount > 0).length, [purchaseBills]);

  const renderActiveView = (mode: 'modern' | 'classic') => {
    if (activeTab === 'dashboard') {
      if (mode === 'modern') {
        return (
          <WarehouseModernDashboardView
            stats={stats}
            warehouses={warehouses}
            stores={stores}
            inventory={inventory}
            batches={batches}
            transfers={transfers}
            indents={indents}
            bills={purchaseBills}
            auditTrail={auditTrail}
            onNavigateTab={handleSelectTab}
            onOpenNewPO={() => setIsPOModalOpen(true)}
            onOpenInwardBill={() => setIsInwardModalOpen(true)}
            onOpenTransfer={() => setIsTransferModalOpen(true)}
            onOpenIndent={() => setIsIndentModalOpen(true)}
            onOpenAdjustment={() => setIsAdjustmentModalOpen(true)}
            onOpenPipelineTester={() => setIsPipelineTesterOpen(true)}
          />
        );
      }
      return (
        <WarehouseDashboardView
          stats={stats}
          warehouses={warehouses}
          stores={stores}
          inventory={inventory}
          batches={batches}
          transfers={transfers}
          indents={indents}
          bills={purchaseBills}
          auditTrail={auditTrail}
          onNavigateTab={handleSelectTab}
          onOpenNewPO={() => setIsPOModalOpen(true)}
          onOpenInwardBill={() => setIsInwardModalOpen(true)}
          onOpenTransfer={() => setIsTransferModalOpen(true)}
          onOpenIndent={() => setIsIndentModalOpen(true)}
          onOpenAdjustment={() => setIsAdjustmentModalOpen(true)}
          onOpenPipelineTester={() => setIsPipelineTesterOpen(true)}
        />
      );
    }

    if (activeTab === 'inventory') {
      return (
        <WarehouseInventoryView
          inventory={inventory}
          batches={batches}
          warehouses={warehouses}
          categories={categories}
          searchQuery={searchQuery}
          onOpenInwardBill={() => setIsInwardModalOpen(true)}
          onOpenTransfer={() => {
            setTransferInitialData(null);
            setIsTransferModalOpen(true);
          }}
          onOpenAddItem={() => setIsAddItemOpen(true)}
          onOpenRegisterBarcode={(item) => {
            setRegisterBarcodeTargetItem(item || null);
            setIsRegisterBarcodeOpen(true);
          }}
          onOpenScanner={() => setIsScannerOpen(true)}
        />
      );
    }

    if (activeTab === 'store_stock') {
      return (
        <WarehouseStoreStockView
          stores={stores}
          inventory={inventory}
          warehouses={warehouses}
          searchQuery={searchQuery}
          onOpenTransferModal={(initial) => {
            setTransferInitialData(initial || null);
            setIsTransferModalOpen(true);
          }}
          onOpenIndentModal={() => setIsIndentModalOpen(true)}
        />
      );
    }

    if (activeTab === 'transfers') {
      return (
        <WarehouseTransfersView
          transfers={transfers}
          indents={indents}
          warehouses={warehouses}
          stores={stores}
          searchQuery={searchQuery}
          onOpenTransferModal={() => setIsTransferModalOpen(true)}
          onOpenIndentModal={() => setIsIndentModalOpen(true)}
          onOpenReceiveModal={(tr) => setReceivingTransfer(tr)}
          onRefresh={loadData}
          onOpenInwardBill={() => {
            setInwardInitialPO(null);
            setIsInwardModalOpen(true);
          }}
        />
      );
    }

    if (activeTab === 'purchases') {
      return (
        <WarehousePurchasesView
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
          purchaseBills={purchaseBills}
          ledgerEntries={ledgerEntries}
          warehouses={warehouses}
          searchQuery={searchQuery}
          onOpenNewPO={() => setIsPOModalOpen(true)}
          onOpenInwardBill={(po) => {
            setInwardInitialPO(po || null);
            setIsInwardModalOpen(true);
          }}
          onOpenRecordPayment={(supId) => {
            setSelectedSupplierForPayment(supId);
            setIsPaymentModalOpen(true);
          }}
          onOpenAddSupplier={() => setIsAddSupplierModalOpen(true)}
        />
      );
    }

    if (activeTab === 'locations') {
      return (
        <WarehouseLocationsView
          warehouses={warehouses}
          stores={stores}
          inventory={inventory}
          onOpenAddWarehouse={() => setIsAddWarehouseModalOpen(true)}
          onOpenTransfer={() => setIsTransferModalOpen(true)}
          onNavigateTab={handleSelectTab}
        />
      );
    }

    if (activeTab === 'adjustments') {
      return (
        <WarehouseAdjustmentsView
          adjustments={adjustments}
          warehouses={warehouses}
          searchQuery={searchQuery}
          onOpenAdjustmentModal={() => setIsAdjustmentModalOpen(true)}
        />
      );
    }

    if (activeTab === 'audit_trail') {
      return (
        <WarehouseAuditTrailView
          auditTrail={auditTrail}
          inventory={inventory}
          stores={stores}
          batches={batches}
          transfers={transfers}
          searchQuery={searchQuery}
        />
      );
    }

    if (activeTab === 'reports') {
      return (
        <WarehouseReportsView
          stats={stats}
          inventory={inventory}
          batches={batches}
          suppliers={suppliers}
          bills={purchaseBills}
          adjustments={adjustments}
          warehouses={warehouses}
          stores={stores}
        />
      );
    }

    return null;
  };

  return (
    <div className="w-full h-full bg-[#F8FAFC] text-slate-900 flex flex-col overflow-hidden font-sans selection:bg-amber-500 selection:text-slate-950">
      {layoutMode === 'modern' ? (
        /* ================= MODERN WORKSPACE LAYOUT (MATCHING STORE ADMIN SIDEBAR PLACEMENT) ================= */
        <div className="flex-1 min-h-0 flex flex-row w-full h-full overflow-hidden relative">
          {/* Left-side Navigation Panel (Same Placement & Height as Store Admin) */}
          <WarehouseSidebar
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            subRole={subRole}
            onChangeSubRole={handleSubRoleChange}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            onOpenNewPO={() => setIsPOModalOpen(true)}
            onOpenInwardBill={() => setIsInwardModalOpen(true)}
            onOpenTransfer={() => setIsTransferModalOpen(true)}
            onOpenIndent={() => setIsIndentModalOpen(true)}
            onOpenAdjustment={() => setIsAdjustmentModalOpen(true)}
            onOpenAddItem={() => setIsAddItemOpen(true)}
            onOpenPipelineTester={() => setIsPipelineTesterOpen(true)}
            nearExpiryCount={nearExpiryCount}
            inTransitCount={inTransitCount}
            lowStockCount={lowStockCount}
            overdueBillsCount={overdueBillsCount}
            layoutMode="modern"
            onToggleLayoutMode={toggleLayoutMode}
          />

          {/* Main Content Viewport: Independently scrollable, stays beside fixed sidebar */}
          <main className="flex-1 min-h-0 min-w-0 h-full p-2.5 sm:p-4 lg:p-5 space-y-4 overflow-y-auto overflow-x-hidden bg-[#F8FAFC]">
            {/* Breadcrumb & View Header */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <span>Enterprise HQ</span>
                  <span>/</span>
                  <span className="text-amber-600 font-extrabold">Central Logistics & Supply Chain</span>
                  <span>/</span>
                  <span className="text-slate-800 capitalize font-extrabold">
                    {activeTab.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {activeTab === 'dashboard' && 'Warehouse Executive Command Dashboard'}
                    {activeTab === 'inventory' && 'Central Master Stock & Batch Inventory'}
                    {activeTab === 'transfers' && 'Stock Transfers & Store Indent Fulfillments'}
                    {activeTab === 'purchases' && 'Vendor Purchase Orders & Inward Bills'}
                    {activeTab === 'store_stock' && 'Store Outlets Stock Allocation & Replenishment'}
                    {activeTab === 'locations' && 'Bin Locations & Storage Capacity'}
                    {activeTab === 'adjustments' && 'Stock Adjustments & Expiry Waste Control'}
                    {activeTab === 'audit_trail' && 'Complete System Movement & Audit Trail'}
                    {activeTab === 'reports' && 'Valuation, Expiry & Supplier Financial Reports'}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Warehouse Online</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono">
                    {warehouses[0]?.name || 'Central Ahmedabad WH'}
                  </span>
                </div>
              </div>

              {/* Quick action toolbar buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPOModalOpen(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer border border-indigo-500/30"
                  title="Issue Purchase Order"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Issue PO</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsInwardModalOpen(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer border border-emerald-500/30"
                  title="Inward Verified Bill & GRN"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>Inward Bill</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTransferInitialData(null);
                    setIsTransferModalOpen(true);
                  }}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer border border-amber-500/30"
                  title="Transfer Stock to Store Outlet"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Transfer Stock</span>
                </button>

                <button
                  type="button"
                  onClick={loadData}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-200"
                  title="Refresh Real-time Warehouse Data"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Tab View */}
            <div className="space-y-6">
              {isPending && (
                <div className="h-1 bg-indigo-100 overflow-hidden rounded-full">
                  <div className="h-full bg-indigo-600 animate-pulse w-full"></div>
                </div>
              )}
              {renderActiveView('modern')}
            </div>
          </main>
        </div>
      ) : (
        /* ================= CLASSIC TABBED LAYOUT ================= */
        <div className="p-3 sm:p-5 lg:p-6 space-y-4 animate-in fade-in duration-200">
          <WarehouseHeader
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            subRole={subRole}
            onChangeSubRole={handleSubRoleChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenNewPO={() => setIsPOModalOpen(true)}
            onOpenInwardBill={() => setIsInwardModalOpen(true)}
            onOpenTransfer={() => setIsTransferModalOpen(true)}
            onOpenIndent={() => setIsIndentModalOpen(true)}
            onOpenAdjustment={() => setIsAdjustmentModalOpen(true)}
            onOpenAddItem={() => setIsAddItemOpen(true)}
            onOpenPipelineTester={() => setIsPipelineTesterOpen(true)}
            nearExpiryCount={nearExpiryCount}
            inTransitCount={inTransitCount}
            lowStockCount={lowStockCount}
            overdueBillsCount={overdueBillsCount}
            layoutMode="classic"
            onToggleLayoutMode={toggleLayoutMode}
          />

          <div>{renderActiveView('classic')}</div>
        </div>
      )}

      {/* Modals */}
      <CreatePOModal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        suppliers={suppliers}
        warehouses={warehouses}
        stores={stores}
        inventory={inventory}
        onSuccess={loadData}
      />

      <InwardBillModal
        isOpen={isInwardModalOpen}
        onClose={() => {
          setIsInwardModalOpen(false);
          setInwardInitialPO(null);
        }}
        suppliers={suppliers}
        warehouses={warehouses}
        inventory={inventory}
        purchaseOrders={purchaseOrders}
        initialPO={inwardInitialPO}
        onSuccess={loadData}
      />

      <CreateTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferInitialData(null);
        }}
        warehouses={warehouses}
        stores={stores}
        inventory={inventory}
        batches={batches}
        initialData={transferInitialData}
        onSuccess={loadData}
      />

      <CreateIndentModal
        isOpen={isIndentModalOpen}
        onClose={() => setIsIndentModalOpen(false)}
        warehouses={warehouses}
        stores={stores}
        inventory={inventory}
        onSuccess={loadData}
      />

      <ReceiveTransferModal
        isOpen={Boolean(receivingTransfer)}
        onClose={() => setReceivingTransfer(null)}
        transfer={receivingTransfer}
        onSuccess={loadData}
      />

      <StockAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        warehouses={warehouses}
        stores={stores}
        inventory={inventory}
        batches={batches}
        onSuccess={loadData}
      />

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        supplierId={selectedSupplierForPayment}
        suppliers={suppliers}
        onSuccess={loadData}
      />

      <AddSupplierModal
        isOpen={isAddSupplierModalOpen}
        onClose={() => setIsAddSupplierModalOpen(false)}
        onSuccess={loadData}
      />

      <AddWarehouseModal
        isOpen={isAddWarehouseModalOpen}
        onClose={() => setIsAddWarehouseModalOpen(false)}
        onSuccess={loadData}
      />

      <PipelineTesterModal
        isOpen={isPipelineTesterOpen}
        onClose={() => setIsPipelineTesterOpen(false)}
        onNavigateTab={handleSelectTab}
      />

      {/* Master Inventory Modals */}
      <AddItemModal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        categories={categories}
      />

      <RegisterBarcodeModal
        isOpen={isRegisterBarcodeOpen}
        onClose={() => {
          setIsRegisterBarcodeOpen(false);
          setRegisterBarcodeTargetItem(null);
        }}
        inventory={inventory}
        preselectedItem={registerBarcodeTargetItem}
      />

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(code) => {
          setIsScannerOpen(false);
          const found = inventory.find((i) => i.barcode === code || i.sku === code);
          if (found) {
            setSearchQuery(found.name);
            setActiveTab('inventory');
          } else {
            setSearchQuery(code);
            setActiveTab('inventory');
          }
        }}
      />
    </div>
  );
};
