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
  IndianRupee,
  ShieldCheck,
  History,
  FileSpreadsheet,
} from 'lucide-react';
import { PurchaseOrder, Supplier, StockMovementAudit, PurchaseBill } from '../../types/warehouse';
import { StoreLocation, InventoryItem } from '../../types';
import { warehouseStorage } from '../../services/warehouseStorage';
import { soundEffects } from '../../services/audio';
import { DocumentManifestModal } from '../common/DocumentManifestModal';
import { CreateDirectStorePOModal } from './CreateDirectStorePOModal';
import { ReceiveDirectStoreGoodsModal } from './ReceiveDirectStoreGoodsModal';

interface DirectStorePurchasesViewProps {
  currentStore: StoreLocation;
  inventory: InventoryItem[];
  adminName?: string;
  onRefresh: () => void;
  onOpenCreatePO?: (preselectedItem?: InventoryItem | null) => void;
}

export const DirectStorePurchasesView: React.FC<DirectStorePurchasesViewProps> = ({
  currentStore,
  inventory,
  adminName,
  onRefresh,
}) => {
  const [subViewTab, setSubViewTab] = useState<'purchase_orders' | 'inward_bills' | 'audit_trail'>('purchase_orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [expandedPOId, setExpandedPOId] = useState<string | null>(null);

  // Modals state
  const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedPOForReceive, setSelectedPOForReceive] = useState<PurchaseOrder | null>(null);
  const [selectedPOForManifest, setSelectedPOForManifest] = useState<PurchaseOrder | null>(null);

  // Fetch all POs for this store
  const storePOs = useMemo(() => {
    return warehouseStorage.getDirectStorePOs(currentStore.id);
  }, [currentStore.id]);

  // Fetch all Inward Bills for this store
  const storeInwardBills = useMemo(() => {
    return warehouseStorage.getDirectStoreInwardBills(currentStore.id);
  }, [currentStore.id]);

  // Fetch Store Stock Audit Trail
  const storeAuditTrail = useMemo(() => {
    const all = warehouseStorage.getAuditTrail();
    return all.filter(
      (a) =>
        a.toLocation.includes(currentStore.name) ||
        a.fromLocation.includes(currentStore.name) ||
        a.source === 'Direct Supplier Purchase' ||
        a.movementType === 'direct_store_purchase'
    );
  }, [currentStore.name]);

  const suppliers = useMemo(() => warehouseStorage.getSuppliers(), []);

  // Filtered POs
  const filteredPOs = useMemo(() => {
    return storePOs.filter((po) => {
      if (statusFilter !== 'all' && po.status !== statusFilter) return false;
      if (supplierFilter !== 'all' && po.supplierId !== supplierFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesPO = po.poNumber.toLowerCase().includes(q);
        const matchesSup = po.supplierName.toLowerCase().includes(q);
        const matchesItems = po.items.some(
          (it) => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q)
        );
        return matchesPO || matchesSup || matchesItems;
      }
      return true;
    });
  }, [storePOs, statusFilter, supplierFilter, searchTerm]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalPOs = storePOs.length;
    const sentCount = storePOs.filter((p) => p.status === 'sent_to_supplier').length;
    const partiallyReceivedCount = storePOs.filter((p) => p.status === 'partially_received').length;
    const receivedCount = storePOs.filter((p) => p.status === 'received').length;
    const totalSpend = storePOs.reduce((sum, p) => sum + p.grandTotal, 0);

    return {
      totalPOs,
      sentCount,
      partiallyReceivedCount,
      receivedCount,
      totalSpend,
    };
  }, [storePOs]);

  const handleOpenReceive = (po: PurchaseOrder) => {
    soundEffects.playClick();
    setSelectedPOForReceive(po);
    setIsReceiveModalOpen(true);
  };

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'sent_to_supplier':
        return {
          label: 'Sent to Supplier (Pending Delivery)',
          color: 'bg-amber-50 text-amber-900 border-amber-300 font-black',
          icon: Truck,
        };
      case 'partially_received':
        return {
          label: 'Partially Received (Awaiting Balance)',
          color: 'bg-blue-50 text-blue-900 border-blue-300 font-black',
          icon: Clock,
        };
      case 'received':
        return {
          label: 'Fully Received in Stock',
          color: 'bg-emerald-50 text-emerald-900 border-emerald-300 font-black',
          icon: CheckCircle2,
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          color: 'bg-red-50 text-red-900 border-red-300',
          icon: XCircle,
        };
      default:
        return {
          label: status.toUpperCase(),
          color: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: FileText,
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#1E293B] to-slate-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Manage Stock: Direct Store Purchasing</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    Store ➔ Supplier
                  </span>
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Order stock directly from approved suppliers for <strong>{currentStore.name}</strong> • Synchronized in real-time with Warehouse records
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                soundEffects.playClick();
                setSelectedPOForReceive(null);
                setIsReceiveModalOpen(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Direct Receive Goods</span>
            </button>

            <button
              onClick={() => {
                soundEffects.playClick();
                setIsCreatePOOpen(true);
              }}
              className="px-4.5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </button>
          </div>
        </div>

        {/* 4 Scorecards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-800/60 backdrop-blur-xs rounded-2xl p-3.5 border border-slate-700/60">
            <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
              Total Direct POs
            </span>
            <span className="text-2xl font-black font-mono text-white mt-1 block">
              {metrics.totalPOs}
            </span>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs rounded-2xl p-3.5 border border-slate-700/60">
            <span className="text-[11px] font-bold text-amber-300 block uppercase tracking-wider">
              Active / In-Transit POs
            </span>
            <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
              {metrics.sentCount}
            </span>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs rounded-2xl p-3.5 border border-slate-700/60">
            <span className="text-[11px] font-bold text-blue-300 block uppercase tracking-wider">
              Partially Received
            </span>
            <span className="text-2xl font-black font-mono text-blue-400 mt-1 block">
              {metrics.partiallyReceivedCount}
            </span>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-xs rounded-2xl p-3.5 border border-slate-700/60">
            <span className="text-[11px] font-bold text-emerald-300 block uppercase tracking-wider">
              Direct Spend (PO Value)
            </span>
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1 block">
              ₹{metrics.totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setSubViewTab('purchase_orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            subViewTab === 'purchase_orders'
              ? 'bg-[#1E293B] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-3.5 h-3.5 text-amber-400" />
          <span>Direct Purchase Orders ({storePOs.length})</span>
        </button>

        <button
          onClick={() => setSubViewTab('inward_bills')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            subViewTab === 'inward_bills'
              ? 'bg-[#1E293B] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
          <span>Goods Inward Bills ({storeInwardBills.length})</span>
        </button>

        <button
          onClick={() => setSubViewTab('audit_trail')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
            subViewTab === 'audit_trail'
              ? 'bg-[#1E293B] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5 text-amber-400" />
          <span>Direct Stock Audit Trail</span>
        </button>
      </div>

      {/* TAB 1: PURCHASE ORDERS */}
      {subViewTab === 'purchase_orders' && (
        <div className="space-y-4">
          {/* Filters and Search */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search PO by #, supplier name, or product SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="sent_to_supplier">Sent to Supplier</option>
                <option value="partially_received">Partially Received</option>
                <option value="received">Fully Received</option>
              </select>

              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PO List */}
          {filteredPOs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto mb-3">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="font-black text-slate-900 text-base">No Direct Purchase Orders Found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                You have not placed any direct purchase orders from this store yet, or no orders match your search filters.
              </p>
              <button
                onClick={() => setIsCreatePOOpen(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Direct Store PO</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredPOs.map((po) => {
                const isExpanded = expandedPOId === po.id;
                const statusInfo = getStatusBadge(po.status);
                const StatusIcon = statusInfo.icon;

                const totalOrdered = po.items.reduce((s, i) => s + i.quantityOrdered, 0);
                const totalReceived = po.items.reduce((s, i) => s + (i.quantityReceived || 0), 0);
                const progressPercent = totalOrdered > 0 ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100)) : 0;
                const canReceive = po.status === 'sent_to_supplier' || po.status === 'partially_received' || po.status === 'approved';

                return (
                  <div
                    key={po.id}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all space-y-4"
                  >
                    {/* PO Header Row */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0 border border-slate-200">
                          <Truck className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-black text-slate-900 text-sm sm:text-base">
                              {po.poNumber}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] border flex items-center gap-1 ${statusInfo.color}`}
                            >
                              <StatusIcon className="w-3.5 h-3.5" />
                              <span>{statusInfo.label}</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 text-[10px] font-bold border border-amber-200">
                              Direct PO
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                            <span>Supplier: <strong className="text-slate-900">{po.supplierName}</strong></span>
                            <span>•</span>
                            <span>Order Date: <strong>{po.orderDate}</strong></span>
                            <span>•</span>
                            <span>Exp. Delivery: <strong>{po.expectedDeliveryDate}</strong></span>
                            <span>•</span>
                            <span>By: {po.createdByName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Total & Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-right pr-2">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">
                            PO Grand Total
                          </span>
                          <span className="font-mono font-black text-slate-900 text-base">
                            ₹{po.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {canReceive && (
                          <button
                            onClick={() => handleOpenReceive(po)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <PackageCheck className="w-4 h-4" />
                            <span>Receive / Inward Stock</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            soundEffects.playClick();
                            setSelectedPOForManifest(po);
                          }}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 cursor-pointer border border-slate-200"
                          title="View Manifest & Print PO"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print PO</span>
                        </button>

                        <button
                          onClick={() => setExpandedPOId(isExpanded ? null : po.id)}
                          className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Delivery Progress Bar */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                          <span>Delivery Fulfillment Progress:</span>
                          <span className="font-mono">{totalReceived} / {totalOrdered} Boxes Received ({progressPercent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              progressPercent >= 100
                                ? 'bg-emerald-500'
                                : progressPercent > 0
                                ? 'bg-blue-500'
                                : 'bg-amber-400'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600 shrink-0">
                        <span>Items: <strong className="text-slate-900">{po.items.length} Products</strong></span>
                        <span>•</span>
                        <span>Terms: <strong className="text-slate-900">{po.paymentTerms}</strong></span>
                      </div>
                    </div>

                    {/* Expanded Items Table */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-100 animate-in fade-in">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                          Ordered Product Line Items:
                        </h4>
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="py-2.5 px-3">Product Name & SKU</th>
                                <th className="py-2.5 px-3">Ordered Qty</th>
                                <th className="py-2.5 px-3">Received Qty</th>
                                <th className="py-2.5 px-3">Pending Qty</th>
                                <th className="py-2.5 px-3">Unit Price (₹)</th>
                                <th className="py-2.5 px-3 text-right">Line Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                              {po.items.map((it) => {
                                const received = it.quantityReceived || 0;
                                const pending = Math.max(0, it.quantityOrdered - received);
                                return (
                                  <tr key={it.itemId} className="hover:bg-slate-50/50">
                                    <td className="py-2.5 px-3">
                                      <div className="font-bold text-slate-900">{it.name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        SKU: {it.sku} • Category: {it.category}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-bold">
                                      {it.quantityOrdered} {it.unit || 'boxes'}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                                      {received} {it.unit || 'boxes'}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-amber-700">
                                      {pending} {it.unit || 'boxes'}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono">
                                      ₹{it.unitPrice.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-right text-slate-900">
                                      ₹{it.totalAmount.toFixed(2)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {po.notes && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl mt-2 border border-slate-200">
                            <strong>Order Notes:</strong> {po.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GOODS INWARD BILLS */}
      {subViewTab === 'inward_bills' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Verified Stock Inward Bills received at {currentStore.name} ({storeInwardBills.length} Inward Records)
            </span>
            <button
              onClick={() => {
                soundEffects.playClick();
                setSelectedPOForReceive(null);
                setIsReceiveModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Inward New Goods Delivery</span>
            </button>
          </div>

          {storeInwardBills.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 text-xs">
              No goods inward bills recorded for this store yet.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Bill Number & Date</th>
                    <th className="py-3 px-4">Supplier & Invoice Ref</th>
                    <th className="py-3 px-4">PO Reference</th>
                    <th className="py-3 px-4">Items Inwarded</th>
                    <th className="py-3 px-4">Received By</th>
                    <th className="py-3 px-4 text-right">Inward Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {storeInwardBills.map((bill) => {
                    const totalItemsCount = bill.items.reduce((s, i) => s + i.quantity, 0);
                    return (
                      <tr key={bill.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-slate-900">{bill.billNumber}</div>
                          <div className="text-[10px] text-slate-400">{bill.billDate}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{bill.supplierName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Inv #: {bill.supplierInvoiceNo}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {bill.poNumber || 'Direct Purchase'}
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-700">
                          +{totalItemsCount} {bill.items[0]?.unit || 'boxes'} ({bill.items.length} SKUs)
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {bill.receivedBy}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                          ₹{bill.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DIRECT STOCK AUDIT TRAIL */}
      {subViewTab === 'audit_trail' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Direct Store Stock Transactions & Audit Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Every direct store procurement, PO creation, and goods inwarding is recorded immutably with exact stock before & after levels.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Timestamp & Txn ID</th>
                    <th className="py-3 px-4">Product Name & SKU</th>
                    <th className="py-3 px-4">Source & Movement</th>
                    <th className="py-3 px-4">PO / Inv Ref</th>
                    <th className="py-3 px-4 text-center">Store Stock Impact</th>
                    <th className="py-3 px-4">Verified By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {storeAuditTrail.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        No direct stock movements recorded yet.
                      </td>
                    </tr>
                  ) : (
                    storeAuditTrail.slice(0, 30).map((rec) => {
                      const isAddition = (rec.quantityChanged || rec.quantity) > 0;
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4">
                            <div className="font-mono text-[11px] text-slate-900">
                              {new Date(rec.timestamp).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {rec.transactionId || rec.referenceNumber}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{rec.itemName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              SKU: {rec.sku} • {rec.batchNumber || 'Batch N/A'}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-900 border border-emerald-200">
                              {rec.source || 'Direct Supplier Purchase'}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {rec.fromLocation} ➔ {rec.toLocation}
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            {rec.purchaseOrderId || rec.referenceNumber}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="font-mono font-bold text-emerald-700">
                              +{rec.quantity} {rec.unit}
                            </div>
                            {rec.previousStock !== undefined && rec.newStock !== undefined && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                Prev: {rec.previousStock} ➔ New: {rec.newStock}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{rec.performedBy}</div>
                            <div className="text-[10px] text-slate-400">{rec.userRole}</div>
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
      )}

      {/* MODAL 1: CREATE DIRECT PO */}
      <CreateDirectStorePOModal
        isOpen={isCreatePOOpen}
        onClose={() => setIsCreatePOOpen(false)}
        currentStore={currentStore}
        inventory={inventory}
        adminName={adminName}
        onSuccess={() => {
          onRefresh();
        }}
      />

      {/* MODAL 2: RECEIVE DIRECT STORE GOODS */}
      <ReceiveDirectStoreGoodsModal
        isOpen={isReceiveModalOpen}
        onClose={() => {
          setIsReceiveModalOpen(false);
          setSelectedPOForReceive(null);
        }}
        currentStore={currentStore}
        inventory={inventory}
        adminName={adminName}
        preselectedPO={selectedPOForReceive}
        onSuccess={() => {
          onRefresh();
        }}
      />

      {/* MODAL 3: DOCUMENT MANIFEST MODAL (PRINT PO) */}
      {selectedPOForManifest && (
        <DocumentManifestModal
          isOpen={!!selectedPOForManifest}
          onClose={() => setSelectedPOForManifest(null)}
          documentType="purchase_order"
          documentData={selectedPOForManifest}
        />
      )}
    </div>
  );
};
