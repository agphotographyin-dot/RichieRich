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
} from 'lucide-react';
import { Supplier } from '../../types/warehouse';
import { InventoryItem, StoreLocation } from '../../types';
import { warehouseStorage } from '../../services/warehouseStorage';
import { soundEffects } from '../../services/audio';

interface StoreSuppliersViewProps {
  currentStore: StoreLocation;
  inventory: InventoryItem[];
  adminName?: string;
  onOpenCreatePOForSupplier: (supplier: Supplier) => void;
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
  onOpenAddSupplier,
  onOpenEditSupplier,
  refreshKey,
  triggerRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [termsFilter, setTermsFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Fetch all suppliers from storage
  const suppliers = useMemo(() => {
    return warehouseStorage.getSuppliers();
  }, [refreshKey]);

  // Overall Metrics
  const metrics = useMemo(() => {
    const totalCount = suppliers.length;
    const activeCount = suppliers.filter((s) => s.isActive).length;
    const totalPurchases = suppliers.reduce((sum, s) => sum + (s.totalPurchases || 0), 0);
    const totalPaid = suppliers.reduce((sum, s) => sum + (s.totalPaid || 0), 0);
    const totalOutstanding = suppliers.reduce((sum, s) => sum + (s.currentOutstanding || 0), 0);

    return {
      totalCount,
      activeCount,
      totalPurchases,
      totalPaid,
      totalOutstanding,
    };
  }, [suppliers]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((sup) => {
      // Search
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

      // Category filter
      if (categoryFilter !== 'all' && sup.category !== categoryFilter) {
        return false;
      }

      // Terms filter
      if (termsFilter !== 'all' && sup.paymentTerms !== termsFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'active' && !sup.isActive) return false;
      if (statusFilter === 'inactive' && sup.isActive) return false;

      return true;
    });
  }, [suppliers, searchQuery, categoryFilter, termsFilter, statusFilter]);

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
              {metrics.totalCount}{' '}
              <span className="text-xs text-emerald-600 font-semibold">
                ({metrics.activeCount} Active)
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
              Total Purchases Value
            </span>
            <div className="text-xl font-black font-mono text-slate-900 mt-1">
              ₹{metrics.totalPurchases.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Direct store & central POs
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Total Paid
            </span>
            <div className="text-xl font-black font-mono text-emerald-700 mt-1">
              ₹{metrics.totalPaid.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-emerald-600 font-bold mt-0.5 block">
              Settled invoices & advances
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Current Outstanding
            </span>
            <div className="text-xl font-black font-mono text-rose-700 mt-1">
              ₹{metrics.totalOutstanding.toLocaleString('en-IN')}
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Pending payment accounts
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. Action Toolbar & Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vendor name, code, contact person, phone, city, or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white focus:border-amber-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
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
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>

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

          {(searchQuery || categoryFilter !== 'all' || termsFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setTermsFilter('all');
                setStatusFilter('all');
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold cursor-pointer transition-colors"
            >
              Clear Filters
            </button>
          )}

          <span className="ml-auto text-slate-500 font-bold font-mono">
            Showing {filteredSuppliers.length} of {suppliers.length} Vendors
          </span>
        </div>
      </div>

      {/* 3. Empty State */}
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
        /* 4. Cards Grid View */
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

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Outstanding Due
                      </span>
                      <span
                        className={`font-mono font-black text-xs block mt-0.5 ${
                          (supplier.currentOutstanding || 0) > 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        ₹{(supplier.currentOutstanding || 0).toLocaleString('en-IN')}
                      </span>
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
        /* 5. Detailed Table View */
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
                      <span
                        className={
                          (supplier.currentOutstanding || 0) > 0 ? 'text-rose-600' : 'text-emerald-700'
                        }
                      >
                        ₹{(supplier.currentOutstanding || 0).toLocaleString('en-IN')}
                      </span>
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

      {/* 6. Delete Confirmation Modal */}
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
                  <span>Warning: Outstanding balance of ₹{supplierToDelete.currentOutstanding.toLocaleString('en-IN')} exists.</span>
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
    </div>
  );
};
