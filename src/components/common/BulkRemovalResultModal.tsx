import React from 'react';
import { CheckCircle2, X, Package, Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import { BulkDuplicateRemovalResult } from '../../utils/skuUtils';

interface BulkRemovalResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: BulkDuplicateRemovalResult | null;
}

export const BulkRemovalResultModal: React.FC<BulkRemovalResultModalProps> = ({
  isOpen,
  onClose,
  result,
}) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bulk Duplicate Removal Completed
              </h3>
              <p className="text-xs text-slate-500">
                Master inventory catalog successfully deduplicated
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

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 p-5 bg-slate-50 border-b border-slate-100">
          <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
            <div className="text-xl font-black text-slate-900 font-mono">{result.mergedGroups.length}</div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">SKU Groups Consolidated</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-rose-200 text-center bg-rose-50/20">
            <div className="text-xl font-black text-rose-600 font-mono">{result.totalRemoved}</div>
            <div className="text-[11px] font-medium text-rose-700 mt-0.5">Redundant Items Purged</div>
          </div>
          <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center bg-emerald-50/20">
            <div className="text-xl font-black text-emerald-700 font-mono">{result.totalUniqueKept}</div>
            <div className="text-[11px] font-medium text-emerald-700 mt-0.5">Unique Items Active</div>
          </div>
        </div>

        {/* Audit Details */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs font-semibold text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>All inventory units and warehouse/store allocations were preserved and consolidated.</span>
          </div>

          <div className="text-xs font-bold text-slate-700 px-1">Consolidation Audit Log</div>

          <div className="space-y-2.5">
            {result.mergedGroups.map((group) => (
              <div key={group.sku} className="p-3 border border-slate-200 rounded-xl bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {group.sku}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700">
                    Consolidated Stock: {group.consolidatedStock} units
                  </span>
                </div>
                <div className="text-xs text-slate-700 flex items-center justify-between">
                  <span className="truncate max-w-[280px]">
                    Kept: <strong>{group.keptItem.name}</strong>
                  </span>
                  <span className="text-[10px] text-rose-600 font-semibold">
                    Purged {group.removedItems.length} duplicate item(s)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
