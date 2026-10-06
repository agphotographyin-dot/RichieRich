import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  ClipboardCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  ShieldCheck,
  Package,
  Layers,
  Save,
  HelpCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { InventoryItem, StoreLocation } from '../../types';
import { storage } from '../../services/storage';
import { authService } from '../../services/auth';
import { soundEffects } from '../../services/audio';

interface StoreStockAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStore: StoreLocation;
  inventory: InventoryItem[];
  adminName?: string;
  preselectedItem?: InventoryItem | null;
  onSuccess: () => void;
}

interface AuditRowState {
  itemId: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPrice: number;
  systemStock: number;
  countedStock: number;
  reason: string;
  notes: string;
  isModified: boolean;
}

const AUDIT_REASONS = [
  { id: 'regular_count', label: 'Physical Stock Taking Count (Regular Audit)' },
  { id: 'damage_spoilage', label: 'Damaged / Spoiled Paan & Cafe Items' },
  { id: 'expired_stock', label: 'Expired / Stale Shelf Life Write-off' },
  { id: 'theft_missing', label: 'Missing / Unaccounted Pilferage' },
  { id: 'billing_correction', label: 'POS Billing / Return Discrepancy Correction' },
  { id: 'batch_variance', label: 'Packaging / Box Count Variance' },
  { id: 'sampling_testing', label: 'Customer Tasting / Quality Sampling Write-off' },
  { id: 'other', label: 'Other Store Inventory Adjustment' },
];

