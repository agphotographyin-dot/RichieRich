import React, { useState } from 'react';
import {
  X,
  Printer,
  FileText,
  Truck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Package,
  Copy,
  Check,
  AlertCircle,
  FileSpreadsheet,
  QrCode,
  Store,
  Layers,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import { PurchaseOrder, StockTransfer, PurchaseBill, StoreStockIndent } from '../../types/warehouse';
import { Order } from '../../types';
import { CURRENCY } from '../../services/storage';
import { BarcodeVisualizer } from './BarcodeVisualizer';

export type ManifestDocumentType =
  | 'purchase_order'
  | 'stock_transfer'
  | 'purchase_bill'
  | 'store_indent'
  | 'retail_order';

export interface DocumentManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: ManifestDocumentType;
  documentData: PurchaseOrder | StockTransfer | PurchaseBill | StoreStockIndent | Order | null;
}

// Convert numbers to Indian Rupees Words
function numberToWordsINR(num: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Zero Rupees Only';

  const inWords = (nVal: number): string => {
    let str = '';
    if (nVal > 19) {
      str += b[Math.floor(nVal / 10)] + ' ' + a[nVal % 10];
    } else {
      str += a[nVal];
    }
    return str.trim();
  };

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = Math.floor((n % 1000) / 100);
  const remainder = n % 100;

  let result = '';
  if (crore > 0) result += inWords(crore) + ' Crore ';
  if (lakh > 0) result += inWords(lakh) + ' Lakh ';
  if (thousand > 0) result += inWords(thousand) + ' Thousand ';
  if (hundred > 0) result += inWords(hundred) + ' Hundred ';
  if (remainder > 0) {
    if (result !== '') result += 'and ';
    result += inWords(remainder) + ' ';
  }

  return 'Rupees ' + result.trim() + ' Only';
}

