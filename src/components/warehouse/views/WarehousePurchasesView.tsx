import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Building2,
  DollarSign,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  PackagePlus,
  CreditCard,
  Layers,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import {
  Supplier,
  PurchaseOrder,
  PurchaseBill,
  SupplierLedgerEntry,
  Warehouse,
} from '../../../types/warehouse';
import { CURRENCY } from '../../../services/storage';

interface WarehousePurchasesViewProps {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  purchaseBills: PurchaseBill[];
  ledgerEntries: SupplierLedgerEntry[];
  warehouses: Warehouse[];
  searchQuery: string;
  onOpenNewPO: () => void;
  onOpenInwardBill: (po?: PurchaseOrder) => void;
  onOpenRecordPayment: (supplierId: string) => void;
  onOpenAddSupplier: () => void;
}

export const WarehousePurchasesView: React.FC<WarehousePurchasesViewProps> = ({
  suppliers,
  purchaseOrders,
  purchaseBills,
  ledgerEntries,
  warehouses,
  searchQuery,
  onOpenNewPO,
  onOpenInwardBill,
  onOpenRecordPayment,
  onOpenAddSupplier,
}) => {
  const [activeTab, setActiveTab] = useState<'pos' | 'bills' | 'suppliers' | 'ledger'>('pos');
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState<string>('all');

  const filteredPOs = purchaseOrders.filter((po) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      po.poNumber.toLowerCase().includes(q) ||
      po.supplierName.toLowerCase().includes(q) ||
      po.destinationWarehouseName.toLowerCase().includes(q)
    );
  });

  const filteredBills = purchaseBills.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      b.billNumber.toLowerCase().includes(q) ||
      b.supplierName.toLowerCase().includes(q) ||
      b.supplierInvoiceNo.toLowerCase().includes(q)
    );
  });

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.gstin.toLowerCase().includes(q)
    );
  });

  const filteredLedger = ledgerEntries.filter((l) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      l.supplierName.toLowerCase().includes(q) ||
      l.referenceNo.toLowerCase().includes(q) ||
      (l.notes && l.notes.toLowerCase().includes(q));

    const matchesSup = selectedSupplierFilter === 'all' || l.supplierId === selectedSupplierFilter;
    return matchesSearch && matchesSup;
  });

  const totalOutstanding = suppliers.reduce((sum, s) => sum + s.currentOutstanding, 0);

  return (
    <div className="space-y-5">
      {/* Sub Tab Navigation Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'pos' ? 'bg-white shadow-xs text-indigo-950 font-bold' : 'text-slate-600'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
            <span>Purchase Orders ({purchaseOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bills')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'bills' ? 'bg-white shadow-xs text-indigo-950 font-bold' : 'text-slate-600'
            }`}
          >
            <PackagePlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Inward Purchase Bills / GRN ({purchaseBills.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'suppliers' ? 'bg-white shadow-xs text-indigo-950 font-bold' : 'text-slate-600'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-violet-600" />
            <span>Suppliers Directory ({suppliers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'ledger' ? 'bg-white shadow-xs text-indigo-950 font-bold' : 'text-slate-600'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-rose-600" />
            <span>Supplier Ledger & Payments</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'pos' && (
            <button
              onClick={onOpenNewPO}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue New PO</span>
            </button>
          )}

          {activeTab === 'bills' && (
            <button
              onClick={onOpenInwardBill}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Inward GRN Bill</span>
            </button>
          )}

          {activeTab === 'suppliers' && (
            <button
              onClick={onOpenAddSupplier}
              className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Supplier</span>
            </button>
          )}

          {activeTab === 'ledger' && (
            <button
              onClick={() => onOpenRecordPayment(suppliers[0]?.id || '')}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Record Supplier Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. PURCHASE ORDERS TAB */}
      {activeTab === 'pos' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">PO Number</th>
                  <th className="py-3.5 px-4">Supplier Name</th>
                  <th className="py-3.5 px-3">Destination Warehouse</th>
                  <th className="py-3.5 px-3">Order Date</th>
                  <th className="py-3.5 px-3">Expected Date</th>
                  <th className="py-3.5 px-3 text-right">PO Total Amount</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredPOs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                      No purchase orders found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{po.poNumber}</td>
                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-slate-900">{po.supplierName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">GSTIN: {po.supplierGstin}</div>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-600">{po.destinationWarehouseName}</td>
                      <td className="py-3 px-3 text-slate-600">{po.orderDate}</td>
                      <td className="py-3 px-3 text-slate-600">{po.expectedDeliveryDate}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {CURRENCY}{po.grandTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          po.status === 'received'
                            ? 'bg-emerald-100 text-emerald-800'
                            : po.status === 'approved'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {po.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        {po.status !== 'received' && (
                          <button
                            onClick={() => onOpenInwardBill(po)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs transition-colors cursor-pointer"
                          >
                            Inward GRN
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. PURCHASE BILLS / GRN TAB */}
      {activeTab === 'bills' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Bill Ref</th>
                  <th className="py-3.5 px-4">Supplier & Invoice</th>
                  <th className="py-3.5 px-3">Received At Warehouse</th>
                  <th className="py-3.5 px-3">Bill Date</th>
                  <th className="py-3.5 px-3 text-right">Grand Total</th>
                  <th className="py-3.5 px-3 text-right">Due Amount</th>
                  <th className="py-3.5 px-3 text-center">Payment Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                      No purchase bills recorded.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{b.billNumber}</td>
                      <td className="py-3 px-4 font-sans">
                        <div className="font-semibold text-slate-900">{b.supplierName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">Inv: {b.supplierInvoiceNo}</div>
                      </td>
                      <td className="py-3 px-3 font-sans text-slate-600">{b.warehouseName}</td>
                      <td className="py-3 px-3 text-slate-600">{b.billDate}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {CURRENCY}{b.grandTotal.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600">
                        {CURRENCY}{b.dueAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.paymentStatus === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {b.paymentStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-sans">
                        {b.dueAmount > 0 && (
                          <button
                            onClick={() => onOpenRecordPayment(b.supplierId)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors"
                          >
                            Pay Due
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SUPPLIERS DIRECTORY TAB */}
      {activeTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((sup) => (
            <div key={sup.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {sup.code}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{sup.name}</h3>
                  <p className="text-xs text-slate-500">{sup.category}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-rose-600">
                    {CURRENCY}{sup.currentOutstanding.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400">Outstanding</div>
                </div>
              </div>

              <div className="space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-2 font-mono">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{sup.phone}</span>
                </div>
                <div className="flex items-center gap-2 font-sans">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{sup.city}, {sup.state}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-sans">
                  GSTIN: <strong className="font-mono text-slate-800">{sup.gstin}</strong>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-[11px] text-slate-500">Terms: {sup.paymentTerms}</span>
                <button
                  onClick={() => onOpenRecordPayment(sup.id)}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-xs transition-colors"
                >
                  Pay Outstanding
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. SUPPLIER LEDGER & PAYMENTS TAB */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600">Filter Supplier:</span>
              <select
                value={selectedSupplierFilter}
                onChange={(e) => setSelectedSupplierFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-800"
              >
                <option value="all">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="text-xs font-semibold text-slate-700">
              Total Outstanding Balance: <strong className="text-rose-600 font-mono text-sm">{CURRENCY}{totalOutstanding.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Supplier</th>
                  <th className="py-3.5 px-3">Transaction Type</th>
                  <th className="py-3.5 px-3">Ref No</th>
                  <th className="py-3.5 px-3 text-right">Debit (Paid)</th>
                  <th className="py-3.5 px-3 text-right">Credit (Billed)</th>
                  <th className="py-3.5 px-4 text-right">Running Balance</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                      No ledger transactions logged yet.
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((led) => (
                    <tr key={led.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-600">{led.date}</td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-900">{led.supplierName}</td>
                      <td className="py-3 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          led.type === 'payment_made'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {led.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">{led.referenceNo}</td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600">
                        {led.debit > 0 ? `${CURRENCY}${led.debit.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {led.credit > 0 ? `${CURRENCY}${led.credit.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600">
                        {CURRENCY}{led.runningBalance.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
