import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Scan,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Download,
  Printer,
  Sparkles,
  ArrowUpDown,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Percent,
  Image as ImageIcon,
  Upload,
  Check,
  X,
  Barcode as BarcodeIcon,
  QrCode,
} from 'lucide-react';
import { InventoryItem, Category } from '../../types';
import { CURRENCY, storage } from '../../services/storage';
import { BarcodeVisualizer } from '../common/BarcodeVisualizer';
import { RegisterBarcodeModal } from './RegisterBarcodeModal';

interface AdminInventoryProps {
  inventory: InventoryItem[];
  categories: Category[];
  onOpenScanner: () => void;
  onOpenAddItemModal?: () => void;
  onOpenAddItem?: () => void;
}

const SAMPLE_PHOTO_PRESETS = [
  { name: 'Royal Meetha Paan', url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80' },
  { name: 'Chocolate Fire Paan', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80' },
  { name: 'Fresh Espresso Coffee', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80' },
  { name: 'Cold Brew / Frappe', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80' },
  { name: 'Silver Mukhwas', url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600&auto=format&fit=crop&q=80' },
  { name: 'Luxury Confections', url: 'https://images.unsplash.com/photo-1548848221-0c2e497ed557?w=600&auto=format&fit=crop&q=80' },
];

export const AdminInventory: React.FC<AdminInventoryProps> = ({
  inventory,
  categories,
  onOpenScanner,
  onOpenAddItemModal,
  onOpenAddItem,
}) => {
  const handleOpenAddItem = onOpenAddItemModal || onOpenAddItem || (() => {});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'high_margin' | 'tax_exempt'>('all');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [printingLabelItem, setPrintingLabelItem] = useState<InventoryItem | null>(null);
  const [isRegisterBarcodeOpen, setIsRegisterBarcodeOpen] = useState(false);
  const [registerBarcodeTargetItem, setRegisterBarcodeTargetItem] = useState<InventoryItem | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'profit' | 'margin'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filter and search
  const filteredItems = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barcode.includes(searchTerm);

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

    let matchesStock = true;
    if (stockFilter === 'low_stock') {
      matchesStock = item.stockQuantity <= item.lowStockThreshold && item.stockQuantity > 0;
    } else if (stockFilter === 'out_of_stock') {
      matchesStock = item.stockQuantity === 0;
    } else if (stockFilter === 'high_margin') {
      matchesStock = (item.marginPercentage || 0) >= 55;
    } else if (stockFilter === 'tax_exempt') {
      matchesStock = item.isTaxApplicable === false;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Sort
  const sortedItems = [...filteredItems].sort((a, b) => {
    let comp = 0;
    if (sortBy === 'name') comp = a.name.localeCompare(b.name);
    else if (sortBy === 'stock') comp = a.stockQuantity - b.stockQuantity;
    else if (sortBy === 'profit') comp = (a.profitPerUnit || 0) - (b.profitPerUnit || 0);
    else if (sortBy === 'margin') comp = (a.marginPercentage || 0) - (b.marginPercentage || 0);

    return sortOrder === 'asc' ? comp : -comp;
  });

  const handleStockAdjust = (id: string, delta: number) => {
    storage.adjustStock(id, delta, 'Admin Table Fast Step');
  };

  const handleDeleteItem = (item: InventoryItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}" from inventory?`)) {
      storage.deleteInventoryItem(item.id);
    }
  };

  const handleRemovePhotoDirectly = (item: InventoryItem) => {
    if (window.confirm(`Remove photo for "${item.name}"?`)) {
      storage.updateInventoryItem(item.id, { imageUrl: '' });
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

    setEditingItem(null);
  };

  const handleExportCSV = () => {
    const csv = storage.exportMonthlyAnalyticalReportCSV();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Richie_Rich_Inventory_Stock_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Master Inventory Catalog</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
              {inventory.length} Products
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time optical barcode scanning, cost & retail pricing, bill tax applicability, and product photo controls.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setRegisterBarcodeTargetItem(null);
              setIsRegisterBarcodeOpen(true);
            }}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border border-amber-400"
          >
            <BarcodeIcon className="w-4 h-4" />
            <span>Register Product Barcode</span>
          </button>

          <button
            onClick={onOpenScanner}
            className="px-3.5 py-2 bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Scan className="w-3.5 h-3.5 text-amber-400" />
            <span>Scan Barcode</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleOpenAddItem}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, SKU, or barcode..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
          />
        </div>

        {/* Category Pills & Stock Condition Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-lg px-3 py-2 focus:outline-hidden focus:border-slate-400 cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs shrink-0">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                stockFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStockFilter('low_stock')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                stockFilter === 'low_stock' ? 'bg-amber-500 text-slate-950 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setStockFilter('out_of_stock')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                stockFilter === 'out_of_stock' ? 'bg-red-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Out of Stock
            </button>
            <button
              onClick={() => setStockFilter('high_margin')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                stockFilter === 'high_margin' ? 'bg-emerald-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              High Margin (&gt;55%)
            </button>
            <button
              onClick={() => setStockFilter('tax_exempt')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                stockFilter === 'tax_exempt' ? 'bg-indigo-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              0% Tax Exempt
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Item & SKU</th>
                <th className="py-3.5 px-3">Barcode</th>
                <th className="py-3.5 px-3">Category</th>
                <th className="py-3.5 px-3">Tax on Bill</th>
                <th className="py-3.5 px-3">Cost Price</th>
                <th className="py-3.5 px-3">Retail Price</th>
                <th className="py-3.5 px-3">Margin / Profit</th>
                <th className="py-3.5 px-3">Stock Level</th>
                <th className="py-3.5 px-3 text-center">Quick Adjust</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <Package className="w-10 h-10 stroke-1 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">No inventory items matched</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting search filters or add a new item.</p>
                  </td>
                </tr>
              ) : (
                sortedItems.map((item) => {
                  const isLow = item.stockQuantity <= item.lowStockThreshold && item.stockQuantity > 0;
                  const isOut = item.stockQuantity === 0;
                  const isTaxable = item.isTaxApplicable !== false;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isOut ? 'bg-red-50/40' : isLow ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Name & SKU & Photo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <div className="relative group shrink-0">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
                              />
                              <button
                                onClick={() => handleRemovePhotoDirectly(item)}
                                title="Remove Product Photo"
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-500 shrink-0 text-[9px]">
                              <Package className="w-4 h-4 text-slate-400 mb-0.5" />
                              <span>No Photo</span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-xs">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-slate-500">{item.sku}</span>
                              {item.imageUrl && (
                                <button
                                  onClick={() => handleRemovePhotoDirectly(item)}
                                  className="text-[10px] text-red-500 hover:text-red-700 hover:underline cursor-pointer flex items-center gap-0.5"
                                  title="Remove product photo"
                                >
                                  <Trash2 className="w-2.5 h-2.5" /> Remove photo
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Barcode */}
                      <td className="py-3.5 px-3">
                        <div
                          onClick={() => setPrintingLabelItem(item)}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          title="Click to print barcode label"
                        >
                          <BarcodeVisualizer value={item.barcode} width={90} height={22} showText={true} />
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">
                          {categories.find((c) => c.id === item.category)?.name || item.category}
                        </span>
                      </td>

                      {/* Tax Applicable on Bill */}
                      <td className="py-3.5 px-3">
                        {isTaxable ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                            <Percent className="w-2.5 h-2.5 text-emerald-600" />
                            <span>{item.taxRate !== undefined ? item.taxRate : 5}% GST</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                            <span>0% Exempt</span>
                          </span>
                        )}
                      </td>

                      {/* Cost */}
                      <td className="py-3.5 px-3 font-medium text-slate-600">
                        {CURRENCY}{item.costPrice.toFixed(2)}
                      </td>

                      {/* Retail */}
                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        {CURRENCY}{item.sellingPrice.toFixed(2)}
                      </td>

                      {/* Profit Margin */}
                      <td className="py-3.5 px-3">
                        <div>
                          <span className="font-extrabold text-emerald-600 text-xs">
                            +{item.marginPercentage}%
                          </span>
                          <p className="text-[10px] text-slate-500">
                            +{CURRENCY}{item.profitPerUnit}/unit
                          </p>
                        </div>
                      </td>

                      {/* Stock Level Badge */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                              isOut
                                ? 'bg-red-50 text-red-600 border border-red-200'
                                : isLow
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-green-50 text-green-700 border border-green-200'
                            }`}
                          >
                            {item.stockQuantity} {item.unit}
                          </span>
                        </div>
                      </td>

                      {/* Quick Adjust Buttons */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                          <button
                            onClick={() => handleStockAdjust(item.id, -1)}
                            title="-1 Unit"
                            className="p-1 text-slate-600 hover:text-red-600 hover:bg-slate-200 rounded-sm cursor-pointer"
                          >
                            <MinusCircle className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono text-xs font-bold px-1 text-slate-800 min-w-[20px]">
                            {item.stockQuantity}
                          </span>
                          <button
                            onClick={() => handleStockAdjust(item.id, 1)}
                            title="+1 Unit"
                            className="p-1 text-slate-600 hover:text-emerald-600 hover:bg-slate-200 rounded-sm cursor-pointer"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleStockAdjust(item.id, 10)}
                            title="+10 Restock"
                            className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-sm hover:bg-amber-500 hover:text-slate-950 cursor-pointer ml-1"
                          >
                            +10
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setRegisterBarcodeTargetItem(item);
                              setIsRegisterBarcodeOpen(true);
                            }}
                            title="Register / Change Product Barcode"
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer border border-amber-200"
                          >
                            <BarcodeIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPrintingLabelItem(item)}
                            title="Print Label"
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingItem({ ...item, isTaxApplicable: item.isTaxApplicable !== false })}
                            title="Edit Item & Tax / Photo"
                            className="p-1.5 rounded-lg bg-slate-100 text-amber-700 hover:text-amber-900 hover:bg-amber-50 transition-colors cursor-pointer border border-slate-200"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            title="Delete Item"
                            className="p-1.5 rounded-lg bg-slate-100 text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer border border-slate-200"
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

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Edit Product: {editingItem.name}</h3>
                <p className="text-xs text-slate-500">Update pricing, tax applicability on bill, and product photo</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-xs text-slate-700 font-bold">Product Name</label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  required
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold">SKU</label>
                  <input
                    type="text"
                    value={editingItem.sku}
                    onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value })}
                    required
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-700 font-bold">Barcode Number</label>
                  <input
                    type="text"
                    value={editingItem.barcode}
                    onChange={(e) => setEditingItem({ ...editingItem, barcode: e.target.value })}
                    required
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400 font-mono"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold">Cost Price ({CURRENCY})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem.costPrice}
                    onChange={(e) => setEditingItem({ ...editingItem, costPrice: Number(e.target.value) })}
                    required
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-700 font-bold">Selling Price ({CURRENCY})</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem.sellingPrice}
                    onChange={(e) => setEditingItem({ ...editingItem, sellingPrice: Number(e.target.value) })}
                    required
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400 font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* ========================================================= */}
              {/* TAX APPLICABLE ON BILL & GST RATE PERCENTAGE (Edit Item Modal) */}
              {/* ========================================================= */}
              <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-amber-700" />
                    <div>
                      <label className="text-xs text-slate-900 font-bold block">
                        Tax on Bill Applicable?
                      </label>
                      <p className="text-[11px] text-slate-500">
                        Choose whether GST tax is charged on the bill for this product.
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      editingItem.isTaxApplicable !== false
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    {editingItem.isTaxApplicable !== false ? `${editingItem.taxRate ?? 5}% GST` : '0% Exempt'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, isTaxApplicable: true, taxRate: editingItem.taxRate || 5 })}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editingItem.isTaxApplicable !== false
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${editingItem.isTaxApplicable !== false ? 'opacity-100' : 'opacity-0'}`} />
                    <span>Yes, Tax Applicable</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingItem({ ...editingItem, isTaxApplicable: false, taxRate: 0 })}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      editingItem.isTaxApplicable === false
                        ? 'bg-[#1E293B] text-white border-slate-800 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${editingItem.isTaxApplicable === false ? 'opacity-100' : 'opacity-0'}`} />
                    <span>No (0% Tax Exempt)</span>
                  </button>
                </div>

                {editingItem.isTaxApplicable !== false && (
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-800 font-bold">
                        GST Rate Percentage (%):
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={editingItem.taxRate ?? 5}
                          onChange={(e) => setEditingItem({ ...editingItem, taxRate: Math.max(0, Number(e.target.value)) })}
                          className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right font-extrabold text-slate-900 focus:outline-hidden focus:border-amber-400"
                        />
                        <span className="text-xs font-bold text-slate-700">%</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-semibold">Presets:</span>
                      {[5, 12, 18, 28].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setEditingItem({ ...editingItem, taxRate: rate })}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            (editingItem.taxRate ?? 5) === rate
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {rate}% GST
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* PRODUCT / SKU PHOTO MANAGER & REMOVE PHOTO FEATURE */}
              {/* ========================================================= */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-slate-700" />
                    <label className="text-xs text-slate-900 font-bold">Product / SKU Photo</label>
                  </div>

                  {editingItem.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => setEditingItem({ ...editingItem, imageUrl: '' })}
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold rounded-lg border border-red-200 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Remove Photo
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-medium italic">No photo attached</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {editingItem.imageUrl ? (
                    <div className="relative group shrink-0">
                      <img
                        src={editingItem.imageUrl}
                        alt="Product preview"
                        className="w-16 h-16 rounded-xl object-cover border-2 border-amber-400/60 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setEditingItem({ ...editingItem, imageUrl: '' })}
                        title="Remove Photo"
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-slate-200/80 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 text-[10px] shrink-0">
                      <Package className="w-5 h-5 mb-0.5 text-slate-400" />
                      <span>No Photo</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs">
                        <Upload className="w-3 h-3 text-slate-600" />
                        <span>Upload Image File</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                      {editingItem.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setEditingItem({ ...editingItem, imageUrl: '' })}
                          className="text-xs text-red-600 hover:underline font-medium cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <input
                      type="url"
                      value={editingItem.imageUrl || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, imageUrl: e.target.value })}
                      placeholder="Or paste image URL (https://...)"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-400"
                    />
                  </div>
                </div>

                {/* Presets */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">Quick Presets:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {SAMPLE_PHOTO_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditingItem({ ...editingItem, imageUrl: preset.url })}
                        className="shrink-0 p-1 bg-white border border-slate-200 hover:border-amber-400 rounded-lg flex items-center gap-1 text-[10px] text-slate-700 cursor-pointer shadow-2xs"
                      >
                        <img src={preset.url} alt={preset.name} className="w-4 h-4 rounded-md object-cover" />
                        <span className="truncate max-w-[90px]">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stock & Threshold */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold">Current Stock Qty</label>
                  <input
                    type="number"
                    value={editingItem.stockQuantity}
                    onChange={(e) => setEditingItem({ ...editingItem, stockQuantity: Number(e.target.value) })}
                    required
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400 font-bold text-amber-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-700 font-bold">Low-Stock Alert Threshold</label>
                  <input
                    type="number"
                    value={editingItem.lowStockThreshold}
                    onChange={(e) => setEditingItem({ ...editingItem, lowStockThreshold: Number(e.target.value) })}
                    required
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold">Category</label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold">Description</label>
                <textarea
                  rows={2}
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Label Print Preview Modal */}
      {printingLabelItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 text-center space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Retail Shelf & Product Barcode Label</h3>

            <div className="bg-white p-4 rounded-xl text-slate-950 border border-slate-300 shadow-inner flex flex-col items-center justify-center space-y-1">
              <div className="font-black text-xs uppercase tracking-wider text-slate-900">
                Richie Rich Pan House
              </div>
              <div className="font-bold text-sm text-slate-900 truncate max-w-[240px]">
                {printingLabelItem.name}
              </div>
              <div className="text-xs font-mono text-slate-600">SKU: {printingLabelItem.sku}</div>

              <div className="my-2">
                <BarcodeVisualizer value={printingLabelItem.barcode} width={200} height={50} showText={true} />
              </div>

              <div className="flex items-center justify-between w-full pt-1 border-t border-slate-200 text-xs font-bold">
                <span>MRP: {CURRENCY}{printingLabelItem.sellingPrice.toFixed(2)}</span>
                <span className="text-[10px] text-slate-500">
                  {printingLabelItem.isTaxApplicable !== false ? 'Incl. 5% GST' : 'Tax Exempt'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPrintingLabelItem(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 border border-slate-200 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Label
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Barcode Modal */}
      <RegisterBarcodeModal
        isOpen={isRegisterBarcodeOpen}
        onClose={() => {
          setIsRegisterBarcodeOpen(false);
          setRegisterBarcodeTargetItem(null);
        }}
        inventory={inventory}
        preselectedItem={registerBarcodeTargetItem}
        onBarcodeRegistered={(item, newBarcode) => {
          // Handled via storage notify, state updates automatically
        }}
      />
    </div>
  );
};
