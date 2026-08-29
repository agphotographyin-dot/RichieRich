import React, { useState } from 'react';
import { X, Plus, Trash2, Send, Store, Building2, AlertTriangle } from 'lucide-react';
import { Warehouse, StoreStockIndentItem } from '../../../types/warehouse';
import { InventoryItem, StoreLocation } from '../../../types';
import { warehouseStorage } from '../../../services/warehouseStorage';
import { ItemAutocompleteInput } from '../../common/ItemAutocompleteInput';

interface CreateIndentModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  stores: StoreLocation[];
  inventory: InventoryItem[];
  onSuccess: () => void;
}

export const CreateIndentModal: React.FC<CreateIndentModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  stores,
  inventory,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const defaultWh = warehouses[0] || {
    id: 'wh-central-amd',
    name: 'Central Warehouse',
  };

  const [storeId, setStoreId] = useState(stores[0]?.id || 'bopal');
  const [urgency, setUrgency] = useState<'routine' | 'urgent_low_stock' | 'emergency_event'>('urgent_low_stock');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<
    Array<{
      itemId: string;
      name: string;
      sku: string;
      category: string;
      quantity: number;
      unit: string;
      threshold: number;
    }>
  >([
    {
      itemId: inventory[0]?.id || 'item-101',
      name: inventory[0]?.name || 'Royal Maghai Meetha Paan',
      sku: inventory[0]?.sku || 'PAN-MAG-01',
      category: inventory[0]?.category || 'Paan',
      quantity: 50,
      unit: inventory[0]?.unit || 'pieces',
      threshold: inventory[0]?.lowStockThreshold || 15,
    },
  ]);

  const handleAddItem = () => {
    const defaultItem = inventory[0] || {
      id: `item-${Date.now()}`,
      name: '',
      sku: 'SKU-IND',
      category: 'Paan',
      unit: 'pieces',
      lowStockThreshold: 10,
    };
    setItems([
      ...items,
      {
        itemId: defaultItem.id,
        name: defaultItem.name,
        sku: defaultItem.sku,
        category: defaultItem.category,
        quantity: 30,
        unit: defaultItem.unit || 'pieces',
        threshold: defaultItem.lowStockThreshold || 10,
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
      itemId: selected.itemId,
      name: selected.name,
      sku: selected.sku,
      category: selected.category || 'Paan',
      unit: selected.unit || 'pieces',
      threshold: selected.stockQuantity || 10,
    };
    setItems(next);
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const st = stores.find((s) => s.id === storeId);

    const indentItems: StoreStockIndentItem[] = items.map((it) => {
      const inv = inventory.find((i) => i.id === it.itemId);
      const currentStoreStock = inv?.storeAllocations?.[storeId] || 0;
      return {
        itemId: it.itemId,
        sku: it.sku,
        name: it.name,
        requestedQty: it.quantity,
        currentStoreStock,
        minThreshold: it.threshold || 10,
        unit: it.unit || 'units',
      };
    });

    warehouseStorage.createStoreIndent({
      storeId,
      storeName: st?.name || 'Store',
      targetWarehouseId: defaultWh.id,
      targetWarehouseName: defaultWh.name,
      urgency,
      requestDate: new Date().toISOString().split('T')[0],
      items: indentItems,
      requestedBy: `${st?.name.split(' ')[0]} Store Manager`,
      notes,
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Send className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-bold text-base">Request Store Stock Requisition (Indent)</h3>
              <p className="text-[11px] text-slate-400">Request stock replenishment from Central Master Warehouse</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Requesting Store & Target Warehouse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Requesting Store Outlet
              </label>
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Fulfilling Central Warehouse
              </label>
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-cyan-600 shrink-0" />
                <span className="truncate">{defaultWh.name}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Urgency Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'routine', label: 'Routine (3 Days)' },
                { key: 'urgent_low_stock', label: 'Urgent Low Stock' },
                { key: 'emergency_event', label: 'Emergency / Event' },
              ].map((u) => (
                <button
                  key={u.key}
                  type="button"
                  onClick={() => setUrgency(u.key as any)}
                  className={`p-2 rounded-xl border text-xs font-semibold transition-all ${
                    urgency === u.key
                      ? 'border-cyan-600 bg-cyan-50 text-cyan-950 ring-1 ring-cyan-500'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Line items with Autocomplete Type Box */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Requested Items
                </span>
                <span className="block text-[11px] text-slate-500 font-normal">
                  Type item name (history suggestions appear automatically)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs bg-cyan-50 text-cyan-700 hover:bg-cyan-100 font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((row, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                    {/* Autocomplete Input Box */}
                    <div className="sm:col-span-8">
                      <label className="text-[10px] text-slate-500 font-semibold mb-0.5 block">
                        Item Name / Search Catalog & History
                      </label>
                      <ItemAutocompleteInput
                        value={row.name}
                        placeholder="Type item name..."
                        inventory={inventory}
                        onSelect={(sel) => handleItemSelect(idx, sel)}
                        onChange={(val) => handleFieldChange(idx, 'name', val)}
                        inputClassName="bg-white"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-slate-500 font-semibold mb-0.5 block">
                        Required Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Req Qty"
                        value={row.quantity}
                        onChange={(e) => handleFieldChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-center font-bold text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-1 flex items-center justify-end pt-3 sm:pt-0">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SKU & Category pill */}
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

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Store Requirement Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Weekend Rush expected for Fire Paan & Hazelnut Coffee."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {/* Actions */}
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
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Submit Store Indent</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
