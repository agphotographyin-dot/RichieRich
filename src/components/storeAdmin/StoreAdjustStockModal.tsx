import React, { useState } from 'react';
import {
  X,
  Package,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileText,
} from 'lucide-react';
import { InventoryItem } from '../../types';
import { MovementType } from '../../types/warehouse';
import { CURRENCY, storage } from '../../services/storage';
import { warehouseStorage } from '../../services/warehouseStorage';
import { soundEffects } from '../../services/audio';

interface StoreAdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  storeId: string;
  storeName: string;
  performedBy?: string;
  onSuccess?: () => void;
}

export const StoreAdjustStockModal: React.FC<StoreAdjustStockModalProps> = ({
  isOpen,
  onClose,
  item,
  storeId,
  storeName,
  performedBy = 'Store Admin',
  onSuccess,
}) => {
  if (!isOpen || !item) return null;

  const ppb = Math.max(1, item.piecesPerBox && item.piecesPerBox > 1 ? item.piecesPerBox : 1);
  const isLooseItem = Boolean(
    item.sellAsLoose ||
    item.loosePrice ||
    (item.piecesPerBox && item.piecesPerBox > 1)
  );

  const currentStoreBoxes = item.storeAllocations?.[storeId] ?? 0;
  const currentStoreLoose = item.storeBoxAllocations?.[storeId]?.loosePieces ?? 0;
  const currentTotalPieces = (currentStoreBoxes * ppb) + currentStoreLoose;
  const centralStock = item.stockQuantity ?? 0;

  // Adjustment Mode: 'add' (inward / increase), 'set' (exact physical count), 'deduct' (damage / decrease)
  const [mode, setMode] = useState<'add' | 'set' | 'deduct'>('add');
  const [boxesInput, setBoxesInput] = useState<string>('1');
  const [loosePiecesInput, setLoosePiecesInput] = useState<string>('0');
  const [reasonPreset, setReasonPreset] = useState<string>('Direct Store Inward / Restock');
  const [customNote, setCustomNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const parsedBoxes = Math.max(0, parseInt(boxesInput) || 0);
  const parsedLoose = Math.max(0, parseInt(loosePiecesInput) || 0);

  // Calculate new projected stock based on active mode
  let projectedBoxes = currentStoreBoxes;
  let projectedLoose = currentStoreLoose;
  let projectedTotalPieces = currentTotalPieces;

  if (mode === 'add') {
    projectedTotalPieces = currentTotalPieces + (parsedBoxes * ppb) + parsedLoose;
    projectedBoxes = Math.floor(projectedTotalPieces / ppb);
    projectedLoose = projectedTotalPieces % ppb;
  } else if (mode === 'deduct') {
    projectedTotalPieces = Math.max(0, currentTotalPieces - ((parsedBoxes * ppb) + parsedLoose));
    projectedBoxes = Math.floor(projectedTotalPieces / ppb);
    projectedLoose = projectedTotalPieces % ppb;
  } else if (mode === 'set') {
    projectedBoxes = parsedBoxes;
    projectedLoose = parsedLoose;
    projectedTotalPieces = (parsedBoxes * ppb) + parsedLoose;
  }

  const pieceChange = projectedTotalPieces - currentTotalPieces;
  const boxChange = projectedBoxes - currentStoreBoxes;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (mode !== 'set' && parsedBoxes === 0 && parsedLoose === 0) {
      alert('Please enter a valid quantity of boxes or pieces to adjust.');
      return;
    }

    setIsSubmitting(true);
    const finalReason = customNote.trim() ? `${reasonPreset}: ${customNote.trim()}` : reasonPreset;

    let movementType: MovementType = 'physical_adjustment';
    if (mode === 'add') movementType = 'physical_adjustment';
    else if (mode === 'deduct') movementType = 'damage_scrap';
    else if (mode === 'set') movementType = pieceChange >= 0 ? 'physical_adjustment' : 'damage_scrap';

    const success = warehouseStorage.adjustStoreStock(
      item.id,
      storeId,
      mode === 'add' ? parsedBoxes : mode === 'deduct' ? -parsedBoxes : projectedBoxes,
      finalReason,
      performedBy,
      {
        loosePieces: mode === 'add' ? parsedLoose : mode === 'deduct' ? -parsedLoose : projectedLoose,
        isDeltaAdd: mode === 'add' || mode === 'deduct',
        movementType,
      }
    );

    setIsSubmitting(false);

    if (success) {
      soundEffects.playSuccessChime();
      onSuccess?.();
      onClose();
    } else {
      soundEffects.playWarningChime();
      alert('Failed to update store stock. Please verify values.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Manually Update Store Stock</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {storeName} • Real-time Warehouse & Master Catalog Sync
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Item Details Card */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-sm text-slate-900">{item.name}</h4>
                <p className="text-[11px] font-mono text-slate-500">
                  SKU: {item.sku} • Category: {item.category}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold font-mono">
                {CURRENCY}{item.sellingPrice.toFixed(2)}
              </span>
            </div>

            {/* Current Stock Breakdown */}
            <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Current Store Stock</span>
                <span className="font-black text-slate-900 text-sm font-mono block mt-0.5">
                  {currentStoreBoxes} {item.unit || 'units'}
                  {isLooseItem && (
                    <span className="text-xs text-amber-800 font-bold ml-1">
                      + {currentStoreLoose} Loose ({currentTotalPieces} Pcs)
                    </span>
                  )}
                </span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Central WH Stock</span>
                <span className="font-black text-indigo-700 text-sm font-mono block mt-0.5">
                  {centralStock} {item.unit || 'units'}
                </span>
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Adjustment Operation Type:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('add');
                  setReasonPreset('Direct Store Inward / Restock');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'add'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stock (+)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('set');
                  setBoxesInput(String(currentStoreBoxes));
                  setLoosePiecesInput(String(currentStoreLoose));
                  setReasonPreset('Physical Store Count Audit');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'set'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Exact Count (=)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('deduct');
                  setReasonPreset('Damage / Spoilage / Sample');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'deduct'
                    ? 'bg-red-600 text-white border-red-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Deduct (-)</span>
              </button>
            </div>
          </div>

          {/* Quantity Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                {mode === 'set' ? 'Exact Full Boxes / Units' : `Box Units to ${mode === 'add' ? 'Add' : 'Deduct'}`}:
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={boxesInput}
                onChange={(e) => setBoxesInput(e.target.value)}
                placeholder="Enter boxes..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                required
              />
              {ppb > 1 && (
                <span className="text-[10px] text-slate-500 mt-1 block">
                  1 Box = {ppb} pieces
                </span>
              )}
            </div>

            {isLooseItem && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  {mode === 'set' ? 'Exact Loose Pieces' : `Loose Pieces to ${mode === 'add' ? 'Add' : 'Deduct'}`}:
                </label>
                <input
                  type="number"
                  min="0"
                  max={ppb > 1 ? ppb - 1 : 9999}
                  step="1"
                  value={loosePiecesInput}
                  onChange={(e) => setLoosePiecesInput(e.target.value)}
                  placeholder="Enter loose pieces..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
                <span className="text-[10px] text-amber-800 mt-1 block">
                  Loose piece ratio: 0 to {ppb - 1} pcs
                </span>
              </div>
            )}
          </div>

          {/* Reason Selection */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
              Adjustment Reason & Audit Category:
            </label>
            <select
              value={reasonPreset}
              onChange={(e) => setReasonPreset(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer mb-2"
            >
              <option value="Direct Store Inward / Restock">📥 Direct Store Inward / Local Delivery</option>
              <option value="Physical Store Count Audit">🔍 Physical Store Stock Audit / Count Verification</option>
              <option value="Damage / Spoilage / Expired">⚠️ Damage / Spoilage / Expired Batch Write-off</option>
              <option value="Customer Return / Exchange">🔄 Customer Return / Product Exchange</option>
              <option value="Sample / Tasting / Marketing">🎁 Tasting Sample / Store Marketing</option>
              <option value="Inter-Store Emergency Restock">🚚 Inter-Store Emergency Handover</option>
            </select>

            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Optional notes or supplier invoice reference..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>

          {/* Live Projected Stock Preview Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-3.5 rounded-xl space-y-2 shadow-xs">
            <div className="flex items-center justify-between text-xs border-b border-indigo-800/80 pb-1.5">
              <span className="font-bold text-indigo-200 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Projected New Balance</span>
              </span>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                  pieceChange > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : pieceChange < 0
                    ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {pieceChange > 0 ? `+${pieceChange} Pcs` : `${pieceChange} Pcs`}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Previous Store Balance</span>
                <span className="font-mono text-xs text-slate-300">
                  {currentStoreBoxes} Box + {currentStoreLoose} Loose ({currentTotalPieces} pcs)
                </span>
              </div>

              <ArrowRight className="w-4 h-4 text-amber-400" />

              <div className="text-right">
                <span className="text-[10px] text-emerald-300 font-bold block uppercase">New Store Balance</span>
                <span className="font-mono text-sm font-bold text-emerald-400">
                  {projectedBoxes} Box + {projectedLoose} Loose ({projectedTotalPieces} pcs)
                </span>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating...' : 'Save & Sync Inventory'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
