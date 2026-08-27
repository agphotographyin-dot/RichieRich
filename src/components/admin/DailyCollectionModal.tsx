import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Download,
  Calendar,
  CreditCard,
  Smartphone,
  Banknote,
  TrendingUp,
  Store,
  Clock,
  UserCheck,
  CheckCircle2,
  Copy,
  Check,
  Building2,
  Receipt,
  FileSpreadsheet,
  FileText,
  Layers,
  ArrowUpRight,
  PieChart,
} from 'lucide-react';
import { Order, StoreLocation } from '../../types';
import { CURRENCY, storage } from '../../services/storage';
import { pdfReportService } from '../../services/pdfReportService';

interface DailyCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  stores: StoreLocation[];
  initialDate?: string;
  onSelectPaymentFilter?: (method: 'all' | 'cash' | 'upi_qr' | 'card') => void;
}

export const DailyCollectionModal: React.FC<DailyCollectionModalProps> = ({
  isOpen,
  onClose,
  orders,
  stores,
  initialDate,
  onSelectPaymentFilter,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [activePaymentTab, setActivePaymentTab] = useState<'all' | 'cash' | 'upi_qr' | 'card'>('all');

  if (!isOpen) return null;

  // Filter orders for the selected date and store
  const dayOrders = orders.filter((o) => {
    const orderDate = o.createdAt.split('T')[0];
    const matchesDate = orderDate === selectedDate;
    const matchesStore = selectedStoreId === 'all' || o.storeId === selectedStoreId;
    return matchesDate && matchesStore;
  });

  // Calculate distinct payment buckets
  const cashOrders = dayOrders.filter((o) => o.paymentMethod === 'cash');
  const upiOrders = dayOrders.filter((o) => o.paymentMethod === 'upi_qr');
  const cardOrders = dayOrders.filter((o) => o.paymentMethod === 'card');
  const otherOrders = dayOrders.filter((o) => !['cash', 'upi_qr', 'card'].includes(o.paymentMethod));

  // Financial aggregates
  const totalSaleAmount = dayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalCashAmount = cashOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalUPIAmount = upiOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalCardAmount = cardOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const totalOtherAmount = otherOrders.reduce((sum, o) => sum + o.grandTotal, 0);

  const totalTaxAmount = dayOrders.reduce((sum, o) => sum + o.taxAmount, 0);
  const totalProfitAmount = dayOrders.reduce((sum, o) => sum + o.totalProfit, 0);
  const totalDiscountAmount = dayOrders.reduce((sum, o) => sum + o.discountAmount, 0);
  const totalItemsCount = dayOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

  // Percentages
  const cashPercent = totalSaleAmount > 0 ? (totalCashAmount / totalSaleAmount) * 100 : 0;
  const upiPercent = totalSaleAmount > 0 ? (totalUPIAmount / totalSaleAmount) * 100 : 0;
  const cardPercent = totalSaleAmount > 0 ? (totalCardAmount / totalSaleAmount) * 100 : 0;

  // Cashier / Staff Collection Breakdown
  const staffBreakdown = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        store: string;
        ordersCount: number;
        cash: number;
        upi: number;
        card: number;
        total: number;
      }
    >();

    dayOrders.forEach((o) => {
      const staffName = o.cashierName || 'Online Direct';
      const storeName = o.storeName ? o.storeName.split('-')[0].trim() : 'Gota Main';
      const existing = map.get(staffName) || {
        name: staffName,
        store: storeName,
        ordersCount: 0,
        cash: 0,
        upi: 0,
        card: 0,
        total: 0,
      };

      existing.ordersCount += 1;
      existing.total += o.grandTotal;
      if (o.paymentMethod === 'cash') existing.cash += o.grandTotal;
      else if (o.paymentMethod === 'upi_qr') existing.upi += o.grandTotal;
      else if (o.paymentMethod === 'card') existing.card += o.grandTotal;

      map.set(staffName, existing);
    });

    return Array.from(map.values());
  }, [dayOrders]);

  // Display orders based on active payment tab
  const displayOrders = useMemo(() => {
    if (activePaymentTab === 'cash') return cashOrders;
    if (activePaymentTab === 'upi_qr') return upiOrders;
    if (activePaymentTab === 'card') return cardOrders;
    return dayOrders;
  }, [activePaymentTab, dayOrders, cashOrders, upiOrders, cardOrders]);

  // Copy Settlement text to clipboard for WhatsApp or quick messaging
  const handleCopySummary = () => {
    const storeLabel = selectedStoreId === 'all' ? 'All Outlets' : stores.find((s) => s.id === selectedStoreId)?.shortName || 'Store';
    const text = `*RICHIE RICH PAN HOUSE - DAILY COLLECTION REPORT*
📅 *Date:* ${selectedDate}
🏬 *Store:* ${storeLabel}
----------------------------------
💰 *TOTAL SALE:* ${CURRENCY}${totalSaleAmount.toFixed(2)} (${dayOrders.length} bills)
💵 *ONLY CASH:* ${CURRENCY}${totalCashAmount.toFixed(2)} (${cashOrders.length} bills - ${cashPercent.toFixed(1)}%)
📱 *ONLY UPI:* ${CURRENCY}${totalUPIAmount.toFixed(2)} (${upiOrders.length} bills - ${upiPercent.toFixed(1)}%)
💳 *ONLY CARD:* ${CURRENCY}${totalCardAmount.toFixed(2)} (${cardOrders.length} bills - ${cardPercent.toFixed(1)}%)
----------------------------------
📊 *GST Tax:* ${CURRENCY}${totalTaxAmount.toFixed(2)}
📈 *Net Gross Profit:* +${CURRENCY}${totalProfitAmount.toFixed(2)}
----------------------------------
_Generated via Richie Rich POS Management System_`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Export PDF (Z-Report)
  const handleExportPDF = () => {
    pdfReportService.exportDailyCollectionPDF(orders, stores, selectedDate, selectedStoreId);
  };

  // Export CSV
  const handleDownloadCSV = () => {
    const csvContent = storage.exportDailyCollectionReportCSV(selectedDate, selectedStoreId);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `daily_collection_${selectedDate}_${selectedStoreId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Daily Z-Report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Daily Collection & Day-End Settlement Report
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                  Live Audit
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official register reconciliation for Cash, UPI & Card collections with cashier handover ledger.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy formatted summary to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="px-3.5 py-1.5 bg-linear-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export as official PDF Document"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export PDF (Z-Report)</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export Raw CSV Spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date & Store Filter Bar */}
        <div className="p-3.5 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <Calendar className="w-4 h-4 text-amber-700" />
              <span className="font-semibold text-slate-700">Audit Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="font-medium text-slate-900 bg-transparent focus:outline-hidden cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg">
              <button
                onClick={() => setSelectedDate(todayStr)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  selectedDate === todayStr ? 'bg-white text-amber-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  setSelectedDate(y.toISOString().split('T')[0]);
                }}
                className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
              >
                Yesterday
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
              <Store className="w-4 h-4 text-amber-700" />
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="font-semibold text-slate-800 bg-transparent focus:outline-hidden cursor-pointer"
              >
                <option value="all">🏢 All Stores & Outlets</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    🏬 {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Auditing {dayOrders.length} Transactions</span>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-5">
          {/* Executive Big Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Total Sale Today */}
            <div className="bg-linear-to-br from-amber-500/10 via-amber-50 to-white p-4 rounded-xl border border-amber-200/80 shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-800">
                <span className="text-xs font-bold tracking-wider uppercase">Total Day Sale</span>
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  {CURRENCY}{totalSaleAmount.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                  <span>{dayOrders.length} bills</span> • <span>{totalItemsCount} items sold</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Gross Profit:</span>
                <span className="font-bold text-emerald-700">+{CURRENCY}{totalProfitAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* ONLY CASH */}
            <div
              onClick={() => setActivePaymentTab('cash')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                activePaymentTab === 'cash'
                  ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-emerald-50/40 hover:bg-emerald-50/70 border-emerald-200/80 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-emerald-800">
                <span className="text-xs font-bold tracking-wider uppercase flex items-center gap-1">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Only Cash</span>
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                  {cashPercent.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-extrabold text-emerald-950 tracking-tight">
                  {CURRENCY}{totalCashAmount.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-600 mt-1 font-medium">
                  {cashOrders.length} physical cash receipts
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Drawer Status:</span>
                <span className="font-bold text-emerald-700">In Cash Register</span>
              </div>
            </div>

            {/* ONLY UPI */}
            <div
              onClick={() => setActivePaymentTab('upi_qr')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                activePaymentTab === 'upi_qr'
                  ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-indigo-50/40 hover:bg-indigo-50/70 border-indigo-200/80 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-indigo-800">
                <span className="text-xs font-bold tracking-wider uppercase flex items-center gap-1">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span>Only UPI / QR</span>
                </span>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-bold">
                  {upiPercent.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-extrabold text-indigo-950 tracking-tight">
                  {CURRENCY}{totalUPIAmount.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-600 mt-1 font-medium">
                  {upiOrders.length} QR / UPI transfers
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-indigo-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Bank Settlement:</span>
                <span className="font-bold text-indigo-700">Direct Bank Credit</span>
              </div>
            </div>

            {/* ONLY CARD */}
            <div
              onClick={() => setActivePaymentTab('card')}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                activePaymentTab === 'card'
                  ? 'bg-sky-50/90 border-sky-400 ring-2 ring-sky-500/20 shadow-xs'
                  : 'bg-sky-50/40 hover:bg-sky-50/70 border-sky-200/80 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-sky-800">
                <span className="text-xs font-bold tracking-wider uppercase flex items-center gap-1">
                  <CreditCard className="w-4 h-4 text-sky-600" />
                  <span>Only Card</span>
                </span>
                <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-full text-[10px] font-bold">
                  {cardPercent.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-extrabold text-sky-950 tracking-tight">
                  {CURRENCY}{totalCardAmount.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-600 mt-1 font-medium">
                  {cardOrders.length} POS swipe receipts
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-sky-200/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Terminal Batch:</span>
                <span className="font-bold text-sky-700">EDC Machine Swipe</span>
              </div>
            </div>
          </div>

          {/* Payment Method Distribution Bar */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-amber-700" />
                <span>Payment Mode Revenue Split</span>
              </span>
              <span className="text-slate-500 font-medium">
                Total Collection: <span className="font-bold text-slate-900">{CURRENCY}{totalSaleAmount.toFixed(2)}</span>
              </span>
            </div>

            <div className="w-full h-3.5 bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${cashPercent}%` }}
                className="bg-emerald-500 hover:opacity-90 transition-all cursor-pointer"
                title={`Only Cash: ${CURRENCY}${totalCashAmount.toFixed(2)} (${cashPercent.toFixed(1)}%)`}
              />
              <div
                style={{ width: `${upiPercent}%` }}
                className="bg-indigo-500 hover:opacity-90 transition-all cursor-pointer"
                title={`Only UPI: ${CURRENCY}${totalUPIAmount.toFixed(2)} (${upiPercent.toFixed(1)}%)`}
              />
              <div
                style={{ width: `${cardPercent}%` }}
                className="bg-sky-500 hover:opacity-90 transition-all cursor-pointer"
                title={`Only Card: ${CURRENCY}${totalCardAmount.toFixed(2)} (${cardPercent.toFixed(1)}%)`}
              />
            </div>

            <div className="flex items-center justify-between gap-3 text-xs pt-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                <span className="text-slate-600 font-medium">Cash:</span>
                <span className="font-bold text-slate-900">{CURRENCY}{totalCashAmount.toFixed(2)} ({cashPercent.toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block"></span>
                <span className="text-slate-600 font-medium">UPI / QR:</span>
                <span className="font-bold text-slate-900">{CURRENCY}{totalUPIAmount.toFixed(2)} ({upiPercent.toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500 inline-block"></span>
                <span className="text-slate-600 font-medium">Card Swipe:</span>
                <span className="font-bold text-slate-900">{CURRENCY}{totalCardAmount.toFixed(2)} ({cardPercent.toFixed(1)}%)</span>
              </div>
            </div>
          </div>

          {/* Staff & Cashier Handover Register */}
          {staffBreakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-700" />
                  <span>Cashier / Staff Collection Handover Breakdown</span>
                </h4>
                <span className="text-[11px] text-slate-500">
                  {staffBreakdown.length} active counters / staff today
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Cashier / Staff Name</th>
                      <th className="py-2.5 px-3">Branch Location</th>
                      <th className="py-2.5 px-3 text-center">Orders</th>
                      <th className="py-2.5 px-3 text-right">Cash Handover</th>
                      <th className="py-2.5 px-3 text-right">UPI Collected</th>
                      <th className="py-2.5 px-3 text-right">Card POS</th>
                      <th className="py-2.5 px-4 text-right">Total Collection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {staffBreakdown.map((staff, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center text-[10px] font-bold">
                            {staff.name[0]}
                          </div>
                          <span>{staff.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 font-medium">{staff.store}</td>
                        <td className="py-2.5 px-3 text-center font-semibold">{staff.ordersCount}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {CURRENCY}{staff.cash.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                          {CURRENCY}{staff.upi.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-sky-700">
                          {CURRENCY}{staff.card.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-extrabold text-slate-900">
                          {CURRENCY}{staff.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-4 uppercase text-[11px]">Total Day Collections</td>
                      <td className="py-2.5 px-3 text-center">{dayOrders.length}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-700">{CURRENCY}{totalCashAmount.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-indigo-700">{CURRENCY}{totalUPIAmount.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right text-sky-700">{CURRENCY}{totalCardAmount.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-right text-amber-900 text-sm font-extrabold">{CURRENCY}{totalSaleAmount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Interactive Transaction Explorer with Payment Mode Switcher */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs space-y-0">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Itemized Bills for {selectedDate}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                  {displayOrders.length} orders
                </span>
              </div>

              {/* Payment Mode Selector Tabs */}
              <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-lg">
                <button
                  onClick={() => setActivePaymentTab('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    activePaymentTab === 'all'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({dayOrders.length})
                </button>
                <button
                  onClick={() => setActivePaymentTab('cash')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    activePaymentTab === 'cash'
                      ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                      : 'text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <Banknote className="w-3 h-3" />
                  <span>Cash ({cashOrders.length})</span>
                </button>
                <button
                  onClick={() => setActivePaymentTab('upi_qr')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    activePaymentTab === 'upi_qr'
                      ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                      : 'text-indigo-800 hover:bg-indigo-100'
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>UPI ({upiOrders.length})</span>
                </button>
                <button
                  onClick={() => setActivePaymentTab('card')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    activePaymentTab === 'card'
                      ? 'bg-sky-600 text-white shadow-2xs font-bold'
                      : 'text-sky-800 hover:bg-sky-100'
                  }`}
                >
                  <CreditCard className="w-3 h-3" />
                  <span>Card ({cardOrders.length})</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 sticky top-0 bg-slate-100">
                  <tr>
                    <th className="py-2.5 px-4">Order # & Time</th>
                    <th className="py-2.5 px-3">Payment Mode</th>
                    <th className="py-2.5 px-3">Store & Counter</th>
                    <th className="py-2.5 px-3">Staff</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Items Summary</th>
                    <th className="py-2.5 px-3 text-right">GST Tax</th>
                    <th className="py-2.5 px-4 text-right">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No transactions found for the selected payment filter on {selectedDate}.
                      </td>
                    </tr>
                  ) : (
                    displayOrders.map((o) => {
                      const timeStr = new Date(o.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const store = stores.find((s) => s.id === o.storeId);
                      const shortStore = store?.shortName || (o.storeName ? o.storeName.split('-')[0] : 'Main');

                      return (
                        <tr key={o.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-4">
                            <span className="font-mono font-bold text-slate-900">{o.orderNumber}</span>
                            <span className="text-[10px] text-slate-400 block">{timeStr}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            {o.paymentMethod === 'cash' ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                                <Banknote className="w-2.5 h-2.5" /> Cash
                              </span>
                            ) : o.paymentMethod === 'upi_qr' ? (
                              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                                <Smartphone className="w-2.5 h-2.5" /> UPI / QR
                              </span>
                            ) : o.paymentMethod === 'card' ? (
                              <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                                <CreditCard className="w-2.5 h-2.5" /> Card Swipe
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                                {o.paymentMethod}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900">{shortStore}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {o.counterName || (o.counterNumber ? `Counter ${o.counterNumber}` : 'Counter 1')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{o.cashierName || 'Online Direct'}</td>
                          <td className="py-2.5 px-3 text-slate-700">{o.customerName || 'Walk-in'}</td>
                          <td className="py-2.5 px-3 text-slate-600 truncate max-w-[180px]" title={o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}>
                            {o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-600">
                            {CURRENCY}{o.taxAmount.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-extrabold text-slate-900 text-sm">
                            {CURRENCY}{o.grandTotal.toFixed(2)}
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

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Audit Status:</span>
            <span>All entries verified against system transaction logs.</span>
          </div>

          <div className="flex items-center gap-2">
            {onSelectPaymentFilter && activePaymentTab !== 'all' && (
              <button
                onClick={() => {
                  onSelectPaymentFilter(activePaymentTab);
                  onClose();
                }}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                View Only {activePaymentTab === 'cash' ? 'Cash' : activePaymentTab === 'upi_qr' ? 'UPI' : 'Card'} in Master Ledger
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
