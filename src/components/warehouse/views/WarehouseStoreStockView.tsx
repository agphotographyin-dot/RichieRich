import React, { useState, useEffect } from 'react';
import {
  Store,
  Boxes,
  Search,
  Filter,
  ArrowUpDown,
  Truck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Sparkles,
  Layers,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  RefreshCw,
  Building2,
  Tag,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  X,
  FileSpreadsheet,
  Check,
  Edit3,
  Save,
  PhoneCall,
} from 'lucide-react';
import { StoreLocation, InventoryItem } from '../../../types';
import { Warehouse, StockTransfer } from '../../../types/warehouse';
import { CURRENCY, storage } from '../../../services/storage';
import { warehouseStorage } from '../../../services/warehouseStorage';
import { pdfReportService } from '../../../services/pdfReportService';

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
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || 'gota');
  const [viewMode, setViewMode] = useState<'individual' | 'matrix'>('individual');
  const [localSearch, setLocalSearch] = useState<string>(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'healthy' | 'low' | 'critical' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'stock_desc' | 'stock_asc' | 'valuation_desc' | 'name_asc' | 'category'>('stock_desc');

  // Adjustment Modal State
  const [adjustingItem, setAdjustingItem] = useState<{
    item: InventoryItem;
    store: StoreLocation;
    currentQty: number;
  } | null>(null);
  const [adjustedQty, setAdjustedQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Physical Store Stock Count Audit');
  const [adjustAuditor, setAdjustAuditor] = useState<string>('Store & Warehouse Auditor');
  const [adjustSuccessMsg, setAdjustSuccessMsg] = useState<string>('');

  // Store Contact Number Edit State
  const [isEditingContact, setIsEditingContact] = useState<boolean>(false);
  const [contactPhone, setContactPhone] = useState<string>('');
  const [contactSaveFeedback, setContactSaveFeedback] = useState<string>('');

  const currentStore = stores.find((s) => s.id === selectedStoreId) || stores[0];

  useEffect(() => {
    if (currentStore) {
      setContactPhone(currentStore.phone || '');
      setIsEditingContact(false);
      setContactSaveFeedback('');
    }
  }, [currentStore?.id]);

  const handleSaveContact = () => {
    if (!currentStore) return;
    const trimmed = contactPhone.trim();
    if (!trimmed) return;

    storage.updateStore(currentStore.id, { phone: trimmed });
    setIsEditingContact(false);
    setContactSaveFeedback('Contact number updated successfully!');
    setTimeout(() => setContactSaveFeedback(''), 3000);
  };
  const centralWh = warehouses[0] || {
    name: 'Central Warehouse',
    code: 'WH-AMD-01',
  };

  const categories = ['all', 'Paan', 'Cafe', 'Essentials'];

  // Calculate stats for each store
  const getStoreStats = (storeId: string) => {
    let totalUnits = 0;
    let totalValuationCost = 0;
    let totalValuationRetail = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let healthyCount = 0;

    inventory.forEach((item) => {
      const alloc = item.storeAllocations || {};
      const qty = alloc[storeId] || 0;
      totalUnits += qty;
      totalValuationCost += qty * item.costPrice;
      totalValuationRetail += qty * item.sellingPrice;

      const storeLowThreshold = Math.max(2, Math.round(item.lowStockThreshold * 0.4)); // Store specific proportional threshold
      if (qty <= 0) {
        outOfStockCount++;
      } else if (qty <= storeLowThreshold) {
        lowStockCount++;
      } else {
        healthyCount++;
      }
    });

    return {
      totalUnits,
      totalValuationCost,
      totalValuationRetail,
      lowStockCount,
      outOfStockCount,
      healthyCount,
    };
  };

  const currentStoreStats = currentStore ? getStoreStats(currentStore.id) : {
    totalUnits: 0,
    totalValuationCost: 0,
    totalValuationRetail: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    healthyCount: 0,
  };

  // Filtered items for selected individual store
  const filteredItems = inventory.filter((item) => {
    const q = localSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.barcode.includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)));

    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;

    const alloc = item.storeAllocations || {};
    const storeQty = alloc[selectedStoreId] || 0;
    const storeLowThreshold = Math.max(2, Math.round(item.lowStockThreshold * 0.4));

    let matchesStatus = true;
    if (stockStatusFilter === 'healthy') {
      matchesStatus = storeQty > storeLowThreshold;
    } else if (stockStatusFilter === 'low') {
      matchesStatus = storeQty > 0 && storeQty <= storeLowThreshold;
    } else if (stockStatusFilter === 'critical') {
      matchesStatus = storeQty > 0 && storeQty <= Math.ceil(storeLowThreshold * 0.5);
    } else if (stockStatusFilter === 'out_of_stock') {
      matchesStatus = storeQty <= 0;
    }

    return matchesSearch && matchesCat && matchesStatus;
  });

  // Sorting
  const sortedItems = [...filteredItems].sort((a, b) => {
    const allocA = a.storeAllocations || {};
    const allocB = b.storeAllocations || {};
    const qtyA = allocA[selectedStoreId] || 0;
    const qtyB = allocB[selectedStoreId] || 0;

    if (sortBy === 'stock_desc') return qtyB - qtyA;
    if (sortBy === 'stock_asc') return qtyA - qtyB;
    if (sortBy === 'valuation_desc') return qtyB * b.costPrice - qtyA * a.costPrice;
    if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
    if (sortBy === 'category') return a.category.localeCompare(b.category);
    return 0;
  });

  // Quick Dispatch handler
  const handleQuickTransfer = (item: InventoryItem) => {
    if (!currentStore) return;
    onOpenTransferModal({
      destinationId: currentStore.id,
      destinationName: currentStore.name,
      destinationType: 'store',
      type: 'warehouse_to_store',
      items: [
        {
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          unit: item.unit,
          requestedQty: Math.max(10, item.lowStockThreshold),
          dispatchedQty: Math.max(10, item.lowStockThreshold),
          receivedQty: 0,
          unitCost: item.costPrice,
          category: item.category,
        },
      ],
    });
  };

  // Open adjustment modal
  const handleOpenAdjust = (item: InventoryItem) => {
    if (!currentStore) return;
    const alloc = item.storeAllocations || {};
    const currentQty = alloc[currentStore.id] || 0;
    setAdjustingItem({
      item,
      store: currentStore,
      currentQty,
    });
    setAdjustedQty(currentQty);
    setAdjustReason('Physical Store Stock Count Audit');
    setAdjustSuccessMsg('');
  };

  // Save adjustment
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;

    warehouseStorage.adjustStoreStock(
      adjustingItem.item.id,
      adjustingItem.store.id,
      Number(adjustedQty),
      adjustReason,
      adjustAuditor
    );

    setAdjustSuccessMsg(`Successfully updated count for ${adjustingItem.item.name}!`);
    setTimeout(() => {
      setAdjustingItem(null);
      setAdjustSuccessMsg('');
    }, 1200);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!currentStore) return;
    const rows = [
      ['Store ID', 'Store Name', 'SKU', 'Item Name', 'Category', 'Store Stock Qty', 'Unit', 'Unit Cost (INR)', 'Retail Price (INR)', 'Store Valuation (INR)', 'Central WH Hub Stock', 'Status'],
    ];

    inventory.forEach((item) => {
      const alloc = item.storeAllocations || {};
      const storeQty = alloc[currentStore.id] || 0;
      const storeLowThreshold = Math.max(2, Math.round(item.lowStockThreshold * 0.4));
      const status = storeQty <= 0 ? 'Out of Stock' : storeQty <= storeLowThreshold ? 'Low Stock' : 'Healthy';
      const centralStock = item.stockQuantity;

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
        centralStock.toString(),
        status,
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Store_Stock_${currentStore.shortName || currentStore.id}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Store Stock PDF Report
  const handleExportPDF = () => {
    if (currentStore) {
      pdfReportService.exportStoreStockPDF(currentStore, inventory);
    }
  };

  // Print Inventory Sheet
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Mode Selector & Store Outlet Switcher Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100/80">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Individual Store Stock Explorer</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                  Live POS Linked
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Inspect real-time physical inventory, valuations, and low-stock alerts across retail branches
              </p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start md:self-auto text-xs font-semibold">
            <button
              onClick={() => setViewMode('individual')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'individual'
                  ? 'bg-white shadow-xs font-bold text-slate-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5 text-emerald-600" />
              <span>Single Store View</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white shadow-xs font-bold text-indigo-900'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>All Stores Comparison Grid</span>
            </button>
          </div>
        </div>

        {/* Store Selection Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stores.map((st) => {
            const stStats = getStoreStats(st.id);
            const isSelected = selectedStoreId === st.id && viewMode === 'individual';

            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  setSelectedStoreId(st.id);
                  setViewMode('individual');
                }}
                className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                      {st.shortName || st.id}
                    </span>
                    <h3 className="font-bold text-xs text-slate-900 mt-0.5 line-clamp-1">
                      {st.name}
                    </h3>
                  </div>
                  {stStats.lowStockCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                      {stStats.lowStockCount} Low
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-between text-xs border-t border-slate-100 pt-2 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans">Current Stock</span>
                    <span className="font-bold text-slate-900">{stStats.totalUnits.toLocaleString()} units</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block font-sans">Valuation</span>
                    <span className="font-bold text-emerald-700">{CURRENCY}{stStats.totalValuationCost.toLocaleString()}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Individual Store Mode View */}
      {viewMode === 'individual' && currentStore && (
        <div className="space-y-5">
          {/* Store Spotlight Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-emerald-500 text-slate-950">
                    Active Store Outlet
                  </span>
                  <span className="text-xs text-slate-300 font-mono bg-white/10 px-2 py-0.5 rounded">
                    STORE-{currentStore.id.toUpperCase()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {currentStore.is24x7 ? '24x7 Active POS' : 'Standard Shift'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  {currentStore.name}
                </h2>
                
                {/* Store Contact Details & Edit Option (Address Removed) */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-3 text-xs">
                  {!isEditingContact ? (
                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-mono text-slate-200">
                        {currentStore.phone || 'No phone number added'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setContactPhone(currentStore.phone || '');
                          setIsEditingContact(true);
                        }}
                        className="ml-1 text-[11px] text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Contact</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-amber-500/50 shadow-inner">
                      <Phone className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1.5" />
                      <input
                        type="text"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="Enter Store Contact (+91 ...)"
                        className="bg-slate-800 text-white font-mono text-xs px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-none focus:border-amber-400 w-48 sm:w-56"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveContact}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setContactPhone(currentStore.phone || '');
                          setIsEditingContact(false);
                        }}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {contactSaveFeedback && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold animate-fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{contactSaveFeedback}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenIndentModal()}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Raise Store Indent</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onOpenTransferModal({
                      destinationId: currentStore.id,
                      destinationName: currentStore.name,
                      destinationType: 'store',
                      type: 'warehouse_to_store',
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Truck className="w-4 h-4" />
                  <span>Replenish from Central Hub</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  title="Export Store Stock Audit PDF"
                  className="px-3 py-2 rounded-xl bg-linear-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  title="Export Store Stock CSV"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  title="Print Store Stock Sheet"
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick KPI Counters for this Store */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-0.5">
                <span className="text-[11px] text-slate-400">Total Units In Store</span>
                <div className="text-xl font-bold font-mono text-white">
                  {currentStoreStats.totalUnits.toLocaleString()} <span className="text-xs font-normal text-slate-400">units</span>
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-0.5">
                <span className="text-[11px] text-slate-400">Store Stock Value (Cost)</span>
                <div className="text-xl font-bold font-mono text-emerald-400">
                  {CURRENCY}{currentStoreStats.totalValuationCost.toLocaleString()}
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-0.5">
                <span className="text-[11px] text-slate-400">Retail Value Potential</span>
                <div className="text-xl font-bold font-mono text-amber-300">
                  {CURRENCY}{currentStoreStats.totalValuationRetail.toLocaleString()}
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-0.5">
                <span className="text-[11px] text-slate-400">Stock Health Alerts</span>
                <div className="text-xl font-bold font-mono flex items-center gap-2">
                  <span className={currentStoreStats.lowStockCount > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {currentStoreStats.lowStockCount} Low
                  </span>
                  <span className="text-xs text-slate-400">({currentStoreStats.outOfStockCount} Out)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Filter and Search Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search store stock by name, SKU..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all font-medium"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                  className="bg-transparent focus:outline-none cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories (3)' : `${cat} Category`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Health Status Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                <button
                  onClick={() => setStockStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    stockStatusFilter === 'all' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600'
                  }`}
                >
                  All ({inventory.length})
                </button>
                <button
                  onClick={() => setStockStatusFilter('healthy')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    stockStatusFilter === 'healthy' ? 'bg-white shadow-xs font-bold text-emerald-700' : 'text-slate-600'
                  }`}
                >
                  Healthy
                </button>
                <button
                  onClick={() => setStockStatusFilter('low')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    stockStatusFilter === 'low' ? 'bg-white shadow-xs font-bold text-amber-700' : 'text-slate-600'
                  }`}
                >
                  Low Stock
                </button>
                <button
                  onClick={() => setStockStatusFilter('out_of_stock')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    stockStatusFilter === 'out_of_stock' ? 'bg-white shadow-xs font-bold text-rose-700' : 'text-slate-600'
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
                  className="bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="stock_desc">Store Stock: High ➔ Low</option>
                  <option value="stock_asc">Store Stock: Low ➔ High</option>
                  <option value="valuation_desc">Valuation: High ➔ Low</option>
                  <option value="name_asc">Item Name: A ➔ Z</option>
                  <option value="category">Category</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. Store Stock Items Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
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
                  {sortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                        No catalog items found matching the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((item) => {
                      const alloc = item.storeAllocations || {};
                      const storeQty = alloc[currentStore.id] || 0;
                      const storeLowThreshold = Math.max(2, Math.round(item.lowStockThreshold * 0.4));
                      const isLow = storeQty > 0 && storeQty <= storeLowThreshold;
                      const isOut = storeQty <= 0;
                      const centralStock = item.stockQuantity; // Central WH available

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Item Name & SKU */}
                          <td className="py-3.5 px-4 font-medium text-slate-900">
                            <div className="flex items-center gap-3">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  referrerPolicy="no-referrer"
                                  className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                  <Boxes className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 line-clamp-1">{item.name}</div>
                                <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px] text-slate-400">
                                  <span>{item.sku}</span>
                                  <span>•</span>
                                  <span>{item.unit}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="py-3.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.category === 'Paan'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.category === 'Cafe'
                                  ? 'bg-amber-900/10 text-amber-900'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {item.category}
                            </span>
                          </td>

                          {/* Store Stock Qty */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="font-mono font-bold text-sm">
                              <span
                                className={
                                  isOut
                                    ? 'text-rose-600 font-extrabold'
                                    : isLow
                                    ? 'text-amber-600 font-extrabold'
                                    : 'text-slate-900'
                                }
                              >
                                {storeQty}
                              </span>{' '}
                              <span className="text-[10px] text-slate-400 font-sans font-normal">{item.unit}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Target Min: {storeLowThreshold}
                            </div>
                          </td>

                          {/* Central Hub Stock for comparison */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {centralStock} {item.unit}
                            </span>
                          </td>

                          {/* Cost Price */}
                          <td className="py-3.5 px-3 text-right font-mono text-slate-600">
                            {CURRENCY}{item.costPrice.toFixed(0)}
                          </td>

                          {/* Retail Selling Price */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                            {CURRENCY}{item.sellingPrice.toFixed(0)}
                          </td>

                          {/* Store Valuation */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {CURRENCY}{(storeQty * item.costPrice).toLocaleString('en-IN')}
                          </td>

                          {/* Health Status */}
                          <td className="py-3.5 px-3 text-center">
                            {isOut ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Low Stock ({storeQty})
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Healthy Stock
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleQuickTransfer(item)}
                                title="Quick dispatch from Central Hub to this store"
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Truck className="w-3 h-3" />
                                <span>Replenish</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenAdjust(item)}
                                title="Audit / Adjust physical store stock count"
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors cursor-pointer"
                              >
                                <span>Adjust</span>
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
        </div>
      )}

      {/* 3. Multi-Store Matrix Comparison Grid View */}
      {viewMode === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Cross-Store Inventory Balancing Matrix</span>
              </h3>
              <p className="text-xs text-slate-500">
                Side-by-side comparison across Central Hub and all 4 retail stores
              </p>
            </div>

            {/* Quick Category & Search Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter matrix items..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All (3)' : c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-700 border-b border-slate-200 uppercase tracking-wider text-[11px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-3">Cat</th>
                    <th className="py-3 px-3 text-center bg-indigo-50/50 text-indigo-900 border-x border-indigo-100">
                      Central WH Hub
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
                  {inventory
                    .filter((item) => {
                      const q = localSearch.toLowerCase().trim();
                      const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q);
                      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
                      return matchesSearch && matchesCat;
                    })
                    .map((item) => {
                      const alloc = item.storeAllocations || {};
                      const centralStock = item.stockQuantity;
                      const storeTotal = stores.reduce((sum, s) => sum + (alloc[s.id] || 0), 0);
                      const networkTotal = centralStock + storeTotal;
                      const totalValuation = networkTotal * item.costPrice;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors font-sans">
                          {/* Item Name */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.name}</div>
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
                    })}
                </tbody>
              </table>
            </div>
          </div>
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
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
                      <span className="text-slate-600">Current System Recorded Stock:</span>
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
                        {adjustedQty - adjustingItem.currentQty > 0 ? `+${adjustedQty - adjustingItem.currentQty}` : adjustedQty - adjustingItem.currentQty}{' '}
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
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
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
