import React, { useState } from 'react';
import { X, DollarSign, CreditCard, Building2 } from 'lucide-react';
import { Supplier } from '../../../types/warehouse';
import { CURRENCY } from '../../../services/storage';
import { warehouseStorage } from '../../../services/warehouseStorage';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string;
  suppliers: Supplier[];
  onSuccess: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  supplierId,
  suppliers,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const [selectedSupId, setSelectedSupId] = useState(supplierId || suppliers[0]?.id || '');
  const supplier = suppliers.find((s) => s.id === selectedSupId) || suppliers[0];

  const [amount, setAmount] = useState<number>(supplier?.currentOutstanding || 50000);
  const [paymentMode, setPaymentMode] = useState<'NEFT' | 'RTGS' | 'UPI' | 'Cheque' | 'Cash'>('NEFT');
  const [refNumber, setRefNumber] = useState(`UTR-${Math.floor(10000000 + Math.random() * 90000000)}`);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier) return;

    let mode: 'bank_neft' | 'upi_qr' | 'cheque' | 'cash' = 'bank_neft';
    if (paymentMode === 'UPI') mode = 'upi_qr';
    else if (paymentMode === 'Cheque') mode = 'cheque';
    else if (paymentMode === 'Cash') mode = 'cash';

    warehouseStorage.recordSupplierPayment(supplier.id, amount, mode, refNumber, notes);

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden my-8">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-5 h-5 text-violet-400" />
            <h3 className="font-bold text-base">Record Supplier Payment</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Select Supplier
            </label>
            <select
              value={selectedSupId}
              onChange={(e) => {
                setSelectedSupId(e.target.value);
                const s = suppliers.find((x) => x.id === e.target.value);
                if (s) setAmount(s.currentOutstanding);
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (Outstanding: {CURRENCY}{s.currentOutstanding.toLocaleString('en-IN')})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-violet-50 rounded-xl border border-violet-100 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-700 font-sans">Current Outstanding:</span>
            <span className="font-bold text-rose-600 text-sm">{CURRENCY}{supplier?.currentOutstanding.toLocaleString('en-IN')}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="NEFT">Bank NEFT / RTGS</option>
                <option value="UPI">Corporate UPI</option>
                <option value="Cheque">Bank Cheque</option>
                <option value="Cash">Cash Voucher</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Paid Amount ({CURRENCY})
              </label>
              <input
                type="number"
                min="1"
                required
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Bank UTR / Cheque / Transaction Ref
            </label>
            <input
              type="text"
              required
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Payment Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. Cleared bill INV-8821 via HDFC Bank"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-md"
            >
              Record Payment & Update Ledger
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
