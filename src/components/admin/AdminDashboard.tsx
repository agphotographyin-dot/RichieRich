import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  IndianRupee,
  Package,
  AlertTriangle,
  Users,
  Download,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Scan,
  Send,
  FileSpreadsheet,
  Building2,
  Truck,
  Layers,
  Radio,
  Store,
  ArrowRight,
  Receipt,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  MapPin,
  Phone,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { InventoryItem, Order, Customer, StoreFinancialStats, AdminTab, UserRole, StoreLocation } from '../../types';
import { CURRENCY, storage } from '../../services/storage';
import { warehouseStorage } from '../../services/warehouseStorage';
import { pdfReportService } from '../../services/pdfReportService';
import { Warehouse, Supplier, PurchaseOrder, PurchaseBill, BatchRecord, StockTransfer } from '../../types/warehouse';
import { CreatePOModal } from '../warehouse/modals/CreatePOModal';
import { InwardBillModal } from '../warehouse/modals/InwardBillModal';
import { CreateTransferModal } from '../warehouse/modals/CreateTransferModal';

interface AdminDashboardProps {
  inventory: InventoryItem[];
  orders: Order[];
  customers: Customer[];
  onOpenScanner?: () => void;
  onOpenAddItem?: () => void;
  onNavigateTab: (tab: AdminTab) => void;
  onNavigateRole?: (role: UserRole) => void;
  stats?: StoreFinancialStats;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  inventory,
  orders,
  customers,
  onOpenScanner,
  onOpenAddItem,
  onNavigateTab,
  onNavigateRole,
  stats: propStats,
}) => {
  const globalStats = propStats || storage.getFinancialStats();

  // Selected Store filter: 'all' or specific store ID (e.g. 'gota', 'bopal', etc.)
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');

  // Warehouse state entities
  const [warehouses, setWarehouses] = useState<Warehouse[]>(warehouseStorage.getWarehouses());
  const [suppliers, setSuppliers] = useState<Supplier[]>(warehouseStorage.getSuppliers());
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(warehouseStorage.getPurchaseOrders());
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>(warehouseStorage.getPurchaseBills());
  const [batches, setBatches] = useState<BatchRecord[]>(warehouseStorage.getBatches());
  const [transfers, setTransfers] = useState<StockTransfer[]>(warehouseStorage.getStockTransfers());
  const [stores, setStores] = useState<StoreLocation[]>(storage.getStores());

  // Modal states for direct warehouse operations from Admin Dashboard
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferInitialData, setTransferInitialData] = useState<Partial<StockTransfer> | null>(null);

  const refreshWarehouseData = () => {
    setWarehouses(warehouseStorage.getWarehouses());
    setSuppliers(warehouseStorage.getSuppliers());
    setPurchaseOrders(warehouseStorage.getPurchaseOrders());
    setPurchaseBills(warehouseStorage.getPurchaseBills());
    setBatches(warehouseStorage.getBatches());
    setTransfers(warehouseStorage.getStockTransfers());
    setStores(storage.getStores());
  };

  useEffect(() => {
    const unsubWh = warehouseStorage.subscribe(() => {
      refreshWarehouseData();
    });
    const unsubMain = storage.subscribe(() => {
      refreshWarehouseData();
    });
    return () => {
      unsubWh();
      unsubMain();
    };
  }, []);

  const centralWarehouse = warehouseStorage.getCentralWarehouse();
  const inTransitCount = transfers.filter((t) => t.status === 'dispatched_in_transit').length;
  const storeIndents = warehouseStorage.getStoreIndents();
  const pendingIndentsCount = storeIndents.filter((i) => i.status === 'pending').length;
  const approvedPOCount = purchaseOrders.filter((p) => p.status === 'approved').length;
  const warehouseValuation = inventory.reduce((sum, i) => sum + i.stockQuantity * i.costPrice, 0);

  // Compute store-specific or global stats
  const filteredOrders = selectedStoreFilter === 'all'
    ? orders
    : orders.filter((o) => (o.storeId || 'gota') === selectedStoreFilter);

  // Compute chart data for revenue vs profit over orders
  const revenueChartData = filteredOrders.slice(0, 10).reverse().map((o) => ({
    name: o.orderNumber.replace('RR-2026-', '#'),
    revenue: Math.round(o.grandTotal),
    profit: Math.round(o.totalProfit),
    cost: Math.round(o.totalCost),
  }));

  // Category breakdown for 3 core product families
  const categoryCounts = {
    Paan: inventory.filter((i) => i.category === 'Paan').reduce((sum, i) => {
      if (selectedStoreFilter === 'all') return sum + i.stockQuantity;
      return sum + (i.storeAllocations?.[selectedStoreFilter] || 0);
    }, 0),
    Cafe: inventory.filter((i) => i.category === 'Cafe').reduce((sum, i) => {
      if (selectedStoreFilter === 'all') return sum + i.stockQuantity;
      return sum + (i.storeAllocations?.[selectedStoreFilter] || 0);
    }, 0),
    Essentials: inventory.filter((i) => i.category === 'Essentials').reduce((sum, i) => {
      if (selectedStoreFilter === 'all') return sum + i.stockQuantity;
      return sum + (i.storeAllocations?.[selectedStoreFilter] || 0);
    }, 0),
  };

  // Low stock urgent list
  const lowStockItems = inventory.filter((i) => {
    if (selectedStoreFilter === 'all') {
      return i.stockQuantity <= i.lowStockThreshold;
    }
    const storeQty = i.storeAllocations?.[selectedStoreFilter] || 0;
    const storeMinThreshold = Math.max(2, Math.round(i.lowStockThreshold * 0.4));
    return storeQty <= storeMinThreshold;
  });

  // Calculate live statistics per store
  const getStoreSummary = (store: StoreLocation) => {
    const storeOrders = orders.filter((o) => (o.storeId || 'gota') === store.id);
    const storeSales = storeOrders.reduce((sum, o) => sum + o.grandTotal, 0);

    let storeUnits = 0;
    let storeRetailValuation = 0;
    let storeLowStockCount = 0;

    inventory.forEach((item) => {
      const qty = item.storeAllocations?.[store.id] || 0;
      storeUnits += qty;
      storeRetailValuation += qty * item.sellingPrice;
      const storeMinThreshold = Math.max(2, Math.round(item.lowStockThreshold * 0.4));
      if (qty <= storeMinThreshold) {
        storeLowStockCount++;
      }
    });

    const storeInTransit = transfers.filter(
      (t) => t.destinationId === store.id && t.status === 'dispatched_in_transit'
    ).length;

    const storePendingIndents = storeIndents.filter(
      (ind) => ind.storeId === store.id && ind.status === 'pending'
    ).length;

    return {
      storeOrdersCount: storeOrders.length,
      storeSales,
      storeUnits,
      storeRetailValuation,
      storeLowStockCount,
      storeInTransit,
      storePendingIndents,
    };
  };

  const handleExportPDF = () => {
    const monthStr = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const storeLabel = selectedStoreFilter === 'all' ? 'All Outlets' : stores.find(s => s.id === selectedStoreFilter)?.name || 'Store';
    pdfReportService.exportMonthlyAnalyticsPDF(monthStr, storeLabel);
  };

  const handleExportCSV = () => {
    const csvContent = storage.exportMonthlyAnalyticalReportCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Richie_Rich_Analytical_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleQuickRestock = (item: InventoryItem) => {
    if (selectedStoreFilter === 'all') {
      storage.adjustStock(item.id, 20, 'Quick Admin Dashboard Restock');
    } else {
      const currentAlloc = item.storeAllocations || {};
      const newAlloc = {
        ...currentAlloc,
        [selectedStoreFilter]: (currentAlloc[selectedStoreFilter] || 0) + 20,
      };
      storage.updateInventoryItem(item.id, { storeAllocations: newAlloc });
    }
  };

  const handleSendQuickPush = () => {
    storage.addNotification({
      title: 'Weekend Special Announcement',
      message: 'Exclusive 20% bonus points on artisanal Silver & Saffron Pan creations!',
      type: 'discount_promo',
      targetRole: 'customer',
      read: false,
    });
    alert('Push Notification successfully broadcasted to active loyalty patrons!');
  };

  const handleDispatchToStore = (storeId: string) => {
    setTransferInitialData({
      destinationId: storeId,
      type: 'warehouse_to_store',
    });
    setIsTransferModalOpen(true);
  };

  const handleLaunchStorePOS = (storeId: string) => {
    try {
      localStorage.setItem('richie_rich_selected_store', storeId);
    } catch {}
    if (onNavigateRole) {
      onNavigateRole('pos');
    } else {
      window.location.hash = '#pos';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Action Bar with Real-time POS Connection Status */}
      <div className="bg-white border border-slate-200 p-5 sm:p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Executive Admin Dashboard</h2>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time POS & Warehouse Synced</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centralized control for all {stores.length} store outlets, Central Master Warehouse, and multi-counter POS billing terminals.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Issue PO */}
          <button
            id="btn-admin-issue-po"
            type="button"
            onClick={() => setIsPOModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Issue PO</span>
          </button>

          {/* Quick Inward Bill */}
          <button
            id="btn-admin-inward-bill"
            type="button"
            onClick={() => setIsInwardModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Inward Bill</span>
          </button>

          {/* Quick Transfer */}
          <button
            id="btn-admin-transfer-stock"
            type="button"
            onClick={() => {
              setTransferInitialData(null);
              setIsTransferModalOpen(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Transfer Stock</span>
          </button>

          {onOpenScanner && (
            <button
              id="btn-admin-barcode-scanner"
              type="button"
              onClick={onOpenScanner}
              className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Scan className="w-3.5 h-3.5 text-amber-400" />
              <span>Barcode Scanner</span>
            </button>
          )}

          {onOpenAddItem && (
            <button
              id="btn-admin-add-item"
              type="button"
              onClick={onOpenAddItem}
              className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          )}

          <button
            id="btn-admin-staff-counters"
            type="button"
            onClick={() => onNavigateTab('staff_counters')}
            className="bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Staff & PINs</span>
          </button>

          <button
            id="btn-admin-export-pdf"
            type="button"
            onClick={handleExportPDF}
            className="bg-linear-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Export full executive financial analytics report as PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF Report</span>
          </button>

          <button
            id="btn-admin-export-csv"
            type="button"
            onClick={handleExportCSV}
            className="border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-600 px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
            title="Export Raw CSV Data"
          >
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: ALL STORES PRESENCE & STORE SELECTOR GRID                       */}
      {/* All stores appear with live metrics, stock, POS status, and quick actions */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                All Retail Store Outlets ({stores.length})
              </h3>
              <p className="text-xs text-slate-500">Live operational metrics, stock on hand & POS counter readiness</p>
            </div>
          </div>

          {/* Store Scope Filter Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Scope View:</span>
            <select
              value={selectedStoreFilter}
              onChange={(e) => setSelectedStoreFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">★ All Stores (Consolidated Overview)</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Multi-Store Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stores.map((store) => {
            const summary = getStoreSummary(store);
            const isSelected = selectedStoreFilter === store.id;

            return (
              <div
                key={store.id}
                className={`p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-slate-50/70 hover:bg-slate-50 border-slate-200/90 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-slate-900">{store.name}</h4>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-600 text-white uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{store.city} • {store.shortName}</span>
                      </div>
                      {store.phone && (
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="font-mono">{store.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Online</span>
                    </div>
                  </div>

                  {/* Store Key Numbers */}
                  <div className="grid grid-cols-2 gap-2 my-3 text-xs">
                    <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-500 font-semibold block">Today's Sales</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {CURRENCY}{summary.storeSales.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{summary.storeOrdersCount} Orders</span>
                    </div>

                    <div className="p-2 bg-white rounded-xl border border-slate-200/80">
                      <span className="text-[10px] text-slate-500 font-semibold block">Store Stock</span>
                      <span className="font-mono font-bold text-indigo-950 text-sm">
                        {summary.storeUnits.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-slate-500">units</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Val: {CURRENCY}{summary.storeRetailValuation.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Transfer & Low Stock Tags */}
                  <div className="space-y-1 mb-3 text-[11px]">
                    {summary.storeInTransit > 0 && (
                      <div className="p-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-center justify-between">
                        <span className="flex items-center gap-1 font-semibold">
                          <Truck className="w-3 h-3 text-amber-600" /> In-Transit Incoming
                        </span>
                        <span className="font-mono font-bold">{summary.storeInTransit} Dispatches</span>
                      </div>
                    )}

                    {summary.storeLowStockCount > 0 ? (
                      <div className="p-1.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-center justify-between">
                        <span className="flex items-center gap-1 font-semibold">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> Low Stock Alerts
                        </span>
                        <span className="font-mono font-bold text-rose-700">{summary.storeLowStockCount} items</span>
                      </div>
                    ) : (
                      <div className="p-1.5 bg-emerald-50/70 border border-emerald-100 rounded-lg text-emerald-800 flex items-center gap-1 font-semibold text-[10px]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Stock Level Balanced
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Store Actions */}
                <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleDispatchToStore(store.id)}
                    className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Truck className="w-3 h-3 text-amber-600" />
                    <span>Dispatch</span>
                  </button>

                  <button
                    onClick={() => handleLaunchStorePOS(store.id)}
                    className="w-full py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-colors shadow-xs cursor-pointer"
                  >
                    <Receipt className="w-3 h-3" />
                    <span>Open POS</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: CENTRAL WAREHOUSE & SUPPLY CHAIN PIPELINE INTEGRATION           */}
      {/* Seamless compliance & live synchronization with Warehouse Dashboard       */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                Central Logistics Hub & Master Inventory
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {centralWarehouse.name}
            </h3>
            <p className="text-xs text-slate-300">
              {centralWarehouse.city} Single Central Facility • 25,000 sq.ft capacity • Live multi-store replenishment hub
            </p>
          </div>

          {/* Quick Jump to Full Warehouse Dashboard */}
          {onNavigateRole && (
            <button
              onClick={() => onNavigateRole('warehouse')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm self-start md:self-auto cursor-pointer"
            >
              <span>Open Warehouse Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Warehouse Telemetry Stream */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10">
          <div className="p-3 bg-white/10 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[11px] font-semibold">Master Stock Valuation</span>
            <span className="font-bold text-white font-mono text-base">
              {CURRENCY}{warehouseValuation.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-emerald-400 block mt-0.5">
              {inventory.length} Active SKUs stocked
            </span>
          </div>

          <div className="p-3 bg-white/10 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[11px] font-semibold">In-Transit Dispatches</span>
            <span className="font-bold text-amber-300 font-mono text-base">
              {inTransitCount} Active Loads
            </span>
            <span className="text-[10px] text-slate-300 block mt-0.5">
              OTP Verified Delivery
            </span>
          </div>

          <div className="p-3 bg-white/10 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[11px] font-semibold">Pending Store Indents</span>
            <span className="font-bold text-emerald-300 font-mono text-base">
              {pendingIndentsCount} Reorders
            </span>
            <span className="text-[10px] text-slate-300 block mt-0.5">
              Across {stores.length} outlets
            </span>
          </div>

          <div className="p-3 bg-white/10 rounded-xl border border-white/10">
            <span className="text-slate-400 block text-[11px] font-semibold">Open Purchase Orders</span>
            <span className="font-bold text-indigo-300 font-mono text-base">
              {approvedPOCount} Approved
            </span>
            <span className="text-[10px] text-slate-300 block mt-0.5">
              {purchaseBills.length} Inward GRNs Posted
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: MAIN FINANCIAL KPI CARDS                                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div 
          onClick={() => onNavigateTab('orders')}
          className="bg-white p-5 rounded-2xl border border-slate-200/90 hover:border-amber-400 hover:shadow-md transition-all shadow-xs cursor-pointer group"
          title="Click to view Master Orders & Sales Ledger and Daily Collection Report"
        >
          <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center justify-between">
            <span className="group-hover:text-amber-900 transition-colors">
              {selectedStoreFilter === 'all' ? "Today's Total Sales" : "Store Sales Today"}
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {CURRENCY}
            {(selectedStoreFilter === 'all'
              ? orders.filter(o => o.createdAt.split('T')[0] === new Date().toISOString().split('T')[0]).reduce((s, o) => s + o.grandTotal, 0) || globalStats.totalRevenue
              : filteredOrders.reduce((sum, o) => sum + o.grandTotal, 0)
            ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs font-semibold text-amber-800 mt-2 flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-700">
              <TrendingUp className="w-3 h-3" /> Live Collection Ledger
            </span>
            <span className="text-[10px] text-amber-700 underline font-bold group-hover:text-amber-900">
              Open Ledger →
            </span>
          </div>
        </div>

        {/* Active Customers */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center justify-between">
            <span>Active Customers</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {customers.length.toLocaleString('en-IN')}
          </div>
          <div className="text-slate-500 text-xs font-medium mt-2">
            Multi-store loyalty active
          </div>
        </div>

        {/* Gross Profit Margin */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center justify-between">
            <span>Gross Profit Margin</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">
            {globalStats.overallMarginPercent}%
          </div>
          <div className="text-amber-600 text-xs font-bold mt-2">
            Net Profit: {CURRENCY}{globalStats.grossProfit.toLocaleString('en-IN')}
          </div>
        </div>

        {/* Inventory Units & Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center justify-between">
            <span>{selectedStoreFilter === 'all' ? 'Consolidated Inventory' : 'Store Stock Units'}</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {(selectedStoreFilter === 'all'
              ? inventory.reduce((sum, i) => sum + i.stockQuantity, 0)
              : inventory.reduce((sum, i) => sum + (i.storeAllocations?.[selectedStoreFilter] || 0), 0)
            ).toLocaleString('en-IN')}{' '}
            <span className="text-xs font-normal text-slate-500">units</span>
          </div>
          <div className="text-slate-500 text-xs mt-2 flex justify-between items-center">
            <span>Total Valuation: {CURRENCY}{globalStats.totalInventoryValue.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: DETAILED OPERATIONAL BODY (8 COLS LEFT, 4 COLS RIGHT)           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Category Breakdown for 3 Core Categories */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-tight text-xs">
                  Category Stock & Distribution
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedStoreFilter === 'all'
                    ? 'Live units across 3 core product families (All Outlets)'
                    : `Live units in ${stores.find((s) => s.id === selectedStoreFilter)?.name || 'Selected Store'}`}
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Paan • Cafe • Essentials</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Paan</span>
                <div className="text-xl font-bold text-emerald-950 font-mono">
                  {categoryCounts.Paan.toLocaleString('en-IN')} <span className="text-xs font-normal text-emerald-700">units</span>
                </div>
                <div className="text-[11px] text-emerald-700">Artisanal & Luxury Pan</div>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Cafe</span>
                <div className="text-xl font-bold text-amber-950 font-mono">
                  {categoryCounts.Cafe.toLocaleString('en-IN')} <span className="text-xs font-normal text-amber-700">units</span>
                </div>
                <div className="text-[11px] text-amber-700">Beverages & Shakes</div>
              </div>

              <div className="p-4 bg-cyan-50/70 border border-cyan-200/80 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-cyan-800 uppercase tracking-wider block">Essentials</span>
                <div className="text-xl font-bold text-cyan-950 font-mono">
                  {categoryCounts.Essentials.toLocaleString('en-IN')} <span className="text-xs font-normal text-cyan-700">units</span>
                </div>
                <div className="text-[11px] text-cyan-700">Mukhwas & Refreshments</div>
              </div>
            </div>
          </div>

          {/* Real-Time Inventory Table Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-tight text-xs">
                  Real-Time Inventory Status
                </h3>
                <p className="text-xs text-slate-500">Live on-hand balance and safety reorder health</p>
              </div>
              <button
                onClick={() => (onNavigateRole ? onNavigateRole('warehouse') : onNavigateTab('dashboard'))}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Warehouse & Catalog Hub</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[11px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <tr>
                    <th className="pb-3 font-bold">Item Name & SKU</th>
                    <th className="pb-3 font-bold">Category</th>
                    <th className="pb-3 font-bold">Stock Level</th>
                    <th className="pb-3 font-bold">Cost / Margin</th>
                    <th className="pb-3 text-right font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {inventory.slice(0, 6).map((item) => {
                    const storeQty = selectedStoreFilter === 'all'
                      ? item.stockQuantity
                      : (item.storeAllocations?.[selectedStoreFilter] || 0);

                    const storeMinThreshold = selectedStoreFilter === 'all'
                      ? item.lowStockThreshold
                      : Math.max(2, Math.round(item.lowStockThreshold * 0.4));

                    const isCritical = storeQty === 0;
                    const isLow = storeQty <= storeMinThreshold && storeQty > 0;

                    return (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <td className="py-3">
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              item.category === 'Paan'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : item.category === 'Cafe'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                            }`}
                          >
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 font-medium text-slate-700">
                          <span className={isCritical ? 'text-red-600 font-bold' : isLow ? 'text-amber-600 font-bold' : 'text-slate-900 font-bold'}>
                            {storeQty} {item.unit}
                          </span>
                        </td>
                        <td className="py-3 text-slate-600">
                          {CURRENCY}{item.costPrice} / <span className="text-emerald-600 font-bold">+{item.marginPercentage}%</span>
                        </td>
                        <td className="py-3 text-right">
                          {isCritical ? (
                            <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-bold uppercase">
                              Critical
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold uppercase">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase">
                              Healthy
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revenue vs Profit Chart Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-tight text-xs">
                  Revenue vs Gross Profit Trend
                </h3>
                <p className="text-xs text-slate-500">Live order sales & net margins</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Revenue ({CURRENCY})
                </div>
                <div className="flex items-center gap-1.5 text-amber-600">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> Net Profit ({CURRENCY})
                </div>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="polishRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="polishProf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#polishRev)" />
                  <Area type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#polishProf)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Real-Time POS Sync Status Card */}
          <div className="bg-slate-900 p-5 rounded-2xl shadow-md text-white space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 uppercase tracking-wider">
                Live POS Sync Bus
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                <Radio className="w-3.5 h-3.5 animate-pulse" /> Active
              </span>
            </div>

            <div>
              <h3 className="font-bold text-white text-sm">POS ↔ Warehouse ↔ Admin</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every bill, transfer receipt, and stock deduction broadcasts live without manual reload.
              </p>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-800 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Live Orders:</span>
                <span className="font-bold text-white font-mono">{orders.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Multi-Store Outlets:</span>
                <span className="text-emerald-400 font-bold">{stores.length} Branches Online</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Warehouse Hub:</span>
                <span className="text-indigo-300 font-mono">Central Ahmedabad</span>
              </div>
            </div>

            <button
              onClick={handleSendQuickPush}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Promo Notification</span>
            </button>
          </div>

          {/* Low Stock Priority Queue Card */}
          {lowStockItems.length > 0 ? (
            <div className="bg-white p-5 rounded-2xl border border-amber-200/90 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-slate-900 uppercase tracking-tight text-xs">
                    Low Stock Alerts ({lowStockItems.length})
                  </h3>
                </div>
                <button
                  onClick={() => (onNavigateRole ? onNavigateRole('warehouse') : onNavigateTab('dashboard'))}
                  className="text-xs text-amber-700 hover:underline font-bold cursor-pointer"
                >
                  Manage in WH
                </button>
              </div>

              <div className="space-y-2">
                {lowStockItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-amber-50/60 border border-amber-100 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 truncate max-w-[130px]">{item.name}</div>
                      <div className="text-[10px] text-amber-800 font-semibold font-mono">
                        On Hand:{' '}
                        {selectedStoreFilter === 'all'
                          ? item.stockQuantity
                          : (item.storeAllocations?.[selectedStoreFilter] || 0)}{' '}
                        {item.unit}
                      </div>
                    </div>
                    <button
                      onClick={() => handleQuickRestock(item)}
                      className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold rounded-lg text-[10px] cursor-pointer"
                    >
                      +20 Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <div className="text-xs font-bold text-slate-800">All Stock Levels Healthy</div>
              <div className="text-[11px] text-slate-500">No items below safety thresholds</div>
            </div>
          )}

          {/* Quick System Operations */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-tight text-xs">
              System Operations & Integrity
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Auto-Sync with Central Hub
                </span>
                <span className="font-bold text-emerald-700">Active</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Real-time Cross-Store Replication
                </span>
                <span className="font-mono text-slate-700">0 ms latency</span>
              </div>
            </div>

            <button
              onClick={handleExportCSV}
              className="w-full mt-2 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Analytics Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals for Direct Operations */}
      <CreatePOModal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        suppliers={suppliers}
        warehouses={warehouses}
        inventory={inventory}
        onSuccess={refreshWarehouseData}
      />

      <InwardBillModal
        isOpen={isInwardModalOpen}
        onClose={() => setIsInwardModalOpen(false)}
        suppliers={suppliers}
        warehouses={warehouses}
        inventory={inventory}
        purchaseOrders={purchaseOrders}
        onSuccess={refreshWarehouseData}
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
        onSuccess={refreshWarehouseData}
      />
    </div>
  );
};
