import React, { useState } from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  Save,
  AlertCircle,
  Receipt,
  User,
  CreditCard,
  Banknote,
  QrCode,
  Sparkles,
  ShoppingBag,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Order, OrderItem, PaymentMethod, InventoryItem } from '../../types';
import { CURRENCY, storage } from '../../services/storage';

interface POSModifyBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  inventory: InventoryItem[];
  onOrderUpdated: (updatedOrder: Order) => void;
  cashierName?: string;
  storeId?: string;
}

export const POSModifyBillModal: React.FC<POSModifyBillModalProps> = ({
  isOpen,
  onClose,
  order,
  inventory,
  onOrderUpdated,
  cashierName = 'POS Cashier',
  storeId,
}) => {
  if (!isOpen || !order) return null;

  const [items, setItems] = useState<OrderItem[]>(() =>
    order.items.map((it) => ({ ...it }))
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order.paymentMethod);
  const [customerName, setCustomerName] = useState<string>(order.customerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(order.customerPhone || '');
  const [modificationReason, setModificationReason] = useState<string>(
    'Item quantity adjusted per customer request'
  );
  const [notes, setNotes] = useState<string>(order.notes || '');
  const [searchItemTerm, setSearchItemTerm] = useState<string>('');
  const [showAddItemDropdown, setShowAddItemDropdown] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter available items to add
  const availableItems = inventory.filter((item) => {
    if (!searchItemTerm.trim()) return false;
    const term = searchItemTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      item.sku.toLowerCase().includes(term) ||
      (item.barcode && item.barcode.toLowerCase().includes(term))
    );
  }).slice(0, 6);

  // Recalculate totals
  const subtotal = items.reduce((sum, it) => sum + it.subtotal, 0);
  const discountAmount = order.discountAmount || 0; // retain promo discount
  const taxableSubtotal = items.reduce(
    (sum, it) => sum + (it.isTaxApplicable !== false ? it.subtotal : 0),
    0
  );
  const taxAmount = Math.round(taxableSubtotal * 0.05 * 100) / 100;
  const grandTotal = Math.max(0, Math.round((subtotal - discountAmount + taxAmount) * 100) / 100);
  const totalCost = items.reduce((sum, it) => sum + (it.costPrice || 0) * it.quantity, 0);
  const totalProfit = Math.round((grandTotal - totalCost) * 100) / 100;

  const handleQuantityChange = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.quantity = newQty;
      item.subtotal = Math.round(item.quantity * item.price * 100) / 100;
      item.profit = Math.round((item.subtotal - item.quantity * item.costPrice) * 100) / 100;
      copy[index] = item;
      return copy;
    });
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    const validPrice = Math.max(0, newPrice);
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.price = validPrice;
      item.subtotal = Math.round(item.quantity * validPrice * 100) / 100;
      item.profit = Math.round((item.subtotal - item.quantity * item.costPrice) * 100) / 100;
      copy[index] = item;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setErrorMsg('A bill must have at least 1 item. Cancel the order instead if needed.');
      return;
    }
    setErrorMsg(null);
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddNewItem = (invItem: InventoryItem) => {
    const existingIndex = items.findIndex((it) => it.itemId === invItem.id);
    if (existingIndex > -1) {
      handleQuantityChange(existingIndex, items[existingIndex].quantity + 1);
    } else {
      const isLoose = invItem.sellAsLoose && invItem.loosePrice ? true : false;
      const price = isLoose ? invItem.loosePrice || invItem.sellingPrice : invItem.sellingPrice;
      const cost = invItem.costPrice || 0;
      const newItem: OrderItem = {
        itemId: invItem.id,
        name: invItem.name,
        sku: invItem.sku,
        price,
        costPrice: cost,
        quantity: 1,
        subtotal: price,
        profit: price - cost,
        isTaxApplicable: invItem.isTaxApplicable !== false,
        taxRate: 5,
        piecesPerBox: invItem.piecesPerBox || 1,
      };
      setItems((prev) => [...prev, newItem]);
    }
    setSearchItemTerm('');
    setShowAddItemDropdown(false);
  };

  const handleSave = () => {
    if (items.length === 0) {
      setErrorMsg('Cannot save empty bill.');
      return;
    }
    if (!modificationReason.trim()) {
      setErrorMsg('Please specify a modification reason for the audit trail.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = storage.modifyOrder(order.id, {
        items,
        subtotal,
        discountAmount,
        appliedPromoCode: order.appliedPromoCode,
        loyaltyPointsUsed: order.loyaltyPointsUsed,
        taxAmount,
        grandTotal,
        totalCost,
        totalProfit,
        paymentMethod,
        paymentStatus: order.paymentStatus || 'paid',
        status: order.status,
        notes: notes.trim(),
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerId: order.customerId,
        modificationReason: modificationReason.trim(),
        modifiedBy: cashierName,
      });

      if (updated) {
        onOrderUpdated(updated);
        onClose();
      } else {
        setErrorMsg('Failed to update order in local storage.');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Error saving modified bill.');
    } finally {
      setIsSaving(false);
    }
  };

  const netDiff = grandTotal - order.grandTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white">
                  Modify Bill #{order.orderNumber}
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold">
                  Original: {CURRENCY}{order.grandTotal.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Logged at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {order.storeName || 'Current Store'} • Cashier: {order.cashierName || cashierName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] space-y-0.5">
              <span className="font-bold">Real-Time Stock & Financial Reconciliation:</span>
              <p className="text-amber-800">
                Modifying item quantities or rates will automatically return or deduct inventory from this store's stock, recalculate customer loyalty, and adjust the sales ledger.
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <ShoppingBag className="w-3.5 h-3.5 text-slate-500" /> Bill Line Items ({items.length})
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddItemDropdown(!showAddItemDropdown)}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Product
                </button>
              </div>
            </div>

            {/* Add Product Search Dropdown */}
            {showAddItemDropdown && (
              <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl space-y-2 animate-in fade-in duration-100">
                <input
                  type="text"
                  autoFocus
                  placeholder="Search catalog to add item (e.g. Royal Meetha Paan, Cold Coffee)..."
                  value={searchItemTerm}
                  onChange={(e) => setSearchItemTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
                />
                {availableItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                    {availableItems.map((inv) => (
                      <button
                        key={inv.id}
                        type="button"
                        onClick={() => handleAddNewItem(inv)}
                        className="p-2 bg-white hover:bg-amber-50 text-left border border-slate-200 hover:border-amber-300 rounded-lg flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div className="truncate pr-2">
                          <p className="font-bold text-slate-900 text-xs truncate">{inv.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{inv.sku} • {inv.unit}</p>
                        </div>
                        <span className="font-bold text-slate-900 text-xs shrink-0">
                          {CURRENCY}{inv.sellingPrice}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : searchItemTerm ? (
                  <p className="text-[11px] text-slate-400 italic">No matching products found.</p>
                ) : null}
              </div>
            )}

            {/* Items List */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
              {items.map((item, idx) => (
                <div key={idx} className="p-2.5 sm:p-3 flex items-center justify-between gap-2 hover:bg-slate-50/50">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-xs truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      SKU: {item.sku} {item.saleType ? `• ${item.saleType}` : ''}
                    </p>
                  </div>

                  {/* Price input */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-slate-400">Rate:</span>
                    <div className="relative">
                      <span className="absolute left-1.5 top-1 text-[11px] text-slate-400 font-bold">{CURRENCY}</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.price}
                        onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                        className="w-18 pl-4 pr-1 py-0.5 bg-slate-50 border border-slate-200 rounded text-right font-mono text-xs font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                      className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded cursor-pointer"
                      title="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-xs font-mono text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                      className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded cursor-pointer"
                      title="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="w-20 text-right font-bold text-slate-900 font-mono text-xs shrink-0">
                    {CURRENCY}{item.subtotal.toFixed(2)}
                  </div>

                  {/* Delete Item */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer shrink-0 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method & Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-600" /> Payment Tender Mode
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" /> Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi_qr')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    paymentMethod === 'upi_qr'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" /> UPI QR
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    paymentMethod === 'card'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" /> Card
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-600" /> Customer Information
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:border-amber-500"
                />
                <input
                  type="text"
                  placeholder="10-digit Phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-mono focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Audit Reason & Notes */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              Reason for Bill Modification <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Guest returned 1 paan and ordered cold beverage instead"
              value={modificationReason}
              onChange={(e) => setModificationReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
            />
          </div>

          {/* Financial Calculation Summary */}
          <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2 font-mono">
            <div className="flex justify-between text-xs text-slate-300">
              <span>Items Subtotal:</span>
              <span>{CURRENCY}{subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-emerald-400">
                <span>Discount / Promo:</span>
                <span>-{CURRENCY}{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-300">
              <span>GST (5% Tax):</span>
              <span>{CURRENCY}{taxAmount.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-black">
              <span className="text-amber-400">Adjusted Grand Total:</span>
              <span className="text-white text-base">{CURRENCY}{grandTotal.toFixed(2)}</span>
            </div>

            {/* Difference / Net adjustment badge */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400">
              <span>Previous Total: {CURRENCY}{order.grandTotal.toFixed(2)}</span>
              {netDiff === 0 ? (
                <span className="text-slate-400">No net monetary change</span>
              ) : netDiff > 0 ? (
                <span className="text-amber-400 font-bold">
                  ▲ Collect Extra: +{CURRENCY}{netDiff.toFixed(2)}
                </span>
              ) : (
                <span className="text-emerald-400 font-bold">
                  ▼ Refund/Return to Patron: -{CURRENCY}{Math.abs(netDiff).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-200 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Updating Bill...' : 'Save & Sync Modified Bill'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
