import React from 'react';
import { CheckCircle2, Sparkles, X, Tag, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { SkuCleanResult } from '../../utils/skuUtils';

interface CleanSkusModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SkuCleanResult | null;
}

export const CleanSkusModal: React.FC<CleanSkusModalProps> = ({ isOpen, onClose, result }) => {
  if (!isOpen || !result) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                SKU Clean & Audit Report
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Completed
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Audited master inventory catalog for uppercase, formatting, and duplicate conflicts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-3 p-5 bg-slate-50 border-b border-slate-100">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
            <div className="text-xl font-black text-slate-900 font-mono">{result.totalAudited}</div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">Total SKUs Audited</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
            <div className={`text-xl font-black font-mono ${result.totalCleaned > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {result.totalCleaned}
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">Standardized / Cleaned</div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center">
            <div className="text-xl font-black text-slate-900 font-mono text-indigo-600">
              {result.duplicateResolvedCount}
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-0.5">Duplicates Resolved</div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {result.totalCleaned === 0 ? (
            <div className="p-8 text-center bg-emerald-50 rounded-2xl border border-emerald-200">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-emerald-950">All Current SKUs Are Pristine!</h4>
              <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                Every product code in the catalog already adheres to clean uppercase, valid hyphenated syntax, and 100% unique identifiers without collision.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
                <span>Cleaned SKU Modifications ({result.changes.length})</span>
                <span className="text-[11px] text-slate-400">Synchronized with Local & Cloud DB</span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                {result.changes.map((c) => (
                  <div key={c.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>{c.category}</span>
                        <span>•</span>
                        <span className="text-amber-700 font-medium">{c.reason}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                      <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg line-through">
                        {c.oldSku}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-lg">
                        {c.newSku}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 flex items-start gap-2.5 text-xs text-blue-900">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Integrity Guarantee:</span>
              All barcodes, stock quantities, warehouse allocations, and batch records remain preserved and linked to their items.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Audit Timestamp: {new Date(result.timestamp).toLocaleTimeString()}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
