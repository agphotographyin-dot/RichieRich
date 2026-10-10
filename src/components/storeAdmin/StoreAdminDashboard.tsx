import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  Receipt,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Filter,
  Download,
  Printer,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Users,
  Package,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Tag,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  RotateCcw,
  X,
  Phone,
  BarChart3,
  Truck,
  ClipboardCheck,
  PanelLeft,
} from 'lucide-react';
import {
  StoreLocation,
  StoreExpense,
  StoreFinancialSummary,
  StoreAdminCredential,
  Order,
  InventoryItem,
} from '../../types';
import { PurchaseOrder, Supplier } from '../../types/warehouse';
import { storage, getBoxLooseStockSummary, isBoxDenominatedUnit } from '../../services/storage';
import { warehouseStorage } from '../../services/warehouseStorage';
import { authService } from '../../services/auth';
import { soundEffects } from '../../services/audio';
import { pdfReportService } from '../../services/pdfReportService';
import { StoreStatementModal } from './StoreStatementModal';
import { StoreIndentsView } from './StoreIndentsView';
import { CreateStoreIndentModal } from './CreateStoreIndentModal';
import { DirectStorePurchasesView } from './DirectStorePurchasesView';
import { CreateDirectStorePOModal } from './CreateDirectStorePOModal';
import { ReceiveDirectStoreGoodsModal } from './ReceiveDirectStoreGoodsModal';
import { StoreStockAuditModal } from './StoreStockAuditModal';
import { StoreSuppliersView } from './StoreSuppliersView';
import { SupplierModal } from './SupplierModal';
import { StoreAdminSidebar, StoreAdminTabId } from './StoreAdminSidebar';
import { StoreAdminHeader } from './StoreAdminHeader';
import { AdminOrders } from '../admin/AdminOrders';
import { AdminPrinterSetupView } from '../admin/AdminPrinterSetupView';
import { isToday, getLocalDateString } from '../../utils/dateUtils';

interface StoreAdminDashboardProps {
  initialStoreId?: string;
  initialTab?: string;
  onTabChange?: (tab: StoreAdminTabId) => void;
  onLogout: () => void;
  onNavigateToWarehouse?: () => void;
  onNavigateToAdmin?: () => void;
}

