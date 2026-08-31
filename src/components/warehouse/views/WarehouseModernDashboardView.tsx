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
  FileText,
  Search,
  Filter,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  Warehouse,
  PurchaseBill,
  BatchRecord,
  StockTransfer,
  StoreStockIndent,
  StockMovementAudit,
  WarehouseOverviewStats,
  WarehouseTab,
} from '../../../types/warehouse';
import { InventoryItem, StoreLocation } from '../../../types';
import { CURRENCY } from '../../../services/storage';
import { WarehouseWindowCard } from '../WarehouseWindowCard';
import { DocumentManifestModal, ManifestDocumentType } from '../../common/DocumentManifestModal';

interface WarehouseModernDashboardViewProps {
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
  onOpenPipelineTester?: () => void;
}

export const WarehouseModernDashboardView: React.FC<WarehouseModernDashboardViewProps> = ({
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
  onOpenPipelineTester,
}) => {
  const [valuationMode, setValuationMode] = useState<'fifo' | 'avg'>('fifo');
  const [comparisonSearch, setComparisonSearch] = useState('');
  const [manifestDoc, setManifestDoc] = useState<{
    isOpen: boolean;
    type: ManifestDocumentType;
    data: any;
  }>({
    isOpen: false,
    type: 'stock_transfer',
    data: null,
  });

  const nearExpiryBatches = batches.filter((b) => b.status === 'near_expiry' && b.quantityInStock > 0);
  const criticalStockItems = inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold);
  const activeInTransitTransfers = transfers.filter((t) => t.status === 'dispatched_in_transit');

  // Compute all in-store low stock items
  const storeLowStockAlerts: Array<{
    itemId: string;
    itemName: string;
    sku: string;
    unit: string;
    storeId: string;
    storeName: string;
    currentQty: number;
    threshold: number;
  }> = [];

  inventory.forEach((item) => {
    if (!item.storeAllocations) return;
    const storeMinThreshold = Math.max(2, Math.round((item.lowStockThreshold || 10) * 0.4));
    Object.entries(item.storeAllocations).forEach(([storeId, qty]) => {
      const numQty = Number(qty) || 0;
      if (numQty <= storeMinThreshold) {
        const stObj = stores.find((s) => s.id === storeId);
        storeLowStockAlerts.push({
          itemId: item.id,
          itemName: item.name,
          sku: item.sku,
          unit: item.unit,
          storeId,
          storeName: stObj ? stObj.shortName || stObj.name : storeId.toUpperCase(),
          currentQty: numQty,
          threshold: storeMinThreshold,
        });
      }
    });
  });

  const filteredComparisonInventory = inventory.filter(
    (i) =>
      i.name.toLowerCase().includes(comparisonSearch.toLowerCase()) ||
      i.sku.toLowerCase().includes(comparisonSearch.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Top KPI Metrics Grid (Valuation, Hub Distribution, Payables) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* KPI 1: Inventory Valuation */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs relative">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Stock Valuation
            </span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setValuationMode('fifo')}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  valuationMode === 'fifo' ? 'bg-white shadow-xs text-amber-700 font-bold' : ''
                }`}
              >
                FIFO
              </button>
              <button
                type="button"
                onClick={() => setValuationMode('avg')}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  valuationMode === 'avg' ? 'bg-white shadow-xs text-amber-700 font-bold' : ''
                }`}
              >
                AVG
              </button>
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {CURRENCY}
              {(valuationMode === 'fifo'
                ? stats.totalInventoryValuationFIFO
                : stats.totalInventoryValuationAvg
              ).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">
                {stats.centralWarehouseStockUnits + stats.storesTotalStockUnits + stats.inTransitStockUnits} Total Units
              </span>
              <span>•</span>
              <span className="text-slate-500 truncate">
                {valuationMode === 'fifo' ? 'Batch Cost' : 'Weighted Avg'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Multi-Hub Distribution */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Hub Distribution</span>
            <Building2 className="w-4 h-4 text-slate-700" />
          </div>
          <div className="mt-2.5 space-y-1">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-600">Central Hub:</span>
              <span className="font-bold text-slate-900 font-mono">{stats.centralWarehouseStockUnits} units</span>
            </div>
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-600">Store Outlets:</span>
              <span className="font-bold text-slate-900 font-mono">{stats.storesTotalStockUnits} units</span>
            </div>
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-amber-700 flex items-center gap-1">
                <Truck className="w-3 h-3" /> In Transit:
              </span>
              <span className="font-bold text-amber-700 font-mono">{stats.inTransitStockUnits} units</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Supplier Payables */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Supplier Payables</span>
            <FileSpreadsheet className="w-4 h-4 text-slate-700" />
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              {CURRENCY}
              {stats.totalSupplierOutstanding.toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
              <span className="font-semibold text-amber-700">{stats.overdueBillsCount} Due Bills</span>
              <span>•</span>
              <span className="text-slate-700 font-medium">{stats.pendingTransfersCount} In-Transit</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quick Action Launchpad Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <button
          type="button"
          onClick={onOpenNewPO}
          className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-500 hover:shadow-xs transition-all text-left group cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-slate-900">Purchase Order</div>
          <div className="text-[10px] text-slate-500">Issue PO to vendor</div>
        </button>

        <button
          type="button"
          onClick={onOpenInwardBill}
          className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-500 hover:shadow-xs transition-all text-left group cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-1.5">
            <PackagePlus className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-slate-900">GRN Inward</div>
          <div className="text-[10px] text-slate-500">Receive stock batches</div>
        </button>

        <button
          type="button"
          onClick={onOpenTransfer}
          className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-500 hover:shadow-xs transition-all text-left group cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-1.5">
            <Truck className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-slate-900">Dispatch Transfer</div>
          <div className="text-[10px] text-slate-500">Hub ➔ Store transit</div>
        </button>

        <button
          type="button"
          onClick={onOpenIndent}
          className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-500 hover:shadow-xs transition-all text-left group cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-1.5">
            <ArrowDownLeft className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-slate-900">Store Indent</div>
          <div className="text-[10px] text-slate-500">Outlet replenishment</div>
        </button>

        <button
          type="button"
          onClick={onOpenAdjustment}
          className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-500 hover:shadow-xs transition-all text-left group cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs font-bold text-slate-900">Scrap & Adjustment</div>
          <div className="text-[10px] text-slate-500">Audit stock variance</div>
        </button>
      </div>

      {/* 4. Central Workspace Grid: Window Cards with Expand/Minimize controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Columns: Store Stock Comparison & In-Transit Tracking Windows */}
        <div className="lg:col-span-2 space-y-5">
          {/* WINDOW 1: Store-Wise Stock Comparison Matrix */}
          <WarehouseWindowCard
            id="store-stock-comparison-window"
            title="Store-Wise Stock Comparison"
            subtitle="Real-time multi-branch stock levels across Central Hub, Gota, Bopal, Sindhu Bhavan & SG Highway"
            icon={Store}
            iconBgClass="bg-indigo-50"
            iconColorClass="text-indigo-700"
            headerAction={
              <button
                type="button"
                onClick={() => onNavigateTab('store_stock')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Full Allocation Table</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
            bodyClassName="p-0"
            maximizedContent={
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div className="relative max-w-sm w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={comparisonSearch}
                      onChange={(e) => setComparisonSearch(e.target.value)}
                      placeholder="Filter items in expanded comparison..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={onOpenTransfer}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer self-end sm:self-auto"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Create Store Transfer</span>
                  </button>
                </div>

                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Item & SKU</th>
                        <th className="py-3 px-3 text-center">Central Hub</th>
                        <th className="py-3 px-3 text-center">Gota Main</th>
                        <th className="py-3 px-3 text-center">Bopal Branch</th>
                        <th className="py-3 px-3 text-center">Sindhu Bhavan</th>
                        <th className="py-3 px-3 text-center">SG Highway</th>
                        <th className="py-3 px-3 text-center">Total Units</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {filteredComparisonInventory.map((item) => {
                        const alloc = item.storeAllocations || {};
                        const bopalStock = alloc['bopal'] || 0;
                        const gotaStock = alloc['gota'] || 0;
                        const sbStock = alloc['sindhubhavan'] || 0;
                        const sgStock = alloc['sg_highway'] || 0;
                        const centralStock = Math.max(
                          0,
                          item.stockQuantity - (bopalStock + gotaStock + sbStock + sgStock)
                        );

                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4 font-sans font-medium text-slate-900">
                              <div className="font-bold">{item.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-indigo-700">
                              {centralStock}
                            </td>
                            <td className="py-3 px-3 text-center text-slate-700">{gotaStock}</td>
                            <td className="py-3 px-3 text-center text-slate-700">{bopalStock}</td>
                            <td className="py-3 px-3 text-center text-slate-700">{sbStock}</td>
                            <td className="py-3 px-3 text-center text-slate-700">{sgStock}</td>
                            <td className="py-3 px-3 text-center font-bold text-slate-900">
                              {item.stockQuantity} {item.unit}
                            </td>
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
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Item / SKU</th>
                    <th className="py-2.5 px-3 text-center">Central WH</th>
                    <th className="py-2.5 px-3 text-center">Gota Main</th>
                    <th className="py-2.5 px-3 text-center">Bopal Branch</th>
                    <th className="py-2.5 px-3 text-center">Sindhu Bhavan</th>
                    <th className="py-2.5 px-3 text-center">SG Highway</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {inventory.slice(0, 6).map((item) => {
                    const alloc = item.storeAllocations || {};
                    const bopalStock = alloc['bopal'] || 0;
                    const gotaStock = alloc['gota'] || 0;
                    const sbStock = alloc['sindhubhavan'] || 0;
                    const sgStock = alloc['sg_highway'] || 0;
                    const centralStock = Math.max(
                      0,
                      item.stockQuantity - (bopalStock + gotaStock + sbStock + sgStock)
                    );

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-4 font-sans font-medium text-slate-900">
                          <div className="truncate max-w-[140px] font-bold">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-indigo-700">{centralStock}</td>
                        <td className="py-2.5 px-3 text-center text-slate-700">{gotaStock}</td>
                        <td className="py-2.5 px-3 text-center text-slate-700">{bopalStock}</td>
                        <td className="py-2.5 px-3 text-center text-slate-700">{sbStock}</td>
                        <td className="py-2.5 px-3 text-center text-slate-700">{sgStock}</td>
                        <td className="py-2.5 px-4 text-right font-sans">
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
          </WarehouseWindowCard>

          {/* WINDOW 2: Live In-Transit Shipments Tracking */}
          <WarehouseWindowCard
            id="in-transit-tracking-window"
            title="Live Stock In-Transit Tracking"
            subtitle="Active logistics dispatches en route from Central Warehouse to store branches"
            icon={Truck}
            iconBgClass="bg-amber-50"
            iconColorClass="text-amber-700"
            badge={
              activeInTransitTransfers.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {activeInTransitTransfers.length} Active
                </span>
              ) : undefined
            }
            headerAction={
              <button
                type="button"
                onClick={() => onNavigateTab('transfers')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
              >
                <span>All Transfers</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            }
            bodyClassName="p-0"
          >
            <div className="divide-y divide-slate-100">
              {activeInTransitTransfers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No stock dispatches currently in transit. All store deliveries completed.
                </div>
              ) : (
                activeInTransitTransfers.map((tr) => (
                  <div key={tr.id} className="p-4 hover:bg-slate-50/60 transition-colors">
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

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-slate-900">
                            {CURRENCY}{tr.totalValuation.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {tr.vehicleNumber} • {tr.carrierName}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setManifestDoc({ isOpen: true, type: 'stock_transfer', data: tr })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer border border-slate-200 shrink-0"
                          title="Print Gate Pass & Transfer Challan"
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Challan</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
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
          </WarehouseWindowCard>
        </div>

        {/* Right 1 Column: Monitoring Feeds (Near Expiry & Movement Log Windows) */}
        <div className="space-y-5">
          {/* WINDOW 3: Near-Expiry Batches & Shelf-Life Tracker */}
          <WarehouseWindowCard
            id="near-expiry-window"
            title="Near-Expiry Batches"
            subtitle="Batches approaching shelf-life expiration threshold (&lt;30 days)"
            icon={Clock}
            iconBgClass="bg-purple-50"
            iconColorClass="text-purple-700"
            badge={
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                {nearExpiryBatches.length} Alert{nearExpiryBatches.length !== 1 ? 's' : ''}
              </span>
            }
            bodyClassName="p-3.5 sm:p-4 space-y-2.5"
            maximizedContent={
              <div className="space-y-3">
                <div className="text-xs text-slate-600">
                  Full list of inventory batches across all warehouses with expiry dates:
                </div>
                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-3">Batch No</th>
                        <th className="py-3 px-3 text-center">Available Stock</th>
                        <th className="py-3 px-3 text-center">Expiry Date</th>
                        <th className="py-3 px-3 text-center">Days Remaining</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {batches.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-sans font-bold text-slate-900">{b.name}</td>
                          <td className="py-3 px-3 text-slate-600">{b.batchNumber}</td>
                          <td className="py-3 px-3 text-center font-bold text-purple-900">
                            {b.quantityInStock} {b.unit}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-600">{b.expiryDate}</td>
                          <td className="py-3 px-3 text-center font-bold text-rose-600">
                            {b.daysToExpiry} days
                          </td>
                          <td className="py-3 px-4 text-right font-sans">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                b.status === 'expired'
                                  ? 'bg-rose-100 text-rose-800'
                                  : b.status === 'near_expiry'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {b.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            }
          >
            {nearExpiryBatches.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400">
                All active batches have healthy shelf-life (&gt;30 days).
              </div>
            ) : (
              nearExpiryBatches.slice(0, 4).map((b) => (
                <div key={b.id} className="p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-xs">
                  <div className="flex items-center justify-between font-semibold text-purple-950">
                    <span className="truncate">{b.name}</span>
                    <span className="font-mono text-purple-700 font-bold shrink-0">
                      {b.quantityInStock} {b.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-purple-800/80 mt-1">
                    <span className="font-mono text-slate-500">Batch: {b.batchNumber}</span>
                    <span className="font-bold text-rose-600">Expires in {b.daysToExpiry}d</span>
                  </div>
                </div>
              ))
            )}
          </WarehouseWindowCard>

          {/* WINDOW 4: Recent Movement Log (Stock Movement Audit Feed) */}
          <WarehouseWindowCard
            id="movement-audit-window"
            title="Recent Movement Log"
            subtitle="Chronological audit stream of internal and outlet stock movements"
            icon={Layers}
            iconBgClass="bg-indigo-50"
            iconColorClass="text-indigo-700"
            headerAction={
              <button
                type="button"
                onClick={() => onNavigateTab('audit_trail')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                View Full Audit
              </button>
            }
            bodyClassName="p-0"
            maximizedContent={
              <div className="space-y-3">
                <div className="text-xs text-slate-600">
                  Comprehensive audit trail of inward receipts, transfers, indents, and scrap adjustments:
                </div>
                <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Ref Number</th>
                        <th className="py-3 px-3">Timestamp</th>
                        <th className="py-3 px-3">Item Name</th>
                        <th className="py-3 px-3">From ➔ To</th>
                        <th className="py-3 px-3 text-right">Quantity</th>
                        <th className="py-3 px-4 text-right">User / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {auditTrail.map((aud) => (
                        <tr key={aud.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">{aud.referenceNumber}</td>
                          <td className="py-3 px-3 text-slate-500 font-sans">
                            {new Date(aud.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 font-sans font-semibold text-slate-800">
                            {aud.itemName}
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-sans">
                            {aud.fromLocation} ➔ {aud.toLocation}
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-bold ${
                              aud.quantity < 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {aud.quantity > 0 ? `+${aud.quantity}` : aud.quantity} {aud.unit}
                          </td>
                          <td className="py-3 px-4 text-right font-sans text-slate-600">
                            {aud.movementType.replace(/_/g, ' ')} ({aud.performedBy})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            }
          >
            <div className="divide-y divide-slate-100">
              {auditTrail.slice(0, 5).map((aud) => (
                <div key={aud.id} className="p-3 text-xs hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">{aud.referenceNumber}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(aud.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-slate-700 font-medium mt-0.5 truncate">{aud.itemName}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span className="truncate max-w-[150px]">
                      {aud.fromLocation} ➔ {aud.toLocation}
                    </span>
                    <span
                      className={`font-bold font-mono shrink-0 ${
                        aud.quantity < 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {aud.quantity > 0 ? `+${aud.quantity}` : aud.quantity} {aud.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </WarehouseWindowCard>
        </div>
      </div>

      {/* Document Manifest / Gate Pass Print Modal */}
      <DocumentManifestModal
        isOpen={manifestDoc.isOpen}
        onClose={() => setManifestDoc({ ...manifestDoc, isOpen: false })}
        documentType={manifestDoc.type}
        documentData={manifestDoc.data}
      />
    </div>
  );
};
