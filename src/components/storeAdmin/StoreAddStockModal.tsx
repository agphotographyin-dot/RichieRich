import React, { useState, useMemo } from 'react';
import {
  X,
  Package,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Building2,
  Tag,
  Barcode,
  Layers,
  Sparkles,
} from 'lucide-react';
import { InventoryItem } from '../../types';
import { MovementType } from '../../types/warehouse';
import { CURRENCY, storage } from '../../services/storage';
import { warehouseStorage } from '../../services/warehouseStorage';
import { soundEffects } from '../../services/audio';

interface StoreAddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  storeId: string;
  storeName: string;
  performedBy?: string;
  preselectedItem?: InventoryItem | null;
  onSuccess?: () => void;
}

export const StoreAddStockModal: React.FC<StoreAddStockModalProps> = ({
  isOpen,
  onClose,
  inventory,
  storeId,
  storeName,
  performedBy = 'Store Admin',
  preselectedItem = null,
  onSuccess,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>(preselectedItem?.id || '');
  const [mode, setMode] = useState<'add' | 'set'>('add');
  const [quantityInput, setQuantityInput] = useState<string>('10');
  const [loosePiecesInput, setLoosePiecesInput] = useState<string>('0');
  const [reasonPreset, setReasonPreset] = useState<string>('Direct Store Inward / Local Restock');
  const [customNote, setCustomNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter existing SKUs matching search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return inventory.slice(0, 10);
    }
    const q = searchQuery.toLowerCase().trim();
    return inventory.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.barcode && item.barcode.includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [inventory, searchQuery]);

  // Active selected item
  const selectedItem = useMemo(() => {
    if (selectedItemId) {
      return inventory.find((i) => i.id === selectedItemId) || null;
    }
    return preselectedItem || null;
  }, [inventory, selectedItemId, preselectedItem]);

  // Stock calculations
  const ppb = Math.max(1, selectedItem?.piecesPerBox && selectedItem.piecesPerBox > 1 ? selectedItem.piecesPerBox : 1);
  const isLooseItem = Boolean(
    selectedItem && (
      selectedItem.sellAsLoose ||
      selectedItem.loosePrice ||
      (selectedItem.piecesPerBox && selectedItem.piecesPerBox > 1)
    )
  );

  const currentStoreBoxes = selectedItem ? (selectedItem.storeAllocations?.[storeId] ?? 0) : 0;
  const currentStoreLoose = selectedItem ? (selectedItem.storeBoxAllocations?.[storeId]?.loosePieces ?? 0) : 0;
  const currentTotalPieces = (currentStoreBoxes * ppb) + currentStoreLoose;
  const centralStock = selectedItem?.stockQuantity ?? 0;

  const parsedQty = Math.max(0, parseInt(quantityInput) || 0);
  const parsedLoose = Math.max(0, parseInt(loosePiecesInput) || 0);

  // Calculate projected new balance
  let projectedBoxes = currentStoreBoxes;
  let projectedLoose = currentStoreLoose;
  let projectedTotalPieces = currentTotalPieces;

  if (selectedItem) {
    if (mode === 'add') {
      projectedTotalPieces = currentTotalPieces + (parsedQty * ppb) + parsedLoose;
      projectedBoxes = Math.floor(projectedTotalPieces / ppb);
      projectedLoose = projectedTotalPieces % ppb;
    } else {
      // Set exact
      projectedBoxes = parsedQty;
      projectedLoose = parsedLoose;
      projectedTotalPieces = (parsedQty * ppb) + parsedLoose;
    }
  }

  const pieceChange = projectedTotalPieces - currentTotalPieces;

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItemId(item.id);
    setSearchQuery('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !selectedItem) return;

    if (mode === 'add' && parsedQty === 0 && parsedLoose === 0) {
      alert('Please enter a valid quantity of units/boxes to add.');
      return;
    }

    setIsSubmitting(true);
    const finalReason = customNote.trim() ? `${reasonPreset}: ${customNote.trim()}` : reasonPreset;

    const success = warehouseStorage.adjustStoreStock(
      selectedItem.id,
      storeId,
      mode === 'add' ? parsedQty : projectedBoxes,
      finalReason,
      performedBy,
      {
        loosePieces: mode === 'add' ? parsedLoose : projectedLoose,
        isDeltaAdd: mode === 'add',
        movementType: mode === 'add' ? 'physical_adjustment' : 'physical_adjustment',
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">Add Stock to Store</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Search existing SKU & allocate stock to <strong className="text-amber-300">{storeName}</strong>
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
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* 1. Search & Select Existing SKU */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              <span>Search & Select Existing SKU / Product:</span>
            </label>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Type product name, SKU (e.g. SKU-PAN-001), or barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              />
            </div>

            {/* Search Suggestions Dropdown */}
            {searchQuery.trim() && (
              <div className="mt-1.5 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 z-10">
                {searchResults.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    No matching SKU found for "{searchQuery}".
                  </div>
                ) : (
                  searchResults.map((item) => {
                    const allocated = item.storeAllocations?.[storeId] ?? 0;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className={`w-full text-left p-2.5 hover:bg-indigo-50/80 transition-colors flex items-center justify-between gap-2 text-xs cursor-pointer ${
                          selectedItemId === item.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10px] font-mono text-slate-500">
                            SKU: {item.sku} • {item.category} • {CURRENCY}{item.sellingPrice.toFixed(2)}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-500 block">Current Store Stock</span>
                          <span className="font-mono font-bold text-slate-800">
                            {allocated} {item.unit || 'units'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 2. Selected SKU Card */}
          {selectedItem ? (
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                    Selected Product
                  </span>
                  <h4 className="font-extrabold text-sm text-slate-900 mt-1">{selectedItem.name}</h4>
                  <p className="text-[11px] font-mono text-slate-600">
                    SKU: <strong>{selectedItem.sku}</strong> • Barcode: {selectedItem.barcode || 'N/A'} • Category: {selectedItem.category}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase">Price</span>
                  <span className="text-sm font-mono font-black text-indigo-900">
                    {CURRENCY}{selectedItem.sellingPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Current Stock Strip */}
              <div className="pt-2 border-t border-indigo-200/80 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Current Store Stock</span>
                  <span className="font-black text-slate-900 text-sm font-mono block mt-0.5">
                    {currentStoreBoxes} {selectedItem.unit || 'units'}
                    {isLooseItem && (
                      <span className="text-xs text-amber-800 font-bold ml-1">
                        + {currentStoreLoose} Loose ({currentTotalPieces} Pcs)
                      </span>
                    )}
                  </span>
                </div>

                <div className="bg-white p-2 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Central WH Stock</span>
                  <span className="font-black text-indigo-700 text-sm font-mono block mt-0.5">
                    {centralStock} {selectedItem.unit || 'units'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
              Please search and select an existing product / SKU from the list above.
            </div>
          )}

          {/* 3. Inward / Adjustment Mode Switcher */}
          {selectedItem && (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Select Stock Action:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('add')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                      mode === 'add'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Units to Store (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('set');
                      setQuantityInput(String(currentStoreBoxes));
                      setLoosePiecesInput(String(currentStoreLoose));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                      mode === 'set'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Set Exact Verified Count (=)</span>
                  </button>
                </div>
              </div>

              {/* 4. Quantity Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                    {mode === 'add' ? `Units / Boxes to Add (+)` : `Exact Full Boxes / Units (=)`}:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    placeholder="Enter quantity..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
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
                      {mode === 'add' ? `Loose Pieces to Add (+)` : `Exact Loose Pieces (=)`}:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={ppb > 1 ? ppb - 1 : 9999}
                      step="1"
                      value={loosePiecesInput}
                      onChange={(e) => setLoosePiecesInput(e.target.value)}
                      placeholder="0"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                    <span className="text-[10px] text-amber-800 mt-1 block">
                      Loose piece range: 0 to {ppb - 1} pcs
                    </span>
                  </div>
                )}
              </div>

              {/* 5. Inward Reason */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                  Inward Reason & Audit Category:
                </label>
                <select
                  value={reasonPreset}
                  onChange={(e) => setReasonPreset(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer mb-2"
                >
                  <option value="Direct Store Inward / Local Restock">📥 Direct Store Inward / Local Restock</option>
                  <option value="Physical Store Count Audit">🔍 Physical Store Stock Count / Audit</option>
                  <option value="Supplier Direct Delivery">🚚 Supplier Direct Delivery to Store</option>
                  <option value="Inter-Store Stock Handover">🔄 Inter-Store Stock Handover</option>
                  <option value="Customer Return / Exchange">↩️ Customer Return / Exchange Restock</option>
                </select>

                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Optional reference number or invoice note..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* 6. Live Projected Stock Preview */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-3.5 rounded-xl space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-xs border-b border-indigo-800/80 pb-1.5">
                  <span className="font-bold text-indigo-200 flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Projected Store Stock</span>
                  </span>
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      pieceChange > 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {pieceChange >= 0 ? `+${pieceChange} Pcs` : `${pieceChange} Pcs`}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Previous Store Stock</span>
                    <span className="font-mono text-xs text-slate-300">
                      {currentStoreBoxes} Box + {currentStoreLoose} Loose ({currentTotalPieces} pcs)
                    </span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-amber-400" />

                  <div className="text-right">
                    <span className="text-[10px] text-emerald-300 font-bold block uppercase">New Store Stock</span>
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {projectedBoxes} Box + {projectedLoose} Loose ({projectedTotalPieces} pcs)
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !selectedItem}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating...' : 'Add Stock & Sync Warehouse'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
