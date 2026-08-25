import React, { useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  TrendingDown,
  Layers,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { StockAdjustment, Warehouse } from '../../../types/warehouse';
import { CURRENCY } from '../../../services/storage';

interface WarehouseAdjustmentsViewProps {
  adjustments: StockAdjustment[];
  warehouses: Warehouse[];
  searchQuery: string;
  onOpenAdjustmentModal: () => void;
}

export const WarehouseAdjustmentsView: React.FC<WarehouseAdjustmentsViewProps> = ({
  adjustments,
  warehouses,
  searchQuery,
  onOpenAdjustmentModal,
}) => {
  const [reasonFilter, setReasonFilter] = useState<string>('all');

  const filteredAdjustments = adjustments.filter((adj) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      adj.adjustmentNumber.toLowerCase().includes(q) ||
      adj.itemName.toLowerCase().includes(q) ||
      adj.batchNumber?.toLowerCase().includes(q) ||
      adj.locationName.toLowerCase().includes(q);

    const matchesReason = reasonFilter === 'all' || adj.reason === reasonFilter;
    return matchesSearch && matchesReason;
  });

  const totalLoss = adjustments
    .filter((a) => a.type === 'decrease_damage' || a.type === 'decrease_expired' || a.type === 'decrease_shrinkage')
    .reduce((sum, a) => sum + Math.abs(a.valuationImpact), 0);

  return (
    <div className="space-y-5">
      {/* Top Header & Loss Impact Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <span>Stock Adjustments, Scrap & Damage Ledger</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track damaged betel leaves, expired syrups, physical audit discrepancies & write-offs
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Scrap & Loss</span>
            <div className="text-lg font-bold text-rose-600 font-mono">
              -{CURRENCY}{totalLoss.toLocaleString('en-IN')}
            </div>
          </div>

          <button
            onClick={onOpenAdjustmentModal}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Adjustment / Scrap</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">Filter Reason:</span>
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
          {['all', 'damage_in_transit', 'expiry_disposal', 'physical_audit_correction', 'packaging_defect'].map((r) => (
            <button
              key={r}
              onClick={() => setReasonFilter(r)}
              className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                reasonFilter === r ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600'
              }`}
            >
              {r === 'all' ? 'All Reasons' : r.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Ref Number</th>
                <th className="py-3.5 px-4">Item & Batch</th>
                <th className="py-3.5 px-3">Location</th>
                <th className="py-3.5 px-3">Adjustment Reason</th>
                <th className="py-3.5 px-3 text-center">Adjusted Qty</th>
                <th className="py-3.5 px-3 text-right">Valuation Impact</th>
                <th className="py-3.5 px-3">Approved By</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    No adjustment records logged yet.
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{adj.adjustmentNumber}</td>
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-slate-900">{adj.itemName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {adj.batchNumber ? `Batch: ${adj.batchNumber}` : 'General Stock'}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-600">{adj.locationName}</td>
                    <td className="py-3 px-3 font-sans text-slate-700 capitalize">
                      {adj.reason.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-rose-600">
                      {adj.quantityAdjusted} units
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600">
                      -{CURRENCY}{Math.abs(adj.valuationImpact).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-600">{adj.approvedBy}</td>
                    <td className="py-3 px-4 text-center font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {adj.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