export const StoreAdminDashboard: React.FC<StoreAdminDashboardProps> = ({
  initialStoreId,
  initialTab,
  onTabChange,
  onLogout,
  onNavigateToWarehouse,
  onNavigateToAdmin,
}) => {
  const authState = authService.getStoreAdminAuthState();
  
  // Refresh trigger for real-time reactivity across POS, Warehouse, Admin, and Store Admin
  const [refreshKey, setRefreshKey] = useState(0);

  // Subscribe to real-time events from storage & warehouse storage
  useEffect(() => {
    const unsubMain = storage.subscribe(() => {
      setRefreshKey((prev) => prev + 1);
    });
    const unsubWh = warehouseStorage.subscribe(() => {
      setRefreshKey((prev) => prev + 1);
    });
    return () => {
      unsubMain();
      unsubWh();
    };
  }, []);

  const stores = useMemo(() => storage.getStores(), [refreshKey]);
  
  // Current active store ID
  const [activeStoreId, setActiveStoreId] = useState<string>(() => {
    return authState.storeId || initialStoreId || stores[0]?.id || 'bopal';
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('rr_store_admin_sidebar_collapsed');
      if (saved !== null) return saved === 'true';
      return typeof window !== 'undefined' && window.innerWidth < 1024;
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    const next = !isSidebarCollapsed;
    setIsSidebarCollapsed(next);
    try {
      localStorage.setItem('rr_store_admin_sidebar_collapsed', String(next));
    } catch (e) {
      console.error(e);
    }
  };

  const [globalSearch, setGlobalSearch] = useState('');

  const mapPropToTab = (tab?: string): StoreAdminTabId => {
    if (!tab) return 'financials';
    if (tab === 'expenses') return 'expenses';
    if (tab === 'sales_orders' || tab === 'orders') return 'sales_orders';
    if (tab === 'staff_counters' || tab === 'staff') return 'staff_counters';
    if (tab === 'store_inventory' || tab === 'inventory') return 'store_inventory';
    if (tab === 'stock_indents' || tab === 'indents' || tab === 'store_indents') return 'stock_indents';
    if (tab === 'manage_stock' || tab === 'direct_purchases' || tab === 'purchases' || tab === 'direct_po') return 'manage_stock';
    if (tab === 'suppliers' || tab === 'vendors' || tab === 'supplier_management') return 'suppliers';
    if (tab === 'printer_setup' || tab === 'printer' || tab === 'printing') return 'printer_setup';
    return 'financials';
  };

  const [activeTab, setActiveTab] = useState<StoreAdminTabId>(() => mapPropToTab(initialTab));

  useEffect(() => {
    if (initialTab) {
      setActiveTab(mapPropToTab(initialTab));
    }
  }, [initialTab]);

  const handleTabSelect = (tab: StoreAdminTabId) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Add Expense modal state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<StoreExpense['category']>('daily_supplies');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expensePaymentMode, setExpensePaymentMode] = useState<StoreExpense['paymentMode']>('cash');
  const [expensePaidBy, setExpensePaidBy] = useState(authState.adminName || 'Store Manager');
  const [expenseRecipient, setExpenseRecipient] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [expenseReceiptNo, setExpenseReceiptNo] = useState('');

  // Edit Expense modal state (BUG FIX: Implemented full Edit modal)
  const [editingExpense, setEditingExpense] = useState<StoreExpense | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<StoreExpense['category']>('daily_supplies');
  const [editAmount, setEditAmount] = useState('');
  const [editPaymentMode, setEditPaymentMode] = useState<StoreExpense['paymentMode']>('cash');
  const [editPaidBy, setEditPaidBy] = useState('');
  const [editRecipient, setEditRecipient] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReceiptNo, setEditReceiptNo] = useState('');

  // Search and Filter states
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');
  const [expensePaymentFilter, setExpensePaymentFilter] = useState<string>('all');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<string>('all');
  const [inventoryPage, setInventoryPage] = useState(1);
  const [inventoryPageSize, setInventoryPageSize] = useState<number | 'all'>(25);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);

  // Store Inventory Indents State
  const [isCreateIndentOpen, setIsCreateIndentOpen] = useState(false);
  const [indentPreselectedItem, setIndentPreselectedItem] = useState<InventoryItem | null>(null);

  // Direct Store Purchasing (Manage Stock) State
  const [isCreateDirectPOOpen, setIsCreateDirectPOOpen] = useState(false);
  const [directPOPreselectedItem, setDirectPOPreselectedItem] = useState<InventoryItem | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedPOForReceive, setSelectedPOForReceive] = useState<PurchaseOrder | null>(null);

  // Store Stock Audit State (Physical Stock Count & Discrepancy Adjustment)
  const [isStockAuditOpen, setIsStockAuditOpen] = useState(false);
  const [auditPreselectedItem, setAuditPreselectedItem] = useState<InventoryItem | null>(null);

  // Supplier Management State
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [preselectedSupplierForPO, setPreselectedSupplierForPO] = useState<string | undefined>(undefined);

  const currentStore = stores.find((s) => s.id === activeStoreId) || stores[0];

  // Count pending indents for this store
  const pendingIndentsCount = useMemo(() => {
    return warehouseStorage
      .getStoreIndents()
      .filter((ind) => ind.storeId === activeStoreId && ind.status === 'pending').length;
  }, [activeStoreId, refreshKey]);

  // Count active direct store POs (sent to supplier or partially received)
  const activeDirectPOCount = useMemo(() => {
    return warehouseStorage
      .getDirectStorePOs(activeStoreId)
      .filter((po) => po.status === 'sent_to_supplier' || po.status === 'partially_received').length;
  }, [activeStoreId, refreshKey]);

  // Fetch Financials, Orders, Expenses, and Stock for current store
  const financialSummary: StoreFinancialSummary = useMemo(() => {
    return storage.getStoreFinancialSummary(activeStoreId);
  }, [activeStoreId, refreshKey]);

  const allExpenses: StoreExpense[] = useMemo(() => {
    return storage.getStoreExpenses(activeStoreId);
  }, [activeStoreId, refreshKey]);

  const allOrders: Order[] = useMemo(() => {
    return storage.getOrders().filter((o) => o.storeId === activeStoreId);
  }, [activeStoreId, refreshKey]);

  const storeInventory: InventoryItem[] = useMemo(() => {
    return storage.getInventory();
  }, [refreshKey]);

  const allSuppliers: Supplier[] = useMemo(() => {
    return warehouseStorage.getSuppliers();
  }, [refreshKey]);

  const triggerRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return allExpenses.filter((exp) => {
      const expTitle = exp.title || exp.description || '';
      const expRecipient = exp.paidToOrRecipient || exp.paidTo || '';
      const expReceipt = exp.receiptNumber || exp.voucherNumber || '';
      const matchSearch =
        expTitle.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        expRecipient.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        expReceipt.toLowerCase().includes(expenseSearch.toLowerCase());
      const matchCategory =
        expenseCategoryFilter === 'all' || exp.category === expenseCategoryFilter;
      const expPayMode = exp.paymentMode || (exp.paymentMethod === 'cash' ? 'cash' : 'online');
      const matchPayment =
        expensePaymentFilter === 'all' || expPayMode === expensePaymentFilter;
      return matchSearch && matchCategory && matchPayment;
    });
  }, [allExpenses, expenseSearch, expenseCategoryFilter, expensePaymentFilter]);

  // Filtered Inventory for Store (BUG FIX: Full search and category filtering)
  const filteredInventory = useMemo(() => {
    return storeInventory.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(inventorySearch.toLowerCase())) ||
        (item.barcode && item.barcode.includes(inventorySearch));
      const matchCategory =
        inventoryCategoryFilter === 'all' || item.category === inventoryCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [storeInventory, inventorySearch, inventoryCategoryFilter]);

  // Paginated inventory slice (max 25 per page default)
  const totalInventoryPages = useMemo(() => {
    if (inventoryPageSize === 'all') return 1;
    return Math.max(1, Math.ceil(filteredInventory.length / (inventoryPageSize as number)));
  }, [filteredInventory.length, inventoryPageSize]);

  const paginatedInventory = useMemo(() => {
    if (inventoryPageSize === 'all') return filteredInventory;
    const startIndex = (inventoryPage - 1) * (inventoryPageSize as number);
    return filteredInventory.slice(startIndex, startIndex + (inventoryPageSize as number));
  }, [filteredInventory, inventoryPage, inventoryPageSize]);

  // Real-time counter metrics (both today resetting after 12:00 AM midnight and all-time)
  const counterStats = useMemo(() => {
    const stats: Record<
      number,
      {
        ordersCountToday: number;
        revenueToday: number;
        cashToday: number;
        upiToday: number;
        ordersCountAllTime: number;
        revenueAllTime: number;
      }
    > = {};

    currentStore.counters.forEach((c) => {
      stats[c.id] = {
        ordersCountToday: 0,
        revenueToday: 0,
        cashToday: 0,
        upiToday: 0,
        ordersCountAllTime: 0,
        revenueAllTime: 0,
      };
    });

    allOrders.forEach((o) => {
      const cId = o.counterNumber || 1;
      if (stats[cId]) {
        const orderAmt = o.grandTotal ?? 0;
        const isOrderToday = isToday(o.createdAt);

        // All-time metrics
        stats[cId].ordersCountAllTime += 1;
        stats[cId].revenueAllTime += orderAmt;

        // Today's metrics (strictly since 12:00 AM)
        if (isOrderToday) {
          stats[cId].ordersCountToday += 1;
          stats[cId].revenueToday += orderAmt;
          if (o.paymentMethod === 'cash') stats[cId].cashToday += orderAmt;
          else stats[cId].upiToday += orderAmt;
        }
      }
    });

    return stats;
  }, [currentStore, allOrders]);

  // Add Expense Handler
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseAmount);
    if (!expenseTitle.trim() || isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid expense title and amount.');
      return;
    }

    storage.addStoreExpense({
      storeId: activeStoreId,
      storeName: currentStore.name,
      category: expenseCategory,
      title: expenseTitle.trim(),
      description: expenseNotes.trim() || expenseTitle.trim(),
      amount: amountNum,
      paymentMethod: expensePaymentMode === 'cash' ? 'cash' : 'upi',
      paymentMode: expensePaymentMode,
      paidBy: expensePaidBy.trim() || authState.adminName || 'Store Manager',
      paidTo: expenseRecipient.trim() || 'Local Vendor',
      paidToOrRecipient: expenseRecipient.trim() || undefined,
      notes: expenseNotes.trim() || undefined,
      receiptNumber: expenseReceiptNo.trim() || undefined,
      voucherNumber: expenseReceiptNo.trim() || undefined,
      loggedBy: authState.adminName || 'Store Admin',
      date: new Date().toISOString().split('T')[0],
    });

    soundEffects.playSuccessChime();
    triggerRefresh();
    setIsAddExpenseOpen(false);

    // Reset Form
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseRecipient('');
    setExpenseNotes('');
    setExpenseReceiptNo('');
  };

  // Open Edit Expense Modal
  const handleOpenEditExpense = (exp: StoreExpense) => {
    setEditingExpense(exp);
    setEditTitle(exp.title || exp.description || '');
    setEditCategory(exp.category);
    setEditAmount(exp.amount.toString());
    setEditPaymentMode(exp.paymentMode || (exp.paymentMethod === 'cash' ? 'cash' : 'online'));
    setEditPaidBy(exp.paidBy || '');
    setEditRecipient(exp.paidToOrRecipient || exp.paidTo || '');
    setEditNotes(exp.notes || '');
    setEditReceiptNo(exp.receiptNumber || exp.voucherNumber || '');
  };

  // Submit Edit Expense (BUG FIX)
  const handleSaveEditExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    const amountNum = parseFloat(editAmount);
    if (!editTitle.trim() || isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid expense title and amount.');
      return;
    }

    storage.updateStoreExpense(editingExpense.id, {
      title: editTitle.trim(),
      description: editNotes.trim() || editTitle.trim(),
      category: editCategory,
      amount: amountNum,
      paymentMethod: editPaymentMode === 'cash' ? 'cash' : 'upi',
      paymentMode: editPaymentMode,
      paidBy: editPaidBy.trim(),
      paidTo: editRecipient.trim() || 'Local Vendor',
      paidToOrRecipient: editRecipient.trim() || undefined,
      notes: editNotes.trim() || undefined,
      receiptNumber: editReceiptNo.trim() || undefined,
      voucherNumber: editReceiptNo.trim() || undefined,
    });

    soundEffects.playSuccessChime();
    triggerRefresh();
    setEditingExpense(null);
  };

  // Delete Expense Handler
  const handleDeleteExpense = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete expense "${title}"?`)) {
      storage.deleteStoreExpense(id);
      soundEffects.playTrash();
      triggerRefresh();
    }
  };

  // Category labels and colors using Warehouse palette (Slate & Amber)
  const getCategoryBadge = (cat: StoreExpense['category'] | string) => {
    switch (cat) {
      case 'staff_salary':
        return { label: 'Staff Salary & Advance', color: 'bg-amber-50 text-amber-900 border-amber-200 font-bold' };
      case 'daily_supplies':
        return { label: 'Daily Supplies & Perishables', color: 'bg-slate-100 text-slate-800 border-slate-200 font-bold' };
      case 'electricity_utility':
        return { label: 'Electricity & Utilities', color: 'bg-amber-50 text-amber-900 border-amber-200' };
      case 'rent_lease':
        return { label: 'Store Rent & Lease', color: 'bg-blue-50 text-blue-900 border-blue-200' };
      case 'maintenance_repairs':
      case 'maintenance':
        return { label: 'Maintenance & Repairs', color: 'bg-orange-50 text-orange-900 border-orange-200' };
      case 'store_refreshments':
      case 'cleaning':
        return { label: 'Refreshments & Cleaning', color: 'bg-slate-100 text-slate-800 border-slate-200' };
      case 'local_vendor':
        return { label: 'Local Vendor Purchase', color: 'bg-amber-50 text-amber-900 border-amber-200' };
      default:
        return { label: 'Miscellaneous Outflow', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
  };

  const printStoreFinancialReport = () => {
    soundEffects.playClick();
    setIsStatementModalOpen(true);
  };

  const handleExportPDF = () => {
    soundEffects.playSuccessChime();
    pdfReportService.exportStoreFinancialStatementPDF(
      currentStore,
      financialSummary,
      allOrders,
      allExpenses
    );
  };

  // Low stock calculation for current store
  const lowStockItemsCount = useMemo(() => {
    return storeInventory.filter((item) => {
      const allocatedStock = item.storeAllocations?.[activeStoreId] ?? 0;
      return allocatedStock <= (item.lowStockThreshold || 10);
    }).length;
  }, [storeInventory, activeStoreId]);

  return (
    <div className="w-full h-full bg-[#F8FAFC] text-slate-900 flex flex-col overflow-hidden font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Body Container: Fixed Sidebar + Scrollable Main Content */}
      <div className="flex-1 min-h-0 flex flex-row w-full h-full overflow-hidden relative">
        {/* Collapsible Dark Enterprise Sidebar */}
        <StoreAdminSidebar
          activeTab={activeTab as StoreAdminTabId}
          onSelectTab={(t) => handleTabSelect(t)}
          activeStore={currentStore}
          stores={stores}
          onSelectStore={(sId) => setActiveStoreId(sId)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebarCollapse}
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          onOpenDirectPO={() => {
            setDirectPOPreselectedItem(null);
            setIsCreateDirectPOOpen(true);
          }}
          onOpenReceiveGoods={() => {
            setSelectedPOForReceive(null);
            setIsReceiveModalOpen(true);
          }}
          onOpenIndent={() => {
            setIndentPreselectedItem(null);
            setIsCreateIndentOpen(true);
          }}
          onOpenAuditStock={() => {
            setAuditPreselectedItem(null);
            setIsStockAuditOpen(true);
          }}
          activeDirectPOCount={activeDirectPOCount}
          pendingIndentsCount={pendingIndentsCount}
          lowStockCount={lowStockItemsCount}
          totalExpensesCount={allExpenses.length}
          totalOrdersCount={allOrders.length}
          suppliersCount={allSuppliers.length}
          adminName={authState.adminName}
          onLogout={onLogout}
        />

        {/* Main Content Viewport: Independently scrollable, stays beside fixed sidebar */}
        <main className="flex-1 min-h-0 min-w-0 h-full p-2.5 sm:p-4 lg:p-5 space-y-4 overflow-y-auto overflow-x-hidden bg-[#F8FAFC]">
          {/* Breadcrumb & View Header */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={toggleSidebarCollapse}
                className="mt-0.5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer md:hidden flex items-center justify-center shrink-0 border border-slate-200"
                title={isSidebarCollapsed ? 'Expand Sidebar Menu' : 'Collapse Sidebar Menu'}
              >
                <PanelLeft className="w-4 h-4 text-amber-600" />
              </button>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                  <span>Store Outlets</span>
                  <span>/</span>
                  <span className="text-amber-600 font-extrabold">{currentStore.name}</span>
                  <span>/</span>
                  <span className="text-slate-800 capitalize font-extrabold">
                    {activeTab.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {activeTab === 'financials' && 'Store Financial Statement & P&L Calculation'}
                  {activeTab === 'expenses' && 'Store Expenses & Outflow Ledger'}
                  {activeTab === 'sales_orders' && 'Store Orders & Master Sales Ledger'}
                  {activeTab === 'staff_counters' && 'Staff & Active Counter Stations'}
                  {activeTab === 'store_inventory' && 'Store Stock Inventory & Catalog'}
                  {activeTab === 'manage_stock' && 'Direct Store Purchasing & Goods Receipt'}
                  {activeTab === 'suppliers' && 'Supplier & Vendor Directory for Direct Purchasing'}
                  {activeTab === 'stock_indents' && 'Warehouse Indents & Requisitions'}
                  {activeTab === 'printer_setup' && 'Thermal Printer & Direct Print Setup'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-black border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Outlet Live</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono">
                  {currentStore.timings || (currentStore.is24x7 ? '24x7 Active' : '10 AM - 12 AM')}
                </span>
              </div>
            </div>
            </div>

            {/* Quick action shortcuts */}
            <div className="flex flex-wrap items-center gap-2">
              {activeTab === 'printer_setup' ? (
                <button
                  onClick={() => handleTabSelect('financials')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <span>Dashboard Overview</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleTabSelect('manage_stock')}
                    className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all border border-amber-500/40"
                  >
                    <Truck className="w-3.5 h-3.5 text-white" />
                    <span>Manage Stock</span>
                    {activeDirectPOCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-300 text-[10px] font-black">
                        {activeDirectPOCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setIsAddExpenseOpen(true)}
                    className="px-3 py-2 bg-[#1E293B] hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Record Expense</span>
                  </button>

                  <button
                    onClick={printStoreFinancialReport}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-xs transition-colors"
                    title="Print Store Statement"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-600" />
                    <span>Statement</span>
                  </button>
                </>
              )}

              <button
                onClick={triggerRefresh}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-200"
                title="Refresh Real-time Data"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

        {/* ========================================================================= */}
        {/* TAB CONTENT 1: STORE FINANCIAL STATEMENT & CALCULATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'financials' && (
          <div className="space-y-6">
            {/* CORE FINANCIAL SCORECARDS (FINANCIAL STATEMENT TAB ONLY) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Sales (Credit Amount from POS Orders) */}
              <div className="bg-white border border-slate-200 hover:border-amber-500 rounded-2xl p-5 shadow-xs relative overflow-hidden group transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Total Store Sales (Credit)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    ₹{financialSummary.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-amber-700 font-bold mt-1 flex items-center gap-1">
                    <span>{financialSummary.orderCount} Orders Billed</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">Incoming Revenue</span>
                  </p>
                </div>
              </div>

              {/* Card 2: Total Store Expenses (Debit Amount) */}
              <div className="bg-white border border-slate-200 hover:border-red-300 rounded-2xl p-5 shadow-xs relative overflow-hidden group transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Store Expenses (Debit)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">
                    ₹{financialSummary.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
                    <span>{financialSummary.expenseCount} Expense Entries</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">Outflows</span>
                  </p>
                </div>
              </div>

              {/* Card 3: Net Store Balance / Net Profit */}
              <div className="bg-white border-2 border-amber-500 rounded-2xl p-5 shadow-xs relative overflow-hidden bg-gradient-to-br from-amber-50/40 via-white to-amber-50/40">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    Net Store Profit / Balance
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div
                    className={`text-2xl sm:text-3xl font-black tracking-tight ${
                      financialSummary.netStoreBalance >= 0 ? 'text-slate-900' : 'text-red-600'
                    }`}
                  >
                    ₹{financialSummary.netStoreBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-600 font-bold mt-1">
                    (Sales - Expenses) • Profit Margin: {financialSummary.profitMarginPercent.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Card 4: Expected Cash in Drawer */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Expected Cash In Drawer
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    ₹{financialSummary.expectedCashInDrawer.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Cash Sales (₹{financialSummary.salesByMode.cash.toFixed(0)}) - Cash Expenses (₹{financialSummary.expensesByMode.cash.toFixed(0)})
                  </p>
                </div>
              </div>
            </div>

            {/* Payment & Sales Channel Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                    💵
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">Cash Sales Inflow</span>
                    <span className="text-base font-black text-slate-900">
                      ₹{financialSummary.salesByMode.cash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                  {financialSummary.totalSales > 0
                    ? `${((financialSummary.salesByMode.cash / financialSummary.totalSales) * 100).toFixed(0)}%`
                    : '0%'}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                    📱
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">UPI & QR Digital Inflow</span>
                    <span className="text-base font-black text-slate-900">
                      ₹{financialSummary.salesByMode.upi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                  {financialSummary.totalSales > 0
                    ? `${((financialSummary.salesByMode.upi / financialSummary.totalSales) * 100).toFixed(0)}%`
                    : '0%'}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
                    💳
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-semibold block">Card / POS Machine</span>
                    <span className="text-base font-black text-slate-900">
                      ₹{financialSummary.salesByMode.card.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {financialSummary.totalSales > 0
                    ? `${((financialSummary.salesByMode.card / financialSummary.totalSales) * 100).toFixed(0)}%`
                    : '0%'}
                </span>
              </div>
            </div>
            {/* Calculation Audit Sheet */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Comprehensive Financial Ledger & Store Reconciliation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time calculation aggregating total sales credits and subtracting all recorded store expenses.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Record New Expense</span>
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Calculation Breakdown */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                       Step-by-Step Financial Math
                    </h4>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3 font-mono text-xs">
                      {/* Gross Sales */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="text-amber-700 font-bold flex items-center gap-1 font-sans">
                          <Plus className="w-3.5 h-3.5" /> Total Gross Sales (POS Credit)
                        </span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          + ₹{financialSummary.totalSales.toFixed(2)}
                        </span>
                      </div>

                      {/* Cash Breakdown */}
                      <div className="pl-4 text-[11px] text-slate-500 space-y-1">
                        <div className="flex justify-between">
                          <span>• Cash Register Sales:</span>
                          <span>₹{financialSummary.salesByMode.cash.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• UPI / BharatQR Sales:</span>
                          <span>₹{financialSummary.salesByMode.upi.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Card POS Sales:</span>
                          <span>₹{financialSummary.salesByMode.card.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Total Expenses */}
                      <div className="flex items-center justify-between pt-2 pb-2 border-b border-slate-200">
                        <span className="text-red-600 font-bold flex items-center gap-1 font-sans">
                          <TrendingDown className="w-3.5 h-3.5" /> Total Store Expenses (Debit)
                        </span>
                        <span className="font-extrabold text-red-700 text-sm">
                          - ₹{financialSummary.totalExpenses.toFixed(2)}
                        </span>
                      </div>

                      {/* Expense Breakdown */}
                      <div className="pl-4 text-[11px] text-slate-500 space-y-1">
                        <div className="flex justify-between">
                          <span>• Cash Expenses Paid:</span>
                          <span>₹{financialSummary.expensesByMode.cash.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Online / Bank Expenses:</span>
                          <span>₹{financialSummary.expensesByMode.online.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Final Net Calculation */}
                      <div className="flex items-center justify-between pt-3 text-sm font-sans font-black bg-white p-3 rounded-lg border border-slate-300">
                        <span className="text-slate-900">Net Store Profit / Balance:</span>
                        <span
                          className={`text-base ${
                            financialSummary.netStoreBalance >= 0 ? 'text-slate-900' : 'text-red-600'
                          }`}
                        >
                          ₹{financialSummary.netStoreBalance.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Expense Category Distribution */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Expense Category Breakdown
                    </h4>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
                      {Object.keys(financialSummary.categoryBreakdown).length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No expenses recorded for this store yet.</p>
                      ) : (
                        Object.entries(financialSummary.categoryBreakdown).map(([cat, rawAmt]) => {
                          const amt = Number(rawAmt) || 0;
                          const badge = getCategoryBadge(cat as StoreExpense['category']);
                          const totalExp = financialSummary.totalExpenses || financialSummary.totalExpensesDebit || 0;
                          const pct = totalExp > 0 ? ((amt / totalExp) * 100).toFixed(1) : '0';

                          return (
                            <div key={cat} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                                  {badge.label}
                                </span>
                                <span className="font-mono font-bold text-slate-900">
                                  ₹{amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-amber-500 h-1.5 rounded-full"
                                  style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Link to Store Orders & Sales Ledger */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Live Orders & Master Sales Ledger for {currentStore.name}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    View full counter fulfillment logs, daily cash/UPI settlement reports, and tax invoice manifests for all {allOrders.length} billed store transactions.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleTabSelect('sales_orders')}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
              >
                <span>Open Sales Ledger ({allOrders.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT 2: STORE EXPENSES LEDGER */}
        {/* ========================================================================= */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2 w-full flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search expenses by title, recipient, or receipt #..."
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-amber-500"
                  />
                </div>

                <select
                  value={expenseCategoryFilter}
                  onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">All Categories</option>
                  <option value="daily_supplies">Daily Supplies (Paan/Milk/Ice)</option>
                  <option value="staff_salary">Staff Salary / Advance</option>
                  <option value="electricity_utility">Electricity & Utilities</option>
                  <option value="rent_lease">Rent & Lease</option>
                  <option value="maintenance_repairs">Maintenance & Repairs</option>
                  <option value="store_refreshments">Store Refreshments</option>
                  <option value="local_vendor">Local Vendor</option>
                  <option value="cleaning">Cleaning & Hygiene</option>
                  <option value="misc">Miscellaneous</option>
                </select>

                <select
                  value={expensePaymentFilter}
                  onChange={(e) => setExpensePaymentFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">All Modes</option>
                  <option value="cash">Cash Outflow</option>
                  <option value="online">Online / UPI / Bank</option>
                </select>
              </div>

              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Add Store Expense</span>
              </button>
            </div>

            {/* Expenses Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Date / Time</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Expense Title & Details</th>
                      <th className="py-3 px-4">Paid By & Recipient</th>
                      <th className="py-3 px-4">Payment Mode</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400">
                          No expense records found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredExpenses.map((exp) => {
                        const badge = getCategoryBadge(exp.category);

                        return (
                          <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {new Date(exp.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                              <div className="text-[10px] text-slate-400">
                                {new Date(exp.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                                {badge.label}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{exp.title}</div>
                              {exp.notes && <div className="text-[11px] text-slate-500">{exp.notes}</div>}
                              {exp.receiptNumber && (
                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                                  Receipt #{exp.receiptNumber}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-800">{exp.paidBy}</div>
                              {exp.paidToOrRecipient && (
                                <div className="text-[11px] text-slate-500">
                                  To: {exp.paidToOrRecipient}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  exp.paymentMode === 'cash'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                                }`}
                              >
                                {exp.paymentMode}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right font-mono font-black text-red-600 text-sm whitespace-nowrap">
                              ₹{exp.amount.toFixed(2)}
                            </td>

                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleOpenEditExpense(exp)}
                                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Expense"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExpense(exp.id, exp.title)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Expense"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT 3: MASTER ORDERS & SALES LEDGER (LOCKED TO LOGIN STORE ONLY) */}
        {/* ========================================================================= */}
        {activeTab === 'sales_orders' && (
          <div className="space-y-4">
            <AdminOrders
              orders={allOrders}
              fixedStoreId={currentStore.id}
              storeName={currentStore.name}
              isStoreAdmin={true}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT 4: STAFF & COUNTER STATIONS */}
        {/* ========================================================================= */}
        {activeTab === 'staff_counters' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {currentStore.counters.map((counter) => {
                const stat = counterStats[counter.id] || {
                  ordersCountToday: 0,
                  revenueToday: 0,
                  cashToday: 0,
                  upiToday: 0,
                  ordersCountAllTime: 0,
                  revenueAllTime: 0,
                };

                return (
                  <div
                    key={counter.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#1E293B] text-white font-extrabold text-xs">
                        Counter Station #{counter.id}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <span>24x7 Active</span>
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base">{counter.cashierName}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{counter.name}</p>
                    </div>

                    {/* Live Today's Counter Sales (Since 12am) */}
                    <div className="bg-amber-50/70 rounded-xl p-3 text-xs text-slate-700 space-y-1.5 border border-amber-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-900 font-bold text-[11px] uppercase tracking-wider">Today's Shift Sales (Since 12am):</span>
                        <span className="font-mono font-black text-amber-950 text-sm">₹{stat.revenueToday.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Today's Bills:</span>
                        <span className="font-bold text-slate-900">{stat.ordersCountToday} bills</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-amber-200/60">
                        <span>Cash: ₹{stat.cashToday.toFixed(0)}</span>
                        <span>UPI/QR: ₹{stat.upiToday.toFixed(0)}</span>
                      </div>
                    </div>

                    {/* All-Time Lifetime Counter Stats */}
                    <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-1 border border-slate-200/80">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">All-Time Billed:</span>
                        <span className="font-bold text-slate-800">₹{stat.revenueAllTime.toFixed(0)} ({stat.ordersCountAllTime} bills)</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-1 border border-slate-200/80">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{counter.shift}</span>
                      </div>
                      {counter.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-amber-600" />
                          <span>{counter.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider">POS PIN Access</span>
                      <span className="font-mono font-bold text-[11px] text-amber-700">Ready (PIN Auth)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT 5: STORE STOCK INVENTORY */}
        {/* ========================================================================= */}
        {activeTab === 'store_inventory' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Store outlet inventory is synchronized with Central Warehouse dispatches and real-time POS billings.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAuditPreselectedItem(null);
                    setIsStockAuditOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer border border-amber-500/40"
                  title="Physically count and audit store stock (Store Admin Password Required)"
                >
                  <ClipboardCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span>Audit Store Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDirectPOPreselectedItem(null);
                    setIsCreateDirectPOOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Direct PO</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIndentPreselectedItem(null);
                    setIsCreateIndentOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer border border-slate-200"
                >
                  <Truck className="w-3.5 h-3.5 text-slate-600" />
                  <span>Order from WH</span>
                </button>
                <span className="font-bold whitespace-nowrap bg-amber-200/50 px-2 py-1 rounded-lg">
                  {filteredInventory.length} of {storeInventory.length} Items
                </span>
              </div>
            </div>

            {/* Search & Category Filter for Store Inventory */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search inventory by product name, SKU, or barcode..."
                  value={inventorySearch}
                  onChange={(e) => {
                    setInventorySearch(e.target.value);
                    setInventoryPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-amber-500"
                />
              </div>

              <select
                value={inventoryCategoryFilter}
                onChange={(e) => {
                  setInventoryCategoryFilter(e.target.value);
                  setInventoryPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden w-full sm:w-auto"
              >
                <option value="all">All Categories</option>
                <option value="Paan">Paan Creations</option>
                <option value="Cafe">Cafe & Beverages</option>
                <option value="Essentials">Mukhwas & Essentials</option>
              </select>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Item Name & SKU</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Selling Price</th>
                      <th className="py-3 px-4">Store Allocated Stock</th>
                      <th className="py-3 px-4 text-center">Central WH Stock</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Order / Indent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInventory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400">
                          No inventory items match your search.
                        </td>
                      </tr>
                    ) : (
                      paginatedInventory.map((item) => {
                        const allocatedStock = item.storeAllocations?.[activeStoreId] ?? 0;
                        const centralStock = item.stockQuantity ?? 0;
                        const isLowStock = allocatedStock <= (item.lowStockThreshold || 10);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <div className="text-[10px] font-mono text-slate-400">
                                SKU: {item.sku || 'N/A'} • Barcode: {item.barcode || 'N/A'}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              ₹{item.sellingPrice.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">
                              <div className="flex flex-col">
                                <span>{allocatedStock} {item.unit || 'units'}</span>
                                {item.piecesPerBox && item.piecesPerBox > 1 && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    ({item.piecesPerBox} units / {item.unit || 'box'})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-indigo-700 bg-indigo-50/20 text-center" title="Stock physically present and available in Central Warehouse">
                              <div className="flex flex-col items-center">
                                <span>{centralStock} {item.unit || 'units'}</span>
                                {item.piecesPerBox && item.piecesPerBox > 1 && (
                                  <span className="text-[10px] text-indigo-500 font-mono">
                                    ({item.piecesPerBox} units / {item.unit || 'box'})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  allocatedStock > 20
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : allocatedStock > 5
                                    ? 'bg-amber-100 text-amber-900'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {allocatedStock > 20 ? 'In Stock' : allocatedStock > 5 ? 'Low Stock' : 'Critical'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAuditPreselectedItem(item);
                                    setIsStockAuditOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                  title={`Perform physical count audit for ${item.name}`}
                                >
                                  <ClipboardCheck className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Audit</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setDirectPOPreselectedItem(item);
                                    setIsCreateDirectPOOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                                  title={`Direct PO for ${item.name} directly from supplier`}
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Direct PO</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setIndentPreselectedItem(item);
                                    setIsCreateIndentOpen(true);
                                  }}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                                    isLowStock
                                      ? 'bg-slate-800 hover:bg-slate-900 text-white shadow-2xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                  title={`Order ${item.name} from Central Warehouse`}
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Indent</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls for Store Inventory (max 25 per page default) */}
              {filteredInventory.length > 0 && (
                <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500 font-medium">
                    Showing{' '}
                    <span className="font-bold text-slate-800 font-mono">
                      {inventoryPageSize === 'all'
                        ? 1
                        : (inventoryPage - 1) * (inventoryPageSize as number) + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-bold text-slate-800 font-mono">
                      {inventoryPageSize === 'all'
                        ? filteredInventory.length
                        : Math.min(
                            inventoryPage * (inventoryPageSize as number),
                            filteredInventory.length
                          )}
                    </span>{' '}
                    of{' '}
                    <span className="font-bold text-slate-900 font-mono">
                      {filteredInventory.length}
                    </span>{' '}
                    items
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 text-[11px] font-semibold">Per page:</span>
                      <select
                        value={inventoryPageSize}
                        onChange={(e) => {
                          const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                          setInventoryPageSize(val);
                          setInventoryPage(1);
                        }}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 cursor-pointer focus:outline-hidden"
                      >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value="all">All ({filteredInventory.length})</option>
                      </select>
                    </div>

                    {inventoryPageSize !== 'all' && totalInventoryPages > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={inventoryPage <= 1}
                          onClick={() => setInventoryPage((p) => Math.max(1, p - 1))}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            inventoryPage <= 1
                              ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                              : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs'
                          }`}
                        >
                          Previous
                        </button>

                        <div className="px-2.5 py-1 text-xs font-bold text-slate-700 font-mono">
                          {inventoryPage} / {totalInventoryPages}
                        </div>

                        <button
                          type="button"
                          disabled={inventoryPage >= totalInventoryPages}
                          onClick={() => setInventoryPage((p) => Math.min(totalInventoryPages, p + 1))}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                            inventoryPage >= totalInventoryPages
                              ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                              : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs'
                          }`}
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT 6: MANAGE STOCK (DIRECT STORE PURCHASING & POs)              */}
        {/* ========================================================================= */}
        {activeTab === 'manage_stock' && (
          <DirectStorePurchasesView
            currentStore={currentStore}
            inventory={storeInventory}
            adminName={authState.adminName}
            onRefresh={triggerRefresh}
            onOpenCreatePO={(preselected) => {
              setDirectPOPreselectedItem(preselected || null);
              setPreselectedSupplierForPO(undefined);
              setIsCreateDirectPOOpen(true);
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT 7: SUPPLIER & VENDOR MANAGEMENT                              */}
        {/* ========================================================================= */}
        {activeTab === 'suppliers' && (
          <StoreSuppliersView
            currentStore={currentStore}
            inventory={storeInventory}
            adminName={authState.adminName}
            onOpenCreatePOForSupplier={(sup) => {
              setDirectPOPreselectedItem(null);
              setPreselectedSupplierForPO(sup?.id);
              setIsCreateDirectPOOpen(true);
            }}
            onOpenReceiveGoods={(po) => {
              setSelectedPOForReceive(po || null);
              setIsReceiveModalOpen(true);
            }}
            onOpenAddSupplier={() => {
              setSupplierToEdit(null);
              setIsAddSupplierOpen(true);
            }}
            onOpenEditSupplier={(sup) => {
              setSupplierToEdit(sup);
              setIsAddSupplierOpen(true);
            }}
            refreshKey={refreshKey}
            triggerRefresh={triggerRefresh}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT 8: STORE INVENTORY INDENTS (WAREHOUSE ORDERS)                */}
        {/* ========================================================================= */}
        {activeTab === 'stock_indents' && (
          <StoreIndentsView
            currentStore={currentStore}
            inventory={storeInventory}
            onOpenCreateIndent={(preselected) => {
              setIndentPreselectedItem(preselected || null);
              setIsCreateIndentOpen(true);
            }}
            onRefresh={triggerRefresh}
          />
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT 9: THERMAL PRINTER & DIRECT PRINT SETUP                      */}
        {/* ========================================================================= */}
        {activeTab === 'printer_setup' && (
          <AdminPrinterSetupView storeName={currentStore.name} />
        )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD STORE EXPENSE */}
      {/* ========================================================================= */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 bg-[#1E293B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Record Store Expense</h3>
                  <p className="text-[11px] text-slate-300">
                    Deducts from {currentStore.name} sales credits
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="text-slate-300 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              {/* Category */}
              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Expense Category *</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as StoreExpense['category'])}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-hidden focus:bg-white focus:border-amber-500"
                >
                  <option value="daily_supplies">Daily Supplies & Perishables (Betel Leaves, Milk, Ice, Supari)</option>
                  <option value="staff_salary">Staff Salary / Daily Advance / Wages</option>
                  <option value="electricity_utility">Electricity, Power & Utility Bills</option>
                  <option value="rent_lease">Store Rent / Commercial Lease</option>
                  <option value="maintenance_repairs">Equipment Maintenance, AC & Counter Repairs</option>
                  <option value="store_refreshments">Store Tea / Refreshments / Cleaning Supplies</option>
                  <option value="local_vendor">Local Vendor Direct Purchase</option>
                  <option value="misc">Miscellaneous Store Outflow</option>
                </select>
              </div>

              {/* Title and Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-700 font-bold block mb-1">Expense Title / Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fresh Betel Leaves purchase from market"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 1500"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-hidden focus:bg-white focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Payment Mode *</label>
                  <select
                    value={expensePaymentMode}
                    onChange={(e) => setExpensePaymentMode(e.target.value as StoreExpense['paymentMode'])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold focus:outline-hidden focus:bg-white focus:border-amber-500"
                  >
                    <option value="cash">Cash from Register / Drawer</option>
                    <option value="online">Online / UPI / Bank Account</option>
                  </select>
                </div>
              </div>

              {/* Paid By and Recipient */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Authorized / Paid By</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Shah (Store Manager)"
                    value={expensePaidBy}
                    onChange={(e) => setExpensePaidBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Paid To / Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Local Betel Leaf Vendor"
                    value={expenseRecipient}
                    onChange={(e) => setExpenseRecipient(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Receipt / Invoice # & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Receipt / Voucher #</label>
                  <input
                    type="text"
                    placeholder="e.g. VCH-9921"
                    value={expenseReceiptNo}
                    onChange={(e) => setExpenseReceiptNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:bg-white focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Additional Notes</label>
                  <input
                    type="text"
                    placeholder="Optional notes or remarks"
                    value={expenseNotes}
                    onChange={(e) => setExpenseNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-extrabold rounded-xl cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Add Store Expense Now</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EDIT STORE EXPENSE */}
      {/* ========================================================================= */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 bg-[#1E293B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Edit Store Expense</h3>
                  <p className="text-[11px] text-slate-300">
                    Update details for expense entry #{editingExpense.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingExpense(null)}
                className="text-slate-300 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditExpense} className="p-6 space-y-4">
              {/* Category */}
              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">Expense Category *</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as StoreExpense['category'])}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:outline-hidden focus:bg-white focus:border-amber-500"
                >
                  <option value="daily_supplies">Daily Supplies & Perishables (Betel Leaves, Milk, Ice, Supari)</option>
                  <option value="staff_salary">Staff Salary / Daily Advance / Wages</option>
                  <option value="electricity_utility">Electricity, Power & Utility Bills</option>
                  <option value="rent_lease">Store Rent / Commercial Lease</option>
                  <option value="maintenance_repairs">Equipment Maintenance, AC & Counter Repairs</option>
                  <option value="store_refreshments">Store Tea / Refreshments / Cleaning Supplies</option>
                  <option value="local_vendor">Local Vendor Direct Purchase</option>
                  <option value="misc">Miscellaneous Store Outflow</option>
                </select>
              </div>

              {/* Title and Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs text-slate-700 font-bold block mb-1">Expense Title / Description *</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-hidden focus:bg-white focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Payment Mode *</label>
                  <select
                    value={editPaymentMode}
                    onChange={(e) => setEditPaymentMode(e.target.value as StoreExpense['paymentMode'])}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold focus:outline-hidden focus:bg-white focus:border-amber-500"
                  >
                    <option value="cash">Cash from Register / Drawer</option>
                    <option value="online">Online / UPI / Bank Account</option>
                  </select>
                </div>
              </div>

              {/* Paid By and Recipient */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Authorized / Paid By</label>
                  <input
                    type="text"
                    value={editPaidBy}
                    onChange={(e) => setEditPaidBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Paid To / Vendor Name</label>
                  <input
                    type="text"
                    value={editRecipient}
                    onChange={(e) => setEditRecipient(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Receipt / Invoice # & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Receipt / Voucher #</label>
                  <input
                    type="text"
                    value={editReceiptNo}
                    onChange={(e) => setEditReceiptNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:bg-white focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold block mb-1">Additional Notes</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-extrabold rounded-xl cursor-pointer shadow-xs transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Store Financial Statement Print & PDF Modal */}
      <StoreStatementModal
        isOpen={isStatementModalOpen}
        onClose={() => setIsStatementModalOpen(false)}
        store={currentStore}
        summary={financialSummary}
        expenses={allExpenses}
        orders={allOrders}
      />

      {/* Create Warehouse Stock Indent Modal */}
      <CreateStoreIndentModal
        isOpen={isCreateIndentOpen}
        onClose={() => {
          setIsCreateIndentOpen(false);
          setIndentPreselectedItem(null);
        }}
        currentStore={currentStore}
        inventory={storeInventory}
        adminName={authState.adminName}
        preselectedItem={indentPreselectedItem}
        onSuccess={() => {
          triggerRefresh();
          handleTabSelect('stock_indents');
        }}
      />

      {/* Create Direct Store Purchase Order Modal */}
      <CreateDirectStorePOModal
        isOpen={isCreateDirectPOOpen}
        onClose={() => {
          setIsCreateDirectPOOpen(false);
          setDirectPOPreselectedItem(null);
          setPreselectedSupplierForPO(undefined);
        }}
        currentStore={currentStore}
        inventory={storeInventory}
        adminName={authState.adminName}
        preselectedItem={directPOPreselectedItem}
        preselectedSupplierId={preselectedSupplierForPO}
        onSuccess={() => {
          triggerRefresh();
          handleTabSelect('manage_stock');
        }}
      />

      {/* Receive Direct Store Goods Modal */}
      <ReceiveDirectStoreGoodsModal
        isOpen={isReceiveModalOpen}
        onClose={() => {
          setIsReceiveModalOpen(false);
          setSelectedPOForReceive(null);
        }}
        currentStore={currentStore}
        inventory={storeInventory}
        adminName={authState.adminName}
        preselectedPO={selectedPOForReceive}
        onSuccess={() => {
          triggerRefresh();
          handleTabSelect('manage_stock');
        }}
      />

      {/* Physical Store Stock Audit Modal (Store Admin Password Required) */}
      <StoreStockAuditModal
        isOpen={isStockAuditOpen}
        onClose={() => {
          setIsStockAuditOpen(false);
          setAuditPreselectedItem(null);
        }}
        currentStore={currentStore}
        inventory={storeInventory}
        adminName={authState.adminName}
        preselectedItem={auditPreselectedItem}
        onSuccess={() => {
          triggerRefresh();
          handleTabSelect('store_inventory');
        }}
      />

      {/* Register / Edit Supplier & Vendor Modal */}
      <SupplierModal
        isOpen={isAddSupplierOpen}
        onClose={() => {
          setIsAddSupplierOpen(false);
          setSupplierToEdit(null);
        }}
        supplierToEdit={supplierToEdit}
        inventory={storeInventory}
        currentStore={currentStore}
        onSuccess={() => {
          triggerRefresh();
        }}
      />
    </div>
  );
};
