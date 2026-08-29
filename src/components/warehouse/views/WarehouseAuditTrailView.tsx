import React, { useState } from 'react';
import {
  History,
  Search,
  Layers,
  ArrowRight,
  ShieldCheck,
  Clock,
  Download,
  FileSpreadsheet,
  PackagePlus,
  Truck,
  AlertTriangle,
  ShoppingBag,
} from 'lucide-react';
import { StockMovementAudit } from '../../../types/warehouse';
import { CURRENCY } from '../../../services/storage';
import { pdfReportService } from '../../../services/pdfReportService';

interface WarehouseAuditTrailViewProps {
  auditTrail?: StockMovementAudit[];
  searchQuery?: string;
}

export const WarehouseAuditTrailView: React.FC<WarehouseAuditTrailViewProps> = ({
  auditTrail = [],
  searchQuery = '',
}) => {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  const getMovementType = (item: StockMovementAudit): string => {
    return item.movementType || (item as any).eventType || 'physical_adjustment';
  };

  const getTotalValuation = (item: StockMovementAudit): number => {
    if (typeof item.totalCostImpact === 'number' && !isNaN(item.totalCostImpact)) {
      return Math.abs(item.totalCostImpact);
    }
    if (typeof (item as any).totalValuation === 'number' && !isNaN((item as any).totalValuation)) {
      return Math.abs((item as any).totalValuation);
    }
    const qty = Math.abs(Number(item.quantity) || 0);
    const unitCost = Number(item.unitCost) || 0;
    return qty * unitCost;
  };

  const filteredAudit = (auditTrail || []).filter((item) => {
    const q = (searchQuery || '').toLowerCase().trim();
    const type = getMovementType(item);

    const matchesSearch =
      !q ||
      (item.itemName && item.itemName.toLowerCase().includes(q)) ||
      (item.sku && item.sku.toLowerCase().includes(q)) ||
      (item.referenceNumber && item.referenceNumber.toLowerCase().includes(q)) ||
      (item.batchNumber && item.batchNumber.toLowerCase().includes(q)) ||
      (item.performedBy && item.performedBy.toLowerCase().includes(q)) ||
      (item.fromLocation && item.fromLocation.toLowerCase().includes(q)) ||
      (item.toLocation && item.toLocation.toLowerCase().includes(q)) ||
      (item.notes && item.notes.toLowerCase().includes(q));

    let matchesType = true;
    if (eventTypeFilter !== 'all') {
      if (eventTypeFilter === 'purchase_inward') {
        matchesType = type === 'purchase_inward' || type === 'purchase_inward_grn';
      } else if (eventTypeFilter === 'warehouse_transfer_out') {
        matchesType = type === 'warehouse_transfer_out' || type === 'warehouse_to_store_dispatch';
      } else if (eventTypeFilter === 'store_transfer_in') {
        matchesType = type === 'store_transfer_in' || type === 'store_transfer_received';
      } else if (eventTypeFilter === 'damage_scrap') {
        matchesType = type === 'damage_scrap' || type === 'stock_adjustment_scrap';
      } else if (eventTypeFilter === 'pos_sales_consumption') {
        matchesType = type === 'pos_sales_consumption' || type === 'pos_sale_consumption';
      } else if (eventTypeFilter === 'physical_adjustment') {
        matchesType = type === 'physical_adjustment';
      } else {
        matchesType = type === eventTypeFilter;
      }
    }

    return matchesSearch && matchesType;
  });

  const handleExportPDF = () => {
    const logs = filteredAudit.map((a) => {
      const type = getMovementType(a);
      const val = getTotalValuation(a);
      return {
        timestamp: a.timestamp,
        action: `${type.toUpperCase().replace(/_/g, ' ')} [${a.referenceNumber || 'N/A'}]`,
        entity: `${a.itemName || 'Item'} (${a.sku || 'SKU'})`,
        user: `${a.performedBy || 'System'} (${a.userRole || 'Staff'})`,
        details: `${a.quantity || 0} ${a.unit || 'pcs'} | From: ${a.fromLocation || '-'} -> To: ${a.toLocation || '-'} | Val: ${CURRENCY}${val.toLocaleString('en-IN')}`,
      };
    });
    pdfReportService.exportAuditTrailPDF(logs);
  };

  const handleExportCSV = () => {
    const headers = 'ID,Timestamp,MovementType,Item,SKU,Batch,From,To,Qty,Unit,UnitCost,TotalValuation,RefNo,User,Role,Notes\n';
    const rows = filteredAudit
      .map((a) => {
        const type = getMovementType(a);
        const val = getTotalValuation(a);
        return `"${a.id || ''}","${a.timestamp || ''}","${type}","${(a.itemName || '').replace(/"/g, '""')}","${a.sku || ''}","${a.batchNumber || ''}","${(a.fromLocation || '').replace(/"/g, '""')}","${(a.toLocation || '').replace(/"/g, '""')}",${a.quantity || 0},"${a.unit || ''}",${a.unitCost || 0},${val},"${a.referenceNumber || ''}","${(a.performedBy || '').replace(/"/g, '""')}","${a.userRole || ''}","${(a.notes || '').replace(/"/g, '""')}"`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `richie_rich_stock_audit_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'purchase_inward':
      case 'purchase_inward_grn':
        return {
          label: 'PURCHASE GRN',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: PackagePlus,
        };
      case 'warehouse_transfer_out':
      case 'warehouse_to_store_dispatch':
        return {
          label: 'STORE DISPATCH',
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: Truck,
        };
      case 'store_transfer_in':
      case 'store_transfer_received':
        return {
          label: 'STORE RECEIVED',
          bg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          icon: ShieldCheck,
        };
      case 'damage_scrap':
      case 'stock_adjustment_scrap':
        return {
          label: 'SCRAP & LOSS',
          bg: 'bg-rose-100 text-rose-900 border-rose-300',
          icon: AlertTriangle,
        };
      case 'pos_sales_consumption':
      case 'pos_sale_consumption':
        return {
          label: 'POS CONSUMPTION',
          bg: 'bg-purple-100 text-purple-900 border-purple-300',
          icon: ShoppingBag,
        };
      case 'physical_adjustment':
      default:
        return {
          label: 'COUNT ADJUSTMENT',
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: History,
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Export Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-amber-600" />
            <span>Stock Movement Audit Trail & Compliance Log</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable, timestamped ledger of stock inwards, store transfers, damage write-offs, and count reconciliations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Download formatted audit PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF Audit</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer border border-slate-200"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Event Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-slate-600">Event Filter:</span>
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          {[
            { key: 'all', label: 'All Operations' },
            { key: 'purchase_inward', label: 'Purchase GRN' },
            { key: 'warehouse_transfer_out', label: 'Store Dispatch' },
            { key: 'store_transfer_in', label: 'Store Received' },
            { key: 'damage_scrap', label: 'Scrap & Loss' },
            { key: 'physical_adjustment', label: 'Count Adjustment' },
            { key: 'pos_sales_consumption', label: 'POS Sale' },
          ].map((ev) => (
            <button
              type="button"
              key={ev.key}
              onClick={() => setEventTypeFilter(ev.key)}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                eventTypeFilter === ev.key
                  ? 'bg-amber-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {ev.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-3">Operation Type</th>
                <th className="py-3.5 px-4">Item & Batch</th>
                <th className="py-3.5 px-4">Movement Vector</th>
                <th className="py-3.5 px-3 text-center">Quantity</th>
                <th className="py-3.5 px-3 text-right">Value</th>
                <th className="py-3.5 px-3 font-mono">Ref Document</th>
                <th className="py-3.5 px-4 text-right">Authorized By</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredAudit.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <History className="w-5 h-5" />
                      </div>
                      <div className="font-bold text-slate-800 text-sm">No Stock Movements Logged Yet</div>
                      <p className="text-xs text-slate-500">
                        All future stock actions (GRN Inward Bills, Store Transfers, Damage Adjustments, and POS Sales) are automatically registered in this immutable audit ledger.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAudit.map((aud) => {
                  const type = getMovementType(aud);
                  const badge = getEventBadge(type);
                  const BadgeIcon = badge.icon;
                  const totalVal = getTotalValuation(aud);
                  const isPositive = (aud.quantity || 0) > 0;

                  return (
                    <tr key={aud.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {aud.timestamp ? (
                          new Date(aud.timestamp).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        ) : (
                          'Just Now'
                        )}
                      </td>

                      {/* Event Type Badge */}
                      <td className="py-3 px-3 font-sans">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}>
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Item & Batch */}
                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-slate-900">{aud.itemName || 'Inventory Item'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {aud.batchNumber ? `Batch: ${aud.batchNumber}` : `SKU: ${aud.sku || 'N/A'}`}
                        </div>
                      </td>

                      {/* Movement Vector (From -> To) */}
                      <td className="py-3 px-4 font-sans text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[120px] font-medium">{aud.fromLocation || 'Warehouse'}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-bold text-slate-900 truncate max-w-[120px]">{aud.toLocation || 'Store Outlet'}</span>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-3 text-center font-bold font-mono">
                        <span className={isPositive ? 'text-emerald-700' : 'text-rose-700'}>
                          {isPositive ? `+${aud.quantity}` : aud.quantity} {aud.unit || 'pcs'}
                        </span>
                      </td>

                      {/* Valuation */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                        {CURRENCY}{totalVal.toLocaleString('en-IN')}
                      </td>

                      {/* Ref Document */}
                      <td className="py-3 px-3 font-bold text-amber-700 font-mono">
                        {aud.referenceNumber || '-'}
                      </td>

                      {/* User & Role */}
                      <td className="py-3 px-4 text-right font-sans">
                        <div className="font-bold text-slate-800">{aud.performedBy || 'System Admin'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{aud.userRole || 'Warehouse Staff'}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

