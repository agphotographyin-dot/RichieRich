import React, { useState, useMemo } from 'react';
import {
  X,
  PackageCheck,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  ShieldCheck,
  Truck,
  IndianRupee,
  Layers,
} from 'lucide-react';
import { StoreLocation, InventoryItem } from '../../types';
import { PurchaseOrder } from '../../types/warehouse';
import { warehouseStorage } from '../../services/warehouseStorage';
import { soundEffects } from '../../services/audio';

interface ReceiveDirectStoreGoodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStore: StoreLocation;
  inventory: InventoryItem[];
  adminName?: string;
  preselectedPO?: PurchaseOrder | null;
  onSuccess: () => void;
}

interface InwardItemRow {
  itemId: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  orderedQty: number;
  previouslyReceivedQty: number;
  pendingQty: number;
  quantityReceivedNow: number;
  damagedQty: number;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  unitCost: number;
  taxPercent: number;
  currentStoreStock: number;
}

export const ReceiveDirectStoreGoodsModal: React.FC<ReceiveDirectStoreGoodsModalProps> = ({
  isOpen,
  onClose,
  currentStore,
  inventory,
  adminName,
  preselectedPO,
  onSuccess,
}) => {
  const allStorePOs = useMemo(() => {
    return warehouseStorage
      .getPurchaseOrders()
      .filter(
        (po) =>
          (po.storeId === currentStore.id || po.destinationId === currentStore.id) &&
          (po.status === 'sent_to_supplier' || po.status === 'partially_received' || po.status === 'approved')
      );
  }, [currentStore.id]);

  const [selectedPOId, setSelectedPOId] = useState<string>(() => {
    return preselectedPO?.id || allStorePOs[0]?.id || '';
  });

  const activePO = useMemo(() => {
    if (preselectedPO && preselectedPO.id === selectedPOId) return preselectedPO;
    return (
      allStorePOs.find((p) => p.id === selectedPOId) ||
      warehouseStorage.getPurchaseOrders().find((p) => p.id === selectedPOId) ||
      allStorePOs[0] ||
      null
    );
  }, [selectedPOId, preselectedPO, allStorePOs]);

  // Form states
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState<string>(
    `INV-SUP-${Date.now().toString().slice(-4)}`
  );
  const [receivedDate, setReceivedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [receivedBy, setReceivedBy] = useState<string>(adminName || 'Store Manager');
  const [inwardNotes, setInwardNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Inward Item Rows
  const [itemRows, setItemRows] = useState<InwardItemRow[]>([]);

  // When activePO changes, rebuild item rows
  React.useEffect(() => {
    if (!activePO) {
      setItemRows([]);
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultExpiry = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];

    const rows: InwardItemRow[] = activePO.items.map((it) => {
      const inv = inventory.find((i) => i.id === it.itemId || i.sku === it.sku);
      const storeStock = inv?.storeAllocations?.[currentStore.id] || 0;
      const prevReceived = it.quantityReceived || 0;
      const pending = Math.max(0, it.quantityOrdered - prevReceived);

      return {
        itemId: it.itemId,
        sku: it.sku,
        name: it.name,
        category: it.category || 'General',
        unit: it.unit || 'boxes',
        orderedQty: it.quantityOrdered,
        previouslyReceivedQty: prevReceived,
        pendingQty: pending,
        quantityReceivedNow: pending, // Defaults to remaining pending
        damagedQty: 0,
        batchNumber: `BATCH-STR-${it.sku.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
        mfgDate: todayStr,
        expiryDate: defaultExpiry,
        unitCost: it.unitPrice,
        taxPercent: it.taxPercent || 5,
        currentStoreStock: storeStock,
      };
    });

    setItemRows(rows);
  }, [activePO, inventory, currentStore.id]);

  if (!isOpen) return null;

  const handleUpdateItem = (itemId: string, field: keyof InwardItemRow, value: any) => {
    setItemRows((prev) =>
      prev.map((row) => (row.itemId === itemId ? { ...row, [field]: value } : row))
    );
  };

  const totalInwardingUnits = itemRows.reduce(
    (sum, r) => sum + (Number(r.quantityReceivedNow) || 0),
    0
  );
  const totalInwardValuation = itemRows.reduce(
    (sum, r) => sum + (Number(r.quantityReceivedNow) || 0) * r.unitCost,
    0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!activePO) {
      setErrorMessage('No active purchase order selected.');
      return;
    }

    if (!supplierInvoiceNo.trim()) {
      setErrorMessage('Please enter the Supplier Invoice / Delivery Reference number.');
      return;
    }

    const itemsToInward = itemRows.filter((r) => Number(r.quantityReceivedNow) > 0);
    if (itemsToInward.length === 0) {
      setErrorMessage('Please enter received quantity for at least one line item.');
      return;
    }

    // Validate quantities against pending
    for (const item of itemsToInward) {
      if (item.quantityReceivedNow > item.pendingQty) {
        if (
          !confirm(
            `Quantity for ${item.name} (${item.quantityReceivedNow} ${item.unit}) exceeds remaining pending quantity (${item.pendingQty} ${item.unit}). Do you want to accept this surplus delivery?`
          )
        ) {
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const result = warehouseStorage.receiveDirectStorePO({
        poId: activePO.id,
        storeId: currentStore.id,
        storeName: currentStore.name,
        supplierInvoiceNo: supplierInvoiceNo.trim(),
        receivedBy: receivedBy.trim(),
        billDate: receivedDate,
        notes: inwardNotes.trim() || undefined,
        items: itemsToInward.map((r) => ({
          itemId: r.itemId,
          sku: r.sku,
          name: r.name,
          category: r.category,
          quantityReceivedNow: Number(r.quantityReceivedNow),
          damagedQty: Number(r.damagedQty) || 0,
          batchNumber: r.batchNumber.trim(),
          mfgDate: r.mfgDate,
          expiryDate: r.expiryDate,
          unitCost: r.unitCost,
          unit: r.unit,
          taxPercent: r.taxPercent,
        })),
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Failed to complete goods receiving.');
        setIsSubmitting(false);
        return;
      }

      soundEffects.playSuccessChime();
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during stock inwarding.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 bg-[#1E293B] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-white">
                  Direct Stock Inward / Goods Receipt
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  Direct Store Delivery
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Receiving goods directly at <strong className="text-amber-400">{currentStore.name}</strong> from Supplier
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
        <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 flex items-center gap-2.5 text-xs text-emerald-950">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Authoritative Stock Update:</strong> Inwarded quantities will be added immediately to <strong>{currentStore.name}</strong> inventory.
            Central Warehouse inventory remains independent and unchanged.
          </span>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: PO & Delivery Invoice Identification */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>1. Select Purchase Order & Invoice Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* PO Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Target Purchase Order *
                </label>
                {allStorePOs.length === 0 && !activePO ? (
                  <div className="text-xs text-red-500 font-bold p-2 bg-white rounded-lg border border-red-200">
                    No open POs found for this store.
                  </div>
                ) : (
                  <select
                    value={selectedPOId}
                    onChange={(e) => setSelectedPOId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:border-emerald-500 font-mono"
                  >
                    {allStorePOs.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.poNumber} — {po.supplierName} (₹{po.grandTotal.toFixed(0)}) [{po.status.toUpperCase()}]
                      </option>
                    ))}
                  </select>
                )}
                {activePO && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Supplier: <strong>{activePO.supplierName}</strong> • Ordered on: {activePO.orderDate}
                  </p>
                )}
              </div>

              {/* Supplier Invoice # */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Supplier Invoice / Bill No. *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. INV-99412 or CHALLAN-102"
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Received By */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Received & Verified By *
                </label>
                <input
                  type="text"
                  required
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Line Items Verification & Inward Quantities */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>2. Inward Physical Quantities & Batch Details</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                📦 Box Unit Rule: Inwarding records whole boxes as configured in catalog
              </span>
            </div>

            {itemRows.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                No items to inward. Please select a valid Purchase Order.
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Product Name & SKU</th>
                        <th className="py-2.5 px-3 text-center">Ordered</th>
                        <th className="py-2.5 px-3 text-center">Already Received</th>
                        <th className="py-2.5 px-3 text-center">Pending</th>
                        <th className="py-2.5 px-3 w-28 text-emerald-700 bg-emerald-50/40 text-center">
                          Receive Now ({itemRows[0]?.unit || 'Boxes'})
                        </th>
                        <th className="py-2.5 px-3 w-24">Damaged / Miss</th>
                        <th className="py-2.5 px-3 w-32">Batch Number</th>
                        <th className="py-2.5 px-3 w-28">Expiry Date</th>
                        <th className="py-2.5 px-3 text-right">Store Stock Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {itemRows.map((row) => {
                        const newCalculatedStock =
                          row.currentStoreStock + (Number(row.quantityReceivedNow) || 0);

                        return (
                          <tr key={row.itemId} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{row.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                SKU: {row.sku} • Unit: {row.unit}
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                              {row.orderedQty} {row.unit}
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                              {row.previouslyReceivedQty} {row.unit}
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-black text-amber-700">
                              {row.pendingQty} {row.unit}
                            </td>

                            <td className="py-2.5 px-3 bg-emerald-50/40">
                              <input
                                type="number"
                                min="0"
                                max={row.orderedQty * 2}
                                value={row.quantityReceivedNow}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    row.itemId,
                                    'quantityReceivedNow',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1 text-center font-mono font-black text-emerald-950 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>

                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min="0"
                                value={row.damagedQty}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    row.itemId,
                                    'damagedQty',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center font-mono text-slate-700 focus:outline-hidden focus:bg-white"
                              />
                            </td>

                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={row.batchNumber}
                                onChange={(e) =>
                                  handleUpdateItem(row.itemId, 'batchNumber', e.target.value)
                                }
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono text-[11px] text-slate-800 focus:outline-hidden focus:bg-white"
                              />
                            </td>

                            <td className="py-2.5 px-3">
                              <input
                                type="date"
                                value={row.expiryDate}
                                onChange={(e) =>
                                  handleUpdateItem(row.itemId, 'expiryDate', e.target.value)
                                }
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 text-[11px] font-mono text-slate-800 focus:outline-hidden focus:bg-white"
                              />
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <div className="font-mono text-xs font-bold text-emerald-700">
                                {row.currentStoreStock} ➔ <span className="text-emerald-900 font-black">{newCalculatedStock} {row.unit}</span>
                              </div>
                              <div className="text-[10px] text-slate-400">
                                (+{row.quantityReceivedNow} {row.unit})
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Receiving Notes & Summary Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Goods Receipt / Inward Remarks
              </label>
              <textarea
                rows={2}
                value={inwardNotes}
                onChange={(e) => setInwardNotes(e.target.value)}
                placeholder="e.g. Packages verified in fresh condition. Temperature check normal."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-emerald-500"
              />
            </div>

            <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col justify-between">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Total Inward Units:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    +{totalInwardingUnits} {itemRows[0]?.unit || 'Boxes'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Source Movement:</span>
                  <span className="font-bold text-amber-300">Direct Supplier Purchase</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Destination Store:</span>
                  <span className="font-bold text-white">{currentStore.name}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Inward Valuation:</span>
                <span className="text-base font-black font-mono text-white">
                  ₹{totalInwardValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-600">
            PO: <strong className="text-slate-900 font-mono">{activePO?.poNumber}</strong> • Supplier: {activePO?.supplierName}
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
              disabled={isSubmitting || totalInwardingUnits <= 0}
              className={`px-5 py-2.5 text-white text-xs font-black rounded-xl cursor-pointer shadow-xs transition-all flex items-center gap-2 ${
                isSubmitting || totalInwardingUnits <= 0
                  ? 'bg-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>{isSubmitting ? 'Inwarding Stock...' : 'Confirm & Inward Stock to Store'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
