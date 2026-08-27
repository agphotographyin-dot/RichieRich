import React, { useState } from 'react';
import {
  History,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Clock,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { StockMovementAudit } from '../../../types/warehouse';
import { CURRENCY } from '../../../services/storage';
import { pdfReportService } from '../../../services/pdfReportService';

interface WarehouseAuditTrailViewProps {
  auditTrail: StockMovementAudit[];
  searchQuery: string;
}

export const WarehouseAuditTrailView: React.FC<WarehouseAuditTrailViewProps> = ({
  auditTrail,
  searchQuery,
}) => {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  const filteredAudit = auditTrail.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.itemName.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.referenceNumber.toLowerCase().includes(q) ||
      item.batchNumber?.toLowerCase().includes(q) ||
      item.performedBy.toLowerCase().includes(q) ||
      item.fromLocation.toLowerCase().includes(q) ||
      item.toLocation.toLowerCase().includes(q);

    const matchesType = eventTypeFilter === 'all' || item.eventType === eventTypeFilter;
    return matchesSearch && matchesType;
  });

  const handleExportPDF = () => {
    const logs = filteredAudit.map(a => ({
      timestamp: a.timestamp,
      action: `${a.eventType.toUpperCase()} [${a.referenceNumber}]`,
      entity: `${a.itemName} (${a.sku})`,
      user: `${a.performedBy} (${a.userRole})`,
      details: `${a.quantity} ${a.unit} | From: ${a.fromLocation} -> To: ${a.toLocation} | Val: Rs. ${a.totalValuation}`,
    }));
    pdfReportService.exportAuditTrailPDF(logs);
  };

  const handleExportCSV = () => {
    const headers = 'ID,Timestamp,Event,Item,SKU,Batch,From,To,Qty,Unit,UnitCost,TotalVal,RefNo,User,Role\n';
    const rows = filteredAudit
      .map(
        (a) =>
          `"${a.id}","${a.timestamp}","${a.eventType}","${a.itemName}","${a.sku}","${a.batchNumber || ''}","${a.fromLocation}","${a.toLocation}",${a.quantity},"${a.unit}",${a.unitCost},${a.totalValuation},"${a.referenceNumber}","${a.performedBy}","${a.userRole}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `richie_rich_warehouse_audit_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-5">
      {/* Header & Export Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span>Stock Movement Audit Trail & Compliance Log</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable, timestamped record of every stock inward, store transfer, damage scrap, and POS consumption
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl bg-linear-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Download formatted audit PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF Audit</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Event Filter Pills */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-600">Event Type:</span>
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
          {[
            { key: 'all', label: 'All Events' },
            { key: 'purchase_inward_grn', label: 'Purchase GRN' },
            { key: 'warehouse_to_store_dispatch', label: 'Store Dispatch' },
            { key: 'store_transfer_received', label: 'Store Received' },
            { key: 'stock_adjustment_scrap', label: 'Scrap / Loss' },
            { key: 'pos_sale_consumption', label: 'POS Sale' },
          ].map((ev) => (
            <button
              key={ev.key}
              onClick={() => setEventTypeFilter(ev.key)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                eventTypeFilter === ev.key ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600'
              }`}
            >
              {ev.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-3">Event Type</th>
                <th className="py-3.5 px-4">Item & Batch</th>
                <th className="py-3.5 px-4">Movement Vector</th>
                <th className="py-3.5 px-3 text-center">Quantity</th>
                <th className="py-3.5 px-3 text-right">Value</th>
                <th className="py-3.5 px-3 font-mono">Ref Document</th>
                <th className="py-3.5 px-4 text-right">User & Role</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredAudit.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    No movement records matched your query.
                  </td>
                </tr>
              ) : (
                filteredAudit.map((aud) => (
                  <tr key={aud.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Timestamp */}
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(aud.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Event Type Badge */}
                    <td className="py-3 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        aud.eventType === 'purchase_inward_grn'
                          ? 'bg-emerald-100 text-emerald-800'
                          : aud.eventType === 'warehouse_to_store_dispatch'
                          ? 'bg-amber-100 text-amber-800'
                          : aud.eventType === 'store_transfer_received'
                          ? 'bg-indigo-100 text-indigo-800'
                          : aud.eventType === 'stock_adjustment_scrap'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {aud.eventType.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>

                    {/* Item & Batch */}
                    <td className="py-3 px-4 font-sans">
                      <div className="font-semibold text-slate-900">{aud.itemName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {aud.batchNumber ? `Batch: ${aud.batchNumber}` : `SKU: ${aud.sku}`}
                      </div>
                    </td>

                    {/* Movement Vector (From -> To) */}
                    <td className="py-3 px-4 font-sans text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[100px]">{aud.fromLocation}</span>
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-900 truncate max-w-[100px]">{aud.toLocation}</span>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={aud.quantity < 0 ? 'text-rose-600' : 'text-emerald-600'}>
                        {aud.quantity > 0 ? `+${aud.quantity}` : aud.quantity} {aud.unit}
                      </span>
                    </td>

                    {/* Valuation */}
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      {CURRENCY}{aud.totalValuation.toLocaleString('en-IN')}
                    </td>

                    {/* Ref Document */}
                    <td className="py-3 px-3 font-bold text-indigo-700 font-mono">
                      {aud.referenceNumber}
                    </td>

                    {/* User & Role */}
                    <td className="py-3 px-4 text-right font-sans">
                      <div className="font-medium text-slate-800">{aud.performedBy}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{aud.userRole}</div>
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
