import React, { useState, useMemo, useEffect } from 'react';
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
  Search,
  ChevronDown,
  RefreshCw,
  TrendingUp,
  Percent,
  X,
  ArrowUpDown,
  Filter,
  SlidersHorizontal,
  Tag,
  Clock,
  Building,
} from 'lucide-react';
import * as XLSX from 'xlsx';
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
import { pdfReportService } from '../../../services/pdfReportService';
import { soundEffects } from '../../../services/audio';

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
  const [reportType, setReportType] = useState<
    'valuation' | 'suppliers' | 'health' | 'scrap' | 'category_margins'
  >('valuation');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Pagination state (Matching Master Inventory)
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(25);

  // Reset page to 1 whenever view, search, category, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [reportType, searchQuery, selectedCategory, statusFilter, sortBy]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return ['all', ...Array.from(set)];
  }, [inventory]);

  // Refresh handler
  const handleRefresh = () => {
    setIsLoading(true);
    soundEffects.playClick();
    setTimeout(() => {
      setIsLoading(false);
    }, 150);
  };

  // 1. Valuation Report Data (Memoized & Filtered)
  const filteredValuationItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inventory.filter((item) => {
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q));

      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;

      const alloc = item.storeAllocations || {};
      const storesSum = Object.values(alloc).reduce<number>(
        (acc, val) => acc + (typeof val === 'number' ? val : 0),
        0
      );
      const centralStock = Math.max(0, Number(item.stockQuantity) - storesSum);

      let matchesStatus = true;
      if (statusFilter === 'in_stock') matchesStatus = item.stockQuantity > 0;
      else if (statusFilter === 'out_of_stock') matchesStatus = item.stockQuantity <= 0;
      else if (statusFilter === 'central_only') matchesStatus = centralStock > 0 && storesSum === 0;
      else if (statusFilter === 'stores_allocated') matchesStatus = storesSum > 0;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [inventory, searchQuery, selectedCategory, statusFilter]);

  const sortedValuationItems = useMemo(() => {
    const list = [...filteredValuationItems];
    if (sortBy === 'val_desc') {
      list.sort((a, b) => b.stockQuantity * b.costPrice - a.stockQuantity * a.costPrice);
    } else if (sortBy === 'val_asc') {
      list.sort((a, b) => a.stockQuantity * a.costPrice - b.stockQuantity * b.costPrice);
    } else if (sortBy === 'stock_desc') {
      list.sort((a, b) => b.stockQuantity - a.stockQuantity);
    } else if (sortBy === 'stock_asc') {
      list.sort((a, b) => a.stockQuantity - b.stockQuantity);
    } else if (sortBy === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [filteredValuationItems, sortBy]);

  // 2. Suppliers Report Data
  const filteredSuppliers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return suppliers.filter((s) => {
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.state.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);

      let matchesStatus = true;
      if (statusFilter === 'has_balance') matchesStatus = s.currentOutstanding > 0;
      else if (statusFilter === 'zero_balance') matchesStatus = s.currentOutstanding <= 0;

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchQuery, statusFilter]);

  const sortedSuppliers = useMemo(() => {
    const list = [...filteredSuppliers];
    if (sortBy === 'balance_desc') {
      list.sort((a, b) => b.currentOutstanding - a.currentOutstanding);
    } else if (sortBy === 'balance_asc') {
      list.sort((a, b) => a.currentOutstanding - b.currentOutstanding);
    } else if (sortBy === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [filteredSuppliers, sortBy]);

  // 3. Low Stock Health Data
  const filteredHealthItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return inventory
      .filter((i) => i.stockQuantity <= i.lowStockThreshold)
      .filter((item) => {
        const matchesSearch =
          !q ||
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          (item.category && item.category.toLowerCase().includes(q));

        const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;

        let matchesStatus = true;
        if (statusFilter === 'out_of_stock') matchesStatus = item.stockQuantity <= 0;
        else if (statusFilter === 'critical') matchesStatus = item.stockQuantity > 0 && item.stockQuantity <= Math.round(item.lowStockThreshold * 0.5);

        return matchesSearch && matchesCat && matchesStatus;
      });
  }, [inventory, searchQuery, selectedCategory, statusFilter]);

  const sortedHealthItems = useMemo(() => {
    const list = [...filteredHealthItems];
    if (sortBy === 'deficit_desc') {
      list.sort((a, b) => (b.lowStockThreshold - b.stockQuantity) - (a.lowStockThreshold - a.stockQuantity));
    } else if (sortBy === 'stock_asc') {
      list.sort((a, b) => a.stockQuantity - b.stockQuantity);
    } else if (sortBy === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [filteredHealthItems, sortBy]);

  // 4. Scrap & Adjustments Data
  const filteredAdjustments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return adjustments.filter((a) => {
      const itemNames = a.items.map((it) => it.name).join(' ').toLowerCase();
      const matchesSearch =
        !q ||
        itemNames.includes(q) ||
        a.adjustmentNumber.toLowerCase().includes(q) ||
        a.locationName.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q);

      let matchesStatus = true;
      if (statusFilter !== 'all') {
        matchesStatus = a.reason.toLowerCase() === statusFilter.toLowerCase();
      }

      return matchesSearch && matchesStatus;
    });
  }, [adjustments, searchQuery, statusFilter]);

  const sortedAdjustments = useMemo(() => {
    const list = [...filteredAdjustments];
    if (sortBy === 'loss_desc') {
      list.sort((a, b) => (b.totalLossValue || 0) - (a.totalLossValue || 0));
    } else if (sortBy === 'date_desc') {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return list;
  }, [filteredAdjustments, sortBy]);

  // 5. Category Margins Breakdown Data
  const categorySummary = useMemo(() => {
    const map: Record<
      string,
      {
        category: string;
        skus: number;
        totalUnits: number;
        costValuation: number;
        retailValuation: number;
        avgMarginPct: number;
      }
    > = {};

    inventory.forEach((i) => {
      const cat = i.category || 'Uncategorized';
      if (!map[cat]) {
        map[cat] = {
          category: cat,
          skus: 0,
          totalUnits: 0,
          costValuation: 0,
          retailValuation: 0,
          avgMarginPct: 0,
        };
      }
      map[cat].skus += 1;
      map[cat].totalUnits += i.stockQuantity;
      map[cat].costValuation += i.stockQuantity * i.costPrice;
      map[cat].retailValuation += i.stockQuantity * i.sellingPrice;
    });

    return Object.values(map).map((entry) => {
      const margin =
        entry.retailValuation > 0
          ? Math.round(((entry.retailValuation - entry.costValuation) / entry.retailValuation) * 100)
          : 0;
      return {
        ...entry,
        avgMarginPct: margin,
      };
    });
  }, [inventory]);

  // Total scrap loss calculation
  const totalScrapLoss = useMemo(() => {
    return adjustments.reduce((acc, a) => acc + (a.totalLossValue || 0), 0);
  }, [adjustments]);

  // Active items for pagination based on reportType
  const currentDatasetLength = useMemo(() => {
    if (reportType === 'valuation') return sortedValuationItems.length;
    if (reportType === 'suppliers') return sortedSuppliers.length;
    if (reportType === 'health') return sortedHealthItems.length;
    if (reportType === 'scrap') return sortedAdjustments.length;
    if (reportType === 'category_margins') return categorySummary.length;
    return 0;
  }, [
    reportType,
    sortedValuationItems.length,
    sortedSuppliers.length,
    sortedHealthItems.length,
    sortedAdjustments.length,
    categorySummary.length,
  ]);

  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(currentDatasetLength / (pageSize as number)));

  // Slice paginated items
  const paginatedValuation = useMemo(() => {
    if (pageSize === 'all') return sortedValuationItems;
    const start = (currentPage - 1) * pageSize;
    return sortedValuationItems.slice(start, start + pageSize);
  }, [sortedValuationItems, currentPage, pageSize]);

  const paginatedSuppliers = useMemo(() => {
    if (pageSize === 'all') return sortedSuppliers;
    const start = (currentPage - 1) * pageSize;
    return sortedSuppliers.slice(start, start + pageSize);
  }, [sortedSuppliers, currentPage, pageSize]);

  const paginatedHealth = useMemo(() => {
    if (pageSize === 'all') return sortedHealthItems;
    const start = (currentPage - 1) * pageSize;
    return sortedHealthItems.slice(start, start + pageSize);
  }, [sortedHealthItems, currentPage, pageSize]);

  const paginatedAdjustments = useMemo(() => {
    if (pageSize === 'all') return sortedAdjustments;
    const start = (currentPage - 1) * pageSize;
    return sortedAdjustments.slice(start, start + pageSize);
  }, [sortedAdjustments, currentPage, pageSize]);

  // Handle Export PDF
  const handleExportPDF = () => {
    soundEffects.playClick();
    setIsExportMenuOpen(false);
    if (reportType === 'valuation') {
      pdfReportService.exportWarehouseValuationPDF(inventory, stats);
    } else if (reportType === 'suppliers') {
      pdfReportService.exportSupplierOutstandingPDF(suppliers, stats);
    } else if (reportType === 'health') {
      pdfReportService.exportLowStockHealthPDF(inventory);
    } else if (reportType === 'scrap') {
      const logs = adjustments.map((a) => {
        const itemNames = a.items.map((it) => `${it.name} (${it.adjustedQty})`).join(', ');
        return {
          timestamp: a.date,
          action: `SCRAP / ADJUSTMENT (${a.reason.toUpperCase()})`,
          entity: `Ref: ${a.adjustmentNumber}`,
          user: a.authorizedBy || 'Warehouse Staff',
          details: `Items: ${itemNames} | Location: ${a.locationName} | Loss Impact: Rs. ${a.totalLossValue || 0}`,
        };
      });
      pdfReportService.exportAuditTrailPDF(logs);
    }
  };

  // Handle Export Excel (.xlsx)
  const handleExportExcel = () => {
    soundEffects.playClick();
    setIsExportMenuOpen(false);

    let rows: any[] = [];
    let sheetName = 'Report';
    const dateStr = new Date().toISOString().split('T')[0];

    if (reportType === 'valuation') {
      sheetName = 'Inventory Valuation';
      rows = sortedValuationItems.map((i) => {
        const alloc = i.storeAllocations || {};
        const storesSum = Object.values(alloc).reduce<number>((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
        const centralStock = Math.max(0, Number(i.stockQuantity) - storesSum);
        return {
          SKU: i.sku,
          Name: i.name,
          Category: i.category,
          'Central WH Stock': centralStock,
          'Store Allocated Stock': storesSum,
          'Total Stock': i.stockQuantity,
          Unit: i.unit,
          'Landed Cost (₹)': i.costPrice,
          'Retail Price (₹)': i.sellingPrice,
          'Total Valuation (₹)': i.stockQuantity * i.costPrice,
        };
      });
    } else if (reportType === 'suppliers') {
      sheetName = 'Supplier Payables';
      rows = sortedSuppliers.map((s) => ({
        Supplier: s.name,
        Category: s.category,
        City: s.city,
        State: s.state,
        'Payment Terms': s.paymentTerms,
        'Contact Person': s.contactPerson,
        Phone: s.phone,
        'Outstanding Balance (₹)': s.currentOutstanding,
      }));
    } else if (reportType === 'health') {
      sheetName = 'Low Stock SKUs';
      rows = sortedHealthItems.map((i) => ({
        SKU: i.sku,
        Name: i.name,
        Category: i.category,
        'Current Stock': i.stockQuantity,
        Unit: i.unit,
        'Min Threshold': i.lowStockThreshold,
        Deficit: Math.max(0, i.lowStockThreshold - i.stockQuantity),
        'Suggested PO Qty': Math.max(0, i.lowStockThreshold - i.stockQuantity) + 200,
      }));
    } else if (reportType === 'scrap') {
      sheetName = 'Scrap & Losses';
      rows = sortedAdjustments.map((a) => ({
        'Adjustment #': a.adjustmentNumber,
        Date: a.date,
        Reason: a.reason,
        Location: a.locationName,
        'Authorized By': a.authorizedBy,
        'Loss Value (₹)': a.totalLossValue || 0,
        Items: a.items.map((it) => `${it.name} (${it.adjustedQty})`).join(', '),
      }));
    } else if (reportType === 'category_margins') {
      sheetName = 'Category Margins';
      rows = categorySummary.map((c) => ({
        Category: c.category,
        SKUs: c.skus,
        'Total Units': c.totalUnits,
        'Cost Valuation (₹)': c.costValuation,
        'Retail Valuation (₹)': c.retailValuation,
        'Gross Margin %': `${c.avgMarginPct}%`,
      }));
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `Warehouse_${sheetName.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    soundEffects.playClick();
    setIsExportMenuOpen(false);

    let rows: string[][] = [];
    let fileName = `Warehouse_Report_${new Date().toISOString().split('T')[0]}.csv`;

    if (reportType === 'valuation') {
      fileName = `Inventory_Valuation_${new Date().toISOString().split('T')[0]}.csv`;
      rows.push(['SKU', 'Name', 'Category', 'Central WH Stock', 'Store Stock', 'Total Stock', 'Unit Cost', 'Valuation']);
      sortedValuationItems.forEach((i) => {
        const alloc = i.storeAllocations || {};
        const storesSum = Object.values(alloc).reduce<number>((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
        const centralStock = Math.max(0, Number(i.stockQuantity) - storesSum);
        rows.push([
          i.sku,
          `"${i.name.replace(/"/g, '""')}"`,
          i.category,
          centralStock.toString(),
          storesSum.toString(),
          i.stockQuantity.toString(),
          i.costPrice.toString(),
          (i.stockQuantity * i.costPrice).toString(),
        ]);
      });
    } else if (reportType === 'suppliers') {
      fileName = `Supplier_Payables_${new Date().toISOString().split('T')[0]}.csv`;
      rows.push(['Supplier', 'Category', 'City', 'Terms', 'Outstanding']);
      sortedSuppliers.forEach((s) => {
        rows.push([
          `"${s.name.replace(/"/g, '""')}"`,
          s.category,
          s.city,
          s.paymentTerms,
          s.currentOutstanding.toString(),
        ]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    soundEffects.playClick();
    setIsExportMenuOpen(false);
    window.print();
  };

  // Reusable Pagination Stepper
  const renderPagination = () => {
    const start = pageSize === 'all' ? 1 : (currentPage - 1) * (pageSize as number) + 1;
    const end =
      pageSize === 'all'
        ? currentDatasetLength
        : Math.min(currentDatasetLength, currentPage * (pageSize as number));

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-slate-50 border-t border-slate-200 text-xs">
        <div className="text-slate-600 font-medium">
          Showing <span className="font-bold text-slate-900">{currentDatasetLength === 0 ? 0 : start}</span> to{' '}
          <span className="font-bold text-slate-900">{end}</span> of{' '}
          <span className="font-bold text-slate-900">{currentDatasetLength}</span> records
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px] font-semibold">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                setPageSize(val);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 cursor-pointer focus:outline-hidden"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="all">All ({currentDatasetLength})</option>
            </select>
          </div>

          {pageSize !== 'all' && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  currentPage <= 1
                    ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs'
                }`}
              >
                Previous
              </button>

              <div className="px-2.5 py-1 text-xs font-bold text-slate-700 font-mono">
                {currentPage} / {totalPages}
              </div>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  currentPage >= totalPages
                    ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50'
                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-xs'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Toolbar (Master Inventory Style) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100/80 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Reports & Financial Analytics
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold font-mono">
                  Audit-Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Valuation matrices, supplier payables aging, low-stock deficits, and financial loss ledgers.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-200 shadow-xs"
            title="Refresh calculations and reload reports"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-700 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {isExportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Export Active Report
                  </div>

                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold block text-slate-900">Export Excel (.xlsx)</span>
                      <span className="text-[10px] text-slate-500">Full formatted dataset</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <span className="font-bold block text-slate-900">Export CSV (.csv)</span>
                      <span className="text-[10px] text-slate-500">Universal spreadsheet text</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="w-full px-3 py-2 text-left hover:bg-rose-50 text-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <span className="font-bold block text-slate-900">Export PDF Report</span>
                      <span className="text-[10px] text-slate-500">Official audit document</span>
                    </div>
                  </button>

                  <div className="border-t border-slate-100 my-1" />

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-800 flex items-center gap-2 font-medium cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <span className="font-bold block text-slate-900">Print Report</span>
                      <span className="text-[10px] text-slate-500">Clean printout layout</span>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Cards (Master Inventory Pattern) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Grand Inventory Valuation */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Inventory Valuation (FIFO)</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 tracking-tight">
            {CURRENCY}{stats.totalInventoryValuationFIFO.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
            <span className="font-medium text-indigo-600">{inventory.length} SKUs</span>
            <span>•</span>
            <span>Central WH + {stores.length} Outlets</span>
          </div>
        </div>

        {/* Supplier Payables */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Supplier Outstanding</span>
            <CreditCard className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-600 tracking-tight">
            {CURRENCY}{stats.totalSupplierOutstanding.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
            <span className="font-medium text-rose-700">{suppliers.length} Registered Vendors</span>
            <span>•</span>
            <span>Live AP balances</span>
          </div>
        </div>

        {/* Low Stock & Critical Health */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Critical SKUs (Low/Out)</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-600 tracking-tight">
            {stats.lowStockItemsCount} SKUs
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
            <span className="font-medium text-amber-700">Immediate PO replenishment recommended</span>
          </div>
        </div>

        {/* Historical Scrap Losses */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Scrap & Damage Loss</span>
            <FileSpreadsheet className="w-4 h-4 text-violet-600" />
          </div>
          <div className="text-xl font-bold font-mono text-violet-700 tracking-tight">
            {CURRENCY}{totalScrapLoss.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
            <span className="font-medium text-slate-700">{adjustments.length} logged adjustments</span>
          </div>
        </div>
      </div>

      {/* 3. Sub-View Navigation Tabs (Master Inventory Pattern) */}
      <div className="flex items-center gap-1.5 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <button
          onClick={() => {
            setReportType('valuation');
            soundEffects.playClick();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            reportType === 'valuation'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Inventory Valuation Matrix</span>
        </button>

        <button
          onClick={() => {
            setReportType('suppliers');
            soundEffects.playClick();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            reportType === 'suppliers'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Supplier Payables & Aging</span>
        </button>

        <button
          onClick={() => {
            setReportType('health');
            soundEffects.playClick();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            reportType === 'health'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>SKU Health & Reorder Deficit</span>
        </button>

        <button
          onClick={() => {
            setReportType('scrap');
            soundEffects.playClick();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            reportType === 'scrap'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Scrap & Disposed Ledger</span>
        </button>

        <button
          onClick={() => {
            setReportType('category_margins');
            soundEffects.playClick();
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            reportType === 'category_margins'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Category Margin Breakdown</span>
        </button>
      </div>

      {/* 4. Filter & Search Toolbar (Master Inventory Style) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              reportType === 'valuation'
                ? 'Search by SKU, item name...'
                : reportType === 'suppliers'
                ? 'Search by supplier, city, state...'
                : reportType === 'health'
                ? 'Search critical items...'
                : reportType === 'scrap'
                ? 'Search write-offs, reason, location...'
                : 'Search categories...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter (Valuation & Health) */}
          {(reportType === 'valuation' || reportType === 'health') && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer font-semibold"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer font-semibold"
            >
              {reportType === 'valuation' && (
                <>
                  <option value="default">Default Order</option>
                  <option value="val_desc">Valuation: High ➔ Low</option>
                  <option value="val_asc">Valuation: Low ➔ High</option>
                  <option value="stock_desc">Stock: High ➔ Low</option>
                  <option value="name_asc">Name: A ➔ Z</option>
                </>
              )}
              {reportType === 'suppliers' && (
                <>
                  <option value="default">Default Order</option>
                  <option value="balance_desc">Payable: High ➔ Low</option>
                  <option value="balance_asc">Payable: Low ➔ High</option>
                  <option value="name_asc">Supplier: A ➔ Z</option>
                </>
              )}
              {reportType === 'health' && (
                <>
                  <option value="default">Default Order</option>
                  <option value="deficit_desc">Deficit: High ➔ Low</option>
                  <option value="stock_asc">Current Stock: Lowest First</option>
                  <option value="name_asc">Name: A ➔ Z</option>
                </>
              )}
              {reportType === 'scrap' && (
                <>
                  <option value="date_desc">Most Recent First</option>
                  <option value="loss_desc">Loss Value: High ➔ Low</option>
                </>
              )}
              {reportType === 'category_margins' && (
                <option value="default">Default Order</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* 5. Paginated Tables (Master Inventory Style) */}
      <div id="printable-warehouse-report" className="space-y-4">
        {/* REPORT 1: INVENTORY VALUATION MATRIX */}
        {reportType === 'valuation' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Central & Outlet Valuation Matrix</h3>
                <p className="text-xs text-slate-500">
                  Methodology: FIFO & Weighted Average Landed Cost ({sortedValuationItems.length} SKUs found)
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Filtered Valuation</span>
                <span className="text-base font-bold font-mono text-indigo-950">
                  {CURRENCY}
                  {sortedValuationItems
                    .reduce((acc, i) => acc + i.stockQuantity * i.costPrice, 0)
                    .toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Item / SKU</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-center bg-indigo-50/40 text-indigo-950">Central WH</th>
                    <th className="py-3 px-3 text-center">Store Total</th>
                    <th className="py-3 px-3 text-center font-bold">Total Stock</th>
                    <th className="py-3 px-3 text-right">Landed Cost</th>
                    <th className="py-3 px-3 text-right">Retail Price</th>
                    <th className="py-3 px-4 text-right">Total Valuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {paginatedValuation.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-sans text-xs">
                        No inventory records matching your query.
                      </td>
                    </tr>
                  ) : (
                    paginatedValuation.map((i) => {
                      const alloc = i.storeAllocations || {};
                      const storesSum = Object.values(alloc).reduce<number>(
                        (acc, val) => acc + (typeof val === 'number' ? val : 0),
                        0
                      );
                      const centralStock = Math.max(0, Number(i.stockQuantity) - storesSum);
                      const totalVal = i.stockQuantity * i.costPrice;

                      return (
                        <tr key={i.id} className="hover:bg-slate-50/80 transition-colors font-sans">
                          <td className="py-3 px-4 font-medium text-slate-900">
                            <div className="font-bold line-clamp-1">{i.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{i.sku}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                              {i.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-indigo-700 bg-indigo-50/20">
                            {centralStock}
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-700">{storesSum}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                            {i.stockQuantity} {i.unit}
                          </td>
                          <td className="py-3 px-3 text-right font-mono">{CURRENCY}{i.costPrice}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">{CURRENCY}{i.sellingPrice}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {CURRENCY}{totalVal.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {renderPagination()}
          </div>
        )}

        {/* REPORT 2: SUPPLIER OUTSTANDING & AGING */}
        {reportType === 'suppliers' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Supplier Outstanding Aging & Balance Summary</h3>
                <p className="text-xs text-slate-500">Active accounts payable balances across all vendors</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Outstanding</span>
                <span className="text-base font-bold font-mono text-rose-600">
                  {CURRENCY}
                  {sortedSuppliers.reduce((acc, s) => acc + s.currentOutstanding, 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3">Payment Terms</th>
                    <th className="py-3 px-4 text-right">Outstanding Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {paginatedSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        No supplier records matching your filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedSuppliers.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                        <td className="py-3 px-3 text-slate-600">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                            {s.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{s.city}, {s.state}</td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{s.phone}</td>
                        <td className="py-3 px-3 text-slate-600 font-medium">{s.paymentTerms}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600 text-sm">
                          {CURRENCY}{s.currentOutstanding.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {renderPagination()}
          </div>
        )}

        {/* REPORT 3: LOW STOCK & CRITICAL HEALTH */}
        {reportType === 'health' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Critical & Low Stock SKU Health Report</h3>
                <p className="text-xs text-slate-500">Items below minimum re-order threshold requiring attention</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Deficit SKUs</span>
                <span className="text-base font-bold font-mono text-amber-600">
                  {sortedHealthItems.length} SKUs Under Threshold
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Item Name & SKU</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3 text-center">Current Stock</th>
                    <th className="py-3 px-3 text-center">Min Threshold</th>
                    <th className="py-3 px-3 text-center">Deficit</th>
                    <th className="py-3 px-4 text-right">Reorder Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {paginatedHealth.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                        All catalog items are healthy and above their minimum thresholds!
                      </td>
                    </tr>
                  ) : (
                    paginatedHealth.map((i) => {
                      const deficit = Math.max(0, i.lowStockThreshold - i.stockQuantity);
                      const isOut = i.stockQuantity <= 0;
                      return (
                        <tr key={i.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-900">
                            <div className="font-bold">{i.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{i.sku}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                              {i.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold">
                            <span
                              className={`px-2 py-0.5 rounded-md ${
                                isOut
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {i.stockQuantity} {i.unit}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-600">
                            {i.lowStockThreshold} {i.unit}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-rose-600">
                            -{deficit} {i.unit}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-indigo-700 font-mono">
                            PO for min {deficit + 200} {i.unit}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {renderPagination()}
          </div>
        )}

        {/* REPORT 4: SCRAP & DISPOSED LEDGER */}
        {reportType === 'scrap' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Disposed, Damaged & Expired Scrap Ledger</h3>
                <p className="text-xs text-slate-500">Historical write-offs, discrepancies, and verified loss impacts</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Net Write-off Impact</span>
                <span className="text-base font-bold font-mono text-rose-600">
                  -{CURRENCY}{totalScrapLoss.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date & Ref #</th>
                    <th className="py-3 px-3">Item(s)</th>
                    <th className="py-3 px-3">Reason</th>
                    <th className="py-3 px-3">Location</th>
                    <th className="py-3 px-3">Auditor</th>
                    <th className="py-3 px-3 text-center">Scrapped Qty</th>
                    <th className="py-3 px-4 text-right">Valuation Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {paginatedAdjustments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        No damage or scrap write-off records found.
                      </td>
                    </tr>
                  ) : (
                    paginatedAdjustments.map((a) => {
                      const primaryItem = a.items[0];
                      const totalQty = a.items.reduce((s, it) => s + it.adjustedQty, 0);
                      const itemCount = a.items.length;
                      return (
                        <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">{a.date}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{a.adjustmentNumber}</div>
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900">
                            {primaryItem ? primaryItem.name : 'Stock Adjustment'}
                            {itemCount > 1 && (
                              <span className="text-slate-400 font-normal text-[11px] block">
                                (+{itemCount - 1} other items)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 capitalize">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {a.reason.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600">{a.locationName}</td>
                          <td className="py-3 px-3 text-slate-600 font-medium">{a.authorizedBy || 'Warehouse Staff'}</td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-rose-600">
                            {totalQty} units
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                            -{CURRENCY}{Math.abs(a.totalLossValue || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {renderPagination()}
          </div>
        )}

        {/* REPORT 5: CATEGORY MARGIN & STOCK BREAKDOWN */}
        {reportType === 'category_margins' && (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Category Valuation & Gross Margin Potential</h3>
                <p className="text-xs text-slate-500">Margin spread and stock concentration by product department</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-3 text-center">SKUs</th>
                    <th className="py-3 px-3 text-center">Total Units</th>
                    <th className="py-3 px-3 text-right">Cost Valuation</th>
                    <th className="py-3 px-3 text-right">Retail Potential</th>
                    <th className="py-3 px-3 text-right font-bold text-indigo-700">Gross Margin %</th>
                    <th className="py-3 px-4 text-center">Margin Bar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {categorySummary.map((c) => (
                    <tr key={c.category} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.category}</td>
                      <td className="py-3 px-3 text-center font-mono">{c.skus}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {c.totalUnits.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                        {CURRENCY}{c.costValuation.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        {CURRENCY}{c.retailValuation.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-700 text-sm">
                        {c.avgMarginPct}%
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-28 bg-slate-100 rounded-full h-2 overflow-hidden mx-auto">
                          <div
                            className="bg-indigo-600 h-2 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(5, c.avgMarginPct))}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
