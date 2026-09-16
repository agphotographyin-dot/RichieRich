import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  Boxes,
  Search,
  ArrowUpDown,
  Truck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Sparkles,
  Layers,
  Phone,
  ShieldCheck,
  RefreshCw,
  Building2,
  Tag,
  X,
  FileSpreadsheet,
  Check,
  Edit3,
  Save,
  PhoneCall,
  ChevronDown,
  Clock,
  TrendingUp,
  Percent,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { StoreLocation, InventoryItem } from '../../../types';
import { Warehouse, StockTransfer } from '../../../types/warehouse';
import { CURRENCY, storage } from '../../../services/storage';
import { pdfReportService } from '../../../services/pdfReportService';
import { soundEffects } from '../../../services/audio';

interface WarehouseStoreStockViewProps {
  stores: StoreLocation[];
  inventory: InventoryItem[];
  warehouses: Warehouse[];
  searchQuery?: string;
  onOpenTransferModal: (initialData?: Partial<StockTransfer>) => void;
  onOpenIndentModal: () => void;
}

export const WarehouseStoreStockView: React.FC<WarehouseStoreStockViewProps> = ({
  stores,
  inventory,
  warehouses,
  searchQuery: initialSearch = '',
  onOpenTransferModal,
  onOpenIndentModal,
}) => {
  // Sub-view tab navigation matching Master Inventory
  const [activeSubView, setActiveSubView] = useState<
    'single_store' | 'matrix' | 'urgent' | 'overview'
  >('single_store');

  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || 'gota');
  const [localSearch, setLocalSearch] = useState<string>(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<
    'all' | 'healthy' | 'low' | 'out_of_stock'
  >('all');
  const [sortBy, setSortBy] = useState<
    'stock_desc' | 'stock_asc' | 'valuation_desc' | 'name_asc' | 'category'
  >('stock_desc');

  // Master Inventory pagination & loading engine
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(25);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);

  // Quick Physical Count Adjustment Modal
  const [adjustingItem, setAdjustingItem] = useState<{
    item: InventoryItem;
    store: StoreLocation;
    currentQty: number;
  } | null>(null);
  const [adjustedQty, setAdjustedQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Physical Store Stock Count Audit');
  const [adjustAuditor, setAdjustAuditor] = useState<string>('Store & Warehouse Auditor');
  const [adjustSuccessMsg, setAdjustSuccessMsg] = useState<string>('');

  // Store Contact Number Inline Editing
  const [isEditingContact, setIsEditingContact] = useState<boolean>(false);
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactFeedback, setContactFeedback] = useState<string>('');

  const currentStore = useMemo(() => {
    return stores.find((s) => s.id === selectedStoreId) || stores[0];
  }, [stores, selectedStoreId]);

  // Sync external search query
  useEffect(() => {
    if (initialSearch !== undefined) {
      setLocalSearch(initialSearch);
    }
  }, [initialSearch]);

  // Reset pagination to page 1 whenever any filter or subview changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStoreId, localSearch, selectedCategory, stockStatusFilter, sortBy, activeSubView]);

  // Sync contact phone
  useEffect(() => {
    if (currentStore) {
      setContactPhone(currentStore.phone || '');
      setIsEditingContact(false);
      setContactFeedback('');
    }
  }, [currentStore?.id]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    soundEffects.playClick();
    setTimeout(() => {
      setIsLoading(false);
    }, 150);
  };

  const handleSaveContact = () => {
    if (!currentStore) return;
    const trimmed = contactPhone.trim();
    if (!trimmed) return;

    storage.updateStore(currentStore.id, { phone: trimmed });
    setIsEditingContact(false);
    setContactFeedback('Phone updated');
    setTimeout(() => setContactFeedback(''), 3000);
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return ['all', ...Array.from(set)];
  }, [inventory]);

  // High-performance single-pass metrics calculation
  const { storeStatsMap, networkAllocatedUnits, networkAllocatedValuation, totalLowAlertsCount } =
    useMemo(() => {
      const map: Record<
        string,
        {
          totalUnits: number;
          totalValuationCost: number;
          totalValuationRetail: number;
          lowStockCount: number;
          outOfStockCount: number;
          healthyCount: number;
        }
      > = {};

      stores.forEach((st) => {
        map[st.id] = {
          totalUnits: 0,
          totalValuationCost: 0,
          totalValuationRetail: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          healthyCount: 0,
        };
      });

      let netUnits = 0;
      let netValuation = 0;
      let lowAlerts = 0;

      inventory.forEach((item) => {
        const alloc = item.storeAllocations || {};
        const storeLowThreshold = Math.max(2, Math.round(item.lowStockThreshold * 0.4));

        stores.forEach((st) => {
          const qty = alloc[st.id] || 0;
          const stStat = map[st.id];
          if (stStat) {
            stStat.totalUnits += qty;
            stStat.totalValuationCost += qty * item.costPrice;
            stStat.totalValuationRetail += qty * item.sellingPrice;

            if (qty <= 0) {
              stStat.outOfStockCount++;
              lowAlerts++;
            } else if (qty <= storeLowThreshold) {
              stStat.lowStockCount++;
              lowAlerts++;
            } else {
              stStat.healthyCount++;
            }
          }
          netUnits += qty;
          netValuation += qty * item.costPrice;
        });
      });

      return {
        storeStatsMap: map,
        networkAllocatedUnits: netUnits,
        networkAllocatedValuation: netValuation,
        totalLowAlertsCount: lowAlerts,
      };
    }, [inventory, stores]);

  const currentStoreStats = currentStore
    ? storeStatsMap[currentStore.id] || {
        totalUnits: 0,
        totalValuationCost: 0,
        totalValuationRetail: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        healthyCount: 0,
      }
    : {
        totalUnits: 0,
        totalValuationCost: 0,
        totalValuationRetail: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        healthyCount: 0,
      };

  // 1. Single Store Items Filtering & Sorting
  const effectiveSearch = localSearch.trim().toLowerCase();
  const filteredSingleStoreItems = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        !effectiveSearch ||
        item.name.toLowerCase().includes(effectiveSearch) ||
        item.sku.toLowerCase().includes(effectiveSearch) ||
        (item.category && item.category.toLowerCase().includes(effectiveSearch));

      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;

      const alloc = item.storeAllocations || {};
      const storeQty = alloc[selectedStoreId] || 0;
      const storeLowThreshold = Math.max(2, Math.round(item.lowStockThreshold * 0.4));

      let matchesStatus = true;
      if (stockStatusFilter === 'healthy') {
        matchesStatus = storeQty > storeLowThreshold;
      } else if (stockStatusFilter === 'low') {
        matchesStatus = storeQty > 0 && storeQty <= storeLowThreshold;
      } else if (stockStatusFilter === 'out_of_stock') {
        matchesStatus = storeQty <= 0;
      }

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [inventory, effectiveSearch, selectedCategory, stockStatusFilter, selectedStoreId]);

  const sortedSingleStoreItems = useMemo(() => {
    const list = [...filteredSingleStoreItems];
    list.sort((a, b) => {
      const aAlloc = a.storeAllocations || {};
      const bAlloc = b.storeAllocations || {};
      const aQty = aAlloc[selectedStoreId] || 0;
      const bQty = bAlloc[selectedStoreId] || 0;

      if (sortBy === 'stock_desc') return bQty - aQty;
      if (sortBy === 'stock_asc') return aQty - bQty;
      if (sortBy === 'valuation_desc') return bQty * b.costPrice - aQty * a.costPrice;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'category') return (a.category || '').localeCompare(b.category || '');
      return 0;
    });
    return list;
  }, [filteredSingleStoreItems, sortBy, selectedStoreId]);

  // Paginated items for single store
  const paginatedSingleStoreItems = useMemo(() => {
    if (pageSize === 'all') return sortedSingleStoreItems;
    const start = (currentPage - 1) * pageSize;
    return sortedSingleStoreItems.slice(start, start + pageSize);
  }, [sortedSingleStoreItems, currentPage, pageSize]);

  // 2. Matrix Items Filtering
  const filteredMatrixItems = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        !effectiveSearch ||
        item.name.toLowerCase().includes(effectiveSearch) ||
        item.sku.toLowerCase().includes(effectiveSearch) ||
        (item.category && item.category.toLowerCase().includes(effectiveSearch));

      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [inventory, effectiveSearch, selectedCategory]);

  const paginatedMatrixItems = useMemo(() => {
    if (pageSize === 'all') return filteredMatrixItems;
    const start = (currentPage - 1) * pageSize;
    return filteredMatrixItems.slice(start, start + pageSize);
  }, [filteredMatrixItems, currentPage, pageSize]);

  // 3. Urgent Replenishment Items
  const urgentReplenishmentItems = useMemo(() => {
    const list: {
      item: InventoryItem;
      store: StoreLocation;
      storeQty: number;
      centralQty: number;
      threshold: number;
      deficit: number;
    }[] = [];

    inventory.forEach((item) => {
      const alloc = item.storeAllocations || {};
      const storeLowThreshold = Math.max(2, Math.round(item.lowStockThreshold * 0.4));
      const centralQty = item.stockQuantity;

      stores.forEach((st) => {
        if (selectedStoreId !== 'all' && st.id !== selectedStoreId) return;

        const storeQty = alloc[st.id] || 0;
        if (storeQty <= storeLowThreshold) {
          list.push({
            item,
            store: st,
            storeQty,
            centralQty,
            threshold: storeLowThreshold,
            deficit: Math.max(0, storeLowThreshold - storeQty) + 15,
          });
        }
      });
    });

    return list;
  }, [inventory, stores, selectedStoreId]);

  const paginatedUrgentItems = useMemo(() => {
    if (pageSize === 'all') return urgentReplenishmentItems;
    const start = (currentPage - 1) * pageSize;
    return urgentReplenishmentItems.slice(start, start + pageSize);
  }, [urgentReplenishmentItems, currentPage, pageSize]);

  // Adjust count save
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;

    const updatedAllocations = {
      ...(adjustingItem.item.storeAllocations || {}),
      [adjustingItem.store.id]: adjustedQty,
    };

    storage.updateInventoryItem(adjustingItem.item.id, {
      storeAllocations: updatedAllocations,
    });
    soundEffects.playSuccessChime();
    setAdjustSuccessMsg(`Stock count for ${adjustingItem.item.name} updated!`);
    setTimeout(() => {
      setAdjustingItem(null);
      setAdjustSuccessMsg('');
    }, 1200);
  };

  // Export to Excel
  const handleExportExcel = () => {
    soundEffects.playClick();
    const rows = inventory.map((item) => {
      const alloc = item.storeAllocations || {};
      const row: Record<string, any> = {
        SKU: item.sku,
        'Item Name': item.name,
        Category: item.category,
        Unit: item.unit,
        'Landed Unit Cost (₹)': item.costPrice,
        'Retail Price (₹)': item.sellingPrice,
        'Central WH Hub Stock': item.stockQuantity,
      };

      stores.forEach((st) => {
        row[`${st.shortName || st.name} Stock`] = alloc[st.id] || 0;
      });

      const storeTotal = stores.reduce((sum, s) => sum + (alloc[s.id] || 0), 0);
      row['Total Store Stock'] = storeTotal;
      row['Network Total Stock'] = item.stockQuantity + storeTotal;
      row['Total Network Valuation (₹)'] = (item.stockQuantity + storeTotal) * item.costPrice;

      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Store Allocations');
    XLSX.writeFile(wb, `Store_Stock_Allocations_${new Date().toISOString().split('T')[0]}.xlsx`);
    setIsExportMenuOpen(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    soundEffects.playClick();
    if (!currentStore) return;
    const rows = [
      ['Store ID', 'Store Name', 'SKU', 'Item Name', 'Category', 'Store Stock', 'Unit', 'Cost', 'Retail', 'Valuation'],
    ];

    inventory.forEach((item) => {
      const alloc = item.storeAllocations || {};
      const storeQty = alloc[currentStore.id] || 0;
      rows.push([
        currentStore.id,
        currentStore.name,
        item.sku,
        `"${item.name.replace(/"/g, '""')}"`,
        item.category,
        storeQty.toString(),
        item.unit,
        item.costPrice.toString(),
        item.sellingPrice.toString(),
        (storeQty * item.costPrice).toString(),
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Store_Stock_${currentStore.shortName || currentStore.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
  };

  const handleExportPDF = () => {
    soundEffects.playClick();
    if (currentStore) {
      pdfReportService.exportStoreStockPDF(currentStore, inventory);
      setIsExportMenuOpen(false);
    }
  };

  const handlePrint = () => {
    soundEffects.playClick();
    setIsExportMenuOpen(false);
    window.print();
  };

  // Pagination controller
  const renderPagination = (current: number, totalRecords: number, onPageChange: (p: number) => void) => {
    const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalRecords / (pageSize as number)));
    const start = pageSize === 'all' ? 1 : (current - 1) * (pageSize as number) + 1;
    const end = pageSize === 'all' ? totalRecords : Math.min(totalRecords, current * (pageSize as number));

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-slate-50 border-t border-slate-200 text-xs">
        <div className="text-slate-600 font-medium">
          Showing <span className="font-bold text-slate-900">{totalRecords === 0 ? 0 : start}</span> to{' '}
          <span className="font-bold text-slate-900">{end}</span> of{' '}
          <span className="font-bold text-slate-900">{totalRecords}</span> items
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px] font-semibold">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                setPageSize(val);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 cursor-pointer focus:outline-hidden"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All ({totalRecords})</option>
            </select>
          </div>

          {pageSize !== 'all' && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={current <= 1}
                onClick={() => onPageChange(Math.max(1, current - 1))}
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  current <= 1
                    ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs'
                }`}
              >
                Previous
              </button>

              <div className="px-2.5 py-1 text-xs font-bold text-slate-700 font-mono">
                {current} / {totalPages}
              </div>

              <button
                type="button"
                disabled={current >= totalPages}
                onClick={() => onPageChange(Math.min(totalPages, current + 1))}
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  current >= totalPages
                    ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar (Master Inventory Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/80 shrink-0">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Store Stock Allocation Hub
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold font-mono">
                  {stores.length} Outlets ({networkAllocatedUnits.toLocaleString()} Store Units)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-outlet inventory allocations, live POS branch counts, replenishment, and physical audits.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh */}
          <button
            onClick={handleManualRefresh}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-emerald-200 shadow-xs"
            title="Recalculate balances and reload"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-700 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Raise Indent */}
          <button
            onClick={onOpenIndentModal}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-300" />
            <span>Raise Indent</span>
          </button>

          {/* Replenish Transfer */}
          <button
            onClick={() =>
              onOpenTransferModal({
                destinationId: currentStore.id,
                destinationName: currentStore.name,
                destinationType: 'store',
                type: 'warehouse_to_store',
              })
            }
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>Replenish Store</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {isExportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Store Stock Exports
                  </div>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold block text-slate-900">Export Excel (.xlsx)</span>
                      <span className="text-[10px] text-slate-500">All store allocations matrix</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <span className="font-bold block text-slate-900">Export Store CSV (.csv)</span>
                      <span className="text-[10px] text-slate-500">Active store inventory</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="w-full px-3 py-2 text-left hover:bg-rose-50 text-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <span className="font-bold block text-slate-900">Export Audit PDF</span>
                      <span className="text-[10px] text-slate-500">Signed store valuation report</span>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <span className="font-bold block text-slate-900">Print Store Sheet</span>
                      <span className="text-[10px] text-slate-500">Physical audit sheet</span>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Executive Metric KPI Cards (Master Inventory Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outlets */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Retail Outlets</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
            {stores.length} Stores
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
            <span className="font-medium text-emerald-700">
              {stores.filter((s) => s.is24x7).length} 24x7 Branches
            </span>
            <span>•</span>
            <span>Live Sync</span>
          </div>
        </div>

        {/* Network Store Units */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Store Allocated Stock</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-950 tracking-tight">
            {networkAllocatedUnits.toLocaleString()} units
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
            <span className="font-medium text-slate-700">{inventory.length} Product SKUs</span>
          </div>
        </div>

        {/* Total Outlets Valuation */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Total Store Valuation</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 tracking-tight">
            {CURRENCY}{networkAllocatedValuation.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
            <span className="font-medium text-slate-700">Landed FIFO Cost Basis</span>
          </div>
        </div>

        {/* Replenishment Alerts */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Outlet Replenish Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-600 tracking-tight">
            {urgentReplenishmentItems.length} Urgent SKUs
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
            <span className="font-medium text-amber-700">Stock &lt; min outlet threshold</span>
          </div>
        </div>
      </div>

      {/* 3. Sub-View Navigation Tabs (Master Inventory Pattern) */}
      <div className="flex items-center gap-1.5 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <button
          onClick={() => {
            setActiveSubView('single_store');
            soundEffects.playClick();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubView === 'single_store'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>Store Stock by Outlet</span>
        </button>

        <button
          onClick={() => {
            setActiveSubView('matrix');
            soundEffects.playClick();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubView === 'matrix'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Cross-Store Balancing Matrix</span>
        </button>

        <button
          onClick={() => {
            setActiveSubView('urgent');
            soundEffects.playClick();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubView === 'urgent'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Replenishment Queue</span>
          {urgentReplenishmentItems.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeSubView === 'urgent' ? 'bg-white text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {urgentReplenishmentItems.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveSubView('overview');
            soundEffects.playClick();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeSubView === 'overview'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Outlet Comparison & Margins</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* SUB-VIEW 1: STORE STOCK BY OUTLET                           */}
      {/* ============================================================ */}
      {activeSubView === 'single_store' && (
        <div className="space-y-4">
          {/* Outlet Quick Selector Bar */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto p-0.5">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap flex items-center gap-1.5 mr-1">
                <Store className="w-4 h-4 text-emerald-600" />
                <span>Select Outlet:</span>
              </span>
              {stores.map((st) => {
                const isSel = st.id === selectedStoreId;
                const stUnits = storeStatsMap[st.id]?.totalUnits || 0;
                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      setSelectedStoreId(st.id);
                      soundEffects.playClick();
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                      isSel
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{st.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md font-mono text-[10px] ${
                        isSel ? 'bg-slate-800 text-emerald-400' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {stUnits} units
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Compact Outlet Contact & Stats Pill */}
            <div className="flex items-center gap-3 text-xs text-slate-600 self-end sm:self-auto">
              {!isEditingContact ? (
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px]">
                  <PhoneCall className="w-3 h-3 text-emerald-600" />
                  <span className="font-mono text-slate-700">{currentStore.phone || 'No Phone'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setContactPhone(currentStore.phone || '');
                      setIsEditingContact(true);
                    }}
                    className="text-emerald-700 hover:text-emerald-800 font-bold ml-1 hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="px-2 py-0.5 border border-emerald-400 rounded text-xs w-32 font-mono"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveContact}
                    className="px-2 py-0.5 bg-emerald-600 text-white rounded text-xs font-bold"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingContact(false)}
                    className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
              {contactFeedback && (
                <span className="text-emerald-600 font-bold text-xs">{contactFeedback}</span>
              )}
            </div>
          </div>

          {/* Filter and Search Toolbar (Master Inventory Style) */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search store stock by name, SKU..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Category Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer font-semibold"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Chips */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                <button
                  onClick={() => setStockStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    stockStatusFilter === 'all'
                      ? 'bg-white shadow-xs font-bold text-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({sortedSingleStoreItems.length})
                </button>
                <button
                  onClick={() => setStockStatusFilter('healthy')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    stockStatusFilter === 'healthy'
                      ? 'bg-white shadow-xs font-bold text-emerald-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Healthy
                </button>
                <button
                  onClick={() => setStockStatusFilter('low')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    stockStatusFilter === 'low'
                      ? 'bg-white shadow-xs font-bold text-amber-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Low Stock
                </button>
                <button
                  onClick={() => setStockStatusFilter('out_of_stock')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    stockStatusFilter === 'out_of_stock'
                      ? 'bg-white shadow-xs font-bold text-rose-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Zero Stock
                </button>
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent focus:outline-none cursor-pointer font-semibold"
                >
                  <option value="stock_desc">Store Stock: High ➔ Low</option>
                  <option value="stock_asc">Store Stock: Low ➔ High</option>
                  <option value="valuation_desc">Valuation: High ➔ Low</option>
                  <option value="name_asc">Name: A ➔ Z</option>
                  <option value="category">Category</option>
                </select>
              </div>
            </div>
          </div>

          {/* Paginated Store Stock Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-center">Store Stock Qty</th>
                    <th className="py-3 px-3 text-center">Central Hub Avail</th>
                    <th className="py-3 px-3 text-right">Cost Price</th>
                    <th className="py-3 px-3 text-right">Retail Price</th>
                    <th className="py-3 px-3 text-right">Store Valuation</th>
                    <th className="py-3 px-3 text-center">Health Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSingleStoreItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                        No catalog items found matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedSingleStoreItems.map((item, idx) => {
                      const alloc = item.storeAllocations || {};
                      const storeQty = alloc[currentStore.id] || 0;
                      const storeLowThreshold = Math.max(2, Math.round(item.lowStockThreshold * 0.4));
                      const isLow = storeQty > 0 && storeQty <= storeLowThreshold;
                      const isOut = storeQty <= 0;
                      const centralStock = item.stockQuantity;

                      return (
                        <tr
                          key={item.id ? `${item.id}-${idx}` : `store-stock-${idx}`}
                          className="hover:bg-slate-50/80 transition-colors"
                        >
                          {/* Item Name & SKU */}
                          <td className="py-3 px-4 font-medium text-slate-900">
                            <div className="flex items-center gap-2.5">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                  <Boxes className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 line-clamp-1">{item.name}</div>
                                <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px] text-slate-400">
                                  <span>{item.sku}</span>
                                  <span>•</span>
                                  <span>{item.unit}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                              {item.category}
                            </span>
                          </td>

                          {/* Store Stock Qty */}
                          <td className="py-3 px-3 text-center">
                            <div className="font-mono font-bold text-sm">
                              <span
                                className={
                                  isOut
                                    ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md'
                                    : isLow
                                    ? 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md'
                                    : 'text-slate-900'
                                }
                              >
                                {storeQty} {item.unit}
                              </span>
                            </div>
                          </td>

                          {/* Central Hub Stock */}
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`font-mono font-bold text-xs ${
                                centralStock > 0 ? 'text-indigo-700' : 'text-slate-400'
                              }`}
                            >
                              {centralStock} {item.unit}
                            </span>
                          </td>

                          {/* Cost Price */}
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {CURRENCY}{item.costPrice}
                          </td>

                          {/* Retail Price */}
                          <td className="py-3 px-3 text-right font-mono text-slate-600">
                            {CURRENCY}{item.sellingPrice}
                          </td>

                          {/* Store Valuation */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {CURRENCY}{(storeQty * item.costPrice).toLocaleString('en-IN')}
                          </td>

                          {/* Health Status */}
                          <td className="py-3 px-3 text-center">
                            {isOut ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                Zero Stock
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Low Stock
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                Healthy
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                soundEffects.playClick();
                                setAdjustingItem({
                                  item,
                                  store: currentStore,
                                  currentQty: storeQty,
                                });
                                setAdjustedQty(storeQty);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-semibold text-[11px] transition-all cursor-pointer border border-slate-200 hover:border-emerald-300"
                              title="Audit and record physical count"
                            >
                              Audit Count
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {renderPagination(currentPage, sortedSingleStoreItems.length, setCurrentPage)}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUB-VIEW 2: CROSS-STORE MATRIX GRID                          */}
      {/* ============================================================ */}
      {activeSubView === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Cross-Store Balancing Matrix</span>
              </h3>
              <p className="text-xs text-slate-500">
                Balancing comparison across Central Warehouse Hub and all {stores.length} retail outlets
              </p>
            </div>

            {/* Category & Search Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter matrix items..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Paginated Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-700 border-b border-slate-200 uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-3">Cat</th>
                    <th className="py-3 px-3 text-center bg-indigo-50/50 text-indigo-900 border-x border-indigo-100">
                      Central WH
                    </th>
                    {stores.map((st) => (
                      <th key={st.id} className="py-3 px-3 text-center">
                        {st.shortName || st.id}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center font-bold">Network Total</th>
                    <th className="py-3 px-4 text-right">Total Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {paginatedMatrixItems.length === 0 ? (
                    <tr>
                      <td colSpan={5 + stores.length} className="py-12 text-center text-slate-400 font-sans text-xs">
                        No catalog items found matching the matrix filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedMatrixItems.map((item) => {
                      const alloc = item.storeAllocations || {};
                      const centralStock = item.stockQuantity;
                      const storeTotal = stores.reduce((sum, s) => sum + (alloc[s.id] || 0), 0);
                      const networkTotal = centralStock + storeTotal;
                      const totalValuation = networkTotal * item.costPrice;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors font-sans">
                          {/* Item Name */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 line-clamp-1">{item.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.category}
                            </span>
                          </td>

                          {/* Central WH Stock */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700 bg-indigo-50/30 border-x border-indigo-50">
                            {centralStock}
                          </td>

                          {/* Store Stock Columns */}
                          {stores.map((st) => {
                            const storeQty = alloc[st.id] || 0;
                            const threshold = Math.max(2, Math.round(item.lowStockThreshold * 0.4));
                            const isLow = storeQty > 0 && storeQty <= threshold;
                            const isOut = storeQty <= 0;

                            return (
                              <td
                                key={st.id}
                                className={`py-3 px-3 text-center font-mono font-semibold ${
                                  isOut
                                    ? 'text-rose-600 bg-rose-50/30 font-bold'
                                    : isLow
                                    ? 'text-amber-600 bg-amber-50/30 font-bold'
                                    : 'text-slate-700'
                                }`}
                              >
                                {storeQty}
                              </td>
                            );
                          })}

                          {/* Total Network Units */}
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-900 bg-slate-50/50">
                            {networkTotal} {item.unit}
                          </td>

                          {/* Total Valuation */}
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {CURRENCY}{totalValuation.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {renderPagination(currentPage, filteredMatrixItems.length, setCurrentPage)}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUB-VIEW 3: URGENT REPLENISHMENT QUEUE                       */}
      {/* ============================================================ */}
      {activeSubView === 'urgent' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-amber-900">
                  {urgentReplenishmentItems.length} Products Need Replenishment
                </span>
                <p className="text-amber-700 text-[11px] mt-0.5">
                  Items with branch inventory below safety thresholds or currently out of stock.
                </p>
              </div>
            </div>

            {/* Filter by store */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Filter Outlet:</span>
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="bg-white border border-amber-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800"
              >
                <option value="all">All Outlets</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-3">Store Branch</th>
                    <th className="py-3 px-3 text-center">Store Count</th>
                    <th className="py-3 px-3 text-center">Central Hub Avail</th>
                    <th className="py-3 px-3 text-center">Deficit Qty</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {paginatedUrgentItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        All stores have adequate stock! No replenishment alerts found.
                      </td>
                    </tr>
                  ) : (
                    paginatedUrgentItems.map((urg, idx) => (
                      <tr key={`${urg.item.id}-${urg.store.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{urg.item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{urg.item.sku}</div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {urg.store.name}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-md ${
                              urg.storeQty <= 0
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {urg.storeQty} {urg.item.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700">
                          {urg.centralQty} {urg.item.unit}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-rose-600">
                          +{urg.deficit} {urg.item.unit}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenTransferModal({
                                destinationId: urg.store.id,
                                destinationName: urg.store.name,
                                destinationType: 'store',
                                type: 'warehouse_to_store',
                                items: [
                                  {
                                    itemId: urg.item.id,
                                    name: urg.item.name,
                                    sku: urg.item.sku,
                                    category: urg.item.category,
                                    unit: urg.item.unit,
                                    unitCost: urg.item.costPrice,
                                    requestedQty: urg.deficit,
                                    dispatchedQty: urg.deficit,
                                    receivedQty: 0,
                                  },
                                ],
                              })
                            }
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 mx-auto cursor-pointer shadow-xs"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Dispatch</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {renderPagination(currentPage, urgentReplenishmentItems.length, setCurrentPage)}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SUB-VIEW 4: OUTLET OVERVIEW & MARGINS                        */}
      {/* ============================================================ */}
      {activeSubView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stores.map((st) => {
            const stStats = storeStatsMap[st.id] || {
              totalUnits: 0,
              totalValuationCost: 0,
              totalValuationRetail: 0,
              lowStockCount: 0,
              outOfStockCount: 0,
              healthyCount: 0,
            };
            const marginPct =
              stStats.totalValuationRetail > 0
                ? Math.round(
                    ((stStats.totalValuationRetail - stStats.totalValuationCost) /
                      stStats.totalValuationRetail) *
                      100
                  )
                : 0;

            return (
              <div
                key={st.id}
                className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      {st.shortName || st.id}
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 line-clamp-1 mt-0.5">
                      {st.name}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100">
                    {st.is24x7 ? '24x7' : 'Standard'}
                  </span>
                </div>

                <div className="space-y-2 text-xs border-y border-slate-100 py-2.5 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-sans text-[11px]">Allocated Stock:</span>
                    <span className="font-bold text-slate-900">{stStats.totalUnits.toLocaleString()} units</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-sans text-[11px]">Cost Valuation:</span>
                    <span className="font-bold text-emerald-700">
                      {CURRENCY}{stStats.totalValuationCost.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-sans text-[11px]">Retail Valuation:</span>
                    <span className="font-bold text-amber-600">
                      {CURRENCY}{stStats.totalValuationRetail.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-sans text-[11px]">Est. Margin:</span>
                    <span className="font-bold text-indigo-600">{marginPct}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className={stStats.lowStockCount > 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>
                      {stStats.lowStockCount} Low
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className={stStats.outOfStockCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                      {stStats.outOfStockCount} Out
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStoreId(st.id);
                      setActiveSubView('single_store');
                      soundEffects.playClick();
                    }}
                    className="text-emerald-700 hover:text-emerald-800 font-bold text-xs hover:underline cursor-pointer"
                  >
                    View Stock ➔
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Quick Physical Store Count Adjustment Modal */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Store Stock Count Audit</h3>
                  <p className="text-[11px] text-slate-400">{adjustingItem.store.name}</p>
                </div>
              </div>
              <button
                onClick={() => setAdjustingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-4">
              {adjustSuccessMsg ? (
                <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-2.5 font-semibold text-xs animate-in fade-in">
                  <Check className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{adjustSuccessMsg}</span>
                </div>
              ) : (
                <>
                  {/* Item Details Box */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="font-bold text-slate-900">{adjustingItem.item.name}</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>SKU: {adjustingItem.item.sku}</span>
                      <span>Unit Cost: {CURRENCY}{adjustingItem.item.costPrice}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 font-semibold">
                      <span className="text-slate-600">Current Recorded Stock:</span>
                      <span className="text-indigo-700 font-mono font-bold">
                        {adjustingItem.currentQty} {adjustingItem.item.unit}
                      </span>
                    </div>
                  </div>

                  {/* Physical Count Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Actual Physical Stock Count at Store ({adjustingItem.item.unit})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={adjustedQty}
                      onChange={(e) => setAdjustedQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Count Difference:</span>
                      <span
                        className={`font-bold ${
                          adjustedQty - adjustingItem.currentQty < 0
                            ? 'text-rose-600'
                            : adjustedQty - adjustingItem.currentQty > 0
                            ? 'text-emerald-600'
                            : 'text-slate-600'
                        }`}
                      >
                        {adjustedQty - adjustingItem.currentQty > 0
                          ? `+${adjustedQty - adjustingItem.currentQty}`
                          : adjustedQty - adjustingItem.currentQty}{' '}
                        {adjustingItem.item.unit}
                      </span>
                    </div>
                  </div>

                  {/* Reason Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Audit / Discrepancy Reason
                    </label>
                    <select
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="Physical Store Stock Count Audit">Physical Store Stock Count Audit</option>
                      <option value="Damaged / Spoilage at Store">Damaged / Spoilage at Store</option>
                      <option value="POS Billing Discrepancy Reconciliation">POS Billing Discrepancy Reconciliation</option>
                      <option value="Sample / Customer Tasting Write-off">Sample / Customer Tasting Write-off</option>
                      <option value="Found Unrecorded Stock Surplus">Found Unrecorded Stock Surplus</option>
                    </select>
                  </div>

                  {/* Auditor Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Auditor / Authorized Incharge
                    </label>
                    <input
                      type="text"
                      value={adjustAuditor}
                      onChange={(e) => setAdjustAuditor(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setAdjustingItem(null)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                    >
                      Save Store Count
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
