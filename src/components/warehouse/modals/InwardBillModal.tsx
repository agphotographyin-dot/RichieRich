import React, { useState } from 'react';
import { X, Plus, Trash2, PackagePlus, Building2, Calendar, FileText } from 'lucide-react';
import { Supplier, Warehouse, PurchaseBillItem } from '../../../types/warehouse';
import { InventoryItem } from '../../../types';
import { CURRENCY } from '../../../services/storage';
import { warehouseStorage } from '../../../services/warehouseStorage';
import { ItemAutocompleteInput } from '../../common/ItemAutocompleteInput';

interface InwardBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  warehouses: Warehouse[];
  inventory: InventoryItem[];
  onSuccess: () => void;
}

export const InwardBillModal: React.FC<InwardBillModalProps> = ({
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
    name: 'Richie Rich Central Master Warehouse (Ahmedabad Hub)',
  };

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [invoiceNo, setInvoiceNo] = useState(`INV-${Date.now().toString().slice(-6)}`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'credit_payable' | 'cash' | 'bank_neft' | 'upi_qr'>('credit_payable');
  const [notes, setNotes] = useState('');

  const [items, setItems] = useState<
    Array<{
      itemId: string;
      name: string;
      sku: string;
      category: string;
      quantity: number;
      unitCost: number;
      unit: string;
      batchNumber: string;
      mfgDate: string;
      expiryDate: string;
    }>
  >([
    {
      itemId: inventory[0]?.id || 'item-101',
      name: inventory[0]?.name || 'Royal Maghai Meetha Paan',
      sku: inventory[0]?.sku || 'PAN-MAG-01',
      category: inventory[0]?.category || 'Paan',
      quantity: 100,
      unitCost: inventory[0]?.costPrice || 20,
      unit: inventory[0]?.unit || 'pieces',
      batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
      mfgDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  ]);

  const handleAddItem = () => {
    const defaultItem = inventory[0] || {
      id: `item-${Date.now()}`,
      name: '',
      sku: 'SKU-INW',
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
        unitCost: defaultItem.costPrice || 20,
        unit: defaultItem.unit || 'pieces',
        batchNumber: `BATCH-${Date.now().toString().slice(-4)}`,
        mfgDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
      unitCost: selected.costPrice || selected.unitPrice || 20,
      unit: selected.unit || 'pieces',
    };
    setItems(next);
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };

  const subTotal = items.reduce((sum, it) => sum + it.quantity * it.unitCost, 0);
  const gstAmount = Math.round(subTotal * 0.05);
  const grandTotal = subTotal + gstAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedSupplier = suppliers.find((s) => s.id === supplierId);

    const billItems: PurchaseBillItem[] = items.map((it) => {
      const totalAmount = it.quantity * it.unitCost;
      const gst = Math.round(totalAmount * 0.05);
      return {
        itemId: it.itemId,
        sku: it.sku,
        name: it.name,
        category: it.category,
        quantity: it.quantity,
        unitCost: it.unitCost,
        unit: it.unit,
        taxRate: 5,
        taxAmount: gst,
        totalCost: totalAmount + gst,
        batchNumber: it.batchNumber || `BATCH-${Date.now().toString().slice(-4)}`,
        mfgDate: it.mfgDate,
        expiryDate: it.expiryDate,
      };
    });

    warehouseStorage.createPurchaseBill({
      supplierId,
      supplierName: selectedSupplier?.name || 'Supplier',
      warehouseId: defaultWh.id,
      warehouseName: defaultWh.name,
      supplierInvoiceNo: invoiceNo,
      billDate: invoiceDate,
      receivedDate: new Date().toISOString().split('T')[0],
      items: billItems,
      subtotal: subTotal,
      gstAmount,
      freightCharges: 0,
      roundOff: 0,
      grandTotal,
      paidAmount: paymentMode === 'immediate' ? grandTotal : 0,
      dueAmount: paymentMode === 'immediate' ? 0 : grandTotal,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentStatus: paymentMode === 'immediate' ? 'paid' : 'due',
      grnStatus: 'verified_stocked',
      receivedBy: 'Warehouse Inward Officer',
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
            <PackagePlus className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">Inward Goods Receipt Note (GRN) & Bill</h3>
              <p className="text-[11px] text-slate-400">Add physical stock to Central Master Warehouse with live batch numbers</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Supplier, Single Warehouse & Invoice info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Supplier / Vendor
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Receiving Central Hub
              </label>
              <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{defaultWh.name}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Vendor Invoice No.
              </label>
              <input
                type="text"
                required
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Payment Settlement Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
              >
                <option value="credit_payable">Credit Purchase (Add to Ledger Payable)</option>
                <option value="bank_neft">Paid via Bank NEFT/RTGS</option>
                <option value="upi_qr">Paid via UPI / QR</option>
                <option value="cash">Paid via Cash</option>
              </select>
            </div>
          </div>

          {/* Line items with Search / History Box */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Inward Stock & Batch Details
                </span>
                <span className="block text-[11px] text-slate-500 font-normal">
                  Type item name (history suggestions appear automatically)
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
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
                        placeholder="Type item name or SKU..."
                        inventory={inventory}
                        onSelect={(sel) => handleItemSelect(idx, sel)}
                        onChange={(val) => handleFieldChange(idx, 'name', val)}
                        inputClassName="bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-500 font-semibold mb-0.5 block">
                        Inward Qty
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

                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-500 font-semibold mb-0.5 block">
                        Unit Cost ({CURRENCY})
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Cost"
                        value={row.unitCost}
                        onChange={(e) => handleFieldChange(idx, 'unitCost', parseFloat(e.target.value) || 0)}
                        className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-right"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-3 sm:pt-0">
                      <div className="text-right font-mono text-xs font-bold text-slate-800">
                        {CURRENCY}{(row.quantity * row.unitCost).toLocaleString('en-IN')}
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

                  {/* Batch Number & Expiry fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200/60">
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold block">Batch Number</label>
                      <input
                        type="text"
                        placeholder="e.g. BATCH-2026-A"
                        value={row.batchNumber}
                        onChange={(e) => handleFieldChange(idx, 'batchNumber', e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold block">Manufacturing Date</label>
                      <input
                        type="date"
                        value={row.mfgDate}
                        onChange={(e) => handleFieldChange(idx, 'mfgDate', e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold block">Expiry Date</label>
                      <input
                        type="date"
                        value={row.expiryDate}
                        onChange={(e) => handleFieldChange(idx, 'expiryDate', e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Valuation Summary Box */}
          <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center justify-between text-xs font-mono">
            <span className="font-sans font-semibold text-slate-700">
              Taxable: {CURRENCY}{subTotal.toLocaleString('en-IN')} + 5% GST: {CURRENCY}{gstAmount.toLocaleString('en-IN')}
            </span>
            <span className="text-sm font-extrabold text-emerald-950">
              Total Inward Bill: {CURRENCY}{grandTotal.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Inspection / Quality Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received in fresh condition with dry ice packing. QC verified."
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Record Inward Stock & Post Bill</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
