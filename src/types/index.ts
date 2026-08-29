export type Role = 'landing' | 'admin' | 'pos' | 'customer' | 'warehouse' | 'store_admin';
export type UserRole = Role;
export type AdminTab = 'dashboard' | 'staff_counters' | 'analytics' | 'orders' | 'loyalty_promos' | 'backups';
export type StoreAdminTab = 'overview' | 'finances' | 'expenses' | 'orders' | 'inventory' | 'staff' | 'closing';

export * from './warehouse';

export interface StoreAdminCredential {
  id: string;
  username: string;
  password: string;
  name: string;
  storeId: string;
  storeName: string;
  phone?: string;
  email?: string;
  roleTitle?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface StoreAdminAuthState {
  isAuthenticated: boolean;
  username: string;
  storeId: string;
  storeName: string;
  adminName: string;
  loginTime: string;
}

export type StoreExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'staff_salary'
  | 'staff_advance'
  | 'maintenance'
  | 'supplies'
  | 'raw_materials_petty'
  | 'marketing'
  | 'logistics'
  | 'cleaning'
  | 'miscellaneous'
  | 'daily_supplies'
  | 'electricity_utility'
  | 'rent_lease'
  | 'maintenance_repairs'
  | 'store_refreshments'
  | 'local_vendor'
  | 'misc';

export interface StoreExpense {
  id: string;
  storeId: string;
  storeName: string;
  category: StoreExpenseCategory;
  amount: number;
  description: string;
  title?: string;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'card' | 'cheque' | 'online';
  paymentMode?: 'cash' | 'online' | 'upi' | 'card' | 'bank_transfer' | 'cheque';
  paidTo: string;
  paidToOrRecipient?: string;
  voucherNumber: string;
  receiptNumber?: string;
  receiptUrl?: string;
  loggedBy: string;
  paidBy?: string;
  notes?: string;
  createdAt: string;
  date: string;
}

export interface StoreFinancialSummary {
  storeId: string;
  storeName: string;
  totalSales: number;
  totalSalesCredit: number;
  orderCount: number;
  totalOrdersCount: number;
  salesByMode: {
    cash: number;
    upi: number;
    card: number;
  };
  salesByPayment: {
    cash: number;
    upi_qr: number;
    card: number;
    loyalty_points: number;
    split: number;
  };
  totalExpenses: number;
  totalExpensesDebit: number;
  expenseCount: number;
  expensesByMode: {
    cash: number;
    online: number;
  };
  categoryBreakdown: Record<string, number>;
  expensesByCategory: Record<string, number>;
  expensesByPayment: {
    cash: number;
    upi: number;
    bank_transfer: number;
    card: number;
    cheque: number;
  };
  netStoreBalance: number;
  expectedCashInDrawer: number;
  profitMarginPercent: number;
  averageOrderValue: number;
  totalGSTCollected: number;
}

export interface CounterInfo {
  id: number;
  name: string;
  defaultPin: string;
  cashierName: string;
  shift: string;
  phone?: string;
  isActive?: boolean;
}

export interface StoreLocation {
  id: string; // 'bopal' | 'gota' | 'sindhubhavan' | 'sg_highway'
  name: string;
  shortName: string;
  area: string;
  countersCount: number;
  counters: CounterInfo[];
  address: string;
  phone: string;
  is24x7: boolean;
  landmark: string;
}

export type StoreOutlet = StoreLocation;

export interface POSSession {
  storeId: string;
  storeName: string;
  counterNumber: number;
  counterName: string;
  cashierName: string;
  authenticatedAt?: string;
  loggedInAt?: string;
  shift: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  description: string;
  costPrice: number;       // Cost to store in currency (₹)
  sellingPrice: number;    // Retail price
  stockQuantity: number;   // Total in-stock quantity across all counters
  lowStockThreshold: number; // Alert triggers when stock <= this
  unit: string;            // 'pieces', 'boxes', 'bottles', 'grams', etc.
  imageUrl?: string;
  isTaxApplicable?: boolean; // When true: standard 5% GST is applied. When false: 0% tax (Tax Exempt)
  taxRate?: number;         // Tax percentage if applicable (default 5%)
  isAvailableForOnline: boolean;
  ingredients?: string[];
  expiryDate?: string;
  marginPercentage?: number; // Calculated (selling - cost) / selling * 100
  profitPerUnit?: number;    // Calculated selling - cost
  tags?: string[];
  storeAllocations?: Record<string, number>; // Stock per store: { bopal: 10, gota: 18, sindhubhavan: 8, sg_highway: 6 }
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  loyaltyPoints: number;
  tier: 'Silver' | 'Gold' | 'Platinum Royal';
  totalSpent: number;
  totalOrders: number;
  joinDate: string;
  preferences?: string[];
  address?: string;
}

export interface OrderItem {
  itemId: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  quantity: number;
  customization?: string;
  subtotal: number;
  profit: number;
  isTaxApplicable?: boolean;
  taxRate?: number;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'upi_qr' | 'card' | 'loyalty_points' | 'split';
export type OrderSource = 'pos_counter' | 'customer_online' | 'dine_in';

export interface Order {
  id: string;
  orderNumber: string;
  source: OrderSource;
  storeId?: string;
  storeName?: string;
  counterNumber?: number;
  counterName?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  appliedPromoCode?: string;
  loyaltyPointsUsed?: number;
  loyaltyPointsEarned?: number;
  taxAmount: number;
  grandTotal: number;
  totalCost: number;
  totalProfit: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  status: OrderStatus;
  createdAt: string;
  cashierName?: string;
  notes?: string;
}

export interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number; // e.g. 15 for 15% or 50 for ₹50
  minOrderAmount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  usageCount: number;
  bannerColor?: string;
  targetTier?: 'All' | 'Silver' | 'Gold' | 'Platinum Royal';
}

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  type: 'order_update' | 'low_stock' | 'discount_promo' | 'system_backup' | 'loyalty_reward';
  timestamp: string;
  targetRole: 'all' | 'admin' | 'pos' | 'customer';
  read: boolean;
  linkTab?: string;
  metaData?: any;
}

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  type: 'automated_daily' | 'manual';
  itemCount: number;
  orderCount: number;
  customerCount: number;
  fileSizeKb: number;
  checksum: string;
  dataJson: string;
}

export interface StoreFinancialStats {
  totalRevenue: number;
  totalCOGS: number; // Cost of Goods Sold
  grossProfit: number;
  overallMarginPercent: number;
  totalOrdersCount: number;
  lowStockItemsCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
  totalCustomersCount: number;
  loyaltyPointsIssued: number;
}
