import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Package,
  Star,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Plus,
  Trash2,
  IndianRupee,
} from 'lucide-react';
import { Supplier } from '../../types/warehouse';
import { InventoryItem, StoreLocation } from '../../types';
import { warehouseStorage } from '../../services/warehouseStorage';
import { soundEffects } from '../../services/audio';

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit?: Supplier | null;
  inventory: InventoryItem[];
  currentStore?: StoreLocation;
  onSuccess: () => void;
}

const SUPPLIER_CATEGORIES = [
  { id: 'raw_materials', label: 'Raw Materials & Paan Betel Leaves' },
  { id: 'spices_mukhwas', label: 'Spices, Dry Fruits, Supari & Mukhwas' },
  { id: 'cafe_beverages', label: 'Cafe, Dairy, Coffee & Beverages' },
  { id: 'packaging', label: 'Luxury Packaging, Pouches & Silver Vark' },
  { id: 'essentials_fresheners', label: 'Mouth Fresheners & 24x7 Essentials' },
  { id: 'cleaning_supplies', label: 'Store Maintenance & Hygiene Supplies' },
  { id: 'other', label: 'General / Miscellaneous Vendor' },
];

const PAYMENT_TERMS_OPTIONS = [
  'Immediate / Cash',
  'Cash on Delivery (COD)',
  'Net 7 Days',
  'Net 15 Days',
  'Net 30 Days',
  '50% Advance & Balance on Delivery',
  'Weekly Settlement (Every Monday)',
  'Monthly Account Cycle',
];

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  supplierToEdit,
  inventory,
  currentStore,
  onSuccess,
}) => {
  const isEditing = Boolean(supplierToEdit);

  // Form States
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('raw_materials');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Ahmedabad');
  const [state, setState] = useState('Gujarat');
  const [paymentTerms, setPaymentTerms] = useState('Net 15 Days');
  const [creditLimit, setCreditLimit] = useState('200000');
  const [rating, setRating] = useState(5);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  // Bank Details
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Associated Products
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [customProductInput, setCustomProductInput] = useState('');
  const [customProducts, setCustomProducts] = useState<string[]>([]);

  // Validation Error
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize or Reset Form
  useEffect(() => {
    if (!isOpen) {
      setFormError('');
      setIsSubmitting(false);
      return;
    }

    if (supplierToEdit) {
      setName(supplierToEdit.name || '');
      setCode(supplierToEdit.code || '');
      setCategory(supplierToEdit.category || 'raw_materials');
      setContactPerson(supplierToEdit.contactPerson || '');
      setPhone(supplierToEdit.phone || '');
      setEmail(supplierToEdit.email || '');
      setGstin(supplierToEdit.gstin || '');
      setPanNumber(supplierToEdit.panNumber || '');
      setAddress(supplierToEdit.address || '');
      setCity(supplierToEdit.city || 'Ahmedabad');
      setState(supplierToEdit.state || 'Gujarat');
      setPaymentTerms(supplierToEdit.paymentTerms || 'Net 15 Days');
      setCreditLimit(String(supplierToEdit.creditLimit || 200000));
      setRating(supplierToEdit.rating || 5);
      setIsActive(supplierToEdit.isActive !== false);
      setNotes(supplierToEdit.notes || '');

      setBankAccountName(supplierToEdit.bankDetails?.accountName || '');
      setBankName(supplierToEdit.bankDetails?.bankName || '');
      setAccountNumber(supplierToEdit.bankDetails?.accountNumber || '');
      setIfscCode(supplierToEdit.bankDetails?.ifscCode || '');

      setSelectedItemIds(supplierToEdit.associatedItemIds || []);
      setCustomProducts(supplierToEdit.associatedProductNames || []);
    } else {
      // New Supplier defaults
      const autoCode = `SUP-${Math.floor(100 + Math.random() * 900)}`;
      setName('');
      setCode(autoCode);
      setCategory('raw_materials');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setGstin('');
      setPanNumber('');
      setAddress('');
      setCity('Ahmedabad');
      setState('Gujarat');
      setPaymentTerms('Net 15 Days');
      setCreditLimit('250000');
      setRating(5);
      setIsActive(true);
      setNotes('');

      setBankAccountName('');
      setBankName('');
      setAccountNumber('');
      setIfscCode('');

      setSelectedItemIds([]);
      setCustomProducts([]);
    }
    setFormError('');
  }, [isOpen, supplierToEdit]);

  if (!isOpen) return null;

  // Toggle item in associated products list
  const handleToggleProduct = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Add custom product tag
  const handleAddCustomProduct = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = customProductInput.trim();
    if (!clean) return;
    if (!customProducts.includes(clean)) {
      setCustomProducts((prev) => [...prev, clean]);
    }
    setCustomProductInput('');
  };

  const handleRemoveCustomProduct = (tag: string) => {
    setCustomProducts((prev) => prev.filter((t) => t !== tag));
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Supplier / Vendor trade name is required.');
      soundEffects.playWarningChime();
      return;
    }

    if (!phone.trim()) {
      setFormError('Primary contact phone number is required.');
      soundEffects.playWarningChime();
      return;
    }

    setIsSubmitting(true);

    const bankDetails =
      bankAccountName.trim() || accountNumber.trim()
        ? {
            accountName: bankAccountName.trim(),
            bankName: bankName.trim(),
            accountNumber: accountNumber.trim(),
            ifscCode: ifscCode.trim().toUpperCase(),
          }
        : undefined;

    // Resolve associated product names
    const associatedItemNames = inventory
      .filter((i) => selectedItemIds.includes(i.id))
      .map((i) => i.name);
    const combinedProductNames = Array.from(
      new Set([...associatedItemNames, ...customProducts])
    );

    try {
      if (isEditing && supplierToEdit) {
        warehouseStorage.updateSupplier(supplierToEdit.id, {
          name: name.trim(),
          code: code.trim().toUpperCase() || supplierToEdit.code,
          category,
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          gstin: gstin.trim().toUpperCase(),
          panNumber: panNumber.trim().toUpperCase(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          paymentTerms,
          creditLimit: parseFloat(creditLimit) || 0,
          rating,
          isActive,
          associatedItemIds: selectedItemIds,
          associatedProductNames: combinedProductNames,
          notes: notes.trim(),
          bankDetails,
        });
      } else {
        warehouseStorage.addSupplier({
          name: name.trim(),
          code: code.trim().toUpperCase() || `SUP-${Date.now().toString().slice(-4)}`,
          category,
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          gstin: gstin.trim().toUpperCase(),
          panNumber: panNumber.trim().toUpperCase(),
          address: address.trim(),
          city: city.trim(),
          state: state.trim(),
          paymentTerms,
          creditLimit: parseFloat(creditLimit) || 0,
          rating,
          isActive,
          associatedItemIds: selectedItemIds,
          associatedProductNames: combinedProductNames,
          notes: notes.trim(),
          bankDetails,
        });
      }

      soundEffects.playSuccessChime();
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err?.message || 'Failed to save supplier details.');
      soundEffects.playWarningChime();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-900">
        {/* Header */}
        <div className="bg-[#0F172A] text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{isEditing ? 'Edit Vendor / Supplier' : 'Register New Vendor / Supplier'}</span>
                {currentStore && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono">
                    {currentStore.shortName || currentStore.name}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage direct supplier contacts, payment terms, and associated product catalog.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {formError && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Basic Company & Classification */}
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span>1. Supplier Trade Details & Category</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supplier / Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gujarat Betel Traders, Shreeji Spices & Supari"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Supplier Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. SUP-GUJ-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:border-amber-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-amber-500"
                >
                  {SUPPLIER_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vendor Rating (1-5 Stars)
                </label>
                <div className="flex items-center gap-1 py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="cursor-pointer p-0.5"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          star <= rating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-slate-600 ml-2">{rating}.0 / 5.0</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Account Status
                </label>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer border flex items-center justify-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                  <span>{isActive ? 'Active Vendor' : 'Inactive / Suspended'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Contact Person & Location */}
          <div className="pt-4 border-t border-slate-100">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-indigo-600" />
              <span>2. Contact Details & Address</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Patel (Sales Rep / Owner)"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone / Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="+91 98250 XXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="orders@supplier.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Street Address / APMC Market Yard
                </label>
                <input
                  type="text"
                  placeholder="e.g. Plot 44, APMC Market Yard, Jamalpur"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Payment Terms & Tax Details */}
          <div className="pt-4 border-t border-slate-100">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>3. Payment Terms, Credit Limit & Tax Identification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Terms
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-emerald-500"
                >
                  {PAYMENT_TERMS_OPTIONS.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Credit Limit (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="200000"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  placeholder="24AABCG1234F1Z1"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  placeholder="AABCG1234F"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Associated Products Catalog */}
          <div className="pt-4 border-t border-slate-100">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-600" />
                <span>4. Associated Products & Items Supplied</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 font-bold">
                {selectedItemIds.length + customProducts.length} Items Selected
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Select standard inventory items supplied by this vendor or add specific raw material tags.
            </p>

            {/* Quick Catalog Multi-Select */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 max-h-44 overflow-y-auto space-y-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {inventory.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleProduct(item.id)}
                      className={`flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-950 border-amber-400 font-bold shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="min-w-0 pr-1">
                        <div className="truncate font-semibold">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.sku} • {item.category}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Product Tags Input */}
            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Add Custom Raw Material / Item Tags (Optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Calcutta Meetha Leaves, Pure Rose Water, Kashmiri Kesar..."
                  value={customProductInput}
                  onChange={(e) => setCustomProductInput(e.target.value)}
                  onKeyDown={handleAddCustomProduct}
                  className="flex-1 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomProduct}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tag</span>
                </button>
              </div>

              {customProducts.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {customProducts.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-semibold flex items-center gap-1 border border-amber-200"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomProduct(tag)}
                        className="text-amber-700 hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Bank Details & Settlement */}
          <div className="pt-4 border-t border-slate-100">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-slate-500" />
              <span>5. Bank Account & Settlement Details (Optional)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Name</label>
                <input
                  type="text"
                  placeholder="Gujarat Betel Traders"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="HDFC Bank / ICICI / SBI"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  placeholder="50200012345678"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  placeholder="HDFC0001234"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase text-slate-900 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Notes */}
          <div className="pt-4 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Internal Procurement Notes / Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Special delivery instructions, minimum order quantities, direct contact extensions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-amber-500"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-2 border border-amber-500/40"
          >
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>{isSubmitting ? 'Saving...' : isEditing ? 'Save Supplier Changes' : 'Register Supplier'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
