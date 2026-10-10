import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Smartphone,
  Banknote,
  TrendingUp,
  Store,
  Receipt,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { Order, StoreLocation } from '../../types';
import { CURRENCY, storage } from '../../services/storage';
import { pdfReportService } from '../../services/pdfReportService';
import { getLocalDateString } from '../../utils/dateUtils';
import { soundEffects } from '../../services/audio';

interface DateRangeStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  stores: StoreLocation[];
  initialStartDate?: string;
  initialEndDate?: string;
  initialStoreId?: string;
  fixedStoreId?: string;
}

export const DateRangeStatementModal: React.FC<DateRangeStatementModalProps> = ({
  isOpen,
  onClose,
  orders,
  stores,
  initialStartDate,
  initialEndDate,
  initialStoreId,
  fixedStoreId,
}) => {
  const todayStr = getLocalDateString(new Date());
  const thirtyDaysAgoStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalDateString(d);
  })();

  const [startDate, setStartDate] = useState<string>(initialStartDate || thirtyDaysAgoStr);
  const [endDate, setEndDate] = useState<string>(initialEndDate || todayStr);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(fixedStoreId || initialStoreId || 'all');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('all');
  const [activePreset, setActivePreset] = useState<string>('30days');

  // Quick Preset Handlers
  const handleApplyPreset = (preset: string) => {
    setActivePreset(preset);
    const now = new Date();
    const today = getLocalDateString(now);

    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = getLocalDateString(y);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(getLocalDateString(d));
      setEndDate(today);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(getLocalDateString(firstDay));
      setEndDate(today);
    } else if (preset === 'last_month') {
      const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(getLocalDateString(firstDayPrevMonth));
      setEndDate(getLocalDateString(lastDayPrevMonth));
    } else if (preset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(getLocalDateString(d));
      setEndDate(today);
    } else if (preset === 'all') {
      setStartDate('2020-01-01');
      setEndDate(today);
    }
  };

  // Filter orders based on statement criteria
  const statementOrders = useMemo(() => {
    return orders.filter((o) => {
      const orderDate = getLocalDateString(o.createdAt);
      const inDateRange = orderDate >= startDate && orderDate <= endDate;
      const matchesStore =
        selectedStoreId === 'all' ||
        o.storeId === selectedStoreId ||
        (o.storeName && o.storeName.toLowerCase().includes(selectedStoreId.toLowerCase()));
      const matchesPayment =
        selectedPaymentMode === 'all' || o.paymentMethod === selectedPaymentMode;
      return inDateRange && matchesStore && matchesPayment;
    });
  }, [orders, startDate, endDate, selectedStoreId, selectedPaymentMode]);

  // Aggregate Metrics for Statement
  const statementStats = useMemo(() => {
    const totalSale = statementOrders.reduce((s, o) => s + o.grandTotal, 0);
    const totalProfit = statementOrders.reduce((s, o) => s + o.totalProfit, 0);
    const totalTax = statementOrders.reduce((s, o) => s + o.taxAmount, 0);
    const totalDiscount = statementOrders.reduce((s, o) => s + (o.discountAmount || 0), 0);

    const cashOrders = statementOrders.filter((o) => o.paymentMethod === 'cash');
    const upiOrders = statementOrders.filter((o) => o.paymentMethod === 'upi_qr');
    const cardOrders = statementOrders.filter((o) => o.paymentMethod === 'card');

    const totalCash = cashOrders.reduce((s, o) => s + o.grandTotal, 0);
    const totalUPI = upiOrders.reduce((s, o) => s + o.grandTotal, 0);
    const totalCard = cardOrders.reduce((s, o) => s + o.grandTotal, 0);

    return {
      count: statementOrders.length,
      totalSale,
      totalProfit,
      totalTax,
      totalDiscount,
      totalCash,
      cashCount: cashOrders.length,
      totalUPI,
      upiCount: upiOrders.length,
      totalCard,
      cardCount: cardOrders.length,
      avgTicket: statementOrders.length > 0 ? totalSale / statementOrders.length : 0,
    };
  }, [statementOrders]);

  const handleDownloadPDF = () => {
    const storeObj = stores.find((s) => s.id === selectedStoreId);
    const storeLabel = selectedStoreId === 'all' ? 'All Stores & Outlets' : (storeObj?.name || selectedStoreId);
    const paymentLabel =
      selectedPaymentMode === 'all'
        ? 'All Payment Modes'
        : selectedPaymentMode === 'cash'
        ? 'Cash Only'
        : selectedPaymentMode === 'upi_qr'
        ? 'UPI / QR Only'
        : 'Card Only';

    pdfReportService.exportDateRangeStatementPDF(
      statementOrders,
      startDate,
      endDate,
      storeLabel,
      paymentLabel
    );
    soundEffects.playSuccessChime();
  };

  const handleDownloadCSV = () => {
    const csvContent = storage.exportDateRangeStatementCSV(
      startDate,
      endDate,
      selectedStoreId,
      selectedPaymentMode
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `richie_rich_statement_${startDate}_to_${endDate}.csv`;
    link.click();
    soundEffects.playSuccessChime();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <span>Download Statement (Date Range)</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Generate financial sales ledger & audit statement from date to date
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Quick Preset Pills */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Quick Date Presets:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: 'Last 7 Days' },
                { id: 'this_month', label: 'This Month' },
                { id: '30days', label: 'Last 30 Days' },
                { id: 'last_month', label: 'Last Month' },
                { id: 'all', label: 'All Time' },
              ].map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => handleApplyPreset(p.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    activePreset === p.id
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range Selection Box (From Date ➔ To Date) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Select Exact Date Range:</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  From Date (Start):
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                  To Date (End):
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Additional Filter Options: Store & Payment Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1 flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>Store / Outlet Scope:</span>
              </label>
              {fixedStoreId ? (
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>🏬 {stores.find((s) => s.id === fixedStoreId)?.name || 'This Outlet'}</span>
                  <span className="text-[10px] text-amber-700 font-mono">(Store View)</span>
                </div>
              ) : (
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">🏢 All Stores & Outlets Combined</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1 flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                <span>Payment Mode:</span>
              </label>
              <select
                value={selectedPaymentMode}
                onChange={(e) => setSelectedPaymentMode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">💳 All Payment Modes (Cash + UPI + Card)</option>
                <option value="cash">💵 Only Cash Transactions</option>
                <option value="upi_qr">📱 Only UPI / QR Transactions</option>
                <option value="card">💳 Only Card / POS Swipe Transactions</option>
              </select>
            </div>
          </div>

          {/* Live Preview Summary Card */}
          <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-4 rounded-xl shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-indigo-800/80 pb-2">
              <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                <span>Statement Preview ({startDate} ➔ {endDate})</span>
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                {statementStats.count} Invoices
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                <span className="text-[10px] text-indigo-300 uppercase font-bold block">Gross Revenue</span>
                <span className="text-base font-black font-mono text-white mt-0.5 block">
                  {CURRENCY}{statementStats.totalSale.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                <span className="text-[10px] text-indigo-300 uppercase font-bold block">Net Profit</span>
                <span className="text-base font-black font-mono text-emerald-400 mt-0.5 block">
                  +{CURRENCY}{statementStats.totalProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                <span className="text-[10px] text-indigo-300 uppercase font-bold block">GST Tax</span>
                <span className="text-base font-black font-mono text-indigo-200 mt-0.5 block">
                  {CURRENCY}{statementStats.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                <span className="text-[10px] text-indigo-300 uppercase font-bold block">Avg Bill</span>
                <span className="text-base font-black font-mono text-white mt-0.5 block">
                  {CURRENCY}{statementStats.avgTicket.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Split Breakdown */}
            <div className="pt-2 border-t border-indigo-800/80 flex items-center justify-between text-[11px] text-indigo-200 flex-wrap gap-2">
              <span>Cash: <strong>{CURRENCY}{statementStats.totalCash.toFixed(2)}</strong> ({statementStats.cashCount})</span>
              <span>•</span>
              <span>UPI: <strong>{CURRENCY}{statementStats.totalUPI.toFixed(2)}</strong> ({statementStats.upiCount})</span>
              <span>•</span>
              <span>Card: <strong>{CURRENCY}{statementStats.totalCard.toFixed(2)}</strong> ({statementStats.cardCount})</span>
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Period: <strong className="text-slate-800">{startDate}</strong> to <strong className="text-slate-800">{endDate}</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download CSV</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Download PDF Statement</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
