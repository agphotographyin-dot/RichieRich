import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Download,
  Calendar,
  IndianRupee,
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
  Boxes,
  PackageCheck,
  Package,
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
  const [activeTab, setActiveTab] = useState<'financial' | 'staff' | 'inventory' | 'box_loose'>('financial');

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

  // Box & Loose Product Sales & Consumption Analytics (Requirement 12)
  const boxLooseReportData = useMemo(() => {
    const map = new Map<
      string,
      {
        itemId: string;
        name: string;
        sku: string;
        category: string;
        piecesPerBox: number;
        boxPrice: number;
        loosePrice: number;
        boxSalesCount: number;
        looseSalesCount: number;
        totalPiecesSold: number;
        boxEquivalentConsumed: number;
        boxRevenue: number;
        looseRevenue: number;
        totalRevenue: number;
        totalProfit: number;
      }
    >();

    // Seed with all configured box & loose products from inventory
    inventory.forEach((inv) => {
      if (inv.sellAsLoose || (inv.piecesPerBox && inv.piecesPerBox > 1)) {
        const ppb = inv.piecesPerBox && inv.piecesPerBox > 0 ? inv.piecesPerBox : 10;
        const looseP =
          inv.loosePrice !== undefined
            ? inv.loosePrice
            : Math.round((inv.sellingPrice / ppb) * 100) / 100;
        map.set(inv.id, {
          itemId: inv.id,
          name: inv.name,
          sku: inv.sku,
          category: inv.category,
          piecesPerBox: ppb,
          boxPrice: inv.sellingPrice,
          loosePrice: looseP,
          boxSalesCount: 0,
          looseSalesCount: 0,
          totalPiecesSold: 0,
          boxEquivalentConsumed: 0,
          boxRevenue: 0,
          looseRevenue: 0,
          totalRevenue: 0,
          totalProfit: 0,
        });
      }
    });

    // Scan filtered orders for sales transactions
    filteredOrders.forEach((o) => {
      o.items.forEach((it) => {
        const inv = inventory.find((i) => i.id === it.itemId);
        const isBoxLoose =
          it.saleType === 'box' ||
          it.saleType === 'loose' ||
          Boolean(inv && (inv.sellAsLoose || (inv.piecesPerBox && inv.piecesPerBox > 1)));

        if (!isBoxLoose) return;

        const ppb = it.piecesPerBox || inv?.piecesPerBox || 10;
        let record = map.get(it.itemId);
        if (!record) {
          const looseP =
            inv?.loosePrice !== undefined
              ? inv.loosePrice
              : Math.round(((inv?.sellingPrice || it.price) / ppb) * 100) / 100;
          record = {
            itemId: it.itemId,
            name: it.name.replace(/\s*\((?:1 Box|Loose Piece)\)/i, ''),
            sku: it.sku || inv?.sku || '',
            category: inv?.category || 'General',
            piecesPerBox: ppb,
            boxPrice: inv?.sellingPrice || it.price,
            loosePrice: looseP,
            boxSalesCount: 0,
            looseSalesCount: 0,
            totalPiecesSold: 0,
            boxEquivalentConsumed: 0,
            boxRevenue: 0,
            looseRevenue: 0,
            totalRevenue: 0,
            totalProfit: 0,
          };
          map.set(it.itemId, record);
        }

        if (it.saleType === 'loose') {
          record.looseSalesCount += it.quantity;
          record.looseRevenue += it.subtotal;
        } else {
          record.boxSalesCount += it.quantity;
          record.boxRevenue += it.subtotal;
        }
        record.totalProfit += it.profit || 0;
        record.totalRevenue += it.subtotal;
      });
    });

    return Array.from(map.values()).map((rec) => {
      const totalPieces = rec.boxSalesCount * rec.piecesPerBox + rec.looseSalesCount;
      const boxEq = totalPieces > 0 ? Number((totalPieces / rec.piecesPerBox).toFixed(2)) : 0;
      return {
        ...rec,
        totalPiecesSold: totalPieces,
        boxEquivalentConsumed: boxEq,
      };
    });
  }, [filteredOrders, inventory]);

  const boxLooseTotals = useMemo(() => {
    return boxLooseReportData.reduce(
      (acc, r) => ({
        totalBoxes: acc.totalBoxes + r.boxSalesCount,
        totalLoose: acc.totalLoose + r.looseSalesCount,
        totalPieces: acc.totalPieces + r.totalPiecesSold,
        totalBoxEq: Number((acc.totalBoxEq + r.boxEquivalentConsumed).toFixed(2)),
        totalBoxRevenue: acc.totalBoxRevenue + r.boxRevenue,
        totalLooseRevenue: acc.totalLooseRevenue + r.looseRevenue,
        totalRevenue: acc.totalRevenue + r.totalRevenue,
        totalProfit: acc.totalProfit + r.totalProfit,
      }),
      {
        totalBoxes: 0,
        totalLoose: 0,
        totalPieces: 0,
        totalBoxEq: 0,
        totalBoxRevenue: 0,
        totalLooseRevenue: 0,
        totalRevenue: 0,
        totalProfit: 0,
      }
    );
  }, [boxLooseReportData]);

  const handleExportBoxLooseCSV = () => {
    let csv = `RICHIE RICH PAN HOUSE - BOX & LOOSE PRODUCT SALES & CONSUMPTION REPORT\n`;
    csv += `Audit Month,${selectedMonth}\n`;
    csv += `Store Outlet Filter,${selectedStoreId === 'all' ? 'All Stores & Outlets' : selectedStoreId}\n`;
    csv += `Generated Timestamp,${new Date().toISOString()}\n`;
    csv += `Conversion Rule,1 Box = X Pieces | Total Pieces = (Full Boxes * Pieces/Box) + Loose Pieces\n\n`;

    csv += `SUMMARY TOTALS\n`;
    csv += `Metric,Value\n`;
    csv += `Total Box Sales,${boxLooseTotals.totalBoxes} Boxes\n`;
    csv += `Total Loose Pieces Sold,${boxLooseTotals.totalLoose} Pieces\n`;
    csv += `Total Pieces Sold Equivalent,${boxLooseTotals.totalPieces} Pieces\n`;
    csv += `Total Box Equivalent Consumed,${boxLooseTotals.totalBoxEq} Boxes\n`;
    csv += `Box Revenue,${CURRENCY}${boxLooseTotals.totalBoxRevenue.toFixed(2)}\n`;
    csv += `Loose Pieces Revenue,${CURRENCY}${boxLooseTotals.totalLooseRevenue.toFixed(2)}\n`;
    csv += `Total Box & Loose Revenue,${CURRENCY}${boxLooseTotals.totalRevenue.toFixed(2)}\n\n`;

    csv += `DETAILED PRODUCT BREAKDOWN MATRIX\n`;
    csv += `Product Name,SKU,Category,Pieces Per Box,Box Sales (Boxes),Loose Pieces Sold (Pcs),Total Pieces Sold,Box Equivalent Consumed,Box Price (${CURRENCY}),Loose Price (${CURRENCY}),Box Revenue (${CURRENCY}),Loose Revenue (${CURRENCY}),Total Revenue (${CURRENCY}),Profit (${CURRENCY})\n`;

    boxLooseReportData.forEach((row) => {
      csv += `"${row.name.replace(/"/g, '""')}","${row.sku}","${row.category}",${row.piecesPerBox},${row.boxSalesCount},${row.looseSalesCount},${row.totalPiecesSold},${row.boxEquivalentConsumed},${row.boxPrice},${row.loosePrice},${row.boxRevenue.toFixed(2)},${row.looseRevenue.toFixed(2)},${row.totalRevenue.toFixed(2)},${row.totalProfit.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Richie_Rich_Box_Loose_Sales_Report_${selectedStoreId}_${selectedMonth.replace(' ', '_')}.csv`;
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
          <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
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
        <button
          onClick={() => setActiveTab('box_loose')}
          className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'box_loose'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Boxes className="w-3.5 h-3.5 text-purple-600" />
          <span>Box & Loose Sales & Consumption</span>
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

      {/* BOX & LOOSE SALES & CONSUMPTION VIEW (Requirement 12) */}
      {activeTab === 'box_loose' && (
        <div className="space-y-6">
          {/* Header & Export Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold border border-purple-200">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Box & Loose Product Sales & Consumption</h3>
                  <p className="text-xs text-slate-500">
                    Detailed tracking of Full Boxes sold, Loose Pieces sold, Equivalent Boxes consumed, and Total Pieces.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleExportBoxLooseCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              title="Download Box & Loose Sales Report CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Box & Loose CSV</span>
            </button>
          </div>

          {/* 5 Core Metric Cards as per Requirement 12 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* 1. Box Sales */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                📦 Box Sales
              </span>
              <div className="text-2xl font-black text-indigo-900 mt-1">
                {boxLooseTotals.totalBoxes}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Complete sealed boxes sold</p>
            </div>

            {/* 2. Loose Pieces Sold */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                🥢 Loose Pieces Sold
              </span>
              <div className="text-2xl font-black text-amber-900 mt-1">
                {boxLooseTotals.totalLoose}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Individual units sold at POS</p>
            </div>

            {/* 3. Total Pieces Sold */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                🔢 Total Pieces Sold
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {boxLooseTotals.totalPieces}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">(Boxes × Pcs/Box) + Loose</p>
            </div>

            {/* 4. Box Equivalent Consumed */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs bg-linear-to-br from-purple-50/50 to-white">
              <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider block">
                📊 Box Eq. Consumed
              </span>
              <div className="text-2xl font-black text-purple-950 mt-1">
                {boxLooseTotals.totalBoxEq} <span className="text-xs font-bold text-purple-600">Boxes</span>
              </div>
              <p className="text-[11px] text-purple-700 mt-0.5">Total Pieces / Pcs Per Box</p>
            </div>

            {/* 5. Total Revenue */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs sm:col-span-2 lg:col-span-1">
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                💰 Total Revenue
              </span>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                {CURRENCY}{boxLooseTotals.totalRevenue.toFixed(2)}
              </div>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Box: {CURRENCY}{boxLooseTotals.totalBoxRevenue.toFixed(0)} • Loose: {CURRENCY}{boxLooseTotals.totalLooseRevenue.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Core Rule & Example Scenario Card matching Requirement 12 */}
          <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-700 text-white font-mono text-[10px] font-black">
                  CONSUMPTION FORMULA
                </span>
                <span className="font-bold text-indigo-950">
                  Box Equivalent Consumed = (Box Sales) + (Loose Pieces Sold / Pieces per Box)
                </span>
              </div>
              <p className="text-indigo-800 text-[11px]">
                <strong>Rule:</strong> The inventory transaction history tracks exact equivalent boxes consumed while preserving POS transaction register records as individual loose sales. Inventory never rounds loose pieces.
              </p>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-200 text-[11px] text-indigo-950 font-mono shadow-2xs whitespace-nowrap">
              Example: 5 Boxes + 17 Loose (10/box) = <strong>6.7 Boxes Equivalent</strong>
            </div>
          </div>

          {/* Product Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-tight">
                Product-by-Product Sales & Consumption Matrix
              </h3>
              <span className="text-xs text-slate-500 font-medium font-mono">
                {boxLooseReportData.length} SKUs Monitored
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Product & SKU</th>
                    <th className="py-3 px-3 text-center">Pcs / Box</th>
                    <th className="py-3 px-3 text-center">Box Sales</th>
                    <th className="py-3 px-3 text-center">Loose Pieces Sold</th>
                    <th className="py-3 px-3 text-center">Total Pieces Sold</th>
                    <th className="py-3 px-3 text-center bg-purple-50/50 text-purple-900 border-x border-purple-100">
                      Box Eq. Consumed
                    </th>
                    <th className="py-3 px-3 text-right">Box Price</th>
                    <th className="py-3 px-3 text-right">Loose Price</th>
                    <th className="py-3 px-3 text-right">Box Revenue</th>
                    <th className="py-3 px-3 text-right">Loose Revenue</th>
                    <th className="py-3 px-4 text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {boxLooseReportData.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-600">No Box & Loose sales recorded in this period.</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Products configured with &quot;Sell as Loose Product&quot; will appear here once sold via POS.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    boxLooseReportData.map((row) => (
                      <tr key={row.itemId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{row.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {row.sku} • {row.category}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 bg-slate-50">
                          {row.piecesPerBox}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700">
                          {row.boxSalesCount > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100">
                              {row.boxSalesCount} Boxes
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-700">
                          {row.looseSalesCount > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-100">
                              {row.looseSalesCount} Pcs
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-slate-900">
                          {row.totalPiecesSold}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-black text-purple-900 bg-purple-50/40 border-x border-purple-100">
                          {row.boxEquivalentConsumed > 0 ? (
                            <span>{row.boxEquivalentConsumed} Boxes</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {CURRENCY}{row.boxPrice}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {CURRENCY}{row.loosePrice}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-indigo-700">
                          {CURRENCY}{row.boxRevenue.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-amber-700">
                          {CURRENCY}{row.looseRevenue.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                          {CURRENCY}{row.totalRevenue.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

