import React from 'react';
import {
  TrendingUp,
  DollarSign,
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
import { InventoryItem, Order, Customer, StoreFinancialStats, AdminTab } from '../../types';
import { CURRENCY, storage } from '../../services/storage';
import { warehouseStorage } from '../../services/warehouseStorage';

interface AdminDashboardProps {
  inventory: InventoryItem[];
  orders: Order[];
  customers: Customer[];
  onOpenScanner?: () => void;
  onOpenAddItem?: () => void;
  onNavigateTab: (tab: AdminTab) => void;
  stats?: StoreFinancialStats;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  inventory,
  orders,
  customers,
  onOpenScanner,
  onOpenAddItem,
  onNavigateTab,
  stats: propStats,
}) => {
  const stats = propStats || storage.getFinancialStats();

  // Warehouse Data integration
  const centralWarehouse = warehouseStorage.getCentralWarehouse();
  const stockTransfers = warehouseStorage.getStockTransfers();
  const inTransitCount = stockTransfers.filter((t) => t.status === 'dispatched_in_transit').length;
  const storeIndents = warehouseStorage.getStoreIndents();
  const pendingIndentsCount = storeIndents.filter((i) => i.status === 'pending').length;
  const warehouseValuation = inventory.reduce((sum, i) => sum + i.stockQuantity * i.costPrice, 0);

  // Compute chart data for revenue vs profit over orders
  const revenueChartData = orders.slice(0, 10).reverse().map((o) => ({
    name: o.orderNumber.replace('RR-2026-', '#'),
    revenue: Math.round(o.grandTotal),
    profit: Math.round(o.totalProfit),
    cost: Math.round(o.totalCost),
  }));

  // Category breakdown strictly for the 3 allowed categories
  const categoryCounts = {
    Paan: inventory.filter((i) => i.category === 'Paan').reduce((sum, i) => sum + i.stockQuantity, 0),
    Cafe: inventory.filter((i) => i.category === 'Cafe').reduce((sum, i) => sum + i.stockQuantity, 0),
    Essentials: inventory.filter((i) => i.category === 'Essentials').reduce((sum, i) => sum + i.stockQuantity, 0),
  };

  // Low stock urgent list
  const lowStockItems = inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold);

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
    storage.adjustStock(item.id, 20, 'Quick Dashboard Restock');
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
            Centralized control for 4 store branches, Central Master Warehouse, and instant multi-counter POS billing.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Scan className="w-3.5 h-3.5 text-amber-400" />
              <span>Barcode Scanner</span>
            </button>
          )}

          {onOpenAddItem && (
            <button
              onClick={onOpenAddItem}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          )}

          <button
            onClick={() => onNavigateTab('staff_counters')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff & PINs</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center justify-between">
            <span>Today's Total Sales</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {CURRENCY}{stats.totalRevenue.toLocaleString()}
          </div>
          <div className="text-emerald-600 text-xs font-bold mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> ↑ 18.4% vs yesterday
          </div>
        </div>

        {/* Active Loyalty Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center justify-between">
            <span>Active Customers</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {customers.length.toLocaleString()}
          </div>
          <div className="text-slate-500 text-xs font-medium mt-2">
            Multi-store loyalty active
          </div>
        </div>

        {/* Avg Margin */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center justify-between">
            <span>Gross Profit Margin</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">
            {stats.overallMarginPercent}%
          </div>
          <div className="text-amber-600 text-xs font-bold mt-2">
            Net Profit: {CURRENCY}{stats.grossProfit.toLocaleString()}
          </div>
        </div>

        {/* Central Master Stock Units */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center justify-between">
            <span>Catalog Inventory</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {inventory.reduce((sum, i) => sum + i.stockQuantity, 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span>
          </div>
          <div className="text-slate-500 text-xs mt-2 flex justify-between items-center">
            <span>Total Valuation: {CURRENCY}{stats.totalInventoryValue.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Central Warehouse & Supply Chain Link Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
              Single Central Facility Connected
            </span>
          </div>
          <h3 className="text-base font-bold text-white">
            {centralWarehouse.name}
          </h3>
          <p className="text-xs text-slate-300">
            {centralWarehouse.city} Logistics Hub • 25,000 sq.ft capacity • 4 store outlets replenished
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3 py-2 bg-white/10 rounded-xl border border-white/10 text-xs">
            <span className="text-slate-400 block text-[10px]">In-Transit Dispatches:</span>
            <span className="font-bold text-amber-300 font-mono">{inTransitCount} Shipments</span>
          </div>
          <div className="px-3 py-2 bg-white/10 rounded-xl border border-white/10 text-xs">
            <span className="text-slate-400 block text-[10px]">Pending Store Indents:</span>
            <span className="font-bold text-emerald-300 font-mono">{pendingIndentsCount} Requests</span>
          </div>
          <div className="px-3 py-2 bg-white/10 rounded-xl border border-white/10 text-xs">
            <span className="text-slate-400 block text-[10px]">Warehouse Stock Value:</span>
            <span className="font-bold text-white font-mono">{CURRENCY}{warehouseValuation.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Body Grid: 8 Cols Left, 4 Cols Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Real-Time Category Breakdown (Paan, Cafe, Essentials) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 uppercase tracking-tight text-xs">
                  Category Stock & Distribution
                </h3>
                <p className="text-xs text-slate-500">Live units across 3 core product families</p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Paan • Cafe • Essentials</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Paan</span>
                <div className="text-xl font-bold text-emerald-950 font-mono">
                  {categoryCounts.Paan.toLocaleString()} <span className="text-xs font-normal text-emerald-700">units</span>
                </div>
                <div className="text-[11px] text-emerald-700">Artisanal & Luxury Pan</div>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Cafe</span>
                <div className="text-xl font-bold text-amber-950 font-mono">
                  {categoryCounts.Cafe.toLocaleString()} <span className="text-xs font-normal text-amber-700">units</span>
                </div>
                <div className="text-[11px] text-amber-700">Beverages & Shakes</div>
              </div>

              <div className="p-4 bg-cyan-50/70 border border-cyan-200/80 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-cyan-800 uppercase tracking-wider block">Essentials</span>
                <div className="text-xl font-bold text-cyan-950 font-mono">
                  {categoryCounts.Essentials.toLocaleString()} <span className="text-xs font-normal text-cyan-700">units</span>
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
                onClick={() => onNavigateTab('inventory')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1"
              >
                <span>Full Inventory</span>
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
                    const isCritical = item.stockQuantity === 0;
                    const isLow = item.stockQuantity <= item.lowStockThreshold && item.stockQuantity > 0;

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
                            {item.stockQuantity} {item.unit}
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
                Live Broadcast Channel
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                <Radio className="w-3.5 h-3.5 animate-pulse" /> Active
              </span>
            </div>

            <div>
              <h3 className="font-bold text-white text-sm">POS ↔ Admin Synchronization</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every sale, inventory deduction, and price change broadcasts instantly without manual reload.
              </p>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-800 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Total Live Orders:</span>
                <span className="font-bold text-white font-mono">{orders.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Active POS Counters:</span>
                <span className="text-emerald-400 font-bold">8 Online</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Storage Backend:</span>
                <span className="text-indigo-300 font-mono">Reactive Broadcast Bus</span>
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
                  onClick={() => onNavigateTab('inventory')}
                  className="text-xs text-amber-700 hover:underline font-bold"
                >
                  Manage
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
                        On Hand: {item.stockQuantity} {item.unit}
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
              <div className="text-[11px] text-slate-500">No items below critical thresholds</div>
            </div>
          )}

          {/* Quick System Integrity */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-tight text-xs">
              System Operations
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
                  Midnight DB Roll Forward
                </span>
                <span className="font-mono text-slate-700">12:00 AM</span>
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
    </div>
  );
};
