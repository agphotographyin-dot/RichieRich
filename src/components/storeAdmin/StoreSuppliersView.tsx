import React, { useState, useMemo } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Package,
  Star,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  Truck,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShoppingBag,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Tag,
  LayoutGrid,
  List,
  FileText,
  Printer,
  Receipt,
  FileSpreadsheet,
  PackageCheck,
  DollarSign,
  ArrowRight,
  Check,
  Calendar,
} from 'lucide-react';
import { Supplier, PurchaseOrder, PurchaseBill, SupplierLedgerEntry } from '../../types/warehouse';
import { InventoryItem, StoreLocation } from '../../types';
import { warehouseStorage } from '../../services/warehouseStorage';
import { CURRENCY } from '../../services/storage';
import { soundEffects } from '../../services/audio';
import { DocumentManifestModal, ManifestDocumentType } from '../common/DocumentManifestModal';

interface StoreSuppliersViewProps {
  currentStore: StoreLocation;
  inventory: InventoryItem[];
  adminName?: string;
  onOpenCreatePOForSupplier: (supplier?: Supplier) => void;
  onOpenReceiveGoods?: (po?: PurchaseOrder) => void;
  onOpenAddSupplier: () => void;
  onOpenEditSupplier: (supplier: Supplier) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

export const StoreSuppliersView: React.FC<StoreSuppliersViewProps> = ({
  currentStore,
  inventory,
  adminName,
  onOpenCreatePOForSupplier,
  onOpenReceiveGoods,
  onOpenAddSupplier,
  onOpenEditSupplier,
  refreshKey,
  triggerRefresh,
}) => {
  // Primary Navigation Subtabs
  const [activeTab, setActiveTab] = useState<'vendors' | 'pos' | 'bills' | 'ledger'>('vendors');

  // Filters and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [termsFilter, setTermsFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [poStatusFilter, setPoStatusFilter] = useState('all');
  const [billStatusFilter, setBillStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modal States
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Pay Due Modal State
  const [isPayDueOpen, setIsPayDueOpen] = useState(false);
  const [payDueSupplierId, setPayDueSupplierId] = useState<string>('');
  const [payDueAmount, setPayDueAmount] = useState<string>('');
  const [payDueMode, setPayDueMode] = useState<'NEFT' | 'UPI' | 'Cheque' | 'Cash'>('NEFT');
  const [payDueRefNumber, setPayDueRefNumber] = useState('');
  const [payDueNotes, setPayDueNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Document Manifest (PO Manifest / Invoice / GRN Slip)
  const [manifestDoc, setManifestDoc] = useState<{
    isOpen: boolean;
    type: ManifestDocumentType;
    data: any;
  }>({
    isOpen: false,
    type: 'purchase_order',
    data: null,
  });

  // Fetch all suppliers, store POs, purchase bills, and ledgers
  const suppliers = useMemo(() => {
    return warehouseStorage.getSuppliers();
  }, [refreshKey]);

  const storePOs = useMemo(() => {
    return warehouseStorage.getDirectStorePOs(currentStore.id);
  }, [currentStore.id, refreshKey]);

  const storeBills = useMemo(() => {
    const allBills = warehouseStorage.getPurchaseBills();
    return allBills.filter(
      (b) =>
        b.destinationId === currentStore.id ||
        b.storeId === currentStore.id ||
        (b.destinationName && b.destinationName.toLowerCase().includes(currentStore.name.toLowerCase()))
    );
  }, [currentStore.id, currentStore.name, refreshKey]);

  const ledgerEntries = useMemo(() => {
    return warehouseStorage.getSupplierLedger();
  }, [refreshKey]);

  // Overall Procurement Metrics
  const metrics = useMemo(() => {
    const totalVendors = suppliers.length;
    const activeVendors = suppliers.filter((s) => s.isActive).length;
    const totalPurchasesVolume = storePOs.reduce((sum, po) => sum + (po.grandTotal || 0), 0);
    const totalBilledAmount = storeBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
    const totalPaidAmount = storeBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const totalOutstandingDue = suppliers.reduce((sum, s) => sum + (s.currentOutstanding || 0), 0);
    const pendingPOsCount = storePOs.filter(
      (po) => po.status === 'sent_to_supplier' || po.status === 'partially_received'
    ).length;

    return {
      totalVendors,
      activeVendors,
      totalPurchasesVolume,
      totalBilledAmount,
      totalPaidAmount,
      totalOutstandingDue,
      pendingPOsCount,
    };
  }, [suppliers, storePOs, storeBills]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((sup) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = sup.name.toLowerCase().includes(q);
        const matchesCode = sup.code.toLowerCase().includes(q);
        const matchesContact = (sup.contactPerson || '').toLowerCase().includes(q);
        const matchesPhone = (sup.phone || '').toLowerCase().includes(q);
        const matchesCity = (sup.city || '').toLowerCase().includes(q);
        const matchesProduct = (sup.associatedProductNames || []).some((p) =>
          p.toLowerCase().includes(q)
        );

        if (
          !matchesName &&
          !matchesCode &&
          !matchesContact &&
          !matchesPhone &&
          !matchesCity &&
          !matchesProduct
        ) {
          return false;
        }
      }

      if (categoryFilter !== 'all' && sup.category !== categoryFilter) return false;
      if (termsFilter !== 'all' && sup.paymentTerms !== termsFilter) return false;
      if (statusFilter === 'active' && !sup.isActive) return false;
      if (statusFilter === 'inactive' && sup.isActive) return false;

      return true;
    });
  }, [suppliers, searchQuery, categoryFilter, termsFilter, statusFilter]);

