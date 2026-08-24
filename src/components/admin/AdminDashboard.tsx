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
  Sparkles,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Scan,
  Send,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { InventoryItem, Order, Customer, StoreFinancialStats, Role, AdminTab } from '../../types';
import { CURRENCY, storage } from '../../services/storage';

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

  // Compute chart data for revenue vs profit over orders
  const revenueChartData = orders.slice(0, 10).reverse().map((o) => ({
    name: o.orderNumber.replace('RR-2026-', '#'),
    revenue: Math.round(o.grandTotal),
    profit: Math.round(o.totalProfit),
    cost: Math.round(o.totalCost),
  }));

  // Category breakdown
  const categoryCounts: { [key: string]: number } = {};
  inventory.forEach((i) => {
    categoryCounts[i.category] = (categoryCounts[i.category] || 0) + i.stockQuantity;
  });

  const categoryPieData = Object.entries(categoryCounts).map(([key, val]) => {
    let label = 'Specialty Paan';
    if (key === 'cat-mukhwas') label = 'Mukhwas & Supari';
    if (key === 'cat-shakes') label = 'Shakes & Drinks';
    if (key === 'cat-chocolates') label = 'Chocolates';
    if (key === 'cat-herbal') label = 'Herbal & Accessories';
    return { name: label, value: val };
  });

  const PIE_COLORS = ['#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899'];

  // Low stock urgent list
  const lowStockItems = inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold);

  // Top profit margin items
  const topMarginItems = [...inventory]
    .sort((a, b) => (b.marginPercentage || 0) - (a.marginPercentage || 0))
    .slice(0, 4);

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
      {/* Top Welcome Action Bar */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Store Executive Overview</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              Live Operations
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time retail inventory tracking, profit margins, and automated midnight database synchronization.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              className="bg-[#1E293B] hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Scan className="w-3.5 h-3.5 text-amber-400" />
              <span>Open Scanner</span>
            </button>
          )}

          {onOpenAddItem && (
            <button
              onClick={onOpenAddItem}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          )}

          <button
            onClick={() => onNavigateTab('staff_counters')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff & PINs</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center justify-between">
            <span>Today's Revenue</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {CURRENCY}{stats.totalRevenue.toLocaleString()}
          </div>
          <div className="text-emerald-600 text-xs font-bold mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> ↑ 18.4% vs yesterday
          </div>
        </div>

        {/* Active Loyalty Users */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center justify-between">
            <span>Active Loyalty Users</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {customers.length.toLocaleString()}
          </div>
          <div className="text-slate-500 text-xs font-medium mt-2">
            18 new joins this week
          </div>
        </div>

        {/* Avg Margin */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center justify-between">
            <span>Gross Profit Margin</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {stats.overallMarginPercent}%
          </div>
          <div className="text-amber-600 text-xs font-bold mt-2">
            Target: 38% • {CURRENCY}{stats.grossProfit.toLocaleString()} Net
          </div>
        </div>

        {/* Stock Units & Valuation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center justify-between">
            <span>Total Stock Units</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {inventory.reduce((sum, i) => sum + i.stockQuantity, 0)}
          </div>
          <div className="text-slate-500 text-xs mt-2 flex justify-between items-center">
            <span>Valuation: {CURRENCY}{stats.totalInventoryValue.toLocaleString()}</span>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-blue-600 hover:text-blue-700 font-bold flex items-center"
            >
              SKUs <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Body Grid: 8 Cols Left, 4 Cols Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Real-Time Inventory Table Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 uppercase tracking-tight text-sm">
                  Real-Time Inventory Status
                </h3>
                <p className="text-xs text-slate-500">Live on-hand balance and safety reorder health</p>
              </div>
              {onOpenScanner && (
                <button
                  onClick={onOpenScanner}
                  className="bg-[#1E293B] hover:bg-slate-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Scan className="w-3.5 h-3.5 text-amber-400" />
                  <span>Open Scanner</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[11px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <tr>
                    <th className="pb-3 font-bold">Item Name</th>
                    <th className="pb-3 font-bold">Stock Level</th>
                    <th className="pb-3 font-bold">Cost / Margin</th>
                    <th className="pb-3 text-right font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {inventory.slice(0, 6).map((item) => {
                    const isCritical = item.stockQuantity === 0;
                    const isLow = item.stockQuantity <= item.lowStockThreshold && item.stockQuantity > 0;

                    return (
                      <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5">
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          <div className="text-[11px] font-mono text-slate-400">{item.sku}</div>
                        </td>
                        <td className="py-3.5 font-medium text-slate-700">
                          <span className={isCritical ? 'text-red-600 font-bold' : isLow ? 'text-amber-600 font-bold' : 'text-slate-800'}>
                            {item.stockQuantity} {item.unit}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-600 text-xs">
                          {CURRENCY}{item.costPrice} / <span className="text-emerald-600 font-bold">+{item.marginPercentage}%</span>
                        </td>
                        <td className="py-3.5 text-right">
                          {isCritical ? (
                            <span className="px-2.5 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-[10px] font-bold uppercase">
                              Critical
                            </span>
                          ) : isLow ? (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold uppercase">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-green-50 text-green-600 border border-green-200 rounded text-[10px] font-bold uppercase">
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

            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Showing 6 of {inventory.length} catalog items</span>
              <button
                onClick={() => onNavigateTab('inventory')}
                className="text-slate-800 hover:text-slate-900 font-bold flex items-center gap-1"
              >
                View Full Inventory Catalog <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Revenue vs Profit Chart Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 uppercase tracking-tight text-sm">
                  Revenue vs Gross Profit Trend
                </h3>
                <p className="text-xs text-slate-500">Transaction financial breakdown</p>
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

            <div className="h-60 w-full">
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
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
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
          {/* Dark Navy Loyalty Analytics Card */}
          <div className="bg-[#1E293B] p-6 rounded-xl shadow-md text-white">
            <h3 className="font-bold uppercase text-xs tracking-widest text-slate-400 mb-4">
              Loyalty Analytics
            </h3>

            {/* Amber Graphic Bars */}
            <div className="flex items-end space-x-2 h-24 mb-4">
              <div className="flex-1 bg-amber-500 opacity-40 rounded-t h-1/2" />
              <div className="flex-1 bg-amber-500 opacity-60 rounded-t h-3/4" />
              <div className="flex-1 bg-amber-500 rounded-t h-full" />
              <div className="flex-1 bg-amber-500 opacity-80 rounded-t h-2/3" />
              <div className="flex-1 bg-amber-500 opacity-50 rounded-t h-1/2" />
            </div>

            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium">Points Redeemed</span>
                <span className="font-bold text-white">45,200 pts</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium">Active Promo</span>
                <span className="text-amber-400 font-bold">WEEKEND-FEST</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400 font-medium">VIP Tier Ratio</span>
                <span className="text-emerald-400 font-bold">64% Gold / Plat</span>
              </div>

              <button
                onClick={handleSendQuickPush}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-3 rounded-lg transition-colors mt-2 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>SEND PUSH NOTIFICATION</span>
              </button>
            </div>
          </div>

          {/* System Health Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 uppercase tracking-tight text-sm mb-4">
              System Health & Integrity
            </h3>
            <div className="space-y-3.5">
              <div className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                <span className="text-xs text-slate-700 font-medium">Database Auto-Backup (12:00 AM)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                <span className="text-xs text-slate-700 font-medium">Optical Scanner: Ready</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                <span className="text-xs text-slate-700 font-medium">Real-Time State Bus: Synced</span>
              </div>
            </div>

            <button
              onClick={handleExportCSV}
              className="w-full mt-6 py-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>EXPORT MONTHLY REPORT</span>
            </button>
          </div>

          {/* Low Stock Priority Queue Card */}
          {lowStockItems.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-amber-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-slate-800 uppercase tracking-tight text-xs">
                    Low Stock Priority ({lowStockItems.length})
                  </h3>
                </div>
                <button
                  onClick={() => onNavigateTab('inventory')}
                  className="text-xs text-amber-700 hover:underline font-bold"
                >
                  Manage
                </button>
              </div>

              <div className="space-y-2.5">
                {lowStockItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-amber-50/50 border border-amber-100 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 truncate max-w-[140px]">{item.name}</div>
                      <div className="text-[11px] text-amber-700 font-semibold">
                        Stock: {item.stockQuantity} {item.unit}
                      </div>
                    </div>
                    <button
                      onClick={() => handleQuickRestock(item)}
                      className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded text-[10px] cursor-pointer"
                    >
                      +20 Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

