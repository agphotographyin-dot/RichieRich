import React, { useState } from 'react';
import {
  Boxes,
  Truck,
  Building2,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  PackagePlus,
  ArrowRight,
  Layers,
  Store,
  DollarSign,
  Receipt,
  RotateCcw,
  PlusCircle,
} from 'lucide-react';
import {
  Warehouse,
  Supplier,
  PurchaseOrder,
  PurchaseBill,
  BatchRecord,
  StockTransfer,
  StoreStockIndent,
  StockAdjustment,
  StockMovementAudit,
  WarehouseOverviewStats,
  WarehouseTab,
} from '../../../types/warehouse';
import { InventoryItem, StoreLocation } from '../../../types';
import { CURRENCY } from '../../../services/storage';

interface WarehouseDashboardViewProps {
  stats: WarehouseOverviewStats;
  warehouses: Warehouse[];
  stores: StoreLocation[];
  inventory: InventoryItem[];
  batches: BatchRecord[];
  transfers: StockTransfer[];
  indents: StoreStockIndent[];
  bills: PurchaseBill[];
  auditTrail: StockMovementAudit[];
  onNavigateTab: (tab: WarehouseTab) => void;
  onOpenNewPO: () => void;
  onOpenInwardBill: () => void;
  onOpenTransfer: () => void;
  onOpenIndent: () => void;
  onOpenAdjustment: () => void;
}

