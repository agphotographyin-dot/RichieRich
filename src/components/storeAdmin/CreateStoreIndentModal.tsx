import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Send,
  Store,
  Building2,
  AlertTriangle,
  Package,
  Sparkles,
  CheckCircle2,
  Clock,
  Flame,
  Info,
  Layers,
  Search,
} from 'lucide-react';
import { Warehouse, StoreStockIndentItem } from '../../types/warehouse';
import { InventoryItem, StoreLocation } from '../../types';
import { warehouseStorage } from '../../services/warehouseStorage';
import { storage, INITIAL_INVENTORY } from '../../services/storage';
import { soundEffects } from '../../services/audio';
import { getLocalDateString } from '../../utils/dateUtils';

interface CreateStoreIndentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStore: StoreLocation;
  inventory?: InventoryItem[];
  onSuccess: () => void;
  preselectedItem?: InventoryItem | null;
  adminName?: string;
}

interface IndentLineDraft {
  itemId: string;
  name: string;
  sku: string;
  category: string;
  currentStoreStock: number;
  minThreshold: number;
  requestedQty: number;
  unit: string;
}

export const CreateStoreIndentModal: React.FC<CreateStoreIndentModalProps> = ({
  isOpen,
  onClose,
  currentStore,
  inventory,
  onSuccess,
  preselectedItem,
  adminName,
}) => {
  const warehouses = useMemo(() => warehouseStorage.getWarehouses(), []);
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>(
    warehouses[0]?.id || 'wh-central-amd'
  );
  const [urgency, setUrgency] = useState<'routine' | 'urgent_low_stock' | 'emergency_event'>(
    'urgent_low_stock'
  );
  const [requestedBy, setRequestedBy] = useState<string>(adminName || 'Store Manager');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');

  // Master Inventory: Guarantees 100% of master products and SKUs are available to order from warehouse
  const masterInventory: InventoryItem[] = useMemo(() => {
    const live = storage.getInventory();
    if (live && live.length > 0) return live;
    if (inventory && inventory.length > 0) return inventory;
    return INITIAL_INVENTORY;
  }, [isOpen, inventory]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    masterInventory.forEach((i) => {
      if (i.category) cats.add(i.category);
    });
    return Array.from(cats).sort();
  }, [masterInventory]);

  const sortedMasterInventory = useMemo(() => {
    return [...masterInventory].sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return (a.sku || '').localeCompare(b.sku || '') || a.name.localeCompare(b.name);
    });
  }, [masterInventory]);

  // Quick search filter for master catalog
  const filteredCatalogItems = useMemo(() => {
    if (!catalogSearchQuery.trim()) return [];
    const q = catalogSearchQuery.toLowerCase().trim();
    return sortedMasterInventory
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.sku && item.sku.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.barcode && item.barcode.includes(q))
      )
      .slice(0, 10);
  }, [sortedMasterInventory, catalogSearchQuery]);

  // Initialize draft items
  const [items, setItems] = useState<IndentLineDraft[]>([]);

  // Setup initial items when modal opens or preselectedItem changes
  useEffect(() => {
    if (isOpen) {
      if (preselectedItem) {
        const storeStock =
          preselectedItem.storeAllocations?.[currentStore.id] ?? 0;
        const recQty = Math.max(
          (preselectedItem.lowStockThreshold || 10) * 3 - storeStock,
          25
        );
        setItems([
          {
            itemId: preselectedItem.id,
            name: preselectedItem.name,
            sku: preselectedItem.sku || 'SKU-IND',
            category: preselectedItem.category,
            currentStoreStock: storeStock,
            minThreshold: preselectedItem.lowStockThreshold || 10,
            requestedQty: recQty,
            unit: preselectedItem.unit || 'units',
          },
        ]);
        setUrgency(storeStock <= (preselectedItem.lowStockThreshold || 10) ? 'urgent_low_stock' : 'routine');
      } else if (items.length === 0 && sortedMasterInventory.length > 0) {
        const first = sortedMasterInventory[0];
        const storeStock = first.storeAllocations?.[currentStore.id] ?? 0;
        setItems([
          {
            itemId: first.id,
            name: first.name,
            sku: first.sku || 'SKU-IND',
            category: first.category,
            currentStoreStock: storeStock,
            minThreshold: first.lowStockThreshold || 10,
            requestedQty: 30,
            unit: first.unit || 'units',
          },
        ]);
      }
    } else {
      setCatalogSearchQuery('');
    }
  }, [isOpen, preselectedItem, currentStore.id, sortedMasterInventory]);

  if (!isOpen) return null;

  const targetWarehouse =
    warehouses.find((w) => w.id === targetWarehouseId) || warehouses[0] || {
      id: 'wh-central-amd',
      name: 'Ahmedabad Central Logistics Hub',
    };

  // Find all low stock items in current store from master inventory
  const lowStockItemsInStore = sortedMasterInventory.filter((item) => {
    const stock = item.storeAllocations?.[currentStore.id] ?? 0;
    return stock <= (item.lowStockThreshold || 10);
  });

  const handleAddRow = () => {
    // Find first item not already in draft
    const existingIds = new Set(items.map((i) => i.itemId));
    const candidate = sortedMasterInventory.find((i) => !existingIds.has(i.id)) || sortedMasterInventory[0];
    if (!candidate) return;

    const storeStock = candidate.storeAllocations?.[currentStore.id] ?? 0;
    setItems((prev) => [
      ...prev,
      {
        itemId: candidate.id,
        name: candidate.name,
        sku: candidate.sku || 'SKU-IND',
        category: candidate.category,
        currentStoreStock: storeStock,
        minThreshold: candidate.lowStockThreshold || 10,
        requestedQty: 25,
        unit: candidate.unit || 'units',
      },
    ]);
  };

  const handleAddSpecificProduct = (product: InventoryItem) => {
    const storeStock = product.storeAllocations?.[currentStore.id] ?? 0;
    const threshold = product.lowStockThreshold || 10;
    const suggested = Math.max(threshold * 3 - storeStock, 25);

    setItems((prev) => [
      ...prev,
      {
        itemId: product.id,
        name: product.name,
        sku: product.sku || 'SKU-IND',
        category: product.category,
        currentStoreStock: storeStock,
        minThreshold: threshold,
        requestedQty: suggested,
        unit: product.unit || 'units',
      },
    ]);

    setCatalogSearchQuery('');
    soundEffects.playScanBeep();
  };

  const handlePopulateAllLowStock = () => {
    if (lowStockItemsInStore.length === 0) {
      alert('No items currently breached low-stock threshold for this store.');
      return;
    }

    const newDrafts: IndentLineDraft[] = lowStockItemsInStore.map((item) => {
      const stock = item.storeAllocations?.[currentStore.id] ?? 0;
      const threshold = item.lowStockThreshold || 10;
      const suggested = Math.max(threshold * 3 - stock, 25);
      return {
        itemId: item.id,
        name: item.name,
        sku: item.sku || 'SKU-IND',
        category: item.category,
        currentStoreStock: stock,
        minThreshold: threshold,
        requestedQty: suggested,
        unit: item.unit || 'units',
      };
    });

    setItems(newDrafts);
    setUrgency('urgent_low_stock');
    soundEffects.playScanBeep();
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const selected = sortedMasterInventory.find((i) => i.id === itemId);
    if (!selected) return;

    const storeStock = selected.storeAllocations?.[currentStore.id] ?? 0;
    setItems((prev) =>
      prev.map((row, idx) =>
        idx === index
          ? {
              ...row,
              itemId: selected.id,
              name: selected.name,
              sku: selected.sku || 'SKU-IND',
              category: selected.category,
              currentStoreStock: storeStock,
              minThreshold: selected.lowStockThreshold || 10,
              unit: selected.unit || 'units',
            }
          : row
      )
    );
  };

  const handleQtyChange = (index: number, qty: number) => {
    setItems((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, requestedQty: Math.max(1, qty) } : row))
    );
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      alert('Indent must include at least one item.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      alert('Please add at least one item to this indent requisition.');
      return;
    }

    setIsSubmitting(true);

    try {
      const indentItems: StoreStockIndentItem[] = items.map((it) => {
        const cleanSku = it.sku ? it.sku.trim().toUpperCase() : 'SKU-IND';
        const formattedName = it.name.startsWith(`[${cleanSku}]`) ? it.name : `[${cleanSku}] ${it.name}`;
        return {
          itemId: it.itemId,
          sku: cleanSku,
          name: formattedName,
          currentStoreStock: it.currentStoreStock,
          minThreshold: it.minThreshold,
          requestedQty: it.requestedQty,
          unit: it.unit,
        };
      });

      warehouseStorage.createStoreIndent({
        storeId: currentStore.id,
        storeName: currentStore.name,
        targetWarehouseId: targetWarehouse.id,
        targetWarehouseName: targetWarehouse.name,
        urgency,
        requestDate: getLocalDateString(),
        items: indentItems,
        requestedBy: requestedBy || 'Store Manager',
        notes: notes.trim() || undefined,
      });

      soundEffects.playSuccessChime();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create store indent', error);
      alert('Failed to submit indent request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Order Stock from Warehouse
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold uppercase">
                  Store Indent
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  {sortedMasterInventory.length} SKUs Available
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Raise an official stock requisition for <strong className="text-white">{currentStore.name}</strong> from Master Central Inventory
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Rules / Policy Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold flex items-center gap-2">
                <span>Master Warehouse Catalog Replenishment</span>
                <span className="text-[10px] bg-amber-200/80 text-amber-950 px-2 py-0.2 rounded font-mono font-black">
                  All {sortedMasterInventory.length} Master SKUs Loaded
                </span>
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Stores can order replenishment stock for every SKU listed in the Master Inventory. All product selections clearly list their master SKU code, current store stock, and central warehouse available quantities.
              </p>
            </div>
          </div>

          {/* Store & Target Warehouse Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Origin Store (Locked) */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Ordering Store</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                  Current Outlet
                </span>
              </label>
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Store className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">{currentStore.name}</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                Store ID: {currentStore.id} • {currentStore.area || 'Ahmedabad'}
              </p>
            </div>

            {/* Target Central Warehouse (Picker) */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Target Warehouse (Fulfilling Hub)</span>
              </label>
              <select
                value={targetWarehouseId}
                onChange={(e) => setTargetWarehouseId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code || 'HUB'})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">
                Fulfilling hub will pick, batch & dispatch transfer.
              </p>
            </div>
          </div>

          {/* Urgency & Requester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Requisition Urgency Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setUrgency('routine')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    urgency === 'routine'
                      ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-[10px]">Routine</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUrgency('urgent_low_stock')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    urgency === 'urgent_low_stock'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-[10px]">Low Stock</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUrgency('emergency_event')}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    urgency === 'emergency_event'
                      ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Flame className="w-4 h-4 text-rose-600" />
                  <span className="text-[10px]">Emergency</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Requested By (Store Admin / Staff)
              </label>
              <input
                type="text"
                required
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                placeholder="e.g. Store Manager Patel"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Recorded in warehouse dispatch audit trail
              </p>
            </div>
          </div>

          {/* Quick Search & Add from Master Catalog */}
          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-amber-700" />
                <span>Search & Add Product by Name or SKU ({sortedMasterInventory.length} Master SKUs)</span>
              </span>
              {catalogSearchQuery && (
                <button
                  type="button"
                  onClick={() => setCatalogSearchQuery('')}
                  className="text-[10px] text-amber-800 hover:text-amber-950 font-bold cursor-pointer underline"
                >
                  Clear search
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={catalogSearchQuery}
                onChange={(e) => setCatalogSearchQuery(e.target.value)}
                placeholder="Search master catalog by SKU (e.g. PAN-MAG-01, ESS-ENR-03) or Product Name..."
                className="w-full bg-white border border-amber-300 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
              />
            </div>

            {catalogSearchQuery.trim() && (
              <div className="max-h-44 overflow-y-auto divide-y divide-amber-100 bg-white border border-amber-200 rounded-xl shadow-xs">
                {filteredCatalogItems.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    No products found matching "{catalogSearchQuery}". All {sortedMasterInventory.length} SKUs remain accessible in the dropdown below.
                  </div>
                ) : (
                  filteredCatalogItems.map((prod) => {
                    const isAlreadyIn = items.some((it) => it.itemId === prod.id);
                    const storeStock = prod.storeAllocations?.[currentStore.id] ?? 0;
                    return (
                      <div
                        key={prod.id}
                        className="p-2.5 flex items-center justify-between gap-2 hover:bg-amber-50/50 transition-colors"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span className="font-mono font-black text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-[10px] shrink-0">
                            [{prod.sku}]
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {prod.name}
                          </span>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            ({prod.category}) • Store Stock: {storeStock} {prod.unit || 'units'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddSpecificProduct(prod)}
                          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{isAlreadyIn ? 'Add Line' : 'Add to Indent'}</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Line Items Section */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <span>Requisition Items ({items.length})</span>
                  {items.length > 0 && (
                    <span className="text-slate-500 font-normal">
                      • Total Units:{' '}
                      {items.reduce((s, i) => s + (Number(i.requestedQty) || 0), 0)}
                    </span>
                  )}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {lowStockItemsInStore.length > 0 && (
                  <button
                    type="button"
                    onClick={handlePopulateAllLowStock}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                    <span>Auto-Add {lowStockItemsInStore.length} Low Stock Items</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>

            {/* Items Table / Cards */}
            <div className="space-y-2.5">
              {items.map((row, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  {/* Item Selector */}
                  <div className="flex-1 w-full space-y-1.5">
                    <div className="flex items-center justify-between pb-0.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono">
                          #{idx + 1}
                        </span>
                        <span className="text-slate-900 font-bold truncate max-w-xs">{row.name}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">SKU:</span>
                        <span className="font-mono font-black text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md text-[11px]">
                          {row.sku}
                        </span>
                      </div>
                    </div>

                    <select
                      value={row.itemId}
                      onChange={(e) => handleItemSelect(idx, e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                    >
                      {categories.map((cat) => {
                        const catItems = sortedMasterInventory.filter((inv) => inv.category === cat);
                        if (catItems.length === 0) return null;
                        return (
                          <optgroup key={cat} label={`── ${cat.toUpperCase()} CATEGORY (${catItems.length} Products) ──`}>
                            {catItems.map((inv) => {
                              const storeQty = inv.storeAllocations?.[currentStore.id] ?? 0;
                              const whQty = inv.stockQuantity ?? 0;
                              return (
                                <option key={inv.id} value={inv.id}>
                                  [{inv.sku || 'SKU'}] {inv.name} — Store: {storeQty} {inv.unit || 'units'} | Central WH Avail: {whQty} {inv.unit || 'units'}
                                </option>
                              );
                            })}
                          </optgroup>
                        );
                      })}
                    </select>

                    <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5 flex-wrap">
                      <span>
                        Current Store Stock:{' '}
                        <strong
                          className={
                            row.currentStoreStock <= row.minThreshold
                              ? 'text-rose-600 font-bold'
                              : 'text-slate-800'
                          }
                        >
                          {row.currentStoreStock} {row.unit}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Central WH Avail:{' '}
                        <strong className="text-indigo-700 font-bold">
                          {sortedMasterInventory.find((i) => i.id === row.itemId)?.stockQuantity ?? 0} {row.unit}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Min Threshold: <strong>{row.minThreshold} {row.unit}</strong>
                      </span>
                      {row.currentStoreStock <= row.minThreshold && (
                        <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-[9px]">
                          Low Stock
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Order Qty ({row.unit})
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.requestedQty}
                          onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                          className="w-24 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-center text-slate-900 focus:outline-hidden focus:border-amber-500 font-mono"
                        />
                        <span className="text-[11px] font-bold text-slate-500">{row.unit}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => handleRemoveRow(idx)}
                      title="Remove product"
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:pointer-events-none mt-4 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Special Instructions / Notes */}
          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-bold text-slate-700">
              Delivery Instructions / Reason (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please send before 2:00 PM for evening peak hours; verify fresh batch for Paan leaves."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:border-amber-500 placeholder:text-slate-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>
                {isSubmitting ? 'Submitting to Warehouse...' : 'Submit Indent to Warehouse'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
