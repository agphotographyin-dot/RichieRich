import React from 'react';
import { Trash2, AlertTriangle, CheckCircle2, ArrowRight, Package, X, ShieldAlert, Sparkles } from 'lucide-react';
import { InventoryItem } from '../../types';
import { BulkDuplicateRemovalResult, DuplicateMergedGroup } from '../../utils/skuUtils';
import { CURRENCY } from '../../services/storage';

interface BulkRemoveDuplicatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicateGroups: Map<string, InventoryItem[]>;
  onConfirmRemoval: () => void;
  lastRemovalResult?: BulkDuplicateRemovalResult | null;
}

export const BulkRemoveDuplicatesModal: React.FC<BulkRemoveDuplicatesModalProps> = ({
  isOpen,
  onClose,
  duplicateGroups,
  onConfirmRemoval,
  lastRemovalResult,
}) => {
  if (!isOpen) return null;

  // Calculate stats from duplicateGroups
  const groupEntries = Array.from(duplicateGroups.entries());
  const totalConflictingItems = groupEntries.reduce((acc, [_, list]) => acc + list.length, 0);
  const totalRemovableDuplicates = totalConflictingItems - groupEntries.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-rose-50 to-amber-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Bulk Remove Duplicate SKUs
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  {totalRemovableDuplicates} Redundant Items
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Consolidate duplicate product entries and purge redundant items from master catalog
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-3 p-5 bg-slate-50 border-b border-slate-100">
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
            <div className="text-xl font-black text-slate-900 font-mono">{groupEntries.length}</div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">Conflicting SKU Codes</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-rose-200 text-center bg-rose-50/30">
            <div className="text-xl font-black text-rose-600 font-mono">{totalRemovableDuplicates}</div>
            <div className="text-[11px] font-medium text-rose-700 mt-0.5">Duplicates to Purge</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center bg-emerald-50/30">
            <div className="text-xl font-black text-emerald-700 font-mono">{groupEntries.length}</div>
            <div className="text-[11px] font-medium text-emerald-700 mt-0.5">Primary Items to Keep</div>
          </div>
        </div>

        {/* Content list */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Zero Inventory Loss Protection:</span>
              Stock units and store allocations from all purged duplicate records will be merged into the primary record before deletion.
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-700 px-1">
              Conflicting SKU Groups Preview ({groupEntries.length})
            </div>

            <div className="space-y-3">
              {groupEntries.map(([sku, items]) => {
                const primary = items[0];
                const duplicates = items.slice(1);
                const duplicateStock = duplicates.reduce((acc, i) => acc + (i.stockQuantity || 0), 0);
                const totalStock = (primary.stockQuantity || 0) + duplicateStock;

                return (
                  <div key={sku} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="p-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {sku}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {items.length} records sharing this SKU
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Consolidated Stock: {totalStock} units
                      </span>
                    </div>

                    <div className="p-3 space-y-2 text-xs">
                      {/* Kept Item */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase px-1.5 py-0.5 bg-emerald-100 rounded">
                              Keep
                            </span>
                            <span className="font-bold text-slate-900 truncate">{primary.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            ID: {primary.id.slice(0, 15)}... • Price: {CURRENCY}{primary.sellingPrice}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-slate-700">
                            {primary.stockQuantity} units
                          </span>
                          <span className="text-[10px] text-emerald-700 block font-semibold">
                            + {duplicateStock} = {totalStock}
                          </span>
                        </div>
                      </div>

                      {/* Items to Remove */}
                      <div className="space-y-1.5 pl-3 border-l-2 border-rose-200 ml-2">
                        {duplicates.map((dup) => (
                          <div key={dup.id} className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50 border border-rose-100 text-slate-600">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-rose-700 uppercase px-1.5 py-0.5 bg-rose-100 rounded">
                                  Purge
                                </span>
                                <span className="font-medium text-slate-800 truncate">{dup.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                ID: {dup.id.slice(0, 15)}... • Stock to transfer: {dup.stockQuantity} units
                              </div>
                            </div>
                            <span className="text-rose-600 font-mono font-semibold shrink-0">
                              -{dup.stockQuantity} units
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmRemoval}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Purge {totalRemovableDuplicates} Duplicate Items</span>
          </button>
        </div>
      </div>
    </div>
  );
};
