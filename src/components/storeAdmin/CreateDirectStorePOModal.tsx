import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Package,
  Search,
  Building2,
  Calendar,
  CreditCard,
  Truck,
  IndianRupee,
  ShieldCheck,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { StoreLocation, InventoryItem } from '../../types';
import { Supplier, POItem } from '../../types/warehouse';
import { warehouseStorage } from '../../services/warehouseStorage';
import { storage } from '../../services/storage';
import { soundEffects } from '../../services/audio';

interface CreateDirectStorePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStore: StoreLocation;
  inventory: InventoryItem[];
  adminName?: string;
  preselectedItem?: InventoryItem | null;
  preselectedSupplierId?: string;
  onSuccess: () => void;
}

interface SelectedPOItemRow {
  itemId: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  piecesPerBox?: number;
  currentStoreStock: number;
  unitPrice: number;
  quantityOrdered: number;
  taxPercent: number;
}

export const CreateDirectStorePOModal: React.FC<CreateDirectStorePOModalProps> = ({
  isOpen,
  onClose,
  currentStore,
  inventory,
  adminName,
  preselectedItem,
  preselectedSupplierId,
  onSuccess,
}) => {
  const suppliers = useMemo(() => warehouseStorage.getSuppliers(), []);

  // Form states
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(() => {
    return preselectedSupplierId || suppliers[0]?.id || '';
  });
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 15 Days');
  const [freightCharges, setFreightCharges] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Selected Order Line Items
  const [orderItems, setOrderItems] = useState<SelectedPOItemRow[]>(() => {
    if (preselectedItem) {
      const storeStock = preselectedItem.storeAllocations?.[currentStore.id] || 0;
      return [
        {
          itemId: preselectedItem.id,
          sku: preselectedItem.sku || 'SKU-GEN',
          name: preselectedItem.name,
          category: preselectedItem.category || 'General',
          unit: preselectedItem.unit || 'boxes',
          piecesPerBox: preselectedItem.piecesPerBox || 1,
          currentStoreStock: storeStock,
          unitPrice: preselectedItem.costPrice || 100,
          quantityOrdered: 10,
          taxPercent: preselectedItem.taxRate !== undefined ? preselectedItem.taxRate : 5,
        },
      ];
    }
    return [];
  });

  if (!isOpen) return null;

  const activeSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];

  // Filter Catalog for Adding Products
  const filteredCatalog = inventory.filter((item) => {
    const matchSearch =
      !productSearch ||
      item.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(productSearch.toLowerCase()));
    const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
    const notAlreadyAdded = !orderItems.some((oi) => oi.itemId === item.id);
    return matchSearch && matchCat && notAlreadyAdded;
  });

  const handleAddItem = (item: InventoryItem) => {
    const storeStock = item.storeAllocations?.[currentStore.id] || 0;
    const newRow: SelectedPOItemRow = {
      itemId: item.id,
      sku: item.sku || `SKU-${item.id.slice(0, 4)}`,
      name: item.name,
      category: item.category || 'General',
      unit: item.unit || 'boxes',
      piecesPerBox: item.piecesPerBox || 1,
      currentStoreStock: storeStock,
      unitPrice: item.costPrice || 100,
      quantityOrdered: 10,
      taxPercent: item.taxRate !== undefined ? item.taxRate : 5,
    };
    setOrderItems((prev) => [...prev, newRow]);
    soundEffects.playClick();
  };

  const handleRemoveItem = (itemId: string) => {
    setOrderItems((prev) => prev.filter((i) => i.itemId !== itemId));
    soundEffects.playTrash();
  };

  const handleUpdateItemQty = (itemId: string, qty: number) => {
    setOrderItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, quantityOrdered: Math.max(1, qty) } : i))
    );
  };

  const handleUpdateItemPrice = (itemId: string, price: number) => {
    setOrderItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, unitPrice: Math.max(0, price) } : i))
    );
  };

  // Calculations
  const subtotal = orderItems.reduce(
    (sum, it) => sum + it.quantityOrdered * it.unitPrice,
    0
  );
  const totalTax = orderItems.reduce(
    (sum, it) => sum + (it.quantityOrdered * it.unitPrice * it.taxPercent) / 100,
    0
  );
  const freight = parseFloat(freightCharges) || 0;
  const grandTotal = Math.round((subtotal + totalTax + freight) * 100) / 100;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier) {
      alert('Please select a supplier.');
      return;
    }
    if (orderItems.length === 0) {
      alert('Please add at least one product to the purchase order.');
      return;
    }

    const poItems: POItem[] = orderItems.map((it) => {
      const lineSubtotal = it.quantityOrdered * it.unitPrice;
      const taxAmount = Math.round(((lineSubtotal * it.taxPercent) / 100) * 100) / 100;
      return {
        itemId: it.itemId,
        sku: it.sku,
        name: it.name,
        category: it.category,
        quantityOrdered: it.quantityOrdered,
        quantityReceived: 0,
        unit: it.unit,
        unitPrice: it.unitPrice,
        taxPercent: it.taxPercent,
        taxAmount,
        totalAmount: lineSubtotal + taxAmount,
      };
    });

    warehouseStorage.createDirectStorePO({
      supplierId: activeSupplier.id,
      supplierName: activeSupplier.name,
      supplierGstin: activeSupplier.gstin,
      storeId: currentStore.id,
      storeName: currentStore.name,
      items: poItems,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate,
      paymentTerms,
      freightCharge: freight,
      notes: notes.trim() || undefined,
      createdByName: adminName || 'Store Manager',
    });

    soundEffects.playSuccessChime();
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 bg-[#1E293B] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Direct Store Purchase Order (PO)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Store ➔ Supplier Direct
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Ordering directly for <strong className="text-amber-400">{currentStore.name}</strong> • No Central Warehouse approval required
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-2.5 text-xs text-amber-950">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Direct Supplier Procurement:</strong> This Purchase Order is placed directly with the supplier.
            When goods are delivered to <strong>{currentStore.name}</strong>, perform Goods Receipt to immediately add stock to your store inventory without affecting Central Warehouse stocks.
          </span>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Section 1: Supplier & Delivery Settings */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span>1. Supplier & Procurement Parameters</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Supplier Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Select Supplier / Vendor *
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-amber-500"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - {s.category}
                    </option>
                  ))}
                </select>
                {activeSupplier && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    GSTIN: {activeSupplier.gstin} • Contact: {activeSupplier.contactPerson} ({activeSupplier.phone})
                  </p>
                )}
              </div>

              {/* Expected Delivery Date */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Expected Delivery Date *
                </label>
                <input
                  type="date"
                  required
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Payment Terms */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Payment Terms
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-amber-500"
                >
                  <option value="Net 15 Days">Net 15 Days Credit</option>
                  <option value="Net 30 Days">Net 30 Days Credit</option>
                  <option value="Immediate / COD">Cash on Delivery / Immediate</option>
                  <option value="Advance 100%">100% Advance Payment</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Order Line Items (Box / Units retained) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-amber-600" />
                <span>2. Order Line Items ({orderItems.length} Products Selected)</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                📦 Inventory rule: Quantities remain in Box / Standard Order Units
              </span>
            </div>

            {orderItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-xs">
                No products added to this purchase order yet. Search and add products from the catalog below.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Product Name & SKU</th>
                      <th className="py-2.5 px-3">Store Stock</th>
                      <th className="py-2.5 px-3 w-32">Order Qty (Boxes/Units)</th>
                      <th className="py-2.5 px-3 w-28">Supplier Cost (₹)</th>
                      <th className="py-2.5 px-3">Tax %</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                      <th className="py-2.5 px-2 text-center w-10">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {orderItems.map((item) => {
                      const lineSubtotal = item.quantityOrdered * item.unitPrice;
                      const lineTax = (lineSubtotal * item.taxPercent) / 100;
                      const lineTotal = lineSubtotal + lineTax;

                      return (
                        <tr key={item.itemId} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{item.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              SKU: {item.sku} • Unit: {item.unit}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                            {item.currentStoreStock} {item.unit}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="1"
                                value={item.quantityOrdered}
                                onChange={(e) =>
                                  handleUpdateItemQty(item.itemId, parseInt(e.target.value) || 1)
                                }
                                className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono font-black text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                              />
                              <span className="text-[10px] font-bold text-slate-500 uppercase">
                                {item.unit}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">₹</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleUpdateItemPrice(item.itemId, parseFloat(e.target.value) || 0)
                                }
                                className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                            {item.taxPercent}% GST
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                            ₹{Number(lineTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.itemId)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Add More Products from Master Catalog */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-amber-600" />
                <span>Search & Add Products to Order</span>
              </h4>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search catalog products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:border-amber-500 w-48 sm:w-60"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">All Categories</option>
                  <option value="Paan">Paan</option>
                  <option value="Cafe">Cafe</option>
                  <option value="Essentials">Essentials</option>
                </select>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto divide-y divide-slate-200/80 bg-white border border-slate-200 rounded-xl">
              {filteredCatalog.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching products available to add.
                </div>
              ) : (
                filteredCatalog.slice(0, 15).map((item) => {
                  const storeStock = item.storeAllocations?.[currentStore.id] || 0;
                  return (
                    <div
                      key={item.id}
                      className="p-2.5 flex items-center justify-between hover:bg-amber-50/40 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-bold text-xs text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 font-mono">
                          <span>SKU: {item.sku || 'N/A'}</span>
                          <span>•</span>
                          <span>Store Stock: {storeStock} {item.unit || 'boxes'}</span>
                          <span>•</span>
                          <span>Purchase Cost: ₹{item.costPrice?.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddItem(item)}
                        className="px-3 py-1 bg-slate-100 hover:bg-amber-600 hover:text-white text-slate-700 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section 4: Freight, Notes & Financial Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Delivery Instructions / Supplier Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Please deliver to Gota outlet front counter between 10 AM - 2 PM. Call store manager on arrival."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Estimated Freight / Transport Charges (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={freightCharges}
                  onChange={(e) => setFreightCharges(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                />
              </div>
            </div>

            {/* Total Valuation Box */}
            <div className="bg-slate-900 text-white rounded-2xl p-4.5 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal ({orderItems.length} items):</span>
                  <span className="font-mono font-bold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Estimated Tax (GST):</span>
                  <span className="font-mono font-bold">₹{totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Freight / Logistics:</span>
                  <span className="font-mono font-bold">₹{freight.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-sm font-extrabold uppercase tracking-wider text-amber-400">
                  Grand Total PO Value:
                </span>
                <span className="text-xl font-black font-mono text-white">
                  ₹{Number(grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600 font-medium">
            Destination: <strong className="text-slate-900">{currentStore.name}</strong> • Direct Procurement
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={orderItems.length === 0}
              className={`px-5 py-2.5 text-white text-xs font-black rounded-xl cursor-pointer shadow-xs transition-all flex items-center gap-2 ${
                orderItems.length === 0
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-amber-600 hover:bg-amber-700 active:scale-95'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Submit PO Directly to Supplier</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
