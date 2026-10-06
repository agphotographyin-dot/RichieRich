import React, { useState, useEffect } from 'react';
import {
  Store,
  Printer,
  RotateCcw,
  Plus,
  Scan,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  Receipt,
  FileSpreadsheet,
  Download,
  Building2,
  Users,
  AlertTriangle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import {
  InventoryItem,
  Order,
  Customer,
  Promotion,
  BackupSnapshot,
  AdminTab,
  UserRole,
  Category,
  StoreLocation,
} from '../../types';
import {
  Warehouse,
  Supplier,
  PurchaseOrder,
  PurchaseBill,
  BatchRecord,
  StockTransfer,
} from '../../types/warehouse';
import { storage } from '../../services/storage';
import { warehouseStorage } from '../../services/warehouseStorage';
import { soundEffects } from '../../services/audio';
import { pdfReportService } from '../../services/pdfReportService';

// Master Admin Subviews
import { AdminDashboard } from './AdminDashboard';
import { AdminInventoryView } from './AdminInventoryView';
import { AdminStaffCounters } from './AdminStaffCounters';
import { AdminAnalytics } from './AdminAnalytics';
import { AdminOrders } from './AdminOrders';
import { AdminLoyaltyPromos } from './AdminLoyaltyPromos';
import { AdminBackupsSecurity } from './AdminBackupsSecurity';

// Header & Sidebar
import { MasterAdminHeader } from './MasterAdminHeader';
import { MasterAdminSidebar } from './MasterAdminSidebar';

// Modals
import { AddItemModal } from './AddItemModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { RegisterBarcodeModal } from './RegisterBarcodeModal';
import { DateRangeStatementModal } from './DateRangeStatementModal';
import { DailyCollectionModal } from './DailyCollectionModal';
import { CreatePOModal } from '../warehouse/modals/CreatePOModal';
import { InwardBillModal } from '../warehouse/modals/InwardBillModal';
import { CreateTransferModal } from '../warehouse/modals/CreateTransferModal';

interface MasterAdminPortalProps {
  initialTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
  onLogout: () => void;
  onNavigateToStoreAdmin?: () => void;
  onNavigateToWarehouse?: () => void;
  onNavigateToPOS?: () => void;
  onNavigateToLanding?: () => void;
}

export const MasterAdminPortal: React.FC<MasterAdminPortalProps> = ({
  initialTab = 'dashboard',
  onTabChange,
  onLogout,
  onNavigateToStoreAdmin,
  onNavigateToWarehouse,
  onNavigateToPOS,
  onNavigateToLanding,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('rr_master_admin_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Entities state from reactive storage
  const [inventory, setInventory] = useState<InventoryItem[]>(storage.getInventory());
  const [categories, setCategories] = useState<Category[]>(storage.getCategories());
  const [orders, setOrders] = useState<Order[]>(storage.getOrders());
  const [customers, setCustomers] = useState<Customer[]>(storage.getCustomers());
  const [promotions, setPromotions] = useState<Promotion[]>(storage.getPromotions());
  const [backups, setBackups] = useState<BackupSnapshot[]>(storage.getBackups());
  const [stores, setStores] = useState<StoreLocation[]>(storage.getStores());

  // Warehouse Entities
  const [warehouses, setWarehouses] = useState<Warehouse[]>(warehouseStorage.getWarehouses());
  const [suppliers, setSuppliers] = useState<Supplier[]>(warehouseStorage.getSuppliers());
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(warehouseStorage.getPurchaseOrders());
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>(warehouseStorage.getPurchaseBills());
  const [batches, setBatches] = useState<BatchRecord[]>(warehouseStorage.getBatches());
  const [transfers, setTransfers] = useState<StockTransfer[]>(warehouseStorage.getStockTransfers());

  // Modal States
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isRegisterBarcodeOpen, setIsRegisterBarcodeOpen] = useState(false);
  const [selectedItemForBarcode, setSelectedItemForBarcode] = useState<InventoryItem | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isDailyCollectionOpen, setIsDailyCollectionOpen] = useState(false);

  // Warehouse Operations Modal States (Requested in Inventory Tab)
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferInitialData, setTransferInitialData] = useState<Partial<StockTransfer> | null>(null);

  // Synchronize on external tab change
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const refreshAllData = () => {
    setInventory(storage.getInventory());
    setCategories(storage.getCategories());
    setOrders(storage.getOrders());
    setCustomers(storage.getCustomers());
    setPromotions(storage.getPromotions());
    setBackups(storage.getBackups());
    setStores(storage.getStores());
    setWarehouses(warehouseStorage.getWarehouses());
    setSuppliers(warehouseStorage.getSuppliers());
    setPurchaseOrders(warehouseStorage.getPurchaseOrders());
    setPurchaseBills(warehouseStorage.getPurchaseBills());
    setBatches(warehouseStorage.getBatches());
    setTransfers(warehouseStorage.getStockTransfers());
  };

  // Subscribe to central storage changes
  useEffect(() => {
    const unsubMain = storage.subscribe(refreshAllData);
    const unsubWh = warehouseStorage.subscribe(refreshAllData);
    return () => {
      unsubMain();
      unsubWh();
    };
  }, []);

  const triggerRefresh = () => {
    soundEffects.playClick();
    refreshAllData();
    setRefreshKey((prev) => prev + 1);
  };

  const handleTabSelect = (tab: AdminTab) => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const toggleSidebarCollapse = () => {
    soundEffects.playClick();
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('rr_master_admin_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Low stock calculation across all stores & central inventory
  const lowStockCount = inventory.filter(
    (item) => item.stockQuantity <= (item.lowStockThreshold || 10)
  ).length;

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <MasterAdminHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        lowStockCount={lowStockCount}
        storesCount={stores.length}
        totalOrdersCount={orders.length}
        onOpenAddItem={() => setIsAddItemOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenStatement={() => setIsStatementOpen(true)}
        onRefresh={triggerRefresh}
        onLogout={onLogout}
        onNavigateToStoreAdmin={onNavigateToStoreAdmin}
        onNavigateToWarehouse={onNavigateToWarehouse}
        onNavigateToPOS={onNavigateToPOS}
        onNavigateToLanding={onNavigateToLanding}
      />

      {/* Body Container: Sidebar + Main Content */}
      <div className="flex-1 flex flex-col md:flex-row w-full relative min-h-[calc(100vh-4rem)]">
        {/* Collapsible Dark Enterprise Sidebar */}
        <MasterAdminSidebar
          activeTab={activeTab}
          onSelectTab={handleTabSelect}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          onOpenAddItem={() => setIsAddItemOpen(true)}
          onOpenScanner={() => setIsScannerOpen(true)}
          onOpenStatement={() => setIsStatementOpen(true)}
          storesCount={stores.length}
          totalOrdersCount={orders.length}
          totalItemsCount={inventory.length}
          lowStockCount={lowStockCount}
          customersCount={customers.length}
          backupsCount={backups.length}
          onLogout={onLogout}
          onNavigateToStoreAdmin={onNavigateToStoreAdmin}
          onNavigateToWarehouse={onNavigateToWarehouse}
          onNavigateToPOS={onNavigateToPOS}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6 space-y-5 overflow-x-hidden bg-[#F8FAFC]">
          {/* Breadcrumb & View Header Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <span>Enterprise HQ</span>
                <span>/</span>
                <span className="text-amber-600 font-extrabold">Master Administration</span>
                <span>/</span>
                <span className="text-slate-800 capitalize font-extrabold">
                  {activeTab.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {activeTab === 'dashboard' && 'Central Executive Command Dashboard'}
                  {activeTab === 'inventory' && 'Master Inventory & Warehouse Operations Hub'}
                  {activeTab === 'analytics' && 'Consolidated Financial Analytics & Profit Margins'}
                  {activeTab === 'staff_counters' && 'Store Outlets, Staff Rosters & Counter Terminals'}
                  {activeTab === 'orders' && 'Central Master Orders & POS Transaction Registry'}
                  {activeTab === 'loyalty_promos' && 'Customer Loyalty Program & Promotional Campaigns'}
                  {activeTab === 'backups' && 'Enterprise Security, PIN Locks & Database Backups'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>HQ Real-time</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono">
                  {stores.length} Outlets Connected
                </span>
              </div>
            </div>

            {/* Quick action shortcuts */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleTabSelect('inventory')}
                className={`px-3.5 py-2 text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all border ${
                  activeTab === 'inventory'
                    ? 'bg-amber-600 text-white border-amber-500'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Inventory Hub</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDailyCollectionOpen(true)}
                className="px-3 py-2 bg-[#1E293B] hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                title="View Daily POS Collection Summary"
              >
                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                <span>Daily Summary</span>
              </button>

              <button
                type="button"
                onClick={() => setIsStatementOpen(true)}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-xs transition-colors"
                title="Print Enterprise Report"
              >
                <Printer className="w-3.5 h-3.5 text-amber-600" />
                <span>Statement</span>
              </button>

              <button
                type="button"
                onClick={triggerRefresh}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-200"
                title="Refresh Real-time Data"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab View Content Component Mounting */}
          <div key={refreshKey} className="space-y-6">
            {activeTab === 'dashboard' && (
              <AdminDashboard
                inventory={inventory}
                orders={orders}
                customers={customers}
                onOpenScanner={() => setIsScannerOpen(true)}
                onOpenAddItem={() => setIsAddItemOpen(true)}
                onNavigateTab={handleTabSelect}
                onNavigateRole={(role) => {
                  if (role === 'store_admin' && onNavigateToStoreAdmin) onNavigateToStoreAdmin();
                  else if (role === 'warehouse' && onNavigateToWarehouse) onNavigateToWarehouse();
                  else if (role === 'pos' && onNavigateToPOS) onNavigateToPOS();
                }}
              />
            )}

            {/* TAB: INVENTORY & WAREHOUSE CONTROL HUB */}
            {activeTab === 'inventory' && (
              <AdminInventoryView
                inventory={inventory}
                categories={categories}
                stores={stores}
                onOpenAddItem={() => setIsAddItemOpen(true)}
                onOpenScanner={() => setIsScannerOpen(true)}
                onOpenPO={() => setIsPOModalOpen(true)}
                onOpenInwardBill={() => setIsInwardModalOpen(true)}
                onOpenTransferStock={(initial) => {
                  setTransferInitialData(initial || null);
                  setIsTransferModalOpen(true);
                }}
                onOpenRegisterBarcode={(item) => {
                  setSelectedItemForBarcode(item || null);
                  setIsRegisterBarcodeOpen(true);
                }}
                onRefresh={triggerRefresh}
              />
            )}

            {activeTab === 'staff_counters' && (
              <AdminStaffCounters
                onNavigateToStoreAdmin={(storeId) => {
                  if (onNavigateToStoreAdmin) onNavigateToStoreAdmin();
                }}
              />
            )}

            {activeTab === 'analytics' && (
              <AdminAnalytics inventory={inventory} orders={orders} />
            )}

            {activeTab === 'orders' && <AdminOrders orders={orders} />}

            {activeTab === 'loyalty_promos' && (
              <AdminLoyaltyPromos customers={customers} promotions={promotions} />
            )}

            {activeTab === 'backups' && (
              <AdminBackupsSecurity backups={backups} />
            )}
          </div>
        </main>
      </div>

      {/* Global Modals Mounted at Portal Root */}
      <AddItemModal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        categories={categories}
      />

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(barcode) => {
          soundEffects.playScanBeep();
          setIsScannerOpen(false);
        }}
      />

      <RegisterBarcodeModal
        isOpen={isRegisterBarcodeOpen}
        onClose={() => {
          setIsRegisterBarcodeOpen(false);
          setSelectedItemForBarcode(null);
        }}
        inventory={inventory}
        preselectedItem={selectedItemForBarcode}
        onBarcodeRegistered={() => {
          triggerRefresh();
        }}
      />

      <DateRangeStatementModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
        orders={orders}
        stores={stores}
      />

      <DailyCollectionModal
        isOpen={isDailyCollectionOpen}
        onClose={() => setIsDailyCollectionOpen(false)}
        orders={orders}
        stores={stores}
      />

      {/* Warehouse Relevant Modals (Issue PO, Inward Bill, Transfer Stock) */}
      <CreatePOModal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        suppliers={suppliers}
        warehouses={warehouses}
        stores={stores}
        inventory={inventory}
        onSuccess={() => {
          triggerRefresh();
        }}
      />

      <InwardBillModal
        isOpen={isInwardModalOpen}
        onClose={() => setIsInwardModalOpen(false)}
        suppliers={suppliers}
        warehouses={warehouses}
        inventory={inventory}
        purchaseOrders={purchaseOrders}
        onSuccess={() => {
          triggerRefresh();
        }}
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
        onSuccess={() => {
          triggerRefresh();
        }}
      />
    </div>
  );
};
