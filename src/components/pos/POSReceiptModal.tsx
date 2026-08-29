import React from 'react';
import { X, Printer, Crown, CheckCircle2, Download, Sparkles } from 'lucide-react';
import { Order, Customer } from '../../types';
import { CURRENCY } from '../../services/storage';
import { BarcodeVisualizer } from '../common/BarcodeVisualizer';

interface POSReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  customer?: Customer | null;
}

export const POSReceiptModal: React.FC<POSReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
  customer,
}) => {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-slate-800 text-xs">Payment Completed & Receipt Generated</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Slip */}
        <div className="p-4 bg-slate-100/70 overflow-y-auto max-h-[75vh]">
          <div
            id="printable-receipt"
            className="bg-white text-slate-900 p-5 rounded-xl shadow-xs font-mono text-xs space-y-3 border border-slate-200 select-all"
          >
            {/* Store Crest */}
            <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3">
              <div className="font-black text-sm uppercase tracking-wider text-slate-900">
                ★ RICHIE RICH ★
              </div>
              <p className="text-[10px] text-slate-700 font-bold tracking-tight">Pan | Coffee | Essentials | 24x7</p>
              <p className="text-[9px] text-slate-500">GSTIN: 27AABCR1234F1Z8 • Ph: +91 98201 99882</p>
              <p className="text-[9px] text-slate-500">Ahmedabad Chain Outlets • Gujarat</p>
            </div>

            {/* Order Meta */}
            <div className="text-[10px] space-y-1 border-b border-dashed border-slate-300 pb-2 text-slate-700">
              <div className="flex justify-between">
                <span>INVOICE: <strong>{order.orderNumber}</strong></span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>TIME: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>CASHIER: {order.cashierName || 'POS Terminal 1'}</span>
              </div>
              {order.customerName && (
                <div className="flex justify-between font-bold text-slate-900 pt-0.5">
                  <span>PATRON: {order.customerName}</span>
                  <span>{order.customerPhone ? `*${order.customerPhone.slice(-4)}` : ''}</span>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-600 border-b border-slate-200 pb-1">
                <span>ITEM</span>
                <span>QTY x RATE</span>
                <span>AMT</span>
              </div>

              {order.items.map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-bold text-[11px]">
                    <span className="truncate max-w-[150px]">{it.name}</span>
                    <span>{CURRENCY}{it.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>{it.quantity} x {CURRENCY}{it.price}</span>
                    {it.customization && <span className="italic text-slate-600">[{it.customization}]</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2 text-slate-800">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{CURRENCY}{order.subtotal.toFixed(2)}</span>
              </div>

              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Discount ({order.appliedPromoCode || 'Promo'}):</span>
                  <span>-{CURRENCY}{order.discountAmount.toFixed(2)}</span>
                </div>
              )}

              {order.loyaltyPointsUsed && order.loyaltyPointsUsed > 0 ? (
                <div className="flex justify-between text-amber-800 font-bold">
                  <span>Loyalty Pts Redeemed ({order.loyaltyPointsUsed} pts):</span>
                  <span>-{CURRENCY}{(order.loyaltyPointsUsed * 0.1).toFixed(2)}</span>
                </div>
              ) : null}

              <div className="flex justify-between text-[10px] text-slate-600">
                <span>SGST (2.5%) + CGST (2.5%):</span>
                <span>{CURRENCY}{order.taxAmount.toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-black text-sm text-slate-950 pt-1 border-t border-slate-300">
                <span>GRAND TOTAL:</span>
                <span>{CURRENCY}{order.grandTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-[10px] text-slate-600 uppercase font-bold pt-1">
                <span>PAID VIA:</span>
                <span>{order.paymentMethod.replace('_', ' ')} [SUCCESS]</span>
              </div>
            </div>

            {/* Loyalty Rewards Summary */}
            {order.loyaltyPointsEarned && order.loyaltyPointsEarned > 0 ? (
              <div className="bg-amber-50 p-2 rounded-md border border-amber-200 text-center text-[10px] text-amber-900 space-y-0.5">
                <div className="font-bold flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  + {order.loyaltyPointsEarned} Royalty Points Earned!
                </div>
                {customer && (
                  <p className="text-[9px] text-slate-600">
                    Total Balance: <strong>{customer.loyaltyPoints} pts</strong> ({customer.tier} Tier)
                  </p>
                )}
              </div>
            ) : null}

            {/* Barcode & Footer */}
            <div className="text-center pt-1 space-y-1">
              <BarcodeVisualizer value={order.orderNumber.replace(/[^0-9]/g, '') || '8901001001'} width={180} height={30} showText={true} />
              <p className="text-[9px] text-slate-500 mt-1">Thank you for visiting Richie Rich Pan House!</p>
              <p className="text-[8px] text-slate-400">Fresh artisanal leaves prepared with royal hygiene.</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer transition-colors"
          >
            Done
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2 bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
          >
            <Printer className="w-4 h-4 text-sky-400" /> Print Thermal Slip
          </button>
        </div>
      </div>
    </div>
  );
};