export const StoreStockAuditModal: React.FC<StoreStockAuditModalProps> = ({
  isOpen,
  onClose,
  currentStore,
  inventory,
  adminName = 'Store Manager',
  preselectedItem,
  onSuccess,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [discrepancyFilter, setDiscrepancyFilter] = useState<'all' | 'discrepancy_only' | 'surplus' | 'deficit' | 'matched'>('all');
  
  // Rows state: itemId -> AuditRowState
  const [auditRows, setAuditRows] = useState<Record<string, AuditRowState>>({});

  // Password Authorization State
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReport, setSuccessReport] = useState<{
    reference: string;
    itemsCount: number;
    auditedBy: string;
  } | null>(null);

  // Default global audit reason
  const [globalReason, setGlobalReason] = useState('regular_count');

  // Initialize audit rows when modal opens or store/inventory changes
  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setPasswordError('');
      setSuccessReport(null);
      return;
    }

    const initialRows: Record<string, AuditRowState> = {};
    inventory.forEach((item) => {
      const currentAllocated = Math.max(0, Number(item.storeAllocations?.[currentStore.id]) || 0);
      initialRows[item.id] = {
        itemId: item.id,
        sku: item.sku || `SKU-${item.id}`,
        name: item.name,
        category: item.category || 'Essentials',
        unit: item.unit || 'units',
        costPrice: item.costPrice || 0,
        systemStock: currentAllocated,
        countedStock: currentAllocated, // pre-filled with system stock
        reason: 'regular_count',
        notes: '',
        isModified: false,
      };
    });

    // If preselected item, focus on it
    if (preselectedItem && initialRows[preselectedItem.id]) {
      setSearchQuery(preselectedItem.name);
    } else {
      setSearchQuery('');
    }

    setAuditRows(initialRows);
    setPassword('');
    setPasswordError('');
    setSuccessReport(null);
  }, [isOpen, currentStore.id, inventory, preselectedItem]);

  // Update counted stock for an item
  const handleCountChange = (itemId: string, valStr: string) => {
    const parsed = valStr === '' ? 0 : Math.max(0, parseInt(valStr, 10) || 0);
    setAuditRows((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      const isModified = parsed !== current.systemStock;
      return {
        ...prev,
        [itemId]: {
          ...current,
          countedStock: parsed,
          isModified,
        },
      };
    });
    setPasswordError('');
  };

  const handleStepCount = (itemId: string, step: number) => {
    setAuditRows((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      const nextVal = Math.max(0, current.countedStock + step);
      const isModified = nextVal !== current.systemStock;
      return {
        ...prev,
        [itemId]: {
          ...current,
          countedStock: nextVal,
          isModified,
        },
      };
    });
    setPasswordError('');
  };

  const handleRowReasonChange = (itemId: string, reason: string) => {
    setAuditRows((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      return {
        ...prev,
        [itemId]: {
          ...current,
          reason,
        },
      };
    });
  };

  const handleRowNotesChange = (itemId: string, notes: string) => {
    setAuditRows((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      return {
        ...prev,
        [itemId]: {
          ...current,
          notes,
        },
      };
    });
  };

  // Quick reset all counts back to system allocations
  const handleResetToSystem = () => {
    if (!confirm('Reset all counted values back to current system stock?')) return;
    setAuditRows((prev) => {
      const next: Record<string, AuditRowState> = {};
      Object.keys(prev).forEach((id) => {
        next[id] = {
          ...prev[id],
          countedStock: prev[id].systemStock,
          isModified: false,
          notes: '',
        };
      });
      return next;
    });
  };

  // Filtered rows
  const filteredRowsList = useMemo(() => {
    const list = Object.values(auditRows);
    return list.filter((row) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          row.name.toLowerCase().includes(q) ||
          row.sku.toLowerCase().includes(q) ||
          row.category.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && row.category !== categoryFilter) {
        return false;
      }

      // Discrepancy filter
      const diff = row.countedStock - row.systemStock;
      if (discrepancyFilter === 'discrepancy_only' && diff === 0) return false;
      if (discrepancyFilter === 'surplus' && diff <= 0) return false;
      if (discrepancyFilter === 'deficit' && diff >= 0) return false;
      if (discrepancyFilter === 'matched' && diff !== 0) return false;

      return true;
    });
  }, [auditRows, searchQuery, categoryFilter, discrepancyFilter]);

  // Overall Statistics & Summary
  const auditSummary = useMemo(() => {
    const all = Object.values(auditRows);
    const modifiedRows = all.filter((r) => r.isModified || r.countedStock !== r.systemStock);
    
    let surplusCount = 0;
    let deficitCount = 0;
    let matchedCount = 0;
    let netQuantityDiff = 0;
    let netCostImpact = 0;

    all.forEach((r) => {
      const diff = r.countedStock - r.systemStock;
      netQuantityDiff += diff;
      netCostImpact += diff * r.costPrice;

      if (diff > 0) surplusCount++;
      else if (diff < 0) deficitCount++;
      else matchedCount++;
    });

    return {
      totalItems: all.length,
      modifiedCount: modifiedRows.length,
      surplusCount,
      deficitCount,
      matchedCount,
      netQuantityDiff,
      netCostImpact,
      modifiedRows,
    };
  }, [auditRows]);

  // Apply Changes Handler (Requires Store Admin Password)
  const handleApplyAudit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (auditSummary.modifiedCount === 0) {
      setPasswordError('No stock discrepancies or modifications detected. Adjust counted quantities before applying.');
      soundEffects.playWarningChime();
      return;
    }

    if (!password.trim()) {
      setPasswordError('Store Admin Password is required to authorize physical stock audit adjustments.');
      soundEffects.playWarningChime();
      return;
    }

    setIsSubmitting(true);

    // Verify password via authService
    const authResult = authService.verifyStoreAdminPassword(currentStore.id, password);

    if (!authResult.success) {
      setIsSubmitting(false);
      setPasswordError(authResult.error || 'Invalid Store Admin Password. Authorization denied.');
      soundEffects.playWarningChime();
      return;
    }

    // Build payload for storage.auditStoreStock
    const payload = auditSummary.modifiedRows.map((r) => {
      const reasonObj = AUDIT_REASONS.find((ar) => ar.id === r.reason);
      const reasonLabel = reasonObj ? reasonObj.label : r.reason;
      return {
        itemId: r.itemId,
        countedStock: r.countedStock,
        reason: reasonLabel,
        notes: r.notes || `Store Physical Audit: ${r.systemStock} -> ${r.countedStock} (${r.countedStock - r.systemStock >= 0 ? '+' : ''}${r.countedStock - r.systemStock} ${r.unit})`,
      };
    });

    try {
      const auditRes = storage.auditStoreStock(
        currentStore.id,
        payload,
        authResult.adminName || adminName
      );

      setIsSubmitting(false);

      if (auditRes.success) {
        soundEffects.playSuccessChime();
        setSuccessReport({
          reference: auditRes.auditReference,
          itemsCount: auditRes.modifiedCount,
          auditedBy: authResult.adminName || adminName,
        });
        onSuccess();
      } else {
        setPasswordError(auditRes.error || 'Failed to apply stock audit.');
        soundEffects.playWarningChime();
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setPasswordError(err?.message || 'Error occurred while saving audit.');
      soundEffects.playWarningChime();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Physical Store Stock Audit & Count
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                  {currentStore.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Physically count store inventory, track discrepancies, and commit adjustments with Store Admin authorization.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Audit"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen if completed */}
        {successReport ? (
          <div className="p-8 text-center space-y-5 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto border-2 border-emerald-300 shadow-lg">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">
                Stock Audit Applied & Synchronized Successfully!
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                All inventory allocations for <strong className="text-slate-800">{currentStore.name}</strong> have been updated in the system ledger and registered with an immutable audit movement trail.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-md mx-auto text-left font-mono text-xs space-y-2">
              <div className="flex justify-between pb-1 border-b border-slate-200">
                <span className="text-slate-500">Audit Reference:</span>
                <span className="font-extrabold text-amber-600">{successReport.reference}</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-slate-200">
                <span className="text-slate-500">Audited Outlet:</span>
                <span className="font-bold text-slate-900">{currentStore.name}</span>
              </div>
              <div className="flex justify-between pb-1 border-b border-slate-200">
                <span className="text-slate-500">SKUs Adjusted:</span>
                <span className="font-bold text-slate-900">{successReport.itemsCount} Items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Authorized By:</span>
                <span className="font-bold text-emerald-700">{successReport.auditedBy}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all"
            >
              Done & Return to Inventory
            </button>
          </div>
        ) : (
          /* Normal Audit Workspace */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Toolbar & Filters */}
            <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search SKU or product name to audit..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-amber-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">All Categories</option>
                  <option value="Paan">Paan</option>
                  <option value="Cafe">Cafe</option>
                  <option value="Essentials">Essentials</option>
                </select>

                <select
                  value={discrepancyFilter}
                  onChange={(e) => setDiscrepancyFilter(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">All Items ({auditSummary.totalItems})</option>
                  <option value="discrepancy_only">Discrepancies Only ({auditSummary.modifiedCount})</option>
                  <option value="surplus">Surplus (+) ({auditSummary.surplusCount})</option>
                  <option value="deficit">Shortage (-) ({auditSummary.deficitCount})</option>
                  <option value="matched">Matched (✓) ({auditSummary.matchedCount})</option>
                </select>

                <button
                  type="button"
                  onClick={handleResetToSystem}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Reset all counts to match system"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Main Table Viewport */}
            <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100 bg-white">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-100/80 sticky top-0 z-10 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Item SKU & Product</th>
                    <th className="py-2.5 px-4 text-center">Unit</th>
                    <th className="py-2.5 px-4 text-right">System Stock</th>
                    <th className="py-2.5 px-4 text-center">Physical Count (Audited)</th>
                    <th className="py-2.5 px-4 text-center">Variance (Diff)</th>
                    <th className="py-2.5 px-4">Reason for Discrepancy</th>
                    <th className="py-2.5 px-4">Audit Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRowsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        No inventory items matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRowsList.map((row) => {
                      const diff = row.countedStock - row.systemStock;
                      const hasDiscrepancy = diff !== 0;

                      return (
                        <tr
                          key={row.itemId}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            hasDiscrepancy ? 'bg-amber-50/20' : ''
                          }`}
                        >
                          {/* Item details */}
                          <td className="py-2.5 px-4">
                            <div className="font-extrabold text-slate-900">{row.name}</div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-400">
                              <span>SKU: {row.sku}</span>
                              <span>•</span>
                              <span className="text-slate-600 font-semibold">{row.category}</span>
                            </div>
                          </td>

                          {/* Unit */}
                          <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                            {row.unit}
                          </td>

                          {/* System Allocated Stock */}
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800">
                            <span className="px-2 py-1 bg-slate-100 rounded-lg">
                              {row.systemStock}
                            </span>
                          </td>

                          {/* Physical Count Input Stepper */}
                          <td className="py-2.5 px-4">
                            <div className="flex items-center justify-center gap-1 max-w-[140px] mx-auto">
                              <button
                                type="button"
                                onClick={() => handleStepCount(row.itemId, -1)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-colors shrink-0"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={row.countedStock === 0 && !row.isModified ? 0 : row.countedStock}
                                onChange={(e) => handleCountChange(row.itemId, e.target.value)}
                                className={`w-16 text-center font-mono font-black text-xs py-1 px-1 rounded-lg border focus:outline-hidden ${
                                  hasDiscrepancy
                                    ? diff > 0
                                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                                      : 'bg-rose-50 border-rose-400 text-rose-900'
                                    : 'bg-white border-slate-300 text-slate-900'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => handleStepCount(row.itemId, 1)}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer transition-colors shrink-0"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Variance Badge */}
                          <td className="py-2.5 px-4 text-center">
                            {diff === 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                                <span>0</span>
                                <span className="text-[9px]">(Matched)</span>
                              </span>
                            ) : diff > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-black border border-emerald-300">
                                <TrendingUp className="w-3 h-3" />
                                <span>+{diff}</span>
                                <span className="text-[9px] font-bold uppercase">(Surplus)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono font-black border border-rose-300">
                                <TrendingDown className="w-3 h-3" />
                                <span>{diff}</span>
                                <span className="text-[9px] font-bold uppercase">(Shortage)</span>
                              </span>
                            )}
                          </td>

                          {/* Reason */}
                          <td className="py-2.5 px-4">
                            <select
                              value={row.reason}
                              onChange={(e) => handleRowReasonChange(row.itemId, e.target.value)}
                              disabled={!hasDiscrepancy}
                              className={`w-full text-[11px] font-medium rounded-lg px-2 py-1 border focus:outline-hidden ${
                                hasDiscrepancy
                                  ? 'bg-white border-amber-300 text-slate-800'
                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                              }`}
                            >
                              {AUDIT_REASONS.map((ar) => (
                                <option key={ar.id} value={ar.id}>
                                  {ar.label}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Notes */}
                          <td className="py-2.5 px-4">
                            <input
                              type="text"
                              placeholder={hasDiscrepancy ? 'Audit remarks / batch / reason...' : 'No discrepancy'}
                              value={row.notes}
                              onChange={(e) => handleRowNotesChange(row.itemId, e.target.value)}
                              disabled={!hasDiscrepancy}
                              className={`w-full text-[11px] rounded-lg px-2.5 py-1 border focus:outline-hidden ${
                                hasDiscrepancy
                                  ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                              }`}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Audit Confirmation Bar with Store Admin Password Authorization */}
            <form
              onSubmit={handleApplyAudit}
              className="bg-slate-900 text-white p-4 border-t border-slate-800 shrink-0 space-y-3"
            >
              {/* Summary KPIs */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs pb-3 border-b border-slate-800">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Total Items:</span>
                    <span className="font-mono font-black text-white">{auditSummary.totalItems}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Discrepancies:</span>
                    <span className={`font-mono font-black px-2 py-0.5 rounded ${auditSummary.modifiedCount > 0 ? 'bg-amber-500/20 text-amber-300' : 'text-slate-300'}`}>
                      {auditSummary.modifiedCount} items
                    </span>
                  </div>

                  {auditSummary.surplusCount > 0 && (
                    <div className="flex items-center gap-1 text-emerald-400 font-mono text-[11px] font-bold">
                      <span>+{auditSummary.surplusCount} Surplus</span>
                    </div>
                  )}

                  {auditSummary.deficitCount > 0 && (
                    <div className="flex items-center gap-1 text-rose-400 font-mono text-[11px] font-bold">
                      <span>-{auditSummary.deficitCount} Shortage</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                      Cost Value Impact
                    </span>
                    <span
                      className={`text-sm font-mono font-black ${
                        auditSummary.netCostImpact >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {auditSummary.netCostImpact >= 0 ? '+' : ''}₹
                      {Math.abs(auditSummary.netCostImpact).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Password Authorization Form */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex-1 max-w-lg">
                  <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Store Admin Password Required to Apply Audit Changes</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter Store Admin password (e.g. RRbopal, RRgota, RRadmin)..."
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError('');
                      }}
                      className="w-full pl-3 pr-10 py-2 bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || auditSummary.modifiedCount === 0}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                      auditSummary.modifiedCount === 0
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white active:scale-95 border border-amber-500/40'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                    <span>{isSubmitting ? 'Verifying & Applying...' : `Authorize & Commit Audit (${auditSummary.modifiedCount} SKUs)`}</span>
                  </button>
                </div>
              </div>

              {/* Password or Validation Error Banner */}
              {passwordError && (
                <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-1 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