export const WarehouseDashboardView: React.FC<WarehouseDashboardViewProps> = ({
  stats,
  warehouses,
  stores,
  inventory,
  batches,
  transfers,
  indents,
  bills,
  auditTrail,
  onNavigateTab,
  onOpenNewPO,
  onOpenInwardBill,
  onOpenTransfer,
  onOpenIndent,
  onOpenAdjustment,
}) => {
  const [valuationMode, setValuationMode] = useState<'fifo' | 'avg'>('fifo');

  const nearExpiryBatches = batches.filter((b) => b.status === 'near_expiry' && b.quantityInStock > 0);
  const criticalStockItems = inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold);
  const activeInTransitTransfers = transfers.filter((t) => t.status === 'dispatched_in_transit');

  return (
    <div className="space-y-6">
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Inventory Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Stock Valuation
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold text-slate-600">
              <button
                onClick={() => setValuationMode('fifo')}
                className={`px-1.5 py-0.5 rounded ${valuationMode === 'fifo' ? 'bg-white shadow-xs text-indigo-700 font-bold' : ''}`}
              >
                FIFO
              </button>
              <button
                onClick={() => setValuationMode('avg')}
                className={`px-1.5 py-0.5 rounded ${valuationMode === 'avg' ? 'bg-white shadow-xs text-indigo-700 font-bold' : ''}`}
              >
                AVG
              </button>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {CURRENCY}
              {(valuationMode === 'fifo' ? stats.totalInventoryValuationFIFO : stats.totalInventoryValuationAvg).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span className="font-medium text-emerald-600">
                {stats.centralWarehouseStockUnits + stats.storesTotalStockUnits + stats.inTransitStockUnits} Total Units
              </span>
              <span>•</span>
              <span className="text-[11px]">{valuationMode === 'fifo' ? 'Batch Landed Cost' : 'Weighted Avg'}</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Central vs Stores vs Transit Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Multi-Hub Distribution</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-600">Central Warehouses:</span>
              <span className="font-bold text-slate-900">{stats.centralWarehouseStockUnits} units</span>
            </div>
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-600">Active Stores (4 Outlets):</span>
              <span className="font-bold text-slate-900">{stats.storesTotalStockUnits} units</span>
            </div>
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-amber-700 flex items-center gap-1">
                <Truck className="w-3 h-3" /> In Transit:
              </span>
              <span className="font-bold text-amber-700 font-mono">{stats.inTransitStockUnits} units</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Stock Health & Expiry Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Stock Health Status</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Low Stock SKUs:</span>
              <span className="font-bold text-amber-600 font-mono">{stats.lowStockItemsCount} items</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Critical (&lt;20%):</span>
              <span className="font-bold text-rose-600 font-mono">{stats.criticalStockItemsCount} items</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Near Expiry Batches:</span>
              <span className="font-bold text-purple-600 font-mono">{stats.nearExpiryBatchesCount} batches</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Supplier Payables & Pending Actions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>Supplier Payables</span>
            <FileSpreadsheet className="w-4 h-4 text-violet-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight text-rose-600">
              {CURRENCY}
              {stats.totalSupplierOutstanding.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span>{stats.overdueBillsCount} Due Bills</span>
              <span>•</span>
              <span className="text-indigo-600 font-medium">{stats.pendingTransfersCount} Active Transfers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launchpad & Action Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={onOpenNewPO}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-500 hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-slate-900">Create Purchase Order</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Issue PO to betel/vark supplier</div>
        </button>

        <button
          onClick={onOpenInwardBill}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <PackagePlus className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-slate-900">GRN Stock Inward</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Receive bill with batch & expiry</div>
        </button>

        <button
          onClick={onOpenTransfer}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-amber-500 hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <Truck className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-slate-900">Dispatch to Store</div>
          <div className="text-[11px] text-slate-500 mt-0.5">WH ➔ Store vehicle transit</div>
        </button>

        <button
          onClick={onOpenIndent}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-cyan-500 hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-slate-900">Store Stock Indent</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Outlet replenishment request</div>
        </button>

        <button
          onClick={onOpenAdjustment}
          className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-rose-500 hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-xs font-bold text-slate-900">Scrap & Adjustment</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Damaged, expired or audit loss</div>
        </button>
      </div>

      {/* Main Content Grid: Live In-Transit Tracker & Urgent Stock Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: In-Transit Transfers & Multi-Store Live Matrix */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active In-Transit Shipments Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Live Stock In-Transit Tracking</h3>
                  <p className="text-xs text-slate-500">Warehouse ➔ Store live delivery dispatches</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('transfers')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <span>View All Transfers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {activeInTransitTransfers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No shipments currently in transit. All store deliveries completed.
                </div>
              ) : (
                activeInTransitTransfers.map((tr) => (
                  <div key={tr.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">{tr.transferNumber}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                            IN TRANSIT
                          </span>
                          <span className="text-xs text-slate-500 font-mono">OTP: {tr.otpOrPin}</span>
                        </div>
                        <div className="text-xs text-slate-700 mt-1 font-medium flex items-center gap-2">
                          <span>{tr.sourceName}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-indigo-900 font-bold">{tr.destinationName}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-slate-900">
                          {CURRENCY}{tr.totalValuation.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {tr.vehicleNumber} • {tr.carrierName}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 p-2 bg-slate-50 rounded-lg text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                      {tr.items.map((it, idx) => (
                        <span key={idx} className="font-medium">
                          {it.name}: <strong>{it.dispatchedQty} {it.unit}</strong> (Batch: {it.batchNumber})
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Multi-Store Replenishment & Stock Comparison Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Store-Wise Stock Comparison</h3>
                  <p className="text-xs text-slate-500">Live allocations across Gota, Bopal, Sindhu Bhavan & SG Highway</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('store_stock')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Individual Store Stocks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Item / SKU</th>
                    <th className="py-3 px-3 text-center">Central WH</th>
                    <th className="py-3 px-3 text-center">Gota Main</th>
                    <th className="py-3 px-3 text-center">Bopal Branch</th>
                    <th className="py-3 px-3 text-center">Sindhu Bhavan</th>
                    <th className="py-3 px-3 text-center">SG Highway</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {inventory.slice(0, 6).map((item) => {
                    const alloc = item.storeAllocations || {};
                    const bopalStock = alloc['bopal'] || 0;
                    const gotaStock = alloc['gota'] || 0;
                    const sbStock = alloc['sindhubhavan'] || 0;
                    const sgStock = alloc['sg_highway'] || 0;
                    const centralStock = Math.max(0, item.stockQuantity - (bopalStock + gotaStock + sbStock + sgStock));

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-sans font-medium text-slate-900">
                          <div>{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-indigo-700">{centralStock}</td>
                        <td className="py-3 px-3 text-center text-slate-700">{gotaStock}</td>
                        <td className="py-3 px-3 text-center text-slate-700">{bopalStock}</td>
                        <td className="py-3 px-3 text-center text-slate-700">{sbStock}</td>
                        <td className="py-3 px-3 text-center text-slate-700">{sgStock}</td>
                        <td className="py-3 px-4 text-right font-sans">
                          {item.stockQuantity <= item.lowStockThreshold ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Optimal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Urgent Attention (Near Expiry & Movement Feed) */}
        <div className="space-y-6">
          {/* Near Expiry & Shelf-Life Tracker */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Near-Expiry Batches</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                {nearExpiryBatches.length} Alert{nearExpiryBatches.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="p-4 space-y-3">
              {nearExpiryBatches.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  All active batches have healthy shelf-life (&gt;30 days).
                </div>
              ) : (
                nearExpiryBatches.slice(0, 4).map((b) => (
                  <div key={b.id} className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 text-xs">
                    <div className="flex items-center justify-between font-semibold text-purple-950">
                      <span>{b.name}</span>
                      <span className="font-mono text-purple-700">{b.quantityInStock} {b.unit}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-purple-800/80 mt-1">
                      <span className="font-mono">Batch: {b.batchNumber}</span>
                      <span className="font-bold text-rose-600">Expires in {b.daysToExpiry} days</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Live Stock Movement Audit Feed */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Recent Movement Log</h3>
              </div>
              <button
                onClick={() => onNavigateTab('audit_trail')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View Audit
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {auditTrail.slice(0, 5).map((aud) => (
                <div key={aud.id} className="p-3.5 text-xs hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">{aud.referenceNumber}</span>
                    <span className="text-[10px] text-slate-400">{new Date(aud.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="text-slate-700 font-medium mt-0.5">
                    {aud.itemName}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>{aud.fromLocation} ➔ {aud.toLocation}</span>
                    <span className={`font-bold font-mono ${aud.quantity < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {aud.quantity > 0 ? `+${aud.quantity}` : aud.quantity} {aud.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
