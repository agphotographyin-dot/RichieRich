import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Sparkles,
  Crown,
  Heart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Clock,
  Tag,
  ArrowRight,
  User,
  Star,
  ChevronRight,
  Flame,
  Coffee,
  X,
  Phone,
  Gift,
  Share2,
  MapPin,
  Store,
  Compass,
  Check,
  AlertCircle,
  Truck,
  Coffee as CoffeeIcon,
  Leaf,
  Layers,
  Sparkle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { InventoryItem, Category, Customer, Order, Promotion, StoreLocation } from '../../types';
import { CURRENCY, storage, INITIAL_STORES } from '../../services/storage';
import { soundEffects } from '../../services/audio';

interface CustomerAppProps {
  inventory: InventoryItem[];
  categories: Category[];
  customers: Customer[];
  orders: Order[];
  promotions: Promotion[];
  authenticatedCustomer?: Customer | null;
  onLogout?: () => void;
}

export const CustomerApp: React.FC<CustomerAppProps> = ({
  inventory,
  categories,
  customers,
  orders,
  promotions,
  authenticatedCustomer,
  onLogout,
}) => {
  const stores = storage.getStores();

  // Active customer store outlet selection (default to Gota 24x7 Royal Lounge)
  const [selectedStoreId, setSelectedStoreId] = useState<string>('gota');
  const activeStore = stores.find((s) => s.id === selectedStoreId) || stores[0];

  // Active customer profile synced with authenticated customer
  const [activeCustomer, setActiveCustomer] = useState<Customer>(
    authenticatedCustomer ||
      customers[0] || {
        id: 'cust-guest',
        name: 'Rajesh Sharma',
        phone: '9820199882',
        loyaltyPoints: 420,
        tier: 'Platinum Royal',
        totalSpent: 4200,
        totalOrders: 18,
        joinDate: '2026-01-10',
      }
  );

  useEffect(() => {
    if (authenticatedCustomer) {
      setActiveCustomer(authenticatedCustomer);
      setCustomerPhoneInput(authenticatedCustomer.phone);
      setCustomerNameInput(authenticatedCustomer.name);
    }
  }, [authenticatedCustomer]);

  const [activeTab, setActiveTab] = useState<'menu' | 'track_orders' | 'loyalty_offers'>('menu');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingStore, setIsChangingStore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Cart & Item Customization
  const [cart, setCart] = useState<{ item: InventoryItem; quantity: number; customization: string }[]>([]);
  const [customizingItem, setCustomizingItem] = useState<InventoryItem | null>(null);
  const [gulkandLevel, setGulkandLevel] = useState('Regular Sweet');
  const [supariPref, setSupariPref] = useState('100% Supari-Free (Mitha Leaf)');
  const [extraTopping, setExtraTopping] = useState('Silver Chandi Vark');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Checkout & Order tracking
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [tableNumber, setTableNumber] = useState('Table 4 (24x7 Lounge)');
  const [customerPhoneInput, setCustomerPhoneInput] = useState(activeCustomer.phone);
  const [customerNameInput, setCustomerNameInput] = useState(activeCustomer.name);
  const [activePlacedOrder, setActivePlacedOrder] = useState<Order | null>(null);

  // Helper to get branch-specific stock
  const getBranchStock = (item: InventoryItem): number => {
    if (item.storeAllocations && item.storeAllocations[selectedStoreId] !== undefined) {
      return item.storeAllocations[selectedStoreId];
    }
    return item.stockQuantity;
  };

  // Filter items
  const onlineItems = inventory.filter((item) => item.isAvailableForOnline !== false);
  const filteredItems = onlineItems.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleOpenCustomization = (item: InventoryItem) => {
    const stock = getBranchStock(item);
    if (stock <= 0) {
      soundEffects.playWarningChime();
      alert(`This item is currently sold out at our ${activeStore.shortName} outlet.`);
      return;
    }
    setCustomizingItem(item);
  };

  const handleConfirmAddToCart = () => {
    if (!customizingItem) return;

    soundEffects.playScanBeep();
    const customString = `${gulkandLevel} • ${supariPref} • ${extraTopping}${
      specialInstructions ? ` • Note: ${specialInstructions}` : ''
    }`;

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (ci) => ci.item.id === customizingItem.id && ci.customization === customString
      );
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx].quantity += 1;
        return copy;
      } else {
        return [...prev, { item: customizingItem, quantity: 1, customization: customString }];
      }
    });

    setCustomizingItem(null);
    setSpecialInstructions('');
  };

  const updateCartQty = (idx: number, delta: number) => {
    setCart((prev) => {
      const copy = [...prev];
      const newQty = copy[idx].quantity + delta;
      if (newQty <= 0) {
        return copy.filter((_, i) => i !== idx);
      }
      copy[idx].quantity = newQty;
      return copy;
    });
  };

  // Calculations
  const subtotal = cart.reduce((sum, ci) => sum + ci.item.sellingPrice * ci.quantity, 0);
  const totalCost = cart.reduce((sum, ci) => sum + ci.item.costPrice * ci.quantity, 0);

  let discountAmount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountType === 'percentage') {
      discountAmount = (subtotal * appliedPromo.discountValue) / 100;
    } else {
      discountAmount = appliedPromo.discountValue;
    }
  }

  let pointsDiscount = 0;
  let pointsUsed = 0;
  if (redeemPoints && activeCustomer.loyaltyPoints > 0) {
    pointsUsed = Math.min(activeCustomer.loyaltyPoints, Math.floor((subtotal - discountAmount) * 5));
    pointsDiscount = Math.round(pointsUsed * 0.1 * 100) / 100;
  }

  const effectiveDiscount = discountAmount + pointsDiscount;
  const taxable = Math.max(0, subtotal - effectiveDiscount);
  const tax = Math.round(taxable * 0.05 * 100) / 100;
  const grandTotal = Math.round((taxable + tax) * 100) / 100;
  const profit = Math.round((grandTotal - totalCost) * 100) / 100;

  const handleApplyPromo = (codeToApply?: string) => {
    const code = (codeToApply || promoCodeInput).trim().toUpperCase();
    setPromoError(null);
    const promo = promotions.find((p) => p.code === code && p.isActive);

    if (!promo) {
      setPromoError('Invalid or expired coupon code.');
      return;
    }

    if (subtotal < promo.minOrderAmount) {
      setPromoError(`Minimum order amount of ${CURRENCY}${promo.minOrderAmount} required for this coupon.`);
      return;
    }

    setAppliedPromo(promo);
    soundEffects.playScanBeep();
  };

  // Process Online Order with Store Tagging (BUG FIX RESOLVED: storeId & storeName passed)
  const handlePlaceOrder = () => {
    if (cart.length === 0) return;

    // Check customer phone
    let currentCustomer = activeCustomer;
    if (customerPhoneInput && customerPhoneInput !== activeCustomer.phone) {
      currentCustomer = storage.upsertCustomer({
        name: customerNameInput || 'Valued Patron',
        phone: customerPhoneInput,
      });
      setActiveCustomer(currentCustomer);
    }

    const newOrder = storage.processOrder({
      source: 'customer_online',
      storeId: activeStore.id,
      storeName: activeStore.shortName,
      counterNumber: 1,
      cashierName: 'Online Mobile Order',
      customerId: currentCustomer.id,
      customerName: currentCustomer.name,
      customerPhone: currentCustomer.phone,
      items: cart.map((ci) => ({
        itemId: ci.item.id,
        name: ci.item.name,
        sku: ci.item.sku,
        price: ci.item.sellingPrice,
        costPrice: ci.item.costPrice,
        quantity: ci.quantity,
        customization: ci.customization,
        subtotal: ci.item.sellingPrice * ci.quantity,
        profit: (ci.item.sellingPrice - ci.item.costPrice) * ci.quantity,
      })),
      subtotal,
      discountAmount: effectiveDiscount,
      appliedPromoCode: appliedPromo?.code,
      loyaltyPointsUsed: pointsUsed,
      taxAmount: tax,
      grandTotal,
      totalCost,
      totalProfit: profit,
      paymentMethod: 'upi_qr',
      paymentStatus: 'paid',
      status: 'preparing',
      notes: `${orderType === 'dine_in' ? `Dine-in (${tableNumber})` : 'Express Takeaway'} • Store: ${activeStore.shortName}`,
    });

    try {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.7 } });
    } catch {}

    setActivePlacedOrder(newOrder);
    setCart([]);
    setAppliedPromo(null);
    setCartDrawerOpen(false);
    setActiveTab('track_orders');
  };

  // Find customer's active orders
  const customerOrders = orders.filter(
    (o) => o.customerId === activeCustomer.id || (o.customerPhone && o.customerPhone === activeCustomer.phone)
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 px-1 sm:px-0">
      {/* Outlet Location & 24x7 Badge Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ordering From Outlet:
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 24x7 OPEN
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
              <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
              {activeStore.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeStore.address} • {activeStore.countersCount} Sales Counters
            </p>
          </div>
        </div>

        {/* Change Store Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsChangingStore(!isChangingStore)}
            className="w-full md:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Compass className="w-3.5 h-3.5 text-amber-600" />
            Switch Store Outlet
          </button>
        </div>
      </div>

      {/* Store Outlet Selector Grid */}
      {isChangingStore && (
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-md space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Select Richie Rich Pan House Branch</h4>
              <p className="text-xs text-slate-500">Pick your nearest store for freshest preparation & fast pickup.</p>
            </div>
            <button
              onClick={() => setIsChangingStore(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stores.map((s) => {
              const isSelected = s.id === selectedStoreId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedStoreId(s.id);
                    setIsChangingStore(false);
                    soundEffects.playScanBeep();
                  }}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-50/50 border-amber-400 shadow-sm ring-1 ring-amber-400'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-xs text-slate-900">{s.shortName}</span>
                      {isSelected && (
                        <span className="p-0.5 bg-amber-500 text-slate-950 rounded-full">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{s.landmark}</p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span>{s.countersCount} Counters</span>
                    <span className="text-emerald-700 font-bold">24x7 Active</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Hero Banner & Loyalty Passport */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                {activeCustomer.tier} Patron
              </span>
              <span className="text-xs text-amber-700 font-bold">Pan | Coffee | Essentials | 24x7</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Namaste, {activeCustomer.name}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Fresh artisanal paans, fresh brewed coffees, daily essentials, and round-the-clock 24x7 delicacies.
            </p>

            <button
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="mt-3 text-xs text-slate-700 hover:text-slate-900 flex items-center gap-1 font-bold cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-slate-500" /> Switch / Edit Customer Profile ({activeCustomer.phone})
            </button>
          </div>

          {/* Loyalty Balance Card Widget */}
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl shadow-xs shrink-0 min-w-[240px] text-center space-y-2">
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
              Royalty Points Balance
            </span>
            <div className="text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-1">
              <Sparkles className="w-5 h-5 text-amber-500" />
              {activeCustomer.loyaltyPoints} <span className="text-xs text-slate-500 font-normal">pts</span>
            </div>
            <p className="text-[11px] text-emerald-800 font-medium">
              Worth <strong>{CURRENCY}{(activeCustomer.loyaltyPoints * 0.1).toFixed(2)} discount</strong> on your order
            </p>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
              <div
                className="bg-[#1E293B] h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (activeCustomer.loyaltyPoints / 1000) * 100)}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 block">
              {activeCustomer.tier === 'Platinum Royal' ? 'VIP Status Maxed' : `${1000 - activeCustomer.loyaltyPoints} pts to next VIP tier`}
            </span>
          </div>
        </div>
      </div>

      {/* Customer Switch / Edit Drawer */}
      {isEditingProfile && (
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm animate-in fade-in space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">Select Existing Patron or Register New Phone</h4>
            <button onClick={() => setIsEditingProfile(false)} className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActiveCustomer(c);
                  setCustomerPhoneInput(c.phone);
                  setCustomerNameInput(c.name);
                  setIsEditingProfile(false);
                }}
                className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                  activeCustomer.id === c.id
                    ? 'bg-slate-100 border-slate-400 text-slate-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold text-slate-900">{c.name}</div>
                <div className="text-[10px] text-slate-500 font-mono">{c.phone} • {c.loyaltyPoints} pts</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Tabs Navigation: 24x7 Menu | Live Order Tracking | Loyalty Offers */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-2xs gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'menu'
              ? 'bg-[#1E293B] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Leaf className="w-3.5 h-3.5 text-emerald-400" /> 24x7 Food & Beverage Menu
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('track_orders')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'track_orders'
              ? 'bg-[#1E293B] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-sky-400" /> Track My Orders ({customerOrders.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('loyalty_offers')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'loyalty_offers'
              ? 'bg-[#1E293B] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Gift className="w-3.5 h-3.5 text-amber-400" /> Coupons & Offers ({promotions.filter((p) => p.isActive).length})
        </button>
      </div>

      {/* TAB 1: MENU & ORDERING */}
      {activeTab === 'menu' && (
        <div className="space-y-6">
          {/* Featured Deals Carousel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-amber-600" /> Active Deals & Special Offers
              </h3>
              <span className="text-xs text-slate-500">Tap to apply coupon to cart</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {promotions.filter((p) => p.isActive).map((promo) => (
                <div
                  key={promo.id}
                  onClick={() => handleApplyPromo(promo.code)}
                  className="bg-white border border-slate-200 hover:border-amber-300 p-4 rounded-xl transition-all cursor-pointer group flex flex-col justify-between shadow-xs hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {promo.code}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {promo.discountType === 'percentage' ? `${promo.discountValue}% OFF` : `₹${promo.discountValue} OFF`}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 group-hover:text-amber-700">{promo.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{promo.description}</p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Min: {CURRENCY}{promo.minOrderAmount}</span>
                    <span className="text-slate-800 font-bold group-hover:underline">Apply Coupon →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Horizontal Pills & Search */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-[#1E293B] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                All Creations ({onlineItems.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === c.id
                      ? 'bg-[#1E293B] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Paans, Coffee, Essentials..."
              className="w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400"
            />
          </div>

          {/* Products Menu Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const branchStock = getBranchStock(item);
              const isOut = branchStock <= 0;

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-4 flex flex-col justify-between transition-all group shadow-xs hover:shadow-md"
                >
                  <div>
                    <div className="relative aspect-16/10 rounded-xl overflow-hidden mb-3 bg-slate-100 border border-slate-200">
                      <img
                        src={item.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80'}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {item.tags && item.tags.length > 0 && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/95 text-slate-800 text-[10px] font-bold tracking-wide uppercase shadow-xs border border-slate-200">
                          {item.tags[0]}
                        </span>
                      )}

                      {/* Outlet specific stock indicator */}
                      <span className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-xs ${
                        isOut ? 'bg-red-600 text-white' : 'bg-slate-900/80 text-white backdrop-blur-xs'
                      }`}>
                        {isOut ? `Sold Out at ${activeStore.shortName}` : `${branchStock} left in stock`}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-slate-900 group-hover:text-amber-700 leading-tight">
                        {item.name}
                      </h4>
                      <span className="font-black text-slate-900 text-sm shrink-0">
                        {CURRENCY}{item.sellingPrice.toFixed(2)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    {item.ingredients && item.ingredients.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                        {item.ingredients.slice(0, 3).map((ing, i) => (
                          <span key={i} className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                            {ing}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {isOut ? 'Out of Stock' : 'Prepared Fresh 24x7'}
                    </span>
                    <button
                      type="button"
                      disabled={isOut}
                      onClick={() => handleOpenCustomization(item)}
                      className="px-3.5 py-2 bg-[#1E293B] hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" /> Customize & Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE ORDER TRACKING & HISTORY */}
      {activeTab === 'track_orders' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-sky-500" />
              Live Order Status & History for {activeCustomer.name} ({activeCustomer.phone})
            </h3>

            {customerOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">No active or previous orders found</p>
                <p className="text-xs text-slate-500">Pick delicious paan, coffee or mukhwas from our 24x7 menu to start.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('menu')}
                  className="mt-3 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Explore Menu
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {customerOrders.map((ord) => {
                  const isReady = ord.status === 'ready' || ord.status === 'completed';
                  const isPreparing = ord.status === 'preparing' || isReady;

                  return (
                    <div key={ord.id} className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-slate-50/50">
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900">{ord.orderNumber}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                              {ord.storeName || 'Gota'}
                            </span>
                            <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                              ord.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'ready'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {ord.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Placed: {new Date(ord.createdAt).toLocaleTimeString()} • {ord.notes || 'Express Takeaway'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900">{CURRENCY}{ord.grandTotal.toFixed(2)}</span>
                          <p className="text-[10px] text-emerald-700 font-bold uppercase">{ord.paymentMethod} • {ord.paymentStatus}</p>
                        </div>
                      </div>

                      {/* 3 Step Live Progression */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className={`p-2.5 rounded-xl border ${
                          ord.status ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}>
                          <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                          <span>1. Placed</span>
                        </div>

                        <div className={`p-2.5 rounded-xl border ${
                          isPreparing ? 'bg-amber-50 border-amber-200 text-amber-800 font-bold' : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}>
                          <Flame className={`w-4 h-4 mx-auto mb-1 ${isPreparing ? 'text-amber-600' : 'text-slate-400'}`} />
                          <span>2. Handcrafting</span>
                        </div>

                        <div className={`p-2.5 rounded-xl border ${
                          isReady ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold' : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}>
                          <Sparkles className={`w-4 h-4 mx-auto mb-1 ${isReady ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span>3. Ready</span>
                        </div>
                      </div>

                      {/* Item Breakdown */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs text-slate-700">
                        {ord.items.map((it, i) => (
                          <div key={i} className="flex justify-between items-center">
                            <span>{it.quantity}x {it.name} {it.customization && <span className="text-slate-500 italic">[{it.customization}]</span>}</span>
                            <span className="font-bold text-slate-900">{CURRENCY}{it.subtotal.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: LOYALTY PASSPORT & OFFERS */}
      {activeTab === 'loyalty_offers' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Crown className="w-5 h-5 text-amber-500" />
                  VIP Royal Rewards Program
                </h3>
                <p className="text-xs text-slate-500">Earn 1 Royalty Point for every ₹10 spent at any Richie Rich chain outlet.</p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-slate-900">{activeCustomer.loyaltyPoints} Points</span>
                <p className="text-xs text-emerald-700 font-bold">~{CURRENCY}{(activeCustomer.loyaltyPoints * 0.1).toFixed(2)} Wallet Discount</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase">Silver Patron</span>
                <p className="text-xs text-slate-700 font-medium">Standard membership with 1 pt / ₹10 and birthday perks.</p>
              </div>
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-1">
                <span className="text-xs font-bold text-amber-800 uppercase">Gold Patron (₹1200+ spent)</span>
                <p className="text-xs text-amber-900 font-medium">10% discount on coffee refills + double weekend points.</p>
              </div>
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-1">
                <span className="text-xs font-bold text-purple-800 uppercase">Platinum Royal (₹3000+ spent)</span>
                <p className="text-xs text-purple-900 font-medium">VIP 24x7 lounge table reservations & 25% discount perks.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Mobile Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
          <button
            onClick={() => setCartDrawerOpen(true)}
            className="w-full p-4 bg-[#1E293B] hover:bg-slate-900 text-white font-bold rounded-2xl shadow-2xl flex items-center justify-between border border-slate-700 cursor-pointer animate-in slide-in-from-bottom duration-200 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </div>
              <span className="text-xs font-bold">Review Order ({activeStore.shortName})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black">{CURRENCY}{grandTotal.toFixed(2)}</span>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </button>
        </div>
      )}

      {/* Item Customization Modal */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{customizingItem.name}</h3>
                <p className="text-xs text-slate-600 font-bold">{CURRENCY}{customizingItem.sellingPrice.toFixed(2)}</p>
              </div>
              <button onClick={() => setCustomizingItem(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customization Options */}
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 font-bold block mb-1.5">Gulkand & Sweetness Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Light Sweet', 'Regular Sweet', 'Extra Royal Gulkand'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setGulkandLevel(lvl)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer text-xs ${
                        gulkandLevel === lvl
                          ? 'bg-[#1E293B] text-white font-bold border-slate-800 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1.5">Supari / Betel Nut Formulation</label>
                <div className="grid grid-cols-2 gap-2">
                  {['100% Supari-Free (Mitha Leaf)', 'Saffron Flavoured Supari Flakes'].map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => setSupariPref(pref)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer text-xs ${
                        supariPref === pref
                          ? 'bg-[#1E293B] text-white font-bold border-slate-800 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1.5">Royal Topping / Presentation</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Silver Chandi Vark', 'Roasted Coconut Dust', '24K Gold Sparkles'].map((top) => (
                    <button
                      key={top}
                      type="button"
                      onClick={() => setExtraTopping(top)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer text-xs ${
                        extraTopping === top
                          ? 'bg-[#1E293B] text-white font-bold border-slate-800 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {top}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">Special Pan Master Instructions</label>
                <input
                  type="text"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Extra Cardamom, Less Chuna, Pack in ice pouch"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmAddToCart}
              className="w-full py-3 bg-[#1E293B] hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 text-amber-400" /> Add to Order • {CURRENCY}{customizingItem.sellingPrice.toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {/* Cart & Checkout Drawer */}
      {cartDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in">
          <div className="w-full max-w-md bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl p-6 justify-between">
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-slate-700" />
                  <h3 className="font-bold text-slate-800 text-base">Your Royal Pan House Order</h3>
                </div>
                <button onClick={() => setCartDrawerOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  ✕
                </button>
              </div>

              {/* Outlet selection confirmation in cart */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs text-amber-900">
                <div>
                  <span className="font-bold block">Outlet: {activeStore.name}</span>
                  <span className="text-[10px] text-amber-700">{activeStore.landmark}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200/80 rounded-md">24x7</span>
              </div>

              {/* Order Type Toggle */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  onClick={() => setOrderType('dine_in')}
                  className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    orderType === 'dine_in' ? 'bg-[#1E293B] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  24x7 Lounge Dine-In
                </button>
                <button
                  onClick={() => setOrderType('takeaway')}
                  className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    orderType === 'takeaway' ? 'bg-[#1E293B] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Express Takeaway
                </button>
              </div>

              {/* Cart Items */}
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {cart.map((ci, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">{ci.item.name}</span>
                      <span className="font-bold text-slate-900 text-xs">
                        {CURRENCY}{(ci.item.sellingPrice * ci.quantity).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{ci.customization}</p>

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                        <button
                          onClick={() => updateCartQty(idx, -1)}
                          className="p-1 text-slate-500 hover:text-slate-900"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono text-xs font-bold text-slate-800 px-1.5">{ci.quantity}</span>
                        <button
                          onClick={() => updateCartQty(idx, 1)}
                          className="p-1 text-slate-500 hover:text-slate-900"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-[11px] text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Loyalty Redemption Box */}
              {activeCustomer.loyaltyPoints > 0 && (
                <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-amber-900">Use {activeCustomer.loyaltyPoints} Royalty Pts</span>
                    <p className="text-[10px] text-amber-700">Save up to {CURRENCY}{(activeCustomer.loyaltyPoints * 0.1).toFixed(2)}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={redeemPoints}
                    onChange={(e) => setRedeemPoints(e.target.checked)}
                    className="w-4 h-4 accent-slate-800 rounded-sm cursor-pointer"
                  />
                </div>
              )}

              {/* Promo Coupon Box */}
              <div className="space-y-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Coupon Code"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 uppercase font-mono placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400"
                  />
                  <button
                    onClick={() => handleApplyPromo()}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer transition-colors"
                  >
                    Apply
                  </button>
                </div>
                {promoError && <p className="text-[10px] text-red-600">{promoError}</p>}
                {appliedPromo && (
                  <p className="text-[10px] text-emerald-700 font-semibold">
                    ✓ Applied {appliedPromo.code} (-{CURRENCY}{discountAmount.toFixed(2)})
                  </p>
                )}
              </div>
            </div>

            {/* Bill Summary & Pay Button */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="space-y-1 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="text-slate-800 font-semibold">{CURRENCY}{subtotal.toFixed(2)}</span>
                </div>
                {effectiveDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount / Loyalty Perks:</span>
                    <span>-{CURRENCY}{effectiveDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxes (5% GST):</span>
                  <span className="text-slate-700">{CURRENCY}{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-slate-900">{CURRENCY}{grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                className="w-full py-3.5 bg-[#1E293B] hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Confirm Order at {activeStore.shortName} ({CURRENCY}{grandTotal.toFixed(2)})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
