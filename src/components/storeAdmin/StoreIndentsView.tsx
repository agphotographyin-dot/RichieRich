import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Truck,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  FileText,
  Printer,
  XCircle,
  Eye,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  PackageCheck,
} from 'lucide-react';
import { StoreStockIndent, StockTransfer } from '../../types/warehouse';
import { StoreLocation, InventoryItem } from '../../types';
import { warehouseStorage } from '../../services/warehouseStorage';
import { soundEffects } from '../../services/audio';
import { DocumentManifestModal } from '../common/DocumentManifestModal';
import { StoreReceiveTransferModal } from './StoreReceiveTransferModal';

interface StoreIndentsViewProps {
  currentStore: StoreLocation;
  inventory: InventoryItem[];
  onOpenCreateIndent: (preselectedItem?: InventoryItem | null) => void;
  onRefresh: () => void;
  adminName?: string;
}

export const StoreIndentsView: React.FC<StoreIndentsViewProps> = ({
  currentStore,
  inventory,
  onOpenCreateIndent,
  onRefresh,
  adminName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [selectedIndentForManifest, setSelectedIndentForManifest] = useState<StoreStockIndent | null>(
    null
  );
  const [selectedTransferForReceive, setSelectedTransferForReceive] = useState<StockTransfer | null>(
    null
  );
  const [expandedIndentId, setExpandedIndentId] = useState<string | null>(null);

  // Fetch all indents for this store
  const allIndents: StoreStockIndent[] = useMemo(() => {
    const list = warehouseStorage.getStoreIndents();
    return list.filter((ind) => ind.storeId === currentStore.id);
  }, [currentStore.id]);

  // Fetch incoming stock transfers from warehouse for this store
  const incomingTransfers: StockTransfer[] = useMemo(() => {
    const list = warehouseStorage.getStockTransfers();
    return list.filter(
      (t) =>
        t.destinationId === currentStore.id &&
        (t.type === 'warehouse_to_store' || t.destinationType === 'store')
    );
  }, [currentStore.id]);

  // Filtered indents
  const filteredIndents = useMemo(() => {
    return allIndents.filter((ind) => {
      // Status filter
      if (statusFilter !== 'all' && ind.status !== statusFilter) {
        return false;
      }
      // Urgency filter
      if (urgencyFilter !== 'all' && ind.urgency !== urgencyFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesRef = ind.indentNumber.toLowerCase().includes(q);
        const matchesWh = ind.targetWarehouseName.toLowerCase().includes(q);
        const matchesRequester = ind.requestedBy.toLowerCase().includes(q);
        const matchesItems = ind.items.some(
          (it) => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q)
        );
        return matchesRef || matchesWh || matchesRequester || matchesItems;
      }
      return true;
    });
  }, [allIndents, statusFilter, urgencyFilter, searchTerm]);

  // Summary Metrics
  const stats = useMemo(() => {
    const total = allIndents.length;
    const pending = allIndents.filter((i) => i.status === 'pending').length;
    const approved = allIndents.filter(
      (i) => i.status === 'approved' || i.status === 'converted_to_transfer'
    ).length;
    const totalUnits = allIndents.reduce(
      (sum, ind) => sum + ind.items.reduce((s, it) => s + (Number(it.requestedQty) || 0), 0),
      0
    );
    return { total, pending, approved, totalUnits };
  }, [allIndents]);

  const handleCancelIndent = (indent: StoreStockIndent) => {
    if (
      !confirm(
        `Are you sure you want to cancel indent requisition ${indent.indentNumber}? This action cannot be undone.`
      )
    ) {
      return;
    }
    warehouseStorage.cancelStoreIndent(indent.id);
    soundEffects.playWarningChime();
    onRefresh();
  };

  const getUrgencyBadge = (urgency: StoreStockIndent['urgency']) => {
    switch (urgency) {
      case 'emergency_event':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
            <Flame className="w-3 h-3 text-rose-600" />
            Emergency
          </span>
        );
      case 'urgent_low_stock':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-700" />
            Urgent Low Stock
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Routine
          </span>
        );
    }
  };

  const getStatusBadge = (status: StoreStockIndent['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Pending Approval
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-300">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            Approved by Warehouse
          </span>
        );
      case 'converted_to_transfer':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs">
            <Truck className="w-3 h-3 text-emerald-600" />
            Dispatched (Transfer Created)
          </span>
        );
      case 'declined':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <XCircle className="w-3 h-3 text-slate-500" />
            Declined / Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-600 shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Store Inventory Indents
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                Warehouse Replenishment
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Order fresh stock directly from Richie Rich Central Warehouse hubs for{' '}
              <strong className="text-slate-800">{currentStore.name}</strong>. Requisitions are
              approved and converted into warehouse dispatch transfers automatically.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => onOpenCreateIndent()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Order Stock from Warehouse</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Total Indents Raised
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Lifetime store requisitions</div>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-xs bg-amber-50/30">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Pending Approvals
          </div>
          <div className="text-2xl font-black text-amber-900 mt-1 font-mono">{stats.pending}</div>
          <div className="text-[10px] text-amber-700 mt-0.5">Awaiting Central Hub review</div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs bg-emerald-50/30">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
            Dispatched & Converted
          </div>
          <div className="text-2xl font-black text-emerald-900 mt-1 font-mono">{stats.approved}</div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Approved as stock transfers</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Total Ordered Units
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{stats.totalUnits}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Units requisitioned from warehouse</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by indent ref (IND-2026-...), product name, SKU, or warehouse..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="converted_to_transfer">Dispatched (Transfer)</option>
            <option value="declined">Declined / Cancelled</option>
          </select>

          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Urgencies</option>
            <option value="routine">Routine</option>
            <option value="urgent_low_stock">Urgent Low Stock</option>
            <option value="emergency_event">Emergency</option>
          </select>

          <button
            type="button"
            onClick={onRefresh}
            title="Refresh list"
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Indents List / Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Requisition History ({filteredIndents.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">
            Target: Central Warehouse Hubs Only
          </span>
        </div>

        {filteredIndents.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <div className="text-sm font-bold text-slate-700">No Indents Found</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all' || urgencyFilter !== 'all'
                ? 'No requisition matches the selected filters.'
                : 'No stock indents have been raised yet for this store outlet. You can order any inventory products directly from the Central Warehouse.'}
            </p>
            <button
              type="button"
              onClick={() => onOpenCreateIndent()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Raise First Stock Indent</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredIndents.map((indent) => {
              const isExpanded = expandedIndentId === indent.id;
              const totalItemsCount = indent.items.reduce(
                (sum, it) => sum + (Number(it.requestedQty) || 0),
                0
              );

              return (
                <div key={indent.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* Primary Info */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-black text-slate-900 text-sm">
                          {indent.indentNumber}
                        </span>
                        {getStatusBadge(indent.status)}
                        {getUrgencyBadge(indent.urgency)}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <strong className="text-slate-800">{indent.targetWarehouseName}</strong>
                        </span>
                        <span>•</span>
                        <span className="text-slate-500">
                          Date: <strong className="text-slate-700">{indent.requestDate}</strong>
                        </span>
                        <span>•</span>
                        <span className="text-slate-500">
                          By: <strong className="text-slate-700">{indent.requestedBy}</strong>
                        </span>
                      </div>

                      {indent.notes && (
                        <div className="text-[11px] text-slate-500 italic bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 inline-block mt-1">
                          "{indent.notes}"
                        </div>
                      )}
                    </div>

                    {/* Quantity & Actions */}
                    <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div className="text-right mr-2">
                        <div className="text-xs font-black text-slate-900 font-mono">
                          {indent.items.length} Products
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {totalItemsCount} Total Units
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedIndentId(isExpanded ? null : indent.id)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Items</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedIndentForManifest(indent)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Manifest / Voucher</span>
                      </button>

                      {indent.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleCancelIndent(indent)}
                          className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Cancel pending indent"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Line Items View */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-200 bg-slate-50/80 rounded-2xl p-3.5 space-y-2 animate-in fade-in duration-100">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Line Items Breakdown
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {indent.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs space-y-1"
                          >
                            <div className="font-bold text-xs text-slate-900 truncate">
                              {item.name}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                              <span>SKU: {item.sku}</span>
                              <span className="font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                Req: {item.requestedQty} {item.unit}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Incoming Transfers from Warehouse Section */}
      {incomingTransfers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/40">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                Incoming Warehouse Stock Dispatches ({incomingTransfers.length})
              </h3>
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold">
              Live Stock Deliveries to {currentStore.name}
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {incomingTransfers.map((transfer) => (
              <div
                key={transfer.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-900">
                      {transfer.transferNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        transfer.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : transfer.status === 'dispatched_in_transit'
                          ? 'bg-blue-100 text-blue-800 animate-pulse'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {transfer.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    From: <strong>{transfer.sourceName}</strong> • Date: {transfer.requestedDate} •{' '}
                    {transfer.items.length} Products
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-800 block">
                      {transfer.items.reduce((s, it) => s + (it.dispatchedQty || it.requestedQty), 0)}{' '}
                      Units
                    </span>
                    {transfer.vehicleNumber && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        Vehicle: {transfer.vehicleNumber}
                      </span>
                    )}
                  </div>

                  {transfer.status === 'dispatched_in_transit' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTransferForReceive(transfer);
                        soundEffects.playClick();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Receive & Inward</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Manifest Modal */}
      {selectedIndentForManifest && (
        <DocumentManifestModal
          isOpen={true}
          onClose={() => setSelectedIndentForManifest(null)}
          documentType="store_indent"
          documentData={selectedIndentForManifest}
        />
      )}

      {/* Store Receive Transfer Modal */}
      {selectedTransferForReceive && (
        <StoreReceiveTransferModal
          isOpen={true}
          onClose={() => setSelectedTransferForReceive(null)}
          transfer={selectedTransferForReceive}
          currentStore={currentStore}
          adminName={adminName}
          onSuccess={() => {
            onRefresh();
            setSelectedTransferForReceive(null);
          }}
        />
      )}
    </div>
  );
};
