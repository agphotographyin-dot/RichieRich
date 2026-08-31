import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Truck, AlertTriangle } from 'lucide-react';
import { StockTransfer } from '../../../types/warehouse';
import { warehouseStorage } from '../../../services/warehouseStorage';

interface ReceiveTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: StockTransfer | null;
  onSuccess: () => void;
}

export const ReceiveTransferModal: React.FC<ReceiveTransferModalProps> = ({
  isOpen,
  onClose,
  transfer,
  onSuccess,
}) => {
  const [otpInput, setOtpInput] = useState(transfer?.otpOrPin || '');
  const [receivedItems, setReceivedItems] = useState(
    transfer
      ? transfer.items.map((it) => ({
          itemId: it.itemId,
          dispatchedQty: it.dispatchedQty,
          receivedQty: it.dispatchedQty,
          damagedQty: 0,
        }))
      : []
  );
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (transfer) {
      setOtpInput(transfer.otpOrPin || '');
      setReceivedItems(
        transfer.items.map((it) => ({
          itemId: it.itemId,
          dispatchedQty: it.dispatchedQty,
          receivedQty: it.dispatchedQty,
          damagedQty: 0,
        }))
      );
      setNotes('');
      setError(null);
    }
  }, [transfer]);

  if (!isOpen || !transfer) return null;

  const handleQtyChange = (index: number, field: 'receivedQty' | 'damagedQty', val: number) => {
    const next = [...receivedItems];
    next[index] = { ...next[index], [field]: val };
    setReceivedItems(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput.trim() !== transfer.otpOrPin?.trim()) {
      setError(`Invalid Delivery OTP! The driver / dispatch note has PIN: ${transfer.otpOrPin}`);
      return;
    }

    const itemMap: Record<string, number> = {};
    receivedItems.forEach((r) => {
      itemMap[r.itemId] = r.receivedQty;
    });

    warehouseStorage.receiveTransfer(transfer.id, 'Store Manager', itemMap);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">Store Receiving Verification</h3>
              <p className="text-[11px] text-slate-400">{transfer.transferNumber} • {transfer.sourceName} ➔ {transfer.destinationName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* OTP Verification Input */}
          <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-indigo-950 uppercase">
                Driver Delivery Verification PIN
              </label>
              <p className="text-[11px] text-indigo-700">Driver PIN from Manifest: <strong>{transfer.otpOrPin}</strong></p>
            </div>
            <input
              type="text"
              required
              value={otpInput}
              onChange={(e) => {
                setOtpInput(e.target.value);
                setError(null);
              }}
              className="w-28 p-2 bg-white border border-indigo-200 rounded-xl font-mono text-center font-bold text-sm text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Item Checklist with Partial / Damage support */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Verify Received Quantities & Damaged Stock
            </label>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {transfer.items.map((it, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between font-medium text-slate-900">
                    <div>
                      <div className="font-bold">{it.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Batch: {it.batchNumber}</div>
                    </div>
                    <div className="text-right font-mono font-bold text-slate-600">
                      Dispatched: {it.dispatchedQty} {it.unit}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                    <div>
                      <label className="text-[10px] text-emerald-700 font-semibold">Accepted / Good Qty</label>
                      <input
                        type="number"
                        min="0"
                        max={it.dispatchedQty}
                        value={receivedItems[idx]?.receivedQty || 0}
                        onChange={(e) => handleQtyChange(idx, 'receivedQty', parseInt(e.target.value) || 0)}
                        className="w-full p-1 bg-white border border-emerald-300 rounded font-mono text-center font-bold text-emerald-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-rose-700 font-semibold">Damaged in Transit Qty</label>
                      <input
                        type="number"
                        min="0"
                        max={it.dispatchedQty}
                        value={receivedItems[idx]?.damagedQty || 0}
                        onChange={(e) => handleQtyChange(idx, 'damagedQty', parseInt(e.target.value) || 0)}
                        className="w-full p-1 bg-white border border-rose-300 rounded font-mono text-center font-bold text-rose-800 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Store Receiving Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. All packaging intact, cold seal verified"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
            />
          </div>

          {/* Submit */}
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
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md"
            >
              Confirm Store Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
