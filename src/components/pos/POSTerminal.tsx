import React, { useState, useEffect } from 'react';
import {
  Search,
  Scan,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  QrCode,
  Banknote,
  Crown,
  Sparkles,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  AlertTriangle,
  Receipt,
  X,
  PlusCircle,
  Tag,
  Store,
  LogOut,
  ShoppingBag,
  Layers,
  Edit3,
  SlidersHorizontal,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { InventoryItem, Category, Customer, Order, OrderItem, PaymentMethod, POSSession } from '../../types';
import { CURRENCY, storage } from '../../services/storage';
import { soundEffects } from '../../services/audio';
import { isToday } from '../../utils/dateUtils';
import { POSReceiptModal } from './POSReceiptModal';
import { POSStoreCounterLogin } from './POSStoreCounterLogin';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';

interface POSTerminalProps {
  inventory: InventoryItem[];
  categories: Category[];
  customers: Customer[];
  onOpenScanner?: () => void;
  onBarcodeScanned?: (barcode: string) => void;
}

interface CartItem extends OrderItem {
  stockAvailable: number;
  priceType?: 'fixed' | 'variable';
}

export const POSTerminal: React.FC<POSTerminalProps> = ({
  inventory,
  categories,
  customers,
  onOpenScanner,
}) => {
  // Session state
  const [posSession, setPosSession] = useState<POSSession | null>(storage.getActivePOSSession());

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Variable price modal state
  const [variablePriceModal, setVariablePriceModal] = useState<{
    item: InventoryItem;
    cartIndex?: number;
    isEditMode?: boolean;
    initialPrice: number;
    note?: string;
  } | null>(null);
  const [customPriceInput, setCustomPriceInput] = useState<string>('');
  const [customNoteInput, setCustomNoteInput] = useState<string>('');

  // Customer Loyalty state
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Payment Modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [tenderedCash, setTenderedCash] = useState<number>(0);
  const [recentOrder, setRecentOrder] = useState<Order | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  const [showShiftSummary, setShowShiftSummary] = useState(false);
  const [localScannerOpen, setLocalScannerOpen] = useState(false);
  const [, setOrderSyncTrigger] = useState(0);

  // Subscribe to storage changes for live shift & order sync
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setOrderSyncTrigger((prev) => prev + 1);
    });
    return () => unsubscribe();
  }, []);

  const [lastScannedFeedback, setLastScannedFeedback] = useState<{
    name: string;
    barcode: string;
    price: number;
    timestamp: number;
  } | null>(null);

  // Commit item to cart with determined price
  const commitAddToCart = (item: InventoryItem, priceToUse: number, customPref?: string) => {
    const availableStock = getItemStoreStock(item);

    if (availableStock <= 0) {
      soundEffects.playWarningChime();
      alert(`"${item.name}" is out of stock at ${posSession.storeName}!`);
      return;
    }

    soundEffects.playScanBeep();

    setLastScannedFeedback({
      name: item.name,
      barcode: item.barcode,
      price: priceToUse,
      timestamp: Date.now(),
    });

    setCart((prev) => {
      const existing = prev.find(
        (ci) => ci.itemId === item.id && ci.price === priceToUse && ci.customization === (customPref || undefined)
      );
      if (existing) {
        if (existing.quantity >= availableStock) {
          alert(`Cannot add more than available branch stock (${availableStock} units).`);
          return prev;
        }
        return prev.map((ci) =>
          ci === existing
            ? {
                ...ci,
                quantity: ci.quantity + 1,
                subtotal: (ci.quantity + 1) * ci.price,
                profit: (ci.quantity + 1) * (ci.price - ci.costPrice),
              }
            : ci
        );
      } else {
        return [
          ...prev,
          {
            itemId: item.id,
            name: item.name,
            sku: item.sku,
            price: priceToUse,
            costPrice: item.costPrice,
            quantity: 1,
            customization: customPref,
            subtotal: priceToUse,
            profit: priceToUse - item.costPrice,
            stockAvailable: availableStock,
            isTaxApplicable: item.isTaxApplicable !== false,
            priceType: item.priceType || 'fixed',
          },
        ];
      }
    });
  };

  // Cart operations
  const addToCart = (item: InventoryItem, customPref?: string) => {
    // If product has variable price, ask cashier to specify the unit price
    if (item.priceType === 'variable' || (item.sellingPrice <= 0 && !item.priceType)) {
      setVariablePriceModal({
        item,
        initialPrice: item.sellingPrice || 0,
        isEditMode: false,
        note: customPref || '',
      });
      setCustomPriceInput(item.sellingPrice > 0 ? String(item.sellingPrice) : '');
      setCustomNoteInput(customPref || '');
      return;
    }

    commitAddToCart(item, item.sellingPrice, customPref);
  };

  // Open price override modal for existing cart item
  const openCartPriceOverride = (cartIndex: number) => {
    const target = cart[cartIndex];
    if (!target) return;
    const invItem = inventory.find((i) => i.id === target.itemId) || {
      id: target.itemId,
      name: target.name,
      sku: target.sku,
      sellingPrice: target.price,
      costPrice: target.costPrice,
      barcode: '',
      category: 'Paan',
      unit: 'pieces',
      stockQuantity: target.stockAvailable,
      storeAllocations: {},
      isTaxApplicable: target.isTaxApplicable,
      lowStockThreshold: 10,
      createdAt: '',
      updatedAt: '',
    };

    setVariablePriceModal({
      item: invItem as InventoryItem,
      cartIndex,
      isEditMode: true,
      initialPrice: target.price,
      note: target.customization || '',
    });
    setCustomPriceInput(String(target.price));
    setCustomNoteInput(target.customization || '');
  };

  const handleSaveVariablePrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!variablePriceModal) return;

    const parsedPrice = parseFloat(customPriceInput);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      alert('Please enter a valid price amount (>= 0)');
      return;
    }

    if (variablePriceModal.isEditMode && variablePriceModal.cartIndex !== undefined) {
      // Update existing item in cart
      setCart((prev) =>
        prev.map((ci, idx) => {
          if (idx === variablePriceModal.cartIndex) {
            return {
              ...ci,
              price: parsedPrice,
              subtotal: ci.quantity * parsedPrice,
              profit: ci.quantity * (parsedPrice - ci.costPrice),
              customization: customNoteInput.trim() || undefined,
            };
          }
          return ci;
        })
      );
    } else {
      // Add new item with custom price
      commitAddToCart(variablePriceModal.item, parsedPrice, customNoteInput.trim() || undefined);
    }

    setVariablePriceModal(null);
  };

  // Direct Barcode Scan Handler -> Auto Adds to Cart
  const handleBarcodeScanned = (barcode: string) => {
    const found = storage.findItemByBarcode(barcode) || inventory.find(
      (i) => i.barcode.toLowerCase() === barcode.trim().toLowerCase() || i.sku.toLowerCase() === barcode.trim().toLowerCase()
    );

    if (found) {
      addToCart(found);
      setSearchTerm('');
    } else {
      soundEffects.playWarningChime();
      alert(`No product found in catalog matching barcode or SKU: "${barcode}".`);
    }
  };

  // Listen for global scan event (e.g. from top nav / camera modal)
  useEffect(() => {
    const handleGlobalScanEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ barcode: string; item: InventoryItem }>;
      if (customEvent.detail && customEvent.detail.item) {
        addToCart(customEvent.detail.item);
      } else if (customEvent.detail && customEvent.detail.barcode) {
        handleBarcodeScanned(customEvent.detail.barcode);
      }
    };

    window.addEventListener('pos_barcode_scanned', handleGlobalScanEvent);
    return () => {
      window.removeEventListener('pos_barcode_scanned', handleGlobalScanEvent);
    };
  }, [posSession, inventory]);

  // Hardware USB/Bluetooth Barcode Scanner Wedge Listener
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in regular text inputs or modals (unless it's an ultra-fast scanner burst)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Scanners typically enter keys rapidly (< 40ms between strokes)
      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          const scannedCode = buffer.trim();
          buffer = '';
          const match = storage.findItemByBarcode(scannedCode) || inventory.find(
            (i) => i.barcode.toLowerCase() === scannedCode.toLowerCase() || i.sku.toLowerCase() === scannedCode.toLowerCase()
          );

          if (match) {
            if (isInput) {
              (target as HTMLInputElement).value = '';
            }
            e.preventDefault();
            addToCart(match);
            return;
          }
        }
        buffer = '';
      } else if (e.key.length === 1) {
        if (timeDiff > 120) {
          buffer = ''; // reset buffer if human typing slowly
        }
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [posSession, inventory]);

  // Auto-dismiss scanned toast after 3 seconds
  useEffect(() => {
    if (!lastScannedFeedback) return;
    const timer = setTimeout(() => {
      setLastScannedFeedback(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [lastScannedFeedback]);

  // If no active session, show Store & Counter PIN selection screen
  if (!posSession) {
    return (
      <POSStoreCounterLogin
        onLoginSuccess={(session) => {
          setPosSession(session);
        }}
      />
    );
  }

  // Get store specific available stock for this counter's branch
  const getItemStoreStock = (item: InventoryItem): number => {
    if (item.storeAllocations && posSession.storeId in item.storeAllocations) {
      return item.storeAllocations[posSession.storeId];
    }
    return item.stockQuantity;
  };

  // Filter products (active only)
  const filteredProducts = inventory.filter((item) => {
    if (item.status === 'inactive') return false;
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barcode.includes(searchTerm) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const target = prev[index];
      if (!target) return prev;
      const newQty = target.quantity + delta;

      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      if (newQty > target.stockAvailable) {
        alert(`Cannot exceed available branch stock of ${target.stockAvailable} units.`);
        return prev;
      }

      return prev.map((ci, i) =>
        i === index
          ? {
              ...ci,
              quantity: newQty,
              subtotal: newQty * ci.price,
              profit: newQty * (ci.price - ci.costPrice),
            }
          : ci
      );
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setCustomerPhone('');
    setRedeemPoints(false);
    setAppliedDiscount(null);
    setPromoCodeInput('');
  };

  const handleLogout = () => {
    if (cart.length > 0 && !confirm('Active cart will be cleared on logout. Continue?')) {
      return;
    }
    storage.clearPOSSession();
    setPosSession(null);
    setCart([]);
  };

  // Customer Phone Lookup
  const handlePhoneLookup = (phone: string) => {
    setCustomerPhone(phone);
    if (phone.length >= 4) {
      const found = storage.findCustomerByPhone(phone);
      if (found) {
        setSelectedCustomer(found);
      } else {
        setSelectedCustomer(null);
      }
    } else {
      setSelectedCustomer(null);
    }
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError(null);
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;

    const promos = storage.getPromotions();
    const promo = promos.find((p) => p.code === code && p.isActive);

    if (!promo) {
      setPromoError('Invalid or expired promo code.');
      return;
    }

    const currentSubtotal = cart.reduce((s, i) => s + i.subtotal, 0);
    if (currentSubtotal < promo.minOrderAmount) {
      setPromoError(`Min order amount of ${CURRENCY}${promo.minOrderAmount} required.`);
      return;
    }

    let discount = 0;
    if (promo.discountType === 'percentage') {
      discount = (currentSubtotal * promo.discountValue) / 100;
    } else {
      discount = promo.discountValue;
    }

    setAppliedDiscount({ code: promo.code, amount: discount });
    soundEffects.playScanBeep();
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const totalCost = cart.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);

  let discountAmount = appliedDiscount ? appliedDiscount.amount : 0;
  let loyaltyPointsDiscount = 0;
  let pointsToRedeem = 0;

  if (redeemPoints && selectedCustomer && selectedCustomer.loyaltyPoints > 0) {
    // 100 points = ₹10 off (₹0.1 per point)
    pointsToRedeem = Math.min(selectedCustomer.loyaltyPoints, Math.floor((subtotal - discountAmount) * 5));
    loyaltyPointsDiscount = Math.round(pointsToRedeem * 0.1 * 100) / 100;
  }

  const effectiveDiscount = discountAmount + loyaltyPointsDiscount;
  
  // Taxable subtotal (only items where isTaxApplicable is not false)
  const taxableSubtotal = cart
    .filter((item) => item.isTaxApplicable !== false)
    .reduce((sum, item) => sum + item.subtotal, 0);

  const discountRatio = subtotal > 0 ? effectiveDiscount / subtotal : 0;
  const taxableDiscount = taxableSubtotal * discountRatio;
  const netTaxableAmount = Math.max(0, taxableSubtotal - taxableDiscount);

  // 5% GST strictly on taxable items; 0% if all items are tax-exempt
  const taxAmount = Math.round(netTaxableAmount * 0.05 * 100) / 100;
  const grandTotal = Math.round(Math.max(0, subtotal - effectiveDiscount + taxAmount) * 100) / 100;
  const totalProfit = Math.round((grandTotal - totalCost) * 100) / 100;

  // Complete checkout
  const handleProcessCheckout = () => {
    if (cart.length === 0) return;

    // Create order with full store & counter metadata and deduct stock in storage
    const newOrder = storage.processOrder({
      source: 'pos_counter',
      storeId: posSession.storeId,
      storeName: posSession.storeName,
      counterNumber: posSession.counterNumber,
      counterName: posSession.counterName,
      cashierName: posSession.cashierName,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Guest',
      customerPhone: selectedCustomer ? selectedCustomer.phone : customerPhone || undefined,
      items: cart.map((c) => ({
        itemId: c.itemId,
        name: c.name,
        sku: c.sku,
        price: c.price,
        costPrice: c.costPrice,
        quantity: c.quantity,
        customization: c.customization,
        subtotal: c.subtotal,
        profit: c.profit,
        isTaxApplicable: c.isTaxApplicable !== false,
      })),
      subtotal,
      discountAmount: effectiveDiscount,
      appliedPromoCode: appliedDiscount?.code,
      loyaltyPointsUsed: pointsToRedeem,
      taxAmount,
      grandTotal,
      totalCost,
      totalProfit,
      paymentMethod,
      paymentStatus: 'paid',
      status: 'completed',
    });

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } catch {}

    setRecentOrder(newOrder);
    setPaymentModalOpen(false);
    setReceiptModalOpen(true);
    setMobileCartOpen(false);
    setCart([]);
    setSelectedCustomer(null);
    setCustomerPhone('');
    setRedeemPoints(false);
    setAppliedDiscount(null);
  };

  // Shift summary calculations for current store and counter (resets after 12:00 AM midnight)
  const allOrders = storage.getOrders();
  const storeOrdersToday = allOrders.filter(
    (o) => o.storeId === posSession.storeId && isToday(o.createdAt)
  );
  const posOrdersToday = storeOrdersToday.filter(
    (o) => o.source === 'pos_counter' && (o.counterNumber === posSession.counterNumber || !o.counterNumber)
  );
  const totalShiftRevenue = posOrdersToday.reduce((s, o) => s + o.grandTotal, 0);
  const totalShiftCash = posOrdersToday.filter((o) => o.paymentMethod === 'cash').reduce((s, o) => s + o.grandTotal, 0);
  const totalShiftUPI = posOrdersToday.filter((o) => o.paymentMethod === 'upi_qr').reduce((s, o) => s + o.grandTotal, 0);
  const totalShiftCard = posOrdersToday.filter((o) => o.paymentMethod === 'card').reduce((s, o) => s + o.grandTotal, 0);
  const totalStoreSalesToday = storeOrdersToday.reduce((s, o) => s + o.grandTotal, 0);

  const totalCartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Banner with Active Store, Counter & Cashier Station Information */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center justify-center shrink-0">
            <Store className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {posSession.storeName}
              </h2>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-900 border border-amber-500/30 text-xs font-bold">
                Counter #{posSession.counterNumber}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase hidden sm:inline-block">
                24x7 Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="font-medium text-slate-700 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-amber-600" />
                Cashier: <strong>{posSession.cashierName}</strong>
              </span>
              <span>•</span>
              <span className="text-slate-500">{posSession.shift}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={onOpenScanner || (() => setLocalScannerOpen(true))}
            className="px-3 py-2 bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Scan className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Scan Barcode</span>
          </button>
          <button
            onClick={() => setShowShiftSummary(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Clock className="w-4 h-4 text-amber-700" />
            <span>Shift Register</span>
          </button>
          <button
            onClick={handleLogout}
            title="Switch Counter or Sign Out"
            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Switch Counter</span>
          </button>
        </div>
      </div>

      {/* Real-time Scanned Item Feedback Toast Banner */}
      {lastScannedFeedback && (
        <div className="bg-emerald-900 text-emerald-100 px-4 py-2.5 rounded-xl border border-emerald-700 shadow-md flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-800 text-amber-300 flex items-center justify-center font-bold">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>✓ Added to Cart:</span>
                <span className="text-amber-300">{lastScannedFeedback.name}</span>
              </p>
              <p className="text-[10px] text-emerald-200">
                Barcode: <span className="font-mono">{lastScannedFeedback.barcode}</span> • Price: {CURRENCY}{lastScannedFeedback.price.toFixed(2)}
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-800/80 px-2 py-0.5 rounded-md font-mono text-emerald-200">
            Auto-added
          </span>
        </div>
      )}

      {/* Main POS Grid: Product Catalog (Left 7 cols) + Live Cart & Tender (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: Product Catalog & Category Tabs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Pills */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search pan specialties, 24x7 coffee, essentials, mukhwas, barcode..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-[#1E293B] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                All Products
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-[#1E293B] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[640px] overflow-y-auto pr-1">
            {filteredProducts.map((item, idx) => {
              const storeStock = getItemStoreStock(item);
              const isLow = storeStock <= item.lowStockThreshold && storeStock > 0;
              const isOut = storeStock === 0;

              return (
                <div
                  key={item.id ? `${item.id}-${idx}` : `pos-item-${idx}`}
                  onClick={() => !isOut && addToCart(item)}
                  className={`bg-white border rounded-2xl p-3 flex flex-col justify-between transition-all group select-none relative ${
                    isOut
                      ? 'opacity-60 border-red-200 bg-red-50/20 cursor-not-allowed'
                      : 'border-slate-200 hover:border-amber-400 hover:shadow-md cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="relative aspect-4/3 rounded-xl overflow-hidden mb-2 bg-slate-100 border border-slate-200">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Crown className="w-8 h-8" />
                        </div>
                      )}

                      {/* Store specific stock pill */}
                      <span
                        className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isOut
                            ? 'bg-red-600 text-white shadow-xs'
                            : isLow
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-900/80 text-white backdrop-blur-xs'
                        }`}
                      >
                        {storeStock} {item.unit}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-800 group-hover:text-amber-700 line-clamp-2 leading-tight">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-400">{item.sku}</span>
                      {item.brand && (
                        <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-700 text-[9px] font-semibold rounded-sm border border-indigo-100">
                          {item.brand}
                        </span>
                      )}
                      {item.priceType === 'variable' && (
                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 text-[9px] font-bold rounded-sm border border-amber-300 flex items-center gap-0.5">
                          <SlidersHorizontal className="w-2.5 h-2.5" />
                          Variable Price
                        </span>
                      )}
                      {item.isTaxApplicable === false ? (
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-sm border border-slate-200">
                          0% Exempt
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-800 text-[9px] font-bold rounded-sm border border-emerald-200">
                          5% GST
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    {item.priceType === 'variable' ? (
                      <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <Edit3 className="w-3 h-3" />
                        Custom Price
                      </span>
                    ) : (
                      <span className="text-sm font-black text-slate-900">
                        {CURRENCY}{item.sellingPrice.toFixed(2)}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={isOut}
                      className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-[#1E293B] text-slate-600 group-hover:text-white transition-colors cursor-pointer border border-slate-200 group-hover:border-slate-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Current Active Cart, Patron Loyalty, Discount, & Checkout (5 cols on Desktop, or drawer) */}
        <div className="hidden lg:flex lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex-col justify-between space-y-4 sticky top-20">
          <div className="space-y-3.5">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-700" />
                <h3 className="font-bold text-slate-900 text-sm">Active POS Register Cart</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                  {totalCartCount} items
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[11px] text-red-600 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {/* Customer Loyalty Search Box */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Customer Phone (Loyalty)
                </label>
                {selectedCustomer && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    {selectedCustomer.tier} Tier
                  </span>
                )}
              </div>

              <input
                type="text"
                value={customerPhone}
                onChange={(e) => handlePhoneLookup(e.target.value)}
                placeholder="Enter 10-digit phone to fetch/enroll..."
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-400"
              />

              {selectedCustomer ? (
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-emerald-900">{selectedCustomer.name}</p>
                    <p className="text-[10px] text-emerald-700">
                      Balance: <strong>{selectedCustomer.loyaltyPoints} Points</strong> (~{CURRENCY}{(selectedCustomer.loyaltyPoints * 0.1).toFixed(2)})
                    </p>
                  </div>

                  <label className="flex items-center gap-1.5 text-[11px] text-emerald-800 cursor-pointer font-bold">
                    <input
                      type="checkbox"
                      checked={redeemPoints}
                      onChange={(e) => setRedeemPoints(e.target.checked)}
                      className="w-4 h-4 accent-slate-800 rounded-sm"
                    />
                    Redeem
                  </label>
                </div>
              ) : customerPhone.length >= 10 ? (
                <div className="text-[10px] text-slate-500 flex items-center justify-between">
                  <span>New guest! Will auto-enroll +50 bonus points.</span>
                </div>
              ) : null}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <Receipt className="w-8 h-8 stroke-1 mx-auto mb-1 text-slate-300" />
                  <p className="text-xs text-slate-600 font-medium">Cart is empty</p>
                  <p className="text-[10px] text-slate-400">Scan barcode or click items to start billing</p>
                </div>
              ) : (
                cart.map((ci, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-slate-800 truncate">{ci.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <button
                          type="button"
                          onClick={() => openCartPriceOverride(idx)}
                          className="hover:text-indigo-600 font-medium flex items-center gap-0.5 underline decoration-dotted cursor-pointer"
                          title="Click to override / edit unit price"
                        >
                          <span>{CURRENCY}{ci.price.toFixed(2)} each</span>
                          <Edit3 className="w-2.5 h-2.5 opacity-60" />
                        </button>
                        {ci.priceType === 'variable' && (
                          <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1 rounded">Var</span>
                        )}
                        {ci.customization && <span className="text-slate-600 italic">[{ci.customization}]</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                      <button
                        onClick={() => updateQuantity(idx, -1)}
                        className="p-1 text-slate-500 hover:text-slate-900 rounded-sm cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-xs font-bold text-slate-800 px-1">{ci.quantity}</span>
                      <button
                        onClick={() => updateQuantity(idx, 1)}
                        className="p-1 text-slate-500 hover:text-slate-900 rounded-sm cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right min-w-[55px]">
                      <span className="font-extrabold text-xs text-slate-900">
                        {CURRENCY}{ci.subtotal.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => removeFromCart(idx)}
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Promo Coupon Bar */}
            <form onSubmit={handleApplyPromo} className="space-y-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Coupon code (e.g. ROYALPAN20)"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 uppercase font-mono placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 cursor-pointer transition-colors"
                >
                  Apply
                </button>
              </div>
              {promoError && <p className="text-[10px] text-red-600">{promoError}</p>}
              {appliedDiscount && (
                <p className="text-[10px] text-emerald-700 font-semibold">
                  ✓ Applied {appliedDiscount.code} (-{CURRENCY}{appliedDiscount.amount.toFixed(2)})
                </p>
              )}
            </form>
          </div>

          {/* Cart Bill Summary & Tender Button */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="space-y-1 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-slate-800 font-semibold">{CURRENCY}{subtotal.toFixed(2)}</span>
              </div>

              {effectiveDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discounts & Loyalty Points</span>
                  <span>-{CURRENCY}{effectiveDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <span>GST (Tax on Bill)</span>
                  {taxAmount === 0 && (
                    <span className="text-[10px] text-slate-400 font-normal">(0% Exempt)</span>
                  )}
                  {taxAmount > 0 && (
                    <span className="text-[10px] text-emerald-700 font-medium">(5% on taxable)</span>
                  )}
                </span>
                <span className={taxAmount > 0 ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                  {taxAmount > 0 ? `${CURRENCY}${taxAmount.toFixed(2)}` : `${CURRENCY}0.00 (Exempt)`}
                </span>
              </div>

              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Payable Amount</span>
                <span className="text-slate-900 text-base">{CURRENCY}{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => setPaymentModalOpen(true)}
              disabled={cart.length === 0}
              className="w-full py-3 bg-[#1E293B] hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <CreditCard className="w-4 h-4 text-amber-400" /> Collect {CURRENCY}{grandTotal.toFixed(2)} & Bill
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar on Mobile/Tablet */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 bg-slate-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-slate-700">
          <div>
            <span className="text-xs text-slate-400 block">{totalCartCount} items in cart</span>
            <span className="text-lg font-black text-amber-400">{CURRENCY}{grandTotal.toFixed(2)}</span>
          </div>
          <button
            onClick={() => setPaymentModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
          >
            Collect & Pay
          </button>
        </div>
      )}

      {/* Payment Selection Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">Select Retail Payment Method</h3>
              </div>
              <button onClick={() => setPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 block">Total Payable ({posSession.storeName})</span>
              <span className="text-2xl font-black text-slate-900">{CURRENCY}{grandTotal.toFixed(2)}</span>
            </div>

            {/* Payment Method Pills */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'cash'
                    ? 'bg-[#1E293B] text-white border-slate-800 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-5 h-5" /> Cash
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('upi_qr')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'upi_qr'
                    ? 'bg-[#1E293B] text-white border-slate-800 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <QrCode className="w-5 h-5 text-amber-400" /> UPI / Dynamic QR
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'bg-[#1E293B] text-white border-slate-800 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-5 h-5" /> Card / POS
              </button>
            </div>

            {/* Cash details */}
            {paymentMethod === 'cash' && (
              <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-600 font-bold">Quick Cash Denominations:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {[50, 100, 200, 500, 1000, 2000].map((denom) => (
                    <button
                      key={denom}
                      type="button"
                      onClick={() => setTenderedCash(denom)}
                      className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-md hover:border-slate-400 cursor-pointer font-mono font-bold shadow-2xs"
                    >
                      ₹{denom}
                    </button>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-between text-slate-700">
                  <span className="font-bold">Tendered:</span>
                  <input
                    type="number"
                    value={tenderedCash || ''}
                    onChange={(e) => setTenderedCash(Number(e.target.value))}
                    placeholder="Enter cash..."
                    className="w-28 bg-white border border-slate-200 rounded-md px-2 py-1 text-right font-mono text-slate-800 font-bold focus:outline-hidden focus:border-slate-400"
                  />
                </div>

                {tenderedCash >= grandTotal && (
                  <div className="flex justify-between text-emerald-800 font-bold pt-2 border-t border-slate-200">
                    <span>Return Change:</span>
                    <span>{CURRENCY}{(tenderedCash - grandTotal).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* UPI QR Code Simulator */}
            {paymentMethod === 'upi_qr' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                <div className="w-36 h-36 bg-white p-2 rounded-xl mx-auto flex items-center justify-center border border-slate-200 shadow-xs">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900 fill-current">
                    <path d="M0 0h30v30H0zM10 10h10v10H10zM70 0h30v30H70zM80 10h10v10H80zM0 70h30v30H0zM10 80h10v10H10zM40 0h20v10H40zM40 20h10v10H40zM55 20h10v10H55zM0 40h10v20H0zM20 40h20v10H20zM45 45h10v10H45zM60 40h40v10H60zM75 55h25v10H75zM40 70h10v30H40zM60 70h30v10H60zM80 85h20v15H80z" />
                  </svg>
                </div>
                <div className="font-mono text-xs text-slate-800 font-bold">
                  UPI ID: richierichpan@icici
                </div>
                <p className="text-[11px] text-slate-500">Scan with Google Pay, PhonePe, Paytm or any UPI app</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleProcessCheckout}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-white" /> Complete Sale ({posSession.counterName})
            </button>
          </div>
        </div>
      )}

      {/* Shift Summary Register Drawer */}
      {showShiftSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Cashier Shift Summary</h3>
                <p className="text-[11px] text-slate-500">{posSession.storeName} • Counter {posSession.counterNumber}</p>
              </div>
              <button onClick={() => setShowShiftSummary(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex justify-between items-center">
                <span className="text-amber-900 font-semibold">Counter #{posSession.counterNumber} Sales Today:</span>
                <span className="font-black text-amber-950 text-base">{CURRENCY}{totalShiftRevenue.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600 font-medium">Cash in Drawer (Counter #{posSession.counterNumber}):</span>
                <span className="font-bold text-slate-800">{CURRENCY}{totalShiftCash.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600 font-medium">UPI / QR (Counter #{posSession.counterNumber}):</span>
                <span className="font-bold text-slate-800">{CURRENCY}{totalShiftUPI.toFixed(2)}</span>
              </div>
              {totalShiftCard > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Card POS (Counter #{posSession.counterNumber}):</span>
                  <span className="font-bold text-slate-800">{CURRENCY}{totalShiftCard.toFixed(2)}</span>
                </div>
              )}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span className="text-slate-600 font-medium">Counter #{posSession.counterNumber} Bills Today:</span>
                <span className="font-bold text-slate-800">{posOrdersToday.length} transactions</span>
              </div>
              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 flex justify-between items-center">
                <span className="text-indigo-900 font-medium">Store-Wide Sales Today:</span>
                <span className="font-bold text-indigo-950">{CURRENCY}{totalStoreSalesToday.toFixed(2)} ({storeOrdersToday.length} bills)</span>
              </div>
              <div className="text-center pt-1">
                <span className="text-[10px] text-slate-400 font-medium flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" /> Resets automatically at 12:00 AM local midnight
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowShiftSummary(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer transition-colors"
            >
              Close Register View
            </button>
          </div>
        </div>
      )}

      {/* Variable / Custom Price Modal */}
      {variablePriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {variablePriceModal.isEditMode ? 'Override Item Price' : 'Enter Custom Selling Price'}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[260px]">
                    {variablePriceModal.item.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVariablePriceModal(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVariablePrice} className="space-y-4">
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs">
                <span className="text-amber-900 font-medium">SKU: <strong className="font-mono">{variablePriceModal.item.sku}</strong></span>
                <span className="text-amber-900 font-medium">Cost Ref: <strong>{CURRENCY}{variablePriceModal.item.costPrice || 0}</strong></span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Selling Price Per Unit ({CURRENCY}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-base">{CURRENCY}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    autoFocus
                    value={customPriceInput}
                    onChange={(e) => setCustomPriceInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Quick Price Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-500">Quick Presets:</span>
                <div className="flex gap-2 flex-wrap">
                  {[20, 30, 50, 80, 100, 150, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCustomPriceInput(String(amt))}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 hover:border-amber-300 border border-slate-200 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      {CURRENCY}{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Customization / Combo Note (Optional)
                </label>
                <input
                  type="text"
                  value={customNoteInput}
                  onChange={(e) => setCustomNoteInput(e.target.value)}
                  placeholder="e.g. Extra Silver Vark, Custom Platter pack, Less Sweet"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setVariablePriceModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1E293B] hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  <span>{variablePriceModal.isEditMode ? 'Update Price' : 'Add to Bill'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POS Receipt Modal */}
      <POSReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        order={recentOrder}
        customer={selectedCustomer}
      />

      {/* POS Dedicated Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={localScannerOpen}
        onClose={() => setLocalScannerOpen(false)}
        onScanSuccess={(code) => {
          handleBarcodeScanned(code);
          setLocalScannerOpen(false);
        }}
      />
    </div>
  );
};

