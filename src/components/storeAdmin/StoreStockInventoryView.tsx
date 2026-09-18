import React, { useState, useMemo, useDeferredValue } from 'react';
import {
  Package,
  Search,
  Filter,
  Plus,
  Truck,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  X,
  Layers,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { InventoryItem, StoreLocation } from '../../types';
import { storage } from '../../services/storage';

interface StoreStockInventoryViewProps {
  currentStore: StoreLocation;
  activeStoreId: string;
  storeInventory: InventoryItem[];
  onOpenCreateIndent: (preselectedItem?: InventoryItem | null) => void;
  onRefresh?: () => void;
}

type StockStatusFilter = 'all' | 'low_stock' | 'out_of_stock' | 'in_stock';
type SortField = 'stock' | 'name' | 'price' | 'category';
type SortDirection = 'asc' | 'desc';

interface ProcessedInventoryItem {
  item: InventoryItem;
  allocatedStock: number;
  lowThreshold: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  searchIndex: string;
}

export const StoreStockInventoryView: React.FC<StoreStockInventoryViewProps> = ({
  currentStore,
  activeStoreId,
  storeInventory,
  onOpenCreateIndent,
  onRefresh,
}) => {
  // Search & Filter state
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StockStatusFilter>('all');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('stock');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Categories list from storage and inventory
  const categories = useMemo(() => {
    const storeCategories = storage.getCategories();
    const invCategories = Array.from(new Set(storeInventory.map((i) => i.category).filter(Boolean)));
    const merged = Array.from(
      new Set([...storeCategories.map((c) => c.name), ...invCategories])
    ).sort();
    return merged;
  }, [storeInventory]);

  // Pre-process and index items with store-specific stock computations
  const processedItems: ProcessedInventoryItem[] = useMemo(() => {
    return storeInventory.map((item) => {
      const allocatedStock =
        item.storeAllocations && activeStoreId in item.storeAllocations
          ? item.storeAllocations[activeStoreId]
          : item.stockQuantity;
      const lowThreshold = item.lowStockThreshold || 10;

      let status: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
      if (allocatedStock <= 0) {
        status = 'out_of_stock';
      } else if (allocatedStock <= lowThreshold) {
        status = 'low_stock';
      }

      const searchIndex = `${item.name} ${item.sku || ''} ${item.barcode || ''} ${item.category}`.toLowerCase();

      return {
        item,
        allocatedStock,
        lowThreshold,
        status,
        searchIndex,
      };
    });
  }, [storeInventory, activeStoreId]);

  // Quick stats counts
  const stats = useMemo(() => {
    let lowCount = 0;
    let outCount = 0;
    let healthyCount = 0;
    let totalStockUnits = 0;

    for (let i = 0; i < processedItems.length; i++) {
      const p = processedItems[i];
      totalStockUnits += p.allocatedStock;
      if (p.status === 'out_of_stock') {
        outCount++;
      } else if (p.status === 'low_stock') {
        lowCount++;
      } else {
        healthyCount++;
      }
    }

    return {
      total: processedItems.length,
      lowCount,
      outCount,
      healthyCount,
      totalStockUnits,
    };
  }, [processedItems]);

  // Fast filtering using pre-computed searchIndex and status
  const filteredItems = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return processedItems.filter((p) => {
      // Category filter
      if (selectedCategory !== 'all' && p.item.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === 'low_stock' && p.status !== 'low_stock' && p.status !== 'out_of_stock') {
        return false;
      }
      if (statusFilter === 'out_of_stock' && p.status !== 'out_of_stock') {
        return false;
      }
      if (statusFilter === 'in_stock' && p.status !== 'in_stock') {
        return false;
      }

      // Search query
      if (query && !p.searchIndex.includes(query)) {
        return false;
      }

      return true;
    });
  }, [processedItems, selectedCategory, statusFilter, deferredSearch]);

  // Fast sorting
  const sortedItems = useMemo(() => {
    const itemsCopy = [...filteredItems];

    itemsCopy.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'stock':
          comparison = a.allocatedStock - b.allocatedStock;
          break;
        case 'name':
          comparison = a.item.name.localeCompare(b.item.name);
          break;
        case 'price':
          comparison = a.item.sellingPrice - b.item.sellingPrice;
          break;
        case 'category':
          comparison = a.item.category.localeCompare(b.item.category);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return itemsCopy;
  }, [filteredItems, sortField, sortDirection]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, safeCurrentPage, pageSize]);

  // Handle sort click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'stock' ? 'asc' : 'asc');
    }
    setCurrentPage(1);
  };

  // Reset pagination on filter change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: StockStatusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSelectedCategory('all');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // Export current filtered inventory as CSV
  const handleExportCSV = () => {
    const headers = [
      'SKU',
      'Item Name',
      'Barcode',
      'Category',
      'Store Allocated Stock',
      'Unit',
      'Low Stock Threshold',
      'Selling Price (INR)',
      'Status',
    ];

    const rows = sortedItems.map((p) => [
      p.item.sku || '',
      `"${p.item.name.replace(/"/g, '""')}"`,
      p.item.barcode || '',
      `"${p.item.category}"`,
      p.allocatedStock,
      p.item.unit || 'units',
      p.lowThreshold,
      p.item.sellingPrice,
      p.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `${currentStore.name.replace(/\s+/g, '_')}_Stock_Inventory_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startIndex = sortedItems.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIndex = Math.min(safeCurrentPage * pageSize, sortedItems.length);

  return (
    <div className="space-y-4">
      {/* Top Banner with Quick Actions */}
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-amber-900 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-200/70 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
            <Package className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-amber-950">
                {currentStore.name} — Stock Inventory
              </h3>
              <span className="bg-amber-200/80 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {stats.total} SKUs
              </span>
            </div>
            <p className="text-[11px] text-amber-800/90 mt-0.5 max-w-xl leading-relaxed">
              Real-time store stock synchronized across POS checkout stations and warehouse replenishment dispatches.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl bg-white border border-amber-200 text-amber-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:bg-amber-100/50 transition-colors cursor-pointer"
            title="Export filtered stock list to CSV"
          >
            <Download className="w-3.5 h-3.5 text-amber-700" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenCreateIndent(null)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-amber-600/20 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>Order Stock from Warehouse</span>
          </button>
        </div>
      </div>

      {/* KPI Status Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={() => handleStatusFilterChange('all')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">
            Total Catalog SKUs
          </div>
          <div className="text-xl font-black font-mono mt-0.5">{stats.total}</div>
          <div className="text-[10px] opacity-70 mt-0.5">{stats.totalStockUnits} total units in store</div>
        </button>

        <button
          type="button"
          onClick={() => handleStatusFilterChange('low_stock')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'low_stock'
              ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
              : 'bg-amber-50/60 border-amber-200 text-amber-900 hover:bg-amber-100/50'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-between">
            <span>Low Stock Alert</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black font-mono mt-0.5">
            {stats.lowCount + stats.outCount}
          </div>
          <div className="text-[10px] opacity-80 mt-0.5">At or below reorder threshold</div>
        </button>

        <button
          type="button"
          onClick={() => handleStatusFilterChange('out_of_stock')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'out_of_stock'
              ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
              : 'bg-rose-50/50 border-rose-200 text-rose-900 hover:bg-rose-100/50'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-between">
            <span>Out of Stock (0 Qty)</span>
            <XCircle className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black font-mono mt-0.5">{stats.outCount}</div>
          <div className="text-[10px] opacity-80 mt-0.5">Needs immediate indent replenishment</div>
        </button>

        <button
          type="button"
          onClick={() => handleStatusFilterChange('in_stock')}
          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'in_stock'
              ? 'bg-emerald-700 border-emerald-700 text-white shadow-xs'
              : 'bg-emerald-50/50 border-emerald-200 text-emerald-900 hover:bg-emerald-100/50'
          }`}
        >
          <div className="text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-between">
            <span>Healthy Stock</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-black font-mono mt-0.5">{stats.healthyCount}</div>
          <div className="text-[10px] opacity-80 mt-0.5">Optimal inventory levels</div>
        </button>
      </div>

      {/* Search, Category Filter & Page Size Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Fast search by product name, SKU, or barcode..."
            value={searchInput}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-amber-500 font-medium"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setCurrentPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Rows Per Page */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
            <span className="text-[11px] font-medium text-slate-500">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          {(searchInput || selectedCategory !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh inventory"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="p-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            <span className="font-extrabold text-slate-800">
              Showing {startIndex}–{endIndex} of {sortedItems.length} SKUs
            </span>
            {sortedItems.length !== storeInventory.length && (
              <span className="text-[11px] text-slate-500">
                (Filtered from {storeInventory.length} total)
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            Click column headers to sort • Default sorted by lowest stock
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200 select-none">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Product Details & SKU</span>
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-600" /> : <ArrowDown className="w-3 h-3 text-amber-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Category</span>
                    {sortField === 'category' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-600" /> : <ArrowDown className="w-3 h-3 text-amber-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('price')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Selling Price</span>
                    {sortField === 'price' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-600" /> : <ArrowDown className="w-3 h-3 text-amber-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('stock')}
                  className="py-3 px-4 cursor-pointer hover:bg-slate-100/80 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Store Allocated Stock</span>
                    {sortField === 'stock' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-600" /> : <ArrowDown className="w-3 h-3 text-amber-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4 text-right">Warehouse Requisition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 space-y-2">
                    <Package className="w-8 h-8 mx-auto text-slate-300" />
                    <div className="font-semibold text-slate-600 text-xs">No matching SKUs found</div>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Try clearing filters or adjusting your search keywords.
                    </p>
                    {(searchInput || selectedCategory !== 'all' || statusFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="mt-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedItems.map(({ item, allocatedStock, lowThreshold, status }) => {
                  const isLow = status === 'low_stock' || status === 'out_of_stock';
                  const isOut = status === 'out_of_stock';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isOut ? 'bg-rose-50/20' : isLow ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Product Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs">{item.name}</div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                          <span>SKU: {item.sku || 'N/A'}</span>
                          {item.barcode && (
                            <>
                              <span>•</span>
                              <span>Bar: {item.barcode}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {item.category}
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        ₹{item.sellingPrice.toFixed(2)}
                      </td>

                      {/* Store Allocated Stock */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-black text-xs ${
                              isOut
                                ? 'text-rose-600'
                                : isLow
                                ? 'text-amber-600'
                                : 'text-slate-900'
                            }`}
                          >
                            {allocatedStock} {item.unit || 'units'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Threshold: {lowThreshold} {item.unit || 'units'}
                        </div>
                      </td>

                      {/* Stock Status */}
                      <td className="py-3 px-4">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            In Stock
                          </span>
                        )}
                      </td>

                      {/* Warehouse Requisition Button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenCreateIndent(item)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            isLow
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title={`Order ${item.name} from Central Warehouse`}
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Indent</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {sortedItems.length > 0 && (
          <div className="p-3.5 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 font-medium text-[11px]">
              Page <strong className="text-slate-800 font-mono">{safeCurrentPage}</strong> of{' '}
              <strong className="text-slate-800 font-mono">{totalPages}</strong> (
              {sortedItems.length} items total)
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="First page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="px-3 py-1 font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
                {safeCurrentPage}
              </div>

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Last page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
