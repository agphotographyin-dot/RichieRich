import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, FileSpreadsheet, Building2, Calendar, AlertCircle, Filter, CheckCircle2 } from 'lucide-react';
import { Supplier, Warehouse, PurchaseOrderItem } from '../../../types/warehouse';
import { InventoryItem } from '../../../types';
import { CURRENCY } from '../../../services/storage';
import { warehouseStorage } from '../../../services/warehouseStorage';
import { ItemAutocompleteInput } from '../../common/ItemAutocompleteInput';

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  warehouses: Warehouse[];
  inventory: InventoryItem[];
  onSuccess: () => void;
}

export const CreatePOModal: React.FC<CreatePOModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  warehouses,
  inventory,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const defaultWh = warehouses[0] || {
    id: 'wh-central-amd',
    name: 'Central Warehouse',
    city: 'Ahmedabad',
  };

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [filterByVendorOnly, setFilterByVendorOnly] = useState(true);
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [includeGst, setIncludeGst] = useState<boolean>(false);
  const [taxPercent, setTaxPercent] = useState<number>(5);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  // Filter inventory by active status and selected vendor
  const activeInventory = useMemo(() => {
    return inventory.filter((item) => item.status !== 'inactive');
  }, [inventory]);

  const vendorSpecificInventory = useMemo(() => {
    if (!selectedSupplier) return activeInventory;
    const sName = selectedSupplier.name.toLowerCase();
    const matches = activeInventory.filter((item) => {
      const v1 = (item.vendor || '').toLowerCase();
      const vList = (item.vendors || []).map((v) => v.toLowerCase());
      return v1.includes(sName) || sName.includes(v1) || vList.some((v) => v.includes(sName) || sName.includes(v));
    });
    return matches.length > 0 ? matches : activeInventory;
  }, [activeInventory, selectedSupplier]);

  const displayedCatalog = filterByVendorOnly ? vendorSpecificInventory : activeInventory;

  const [items, setItems] = useState<
    Array<{
      itemId: string;
      name: string;
      sku: string;
      category: string;
      quantity: number;
      unitPrice: number;
      unit: string;
    }>
  >(() => {
    const firstItem = displayedCatalog[0] || activeInventory[0];
    return [
      {
        itemId: firstItem?.id || 'item-101',
        name: firstItem?.name || 'Royal Maghai Meetha Paan',
        sku: firstItem?.sku || 'PAN-MAG-01',
        category: firstItem?.category || 'Paan',
        quantity: 50,
        unitPrice: firstItem?.costPrice || 20,
        unit: firstItem?.unit || 'pieces',
      },
    ];
  });

  const handleAddItem = () => {
    const defaultItem = displayedCatalog[0] || activeInventory[0] || {
      id: `item-${Date.now()}`,
      name: '',
      sku: 'SKU-NEW',
      category: 'Paan',
      costPrice: 20,
      unit: 'pieces',
    };
    setItems([
      ...items,
      {
        itemId: defaultItem.id,
        name: defaultItem.name,
        sku: defaultItem.sku,
        category: defaultItem.category,
        quantity: 50,
        unitPrice: defaultItem.costPrice || 20,
        unit: defaultItem.unit || 'pieces',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemSelect = (index: number, selected: any) => {
    const next = [...items];
    next[index] = {
      ...next[index],
      itemId: selected.itemId || selected.id || next[index].itemId,
      name: selected.name,
      sku: selected.sku || next[index].sku,
      category: selected.category || 'Paan',
      unitPrice: selected.costPrice !== undefined ? selected.costPrice : (selected.unitPrice || next[index].unitPrice),
      unit: selected.unit || 'pieces',
    };
    setItems(next);
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };

  const subTotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const activeTaxRate = includeGst ? taxPercent : 0;
  const gstAmount = Math.round(subTotal * (activeTaxRate / 100));
  const grandTotal = subTotal + gstAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const poItems: PurchaseOrderItem[] = items.map((it) => {
      const qty = Number(it.quantity) || 1;
      const unitPrice = Number(it.unitPrice) || 0;
      const totalCost = qty * unitPrice;
      const gst = includeGst ? Math.round(totalCost * (activeTaxRate / 100)) : 0;
      return {
        itemId: it.itemId,
        sku: it.sku,
        name: it.name,
        category: it.category,
        quantityOrdered: qty,
        quantityReceived: 0,
        unitPrice: unitPrice,
        unit: it.unit,
        taxPercent: activeTaxRate,
        taxAmount: gst,
        totalAmount: totalCost + gst,
      };
    });

    warehouseStorage.createPurchaseOrder({
      supplierId,
      supplierName: selectedSupplier?.name || 'Supplier',
      supplierGstin: selectedSupplier?.gstin && selectedSupplier.gstin !== 'N/A' ? selectedSupplier.gstin : '',
      destinationWarehouseId: defaultWh.id,
      destinationWarehouseName: defaultWh.name,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: expectedDate,
      items: poItems,
      subtotal: subTotal,
      taxTotal: gstAmount,
      freightCharge: 0,
      grandTotal,
      status: 'approved',
      createdByName: 'Purchase Manager',
      approvedByName: 'Warehouse Admin',
      paymentTerms: selectedSupplier?.paymentTerms || 'Net 30 Days',
      paymentStatus: 'unpaid',
      notes,
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-base">Issue New Purchase Order (PO)</h3>
              <p className="text-[11px] text-slate-400">Order inventory from verified suppliers directly into Central Warehouse</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Supplier & Single Warehouse Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Select Supplier / Distributor
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Receiving Central Warehouse
              </label>
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span className="truncate">{defaultWh.name}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                required
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            {/* Vendor catalog filter banner */}
            <div className="flex items-end">
              <div className="w-full p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-indigo-600" />
                    Vendor-Associated Catalog
                  </span>
                  <span className="text-[11px] text-indigo-700 block">
                    {vendorSpecificInventory.length} products associated with {selectedSupplier?.name || 'this vendor'}
                  </span>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterByVendorOnly}
                    onChange={(e) => setFilterByVendorOnly(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Filter</span>
                </label>
              </div>
            </div>
          </div>

          {/* Items Section with Search/History Autocomplete Type Box */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Order Line Items
                </span>
                <span className="block text-[11px] text-slate-500 font-normal">
                  {filterByVendorOnly
                    ? `Showing ${displayedCatalog.length} items from ${selectedSupplier?.name}`
                    : 'Showing all active catalog items'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((row, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    {/* Item Autocomplete Input Box */}
                    <div className="sm:col-span-6">
                      <label className="text-[10px] text-slate-500 font-semibold mb-0.5 block">
                        Item Name / Search Catalog & History
                      </label>
                      <ItemAutocompleteInput
                        value={row.name}
                        placeholder="Type item name..."
                        inventory={displayedCatalog}
                        onSelect={(sel) => handleItemSelect(idx, sel)}
                        onChange={(val) => handleFieldChange(idx, 'name', val)}
                        inputClassName="bg-white"
                      />
                    </div>

                    {/* Quantity */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-500 font-semibold mb-0.5 block">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={row.quantity}
                        onChange={(e) => handleFieldChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-center font-bold"
                      />
                    </div>

                    {/* Unit Cost Price */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-500 font-semibold mb-0.5 block">
                        Unit Cost ({CURRENCY})
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Cost"
                        value={row.unitPrice}
                        onChange={(e) => handleFieldChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-right"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-3 sm:pt-0">
                      <div className="text-right font-mono text-xs font-bold text-slate-800">
                        {CURRENCY}{(row.quantity * row.unitPrice).toLocaleString('en-IN')}
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SKU & Category preview tag */}
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      SKU: {row.sku || 'N/A'}
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold">
                      Category: {row.category || 'Paan'}
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                      Unit: {row.unit || 'pieces'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optional GST Section */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id="includeGstPo"
                checked={includeGst}
                onChange={(e) => setIncludeGst(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="includeGstPo" className="font-semibold text-slate-800 cursor-pointer select-none">
                Apply GST / Tax (Optional)
              </label>
            </div>

            {includeGst && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-[11px] font-semibold">GST Rate:</span>
                <select
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={5}>5% GST (Standard Food/Pan)</option>
                  <option value={12}>12% GST</option>
                  <option value={18}>18% GST (Essentials/Packaging)</option>
                  <option value={28}>28% GST</option>
                </select>
              </div>
            )}
          </div>

          {/* Valuation Summary Box */}
          <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="font-sans text-slate-700 space-x-2">
              <span>Subtotal: <strong>{CURRENCY}{subTotal.toLocaleString('en-IN')}</strong></span>
              {includeGst ? (
                <span className="text-indigo-700 font-semibold">• GST ({taxPercent}%): {CURRENCY}{gstAmount.toLocaleString('en-IN')}</span>
              ) : (
                <span className="text-slate-500 font-medium">• (No GST Applied)</span>
              )}
            </div>
            <span className="text-sm font-extrabold text-indigo-950">
              Grand Total: {CURRENCY}{grandTotal.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              PO Terms & Delivery Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Deliver before 10:00 AM with temperature log cert."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Issue Purchase Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
