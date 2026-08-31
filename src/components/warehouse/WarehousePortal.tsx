import React, { useState, useEffect } from 'react';
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
    const unsubMain = storage.subscribe(() => {
      loadData();
    });
    return () => {
      unsubWh();
      unsubMain();
    };
  }, []);

  useEffect(() => {
    if (currentTab && currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [currentTab]);

  const handleSelectTab = (tab: WarehouseTab) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const handleSubRoleChange = (role: WarehouseSubRole) => {
    setSubRole(role);
    warehouseStorage.setActiveSubRole(role);
  };

  // Calculated quick badge counts
  const stats = warehouseStorage.getOverviewStats();
  const nearExpiryCount = batches.filter((b) => b.status === 'near_expiry' && b.quantityInStock > 0).length;
  const inTransitCount = transfers.filter((t) => t.status === 'dispatched_in_transit').length;
  const lowStockCount = inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold).length;
  const overdueBillsCount = purchaseBills.filter((b) => b.dueAmount > 0).length;

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
    <div className="w-full">
      {layoutMode === 'modern' ? (
        /* ================= MODERN WORKSPACE LAYOUT ================= */
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Body Frame: Left Sidebar + Central Workspace */}
          <div className="flex bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden min-h-[calc(100vh-8rem)]">
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

            {/* Central Workspace Container */}
            <div className="flex-1 p-3 sm:p-5 lg:p-6 bg-[#F8FAFC] overflow-y-auto min-w-0">
              {renderActiveView('modern')}
            </div>
          </div>
        </div>
      ) : (
        /* ================= CLASSIC TABBED LAYOUT ================= */
        <div className="space-y-4 animate-in fade-in duration-200">
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
