import React, { useState } from 'react';
import { X, Plus, Trash2, Truck, Building2, Store, ArrowRight, ShieldCheck } from 'lucide-react';
import { Warehouse, BatchRecord, TransferItem, StockTransfer } from '../../../types/warehouse';
import { InventoryItem, StoreLocation } from '../../../types';
import { warehouseStorage } from '../../../services/warehouseStorage';
import { ItemAutocompleteInput } from '../../common/ItemAutocompleteInput';

interface CreateTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  stores: StoreLocation[];
  inventory: InventoryItem[];
  batches: BatchRecord[];
  initialData?: Partial<StockTransfer> | null;
  onSuccess: () => void;
}

export const CreateTransferModal: React.FC<CreateTransferModalProps> = ({
  isOpen,
  onClose,
  warehouses,
  stores,
  inventory,
  batches,
  initialData,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const defaultWh = warehouses[0] || {
    id: 'wh-central-amd',
    name: 'Richie Rich Central Master Warehouse (Ahmedabad Hub)',
  };

  const [transferType, setTransferType] = useState<'warehouse_to_store' | 'store_to_warehouse_return'>(
    initialData?.type === 'store_to_warehouse_return' ? 'store_to_warehouse_return' : 'warehouse_to_store'
  );
  const [destStoreId, setDestStoreId] = useState(
    initialData?.destinationId || stores[0]?.id || 'bopal'
  );
  const [vehicleNo, setVehicleNo] = useState(`GJ-01-RR-${Math.floor(1000 + Math.random() * 9000)}`);
  const [driverName, setDriverName] = useState('Ramesh Rathod');
  const [driverPhone, setDriverPhone] = useState('+91 98250 88771');
  const [carrierName, setCarrierName] = useState('Richie Rich Express Van');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const [items, setItems] = useState<
    Array<{
      itemId: string;
      name: string;
      sku: string;
      category: string;
      batchNumber: string;
      quantity: number;
      unit: string;
      unitCost: number;
    }>
  >(() => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items.map((it) => ({
        itemId: it.itemId,
        name: it.name,
        sku: it.sku,
        category: (it as any).category || 'Paan',
        batchNumber: it.batchNumber || batches[0]?.batchNumber || 'BATCH-AMD-01',
        quantity: it.dispatchedQty || it.requestedQty || 10,
        unit: it.unit || 'pieces',
        unitCost: it.unitCost || 20,
      }));
    }
    return [
      {
        itemId: inventory[0]?.id || 'item-101',
        name: inventory[0]?.name || 'Royal Maghai Meetha Paan',
        sku: inventory[0]?.sku || 'PAN-MAG-01',
        category: inventory[0]?.category || 'Paan',
        batchNumber: batches[0]?.batchNumber || 'BATCH-AMD-01',
        quantity: 20,
        unit: inventory[0]?.unit || 'pieces',
        unitCost: inventory[0]?.costPrice || 20,
      },
    ];
  });

  const handleAddItem = () => {
    const defaultItem = inventory[0] || {
      id: `item-${Date.now()}`,
      name: '',
      sku: 'SKU-TRF',
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
        batchNumber: 'BATCH-AMD-01',
        quantity: 15,
        unit: defaultItem.unit || 'pieces',
        unitCost: defaultItem.costPrice || 20,
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
    const itemBatches = batches.filter((b) => b.itemId === selected.itemId || b.sku === selected.sku);
    const bestBatch = itemBatches[0]?.batchNumber || `BATCH-${Date.now().toString().slice(-4)}`;

    next[index] = {
      ...next[index],
      itemId: selected.itemId,
      name: selected.name,
      sku: selected.sku,
      category: selected.category || 'Paan',
      unitCost: selected.costPrice || 20,
      unit: selected.unit || 'pieces',
      batchNumber: bestBatch,
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
    const st = stores.find((s) => s.id === destStoreId);

    const fromLoc = transferType === 'warehouse_to_store' ? defaultWh.name : st?.name || 'Store';
    const toLoc = transferType === 'warehouse_to_store' ? st?.name || 'Store' : defaultWh.name;

    const transferItems: TransferItem[] = items.map((it) => {
      return {
        itemId: it.itemId,
        sku: it.sku,
        name: it.name,
        batchNumber: it.batchNumber || 'BATCH-STD',
        requestedQty: it.quantity,
        dispatchedQty: it.quantity,
        receivedQty: 0,
        unit: it.unit,
        unitCost: it.unitCost,
      };
    });

    warehouseStorage.createStockTransfer({
      type: transferType,
      sourceType: transferType === 'warehouse_to_store' ? 'warehouse' : 'store',
      sourceId: transferType === 'warehouse_to_store' ? defaultWh.id : destStoreId,
      sourceName: fromLoc,
      destinationType: transferType === 'warehouse_to_store' ? 'store' : 'warehouse',
      destinationId: transferType === 'warehouse_to_store' ? destStoreId : defaultWh.id,
      destinationName: toLoc,
      requestedDate: new Date().toISOString().split('T')[0],
      dispatchDate: new Date().toISOString().split('T')[0],
      status: 'dispatched_in_transit',
      items: transferItems,
      vehicleNumber: vehicleNo,
      carrierName,
      driverContact: driverPhone ? `${driverName} (${driverPhone})` : driverName,
      dispatchedBy: 'Warehouse Dispatch Officer',
      notes,
    });

    onSuccess();
    onClose();
  };

  const selectedStoreObj = stores.find((s) => s.id === destStoreId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-bold text-base">Dispatch Stock Transfer to Store</h3>
              <p className="text-[11px] text-slate-400">Transfer inventory with vehicle tracking and secure receiving verification</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Transfer Type toggle */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTransferType('warehouse_to_store')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                transferType === 'warehouse_to_store' ? 'bg-white shadow-xs text-amber-950 font-bold' : 'text-slate-600'
              }`}
            >
              Central Warehouse ➔ Store Dispatch
            </button>
            <button
              type="button"
              onClick={() => setTransferType('store_to_warehouse_return')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                transferType === 'store_to_warehouse_return' ? 'bg-white shadow-xs text-rose-950 font-bold' : 'text-slate-600'
              }`}
            >
              Store ➔ Central Warehouse Return
            </button>
          </div>

          {/* Locations Route Display */}
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex-1">
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                {transferType === 'warehouse_to_store' ? 'Source Warehouse' : 'Returning Store'}
              </span>
              <div className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="truncate">
                  {transferType === 'warehouse_to_store' ? defaultWh.name : selectedStoreObj?.name}
                </span>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-amber-600 shrink-0" />

            <div className="flex-1">
              <label className="text-[10px] text-slate-500 font-semibold uppercase block">
                {transferType === 'warehouse_to_store' ? 'Destination Store Outlet' : 'Receiving Warehouse'}
              </label>
              {transferType === 'warehouse_to_store' ? (
                <select
                  value={destStoreId}
                  onChange={(e) => setDestStoreId(e.target.value)}
                  className="w-full mt-0.5 p-1.5 bg-white border border-amber-200 rounded-lg font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <div className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="truncate">{defaultWh.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Vehicle & Logistics Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="text-[10px] text-slate-500 font-semibold block">Vehicle Number</label>
              <input
                type="text"
                required
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-semibold block">Driver Name</label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-semibold block">Driver Phone</label>
              <input
                type="text"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Items Section with Autocomplete Type Box */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Dispatch Line Items & Batch Assignment
                </span>
                <span className="block text-[11px] text-slate-500 font-normal">
                  Type item name (history suggestions appear automatically)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
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
                    <div className="sm:col-span-6">
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
                        Batch Assignment
                      </label>
                      <input
                        type="text"
                        placeholder="Batch No"
                        value={row.batchNumber}
                        onChange={(e) => handleFieldChange(idx, 'batchNumber', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-500 font-semibold mb-0.5 block">
                        Transfer Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
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

                  {/* Item info pill */}
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
              Transfer Remarks & Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Keep betel leaves chilled at 18°C during transit."
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
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
            >
              <Truck className="w-4 h-4" />
              <span>Generate Gate Pass & Dispatch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
