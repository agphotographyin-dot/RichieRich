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
  Scan,
  Edit2,
  Trash2,
  Download,
  Printer,
  Sparkles,
  ArrowUpDown,
  PlusCircle,
  MinusCircle,
  Percent,
  Image as ImageIcon,
  Upload,
  Check,
  X,
  Barcode as BarcodeIcon,
  QrCode,
  Store,
  Eye,
} from 'lucide-react';
import { InventoryItem, Category } from '../../../types';
import { BatchRecord, Warehouse } from '../../../types/warehouse';
import { CURRENCY, storage } from '../../../services/storage';
import { pdfReportService } from '../../../services/pdfReportService';
import { BarcodeVisualizer } from '../../common/BarcodeVisualizer';
import { soundEffects } from '../../../services/audio';

interface WarehouseInventoryViewProps {
  inventory: InventoryItem[];
  batches: BatchRecord[];
  warehouses: Warehouse[];
  categories?: Category[];
  searchQuery: string;
  onOpenInwardBill: () => void;
  onOpenTransfer: () => void;
  onOpenAddItem?: () => void;
  onOpenRegisterBarcode?: (item?: InventoryItem) => void;
  onOpenScanner?: () => void;
}

const SAMPLE_PHOTO_PRESETS = [
  { name: 'Royal Meetha Paan', url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80' },
  { name: 'Chocolate Fire Paan', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80' },
  { name: 'Fresh Espresso Coffee', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80' },
  { name: 'Cold Brew / Frappe', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80' },
  { name: 'Silver Mukhwas', url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600&auto=format&fit=crop&q=80' },
  { name: 'Luxury Confections', url: 'https://images.unsplash.com/photo-1548848221-0c2e497ed557?w=600&auto=format&fit=crop&q=80' },
];

export const WarehouseInventoryView: React.FC<WarehouseInventoryViewProps> = ({
  inventory,
  batches,
  warehouses,
  categories: propCategories,
  searchQuery,
  onOpenInwardBill,
  onOpenTransfer,
  onOpenAddItem,
  onOpenRegisterBarcode,
  onOpenScanner,
}) => {
  const [activeSubView, setActiveSubView] = useState<'catalog' | 'batches' | 'store_allocations' | 'labels'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<
    'all' | 'low' | 'critical' | 'out_of_stock' | 'healthy' | 'high_margin' | 'tax_exempt'
  >('all');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [valuationType, setValuationType] = useState<'fifo' | 'avg'>('fifo');
  const [localSearch, setLocalSearch] = useState('');
  
  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'profit' | 'margin' | 'valuation'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Edit & Label Modals
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [printingLabelItem, setPrintingLabelItem] = useState<InventoryItem | null>(null);
  const [zoomPhotoItem, setZoomPhotoItem] = useState<InventoryItem | null>(null);

  // Categories extraction
  const categoriesList = propCategories && propCategories.length > 0 
    ? propCategories.map(c => c.name) 
    : ['all', ...Array.from(new Set(inventory.map((i) => i.category)))];

  // Filtering
  const effectiveSearch = (searchQuery || localSearch).trim().toLowerCase();
  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      !effectiveSearch ||
      item.name.toLowerCase().includes(effectiveSearch) ||
      item.sku.toLowerCase().includes(effectiveSearch) ||
      item.barcode.includes(effectiveSearch) ||
      item.category.toLowerCase().includes(effectiveSearch);

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    let matchesStatus = true;
    if (stockStatusFilter === 'low') {
      matchesStatus = item.stockQuantity <= item.lowStockThreshold && item.stockQuantity > 0;
    } else if (stockStatusFilter === 'critical') {
      matchesStatus = item.stockQuantity > 0 && item.stockQuantity <= Math.ceil(item.lowStockThreshold * 0.4);
    } else if (stockStatusFilter === 'out_of_stock') {
      matchesStatus = item.stockQuantity <= 0;
    } else if (stockStatusFilter === 'healthy') {
      matchesStatus = item.stockQuantity > item.lowStockThreshold;
    } else if (stockStatusFilter === 'high_margin') {
      matchesStatus = (item.marginPercentage || 0) >= 55;
    } else if (stockStatusFilter === 'tax_exempt') {
      matchesStatus = item.isTaxApplicable === false;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Sort
  const sortedInventory = [...filteredInventory].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'name') comp = a.name.localeCompare(b.name);
    else if (sortBy === 'stock') comp = a.stockQuantity - b.stockQuantity;
    else if (sortBy === 'profit') comp = (a.profitPerUnit || 0) - (b.profitPerUnit || 0);
    else if (sortBy === 'margin') comp = (a.marginPercentage || 0) - (b.marginPercentage || 0);
    else if (sortBy === 'valuation') comp = a.stockQuantity * a.costPrice - b.stockQuantity * b.costPrice;

    return sortOrder === 'asc' ? comp : -comp;
  });

  const handleStockAdjust = (id: string, delta: number) => {
    storage.adjustStock(id, delta, 'Warehouse Stock Stepper');
  };

  const handleDeleteItem = (item: InventoryItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}" (${item.sku}) from Master Inventory?`)) {
      storage.deleteInventoryItem(item.id);
      soundEffects.playClick();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingItem) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingItem({ ...editingItem, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    storage.updateInventoryItem(editingItem.id, {
      name: editingItem.name,
      sku: editingItem.sku,
      barcode: editingItem.barcode,
      category: editingItem.category,
      description: editingItem.description,
      costPrice: Number(editingItem.costPrice),
      sellingPrice: Number(editingItem.sellingPrice),
      stockQuantity: Number(editingItem.stockQuantity),
      lowStockThreshold: Number(editingItem.lowStockThreshold),
      unit: editingItem.unit,
      imageUrl: editingItem.imageUrl || '',
      isTaxApplicable: editingItem.isTaxApplicable !== false,
      taxRate: editingItem.isTaxApplicable !== false ? Number(editingItem.taxRate ?? 5) : 0,
      isAvailableForOnline: editingItem.isAvailableForOnline,
    });

    soundEffects.playClick();
    setEditingItem(null);
  };

  const handleExportPDF = () => {
    pdfReportService.exportInventoryValuationPDF(inventory);
    soundEffects.playClick();
  };

  const handleExportCSV = () => {
    const csv = storage.exportMonthlyAnalyticalReportCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Richie_Rich_Warehouse_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    soundEffects.playClick();
  };

  const totalValuation = inventory.reduce((sum, i) => sum + i.stockQuantity * i.costPrice, 0);
  const totalStockUnits = inventory.reduce((sum, i) => sum + i.stockQuantity, 0);
  const lowStockCount = inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold).length;

  return (
    <div className="space-y-5">
      {/* Primary Top Header & Universal Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Boxes className="w-6 h-6 text-indigo-600" />
              <span>Master Inventory & Catalog Hub</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold font-mono">
              {inventory.length} SKUs ({totalStockUnits} Units)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centralized product catalog, retail pricing, bill tax rules, FIFO batches, barcode binding, and multi-counter distribution.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenRegisterBarcode && (
            <button
              onClick={() => onOpenRegisterBarcode()}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-amber-400"
            >
              <BarcodeIcon className="w-4 h-4" />
              <span>Register Barcode</span>
            </button>
          )}

          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Scan className="w-3.5 h-3.5 text-amber-400" />
              <span>Scan Barcode</span>
            </button>
          )}

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-linear-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Export master inventory catalog and valuation matrix as PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF Report</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-2.5 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
            title="Export Raw CSV Data"
          >
            <span>CSV</span>
          </button>

          {onOpenAddItem && (
            <button
              onClick={onOpenAddItem}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-View Navigation Tabs & Live Valuation Pill */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-0.5">
          <button
            onClick={() => setActiveSubView('catalog')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubView === 'catalog'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Master Catalog & Pricing</span>
          </button>

          <button
            onClick={() => setActiveSubView('batches')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubView === 'batches'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>FIFO Batches & Expiry ({batches.length})</span>
          </button>

          <button
            onClick={() => setActiveSubView('store_allocations')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubView === 'store_allocations'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Store Outlets Matrix</span>
          </button>

          <button
            onClick={() => setActiveSubView('labels')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubView === 'labels'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarcodeIcon className="w-3.5 h-3.5" />
            <span>Barcode & Thermal Tags</span>
          </button>
        </div>

        {/* Valuation & Negative Protection Metrics */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">Negative Stock Guard:</span>
            <span>ACTIVE</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-extrabold font-mono">
            <span>Valuation:</span>
            <span className="text-indigo-700">{CURRENCY}{totalValuation.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={localSearch || searchQuery}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by SKU, Barcode, Product Name..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
          />
          {(localSearch || searchQuery) && (
            <button
              onClick={() => setLocalSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills & Stock Condition Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-bold rounded-xl px-3 py-2 focus:outline-hidden focus:border-indigo-400 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categoriesList.filter(c => c !== 'all').map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shrink-0">
            <button
              onClick={() => setStockStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stockStatusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({inventory.length})
            </button>
            <button
              onClick={() => setStockStatusFilter('low')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stockStatusFilter === 'low' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Low ({lowStockCount})
            </button>
            <button
              onClick={() => setStockStatusFilter('out_of_stock')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stockStatusFilter === 'out_of_stock' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Out of Stock
            </button>
            <button
              onClick={() => setStockStatusFilter('high_margin')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stockStatusFilter === 'high_margin' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              High Margin (&gt;55%)
            </button>
            <button
              onClick={() => setStockStatusFilter('tax_exempt')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stockStatusFilter === 'tax_exempt' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-indigo-700'
              }`}
            >
              0% Tax Exempt
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: MASTER PRODUCT CATALOG & PRICING TABLE                       */}
      {/* ========================================================================= */}
      {activeSubView === 'catalog' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Product & SKU</th>
                  <th className="py-3.5 px-3">Barcode</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3">Bill Tax</th>
                  <th className="py-3.5 px-3">Cost Price</th>
                  <th className="py-3.5 px-3">Retail Price</th>
                  <th className="py-3.5 px-3">Gross Margin</th>
                  <th className="py-3.5 px-4 text-center">Stock Level</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedInventory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold">No items matched your filter criteria.</p>
                    </td>
                  </tr>
                ) : (
                  sortedInventory.map((item) => {
                    const margin = item.marginPercentage || 
                      (item.sellingPrice > 0 ? Math.round(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100) : 0);
                    
                    const isLow = item.stockQuantity <= item.lowStockThreshold && item.stockQuantity > 0;
                    const isCritical = item.stockQuantity > 0 && item.stockQuantity <= Math.ceil(item.lowStockThreshold * 0.4);
                    const isOut = item.stockQuantity <= 0;

                    const alloc = item.storeAllocations || {};
                    const storesSum = Object.values(alloc).reduce<number>((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
                    const centralWHStock = Math.max(0, item.stockQuantity - storesSum);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Product Photo & Details */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {item.imageUrl ? (
                              <div
                                onClick={() => setZoomPhotoItem(item)}
                                className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 cursor-pointer hover:opacity-90 relative group"
                                title="Click to view full photo"
                              >
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            )}

                            <div>
                              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                <span>{item.name}</span>
                                {item.isAvailableForOnline === false && (
                                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-normal">
                                    Offline Only
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 mt-0.5">
                                <span>SKU: <strong className="text-slate-700">{item.sku}</strong></span>
                                <span>•</span>
                                <span>Min Safety: {item.lowStockThreshold} {item.unit}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Barcode & Print Trigger */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                              {item.barcode}
                            </span>
                            <button
                              onClick={() => setPrintingLabelItem(item)}
                              title="Print Barcode / Shelf Label"
                              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900 transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                            {item.category}
                          </span>
                        </td>

                        {/* Tax Applicability */}
                        <td className="py-3 px-3">
                          {item.isTaxApplicable !== false ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700">
                              {item.taxRate ?? 5}% GST
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-500">
                              0% Exempt
                            </span>
                          )}
                        </td>

                        {/* Cost Price */}
                        <td className="py-3 px-3 font-mono font-semibold text-slate-600">
                          {CURRENCY}{item.costPrice}
                        </td>

                        {/* Selling Price */}
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {CURRENCY}{item.sellingPrice}
                        </td>

                        {/* Gross Margin */}
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                              margin >= 55
                                ? 'bg-emerald-100 text-emerald-800'
                                : margin >= 30
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {margin}%
                          </span>
                        </td>

                        {/* Stock Level with Stepper */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleStockAdjust(item.id, -1)}
                                title="Decrease by 1"
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 flex items-center justify-center font-bold text-xs cursor-pointer border border-slate-200"
                              >
                                -
                              </button>
                              <span className="font-mono font-extrabold text-sm text-slate-900 min-w-[32px]">
                                {item.stockQuantity}
                              </span>
                              <button
                                onClick={() => handleStockAdjust(item.id, 1)}
                                title="Increase by 1"
                                className="w-5 h-5 rounded bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 flex items-center justify-center font-bold text-xs cursor-pointer border border-slate-200"
                              >
                                +
                              </button>
                            </div>

                            <div className="flex items-center gap-1 text-[10px]">
                              {isOut ? (
                                <span className="px-1.5 py-0.2 rounded font-bold bg-rose-600 text-white">OUT</span>
                              ) : isCritical ? (
                                <span className="px-1.5 py-0.2 rounded font-bold bg-rose-100 text-rose-800 animate-pulse">CRITICAL</span>
                              ) : isLow ? (
                                <span className="px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800">LOW</span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800">OK</span>
                              )}
                              <span className="text-slate-400 font-mono">WH: {centralWHStock} / Str: {storesSum}</span>
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingItem(item)}
                              title="Edit product parameters"
                              className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item)}
                              title="Delete from inventory"
                              className="p-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: CENTRAL BATCHES & FIFO EXPIRY TRACKING                        */}
      {/* ========================================================================= */}
      {activeSubView === 'batches' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Active Tracked Batches & Expiry Lifecycles</span>
              </h3>
              <p className="text-xs text-slate-500">
                Landed FIFO valuation, manufacturing timestamps, and shelf-life alert thresholds.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenInwardBill}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Inward New Batch (GRN)</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Batch Number</th>
                  <th className="py-3 px-3">Item / SKU</th>
                  <th className="py-3 px-3">Warehouse Hub</th>
                  <th className="py-3 px-3">Mfg Date</th>
                  <th className="py-3 px-3">Expiry Date</th>
                  <th className="py-3 px-3">Shelf Life</th>
                  <th className="py-3 px-3 text-center">Batch Stock</th>
                  <th className="py-3 px-3 text-right">Landed Cost</th>
                  <th className="py-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 font-sans">
                      No distinct batches logged yet. GRN Inward will auto-generate tracked FIFO batches.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{b.batchNumber}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-bold text-slate-800">{b.itemName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {b.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">{b.warehouseName}</td>
                      <td className="py-2.5 px-3 text-slate-500">{b.mfgDate}</td>
                      <td className="py-2.5 px-3 text-slate-700 font-semibold">{b.expiryDate}</td>
                      <td className="py-2.5 px-3">
                        {b.daysToExpiry <= 0 ? (
                          <span className="text-rose-600 font-bold">Expired</span>
                        ) : b.daysToExpiry <= 30 ? (
                          <span className="text-purple-600 font-bold">{b.daysToExpiry} days</span>
                        ) : (
                          <span className="text-slate-600">{b.daysToExpiry} days</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-indigo-700">
                        {b.quantityInStock} {b.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right">{CURRENCY}{b.unitCost}</td>
                      <td className="py-2.5 px-3 text-right font-sans">
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: STORE OUTLETS ALLOCATION MATRIX                              */}
      {/* ========================================================================= */}
      {activeSubView === 'store_allocations' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" />
                <span>Multi-Counter Store Stock Allocations</span>
              </h3>
              <p className="text-xs text-slate-500">Live distribution breakdown across retail branches and central storage.</p>
            </div>
            <button
              onClick={onOpenTransfer}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Dispatch Transfer</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Product Name & SKU</th>
                  <th className="py-3 px-3 text-center">Central WH</th>
                  <th className="py-3 px-3 text-center">Gota Outlet</th>
                  <th className="py-3 px-3 text-center">Bopal Outlet</th>
                  <th className="py-3 px-3 text-center">Sindhu Bhavan</th>
                  <th className="py-3 px-3 text-center">SG Highway</th>
                  <th className="py-3 px-3 text-center font-bold text-slate-900">Total All Locations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {sortedInventory.map((item) => {
                  const alloc = item.storeAllocations || {};
                  const gota = alloc['gota'] || 0;
                  const bopal = alloc['bopal'] || 0;
                  const sindhu = alloc['sindhubhavan'] || 0;
                  const sgh = alloc['sg_highway'] || 0;
                  const storesSum = gota + bopal + sindhu + sgh;
                  const central = Math.max(0, item.stockQuantity - storesSum);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-indigo-700">{central}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{gota}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{bopal}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{sindhu}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{sgh}</td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-slate-900 bg-slate-50/60">
                        {item.stockQuantity} {item.unit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: BARCODE & THERMAL PRICE TAGS                                 */}
      {/* ========================================================================= */}
      {activeSubView === 'labels' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <BarcodeIcon className="w-4 h-4 text-amber-600" />
                <span>Barcode Labels & Thermal Price Tags</span>
              </h3>
              <p className="text-xs text-slate-500">
                Click any tag to generate a full-page thermal shelf label ready for standard label printers.
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print Visible Grid</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sortedInventory.map((item) => (
              <div
                key={item.id}
                onClick={() => setPrintingLabelItem(item)}
                className="p-4 border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 flex flex-col items-center text-center space-y-2 group"
              >
                <div className="font-extrabold text-xs text-slate-900 truncate w-full group-hover:text-indigo-600 transition-colors">
                  {item.name}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">SKU: {item.sku}</div>
                <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-inner w-full flex items-center justify-center">
                  <BarcodeVisualizer value={item.barcode} height={40} fontSize={11} />
                </div>
                <div className="flex items-center justify-between w-full text-xs font-bold pt-1 border-t border-slate-200">
                  <span className="text-slate-500 text-[10px]">{item.category}</span>
                  <span className="font-mono text-emerald-700">{CURRENCY}{item.sellingPrice}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDIT PRODUCT DIALOG                                             */}
      {/* ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Edit Product: {editingItem.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">SKU: {editingItem.sku}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editingItem.category}
                    onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  >
                    {categoriesList.filter(c => c !== 'all').map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={editingItem.sku}
                    onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    required
                    value={editingItem.barcode}
                    onChange={(e) => setEditingItem({ ...editingItem, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cost Price ({CURRENCY})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={editingItem.costPrice}
                    onChange={(e) => setEditingItem({ ...editingItem, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price ({CURRENCY})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={editingItem.sellingPrice}
                    onChange={(e) => setEditingItem({ ...editingItem, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Low Stock Safety Threshold</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingItem.lowStockThreshold}
                    onChange={(e) => setEditingItem({ ...editingItem, lowStockThreshold: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unit of Measurement</label>
                  <input
                    type="text"
                    value={editingItem.unit || 'pieces'}
                    onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Tax Settings */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800">Bill Tax Applicability (GST)</span>
                  <p className="text-[11px] text-slate-500">Apply GST percentage on POS invoices for this item</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingItem.isTaxApplicable !== false}
                      onChange={(e) => setEditingItem({ ...editingItem, isTaxApplicable: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Taxable</span>
                  </label>
                  {editingItem.isTaxApplicable !== false && (
                    <input
                      type="number"
                      min="0"
                      max="28"
                      value={editingItem.taxRate ?? 5}
                      onChange={(e) => setEditingItem({ ...editingItem, taxRate: parseFloat(e.target.value) || 0 })}
                      className="w-16 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono font-bold"
                    />
                  )}
                </div>
              </div>

              {/* Photo Preset & Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Product Photo</label>
                <div className="flex items-center gap-3">
                  {editingItem.imageUrl && (
                    <img
                      src={editingItem.imageUrl}
                      alt="Preview"
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <input
                    type="text"
                    value={editingItem.imageUrl || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, imageUrl: e.target.value })}
                    placeholder="Image URL or pick a preset below..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                  />
                  <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer border border-slate-200">
                    <Upload className="w-3.5 h-3.5" />
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1">
                  {SAMPLE_PHOTO_PRESETS.map((p) => (
                    <button
                      type="button"
                      key={p.name}
                      onClick={() => setEditingItem({ ...editingItem, imageUrl: p.url })}
                      className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg whitespace-nowrap border border-slate-200"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PRINT INDIVIDUAL BARCODE / SHELF TAG DIALOG                      */}
      {/* ========================================================================= */}
      {printingLabelItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 text-center space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-indigo-600" />
                <span>Thermal Shelf Price Tag</span>
              </h3>
              <button
                onClick={() => setPrintingLabelItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Tag Container */}
            <div className="p-4 bg-white border-2 border-dashed border-slate-300 rounded-xl space-y-2 text-slate-900">
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Richie Rich Pan House</div>
              <div className="font-extrabold text-base">{printingLabelItem.name}</div>
              <div className="font-mono text-xs text-slate-500">SKU: {printingLabelItem.sku}</div>
              <div className="py-2 flex items-center justify-center">
                <BarcodeVisualizer value={printingLabelItem.barcode} height={50} fontSize={12} />
              </div>
              <div className="text-xl font-extrabold font-mono text-slate-900 border-t border-slate-200 pt-2">
                {CURRENCY}{printingLabelItem.sellingPrice.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400">Incl. of all taxes • MFD 2026</div>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Print Tag</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ZOOM PHOTO MODAL                                                */}
      {/* ========================================================================= */}
      {zoomPhotoItem && (
        <div
          onClick={() => setZoomPhotoItem(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden border border-slate-800 shadow-2xl"
          >
            <div className="relative">
              <img
                src={zoomPhotoItem.imageUrl}
                alt={zoomPhotoItem.name}
                className="w-full h-72 object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setZoomPhotoItem(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">{zoomPhotoItem.name}</h4>
                <p className="text-xs text-slate-500 font-mono">SKU: {zoomPhotoItem.sku} • {zoomPhotoItem.category}</p>
              </div>
              <div className="font-extrabold font-mono text-base text-emerald-700">
                {CURRENCY}{zoomPhotoItem.sellingPrice}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
