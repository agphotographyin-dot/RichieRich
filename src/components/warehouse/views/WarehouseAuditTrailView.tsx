import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Layers,
  ArrowRight,
  ShieldCheck,
  Clock,
  Download,
  FileSpreadsheet,
  PackagePlus,
  Truck,
  AlertTriangle,
  ShoppingBag,
  Filter,
  CheckCircle2,
  Tag,
  Boxes,
  Store,
  Building2,
  RefreshCw,
  X,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  User,
  Copy,
  Check,
  BarChart2,
} from 'lucide-react';
import { StockMovementAudit, BatchRecord, StockTransfer } from '../../../types/warehouse';
import { InventoryItem, StoreLocation } from '../../../types';
import { CURRENCY } from '../../../services/storage';
import { pdfReportService } from '../../../services/pdfReportService';
import { soundEffects } from '../../../services/audio';

interface WarehouseAuditTrailViewProps {
  auditTrail?: StockMovementAudit[];
  inventory?: InventoryItem[];
  stores?: StoreLocation[];
  batches?: BatchRecord[];
  transfers?: StockTransfer[];
  searchQuery?: string;
}

export const WarehouseAuditTrailView: React.FC<WarehouseAuditTrailViewProps> = ({
  auditTrail = [],
  inventory = [],
  stores = [],
  batches = [],
  transfers = [],
  searchQuery = '',
}) => {
  const [selectedSku, setSelectedSku] = useState<string>('all');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [copiedBatchId, setCopiedBatchId] = useState<string | null>(null);

  const effectiveSearch = (searchQuery || localSearch).trim().toLowerCase();

  const getMovementType = (item: StockMovementAudit): string => {
    return item.movementType || (item as any).eventType || 'physical_adjustment';
  };

  const getTotalValuation = (item: StockMovementAudit): number => {
    if (typeof item.totalCostImpact === 'number' && !isNaN(item.totalCostImpact)) {
      return Math.abs(item.totalCostImpact);
    }
    if (typeof (item as any).totalValuation === 'number' && !isNaN((item as any).totalValuation)) {
      return Math.abs((item as any).totalValuation);
    }
    const qty = Math.abs(Number(item.quantity) || 0);
    const unitCost = Number(item.unitCost) || 0;
    return qty * unitCost;
  };

  const handleCopyBatch = (batchNo: string) => {
    navigator.clipboard.writeText(batchNo);
    setCopiedBatchId(batchNo);
    soundEffects.playScanBeep();
    setTimeout(() => setCopiedBatchId(null), 2000);
  };

  // Filter audit records based on SKU, Operation Type, Location, Time, and Search
  const filteredAudit = useMemo(() => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    return (auditTrail || []).filter((item) => {
      const type = getMovementType(item);

      // SKU Filter
      if (selectedSku !== 'all') {
        const itemSku = (item.sku || '').toLowerCase();
        const itemId = String(item.itemId || '').toLowerCase();
        const sel = selectedSku.toLowerCase();
        if (itemSku !== sel && itemId !== sel) {
          return false;
        }
      }

      // Location Filter
      if (locationFilter !== 'all') {
        const fromLoc = (item.fromLocation || '').toLowerCase();
        const toLoc = (item.toLocation || '').toLowerCase();
        const locTarget = locationFilter.toLowerCase();
        if (!fromLoc.includes(locTarget) && !toLoc.includes(locTarget)) {
          return false;
        }
      }

      // Operation Type Filter
      if (eventTypeFilter !== 'all') {
        if (eventTypeFilter === 'transfers_all') {
          const isTransfer =
            type === 'warehouse_transfer_out' ||
            type === 'warehouse_to_store_dispatch' ||
            type === 'store_transfer_in' ||
            type === 'store_transfer_received' ||
            type === 'store_return_in';
          if (!isTransfer) return false;
        } else if (eventTypeFilter === 'warehouse_transfer_out') {
          if (type !== 'warehouse_transfer_out' && type !== 'warehouse_to_store_dispatch') return false;
        } else if (eventTypeFilter === 'store_transfer_in') {
          if (type !== 'store_transfer_in' && type !== 'store_transfer_received') return false;
        } else if (eventTypeFilter === 'purchase_inward') {
          if (type !== 'purchase_inward' && type !== 'purchase_inward_grn') return false;
        } else if (eventTypeFilter === 'store_return_in') {
          if (type !== 'store_return_in') return false;
        } else if (eventTypeFilter === 'damage_scrap') {
          if (type !== 'damage_scrap' && type !== 'stock_adjustment_scrap') return false;
        } else if (eventTypeFilter === 'pos_sales_consumption') {
          if (type !== 'pos_sales_consumption' && type !== 'pos_sale_consumption') return false;
        } else if (eventTypeFilter === 'physical_adjustment') {
          if (type !== 'physical_adjustment') return false;
        }
      }

      // Date Range Filter
      if (dateRangeFilter !== 'all') {
        const itemTs = item.timestamp ? new Date(item.timestamp).getTime() : 0;
        if (itemTs > 0) {
          const diff = now - itemTs;
          if (dateRangeFilter === 'today' && diff > oneDayMs) return false;
          if (dateRangeFilter === '7days' && diff > 7 * oneDayMs) return false;
          if (dateRangeFilter === '30days' && diff > 30 * oneDayMs) return false;
        }
      }

      // Text Search
      if (effectiveSearch) {
        const matches =
          (item.itemName && item.itemName.toLowerCase().includes(effectiveSearch)) ||
          (item.sku && item.sku.toLowerCase().includes(effectiveSearch)) ||
          (item.referenceNumber && item.referenceNumber.toLowerCase().includes(effectiveSearch)) ||
          (item.batchNumber && item.batchNumber.toLowerCase().includes(effectiveSearch)) ||
          (item.performedBy && item.performedBy.toLowerCase().includes(effectiveSearch)) ||
          (item.fromLocation && item.fromLocation.toLowerCase().includes(effectiveSearch)) ||
          (item.toLocation && item.toLocation.toLowerCase().includes(effectiveSearch)) ||
          (item.notes && item.notes.toLowerCase().includes(effectiveSearch)) ||
          (item.transactionId && item.transactionId.toLowerCase().includes(effectiveSearch));
        if (!matches) return false;
      }

      return true;
    });
  }, [auditTrail, selectedSku, eventTypeFilter, locationFilter, dateRangeFilter, effectiveSearch]);

  // Selected SKU Detailed Overview
  const selectedSkuItem = useMemo(() => {
    if (selectedSku === 'all') return null;
    return inventory.find(
      (i) => i.id === selectedSku || (i.sku && i.sku.toLowerCase() === selectedSku.toLowerCase())
    ) || null;
  }, [selectedSku, inventory]);

  const selectedSkuBatches = useMemo(() => {
    if (!selectedSkuItem) return [];
    const cleanSku = (selectedSkuItem.sku || '').toLowerCase();
    return batches.filter(
      (b) => b.itemId === selectedSkuItem.id || (b.sku && b.sku.toLowerCase() === cleanSku)
    );
  }, [selectedSkuItem, batches]);

  // Summary statistics for filtered records
  const ledgerMetrics = useMemo(() => {
    let totalTransfersOutUnits = 0;
    let totalTransfersInUnits = 0;
    let totalInwardUnits = 0;
    let totalLossUnits = 0;
    let totalValuationImpact = 0;

    filteredAudit.forEach((aud) => {
      const type = getMovementType(aud);
      const qty = Math.abs(Number(aud.quantityChanged ?? aud.quantity) || 0);
      const val = getTotalValuation(aud);
      totalValuationImpact += val;

      if (type === 'warehouse_transfer_out' || type === 'warehouse_to_store_dispatch') {
        totalTransfersOutUnits += qty;
      } else if (type === 'store_transfer_in' || type === 'store_transfer_received') {
        totalTransfersInUnits += qty;
      } else if (type === 'purchase_inward' || type === 'purchase_inward_grn') {
        totalInwardUnits += qty;
      } else if (type === 'damage_scrap' || type === 'stock_adjustment_scrap') {
        totalLossUnits += qty;
      }
    });

    return {
      totalMovements: filteredAudit.length,
      totalTransfersOutUnits,
      totalTransfersInUnits,
      totalInwardUnits,
      totalLossUnits,
      totalValuationImpact,
    };
  }, [filteredAudit]);

  // Pagination
  const totalPages = Math.ceil(filteredAudit.length / pageSize) || 1;
  const paginatedAudit = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAudit.slice(start, start + pageSize);
  }, [filteredAudit, currentPage, pageSize]);

  const handleExportPDF = () => {
    const logs = filteredAudit.map((a) => {
      const type = getMovementType(a);
      const val = getTotalValuation(a);
      return {
        timestamp: a.timestamp,
        action: `${type.toUpperCase().replace(/_/g, ' ')} [${a.referenceNumber || a.transactionId || 'N/A'}]`,
        entity: `${a.itemName || 'Item'} (SKU: ${a.sku || 'N/A'}) • Batch: ${a.batchNumber || 'Auto'}`,
        user: `${a.performedBy || 'System'} (${a.userRole || 'Staff'})`,
        details: `${a.quantityChanged !== undefined ? (a.quantityChanged > 0 ? `+${a.quantityChanged}` : a.quantityChanged) : a.quantity} ${a.unit || 'units'} | Route: ${a.fromLocation || '-'} ➔ ${a.toLocation || '-'} | Stock Before: ${a.previousStock ?? '-'} ➔ After: ${a.newStock ?? a.balanceAfter ?? '-'} | Val: ${CURRENCY}${val.toLocaleString('en-IN')}`,
      };
    });
    pdfReportService.exportAuditTrailPDF(logs);
    soundEffects.playSuccessChime();
  };

  const handleExportCSV = () => {
    const headers =
      'TxnID,Timestamp,Date,Time,OperationType,SKU,ItemName,BatchNumber,FromLocation,ToLocation,QuantityDelta,Unit,StockBefore,StockAfter,UnitCost,ValuationImpact,RefDocument,AuthorizedBy,UserRole,Status,Notes\n';
    const rows = filteredAudit
      .map((a) => {
        const type = getMovementType(a);
        const val = getTotalValuation(a);
        const dateStr = a.timestamp ? new Date(a.timestamp).toISOString().split('T')[0] : '';
        const timeStr = a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : '';
        const qtyDelta = a.quantityChanged !== undefined ? a.quantityChanged : a.quantity;
        return `"${a.transactionId || a.id || ''}","${a.timestamp || ''}","${dateStr}","${timeStr}","${type}","${a.sku || ''}","${(a.itemName || '').replace(/"/g, '""')}","${a.batchNumber || ''}","${(a.fromLocation || '').replace(/"/g, '""')}","${(a.toLocation || '').replace(/"/g, '""')}",${qtyDelta},"${a.unit || 'units'}",${a.previousStock ?? ''},${a.newStock ?? a.balanceAfter ?? ''},${a.unitCost || 0},${val},"${a.referenceNumber || ''}","${(a.performedBy || '').replace(/"/g, '""')}","${a.userRole || ''}","${a.status || 'Completed'}","${(a.notes || '').replace(/"/g, '""')}"`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `richie_rich_sku_transfer_audit_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    soundEffects.playSuccessChime();
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'warehouse_transfer_out':
      case 'warehouse_to_store_dispatch':
        return {
          label: 'STORE DISPATCH',
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: Truck,
          arrow: ArrowUpRight,
        };
      case 'store_transfer_in':
      case 'store_transfer_received':
        return {
          label: 'STORE RECEIVED',
          bg: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          icon: ShieldCheck,
          arrow: ArrowDownLeft,
        };
      case 'store_return_in':
        return {
          label: 'STORE RETURN',
          bg: 'bg-purple-100 text-purple-900 border-purple-300',
          icon: History,
          arrow: ArrowDownLeft,
        };
      case 'purchase_inward':
      case 'purchase_inward_grn':
        return {
          label: 'PURCHASE GRN',
          bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          icon: PackagePlus,
          arrow: ArrowDownLeft,
        };
      case 'damage_scrap':
      case 'stock_adjustment_scrap':
        return {
          label: 'SCRAP & WRITE-OFF',
          bg: 'bg-rose-100 text-rose-900 border-rose-300',
          icon: AlertTriangle,
          arrow: ArrowUpRight,
        };
      case 'pos_sales_consumption':
      case 'pos_sale_consumption':
        return {
          label: 'POS SALE CONSUMPTION',
          bg: 'bg-sky-100 text-sky-900 border-sky-300',
          icon: ShoppingBag,
          arrow: ArrowUpRight,
        };
      case 'physical_adjustment':
      default:
        return {
          label: 'COUNT ADJUSTMENT',
          bg: 'bg-slate-100 text-slate-800 border-slate-300',
          icon: History,
          arrow: ArrowRight,
        };
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. EXECUTIVE HEADER & ACTIONS TOOLBAR                                     */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>Central Warehouse Audit Log & Transaction Ledger</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed transaction ledger for each SKU with exact timestamps, tracked batch IDs, and quantity changes across store transfers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-start md:justify-end">
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Download formatted audit PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer border border-slate-200"
            title="Export raw transaction records as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SUMMARY METRICS TILES                                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Ledger Entries</span>
          <span className="text-xl font-extrabold font-mono text-slate-900 mt-1 block">
            {ledgerMetrics.totalMovements.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Audit transactions</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Store Transfers Out</span>
          <span className="text-xl font-extrabold font-mono text-amber-950 mt-1 block">
            {ledgerMetrics.totalTransfersOutUnits.toLocaleString('en-IN')} <span className="text-xs font-sans font-semibold">Units</span>
          </span>
          <span className="text-[10px] text-amber-700 mt-0.5 block">Dispatched to stores</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block">Store Receipts In</span>
          <span className="text-xl font-extrabold font-mono text-indigo-950 mt-1 block">
            {ledgerMetrics.totalTransfersInUnits.toLocaleString('en-IN')} <span className="text-xs font-sans font-semibold">Units</span>
          </span>
          <span className="text-[10px] text-indigo-700 mt-0.5 block">Received at outlets</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">GRN Inward Inflow</span>
          <span className="text-xl font-extrabold font-mono text-emerald-950 mt-1 block">
            {ledgerMetrics.totalInwardUnits.toLocaleString('en-IN')} <span className="text-xs font-sans font-semibold">Units</span>
          </span>
          <span className="text-[10px] text-emerald-700 mt-0.5 block">Purchased & inwarded</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Cost Valuation Flow</span>
          <span className="text-xl font-extrabold font-mono text-slate-900 mt-1 block">
            {CURRENCY}{ledgerMetrics.totalValuationImpact.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Cumulative value impact</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MULTI-LEVEL DRILL-DOWN FILTERS: SKU, OPERATION, STORE, DATE            */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* SKU / Product Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-indigo-600" />
              <span>Filter by SKU / Item</span>
            </label>
            <select
              value={selectedSku}
              onChange={(e) => {
                setSelectedSku(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">📦 All SKUs & Products ({inventory.length} items)</option>
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku}) • WH Stock: {item.stockQuantity} {item.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Operation / Movement Type Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-amber-600" />
              <span>Operation Type</span>
            </label>
            <select
              value={eventTypeFilter}
              onChange={(e) => {
                setEventTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Operations & Movements</option>
              <option value="transfers_all">🚚 All Store Transfers (Dispatch + Receipt)</option>
              <option value="warehouse_transfer_out">📤 Warehouse ➔ Store Dispatch Out</option>
              <option value="store_transfer_in">📥 Store Inward Receipt</option>
              <option value="store_return_in">↩️ Store Return to Warehouse</option>
              <option value="purchase_inward">📦 Purchase GRN Inward</option>
              <option value="damage_scrap">⚠️ Scrap, Damage & Spoilage</option>
              <option value="physical_adjustment">⚖️ Physical Count Adjustment</option>
              <option value="pos_sales_consumption">🛍️ POS Counter Sales</option>
            </select>
          </div>

          {/* Location / Store Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-emerald-600" />
              <span>Branch / Store Outlet</span>
            </label>
            <select
              value={locationFilter}
              onChange={(e) => {
                setLocationFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Network Locations</option>
              <option value="Central">Central Warehouse (WH-AMD-01)</option>
              {stores.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name} ({s.id})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              <span>Date Range</span>
            </label>
            <select
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Recorded History</option>
              <option value="today">Today's Transactions</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* Free Text Search Bar & Clear Action */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by SKU, Item Name, Batch ID (BATCH-...), Transfer Ref (TR-...), User, or Route..."
              value={localSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {(selectedSku !== 'all' ||
            eventTypeFilter !== 'all' ||
            locationFilter !== 'all' ||
            dateRangeFilter !== 'all' ||
            localSearch) && (
            <button
              type="button"
              onClick={() => {
                setSelectedSku('all');
                setEventTypeFilter('all');
                setLocationFilter('all');
                setDateRangeFilter('all');
                setLocalSearch('');
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SKU DRILLDOWN OVERVIEW CARD (IF SINGLE SKU SELECTED)                   */}
      {/* ========================================================================= */}
      {selectedSkuItem && (
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl shadow-md border border-indigo-800/60 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-indigo-800/60 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-800/80 border border-indigo-700 flex items-center justify-center text-amber-400 shrink-0 font-mono font-black text-sm">
                SKU
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold">{selectedSkuItem.name}</h3>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 text-[10px] font-mono font-bold">
                    {selectedSkuItem.sku}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold">
                    {selectedSkuItem.category}
                  </span>
                </div>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  Unit: <span className="font-bold text-white uppercase">{selectedSkuItem.unit}</span> • Landed Cost: <span className="font-bold text-white">{CURRENCY}{selectedSkuItem.costPrice}</span> • Retail: <span className="font-bold text-white">{CURRENCY}{selectedSkuItem.sellingPrice}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedSku('all')}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/10 transition-colors"
            >
              View All SKUs Ledger
            </button>
          </div>

          {/* Distribution and Batches Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-indigo-300 block">Central Hub Stock</span>
              <span className="text-lg font-black font-mono text-emerald-400 mt-0.5 block">
                {selectedSkuItem.stockQuantity} {selectedSkuItem.unit}
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-indigo-300 block">Total Stores Active</span>
              <span className="text-lg font-black font-mono text-amber-400 mt-0.5 block">
                {Object.values(selectedSkuItem.storeAllocations || {}).reduce((s, v) => s + (Number(v) || 0), 0)} {selectedSkuItem.unit}
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-indigo-300 block">Active FIFO Batches</span>
              <span className="text-lg font-black font-mono text-indigo-300 mt-0.5 block">
                {selectedSkuBatches.length} Batches
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-indigo-300 block">Ledger Movements</span>
              <span className="text-lg font-black font-mono text-white mt-0.5 block">
                {filteredAudit.length} Records
              </span>
            </div>
          </div>

          {/* Active Batches Breakdown */}
          {selectedSkuBatches.length > 0 && (
            <div className="bg-black/20 p-3 rounded-xl border border-white/5 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-indigo-300 block tracking-wider">
                Tracked Batch Allocations for SKU:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {selectedSkuBatches.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-700 text-xs font-mono"
                  >
                    <span className="font-bold text-amber-300">{b.batchNumber}</span>
                    <span className="text-indigo-400">•</span>
                    <span className="text-white font-semibold">Central: {b.locationQuantities?.['central'] ?? b.quantityInStock ?? 0}</span>
                    <span className="text-indigo-400">•</span>
                    <span className="text-emerald-300 text-[10px]">Exp: {b.expiryDate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TRANSACTION LEDGER TABLE                                               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>SKU Stock Movement & Store Transfer Ledger</span>
            </h3>
            <p className="text-xs text-slate-500">
              Showing {filteredAudit.length} transaction records • Chronological order
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="p-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Txn ID & Timestamp</th>
                <th className="py-3.5 px-3">Operation</th>
                <th className="py-3.5 px-4">SKU & Item Details</th>
                <th className="py-3.5 px-3">Batch ID</th>
                <th className="py-3.5 px-4">Route (From ➔ To)</th>
                <th className="py-3.5 px-3 text-center">Qty Change</th>
                <th className="py-3.5 px-3 text-center">Stock Before ➔ After</th>
                <th className="py-3.5 px-3 text-right">Value Impact</th>
                <th className="py-3.5 px-3 font-mono">Ref Document</th>
                <th className="py-3.5 px-4 text-right">Operator</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-mono">
              {paginatedAudit.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-500 font-sans">
                    <div className="max-w-md mx-auto space-y-2.5">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <History className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-900 text-base">No Matching Audit Records</div>
                      <p className="text-xs text-slate-500">
                        No transactions matched the specified SKU, operation filter, or search term. Try resetting your filters to view the complete history.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSku('all');
                          setEventTypeFilter('all');
                          setLocationFilter('all');
                          setDateRangeFilter('all');
                          setLocalSearch('');
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer inline-flex items-center gap-1.5 mt-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Reset All Filters</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedAudit.map((aud) => {
                  const type = getMovementType(aud);
                  const badge = getEventBadge(type);
                  const BadgeIcon = badge.icon;
                  const totalVal = getTotalValuation(aud);
                  const qtyChange = aud.quantityChanged !== undefined ? aud.quantityChanged : aud.quantity;
                  const isPositive = qtyChange > 0;
                  const batchNo = aud.batchNumber || 'BATCH-STD';

                  return (
                    <tr key={aud.id} className="hover:bg-slate-50/90 transition-colors">
                      {/* 1. Txn ID & Timestamp */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="font-bold text-indigo-900">
                          {aud.transactionId || aud.id.split('-').slice(0, 2).join('-')}
                        </div>
                        <div className="text-[10px] text-slate-500 font-sans flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>
                            {aud.timestamp ? (
                              new Date(aud.timestamp).toLocaleString([], {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })
                            ) : (
                              'Just Now'
                            )}
                          </span>
                        </div>
                      </td>

                      {/* 2. Operation Badge */}
                      <td className="py-3 px-3 font-sans">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg}`}
                        >
                          <BadgeIcon className="w-3 h-3 shrink-0" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* 3. SKU & Item Details */}
                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-slate-900 line-clamp-1">{aud.itemName || 'Inventory Item'}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSku(aud.itemId || aud.sku);
                              soundEffects.playScanBeep();
                            }}
                            className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                            title="Filter ledger for this SKU"
                          >
                            SKU: {aud.sku || 'N/A'}
                          </button>
                        </div>
                      </td>

                      {/* 4. Batch ID with Copy */}
                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold">
                            {batchNo}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyBatch(batchNo)}
                            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                            title="Copy Batch ID"
                          >
                            {copiedBatchId === batchNo ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 5. Route (From -> To) */}
                      <td className="py-3 px-4 font-sans text-slate-700">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="truncate max-w-[110px] font-medium text-slate-600">
                            {aud.fromLocation || 'Warehouse'}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-bold text-slate-900 truncate max-w-[120px]">
                            {aud.toLocation || 'Store Outlet'}
                          </span>
                        </div>
                      </td>

                      {/* 6. Quantity Change (Delta) */}
                      <td className="py-3 px-3 text-center font-bold font-mono text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-full inline-block ${
                            isPositive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {isPositive ? `+${qtyChange}` : qtyChange} {aud.unit || 'units'}
                        </span>
                      </td>

                      {/* 7. Stock Balance Before ➔ After */}
                      <td className="py-3 px-3 text-center font-mono text-xs">
                        {aud.previousStock !== undefined && aud.newStock !== undefined ? (
                          <div className="flex items-center justify-center gap-1 font-semibold">
                            <span className="text-slate-500">{aud.previousStock}</span>
                            <span className="text-slate-400 text-[10px]">➔</span>
                            <span className="font-black text-slate-900">{aud.newStock}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-bold">Bal: {aud.balanceAfter}</span>
                        )}
                      </td>

                      {/* 8. Valuation Impact */}
                      <td className="py-3 px-3 text-right font-bold text-slate-900 font-mono">
                        {CURRENCY}{totalVal.toLocaleString('en-IN')}
                      </td>

                      {/* 9. Reference Document */}
                      <td className="py-3 px-3 font-bold text-amber-800 font-mono text-[11px]">
                        {aud.referenceNumber || '-'}
                      </td>

                      {/* 10. Operator & Role */}
                      <td className="py-3 px-4 text-right font-sans">
                        <div className="font-bold text-slate-900 text-xs">{aud.performedBy || 'Warehouse Manager'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{aud.userRole || 'Operator'}</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {filteredAudit.length > pageSize && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-600 font-medium">
            <div>
              Showing <span className="font-bold">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold">{Math.min(currentPage * pageSize, filteredAudit.length)}</span> of{' '}
              <span className="font-bold">{filteredAudit.length}</span> records
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer"
              >
                Previous
              </button>
              <span className="px-2 font-mono font-bold">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
