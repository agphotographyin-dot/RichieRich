import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  Clock,
  Filter,
  IndianRupee,
  User,
  ArrowRight,
  Printer,
  ChevronDown,
  Store,
  BadgePercent,
  UserCheck,
  FileText,
  Calendar,
  CreditCard,
  Smartphone,
  Banknote,
  TrendingUp,
  Download,
  Receipt,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { Order, OrderStatus, PaymentMethod } from '../../types';
import { CURRENCY, storage } from '../../services/storage';
import { pdfReportService } from '../../services/pdfReportService';
import { DocumentManifestModal } from '../common/DocumentManifestModal';
import { DailyCollectionModal } from './DailyCollectionModal';

interface AdminOrdersProps {
  orders: Order[];
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({ orders }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | '7days' | 'all' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(todayStr);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'upi_qr' | 'card'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [salespersonFilter, setSalespersonFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState<Order | null>(null);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);

  const stores = storage.getStores();

  // Extract unique salespersons from orders & store counters
  const salespersons = Array.from(
    new Set([
      ...orders.map((o) => o.cashierName).filter(Boolean),
      ...stores.flatMap((s) => s.counters.map((c) => c.cashierName)),
    ])
  ) as string[];

  // Compute Today's metrics specifically for executive collection cards
  const todayOrders = useMemo(() => {
    return orders.filter((o) => o.createdAt.split('T')[0] === todayStr);
  }, [orders, todayStr]);

  const totalSaleToday = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  }, [todayOrders]);

  const todayCashOrders = useMemo(() => {
    return todayOrders.filter((o) => o.paymentMethod === 'cash');
  }, [todayOrders]);

  const todayUPIOrders = useMemo(() => {
    return todayOrders.filter((o) => o.paymentMethod === 'upi_qr');
  }, [todayOrders]);

  const todayCardOrders = useMemo(() => {
    return todayOrders.filter((o) => o.paymentMethod === 'card');
  }, [todayOrders]);

  const totalCashToday = useMemo(() => {
    return todayCashOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  }, [todayCashOrders]);

  const totalUPIToday = useMemo(() => {
    return todayUPIOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  }, [todayUPIOrders]);

  const totalCardToday = useMemo(() => {
    return todayCardOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  }, [todayCardOrders]);

  const todayGrossProfit = useMemo(() => {
    return todayOrders.reduce((sum, o) => sum + o.totalProfit, 0);
  }, [todayOrders]);

  // Selected date range or audit date for the current view
  const currentAuditDate = useMemo(() => {
    if (dateFilter === 'today') return todayStr;
    if (dateFilter === 'yesterday') return yesterdayStr;
    if (dateFilter === 'custom') return customDate;
    return todayStr;
  }, [dateFilter, todayStr, yesterdayStr, customDate]);

  // Filtered Orders for the Master Ledger Table
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const orderDateStr = o.createdAt.split('T')[0];

      // Date matching
      let matchesDate = true;
      if (dateFilter === 'today') {
        matchesDate = orderDateStr === todayStr;
      } else if (dateFilter === 'yesterday') {
        matchesDate = orderDateStr === yesterdayStr;
      } else if (dateFilter === '7days') {
        const orderTime = new Date(o.createdAt).getTime();
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        matchesDate = orderTime >= sevenDaysAgo;
      } else if (dateFilter === 'custom') {
        matchesDate = orderDateStr === customDate;
      }

      // Payment method matching
      const matchesPayment = paymentFilter === 'all' || o.paymentMethod === paymentFilter;

      // Text search matching
      const matchesSearch =
        o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.customerPhone && o.customerPhone.includes(searchTerm)) ||
        (o.storeName && o.storeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (o.cashierName && o.cashierName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        o.items.some((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchesSource = sourceFilter === 'all' || o.source === sourceFilter;
      const matchesStore =
        storeFilter === 'all' ||
        o.storeId === storeFilter ||
        (o.storeName && o.storeName.toLowerCase().includes(storeFilter.toLowerCase()));
      const matchesSalesperson =
        salespersonFilter === 'all' ||
        o.cashierName === salespersonFilter;

      return matchesDate && matchesPayment && matchesSearch && matchesStatus && matchesSource && matchesStore && matchesSalesperson;
    });
  }, [
    orders,
    dateFilter,
    todayStr,
    yesterdayStr,
    customDate,
    paymentFilter,
    searchTerm,
    statusFilter,
    sourceFilter,
    storeFilter,
    salespersonFilter,
  ]);

  // Aggregate stats for currently filtered slice
  const filteredTotalSale = filteredOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const filteredTotalProfit = filteredOrders.reduce((sum, o) => sum + o.totalProfit, 0);
  const filteredTotalTax = filteredOrders.reduce((sum, o) => sum + o.taxAmount, 0);

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    storage.updateOrderStatus(orderId, newStatus);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  const handleExportPDF = () => {
    pdfReportService.exportOrdersLedgerPDF(
      filteredOrders,
      `Store: ${storeFilter === 'all' ? 'All' : storeFilter} | Mode: ${paymentFilter} | Status: ${statusFilter}`,
      `Date: ${currentAuditDate}`
    );
  };

  const handleDownloadCSV = () => {
    const csvContent = storage.exportDailyCollectionReportCSV(currentAuditDate, storeFilter);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sales_ledger_${currentAuditDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Master Orders & Sales Ledger</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
              {orders.length} Total Orders
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              Live POS Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time fulfillment ledger with daily collection report, payment mode breakdown (Cash, UPI, Card), store counters & staff audit.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsDailyReportOpen(true)}
            className="px-3.5 py-2 bg-linear-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>Daily Collection Report (Z-Report)</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-linear-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export filtered sales ledger as PDF"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Export PDF Ledger</span>
          </button>

          <button
            onClick={handleDownloadCSV}
            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download CSV raw data"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* CORE STATS CARDS: TOTAL SALE TODAY & DAILY COLLECTION REPORT BREAKDOWN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. TOTAL SALE TODAY */}
        <div className="bg-white border border-amber-200/90 rounded-xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span>Total Sale Today</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
              {todayOrders.length} Bills
            </span>
          </div>

          <div className="my-2.5">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {CURRENCY}{totalSaleToday.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
              <span>Avg ticket: {CURRENCY}{todayOrders.length > 0 ? (totalSaleToday / todayOrders.length).toFixed(1) : '0.00'}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Gross Profit:</span>
            <span className="font-bold text-emerald-700">+{CURRENCY}{todayGrossProfit.toFixed(2)}</span>
          </div>
        </div>

        {/* 2. ONLY CASH */}
        <div
          className={`border rounded-xl p-4 shadow-xs flex flex-col justify-between transition-all ${
            paymentFilter === 'cash'
              ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Only Cash</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
              {totalSaleToday > 0 ? ((totalCashToday / totalSaleToday) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>

          <div className="my-2.5">
            <div className="text-2xl font-black text-emerald-950 tracking-tight">
              {CURRENCY}{totalCashToday.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              {todayCashOrders.length} cash orders today
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Physical Drawer Tally</span>
            <button
              onClick={() => {
                setDateFilter('today');
                setPaymentFilter(paymentFilter === 'cash' ? 'all' : 'cash');
              }}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                paymentFilter === 'cash'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
              }`}
            >
              {paymentFilter === 'cash' ? 'Showing Cash ✓' : 'Filter Only Cash'}
            </button>
          </div>
        </div>

        {/* 3. ONLY UPI */}
        <div
          className={`border rounded-xl p-4 shadow-xs flex flex-col justify-between transition-all ${
            paymentFilter === 'upi_qr'
              ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>Only UPI / QR</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
              {totalSaleToday > 0 ? ((totalUPIToday / totalSaleToday) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>

          <div className="my-2.5">
            <div className="text-2xl font-black text-indigo-950 tracking-tight">
              {CURRENCY}{totalUPIToday.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              {todayUPIOrders.length} QR / UPI transactions
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Bank QR Credit</span>
            <button
              onClick={() => {
                setDateFilter('today');
                setPaymentFilter(paymentFilter === 'upi_qr' ? 'all' : 'upi_qr');
              }}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                paymentFilter === 'upi_qr'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800'
              }`}
            >
              {paymentFilter === 'upi_qr' ? 'Showing UPI ✓' : 'Filter Only UPI'}
            </button>
          </div>
        </div>

        {/* 4. ONLY CARD */}
        <div
          className={`border rounded-xl p-4 shadow-xs flex flex-col justify-between transition-all ${
            paymentFilter === 'card'
              ? 'bg-sky-50/90 border-sky-400 ring-2 ring-sky-500/20'
              : 'bg-white border-slate-200 hover:border-sky-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-sky-600" />
              <span>Only Card</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-bold">
              {totalSaleToday > 0 ? ((totalCardToday / totalSaleToday) * 100).toFixed(1) : '0.0'}%
            </span>
          </div>

          <div className="my-2.5">
            <div className="text-2xl font-black text-sky-950 tracking-tight">
              {CURRENCY}{totalCardToday.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-medium">
              {todayCardOrders.length} POS swipe slips
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">EDC Terminal Swipe</span>
            <button
              onClick={() => {
                setDateFilter('today');
                setPaymentFilter(paymentFilter === 'card' ? 'all' : 'card');
              }}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                paymentFilter === 'card'
                  ? 'bg-sky-700 text-white'
                  : 'bg-sky-50 hover:bg-sky-100 text-sky-800'
              }`}
            >
              {paymentFilter === 'card' ? 'Showing Card ✓' : 'Filter Only Card'}
            </button>
          </div>
        </div>
      </div>

      {/* FILTER & CONTROL BAR */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3.5 shadow-xs">
        {/* Top Filter Row: Search & Date Range */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search order #, customer, item, staff..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Date Selector Pills */}
          <div className="flex items-center gap-1.5 flex-wrap w-full lg:w-auto">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-700" />
              <span>Date:</span>
            </span>

            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setDateFilter('today')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  dateFilter === 'today'
                    ? 'bg-white text-amber-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateFilter('yesterday')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  dateFilter === 'yesterday'
                    ? 'bg-white text-amber-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setDateFilter('7days')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  dateFilter === '7days'
                    ? 'bg-white text-amber-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setDateFilter('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  dateFilter === 'all'
                    ? 'bg-white text-amber-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Time
              </button>
            </div>

            {dateFilter === 'custom' || (
              <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setDateFilter('custom');
                  }}
                  className="text-xs text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Secondary Filter Row: Payment Mode Quick Pills + Dropdowns */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap">
          {/* Quick Payment Mode Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-500">Payment:</span>
            <button
              onClick={() => setPaymentFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                paymentFilter === 'all'
                  ? 'bg-slate-800 text-white border-slate-800 font-bold shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Payments
            </button>

            <button
              onClick={() => setPaymentFilter('cash')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                paymentFilter === 'cash'
                  ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Only Cash</span>
            </button>

            <button
              onClick={() => setPaymentFilter('upi_qr')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                paymentFilter === 'upi_qr'
                  ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Only UPI</span>
            </button>

            <button
              onClick={() => setPaymentFilter('card')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                paymentFilter === 'card'
                  ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-2xs'
                  : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Only Card</span>
            </button>
          </div>

          {/* Store, Staff, Status, Channel Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Store Filter */}
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-slate-400 cursor-pointer max-w-[150px]"
            >
              <option value="all">🏬 All Stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.shortName}
                </option>
              ))}
            </select>

            {/* Salesperson Filter */}
            <select
              value={salespersonFilter}
              onChange={(e) => setSalespersonFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-slate-400 cursor-pointer max-w-[140px]"
            >
              <option value="all">👤 All Staff</option>
              {salespersons.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-slate-400 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready for Pickup</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Channel Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-slate-400 cursor-pointer"
            >
              <option value="all">All Channels</option>
              <option value="pos_counter">POS Counter</option>
              <option value="customer_online">Customer Online App</option>
            </select>
          </div>
        </div>

        {/* Active Filter Summary Strip */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredOrders.length}</span> matching orders • Filtered Total Sales:{' '}
            <span className="font-bold text-slate-900">{CURRENCY}{filteredTotalSale.toFixed(2)}</span> • Profit:{' '}
            <span className="font-bold text-emerald-700">+{CURRENCY}{filteredTotalProfit.toFixed(2)}</span>
          </div>
          {(paymentFilter !== 'all' || dateFilter !== 'today' || statusFilter !== 'all' || storeFilter !== 'all' || salespersonFilter !== 'all' || searchTerm) && (
            <button
              onClick={() => {
                setPaymentFilter('all');
                setDateFilter('today');
                setStatusFilter('all');
                setSourceFilter('all');
                setStoreFilter('all');
                setSalespersonFilter('all');
                setSearchTerm('');
              }}
              className="text-amber-700 hover:text-amber-800 font-bold hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Order ID & Date</th>
                <th className="py-3.5 px-3">Payment Method</th>
                <th className="py-3.5 px-3">Store Outlet & Counter</th>
                <th className="py-3.5 px-3">Salesperson / Staff</th>
                <th className="py-3.5 px-3">Customer Info</th>
                <th className="py-3.5 px-3">Items Summary</th>
                <th className="py-3.5 px-3">Grand Total</th>
                <th className="py-3.5 px-3">Profit</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <ShoppingBag className="w-10 h-10 stroke-1 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">No orders found matching filters</p>
                    <p className="text-xs text-slate-400 mt-1">Try switching to 'All Time' or clearing the payment filter</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const store = stores.find((s) => s.id === o.storeId);
                  const displayStoreName = o.storeName || store?.name || 'Gota Main Branch';
                  const displayShortStore = store?.shortName || (o.storeName ? o.storeName.split('-')[0] : 'Gota Main');

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{o.orderNumber}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                          {new Date(o.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Payment Method Badge */}
                      <td className="py-3.5 px-3">
                        {o.paymentMethod === 'cash' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
                            <Banknote className="w-3 h-3 text-emerald-600" /> Cash
                          </span>
                        ) : o.paymentMethod === 'upi_qr' ? (
                          <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
                            <Smartphone className="w-3 h-3 text-indigo-600" /> UPI / QR
                          </span>
                        ) : o.paymentMethod === 'card' ? (
                          <span className="px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-[10px] font-extrabold uppercase inline-flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-sky-600" /> Card
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-extrabold uppercase">
                            {o.paymentMethod}
                          </span>
                        )}
                      </td>

                      {/* Store & Counter */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-start gap-1.5">
                          <Store className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-[130px]" title={displayStoreName}>
                              {displayShortStore}
                            </p>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {o.counterName || (o.counterNumber ? `Counter ${o.counterNumber}` : o.source === 'customer_online' ? 'Online Direct' : 'Counter 1')}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Salesperson / Cashier */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {(o.cashierName || 'Staff')[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 truncate max-w-[110px]">
                              {o.cashierName || 'Cashier Desk'}
                            </p>
                            <span className="text-[9px] text-slate-400 uppercase font-mono">
                              {o.source === 'pos_counter' ? 'Counter POS' : 'Online System'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">{o.customerName || 'Walk-in Guest'}</div>
                        {o.customerPhone && <div className="text-[10px] text-slate-500 font-mono">{o.customerPhone}</div>}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="text-slate-700 truncate max-w-xs font-medium">
                          {o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                        {o.notes && <div className="text-[10px] text-amber-700 italic mt-0.5">Note: {o.notes}</div>}
                      </td>

                      <td className="py-3.5 px-3 font-bold text-slate-900 text-sm">
                        {CURRENCY}{o.grandTotal.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 font-bold text-emerald-600">
                        +{CURRENCY}{o.totalProfit.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3">
                        <select
                          value={o.status}
                          onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border focus:outline-hidden cursor-pointer ${
                            o.status === 'completed'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : o.status === 'ready'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : o.status === 'preparing'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="preparing">Preparing</option>
                          <option value="ready">Ready for Pickup</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInvoiceToPrint(o)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer border border-slate-200"
                            title="Print Tax Invoice / Slip"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          </button>
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-200"
                          >
                            Details
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

      {/* Daily Collection Reconciliation Modal (Z-Report) */}
      <DailyCollectionModal
        isOpen={isDailyReportOpen}
        onClose={() => setIsDailyReportOpen(false)}
        orders={orders}
        stores={stores}
        initialDate={currentAuditDate}
        onSelectPaymentFilter={(method) => setPaymentFilter(method)}
      />

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Order #{selectedOrder.orderNumber}</h3>
                <p className="text-xs text-slate-500">
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInvoiceToPrint(selectedOrder)}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 text-base font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Store & Salesperson Information Card */}
              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2.5 text-xs">
                <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-amber-700" />
                  <span>Store Outlet & Staff Details</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Store Branch:</span>
                    <span className="font-bold text-slate-900">
                      {selectedOrder.storeName || storage.getStoreById(selectedOrder.storeId || '')?.name || 'Richie Rich Pan House - Gota Main'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Counter Desk:</span>
                    <span className="font-bold text-slate-900">
                      {selectedOrder.counterName || (selectedOrder.counterNumber ? `Counter ${selectedOrder.counterNumber}` : 'Counter 1 (Main Billing)')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Salesperson / Cashier:</span>
                    <span className="font-bold text-emerald-800">
                      {selectedOrder.cashierName || 'Staff Cashier'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Channel Source:</span>
                    <span className="font-bold text-slate-900">
                      {selectedOrder.source === 'pos_counter' ? 'Point of Sale (POS)' : 'Customer Online Order'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Information & Payment Badge */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Customer:</span>
                  <span className="font-bold text-slate-900">{selectedOrder.customerName || 'Walk-in Guest'}</span>
                </div>
                {selectedOrder.customerPhone && (
                  <div>
                    <span className="text-slate-500 block text-[11px]">Phone:</span>
                    <span className="font-mono text-slate-800 font-bold">{selectedOrder.customerPhone}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 block text-[11px]">Payment Mode:</span>
                  <span className="font-mono uppercase font-bold text-slate-800 flex items-center gap-1">
                    {selectedOrder.paymentMethod === 'cash' && <Banknote className="w-3.5 h-3.5 text-emerald-600 inline" />}
                    {selectedOrder.paymentMethod === 'upi_qr' && <Smartphone className="w-3.5 h-3.5 text-indigo-600 inline" />}
                    {selectedOrder.paymentMethod === 'card' && <CreditCard className="w-3.5 h-3.5 text-sky-600 inline" />}
                    <span>{selectedOrder.paymentMethod.replace('_', ' ')}</span>
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700">Items Ordered:</div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{it.quantity}x {it.name}</span>
                        {it.taxRate !== undefined && (
                          <span className="ml-2 text-[10px] text-slate-500">
                            ({it.taxRate > 0 ? `${it.taxRate}% GST` : '0% Exempt'})
                          </span>
                        )}
                        {it.customization && <p className="text-[10px] text-amber-700">{it.customization}</p>}
                      </div>
                      <span className="font-bold text-slate-900">{CURRENCY}{it.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ledger Summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-700">{CURRENCY}{selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount Applied ({selectedOrder.appliedPromoCode || 'Promo'}):</span>
                    <span className="font-semibold">-{CURRENCY}{selectedOrder.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>GST Tax & Levies:</span>
                  <span className="font-semibold text-slate-700">{CURRENCY}{selectedOrder.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-slate-900">{CURRENCY}{selectedOrder.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 text-[11px] pt-1">
                  <span>Net Profit Contribution:</span>
                  <span className="font-bold">+{CURRENCY}{selectedOrder.totalProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 shrink-0">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice / Receipt Modal */}
      <DocumentManifestModal
        isOpen={Boolean(invoiceToPrint)}
        onClose={() => setInvoiceToPrint(null)}
        documentType="retail_order"
        documentData={invoiceToPrint}
      />
    </div>
  );
};