export const DocumentManifestModal: React.FC<DocumentManifestModalProps> = ({
  isOpen,
  onClose,
  documentType,
  documentData,
}) => {
  const [copied, setCopied] = useState(false);
  const [printFormat, setPrintFormat] = useState<'a4' | 'thermal'>('a4');

  if (!isOpen || !documentData) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    let text = '';
    if (documentType === 'purchase_order') {
      const po = documentData as PurchaseOrder;
      text = `[PURCHASE ORDER MANIFEST]\nPO Number: ${po.poNumber}\nSupplier: ${po.supplierName} (GSTIN: ${po.supplierGstin})\nDestination: ${po.destinationWarehouseName}\nOrder Date: ${po.orderDate}\nTotal Amount: ${CURRENCY}${po.grandTotal}\nItems: ${po.items.map(i => `${i.quantityOrdered}x ${i.name}`).join(', ')}`;
    } else if (documentType === 'stock_transfer') {
      const st = documentData as StockTransfer;
      text = `[STOCK TRANSFER MANIFEST & GATE PASS]\nTransfer Ref: ${st.transferNumber}\nRoute: ${st.sourceName} -> ${st.destinationName}\nStatus: ${st.status.toUpperCase()}\nSecurity OTP/PIN: ${st.otpOrPin || 'N/A'}\nVehicle: ${st.vehicleNumber || 'Standard Delivery'}\nTotal Valuation: ${CURRENCY}${st.totalValuation}\nItems: ${st.items.map(i => `${i.dispatchedQty}x ${i.name}`).join(', ')}`;
    } else if (documentType === 'purchase_bill') {
      const pb = documentData as PurchaseBill;
      text = `[GOODS RECEIPT NOTE (GRN) INWARD MANIFEST]\nGRN Ref: ${pb.billNumber}\nSupplier: ${pb.supplierName}\nInvoice No: ${pb.supplierInvoiceNo}\nWarehouse: ${pb.warehouseName}\nTotal Inwarded: ${CURRENCY}${pb.grandTotal}\nItems: ${pb.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}`;
    } else if (documentType === 'retail_order') {
      const ord = documentData as Order;
      text = `[RETAIL TAX INVOICE]\nInvoice No: ${ord.orderNumber}\nOutlet: ${ord.storeName || 'Gota Main'}\nDate: ${new Date(ord.createdAt).toLocaleString()}\nTotal: ${CURRENCY}${ord.grandTotal}\nItems: ${ord.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}`;
    } else if (documentType === 'store_indent') {
      const ind = documentData as StoreStockIndent;
      text = `[STORE INDENT REQUISITION]\nIndent Ref: ${ind.indentNumber}\nStore: ${ind.storeName}\nWarehouse: ${ind.targetWarehouseName}\nDate: ${ind.requestDate}\nUrgency: ${ind.urgency.toUpperCase()}\nItems: ${ind.items.map(i => `${i.requestedQty}x ${i.name}`).join(', ')}`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDocTitle = () => {
    switch (documentType) {
      case 'purchase_order':
        return 'Purchase Order Manifest';
      case 'stock_transfer':
        return 'Stock Transfer Delivery Challan & Gate Pass';
      case 'purchase_bill':
        return 'Goods Receipt Note (GRN) & Inward Manifest';
      case 'store_indent':
        return 'Store Stock Indent Requisition';
      case 'retail_order':
        return 'Retail Tax Invoice & Sales Memo';
    }
  };

  const getDocNumber = () => {
    switch (documentType) {
      case 'purchase_order':
        return (documentData as PurchaseOrder).poNumber;
      case 'stock_transfer':
        return (documentData as StockTransfer).transferNumber;
      case 'purchase_bill':
        return (documentData as PurchaseBill).billNumber;
      case 'store_indent':
        return (documentData as StoreStockIndent).indentNumber;
      case 'retail_order':
        return (documentData as Order).orderNumber;
    }
  };

  const docNumber = getDocNumber();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="no-print p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white tracking-wide">{getDocTitle()}</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold border border-slate-700">
                  {docNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Official verified document ready for print, PDF export, gate pass verification, and accounting.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle (A4 vs Thermal) */}
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                onClick={() => setPrintFormat('a4')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  printFormat === 'a4' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                A4 Manifest
              </button>
              <button
                onClick={() => setPrintFormat('thermal')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  printFormat === 'thermal' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Thermal Slip
              </button>
            </div>

            <button
              onClick={handleCopySummary}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              title="Copy Summary Text"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Manifest</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60">
          {/* ========================================================================= */}
          {/* FORMAT A: STANDARD A4 CORPORATE MANIFEST                                 */}
          {/* ========================================================================= */}
          {printFormat === 'a4' ? (
            <div
              id="printable-manifest"
              className="bg-white text-slate-900 rounded-xl shadow-md border border-slate-200 p-6 sm:p-8 space-y-6 max-w-3xl mx-auto font-sans select-all print:p-0 print:border-none print:shadow-none"
            >
              {/* Top Corporate Branding Header */}
              <div className="border-b-2 border-slate-900 pb-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-xs">
                        RR
                      </div>
                      <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                        Richie Rich 24x7
                      </h1>
                    </div>
                    <p className="text-xs font-bold text-slate-700 mt-0.5">
                      Enterprise Retail, Supply Chain & Logistics Network
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Central Master Hub • S.G. Highway Logistics Park, Ahmedabad, Gujarat - 380060
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      GSTIN: <strong>24AABCR9912E1ZQ</strong> • CIN: U52100GJ2024PTC123456 • Helpdesk: +91 79 4890 2424
                    </p>
                  </div>

                  {/* Document Badge & Optical Barcode */}
                  <div className="flex flex-col items-start sm:items-end text-left sm:text-right shrink-0">
                    <div className="px-3 py-1 bg-slate-900 text-amber-400 text-xs font-black uppercase tracking-wider rounded-md">
                      {getDocTitle()}
                    </div>
                    <div className="mt-2">
                      <BarcodeVisualizer value={docNumber} width={130} height={28} showText={true} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Meta Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Document Ref #</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{docNumber}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Creation / Date</span>
                  <span className="font-semibold text-slate-800">
                    {documentType === 'purchase_order' && (documentData as PurchaseOrder).orderDate}
                    {documentType === 'stock_transfer' && (documentData as StockTransfer).requestedDate}
                    {documentType === 'purchase_bill' && (documentData as PurchaseBill).billDate}
                    {documentType === 'store_indent' && (documentData as StoreStockIndent).requestDate}
                    {documentType === 'retail_order' && new Date((documentData as Order).createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Status</span>
                  <span className="font-bold text-xs uppercase px-2 py-0.5 rounded inline-block mt-0.5 bg-emerald-100 text-emerald-800">
                    {'status' in documentData ? String(documentData.status).replace(/_/g, ' ') : 'VERIFIED'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">
                    {documentType === 'stock_transfer' ? 'Security OTP/PIN' : 'Authorized By'}
                  </span>
                  <span className="font-mono font-bold text-indigo-700 text-xs">
                    {documentType === 'stock_transfer'
                      ? (documentData as StockTransfer).otpOrPin || 'PIN-9421'
                      : 'createdByName' in documentData
                      ? (documentData as PurchaseOrder).createdByName
                      : 'dispatchedBy' in documentData
                      ? (documentData as StockTransfer).dispatchedBy || 'Logistics Head'
                      : 'Admin Master'}
                  </span>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* SPECIFIC VIEW: PURCHASE ORDER MANIFEST                        */}
              {/* ------------------------------------------------------------- */}
              {documentType === 'purchase_order' && (() => {
                const po = documentData as PurchaseOrder;
                return (
                  <div className="space-y-5">
                    {/* Two-Column Supplier & Destination */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="font-bold text-slate-900 uppercase text-[11px] text-indigo-700 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Vendor / Supplier Details:</span>
                        </div>
                        <div className="font-extrabold text-slate-900 text-sm">{po.supplierName}</div>
                        <div className="text-slate-600 font-mono">GSTIN: {po.supplierGstin || 'Unregistered / Exempt'}</div>
                        <div className="text-slate-500">Payment Terms: {po.paymentTerms || '30 Days Net'}</div>
                        <div className="text-slate-500">Payment Status: <strong className="text-slate-900 uppercase">{po.paymentStatus}</strong></div>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <div className="font-bold text-slate-900 uppercase text-[11px] text-indigo-700 flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5" />
                          <span>Deliver To (Consignee):</span>
                        </div>
                        <div className="font-extrabold text-slate-900 text-sm">{po.destinationWarehouseName}</div>
                        <div className="text-slate-600">Expected Delivery: <strong>{po.expectedDeliveryDate}</strong></div>
                        <div className="text-slate-500">Authorized Receiver: Central Warehouse Inward Gate</div>
                        <div className="text-slate-500">Contact: +91 79 4890 2424 (Extension 102)</div>
                      </div>
                    </div>

                    {/* PO Items Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-white text-[11px] uppercase font-bold">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">SKU & Item Name</th>
                            <th className="py-2.5 px-2 text-center">Unit</th>
                            <th className="py-2.5 px-3 text-right">Ordered Qty</th>
                            <th className="py-2.5 px-3 text-right">Unit Rate</th>
                            <th className="py-2.5 px-3 text-right">GST %</th>
                            <th className="py-2.5 px-3 text-right">Line Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
                          {po.items.map((it, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="py-2.5 px-3 text-slate-500 font-sans">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <div className="font-bold text-slate-900">{it.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{it.sku} • {it.category}</div>
                              </td>
                              <td className="py-2.5 px-2 text-center font-sans text-slate-600">{it.unit}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">{it.quantityOrdered}</td>
                              <td className="py-2.5 px-3 text-right">{CURRENCY}{it.unitPrice.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right text-slate-600">{it.taxPercent}%</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                {CURRENCY}{it.totalAmount.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* PO Financial Totals */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                      <div className="text-xs space-y-1 text-slate-600 max-w-sm">
                        <p className="font-bold text-slate-800">Amount in Words:</p>
                        <p className="italic font-serif text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          {numberToWordsINR(po.grandTotal)}
                        </p>
                        {po.notes && <p className="text-[11px] text-amber-700 mt-1"><strong>PO Special Instructions:</strong> {po.notes}</p>}
                      </div>

                      <div className="w-full sm:w-64 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal:</span>
                          <span>{CURRENCY}{po.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>GST Tax Amount:</span>
                          <span>{CURRENCY}{po.taxTotal.toFixed(2)}</span>
                        </div>
                        {po.freightCharge > 0 && (
                          <div className="flex justify-between text-slate-600">
                            <span>Freight / Delivery:</span>
                            <span>{CURRENCY}{po.freightCharge.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1.5 border-t border-slate-300">
                          <span>Grand Total:</span>
                          <span className="text-emerald-700">{CURRENCY}{po.grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ------------------------------------------------------------- */}
              {/* SPECIFIC VIEW: STOCK TRANSFER DELIVERY CHALLAN & GATE PASS    */}
              {/* ------------------------------------------------------------- */}
              {documentType === 'stock_transfer' && (() => {
                const st = documentData as StockTransfer;
                return (
                  <div className="space-y-5">
                    {/* Route & Transporter Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {/* Source */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">1. Origin Source</span>
                        <div className="font-extrabold text-slate-900 text-sm">{st.sourceName}</div>
                        <div className="text-slate-500 text-[11px]">Type: {st.sourceType.toUpperCase()}</div>
                        <div className="text-slate-500 text-[11px]">Dispatched By: {st.dispatchedBy || 'Logistics Officer'}</div>
                      </div>

                      {/* Destination */}
                      <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200/80 space-y-1">
                        <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider block">2. Destination Outlet</span>
                        <div className="font-extrabold text-slate-900 text-sm">{st.destinationName}</div>
                        <div className="text-slate-600 text-[11px]">Type: {st.destinationType.toUpperCase()}</div>
                        <div className="text-slate-600 text-[11px]">Receiving In-charge: {st.receivedBy || 'Store Manager'}</div>
                      </div>

                      {/* Transporter & Vehicle Logistics */}
                      <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1">
                        <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">3. Transporter & Security</span>
                        <div className="font-bold text-slate-900 text-xs">Vehicle: {st.vehicleNumber || 'GJ-01-AB-9821'}</div>
                        <div className="text-slate-700 text-[11px]">Carrier: {st.carrierName || 'Richie Rich Express Logistics'}</div>
                        <div className="text-indigo-800 font-mono font-bold text-[11px]">
                          Driver Gate PIN: {st.otpOrPin || '9421'}
                        </div>
                      </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-white text-[11px] uppercase font-bold">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">SKU & Item Description</th>
                            <th className="py-2.5 px-2 text-center">Batch #</th>
                            <th className="py-2.5 px-2 text-center">Unit</th>
                            <th className="py-2.5 px-3 text-right">Dispatched Qty</th>
                            <th className="py-2.5 px-3 text-right">Received Qty</th>
                            <th className="py-2.5 px-3 text-right">Unit Value</th>
                            <th className="py-2.5 px-3 text-right">Total Valuation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
                          {st.items.map((it, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="py-2.5 px-3 text-slate-500 font-sans">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <div className="font-bold text-slate-900">{it.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{it.sku}</div>
                              </td>
                              <td className="py-2.5 px-2 text-center text-slate-600 text-[11px]">{it.batchNumber || 'BATCH-STD'}</td>
                              <td className="py-2.5 px-2 text-center font-sans text-slate-600">{it.unit}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">{it.dispatchedQty}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                                {it.receivedQty > 0 ? it.receivedQty : it.dispatchedQty}
                              </td>
                              <td className="py-2.5 px-3 text-right">{CURRENCY}{it.unitCost.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                {CURRENCY}{(it.dispatchedQty * it.unitCost).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Stock Valuation Summary */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                      <div className="text-xs space-y-1 text-slate-600 max-w-sm">
                        <p className="font-bold text-slate-800">Valuation in Words:</p>
                        <p className="italic font-serif text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          {numberToWordsINR(st.totalValuation)}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Goods are transferred internally between Richie Rich 24x7 entities under Delivery Challan provisions of GST Rule 55. Not for external resale until counter billed.
                        </p>
                      </div>

                      <div className="w-full sm:w-64 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs font-mono">
                        <div className="flex justify-between text-slate-600">
                          <span>Total Items Dispatched:</span>
                          <span className="font-bold text-slate-900">
                            {st.items.reduce((sum, i) => sum + i.dispatchedQty, 0)} Units
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>SKU Count:</span>
                          <span className="font-bold text-slate-900">{st.items.length} Distinct SKUs</span>
                        </div>
                        <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1.5 border-t border-slate-300">
                          <span>Total Transfer Value:</span>
                          <span className="text-indigo-700">{CURRENCY}{st.totalValuation.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ------------------------------------------------------------- */}
              {/* SPECIFIC VIEW: GOODS RECEIPT NOTE (GRN) INWARD MANIFEST       */}
              {/* ------------------------------------------------------------- */}
              {documentType === 'purchase_bill' && (() => {
                const pb = documentData as PurchaseBill;
                return (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Vendor Invoice Details</span>
                        <div className="font-bold text-slate-900 text-sm">{pb.supplierName}</div>
                        <div className="text-slate-600">Supplier Inv: <strong>{pb.supplierInvoiceNo}</strong></div>
                        <div className="text-slate-500">PO Ref: {pb.poNumber || 'Direct Inward'}</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Inward Warehouse</span>
                        <div className="font-bold text-slate-900 text-sm">{pb.warehouseName}</div>
                        <div className="text-slate-600">Received Date: {pb.receivedDate}</div>
                        <div className="text-slate-500">Received By: {pb.receivedBy || 'GRN Clerk'}</div>
                      </div>

                      <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-1">
                        <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">QC & GRN Status</span>
                        <div className="font-bold text-emerald-900 uppercase text-xs">{pb.grnStatus.replace('_', ' ')}</div>
                        <div className="text-slate-600">Payment Status: <strong className="uppercase">{pb.paymentStatus}</strong></div>
                        <div className="text-rose-600 font-bold">Due: {CURRENCY}{pb.dueAmount.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-white text-[11px] uppercase font-bold">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Item & SKU</th>
                            <th className="py-2.5 px-2 text-center">Batch #</th>
                            <th className="py-2.5 px-2 text-center">Expiry</th>
                            <th className="py-2.5 px-3 text-right">Inward Qty</th>
                            <th className="py-2.5 px-3 text-right">Unit Cost</th>
                            <th className="py-2.5 px-3 text-right">Total Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
                          {pb.items.map((it, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="py-2.5 px-3 text-slate-500 font-sans">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <div className="font-bold text-slate-900">{it.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{it.sku}</div>
                              </td>
                              <td className="py-2.5 px-2 text-center text-slate-600">{it.batchNumber}</td>
                              <td className="py-2.5 px-2 text-center text-slate-600">{it.expiryDate || 'N/A'}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">{it.quantity}</td>
                              <td className="py-2.5 px-3 text-right">{CURRENCY}{it.unitCost.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                {CURRENCY}{it.totalCost.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 block text-[11px] font-sans">Total Goods Receipt Value:</span>
                        <span className="text-slate-800 font-serif italic text-xs font-sans">
                          {numberToWordsINR(pb.grandTotal)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-[11px] block font-sans">Grand Total (Incl. GST):</span>
                        <span className="text-base font-extrabold text-slate-900">{CURRENCY}{pb.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ------------------------------------------------------------- */}
              {/* SPECIFIC VIEW: RETAIL TAX INVOICE & CASH MEMO                 */}
              {/* ------------------------------------------------------------- */}
              {documentType === 'retail_order' && (() => {
                const ord = documentData as Order;
                return (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Retail Store Outlet</span>
                        <div className="font-bold text-slate-900 text-sm">{ord.storeName || 'Gota Main Branch'}</div>
                        <div className="text-slate-600">Counter Desk: Counter {ord.counterNumber || 1}</div>
                        <div className="text-slate-500">Cashier: {ord.cashierName || 'Staff Cashier'}</div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Customer Details</span>
                        <div className="font-bold text-slate-900 text-sm">{ord.customerName || 'Walk-in Guest'}</div>
                        <div className="text-slate-600 font-mono">Phone: {ord.customerPhone || 'N/A'}</div>
                        <div className="text-slate-500">Channel: {ord.source === 'pos_counter' ? 'Counter POS' : 'Online Store'}</div>
                      </div>

                      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200 space-y-1">
                        <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Payment & Tender</span>
                        <div className="font-bold text-slate-900 uppercase text-xs">{ord.paymentMethod.replace('_', ' ')}</div>
                        <div className="text-slate-600">Tax Type: {ord.taxAmount > 0 ? 'Standard GST' : 'Tax Exempt (0%)'}</div>
                        <div className="text-emerald-700 font-bold">Status: {ord.status.toUpperCase()}</div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-white text-[11px] uppercase font-bold">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Item Description</th>
                            <th className="py-2.5 px-3 text-right">Qty</th>
                            <th className="py-2.5 px-3 text-right">Price</th>
                            <th className="py-2.5 px-3 text-right">GST %</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
                          {ord.items.map((it, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="py-2.5 px-3 text-slate-500 font-sans">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <div className="font-bold text-slate-900">{it.name}</div>
                                {it.customization && <div className="text-[10px] text-amber-700 italic">[{it.customization}]</div>}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">{it.quantity}</td>
                              <td className="py-2.5 px-3 text-right">{CURRENCY}{it.price.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-right text-slate-600">{it.taxRate || 0}%</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                {CURRENCY}{it.subtotal.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 block text-[11px] font-sans">Invoice Amount in Words:</span>
                        <span className="text-slate-800 font-serif italic text-xs font-sans">
                          {numberToWordsINR(ord.grandTotal)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-[11px] block font-sans">Net Paid Amount:</span>
                        <span className="text-base font-extrabold text-emerald-700">{CURRENCY}{ord.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ------------------------------------------------------------- */}
              {/* SPECIFIC VIEW: STORE INDENT REQUISITION                       */}
              {/* ------------------------------------------------------------- */}
              {documentType === 'store_indent' && (() => {
                const ind = documentData as StoreStockIndent;
                return (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Requesting Store</span>
                        <div className="font-bold text-slate-900 text-sm">{ind.storeName}</div>
                        <div className="text-slate-600">Requisition Date: {ind.requestDate}</div>
                        <div className="text-slate-500">Urgency: <strong className="uppercase">{ind.urgency.replace('_', ' ')}</strong></div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Fulfilling Warehouse</span>
                        <div className="font-bold text-slate-900 text-sm">{ind.targetWarehouseName}</div>
                        <div className="text-slate-600">Status: <strong className="uppercase">{ind.status}</strong></div>
                        <div className="text-slate-500">Requested By: {ind.requestedBy}</div>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-white text-[11px] uppercase font-bold">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Item & SKU</th>
                            <th className="py-2.5 px-3 text-center">Store Shelf Qty</th>
                            <th className="py-2.5 px-3 text-right">Requested Qty</th>
                            <th className="py-2.5 px-3 text-right">Approved Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-slate-800">
                          {ind.items.map((it, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="py-2.5 px-3 text-slate-500 font-sans">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-sans">
                                <div className="font-bold text-slate-900">{it.name}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{it.sku}</div>
                              </td>
                              <td className="py-2.5 px-3 text-center text-slate-600">{it.currentStoreStock} {it.unit}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900">{it.requestedQty} {it.unit}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-indigo-700">
                                {it.approvedQty !== undefined ? `${it.approvedQty} ${it.unit}` : 'Pending Approval'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Legal Declarations & Signature Sign-off Block */}
              <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-xs text-center">
                <div className="space-y-8">
                  <div className="h-10 border-b border-dashed border-slate-400"></div>
                  <div>
                    <p className="font-bold text-slate-900">Prepared & Issued By</p>
                    <p className="text-[10px] text-slate-500">Warehouse Logistics Officer</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="h-10 border-b border-dashed border-slate-400"></div>
                  <div>
                    <p className="font-bold text-slate-900">Driver / Transporter</p>
                    <p className="text-[10px] text-slate-500">Goods In-Transit Verification</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="h-10 border-b border-dashed border-slate-400"></div>
                  <div>
                    <p className="font-bold text-slate-900">Receiver / Store Manager</p>
                    <p className="text-[10px] text-slate-500">Physical Stock Acknowledged</p>
                  </div>
                </div>
              </div>

              {/* Bottom Footer Note */}
              <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                This is an official computer-generated logistics manifest issued by Richie Rich 24x7 ERP System. Generated on {new Date().toLocaleString()}.
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* FORMAT B: COMPACT THERMAL RECEIPT / GATE PASS (80mm)                      */
            /* ========================================================================= */
            <div
              id="printable-receipt"
              className="bg-white text-slate-900 p-5 rounded-xl shadow-md font-mono text-xs space-y-3 border border-slate-200 max-w-sm mx-auto select-all"
            >
              {/* Store Crest */}
              <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3">
                <div className="font-black text-sm uppercase tracking-wider text-slate-900">
                  ★ RICHIE RICH 24x7 ★
                </div>
                <p className="text-[10px] text-slate-600 font-bold uppercase">{getDocTitle()}</p>
                <p className="text-[9px] text-slate-500">GSTIN: 24AABCR9912E1ZQ • Ahmedabad Hub</p>
              </div>

              {/* Doc Meta */}
              <div className="text-[10px] space-y-1 border-b border-dashed border-slate-300 pb-2 text-slate-700">
                <div className="flex justify-between">
                  <span>DOC REF: <strong>{docNumber}</strong></span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>STATUS: {'status' in documentData ? String(documentData.status).toUpperCase() : 'VERIFIED'}</span>
                  <span>FORMAT: 80MM</span>
                </div>
                {documentType === 'stock_transfer' && (
                  <div className="flex justify-between text-indigo-900 font-bold pt-1">
                    <span>SECURITY OTP/PIN:</span>
                    <span>{(documentData as StockTransfer).otpOrPin || 'PIN-9421'}</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-600 border-b border-slate-200 pb-1">
                  <span>ITEM</span>
                  <span>QTY</span>
                  <span>VALUATION</span>
                </div>

                {'items' in documentData &&
                  (documentData as any).items.map((it: any, idx: number) => {
                    const qty = it.quantityOrdered || it.dispatchedQty || it.quantity || 1;
                    const rate = it.unitPrice || it.unitCost || it.price || 0;
                    const tot = it.totalAmount || it.totalValuation || it.totalCost || it.subtotal || qty * rate;
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between font-bold text-[11px]">
                          <span className="truncate max-w-[170px]">{it.name}</span>
                          <span>{CURRENCY}{Number(tot).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-500">
                          <span>{qty} {it.unit || 'units'} x {CURRENCY}{Number(rate).toFixed(2)}</span>
                          <span>{it.sku || ''}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-2 text-slate-800">
                <div className="flex justify-between font-bold text-xs">
                  <span>GRAND TOTAL:</span>
                  <span>
                    {CURRENCY}
                    {(
                      (documentData as any).grandTotal ||
                      (documentData as any).totalValuation ||
                      0
                    ).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Barcode Footer */}
              <div className="text-center pt-2 space-y-1">
                <BarcodeVisualizer value={docNumber} width={130} height={26} showText={true} />
                <p className="text-[9px] text-slate-500">*** OFFICIAL LOGISTICS GATE PASS ***</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
