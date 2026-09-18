import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Package,
  ShieldCheck,
  Building2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { StockTransfer } from '../../../types/warehouse';
import { warehouseStorage } from '../../../services/warehouseStorage';
import { storage } from '../../../services/storage';
import { soundEffects } from '../../../services/audio';

interface DispatchTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  transfer: StockTransfer | null;
  onSuccess: () => void;
  onOpenInward?: () => void;
}

export const DispatchTransferModal: React.FC<DispatchTransferModalProps> = ({
  isOpen,
  onClose,
  transfer,
  onSuccess,
  onOpenInward,
}) => {
  const [carrierName, setCarrierName] = useState('Internal Express Fleet');
  const [vehicleNumber, setVehicleNumber] = useState('GJ-01-WH-4482');
  const [driverContact, setDriverContact] = useState('Ramesh Sharma (+91 98250 12345)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inventory = useMemo(() => storage.getInventory(), [isOpen, transfer]);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setIsSubmitting(false);
      if (transfer?.carrierName) setCarrierName(transfer.carrierName);
      if (transfer?.vehicleNumber) setVehicleNumber(transfer.vehicleNumber);
      if (transfer?.driverContact) setDriverContact(transfer.driverContact);
    }
  }, [isOpen, transfer]);

  if (!isOpen || !transfer) return null;

  // Real-time stock audit for all items in this transfer
  const itemStockAudits = transfer.items.map((item) => {
    const qty = item.dispatchedQty || item.requestedQty;
    const invItem = inventory.find((i) => i.id === item.itemId);
    const availableStock = invItem ? invItem.stockQuantity : 0;
    const isSufficient = availableStock >= qty;
    return {
      ...item,
      qty,
      availableStock,
      isSufficient,
      deficit: Math.max(0, qty - availableStock),
    };
  });

  const hasInsufficientStock =
    transfer.type === 'warehouse_to_store' &&
    itemStockAudits.some((it) => !it.isSufficient);

  const handleConfirmDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || hasInsufficientStock) return;

    if (!vehicleNumber.trim()) {
      setErrorMessage('Please enter a vehicle registration number for transit tracking.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = warehouseStorage.dispatchTransfer(
        transfer.id,
        carrierName.trim() || 'Internal Fleet',
        vehicleNumber.trim(),
        driverContact.trim() || 'Assigned Driver'
      );

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to dispatch transfer.');
        soundEffects.playWarningChime();
        return;
      }

      soundEffects.playSuccessChime();
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during dispatch.');
      soundEffects.playWarningChime();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base">Confirm Transfer Dispatch</h3>
              <p className="text-[11px] text-slate-400">
                {transfer.transferNumber} • {transfer.sourceName} ➔ {transfer.destinationName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirmDispatch} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Insufficient stock banner */}
          {hasInsufficientStock && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Central Warehouse has insufficient stock for this transfer</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                One or more requested items exceed the available stock physically in the Central
                Warehouse Hub. To prevent negative stock errors, inward fresh supplier stock via a
                GRN Bill before dispatching.
              </p>
              {onOpenInward && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenInward();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Open Supplier Inward GRN Bill</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Item stock check table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Items Stock Verification
              </label>
              <span className="text-[11px] text-slate-500">
                Source: <strong className="text-slate-800">{transfer.sourceName}</strong>
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-2 text-center">To Dispatch</th>
                    <th className="py-2.5 px-2 text-center">Central WH Stock</th>
                    <th className="py-2.5 px-3 text-right">Availability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemStockAudits.map((it, idx) => (
                    <tr key={idx} className={it.isSufficient ? 'hover:bg-slate-50' : 'bg-rose-50/40'}>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{it.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">SKU: {it.sku}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-black text-slate-900">
                        {it.qty} {it.unit}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold">
                        <span
                          className={
                            it.isSufficient ? 'text-emerald-700 font-bold' : 'text-rose-700 font-extrabold'
                          }
                        >
                          {it.availableStock} {it.unit}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {it.isSufficient ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Short by {it.deficit}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transit Logistics Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-600" />
              <span>Logistics & Vehicle Information</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                  Carrier / Fleet Name
                </label>
                <input
                  type="text"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                  placeholder="e.g. Internal Express Fleet"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                  Vehicle Registration No *
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                  placeholder="e.g. GJ-01-WH-4482"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-600 font-semibold block mb-1">
                  Driver Name & Contact Number
                </label>
                <input
                  type="text"
                  value={driverContact}
                  onChange={(e) => setDriverContact(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900"
                  placeholder="e.g. Ramesh Sharma (+91 98250 12345)"
                />
              </div>
            </div>

            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-blue-900 font-semibold">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Delivery Receiving Verification OTP:</span>
              </div>
              <span className="font-mono font-black text-sm text-blue-900 bg-white px-2.5 py-0.5 rounded border border-blue-300">
                {transfer.otpOrPin || 'Generated on dispatch'}
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
              disabled={isSubmitting || hasInsufficientStock}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 text-white shadow-md transition-all cursor-pointer ${
                hasInsufficientStock
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>{isSubmitting ? 'Dispatching...' : 'Confirm Dispatch & Ship Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
