import React, { useState, useMemo } from 'react';
import {
  Receipt,
  X,
  Search,
  Edit3,
  Printer,
  Clock,
  User,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import { Order, InventoryItem, Customer } from '../../types';
import { CURRENCY, storage } from '../../services/storage';

interface POSRecentBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  counterNumber?: number;
  cashierName?: string;
  onSelectForModify: (order: Order) => void;
  onPrintBill: (order: Order) => void;
}

export const POSRecentBillsModal: React.FC<POSRecentBillsModalProps> = ({
  isOpen,
  onClose,
  storeId,
  counterNumber,
  cashierName,
  onSelectForModify,
  onPrintBill,
}) => {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'this_counter' | 'store_wide'>('this_counter');

  // Fetch all orders and take the last 20 bills for this counter or store
  const { recentBills, totalBillCount } = useMemo(() => {
    const allOrders = storage.getOrders();

    // Filter by store
    const storeOrders = allOrders.filter((o) => {
      if (!storeId) return true;
      return o.storeId === storeId;
    });

    // Optionally filter by counter or show all 20 for this store
    const filteredByCounter = storeOrders.filter((o) => {
      if (filterMode === 'this_counter' && counterNumber) {
        return o.counterNumber === counterNumber || !o.counterNumber;
      }
      return true;
    });

    // Sort descending by date (most recent first) and slice strictly top 20
    const sorted = [...filteredByCounter].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const top20 = sorted.slice(0, 20);

    return {
      recentBills: top20,
      totalBillCount: sorted.length,
    };
  }, [storeId, counterNumber, filterMode]);

  // Search filter
  const displayedBills = recentBills.filter((bill) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      bill.orderNumber.toLowerCase().includes(term) ||
      (bill.customerName && bill.customerName.toLowerCase().includes(term)) ||
      (bill.customerPhone && bill.customerPhone.includes(term)) ||
      bill.paymentMethod.toLowerCase().includes(term) ||
      bill.items.some((it) => it.name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Last 20 Bills & Invoices
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  {recentBills.length} Recent Records
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                View previous transactions, re-print thermal receipts, or click <strong>Modify</strong> to adjust quantities, prices, or payment modes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shrink-0 text-xs">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Invoice # (e.g. RR-2026-1001), patron name, phone, item..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Counter Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-200 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setFilterMode('this_counter')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
                filterMode === 'this_counter'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Counter (C#{counterNumber || 1})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('store_wide')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer transition-colors ${
                filterMode === 'store_wide'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Store Counters
            </button>
          </div>
        </div>

        {/* Table / Cards List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {displayedBills.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Receipt className="w-10 h-10 stroke-1 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No Bills Found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No orders match your filter criteria. Once you bill items on this POS counter, the last 20 bills will appear here instantly.
              </p>
            </div>
          ) : (
            displayedBills.map((bill, index) => {
              const formattedDate = new Date(bill.createdAt).toLocaleDateString();
              const formattedTime = new Date(bill.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={bill.id}
                  className={`p-3 sm:p-4 rounded-xl border transition-all ${
                    bill.isModified
                      ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    {/* Bill Meta */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-slate-900">
                          #{bill.orderNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200">
                          {bill.items.reduce((s, it) => s + it.quantity, 0)} Items
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border capitalize ${
                            bill.paymentMethod === 'cash'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : bill.paymentMethod === 'upi_qr'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                          }`}
                        >
                          {bill.paymentMethod === 'upi_qr' ? 'UPI QR' : bill.paymentMethod}
                        </span>
                        {bill.counterNumber && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                            C#{bill.counterNumber}
                          </span>
                        )}
                        {bill.isModified && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-extrabold border border-amber-300 flex items-center gap-1">
                            <BadgeAlert className="w-3 h-3 text-amber-700" /> Modified
                          </span>
                        )}
                      </div>

                      {/* Items Preview */}
                      <p className="text-xs text-slate-600 truncate max-w-xl">
                        {bill.items.map((it) => `${it.name} (${it.quantity})`).join(', ')}
                      </p>

                      {/* Customer & Timestamp */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" /> {formattedDate} at {formattedTime}
                        </span>
                        {bill.customerName && (
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <User className="w-3 h-3 text-amber-600" /> {bill.customerName}{' '}
                            {bill.customerPhone ? `(${bill.customerPhone})` : ''}
                          </span>
                        )}
                        {bill.cashierName && (
                          <span className="text-slate-500">
                            Cashier: <strong>{bill.cashierName}</strong>
                          </span>
                        )}
                        {bill.isModified && bill.modificationReason && (
                          <span className="text-amber-800 italic">
                            Reason: "{bill.modificationReason}"
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bill Grand Total & Action Buttons */}
                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                          Grand Total
                        </span>
                        <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
                          {CURRENCY}{bill.grandTotal.toFixed(2)}
                        </div>
                        {bill.previousGrandTotal && bill.previousGrandTotal !== bill.grandTotal && (
                          <span className="text-[10px] text-slate-400 line-through">
                            {CURRENCY}{bill.previousGrandTotal.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Print Receipt */}
                        <button
                          type="button"
                          onClick={() => onPrintBill(bill)}
                          className="p-2 sm:px-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
                          title="Print Thermal Bill Receipt"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                          <span className="hidden sm:inline">Print</span>
                        </button>

                        {/* Modify Bill */}
                        <button
                          type="button"
                          onClick={() => onSelectForModify(bill)}
                          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-xs group"
                          title="Edit items, rates, customer, or payment tender for this bill"
                        >
                          <Edit3 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                          <span>Modify Bill</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span>
            Displaying up to 20 most recent transactions for real-time cashier modification & re-prints.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
