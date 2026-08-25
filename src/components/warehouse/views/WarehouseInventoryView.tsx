import React, { useState } from 'react';
import {
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  ShieldCheck,
  Package,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';
import { InventoryItem } from '../../../types';
import { BatchRecord, Warehouse } from '../../../types/warehouse';
import { CURRENCY, storage } from '../../../services/storage';

interface WarehouseInventoryViewProps {
  inventory: InventoryItem[];
  batches: BatchRecord[];
  warehouses: Warehouse[];
  searchQuery: string;
  onOpenInwardBill: () => void;
  onOpenTransfer: () => void;
}

export const WarehouseInventoryView: React.FC<WarehouseInventoryViewProps> = ({
  inventory,
  batches,
  warehouses,
  searchQuery,
  onOpenInwardBill,
  onOpenTransfer,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'critical' | 'out_of_stock' | 'healthy'>('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [valuationType, setValuationType] = useState<'fifo' | 'avg'>('fifo');

  // Categories extraction
  const categories = ['all', ...Array.from(new Set(inventory.map((i) => i.category)))];

  // Filtering
  const filteredInventory = inventory.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.barcode.includes(q) ||
      item.category.toLowerCase().includes(q);

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    let matchesStatus = true;
    if (stockStatusFilter === 'low') matchesStatus = item.stockQuantity <= item.lowStockThreshold && item.stockQuantity > 0;
    else if (stockStatusFilter === 'critical') matchesStatus = item.stockQuantity > 0 && item.stockQuantity <= Math.ceil(item.lowStockThreshold * 0.4);
    else if (stockStatusFilter === 'out_of_stock') matchesStatus = item.stockQuantity <= 0;
    else if (stockStatusFilter === 'healthy') matchesStatus = item.stockQuantity > item.lowStockThreshold;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* Top Filter & Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Category & Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Product Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Health Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setStockStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                stockStatusFilter === 'all' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600'
              }`}
            >
              All Items ({inventory.length})
            </button>
            <button
              onClick={() => setStockStatusFilter('low')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                stockStatusFilter === 'low' ? 'bg-amber-500 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setStockStatusFilter('critical')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                stockStatusFilter === 'critical' ? 'bg-rose-600 text-white font-bold shadow-xs' : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Critical
            </button>
            <button
              onClick={() => setStockStatusFilter('out_of_stock')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                stockStatusFilter === 'out_of_stock' ? 'bg-slate-900 text-white font-bold shadow-xs' : 'text-slate-600'
              }`}
            >
              Out of Stock
            </button>
          </div>
        </div>

        {/* Valuation Toggle & Negative Stock Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Negative Stock Protection: ACTIVE</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-700">
            <span className="px-2 text-[10px] text-slate-400 font-mono">VALUATION:</span>
            <button
              onClick={() => setValuationType('fifo')}
              className={`px-2 py-0.5 rounded-lg ${valuationType === 'fifo' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
            >
              FIFO
            </button>
            <button
              onClick={() => setValuationType('avg')}
              className={`px-2 py-0.5 rounded-lg ${valuationType === 'avg' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
            >
              Avg Cost
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Item Details & SKU</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3 text-center">Central WH</th>
                <th className="py-3.5 px-3 text-center">Stores Total</th>
                <th className="py-3.5 px-3 text-center">Total Stock</th>
                <th className="py-3.5 px-3 text-center">Min Threshold</th>
                <th className="py-3.5 px-4 text-right">Landed Cost / Val</th>
                <th className="py-3.5 px-4 text-center">Batches & Expiry</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No inventory items matched your search/filter criteria.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const alloc = item.storeAllocations || {};
                  const storesSum = Object.values(alloc).reduce<number>((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
                  const centralStock = Math.max(0, Number(item.stockQuantity) - storesSum);
                  const isExpanded = expandedItemId === item.id;
                  const itemBatches = batches.filter((b) => b.itemId === item.id || b.sku === item.sku);

                  const isLow = item.stockQuantity <= item.lowStockThreshold;
                  const isCritical = item.stockQuantity > 0 && item.stockQuantity <= Math.ceil(item.lowStockThreshold * 0.4);
                  const isOut = item.stockQuantity <= 0;

                  return (
                    <React.Fragment key={item.id}>
                      <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-slate-50/90' : ''}`}>
                        {/* Item Name & Barcode */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 mt-0.5">
                            <span>SKU: <strong className="text-slate-600">{item.sku}</strong></span>
                            <span>•</span>
                            <span>BARCODE: {item.barcode}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                            {item.category}
                          </span>
                        </td>

                        {/* Central WH Stock */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700">
                          {centralStock} {item.unit}
                        </td>

                        {/* Stores Stock */}
                        <td className="py-3 px-3 text-center font-mono text-slate-700">
                          {storesSum} {item.unit}
                        </td>

                        {/* Total Stock Status */}
                        <td className="py-3 px-3 text-center font-mono font-extrabold text-slate-900">
                          <div className="flex items-center justify-center gap-1.5">
                            <span>{item.stockQuantity}</span>
                            {isOut ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-600 text-white">
                                OUT
                              </span>
                            ) : isCritical ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                                CRITICAL
                              </span>
                            ) : isLow ? (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                LOW
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                OK
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Min Threshold Setup */}
                        <td className="py-3 px-3 text-center font-mono text-slate-500">
                          {item.lowStockThreshold} {item.unit}
                        </td>

                        {/* Valuation */}
                        <td className="py-3 px-4 text-right font-mono">
                          <div className="font-bold text-slate-900">
                            {CURRENCY}{(item.stockQuantity * item.costPrice).toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            @{CURRENCY}{item.costPrice} / {item.unit}
                          </div>
                        </td>

                        {/* Batch & Expiry Drawer Trigger */}
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors"
                          >
                            <span>{itemBatches.length} Batch{itemBatches.length !== 1 ? 'es' : ''}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={onOpenTransfer}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs transition-colors"
                          >
                            Transfer
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Batch Details Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={9} className="p-4">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-inner">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                  <Layers className="w-4 h-4 text-indigo-600" />
                                  <span>Active Batches & Shelf-Life Lifecycle for {item.name}</span>
                                </h4>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  Landed FIFO Cost Evaluation
                                </span>
                              </div>

                              {itemBatches.length === 0 ? (
                                <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                                  No distinct batches logged yet for this SKU. Stock inwarded via GRN will auto-generate tracked batches.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-100/80 text-slate-500 font-semibold uppercase text-[10px]">
                                      <tr>
                                        <th className="py-2 px-3">Batch Number</th>
                                        <th className="py-2 px-3">Warehouse Hub</th>
                                        <th className="py-2 px-3">Mfg Date</th>
                                        <th className="py-2 px-3">Expiry Date</th>
                                        <th className="py-2 px-3">Days Left</th>
                                        <th className="py-2 px-3 text-center">Batch Stock</th>
                                        <th className="py-2 px-3 text-right">Unit Cost</th>
                                        <th className="py-2 px-3 text-right">Batch Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono">
                                      {itemBatches.map((b) => (
                                        <tr key={b.id}>
                                          <td className="py-2 px-3 font-bold text-slate-900">{b.batchNumber}</td>
                                          <td className="py-2 px-3 font-sans text-slate-600">{b.warehouseName}</td>
                                          <td className="py-2 px-3 text-slate-500">{b.mfgDate}</td>
                                          <td className="py-2 px-3 text-slate-700 font-semibold">{b.expiryDate}</td>
                                          <td className="py-2 px-3">
                                            {b.daysToExpiry <= 0 ? (
                                              <span className="text-rose-600 font-bold">Expired</span>
                                            ) : b.daysToExpiry <= 30 ? (
                                              <span className="text-purple-600 font-bold">{b.daysToExpiry} days</span>
                                            ) : (
                                              <span className="text-slate-600">{b.daysToExpiry} days</span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3 text-center font-bold text-indigo-700">
                                            {b.quantityInStock} {b.unit}
                                          </td>
                                          <td className="py-2 px-3 text-right">{CURRENCY}{b.unitCost}</td>
                                          <td className="py-2 px-3 text-right font-sans">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                              b.status === 'expired'
                                                ? 'bg-rose-100 text-rose-800'
                                                : b.status === 'near_expiry'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                              {b.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
