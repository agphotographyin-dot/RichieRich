import React, { useState, useEffect } from 'react';
import { WarehouseHeader } from './WarehouseHeader';
import { WarehouseDashboardView } from './views/WarehouseDashboardView';
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
import { InventoryItem, StoreLocation } from '../../types';
import { warehouseStorage } from '../../services/warehouseStorage';
import { storage } from '../../services/storage';

interface WarehousePortalProps {
  currentTab?: WarehouseTab;
  onTabChange?: (tab: WarehouseTab) => void;
}

export const WarehousePortal: React.FC<WarehousePortalProps> = ({
  currentTab = 'dashboard',
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState<WarehouseTab>(currentTab);
  const [subRole, setSubRole] = useState<WarehouseSubRole>(warehouseStorage.getActiveSubRole());
  const [searchQuery, setSearchQuery] = useState('');

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

  // Modal visibility states
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferInitialData, setTransferInitialData] = useState<Partial<StockTransfer> | null>(null);
  const [isIndentModalOpen, setIsIndentModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<string>('');
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [isAddWarehouseModalOpen, setIsAddWarehouseModalOpen] = useState(false);
  const [receivingTransfer, setReceivingTransfer] = useState<StockTransfer | null>(null);

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

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
      {/* Navigation and Top Bar */}
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
        nearExpiryCount={nearExpiryCount}
        inTransitCount={inTransitCount}
        lowStockCount={lowStockCount}
        overdueBillsCount={overdueBillsCount}
      />

      {/* Render Active View */}
      {activeTab === 'dashboard' && (
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
        />
      )}

      {activeTab === 'inventory' && (
        <WarehouseInventoryView
          inventory={inventory}
          batches={batches}
          warehouses={warehouses}
          searchQuery={searchQuery}
          onOpenInwardBill={() => setIsInwardModalOpen(true)}
          onOpenTransfer={() => {
            setTransferInitialData(null);
            setIsTransferModalOpen(true);
          }}
        />
      )}

      {activeTab === 'store_stock' && (
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
      )}

      {activeTab === 'transfers' && (
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
      )}

      {activeTab === 'purchases' && (
        <WarehousePurchasesView
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
          purchaseBills={purchaseBills}
          ledgerEntries={ledgerEntries}
          warehouses={warehouses}
          searchQuery={searchQuery}
          onOpenNewPO={() => setIsPOModalOpen(true)}
          onOpenInwardBill={() => setIsInwardModalOpen(true)}
          onOpenRecordPayment={(supId) => {
            setSelectedSupplierForPayment(supId);
            setIsPaymentModalOpen(true);
          }}
          onOpenAddSupplier={() => setIsAddSupplierModalOpen(true)}
        />
      )}

      {activeTab === 'locations' && (
        <WarehouseLocationsView
          warehouses={warehouses}
          stores={stores}
          inventory={inventory}
          onOpenAddWarehouse={() => setIsAddWarehouseModalOpen(true)}
          onOpenTransfer={() => setIsTransferModalOpen(true)}
          onNavigateTab={handleSelectTab}
        />
      )}

      {activeTab === 'adjustments' && (
        <WarehouseAdjustmentsView
          adjustments={adjustments}
          warehouses={warehouses}
          searchQuery={searchQuery}
          onOpenAdjustmentModal={() => setIsAdjustmentModalOpen(true)}
        />
      )}

      {activeTab === 'audit_trail' && (
        <WarehouseAuditTrailView
          auditTrail={auditTrail}
          searchQuery={searchQuery}
        />
      )}

      {activeTab === 'reports' && (
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
        onClose={() => setIsInwardModalOpen(false)}
        suppliers={suppliers}
        warehouses={warehouses}
        inventory={inventory}
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
    </div>
  );
};
