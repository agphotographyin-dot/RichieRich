import React from 'react';
import { X, Printer, Download, Building2, TrendingUp, TrendingDown, CheckCircle2, IndianRupee, Calendar } from 'lucide-react';
import { StoreLocation, StoreExpense, StoreFinancialSummary, Order } from '../../types';
import { pdfReportService } from '../../services/pdfReportService';
import { soundEffects } from '../../services/audio';

interface StoreStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreLocation;
  summary: StoreFinancialSummary;
  expenses: StoreExpense[];
  orders: Order[];
}

export const StoreStatementModal: React.FC<StoreStatementModalProps> = ({
  isOpen,
  onClose,
  store,
  summary,
  expenses,
  orders,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    soundEffects.playClick();
    window.print();
  };

  const handleExportPDF = () => {
    soundEffects.playSuccessChime();
    pdfReportService.exportStoreFinancialStatementPDF(store, summary, orders, expenses);
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-700 bg-[#1E293B] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-black shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base sm:text-lg">
                  Store Financial Statement & P&L Sheet
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300 text-[10px] font-bold">
                  {store.name}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Official statement print preview with sales credits, categorized debits & cash drawer balance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
              <span>Print Now</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Scroll Area */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-50">
          <div
            id="printable-store-statement"
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs text-slate-900"
          >
            {/* Header / Brand crest */}
            <div className="border-b border-slate-200 pb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
                    RICHIE RICH PAN HOUSE & CAFE
                  </h1>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    Official Branch Financial Audit & Balance Statement
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    📍 {store.address} • Phone: {store.phone}
                  </p>
                </div>
                <div className="text-left sm:text-right text-xs text-slate-600 space-y-1">
                  <p className="font-mono">
                    Outlet ID: <strong className="text-slate-900">{store.id}</strong>
                  </p>
                  <p>
                    Generated: <strong>{currentDateFormatted}</strong>
                  </p>
                  <p className="text-[11px] text-amber-700 font-bold">Status: Verified Real-Time</p>
                </div>
              </div>
            </div>

            {/* Financial Summary Highlight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-900 block">
                  Total Store Sales (Credit)
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 mt-1 block">
                  + ₹{summary.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-amber-800 font-bold mt-0.5 block">
                  {summary.orderCount} Billed Customer Orders
                </span>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-red-800 block">
                  Total Store Expenses (Debit)
                </span>
                <span className="text-xl sm:text-2xl font-black text-red-900 mt-1 block">
                  - ₹{summary.totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-red-700 font-semibold mt-0.5 block">
                  {expenses.length} Store Vouchers Logged
                </span>
              </div>

              <div className="p-4 bg-[#1E293B] text-white border border-slate-700 rounded-xl">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-400 block">
                  Net Balance / Surplus
                </span>
                <span className="text-xl sm:text-2xl font-black text-white mt-1 block">
                  ₹{summary.netStoreBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] text-slate-300 font-medium mt-0.5 block">
                  (Sales Credit − Total Expenses)
                </span>
              </div>
            </div>

            {/* Comprehensive Ledger Breakdown Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                1. Financial Ledger Breakdown
              </h4>
              <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-[#1E293B] text-white font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-4">Financial Flow Category</th>
                    <th className="py-2.5 px-4 text-right">Credit / Inflow (₹)</th>
                    <th className="py-2.5 px-4 text-right">Debit / Outflow (₹)</th>
                    <th className="py-2.5 px-4 text-right">Subtotal / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-800">Cash Register Sales</td>
                    <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">
                      +₹{summary.salesByMode.cash.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right text-slate-600 font-sans text-[11px]">Direct Cash Inflow</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-800">UPI / BharatQR Digital Sales</td>
                    <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">
                      +₹{summary.salesByMode.upi.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right text-slate-600 font-sans text-[11px]">Instant Bank Settlement</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-800">Card / POS EDC Swipes</td>
                    <td className="py-2.5 px-4 text-right text-emerald-700 font-bold">
                      +₹{summary.salesByMode.card.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right text-slate-600 font-sans text-[11px]">Card Terminal Settlement</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-800">Cash Petty Expenses (From Register)</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right text-red-600 font-bold">
                      -₹{summary.expensesByMode.cash.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600 font-sans text-[11px]">Cash Drawer Outflow</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans font-bold text-slate-800">Online / Vendor Transfers</td>
                    <td className="py-2.5 px-4 text-right text-slate-400">-</td>
                    <td className="py-2.5 px-4 text-right text-red-600 font-bold">
                      -₹{summary.expensesByMode.online.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600 font-sans text-[11px]">Digital Transfer Debit</td>
                  </tr>
                  <tr className="bg-slate-50 font-sans font-black text-slate-900 border-t-2 border-slate-300">
                    <td className="py-3 px-4 uppercase">Net Store Balance</td>
                    <td className="py-3 px-4 text-right text-emerald-800 font-mono">
                      ₹{summary.totalSales.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-red-800 font-mono">
                      ₹{summary.totalExpenses.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-900 font-mono text-sm">
                      ₹{summary.netStoreBalance.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Expense Log Itemization */}
            {expenses.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  2. Recorded Store Expense Entries ({expenses.length})
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs text-left text-slate-700">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3">Paid To / Recipient</th>
                        <th className="py-2 px-3">Mode</th>
                        <th className="py-2 px-3 text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {expenses.slice(0, 20).map((exp) => (
                        <tr key={exp.id}>
                          <td className="py-2 px-3">{exp.date || (exp.createdAt ? exp.createdAt.split('T')[0] : '-')}</td>
                          <td className="py-2 px-3 font-sans capitalize font-semibold">{exp.category.replace(/_/g, ' ')}</td>
                          <td className="py-2 px-3 font-sans">{exp.title || exp.description}</td>
                          <td className="py-2 px-3 font-sans">{exp.paidToOrRecipient || exp.paidTo || '-'}</td>
                          <td className="py-2 px-3 uppercase text-[10px]">{exp.paymentMode || exp.paymentMethod}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">₹{exp.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Verification Sign-off Footer */}
            <div className="pt-8 border-t border-dashed border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-600">
              <div>
                <p className="font-bold text-slate-800">Store Manager Sign & Seal</p>
                <div className="h-12 border-b border-slate-400 mt-2"></div>
                <p className="text-[10px] text-slate-400 mt-1">Verified physical cash against ledger</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800">Head Office Auditor</p>
                <div className="h-12 border-b border-slate-400 mt-2"></div>
                <p className="text-[10px] text-slate-400 mt-1">Richie Rich Central Accounting</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
