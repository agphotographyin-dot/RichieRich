import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  FileSpreadsheet,
  Layers,
  AlertTriangle,
  CreditCard,
  Building2,
  Boxes,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  Warehouse,
  Supplier,
  PurchaseBill,
  BatchRecord,
  StockAdjustment,
  WarehouseOverviewStats,
} from '../../../types/warehouse';
import { InventoryItem, StoreLocation } from '../../../types';
import { CURRENCY } from '../../../services/storage';

interface WarehouseReportsViewProps {
  stats: WarehouseOverviewStats;
  inventory: InventoryItem[];
  batches: BatchRecord[];
  suppliers: Supplier[];
  bills: PurchaseBill[];
  adjustments: StockAdjustment[];
  warehouses: Warehouse[];
  stores: StoreLocation[];
}

export const WarehouseReportsView: React.FC<WarehouseReportsViewProps> = ({
  stats,
  inventory,
  batches,
  suppliers,
  bills,
  adjustments,
  warehouses,
  stores,
}) => {
  const [reportType, setReportType] = useState<'valuation' | 'suppliers' | 'health' | 'scrap'>('valuation');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Report Selection Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <span>Warehouse Analytics & Financial Reports</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit-grade reporting for inventory valuation, supplier payables, shelf-life, and losses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-semibold">
        <button
          onClick={() => setReportType('valuation')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            reportType === 'valuation' ? 'bg-white shadow-sm text-indigo-950 font-bold' : 'text-slate-600'
          }`}
        >
          <Boxes className="w-4 h-4 text-indigo-600" />
          <span>Inventory Valuation (FIFO)</span>
        </button>

        <button
          onClick={() => setReportType('suppliers')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            reportType === 'suppliers' ? 'bg-white shadow-sm text-indigo-950 font-bold' : 'text-slate-600'
          }`}
        >
          <CreditCard className="w-4 h-4 text-rose-600" />
          <span>Supplier Outstanding & Payables</span>
        </button>

        <button
          onClick={() => setReportType('health')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            reportType === 'health' ? 'bg-white shadow-sm text-indigo-950 font-bold' : 'text-slate-600'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Low Stock & Critical SKUs</span>
        </button>

        <button
          onClick={() => setReportType('scrap')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            reportType === 'scrap' ? 'bg-white shadow-sm text-indigo-950 font-bold' : 'text-slate-600'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-violet-600" />
          <span>Damaged & Expired Scrap Ledger</span>
        </button>
      </div>

      {/* Report Content Panels */}
      {reportType === 'valuation' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Central & Outlet Inventory Valuation Matrix</h3>
              <p className="text-xs text-slate-500">Methodology: First-In-First-Out (FIFO) & Weighted Average Landed Cost</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 font-medium">Grand Inventory Value</div>
              <div className="text-xl font-bold font-mono text-indigo-950">
                {CURRENCY}{stats.totalInventoryValuationFIFO.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Item / SKU</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Central WH</th>
                  <th className="py-2.5 px-3 text-center">Stores Total</th>
                  <th className="py-2.5 px-3 text-center">Total Stock</th>
                  <th className="py-2.5 px-3 text-right">Landed Unit Cost</th>
                  <th className="py-2.5 px-4 text-right">Total Valuation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {inventory.map((i) => {
                  const alloc = i.storeAllocations || {};
                  const storesSum = Object.values(alloc).reduce<number>((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
                  const centralStock = Math.max(0, Number(i.stockQuantity) - storesSum);
                  const totalVal = i.stockQuantity * i.costPrice;

                  return (
                    <tr key={i.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                        <div>{i.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{i.sku}</div>
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">{i.category}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-indigo-700">{centralStock}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{storesSum}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900">{i.stockQuantity} {i.unit}</td>
                      <td className="py-2.5 px-3 text-right">{CURRENCY}{i.costPrice}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        {CURRENCY}{totalVal.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'suppliers' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Supplier Outstanding Aging & Balance Summary</h3>
              <p className="text-xs text-slate-500">Live payable balances across all vendors</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500 font-medium">Total Payables</div>
              <div className="text-xl font-bold font-mono text-rose-600">
                {CURRENCY}{stats.totalSupplierOutstanding.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">City / State</th>
                  <th className="py-2.5 px-3">Payment Terms</th>
                  <th className="py-2.5 px-3 text-right">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{s.name}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">{s.category}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">{s.city}, {s.state}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-600">{s.paymentTerms}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                      {CURRENCY}{s.currentOutstanding.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'health' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Critical & Low Stock SKU Health Report</h3>
            <p className="text-xs text-slate-500">Items below minimum re-order threshold</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Item Name</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3 text-center">Current Stock</th>
                  <th className="py-2.5 px-3 text-center">Min Threshold</th>
                  <th className="py-2.5 px-3 text-center">Deficit</th>
                  <th className="py-2.5 px-3 text-right">Reorder Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {inventory
                  .filter((i) => i.stockQuantity <= i.lowStockThreshold)
                  .map((i) => {
                    const deficit = Math.max(0, i.lowStockThreshold - i.stockQuantity);
                    return (
                      <tr key={i.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{i.name}</td>
                        <td className="py-2.5 px-3">{i.sku}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-rose-600">
                          {i.stockQuantity} {i.unit}
                        </td>
                        <td className="py-2.5 px-3 text-center">{i.lowStockThreshold} {i.unit}</td>
                        <td className="py-2.5 px-3 text-center text-amber-700 font-bold">-{deficit} {i.unit}</td>
                        <td className="py-2.5 px-3 text-right font-sans font-semibold text-indigo-700">
                          Issue PO for min {deficit + 200} {i.unit}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'scrap' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Disposed, Damaged & Expired Scrap Ledger</h3>
            <p className="text-xs text-slate-500">Historical write-offs and financial impact</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Item</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Warehouse / Store</th>
                  <th className="py-2.5 px-3 text-center">Scrapped Qty</th>
                  <th className="py-2.5 px-3 text-right">Valuation Loss</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {adjustments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-600">{a.date}</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{a.itemName}</td>
                    <td className="py-2.5 px-3 font-sans capitalize">{a.reason.replace(/_/g, ' ')}</td>
                    <td className="py-2.5 px-3 font-sans">{a.locationName}</td>
                    <td className="py-2.5 px-3 text-center text-rose-600 font-bold">{a.quantityAdjusted} units</td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                      -{CURRENCY}{Math.abs(a.valuationImpact).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
