import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Scan,
  FileSpreadsheet,
  Truck,
  Building2,
  Store,
  IndianRupee,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
  TrendingUp,
  Tag,
  Barcode as BarcodeIcon,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  DollarSign,
  Boxes,
  ShieldCheck,
  Check,
  Edit3,
  Printer,
  Sparkles,
  LayoutGrid,
  List,
} from 'lucide-react';
import { InventoryItem, Category, StoreLocation } from '../../types';
import { Warehouse, Supplier, PurchaseOrder, PurchaseBill, StockTransfer } from '../../types/warehouse';
import { CURRENCY, storage } from '../../services/storage';
import { warehouseStorage } from '../../services/warehouseStorage';
import { soundEffects } from '../../services/audio';
import { BarcodeVisualizer } from '../common/BarcodeVisualizer';

interface AdminInventoryViewProps {
  inventory: InventoryItem[];
  categories: Category[];
  stores: StoreLocation[];
  onOpenAddItem: () => void;
  onOpenScanner: () => void;
  onOpenPO: () => void;
  onOpenInwardBill: () => void;
  onOpenTransferStock: (initialData?: Partial<StockTransfer>) => void;
  onOpenRegisterBarcode: (item?: InventoryItem) => void;
  onRefresh: () => void;
}

export const AdminInventoryView: React.FC<AdminInventoryViewProps> = ({
  inventory,
  categories,
  stores,
  onOpenAddItem,
  onOpenScanner,
  onOpenPO,
  onOpenInwardBill,
  onOpenTransferStock,
  onOpenRegisterBarcode,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Overall Inventory & Warehouse Stock Metrics
  const metrics = useMemo(() => {
    const totalSKUs = inventory.length;
    const activeSKUs = inventory.filter((i) => (i.status || 'active') === 'active').length;

    let centralWHUnits = 0;
    let storesStockUnits = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inventory.forEach((item) => {
      const centralQty = item.stockQuantity || 0;
      centralWHUnits += centralQty;

      const storeAllocations = Object.values(item.storeAllocations || {});
      const storeTotal = storeAllocations.reduce((sum, q) => sum + (q || 0), 0);
      storesStockUnits += storeTotal;

      const totalItemStock = centralQty + storeTotal;
      totalCostValuation += totalItemStock * (item.costPrice || 0);
      totalRetailValuation += totalItemStock * (item.sellingPrice || 0);

      if (totalItemStock === 0) {
        outOfStockCount++;
      } else if (totalItemStock <= (item.lowStockThreshold || 10)) {
        lowStockCount++;
      }
    });

    const totalNetworkUnits = centralWHUnits + storesStockUnits;
    const grossProfitPotential = totalRetailValuation - totalCostValuation;

    return {
      totalSKUs,
      activeSKUs,
      centralWHUnits,
      storesStockUnits,
      totalNetworkUnits,
      totalCostValuation,
      totalRetailValuation,
      grossProfitPotential,
      lowStockCount,
      outOfStockCount,
    };
  }, [inventory]);

  // Filtered Products List
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchSku = item.sku.toLowerCase().includes(q);
        const matchBarcode = (item.barcode || '').toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        const matchBrand = (item.brand || '').toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchBarcode && !matchCategory && !matchBrand) return false;
      }

      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      const totalStock = (item.stockQuantity || 0) + Object.values(item.storeAllocations || {}).reduce((sum, q) => sum + (q || 0), 0);
      if (selectedStockStatus === 'in_stock' && totalStock <= (item.lowStockThreshold || 10)) {
        return false;
      }
      if (selectedStockStatus === 'low_stock' && (totalStock > (item.lowStockThreshold || 10) || totalStock === 0)) {
        return false;
      }
      if (selectedStockStatus === 'out_of_stock' && totalStock > 0) {
        return false;
      }

      if (selectedStoreFilter !== 'all') {
        const storeQty = item.storeAllocations?.[selectedStoreFilter] || 0;
        if (storeQty === 0) return false;
      }

      return true;
    });
  }, [inventory, searchQuery, selectedCategory, selectedStockStatus, selectedStoreFilter]);

  return (
    <div className="space-y-6">
      {/* 1. TOP PROMINENT WAREHOUSE & INVENTORY ACTION TOOLBAR (Requested by User) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 text-white rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase tracking-wider">
                CENTRAL SUPPLY CHAIN & CATALOG OPERATIONS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
              Master Inventory & Warehouse Control Hub
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Execute procurement purchase orders, inward verified bills with GRN, dispatch stock transfers across store outlets, register barcodes, and manage master product SKUs.
            </p>
          </div>

          {/* Core Warehouse Action Buttons Group */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 1. Issue PO */}
            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                onOpenPO();
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-95 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all border border-indigo-400/30"
              title="Issue Purchase Order to Supplier"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-200" />
              <span>Issue PO</span>
            </button>

            {/* 2. Inward Bill */}
            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                onOpenInwardBill();
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:scale-95 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all border border-emerald-400/30"
              title="Inward Goods Bill & Generate Verified GRN"
            >
              <Package className="w-4 h-4 text-emerald-200" />
              <span>Inward Bill</span>
            </button>

            {/* 3. Transfer Stock */}
            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                onOpenTransferStock();
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-95 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all border border-amber-400/30"
              title="Transfer Stock Between Warehouse and Store Outlets"
            >
              <Truck className="w-4 h-4 text-amber-200" />
              <span>Transfer Stock</span>
            </button>

            {/* 4. Barcode Scanner */}
            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                onOpenScanner();
              }}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-400 text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all border border-slate-700"
              title="Camera Barcode Scanner"
            >
              <Scan className="w-4 h-4" />
              <span>Barcode Scanner</span>
            </button>

            {/* 5. Add Item / Add SKU */}
            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                onOpenAddItem();
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:scale-95 text-slate-950 text-xs font-black rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all border border-amber-300"
              title="Add New SKU / Product Catalog Entry"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add SKU / Item</span>
            </button>

            {/* 6. Register Bar Code */}
            <button
              type="button"
              onClick={() => {
                soundEffects.playClick();
                onOpenRegisterBarcode();
              }}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all border border-slate-700"
              title="Register Barcode to Item"
            >
              <BarcodeIcon className="w-4 h-4 text-amber-400" />
              <span>Bar Code</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. INVENTORY SUMMARY SCORECARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Master SKUs */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Master Products
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {metrics.totalSKUs}{' '}
              <span className="text-xs text-emerald-600 font-semibold font-sans">
                ({metrics.activeSKUs} Active)
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Across Paan, Cafe & Essentials
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Central Warehouse Units */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Central WH Stock
            </span>
            <div className="text-2xl font-black font-mono text-indigo-900 mt-1">
              {metrics.centralWHUnits.toLocaleString('en-IN')}{' '}
              <span className="text-xs font-bold text-slate-500">Units</span>
            </div>
            <span className="text-[10px] text-indigo-600 font-bold mt-0.5 block">
              Ready for Store Dispatch
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Store Outlets Units */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Store Outlets Stock
            </span>
            <div className="text-2xl font-black font-mono text-emerald-900 mt-1">
              {metrics.storesStockUnits.toLocaleString('en-IN')}{' '}
              <span className="text-xs font-bold text-slate-500">Units</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block">
              Allocated across {stores.length} outlets
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Network Valuation */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Stock Valuation
            </span>
            <div className="text-2xl font-black font-mono text-slate-900 mt-1">
              {CURRENCY}{metrics.totalCostValuation.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Retail: {CURRENCY}{metrics.totalRetailValuation.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. SEARCH & FILTERS CONTROLS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search product name, SKU, barcode, brand, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-amber-500 transition-all font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer border border-slate-200"
              title="Refresh Inventory"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <select
            value={selectedStockStatus}
            onChange={(e) => setSelectedStockStatus(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Stock Levels</option>
            <option value="in_stock">Healthy Stock Only</option>
            <option value="low_stock">Low Stock Alerts ({metrics.lowStockCount})</option>
            <option value="out_of_stock">Out of Stock ({metrics.outOfStockCount})</option>
          </select>

          {/* Outlet Allocation Filter */}
          <select
            value={selectedStoreFilter}
            onChange={(e) => setSelectedStoreFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-hidden"
          >
            <option value="all">All Locations (Central + Outlets)</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} Only
              </option>
            ))}
          </select>

          <span className="ml-auto text-slate-500 font-bold font-mono">
            Showing {filteredItems.length} of {inventory.length} Products
          </span>
        </div>
      </div>

      {/* 4. PRODUCTS & STOCK ALLOCATION TABLE */}
      {viewMode === 'table' ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Product Name & SKU</th>
                  <th className="py-3 px-4">Category & Barcode</th>
                  <th className="py-3 px-4 text-right">Cost / Retail Price (₹)</th>
                  <th className="py-3 px-4 text-center">Central WH Stock</th>
                  <th className="py-3 px-4">Store Outlets Allocation</th>
                  <th className="py-3 px-4 text-center">Total Network</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      No products found matching your search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const centralStock = item.stockQuantity || 0;
                    const storeAllocations = Object.entries(item.storeAllocations || {});
                    const totalStoreStock = storeAllocations.reduce((sum, [_, q]) => sum + (q || 0), 0);
                    const totalStock = centralStock + totalStoreStock;
                    const isLow = totalStock <= (item.lowStockThreshold || 10);
                    const isOut = totalStock === 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Name & SKU */}
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900 text-xs">
                            {item.name}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="font-bold text-slate-600">{item.sku}</span>
                            {item.brand && <span>• {item.brand}</span>}
                          </div>
                        </td>

                        {/* Category & Barcode */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/70 text-[10px] font-bold">
                            {item.category}
                          </span>
                          <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-1">
                            <BarcodeIcon className="w-3 h-3 text-slate-400" />
                            <span>{item.barcode || 'NO-BARCODE'}</span>
                          </div>
                        </td>

                        {/* Cost & Selling Price */}
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <div className="text-slate-900 font-black">
                            {CURRENCY}{item.sellingPrice.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Cost: {CURRENCY}{item.costPrice.toFixed(2)}
                          </div>
                        </td>

                        {/* Central WH Stock */}
                        <td className="py-3 px-4 text-center font-mono">
                          <span className="px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-black text-xs">
                            {centralStock} {item.unit || 'pcs'}
                          </span>
                        </td>

                        {/* Store Outlets Allocation Breakdown */}
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {stores.map((s) => {
                              const qty = item.storeAllocations?.[s.id] || 0;
                              return (
                                <span
                                  key={s.id}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                    qty > 0
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                                      : 'bg-slate-50 text-slate-400 border-slate-200'
                                  }`}
                                  title={`${s.name}: ${qty} ${item.unit || 'units'}`}
                                >
                                  {s.shortName || s.name.slice(0, 5)}: <strong>{qty}</strong>
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Total Network Units */}
                        <td className="py-3 px-4 text-center font-mono font-black text-xs text-slate-900">
                          {totalStock} {item.unit || 'units'}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isOut
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : isLow
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Healthy'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Quick Transfer to Store */}
                            <button
                              type="button"
                              onClick={() => {
                                onOpenTransferStock({
                                  items: [
                                    {
                                      itemId: item.id,
                                      sku: item.sku,
                                      name: item.name,
                                      category: item.category,
                                      unit: item.unit || 'pieces',
                                      unitCost: item.costPrice,
                                      requestedQty: 5,
                                      dispatchedQty: 5,
                                      receivedQty: 0,
                                    },
                                  ],
                                });
                              }}
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                              title="Dispatch Stock to Store Outlet"
                            >
                              <Truck className="w-3.5 h-3.5" />
                            </button>

                            {/* Register / Update Barcode */}
                            <button
                              type="button"
                              onClick={() => onOpenRegisterBarcode(item)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="Edit / Register Barcode"
                            >
                              <BarcodeIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const centralStock = item.stockQuantity || 0;
            const totalStoreStock = Object.values(item.storeAllocations || {}).reduce((sum, q) => sum + (q || 0), 0);
            const totalStock = centralStock + totalStoreStock;

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900">{item.name}</h3>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {item.sku} • {item.category}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                      {CURRENCY}{item.sellingPrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Stock Pills */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="bg-indigo-50/70 p-2 rounded-xl border border-indigo-100 text-center">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase block">
                        Central Warehouse
                      </span>
                      <span className="font-mono font-black text-indigo-950 text-sm block mt-0.5">
                        {centralStock} {item.unit || 'units'}
                      </span>
                    </div>

                    <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-100 text-center">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase block">
                        Outlets Combined
                      </span>
                      <span className="font-mono font-black text-emerald-950 text-sm block mt-0.5">
                        {totalStoreStock} {item.unit || 'units'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-500">
                    Barcode: <strong>{item.barcode || 'N/A'}</strong>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenTransferStock({
                        items: [{ itemId: item.id, sku: item.sku, name: item.name, category: item.category, unit: item.unit || 'pieces', unitCost: item.costPrice, requestedQty: 5, dispatchedQty: 5, receivedQty: 0 }]
                      })}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Truck className="w-3 h-3" />
                      <span>Transfer</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenRegisterBarcode(item)}
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      title="Bar Code"
                    >
                      <BarcodeIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
