import React, { useState } from 'react';
import { X, AlertTriangle, Building2, Store, Trash2 } from 'lucide-react';
import { Warehouse } from '../../../types/warehouse';
import { InventoryItem, StoreLocation } from '../../../types';
import { CURRENCY } from '../../../services/storage';
import { warehouseStorage } from '../../../services/warehouseStorage';
import { ItemAutocompleteInput } from '../../common/ItemAutocompleteInput';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  stores: StoreLocation[];
  inventory: InventoryItem[];
  onSuccess: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
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
    name: 'Richie Rich Central Master Warehouse (Ahmedabad Hub)',
  };

  const [locationType, setLocationType] = useState<'warehouse' | 'store'>('warehouse');
  const [storeId, setStoreId] = useState(stores[0]?.id || 'bopal');

  const [selectedItemName, setSelectedItemName] = useState(inventory[0]?.name || 'Royal Maghai Meetha Paan');
  const [itemId, setItemId] = useState(inventory[0]?.id || 'item-101');
  const [itemSku, setItemSku] = useState(inventory[0]?.sku || 'PAN-MAG-01');
  const [itemCategory, setItemCategory] = useState(inventory[0]?.category || 'Paan');
  const [itemCost, setItemCost] = useState(inventory[0]?.costPrice || 20);
  const [itemUnit, setItemUnit] = useState(inventory[0]?.unit || 'pieces');

  const [batchNumber, setBatchNumber] = useState('');
  const [reason, setReason] = useState<
    'damage_in_transit' | 'expiry_disposal' | 'physical_audit_correction' | 'scrap_writeoff' | 'sampling_qc'
  >('damage_in_transit');
  const [quantity, setQuantity] = useState(5);
  const [remarks, setRemarks] = useState('');

  const valuationLoss = quantity * itemCost;

  const handleItemSelect = (sel: any) => {
    setSelectedItemName(sel.name);
    setItemId(sel.itemId);
    setItemSku(sel.sku);
    setItemCategory(sel.category || 'Paan');
    setItemCost(sel.costPrice || sel.unitPrice || 20);
    setItemUnit(sel.unit || 'pieces');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const locId = locationType === 'warehouse' ? defaultWh.id : storeId;
    const locName = locationType === 'warehouse' ? defaultWh.name : stores.find((s) => s.id === storeId)?.name || 'Store';

    const prevStock = inventory.find((i) => i.id === itemId)?.stockQuantity || 0;
    const adjustedQty = -Math.abs(quantity);

    let mappedReason: 'damaged_spoilage' | 'expired_batch' | 'physical_count_discrepancy' | 'sampling_tasting' | 'theft_loss' | 'other' = 'damaged_spoilage';
    if (reason === 'expiry_disposal') mappedReason = 'expired_batch';
    else if (reason === 'physical_audit_correction') mappedReason = 'physical_count_discrepancy';
    else if (reason === 'scrap_writeoff') mappedReason = 'theft_loss';
    else if (reason === 'sampling_qc') mappedReason = 'sampling_tasting';

    warehouseStorage.createStockAdjustment({
      locationType,
      locationId: locId,
      locationName: locName,
      date: new Date().toISOString().split('T')[0],
      reason: mappedReason,
      items: [
        {
          itemId,
          sku: itemSku,
          name: selectedItemName,
          batchNumber: batchNumber || undefined,
          previousStock: prevStock,
          adjustedQty,
          unit: itemUnit,
          unitCost: itemCost,
          totalValueImpact: adjustedQty * itemCost,
          itemNotes: remarks,
        },
      ],
      authorizedBy: 'Warehouse Operations Manager',
      status: 'approved_applied',
      notes: remarks || `Adjustment: ${selectedItemName} write-off (${quantity} ${itemUnit})`,
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden my-8">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="font-bold text-base">Record Stock Adjustment & Scrap Loss</h3>
              <p className="text-[11px] text-slate-400">Write-off damaged betel leaves, expired batches, or audit variances</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Location Type */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLocationType('warehouse')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                locationType === 'warehouse' ? 'bg-white shadow-xs text-indigo-950 font-bold' : 'text-slate-600'
              }`}
            >
              Central Warehouse Stock
            </button>
            <button
              type="button"
              onClick={() => setLocationType('store')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                locationType === 'store' ? 'bg-white shadow-xs text-emerald-950 font-bold' : 'text-slate-600'
              }`}
            >
              Store Branch Stock
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Location
            </label>
            {locationType === 'warehouse' ? (
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="truncate">{defaultWh.name}</span>
              </div>
            ) : (
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Product Autocomplete Input Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Damaged / Discrepant Product
            </label>
            <ItemAutocompleteInput
              value={selectedItemName}
              placeholder="Type product name or SKU..."
              inventory={inventory}
              onSelect={handleItemSelect}
              onChange={(val) => setSelectedItemName(val)}
              inputClassName="bg-slate-50"
            />
            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">SKU: {itemSku}</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold">{itemCategory}</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded">Cost: {CURRENCY}{itemCost}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Batch No. (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. BATCH-AMD-01"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Adjustment Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="damage_in_transit">Damage in Transit</option>
                <option value="expiry_disposal">Expired Shelf-Life Disposal</option>
                <option value="physical_audit_correction">Physical Audit Discrepancy</option>
                <option value="scrap_writeoff">Theft / Spoilage Scrap</option>
                <option value="sampling_qc">Tasting & Quality QC Test</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Scrapped Quantity
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Valuation Impact
              </label>
              <div className="w-full p-2 bg-rose-50 border border-rose-100 rounded-xl text-xs font-mono font-bold text-rose-700 text-right">
                -{CURRENCY}{valuationLoss.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Remarks & Root Cause
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Moisture ingress during monsoon delivery caused leaves to rot."
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

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
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Apply Stock Write-off</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
