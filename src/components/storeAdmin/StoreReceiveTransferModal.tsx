import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Truck,
  ShieldCheck,
  AlertTriangle,
  PackageCheck,
  Building2,
} from 'lucide-react';
import { StockTransfer } from '../../types/warehouse';
import { StoreLocation } from '../../types';
import { warehouseStorage } from '../../services/warehouseStorage';
import { soundEffects } from '../../services/audio';

interface StoreReceiveTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: StockTransfer | null;
  currentStore: StoreLocation;
  adminName?: string;
  onSuccess: () => void;
}

export const StoreReceiveTransferModal: React.FC<StoreReceiveTransferModalProps> = ({
  isOpen,
  onClose,
  transfer,
  currentStore,
  adminName,
  onSuccess,
}) => {
  const [otpInput, setOtpInput] = useState('');
  const [receivedItems, setReceivedItems] = useState<
    Array<{
      itemId: string;
      name: string;
      sku: string;
      unit: string;
      dispatchedQty: number;
      receivedQty: number;
      damagedQty: number;
    }>
  >([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && transfer) {
      setOtpInput(transfer.otpOrPin || '');
      setReceivedItems(
        transfer.items.map((it) => ({
          itemId: it.itemId,
          name: it.name,
          sku: it.sku,
          unit: it.unit,
          dispatchedQty: it.dispatchedQty || it.requestedQty,
          receivedQty: it.dispatchedQty || it.requestedQty,
          damagedQty: 0,
        }))
      );
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, transfer]);

  if (!isOpen || !transfer) return null;

  const handleQtyChange = (
    index: number,
    field: 'receivedQty' | 'damagedQty',
    val: number
  ) => {
    const next = [...receivedItems];
    const current = next[index];
    const cleanVal = Math.max(0, val);

    if (field === 'receivedQty') {
      current.receivedQty = Math.min(cleanVal, current.dispatchedQty);
      current.damagedQty = Math.max(0, current.dispatchedQty - current.receivedQty);
    } else {
      current.damagedQty = cleanVal;
      current.receivedQty = Math.max(0, current.dispatchedQty - cleanVal);
    }

    setReceivedItems(next);
  };

  const handleConfirmInward = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (transfer.otpOrPin && otpInput.trim() !== transfer.otpOrPin.trim()) {
      setErrorMessage(
        `Invalid Delivery Verification PIN. The manifest PIN from the driver is: ${transfer.otpOrPin}`
      );
      soundEffects.playWarningChime();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const itemMap: Record<string, number> = {};
      receivedItems.forEach((r) => {
        itemMap[r.itemId] = r.receivedQty;
      });

      const receiver = adminName || `${currentStore.name} Store Admin`;
      const success = warehouseStorage.receiveTransfer(transfer.id, receiver, itemMap);

      if (!success) {
        setErrorMessage('Failed to inward transfer into store.');
        soundEffects.playWarningChime();
        return;
      }

      soundEffects.playSuccessChime();
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during receiving.');
      soundEffects.playWarningChime();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PackageCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">Receive & Inward Stock at Store</h3>
              <p className="text-[11px] text-emerald-300">
                {transfer.transferNumber} • From {transfer.sourceName} ➔ To {currentStore.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-emerald-400 hover:text-white p-1 rounded-lg hover:bg-emerald-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirmInward} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Delivery Details */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Vehicle</span>
              <span className="font-mono font-bold text-slate-800">
                {transfer.vehicleNumber || 'Van Fleet'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Carrier / Driver</span>
              <span className="font-semibold text-slate-800 truncate block">
                {transfer.driverContact || transfer.carrierName || 'Internal Courier'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Destination</span>
              <span className="font-bold text-emerald-700 truncate block">
                {currentStore.name}
              </span>
            </div>
          </div>

          {/* Items Inward Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Verify Inward Quantities
              </label>
              <span className="text-[11px] text-slate-500">
                Adjust count if units arrived damaged or missing
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-2 text-center">Dispatched</th>
                    <th className="py-2.5 px-2 text-center w-28">Good Stock (Inward)</th>
                    <th className="py-2.5 px-2 text-center w-24">Damaged / Lost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receivedItems.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{row.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">SKU: {row.sku}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700">
                        {row.dispatchedQty} {row.unit}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={row.dispatchedQty}
                          value={row.receivedQty}
                          onChange={(e) =>
                            handleQtyChange(idx, 'receivedQty', parseInt(e.target.value) || 0)
                          }
                          className="w-20 p-1.5 bg-emerald-50/60 border border-emerald-300 rounded-lg text-xs font-mono font-bold text-center text-emerald-950 focus:bg-white"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={row.dispatchedQty}
                          value={row.damagedQty}
                          onChange={(e) =>
                            handleQtyChange(idx, 'damagedQty', parseInt(e.target.value) || 0)
                          }
                          className={`w-16 p-1.5 border rounded-lg text-xs font-mono font-bold text-center ${
                            row.damagedQty > 0
                              ? 'bg-rose-50 border-rose-300 text-rose-700'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Delivery OTP Verification */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Security Delivery PIN / OTP</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Enter or verify the 4-digit code provided on the driver's dispatch manifest.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <input
                type="text"
                maxLength={8}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                className="w-36 p-2 bg-white border border-emerald-300 rounded-xl text-center font-mono font-black text-sm tracking-widest text-emerald-950 shadow-xs"
                placeholder="4-DIGIT PIN"
              />
              <span className="text-[11px] text-emerald-700 font-semibold">
                Manifest Code: <strong className="font-mono">{transfer.otpOrPin}</strong>
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-md transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Inwarding Stock...' : 'Confirm Receipt & Inward Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
