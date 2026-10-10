import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Crown,
  CheckCircle2,
  Sparkles,
  Zap,
  Sliders,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { Order, Customer } from '../../types';
import { CURRENCY } from '../../services/storage';
import { BarcodeVisualizer } from '../common/BarcodeVisualizer';
import { printerService } from '../../services/printerService';
import { soundEffects } from '../../services/audio';

interface POSReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  customer?: Customer | null;
  onNavigateToPrinterSetup?: () => void;
}

export const POSReceiptModal: React.FC<POSReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
  customer,
  onNavigateToPrinterSetup,
}) => {
  const [printerSettings, setPrinterSettings] = useState(() => printerService.getSettings());
  const [printStatusMessage, setPrintStatusMessage] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPrinterSettings(printerService.getSettings());
      setPrintStatusMessage(null);
      setIsPrinting(false);
      setShowOptionsDropdown(false);

      // Auto-Print upon opening if enabled in Printer Setup
      const settings = printerService.getSettings();
      if (settings.autoPrintOnCheckout && order) {
        handleDirectPrint();
      }
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  // Direct Print without prompt
  const handleDirectPrint = async () => {
    setIsPrinting(true);
    setPrintStatusMessage('Sending direct print to thermal printer...');
    try {
      const res = await printerService.printReceipt(order, customer, false);
      if (res.success) {
        setPrintStatusMessage(
          printerSettings.directPrintEnabled
            ? '✓ Printed directly to thermal slip (no dialog prompt)!'
            : '✓ Print job dispatched.'
        );
      } else {
        setPrintStatusMessage('Print completed.');
      }
    } catch (err: any) {
      setPrintStatusMessage(`Direct print issue: ${err.message || 'Check printer connection'}`);
    } finally {
      setIsPrinting(false);
      setTimeout(() => setPrintStatusMessage(null), 4000);
    }
  };

  // Standard Print Dialog (Forces system printer selection dialog)
  const handleDialogPrint = async () => {
    setShowOptionsDropdown(false);
    setIsPrinting(true);
    try {
      await printerService.printReceipt(order, customer, true);
      setPrintStatusMessage('System printer selection dialog opened.');
    } finally {
      setIsPrinting(false);
      setTimeout(() => setPrintStatusMessage(null), 3000);
    }
  };

  const is58mm = printerSettings.paperWidth === '58mm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <h3 className="font-bold text-slate-800 text-xs">Payment Completed</h3>
              <p className="text-[10px] text-slate-500 font-mono">Invoice #{order.orderNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {printerSettings.directPrintEnabled && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 fill-current" /> Direct Print
              </span>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {printStatusMessage && (
          <div className="bg-emerald-600 text-white px-3 py-1.5 text-xs text-center font-bold animate-in fade-in flex items-center justify-center gap-1.5 shadow-inner">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{printStatusMessage}</span>
          </div>
        )}

        {/* Printable Thermal Slip Container */}
        <div className="p-3.5 bg-slate-100/70 overflow-y-auto flex-1 custom-scrollbar">
          <div
            id="printable-receipt"
            className={`bg-white text-slate-900 p-4 rounded-xl shadow-xs font-mono text-xs space-y-3 border border-slate-200 select-all mx-auto ${
              is58mm ? 'max-w-[260px] text-[11px]' : 'max-w-[320px]'
            }`}
          >
            {/* Store Crest / Header */}
            <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-2.5">
              <div className="font-black text-sm uppercase tracking-wider text-slate-900">
                {printerSettings.headerTitle || '★ RICHIE RICH ★'}
              </div>
              {printerSettings.headerTagline && (
                <p className="text-[10px] text-slate-700 font-bold tracking-tight">
                  {printerSettings.headerTagline}
                </p>
              )}
              {printerSettings.headerGstin && (
                <p className="text-[9px] text-slate-500">
                  {printerSettings.headerGstin} • Ph: {printerSettings.headerPhone}
                </p>
              )}
              {printerSettings.headerAddress && (
                <p className="text-[9px] text-slate-500">{printerSettings.headerAddress}</p>
              )}
            </div>

            {/* Order Meta */}
            <div className="text-[10px] space-y-1 border-b border-dashed border-slate-300 pb-2 text-slate-700">
              <div className="flex justify-between">
                <span>INVOICE: <strong>{order.orderNumber}</strong></span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>TIME: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span>PAY: <strong>{order.paymentMethod?.replace('_', ' ').toUpperCase()}</strong></span>
              </div>
              {printerSettings.showCashierAndCounter && (
                <div className="flex justify-between text-slate-600">
                  <span>CASHIER: {order.cashierName || 'POS Terminal 1'}</span>
                  <span>STATION: {(order as any).counterId || 'Reg 1'}</span>
                </div>
              )}
              {order.isModified && (
                <div className="flex justify-between text-amber-900 font-bold bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                  <span>* AMENDED / MODIFIED BILL</span>
                  <span>{order.modifiedAt ? new Date(order.modifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
              )}
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
                  <span>Discount / Savings:</span>
                  <span>-{CURRENCY}{order.discountAmount.toFixed(2)}</span>
                </div>
              )}

              {printerSettings.showTaxBreakdown && (
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>SGST (2.5%) + CGST (2.5%):</span>
                  <span>{CURRENCY}{order.taxAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between font-black text-sm text-slate-950 pt-1 border-t border-slate-300">
                <span>GRAND TOTAL:</span>
                <span>{CURRENCY}{order.grandTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-[10px] text-slate-600 uppercase font-bold pt-0.5">
                <span>STATUS:</span>
                <span className="text-emerald-700">PAID [SUCCESS]</span>
              </div>
            </div>

            {/* Loyalty Rewards Summary */}
            {printerSettings.showCustomerLoyalty && order.loyaltyPointsEarned && order.loyaltyPointsEarned > 0 ? (
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
              {printerSettings.showBarcode && (
                <BarcodeVisualizer
                  value={order.orderNumber.replace(/[^0-9]/g, '') || '8901001001'}
                  width={is58mm ? 140 : 180}
                  height={26}
                  showText={true}
                />
              )}
              {printerSettings.footerGreeting && (
                <p className="text-[9px] text-slate-600 mt-1">{printerSettings.footerGreeting}</p>
              )}
              {printerSettings.footerPolicy && (
                <p className="text-[8px] text-slate-400">{printerSettings.footerPolicy}</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer transition-colors"
            >
              Done
            </button>

            {/* Primary Direct Print Button (No Prompt) */}
            <button
              onClick={handleDirectPrint}
              disabled={isPrinting}
              className="flex-1 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-98"
              title="Prints directly to thermal receipt printer without showing printer selection prompt"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>{isPrinting ? 'Printing Slip...' : 'Print Thermal Slip'}</span>
              <span className="text-[9px] font-mono text-emerald-400 ml-1 font-normal bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/40">
                Direct
              </span>
            </button>

            {/* Dropdown for OS print dialog or setup */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 cursor-pointer transition-colors"
                title="Print options"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showOptionsDropdown && (
                <div className="absolute right-0 bottom-full mb-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-30 text-xs animate-in fade-in slide-in-from-bottom-2">
                  <button
                    type="button"
                    onClick={handleDialogPrint}
                    className="w-full text-left px-2.5 py-2 hover:bg-slate-100 rounded-lg text-slate-700 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>OS Print Dialog...</span>
                  </button>
                  {onNavigateToPrinterSetup && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptionsDropdown(false);
                        onClose();
                        onNavigateToPrinterSetup();
                      }}
                      className="w-full text-left px-2.5 py-2 hover:bg-amber-50 text-amber-900 rounded-lg font-semibold flex items-center gap-2 cursor-pointer border-t border-slate-100"
                    >
                      <Sliders className="w-3.5 h-3.5 text-amber-600" />
                      <span>Printer Setup...</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
