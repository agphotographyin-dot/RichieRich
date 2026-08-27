import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Download,
  Calendar,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  FileSpreadsheet,
  Store,
  Users,
  Award,
  CreditCard,
  Percent,
  CheckCircle2,
  Layers,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { InventoryItem, Order, Customer, StoreFinancialStats, StoreOutlet } from '../../types';
import { CURRENCY, storage } from '../../services/storage';
import { pdfReportService } from '../../services/pdfReportService';

interface AdminAnalyticsProps {
  inventory: InventoryItem[];
  orders: Order[];
  customers?: Customer[];
  stats?: StoreFinancialStats;
}

export const AdminAnalytics: React.FC<AdminAnalyticsProps> = ({
  inventory,
  orders,
  customers = [],
  stats: propStats,
}) => {
  const [selectedMonth, setSelectedMonth] = useState('August 2026');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [selectedCounter, setSelectedCounter] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'financial' | 'staff' | 'inventory'>('financial');

  const stores = storage.getStores();

  // Get available counters based on selected store
  const availableCounters = useMemo(() => {
    if (selectedStoreId === 'all') {
      const counterSet = new Set<number>();
      stores.forEach((s) => s.counters.forEach((c) => counterSet.add(c.id)));
      return Array.from(counterSet).sort((a, b) => a - b);
    }
    const store = stores.find((s) => s.id === selectedStoreId);
    return store ? store.counters.map((c) => c.id) : [];
  }, [selectedStoreId, stores]);

  // Extract all salesperson names
  const allStaffNames = useMemo(() => {
    const names = new Set<string>();
    orders.forEach((o) => {
      if (o.cashierName) names.add(o.cashierName);
    });
    stores.forEach((s) => {
      s.counters.forEach((c) => {
        if (c.cashierName) names.add(c.cashierName);
      });
    });
    return Array.from(names);
  }, [orders, stores]);

  // Filter orders based on active filters
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Store filter
      if (selectedStoreId !== 'all') {
        if (o.storeId && o.storeId !== selectedStoreId) return false;
        if (!o.storeId) {
          const store = stores.find((s) => s.id === selectedStoreId);
          if (store && o.storeName && !o.storeName.includes(store.shortName)) return false;
        }
      }

      // Counter filter
      if (selectedCounter !== 'all') {
        const targetCounterNum = Number(selectedCounter);
        if (o.counterNumber !== targetCounterNum) return false;
      }

      // Staff filter
      if (selectedStaff !== 'all') {
        if (o.cashierName !== selectedStaff) return false;
      }

      return true;
    });
  }, [orders, selectedStoreId, selectedCounter, selectedStaff, stores]);

  // Dynamic Financial Computations
  const filteredStats = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalProfit = filteredOrders.reduce((sum, o) => sum + o.totalProfit, 0);
    const totalCOGS = filteredOrders.reduce((sum, o) => sum + o.totalCost, 0);
    const totalGST = filteredOrders.reduce((sum, o) => sum + o.taxAmount, 0);
    const orderCount = filteredOrders.length;
    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
    const marginPercent = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

    return {
      totalRevenue,
      totalProfit,
      totalCOGS,
      totalGST,
      orderCount,
      avgOrderValue,
      marginPercent,
    };
  }, [filteredOrders]);

  // Store-wise Financial Comparison Data for Chart
  const storeComparisonData = useMemo(() => {
    return stores.map((store) => {
      const storeOrders = orders.filter(
        (o) => o.storeId === store.id || (o.storeName && o.storeName.includes(store.shortName))
      );
      const rev = storeOrders.reduce((s, o) => s + o.grandTotal, 0);
      const prof = storeOrders.reduce((s, o) => s + o.totalProfit, 0);
      const cogs = storeOrders.reduce((s, o) => s + o.totalCost, 0);
      return {
        name: store.shortName,
        revenue: Math.round(rev),
        profit: Math.round(prof),
        cogs: Math.round(cogs),
        orders: storeOrders.length,
      };
    });
  }, [stores, orders]);

  // Staff Performance Ranking
  const staffPerformance = useMemo(() => {
    const staffMap = new Map<
      string,
      { name: string; storeName: string; counterNum?: number; ordersCount: number; revenue: number; profit: number }
    >();

    // Seed from stores
    stores.forEach((s) => {
      s.counters.forEach((c) => {
        if (!staffMap.has(c.cashierName)) {
          staffMap.set(c.cashierName, {
            name: c.cashierName,
            storeName: s.shortName,
            counterNum: c.id,
            ordersCount: 0,
            revenue: 0,
            profit: 0,
          });
        }
      });
    });

    // Populate from orders
    orders.forEach((o) => {
      const staffName = o.cashierName || 'Online Direct App';
      const current = staffMap.get(staffName) || {
        name: staffName,
        storeName: o.storeName || 'Online / Direct',
        counterNum: o.counterNumber,
        ordersCount: 0,
        revenue: 0,
        profit: 0,
      };
      current.ordersCount += 1;
      current.revenue += o.grandTotal;
      current.profit += o.totalProfit;
      staffMap.set(staffName, current);
    });

    return Array.from(staffMap.values())
      .filter((s) => (selectedStaff === 'all' ? true : s.name === selectedStaff))
      .sort((a, b) => b.revenue - a.revenue);
  }, [orders, stores, selectedStaff]);

  // Margin ranking per item
  const itemsByMargin = [...inventory]
    .sort((a, b) => (b.marginPercentage || 0) - (a.marginPercentage || 0))
    .slice(0, 10);

  const marginChartData = itemsByMargin.map((item) => ({
    name: item.name.length > 16 ? item.name.slice(0, 16) + '...' : item.name,
    margin: item.marginPercentage || 0,
    profit: item.profitPerUnit || 0,
    cost: item.costPrice,
    selling: item.sellingPrice,
  }));

  const handleExportPDF = () => {
    const storeLabel = selectedStoreId === 'all' ? 'All Outlets & Branches' : selectedStoreId;
    pdfReportService.exportMonthlyAnalyticsPDF(selectedMonth, storeLabel);
  };

  const handleExportCSV = () => {
    const csv = storage.exportMonthlyAnalyticalReportCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Richie_Rich_Financial_Performance_${selectedStoreId}_${selectedMonth.replace(' ', '_')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Store & Staff Analytics</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              Real-time Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track multi-branch financials, profit contributions, sales counter throughput, and staff efficiency metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 font-medium">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="August 2026">August 2026 (Current)</option>
              <option value="July 2026">July 2026</option>
              <option value="June 2026">June 2026</option>
            </select>
          </div>

          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-linear-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Export official performance report as PDF"
          >
            <Download className="w-4 h-4" />
            <span>Export PDF Report</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
            title="Download CSV Spreadsheet"
          >
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Matrix Bar: Store, Counter, Staff */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <span>Analytics Filter Controls</span>
          </span>

          {(selectedStoreId !== 'all' || selectedCounter !== 'all' || selectedStaff !== 'all') && (
            <button
              onClick={() => {
                setSelectedStoreId('all');
                setSelectedCounter('all');
                setSelectedStaff('all');
              }}
              className="text-xs text-amber-700 font-bold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Store Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              🏬 Store Outlet
            </label>
            <select
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value);
                setSelectedCounter('all');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-slate-400 cursor-pointer"
            >
              <option value="all">All Stores & Outlets</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shortName} ({s.counters.length} Counters)
                </option>
              ))}
            </select>
          </div>

          {/* Sales Counter Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              🖥️ Sales Counter
            </label>
            <select
              value={selectedCounter}
              onChange={(e) => setSelectedCounter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-slate-400 cursor-pointer"
            >
              <option value="all">All Sales Counters</option>
              {availableCounters.map((num) => (
                <option key={num} value={num.toString()}>
                  Counter #{num}
                </option>
              ))}
            </select>
          </div>

          {/* Salesperson / Staff Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              👤 Staff / Salesperson
            </label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-slate-400 cursor-pointer"
            >
              <option value="all">All Sales Personnel</option>
              {allStaffNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit text-xs">
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'financial'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          <span>Financial & Store Profit</span>
        </button>
        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'staff'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-amber-600" />
          <span>Staff & Counter Performance</span>
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'inventory'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span>Product SKU Economics</span>
        </button>
      </div>

      {/* FINANCIAL & PROFIT VIEW */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* Key Financial Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Filtered Net Revenue</span>
              <div className="text-2xl font-bold text-slate-800 mt-1">
                {CURRENCY}{filteredStats.totalRevenue.toFixed(2)}
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                <span>{filteredStats.orderCount} Orders Billed</span>
                <span className="text-emerald-600 font-bold">Avg {CURRENCY}{filteredStats.avgOrderValue.toFixed(0)}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Store Net Profit</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                +{CURRENCY}{filteredStats.totalProfit.toFixed(2)}
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                <span>Gross Margin: {filteredStats.marginPercent}%</span>
                <span className="text-emerald-700 font-bold">High Yield</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">Cost of Goods (COGS)</span>
              <div className="text-2xl font-bold text-slate-800 mt-1">
                {CURRENCY}{filteredStats.totalCOGS.toFixed(2)}
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                <span>Direct Ingredient Cost</span>
                <span className="text-slate-600 font-bold">{((filteredStats.totalCOGS / (filteredStats.totalRevenue || 1)) * 100).toFixed(1)}% of Sales</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase">GST Tax Collected</span>
              <div className="text-2xl font-bold text-slate-800 mt-1">
                {CURRENCY}{filteredStats.totalGST.toFixed(2)}
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                <span>SGST + CGST Pool</span>
                <span className="text-amber-700 font-bold">Compliant</span>
              </div>
            </div>
          </div>

          {/* Store Comparison Chart */}
          <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">
                  Store Outlets: Revenue vs Net Profit (₹)
                </h3>
                <p className="text-xs text-slate-500">Comparative multi-branch financial contribution</p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storeComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    formatter={(value: any, name: string) => [`${CURRENCY}${value}`, name === 'revenue' ? 'Gross Revenue' : name === 'profit' ? 'Net Profit' : 'COGS']}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#1E293B" radius={[4, 4, 0, 0]} name="Gross Revenue" />
                  <Bar dataKey="profit" fill="#10B981" radius={[4, 4, 0, 0]} name="Net Profit" />
                  <Bar dataKey="cogs" fill="#CBD5E1" radius={[4, 4, 0, 0]} name="COGS" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* STAFF & SALES COUNTER PERFORMANCE VIEW */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* Top Performance Leaderboard */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">
                  Salesperson & Cashier Performance Matrix
                </h3>
                <p className="text-xs text-slate-500">Track individual sales revenue, transaction count & profit generation</p>
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                {staffPerformance.length} Active Personnel
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Salesperson</th>
                    <th className="py-3 px-3">Assigned Branch & Counter</th>
                    <th className="py-3 px-3">Orders Billed</th>
                    <th className="py-3 px-3">Total Sales (₹)</th>
                    <th className="py-3 px-3">Net Profit Generated</th>
                    <th className="py-3 px-3">Avg Order Value</th>
                    <th className="py-3 px-4 text-right">Performance Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {staffPerformance.map((staff, idx) => {
                    const avgTicket = staff.ordersCount > 0 ? staff.revenue / staff.ordersCount : 0;
                    return (
                      <tr key={staff.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                              {staff.name[0]}
                            </div>
                            <span>{staff.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-slate-800">{staff.storeName}</span>
                          {staff.counterNum && (
                            <span className="text-[10px] text-slate-500 block">Counter {staff.counterNum}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-slate-900">
                          {staff.ordersCount} tickets
                        </td>
                        <td className="py-3.5 px-3 font-bold text-slate-900 text-sm">
                          {CURRENCY}{staff.revenue.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 font-bold text-emerald-600">
                          +{CURRENCY}{staff.profit.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-3 text-slate-600 font-medium">
                          {CURRENCY}{avgTicket.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                              idx === 0
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : idx === 1
                                ? 'bg-slate-200 text-slate-800 border-slate-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {idx === 0 ? '🏆 Top Performer' : `Rank #${idx + 1}`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* INVENTORY SKU ECONOMICS VIEW */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Profit Margin Per Item Bar Chart */}
          <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">Profit Margin (%) by Product</h3>
                <p className="text-xs text-slate-500">Sorted by highest return on investment</p>
              </div>
              <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                Avg Margin: ~58.2%
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marginChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} angle={-15} textAnchor="end" />
                  <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 80]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    formatter={(value: any) => [`${value}% Margin`, 'Profit Margin']}
                  />
                  <Bar dataKey="margin" fill="#10b981" radius={[4, 4, 0, 0]}>
                    {marginChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.margin > 60 ? '#10b981' : entry.margin > 50 ? '#f59e0b' : '#0ea5e9'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Table Matrix of Profit Margins */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm uppercase tracking-tight">Product Profitability Breakdown Matrix</h3>
              <span className="text-xs text-slate-500 font-medium">Real-time SKU Unit Economics</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Tax Status</th>
                    <th className="py-3 px-3">Cost Price</th>
                    <th className="py-3 px-3">Selling Price</th>
                    <th className="py-3 px-3">Net Profit / Unit</th>
                    <th className="py-3 px-3">Margin %</th>
                    <th className="py-3 px-3">Current Stock</th>
                    <th className="py-3 px-4 text-right">Stock Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {inventory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{item.name}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.isTaxApplicable !== false
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {item.isTaxApplicable !== false ? `${item.taxRate ?? 5}% GST` : '0% Exempt'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{CURRENCY}{item.costPrice.toFixed(2)}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{CURRENCY}{item.sellingPrice.toFixed(2)}</td>
                      <td className="py-3 px-3 font-bold text-emerald-600">+{CURRENCY}{item.profitPerUnit?.toFixed(2)}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[11px]">
                          {item.marginPercentage}%
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">{item.stockQuantity} {item.unit}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {CURRENCY}{(item.stockQuantity * item.costPrice).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