  // Filtered POs
  const filteredPOs = useMemo(() => {
    return storePOs.filter((po) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = po.poNumber.toLowerCase().includes(q);
        const matchSup = po.supplierName.toLowerCase().includes(q);
        const matchItems = po.items.some((it) => it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q));
        if (!matchNo && !matchSup && !matchItems) return false;
      }
      if (supplierFilter !== 'all' && po.supplierId !== supplierFilter) return false;
      if (poStatusFilter !== 'all' && po.status !== poStatusFilter) return false;
      return true;
    });
  }, [storePOs, searchQuery, supplierFilter, poStatusFilter]);

  // Filtered Bills
  const filteredBills = useMemo(() => {
    return storeBills.filter((b) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchBill = b.billNumber.toLowerCase().includes(q);
        const matchInv = (b.supplierInvoiceNo || '').toLowerCase().includes(q);
        const matchSup = b.supplierName.toLowerCase().includes(q);
        const matchPO = (b.poNumber || '').toLowerCase().includes(q);
        if (!matchBill && !matchInv && !matchSup && !matchPO) return false;
      }
      if (supplierFilter !== 'all' && b.supplierId !== supplierFilter) return false;
      if (billStatusFilter !== 'all' && b.paymentStatus !== billStatusFilter) return false;
      return true;
    });
  }, [storeBills, searchQuery, supplierFilter, billStatusFilter]);

  // Filtered Ledgers
  const filteredLedgers = useMemo(() => {
    return ledgerEntries.filter((led) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSup = led.supplierName.toLowerCase().includes(q);
        const matchRef = (led.referenceNo || '').toLowerCase().includes(q);
        const matchNotes = (led.notes || '').toLowerCase().includes(q);
        if (!matchSup && !matchRef && !matchNotes) return false;
      }
      if (supplierFilter !== 'all' && led.supplierId !== supplierFilter) return false;
      return true;
    });
  }, [ledgerEntries, searchQuery, supplierFilter]);

  // Open Pay Due Modal for a specific vendor
  const handleOpenPayDue = (sup: Supplier, prefillAmount?: number) => {
    setPayDueSupplierId(sup.id);
    setPayDueAmount(String(prefillAmount !== undefined ? prefillAmount : sup.currentOutstanding || 0));
    setPayDueMode('NEFT');
    setPayDueRefNumber(`UTR-${Math.floor(10000000 + Math.random() * 90000000)}`);
    setPayDueNotes(`Direct store payment to ${sup.name} from ${currentStore.name}`);
    setPaymentError('');
    setIsPayDueOpen(true);
  };

  // Submit Pay Due
  const handleConfirmPayDue = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');

    const targetSup = suppliers.find((s) => s.id === payDueSupplierId);
    if (!targetSup) {
      setPaymentError('Please select a valid supplier.');
      soundEffects.playWarningChime();
      return;
    }

    const amt = parseFloat(payDueAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentError('Please enter a valid payment amount greater than zero.');
      soundEffects.playWarningChime();
      return;
    }

    setIsSubmittingPayment(true);
    try {
      let mode: 'bank_neft' | 'upi_qr' | 'cheque' | 'cash' = 'bank_neft';
      if (payDueMode === 'UPI') mode = 'upi_qr';
      else if (payDueMode === 'Cheque') mode = 'cheque';
      else if (payDueMode === 'Cash') mode = 'cash';

      warehouseStorage.recordSupplierPayment(
        targetSup.id,
        amt,
        mode,
        payDueRefNumber || `PAY-${Date.now().toString().slice(-4)}`,
        payDueNotes || `Direct store payment for ${currentStore.name}`
      );

      soundEffects.playSuccessChime();
      setIsSubmittingPayment(false);
      setIsPayDueOpen(false);
      triggerRefresh();
    } catch (err: any) {
      setIsSubmittingPayment(false);
      setPaymentError(err?.message || 'Failed to record supplier payment.');
      soundEffects.playWarningChime();
    }
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = () => {
    if (!supplierToDelete) return;
    try {
      const ok = warehouseStorage.deleteSupplier(supplierToDelete.id);
      if (ok) {
        soundEffects.playSuccessChime();
        triggerRefresh();
      }
    } catch (e) {
      console.error(e);
    }
    setSupplierToDelete(null);
  };

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'raw_materials':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'spices_mukhwas':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'cafe_beverages':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'packaging':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'essentials_fresheners':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'raw_materials':
        return 'Raw Betel Leaves & Paan';
      case 'spices_mukhwas':
        return 'Spices, Supari & Mukhwas';
      case 'cafe_beverages':
        return 'Cafe & Dairy Supplies';
      case 'packaging':
        return 'Luxury Packaging & Vark';
      case 'essentials_fresheners':
        return 'Mouth Fresheners & Essentials';
      default:
        return cat.replace(/_/g, ' ');
    }
  };

  const activePaySupplier = suppliers.find((s) => s.id === payDueSupplierId) || suppliers[0];

  return (
    <div className="space-y-5">
      {/* 1. Header Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Registered Vendors
            </span>
            <div className="text-xl font-black text-slate-900 mt-1">
              {metrics.totalVendors}{' '}
              <span className="text-xs text-emerald-600 font-semibold">
                ({metrics.activeVendors} Active)
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Direct procurement directory
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Direct POs Volume
            </span>
            <div className="text-xl font-black font-mono text-slate-900 mt-1">
              {CURRENCY}{metrics.totalPurchasesVolume.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-amber-600 font-bold mt-0.5 block">
              {metrics.pendingPOsCount} Pending Inward
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Inward Bills Settled
            </span>
            <div className="text-xl font-black font-mono text-emerald-700 mt-1">
              {CURRENCY}{metrics.totalPaidAmount.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              From {CURRENCY}{metrics.totalBilledAmount.toLocaleString('en-IN')} Billed
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Outstanding Due
            </span>
            <div className="text-xl font-black font-mono text-rose-700 mt-1">
              {CURRENCY}{metrics.totalOutstandingDue.toLocaleString('en-IN')}
            </div>
            <button
              type="button"
              onClick={() => {
                const firstDue = suppliers.find((s) => s.currentOutstanding > 0) || suppliers[0];
                if (firstDue) handleOpenPayDue(firstDue);
              }}
              className="text-[10px] text-rose-600 hover:text-rose-700 font-bold mt-0.5 inline-flex items-center gap-1 cursor-pointer underline"
            >
              <span>Pay Due Balance Now →</span>
            </button>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Subtabs Navigation Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('vendors')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'vendors'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Vendors Directory</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'vendors' ? 'bg-amber-800 text-amber-200' : 'bg-slate-200 text-slate-700'}`}>
              {suppliers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'pos'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Purchase Orders & Manifests</span>
            {metrics.pendingPOsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'pos' ? 'bg-amber-800 text-amber-200' : 'bg-amber-500 text-slate-950 font-black'}`}>
                {metrics.pendingPOsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bills')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'bills'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Inward Bills & GRN Slips</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'bills' ? 'bg-amber-800 text-amber-200' : 'bg-slate-200 text-slate-700'}`}>
              {storeBills.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ledger')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'ledger'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Supplier Ledgers & Payments</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'ledger' ? 'bg-amber-800 text-amber-200' : 'bg-slate-200 text-slate-700'}`}>
              {ledgerEntries.length}
            </span>
          </button>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const firstDue = suppliers.find((s) => s.currentOutstanding > 0) || suppliers[0];
              if (firstDue) handleOpenPayDue(firstDue);
            }}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Make a payment settlement to vendor"
          >
            <CreditCard className="w-3.5 h-3.5 text-rose-200" />
            <span>Pay Due</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenCreatePOForSupplier()}
            className="px-3.5 py-2 bg-[#0F172A] hover:bg-slate-800 text-amber-400 text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors border border-amber-500/30"
            title="Raise Direct Purchase Order"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Direct PO</span>
          </button>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeTab === 'vendors'
                  ? 'Search vendor name, code, contact person, phone, city, or products...'
                  : activeTab === 'pos'
                  ? 'Search PO #, supplier name, ordered products...'
                  : activeTab === 'bills'
                  ? 'Search bill #, invoice #, supplier, or PO ref...'
                  : 'Search ledger entries, references, or vendor names...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-amber-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'vendors' && (
              <>
                <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      viewMode === 'cards'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Cards Directory View"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                    title="Detailed Table View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onOpenAddSupplier}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-all border border-amber-500/40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register New Vendor</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Specific Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>

          {activeTab === 'vendors' ? (
            <>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Categories</option>
                <option value="raw_materials">Raw Betel Leaves & Paan</option>
                <option value="spices_mukhwas">Spices & Mukhwas</option>
                <option value="cafe_beverages">Cafe & Beverages</option>
                <option value="packaging">Packaging & Vark</option>
                <option value="essentials_fresheners">Fresheners & Essentials</option>
                <option value="cleaning_supplies">Cleaning & Supplies</option>
              </select>

              <select
                value={termsFilter}
                onChange={(e) => setTermsFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Payment Terms</option>
                <option value="Immediate / Cash">Immediate / Cash</option>
                <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                <option value="Net 7 Days">Net 7 Days</option>
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="50% Advance & Balance on Delivery">50% Advance & Balance</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive / Suspended</option>
              </select>
            </>
          ) : (
            <>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="all">All Suppliers ({suppliers.length})</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {activeTab === 'pos' && (
                <select
                  value={poStatusFilter}
                  onChange={(e) => setPoStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">All PO Statuses</option>
                  <option value="sent_to_supplier">Sent to Supplier</option>
                  <option value="partially_received">Partially Inwarded</option>
                  <option value="received">Fully Inwarded</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              )}

              {activeTab === 'bills' && (
                <select
                  value={billStatusFilter}
                  onChange={(e) => setBillStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">All Bill Statuses</option>
                  <option value="due">Payment Due</option>
                  <option value="partial">Partially Paid</option>
                  <option value="paid">Fully Settled</option>
                </select>
              )}
            </>
          )}

          <span className="ml-auto text-slate-500 font-bold font-mono">
            {activeTab === 'vendors' && `Showing ${filteredSuppliers.length} of ${suppliers.length} Vendors`}
            {activeTab === 'pos' && `Showing ${filteredPOs.length} of ${storePOs.length} POs`}
            {activeTab === 'bills' && `Showing ${filteredBills.length} of ${storeBills.length} Inward Bills`}
            {activeTab === 'ledger' && `Showing ${filteredLedgers.length} of ${ledgerEntries.length} Transactions`}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VENDORS DIRECTORY                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'vendors' && (
        <>
          {filteredSuppliers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-2xs">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">No Suppliers Found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  No vendors matched your search criteria. Register a new direct vendor or adjust your search filters.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenAddSupplier}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-black rounded-xl shadow-md cursor-pointer transition-all inline-flex items-center gap-2 border border-amber-500/40"
              >
                <Plus className="w-4 h-4" />
                <span>Register New Vendor</span>
              </button>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSuppliers.map((supplier) => {
                const hasProducts =
                  (supplier.associatedProductNames && supplier.associatedProductNames.length > 0) ||
                  (supplier.associatedItemIds && supplier.associatedItemIds.length > 0);

                return (
                  <div
                    key={supplier.id}
                    className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div>
                      {/* Top Row: Name, Code & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm text-slate-900 truncate">
                              {supplier.name}
                            </h3>
                            {supplier.isActive ? (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Active Vendor"></span>
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" title="Inactive"></span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-400">
                            <span>{supplier.code}</span>
                            <span>•</span>
                            <div className="flex items-center text-amber-500">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span className="font-bold ml-0.5 text-slate-700">
                                {supplier.rating || 5}.0
                              </span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${getCategoryBadgeColor(
                            supplier.category
                          )}`}
                        >
                          {getCategoryLabel(supplier.category)}
                        </span>
                      </div>

                      {/* Contact Info */}
                      <div className="mt-3.5 bg-slate-50/80 rounded-2xl p-3 border border-slate-100 text-xs space-y-1.5">
                        {supplier.contactPerson && (
                          <div className="flex items-center gap-2 text-slate-800 font-bold">
                            <span className="text-[10px] text-slate-400 uppercase font-mono">Contact:</span>
                            <span className="truncate">{supplier.contactPerson}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <a
                            href={`tel:${supplier.phone}`}
                            className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 font-mono font-bold"
                            title="Click to Call"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{supplier.phone}</span>
                          </a>

                          {supplier.email && (
                            <a
                              href={`mailto:${supplier.email}`}
                              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 truncate"
                              title={supplier.email}
                            >
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{supplier.email}</span>
                            </a>
                          )}
                        </div>

                        {(supplier.city || supplier.state) && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {supplier.address ? `${supplier.address}, ` : ''}
                              {supplier.city}, {supplier.state}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Payment Terms & Outstanding Balance */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Payment Terms
                          </span>
                          <span className="font-extrabold text-slate-800 text-xs block mt-0.5">
                            {supplier.paymentTerms || 'Net 15 Days'}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Outstanding Due
                            </span>
                            <span
                              className={`font-mono font-black text-xs block mt-0.5 ${
                                (supplier.currentOutstanding || 0) > 0 ? 'text-rose-600' : 'text-emerald-700'
                              }`}
                            >
                              {CURRENCY}{(supplier.currentOutstanding || 0).toLocaleString('en-IN')}
                            </span>
                          </div>

                          {(supplier.currentOutstanding || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenPayDue(supplier)}
                              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black shadow-2xs cursor-pointer transition-colors"
                              title="Pay Due"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Associated Products */}
                      <div className="mt-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                          Associated Products & Supplies
                        </span>
                        {hasProducts ? (
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                            {supplier.associatedProductNames &&
                              supplier.associatedProductNames.map((p, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/80 text-[10px] font-semibold"
                                >
                                  {p}
                                </span>
                              ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            No specific products tagged. Available for general purchasing.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenCreatePOForSupplier(supplier)}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 border border-amber-500/40"
                        title={`Raise Direct Store PO with ${supplier.name}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Raise Direct PO</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenEditSupplier(supplier)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                        title="Edit Vendor Details"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setSupplierToDelete(supplier)}
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer border border-rose-200"
                        title="Delete Vendor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Vendor Name & Code</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Contact Person & Phone</th>
                      <th className="py-3 px-4">Payment Terms</th>
                      <th className="py-3 px-4 text-right">Outstanding (₹)</th>
                      <th className="py-3 px-4">Associated Products</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSuppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                            <span>{supplier.name}</span>
                            {supplier.isActive ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400">
                            {supplier.code} • Rating: {supplier.rating || 5}.0 ⭐
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeColor(
                              supplier.category
                            )}`}
                          >
                            {getCategoryLabel(supplier.category)}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{supplier.contactPerson || 'N/A'}</div>
                          <div className="text-[11px] font-mono text-indigo-600 font-semibold">
                            {supplier.phone}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-800">
                          {supplier.paymentTerms || 'Net 15 Days'}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-black">
                          <div className="flex items-center justify-end gap-1.5">
                            <span
                              className={
                                (supplier.currentOutstanding || 0) > 0 ? 'text-rose-600' : 'text-emerald-700'
                              }
                            >
                              {CURRENCY}{(supplier.currentOutstanding || 0).toLocaleString('en-IN')}
                            </span>
                            {(supplier.currentOutstanding || 0) > 0 && (
                              <button
                                type="button"
                                onClick={() => handleOpenPayDue(supplier)}
                                className="px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-600 hover:text-white text-rose-800 text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                Pay Due
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 max-w-xs">
                          {supplier.associatedProductNames && supplier.associatedProductNames.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {supplier.associatedProductNames.slice(0, 3).map((p, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-medium"
                                >
                                  {p}
                                </span>
                              ))}
                              {supplier.associatedProductNames.length > 3 && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  +{supplier.associatedProductNames.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">General</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenCreatePOForSupplier(supplier)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              title="Raise Direct PO"
                            >
                              <Plus className="w-3 h-3" />
                              <span>PO</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenEditSupplier(supplier)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setSupplierToDelete(supplier)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PURCHASE ORDERS & PO MANIFESTS                                     */}
      {/* ========================================================================= */}
      {activeTab === 'pos' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">PO Number & Date</th>
                  <th className="py-3 px-4">Vendor / Supplier</th>
                  <th className="py-3 px-4">Expected Delivery</th>
                  <th className="py-3 px-4">Ordered Items</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Manifests & Inward</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPOs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No purchase orders found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredPOs.map((po) => {
                    const totalQtyOrdered = po.items.reduce((sum, it) => sum + (it.quantityOrdered || 0), 0);
                    const totalQtyReceived = po.items.reduce((sum, it) => sum + (it.quantityReceived || 0), 0);

                    return (
                      <tr key={po.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900 font-mono text-xs">
                            {po.poNumber}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{po.orderDate}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{po.supplierName}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            GSTIN: {po.supplierGstin || 'N/A'}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-700">
                          {po.expectedDeliveryDate || 'Immediate'}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">
                            {po.items.length} Product(s) ({totalQtyOrdered} units)
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            Received: {totalQtyReceived} / {totalQtyOrdered} units
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                          {CURRENCY}{Number(po.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              po.status === 'received'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : po.status === 'partially_received'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : po.status === 'cancelled'
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            {po.status === 'sent_to_supplier'
                              ? 'Sent to Supplier'
                              : po.status === 'partially_received'
                              ? 'Partially Received'
                              : po.status === 'received'
                              ? 'Fully Inwarded'
                              : 'Cancelled'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* PO Manifest & Order Sheet */}
                            <button
                              type="button"
                              onClick={() => {
                                setManifestDoc({
                                  isOpen: true,
                                  type: 'purchase_order',
                                  data: po,
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="View & Print Official Vendor PO Manifest"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              <span>PO Manifest</span>
                            </button>

                            {/* Inward Receive Goods if pending */}
                            {po.status !== 'received' && po.status !== 'cancelled' && onOpenReceiveGoods && (
                              <button
                                type="button"
                                onClick={() => onOpenReceiveGoods(po)}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                title="Inward Received Goods into Store Stock"
                              >
                                <PackageCheck className="w-3.5 h-3.5" />
                                <span>Receive / GRN</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INWARD PURCHASE BILLS & GRN SLIPS                                  */}
      {/* ========================================================================= */}
      {activeTab === 'bills' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">GRN & Inward Bill #</th>
                  <th className="py-3 px-4">Supplier & Invoice #</th>
                  <th className="py-3 px-4">Date & Status</th>
                  <th className="py-3 px-4 text-right">Bill Total (₹)</th>
                  <th className="py-3 px-4 text-right">Paid / Due (₹)</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4 text-right">Manifests & Pay Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No purchase bills or GRN records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((bill) => {
                    const supplier = suppliers.find((s) => s.id === bill.supplierId);

                    return (
                      <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900 font-mono text-xs">
                            {bill.billNumber}
                          </div>
                          {bill.poNumber && (
                            <div className="text-[10px] text-amber-700 font-mono">
                              Ref: {bill.poNumber}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{bill.supplierName}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            Vendor Inv: <strong className="text-slate-700">{bill.supplierInvoiceNo || 'N/A'}</strong>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-mono text-slate-700">{bill.billDate || bill.receivedDate}</div>
                          <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>GRN Verified & Stocked</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                          {CURRENCY}{Number(bill.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold">
                          <div className="text-emerald-700">Paid: {CURRENCY}{(bill.paidAmount || 0).toLocaleString('en-IN')}</div>
                          <div className="text-rose-600 font-black">Due: {CURRENCY}{(bill.dueAmount || 0).toLocaleString('en-IN')}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              bill.paymentStatus === 'paid'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : bill.paymentStatus === 'partial'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {bill.paymentStatus === 'paid'
                              ? 'Fully Settled'
                              : bill.paymentStatus === 'partial'
                              ? 'Partially Paid'
                              : 'Payment Due'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Vendor's Invoice / Manifest */}
                            <button
                              type="button"
                              onClick={() => {
                                setManifestDoc({
                                  isOpen: true,
                                  type: 'purchase_bill',
                                  data: bill,
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="View & Print Vendor Invoice & Tax Inward Manifest"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-600" />
                              <span>Invoice</span>
                            </button>

                            {/* GRN Slip */}
                            <button
                              type="button"
                              onClick={() => {
                                setManifestDoc({
                                  isOpen: true,
                                  type: 'purchase_bill',
                                  data: bill,
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                              title="View & Print Verified GRN Slip"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-700" />
                              <span>GRN Slip</span>
                            </button>

                            {/* Pay Due if pending */}
                            {(bill.dueAmount || 0) > 0 && supplier && (
                              <button
                                type="button"
                                onClick={() => handleOpenPayDue(supplier, bill.dueAmount)}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                title="Pay Bill Due"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay Due</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SUPPLIER FINANCIAL LEDGER                                          */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 text-slate-700 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Txn ID</th>
                  <th className="py-3 px-4">Vendor / Supplier</th>
                  <th className="py-3 px-4">Type & Reference #</th>
                  <th className="py-3 px-4 text-right">Debit / Paid (₹)</th>
                  <th className="py-3 px-4 text-right">Credit / Billed (₹)</th>
                  <th className="py-3 px-4 text-right">Running Balance (₹)</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLedgers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      No supplier ledger entries found.
                    </td>
                  </tr>
                ) : (
                  filteredLedgers.map((led) => {
                    const isDebit = led.debit > 0;
                    return (
                      <tr key={led.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-800">
                          <div>{led.date}</div>
                          <div className="text-[10px] text-slate-400">{led.id}</div>
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">
                          {led.supplierName}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              led.type === 'payment_made'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {led.type === 'payment_made' ? 'Payment Outflow' : 'Inward Purchase Bill'}
                          </span>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            Ref: {led.referenceNo}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {led.debit > 0 ? `${CURRENCY}${led.debit.toLocaleString('en-IN')}` : '—'}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                          {led.credit > 0 ? `${CURRENCY}${led.credit.toLocaleString('en-IN')}` : '—'}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                          {CURRENCY}{Number(led.runningBalance || 0).toLocaleString('en-IN')}
                        </td>

                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                          {led.notes || 'Recorded'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: PAY DUE / RECORD SUPPLIER PAYMENT MODAL                          */}
      {/* ========================================================================= */}
      {isPayDueOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4 text-slate-900">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Pay Supplier Due Balance
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Record payout, update vendor ledger, and settle inward purchase bills.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPayDueOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {paymentError && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmPayDue} className="space-y-4">
              {/* Supplier Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Supplier / Vendor *
                </label>
                <select
                  value={payDueSupplierId}
                  onChange={(e) => {
                    setPayDueSupplierId(e.target.value);
                    const s = suppliers.find((x) => x.id === e.target.value);
                    if (s) setPayDueAmount(String(s.currentOutstanding || 0));
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:border-amber-500"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Due: {CURRENCY}{Number(s.currentOutstanding || 0).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Outstanding Banner */}
              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-700 font-bold font-sans">Current Outstanding:</span>
                <span className="font-black text-rose-700 text-base">
                  {CURRENCY}{Number(activePaySupplier?.currentOutstanding || 0).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Payment Mode & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={payDueMode}
                    onChange={(e) => setPayDueMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden"
                  >
                    <option value="NEFT">Bank Transfer (NEFT / RTGS / IMPS)</option>
                    <option value="UPI">Corporate UPI / QR Scan</option>
                    <option value="Cheque">Bank Cheque</option>
                    <option value="Cash">Cash Outflow Voucher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Amount ({CURRENCY}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={payDueAmount}
                    onChange={(e) => setPayDueAmount(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-black text-slate-900 focus:outline-hidden focus:border-rose-500"
                  />
                </div>
              </div>

              {/* UTR / Ref Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bank UTR / Transaction Ref / Cheque # *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR-88291024 or CHEQ-99120"
                  value={payDueRefNumber}
                  onChange={(e) => setPayDueRefNumber(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Remarks / Voucher Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid from HDFC Store Operating Account"
                  value={payDueNotes}
                  onChange={(e) => setPayDueNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayDueOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{isSubmittingPayment ? 'Processing...' : 'Confirm & Update Ledger'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DELETE SUPPLIER CONFIRMATION                                     */}
      {/* ========================================================================= */}
      {supplierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900 border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">
                Delete Supplier / Vendor?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove <strong className="text-slate-800">{supplierToDelete.name}</strong> ({supplierToDelete.code}) from the supplier directory?
              </p>
              {(supplierToDelete.currentOutstanding || 0) > 0 && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Warning: Outstanding balance of {CURRENCY}{Number(supplierToDelete.currentOutstanding || 0).toLocaleString('en-IN')} exists.</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSupplierToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: OFFICIAL DOCUMENT MANIFEST (PO MANIFEST, INVOICE, GRN SLIP)      */}
      {/* ========================================================================= */}
      {manifestDoc.isOpen && manifestDoc.data && (
        <DocumentManifestModal
          isOpen={manifestDoc.isOpen}
          onClose={() => setManifestDoc({ isOpen: false, type: 'purchase_order', data: null })}
          documentType={manifestDoc.type}
          documentData={manifestDoc.data}
        />
      )}
    </div>
  );
};
