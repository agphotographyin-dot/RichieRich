import React, { useState } from 'react';
import {
  Truck,
  ArrowRightLeft,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Search,
  Plus,
  ShieldCheck,
  Building2,
  Store,
  ChevronRight,
  PackageCheck,
  Check,
  X,
  Sparkles,
  FileText,
  Printer,
} from 'lucide-react';
import { StockTransfer, StoreStockIndent, Warehouse } from '../../../types/warehouse';
import { StoreLocation } from '../../../types';
import { CURRENCY } from '../../../services/storage';
import { warehouseStorage } from '../../../services/warehouseStorage';
import { DocumentManifestModal, ManifestDocumentType } from '../../common/DocumentManifestModal';

interface WarehouseTransfersViewProps {
  transfers: StockTransfer[];
  indents: StoreStockIndent[];
  warehouses: Warehouse[];
  stores: StoreLocation[];
  searchQuery: string;
  onOpenTransferModal: () => void;
  onOpenIndentModal: () => void;
  onOpenReceiveModal: (transfer: StockTransfer) => void;
}

export const WarehouseTransfersView: React.FC<WarehouseTransfersViewProps> = ({
  transfers,
  indents,
  warehouses,
  stores,
  searchQuery,
  onOpenTransferModal,
  onOpenIndentModal,
  onOpenReceiveModal,
}) => {
  const [subTab, setSubTab] = useState<'transfers' | 'returns' | 'indents'>('transfers');
  const [manifestDoc, setManifestDoc] = useState<{
    isOpen: boolean;
    type: ManifestDocumentType;
    data: any;
  }>({
    isOpen: false,
    type: 'stock_transfer',
    data: null,
  });

  // Filter transfers
  const filteredTransfers = transfers.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      t.transferNumber.toLowerCase().includes(q) ||
      t.sourceName.toLowerCase().includes(q) ||
      t.destinationName.toLowerCase().includes(q) ||
      t.vehicleNumber?.toLowerCase().includes(q);

    if (subTab === 'transfers') return matchesSearch && t.type === 'warehouse_to_store';
    if (subTab === 'returns') return matchesSearch && t.type === 'store_to_warehouse_return';
    return matchesSearch;
  });

  const filteredIndents = indents.filter((ind) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      ind.indentNumber.toLowerCase().includes(q) ||
      ind.storeName.toLowerCase().includes(q) ||
      ind.requestedBy.toLowerCase().includes(q)
    );
  });

  const handleApproveIndent = (indentId: string) => {
    if (confirm('Approve store indent request and automatically create a Warehouse Dispatch Transfer?')) {
      warehouseStorage.approveStoreIndent(indentId);
      alert('Indent approved and converted to an active Transfer Order!');
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation & Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setSubTab('transfers')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              subTab === 'transfers' ? 'bg-white shadow-xs text-indigo-950 font-bold' : 'text-slate-600'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-amber-600" />
            <span>Warehouse ➔ Store Transfers ({transfers.filter((t) => t.type === 'warehouse_to_store').length})</span>
          </button>

          <button
            onClick={() => setSubTab('returns')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              subTab === 'returns' ? 'bg-white shadow-xs text-indigo-950 font-bold' : 'text-slate-600'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Store ➔ WH Returns ({transfers.filter((t) => t.type === 'store_to_warehouse_return').length})</span>
          </button>

          <button
            onClick={() => setSubTab('indents')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              subTab === 'indents' ? 'bg-white shadow-xs text-indigo-950 font-bold' : 'text-slate-600'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-cyan-600" />
            <span>Store Indent Requests ({indents.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {subTab === 'indents' ? (
            <button
              onClick={onOpenIndentModal}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Raise Store Indent</span>
            </button>
          ) : (
            <button
              onClick={onOpenTransferModal}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create {subTab === 'returns' ? 'Store Return' : 'Stock Transfer'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Transfers / Returns Table */}
      {subTab !== 'indents' ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Transfer Ref</th>
                  <th className="py-3.5 px-4">Route (Source ➔ Destination)</th>
                  <th className="py-3.5 px-3">Vehicle & Carrier</th>
                  <th className="py-3.5 px-3 text-center">Items Count</th>
                  <th className="py-3.5 px-3 text-right">Transfer Value</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Verification & Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                      No stock transfers found in this category.
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((tr) => (
                    <tr key={tr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{tr.transferNumber}</div>
                        <div className="text-[10px] text-slate-400 font-sans">Req: {tr.requestedDate}</div>
                      </td>

                      <td className="py-3 px-4 font-sans">
                        <div className="font-medium text-slate-900">{tr.sourceName}</div>
                        <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold mt-0.5">
                          <span>➔</span>
                          <span>{tr.destinationName}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-sans text-slate-600">
                        <div>{tr.vehicleNumber || 'Internal Courier'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{tr.carrierName}</div>
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-slate-900 font-sans">
                        {tr.items.length} SKUs
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-slate-900">
                        {CURRENCY}{tr.totalValuation.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-3 text-center font-sans">
                        {tr.status === 'dispatched_in_transit' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                            IN TRANSIT (OTP: {tr.otpOrPin})
                          </span>
                        ) : tr.status === 'completed' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            COMPLETED
                          </span>
                        ) : tr.status === 'partially_received' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                            PARTIAL RECEIVED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {tr.status.toUpperCase()}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setManifestDoc({ isOpen: true, type: 'stock_transfer', data: tr })}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer border border-slate-200"
                            title="View / Print Transfer Delivery Challan & Gate Pass"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Challan</span>
                          </button>
                          {tr.status === 'dispatched_in_transit' && (
                            <button
                              onClick={() => onOpenReceiveModal(tr)}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                            >
                              Receive at Store
                            </button>
                          )}
                          {tr.status === 'completed' && (
                            <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Received</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Store Indent Requests Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Indent Number</th>
                  <th className="py-3.5 px-4">Requesting Store</th>
                  <th className="py-3.5 px-3">Urgency Level</th>
                  <th className="py-3.5 px-4">Requested Items</th>
                  <th className="py-3.5 px-3">Date & Manager</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Approval Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredIndents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No pending store indent requests.
                    </td>
                  </tr>
                ) : (
                  filteredIndents.map((ind) => (
                    <tr key={ind.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {ind.indentNumber}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{ind.storeName}</div>
                        <div className="text-[11px] text-slate-500">Target WH: {ind.targetWarehouseName}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ind.urgency === 'urgent_low_stock'
                            ? 'bg-rose-100 text-rose-800'
                            : ind.urgency === 'emergency_event'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {ind.urgency.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {ind.items.map((i, idx) => (
                            <div key={idx} className="text-slate-700">
                              • {i.name}: <strong className="text-indigo-700 font-mono">{i.requestedQty} {i.unit}</strong>
                              <span className="text-[10px] text-slate-400 ml-1">(Store Stock: {i.currentStoreStock})</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        <div>{ind.requestDate}</div>
                        <div className="text-[11px] text-slate-400">{ind.requestedBy}</div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ind.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : ind.status === 'converted_to_transfer'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {ind.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setManifestDoc({ isOpen: true, type: 'store_indent', data: ind })}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer border border-slate-200"
                            title="View / Print Indent Requisition Slip"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Slip</span>
                          </button>
                          {ind.status === 'pending' && (
                            <button
                              onClick={() => handleApproveIndent(ind.id)}
                              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
                            >
                              Approve & Transfer
                            </button>
                          )}
                          {ind.status === 'converted_to_transfer' && (
                            <span className="text-xs text-emerald-600 font-medium">Dispatched</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Manifest / Delivery Challan Modal */}
      <DocumentManifestModal
        isOpen={manifestDoc.isOpen}
        onClose={() => setManifestDoc({ ...manifestDoc, isOpen: false })}
        documentType={manifestDoc.type}
        documentData={manifestDoc.data}
      />
    </div>
  );
};
