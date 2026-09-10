import {
  InventoryItem,
  Category,
  Customer,
  Order,
  Promotion,
  PushNotification,
  BackupSnapshot,
  StoreFinancialStats,
  StoreLocation,
  CounterInfo,
  POSSession,
  StoreAdminCredential,
  StoreExpense,
  StoreExpenseCategory,
  StoreFinancialSummary,
} from '../types';
import { soundEffects } from './audio';
import { validateAndSanitizeBackupPayload } from './backupIntegrityService';
import { safeStorage } from '../utils/safeStorage';
import { getLocalDateString, isToday, isSameDay } from '../utils/dateUtils';

const STORAGE_KEYS = {
  INVENTORY: 'rr_panhouse_inventory',
  CATEGORIES: 'rr_panhouse_categories',
  CUSTOMERS: 'rr_panhouse_customers',
  ORDERS: 'rr_panhouse_orders',
  PROMOTIONS: 'rr_panhouse_promotions',
  NOTIFICATIONS: 'rr_panhouse_notifications',
  BACKUPS: 'rr_panhouse_backups',
  LAST_BACKUP_DATE: 'rr_panhouse_last_backup_date',
  POS_SESSION: 'rr_panhouse_pos_session',
  STORES: 'rr_panhouse_stores',
  STORE_ADMINS: 'rr_panhouse_store_admins',
  STORE_EXPENSES: 'rr_panhouse_store_expenses',
  CURRENCY_SYMBOL: '₹',
};

export const CURRENCY = '₹';

/**
 * Normalizes any category string:
 * - If category is Paan (or pan, cat-paan, etc.) -> 'Paan'
 * - If category is Cafe (or cafe, coffee, shakes, beverages, etc.) -> 'Cafe'
 * - If category is ANYTHING ELSE -> automatically keep in 'Essentials'
 */
export function normalizeProductCategory(rawCat?: string): 'Paan' | 'Cafe' | 'Essentials' {
  if (!rawCat) return 'Essentials';
  const clean = String(rawCat).trim().toLowerCase();

  // Paan matches
  if (
    clean === 'paan' ||
    clean === 'pan' ||
    clean === 'cat-paan' ||
    clean.includes('paan') ||
    clean.includes('pan ') ||
    clean.startsWith('pan-') ||
    clean.startsWith('paan-') ||
    clean === 'meetha paan' ||
    clean === 'sada paan' ||
    clean === 'specialty paan'
  ) {
    return 'Paan';
  }

  // Cafe matches
  if (
    clean === 'cafe' ||
    clean === 'café' ||
    clean === 'coffee' ||
    clean === 'cat-coffee' ||
    clean === 'cat-shakes' ||
    clean === 'shakes' ||
    clean === 'shake' ||
    clean === 'beverages' ||
    clean === 'beverage' ||
    clean === 'tea' ||
    clean === 'chai' ||
    clean.includes('cafe') ||
    clean.includes('café') ||
    clean.includes('coffee') ||
    clean.includes('espresso') ||
    clean.includes('frappe') ||
    clean.includes('shake') ||
    clean.includes('falooda')
  ) {
    return 'Cafe';
  }

  // Any category other than Paan or Cafe is automatically kept in Essentials
  return 'Essentials';
}

// Initial Store Admin Login Credentials
export const INITIAL_STORE_ADMINS: StoreAdminCredential[] = [
  {
    id: 'sa-bopal',
    username: 'admin_bopal',
    password: 'RRbopal',
    name: 'Rajesh Shah',
    storeId: 'bopal',
    storeName: 'Richie Rich Pan House - Bopal Branch',
    phone: '+91 98250 11201',
    email: 'bopal.admin@richierich.in',
    roleTitle: 'Store Branch Manager',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sa-gota',
    username: 'admin_gota',
    password: 'RRgota',
    name: 'Hardik Patel',
    storeId: 'gota',
    storeName: 'Richie Rich Pan House & Coffee Lounge - Gota Main',
    phone: '+91 98250 11202',
    email: 'gota.admin@richierich.in',
    roleTitle: 'Store Operations Lead',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sa-sbr',
    username: 'admin_sbr',
    password: 'RRsbr',
    name: 'Manish Varma',
    storeId: 'sindhubhavan',
    storeName: 'Richie Rich Pan House - Sindhubhavan Road (SBR)',
    phone: '+91 98250 11203',
    email: 'sbr.admin@richierich.in',
    roleTitle: 'Lounge & Store Manager',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'sa-sg',
    username: 'admin_sg',
    password: 'RRsg',
    name: 'Sameer Dave',
    storeId: 'sg_highway',
    storeName: 'Richie Rich Pan House - SG Highway Express',
    phone: '+91 98250 11204',
    email: 'sg.admin@richierich.in',
    roleTitle: 'Highway Express Supervisor',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

// Initial Store Expenses (Realistic Seed)
export const INITIAL_STORE_EXPENSES: StoreExpense[] = [
  {
    id: 'exp-101',
    storeId: 'bopal',
    storeName: 'Richie Rich Pan House - Bopal Branch',
    category: 'utilities',
    amount: 1450,
    description: 'Electricity & Backup DG Diesel refill',
    paymentMethod: 'upi',
    paidTo: 'Torrent Power & Fuel Station',
    voucherNumber: 'EXP-BOP-001',
    loggedBy: 'Rajesh Shah',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 'exp-102',
    storeId: 'bopal',
    storeName: 'Richie Rich Pan House - Bopal Branch',
    category: 'raw_materials_petty',
    amount: 680,
    description: 'Fresh mint leaves, organic limes & crushed cooling ice',
    paymentMethod: 'cash',
    paidTo: 'Local Mandi Vendor',
    voucherNumber: 'EXP-BOP-002',
    loggedBy: 'Rajesh Shah',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: 'exp-103',
    storeId: 'gota',
    storeName: 'Richie Rich Pan House & Coffee Lounge - Gota Main',
    category: 'supplies',
    amount: 1200,
    description: 'Biodegradable parcel boxes, luxury paan silver pouches, napkins',
    paymentMethod: 'cash',
    paidTo: 'Gala Packaging Hub',
    voucherNumber: 'EXP-GOT-001',
    loggedBy: 'Hardik Patel',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
  {
    id: 'exp-104',
    storeId: 'gota',
    storeName: 'Richie Rich Pan House & Coffee Lounge - Gota Main',
    category: 'staff_advance',
    amount: 500,
    description: 'Staff dinner tea & snacks for night shift',
    paymentMethod: 'cash',
    paidTo: 'Counter Staff Pool',
    voucherNumber: 'EXP-GOT-002',
    loggedBy: 'Hardik Patel',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  {
    id: 'exp-105',
    storeId: 'sindhubhavan',
    storeName: 'Richie Rich Pan House - Sindhubhavan Road (SBR)',
    category: 'cleaning',
    amount: 850,
    description: 'Lounge floor sanitizers, glass cleaner & air fragrance refills',
    paymentMethod: 'upi',
    paidTo: 'CleanCare Solutions',
    voucherNumber: 'EXP-SBR-001',
    loggedBy: 'Manish Varma',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
];

// Initial Store Locations
export const INITIAL_STORES: StoreLocation[] = [
  {
    id: 'bopal',
    name: 'Richie Rich Pan House - Bopal Branch',
    shortName: 'Bopal',
    area: 'South Bopal, Ahmedabad',
    countersCount: 2,
    counters: [
      { id: 1, name: 'Counter 1 (Main Billing)', defaultPin: '1001', cashierName: 'Karan Patel', shift: '24x7 Active (Shift A)' },
      { id: 2, name: 'Counter 2 (Quick Express & Pan)', defaultPin: '1002', cashierName: 'Sanjay Rawal', shift: '24x7 Active (Shift B)' },
    ],
    address: 'Shop 12-14, Gala Empire, South Bopal, Ahmedabad, Gujarat 380058',
    phone: '+91 98250 11201',
    is24x7: true,
    landmark: 'Opp. Bopal Lake Garden',
  },
  {
    id: 'gota',
    name: 'Richie Rich Pan House & Coffee Lounge - Gota Main',
    shortName: 'Gota',
    area: 'Vandemataram Road, Gota, Ahmedabad',
    countersCount: 4,
    counters: [
      { id: 1, name: 'Counter 1 (Royal Paan Special)', defaultPin: '2001', cashierName: 'Mahesh Solanki', shift: '24x7 Active (Day)' },
      { id: 2, name: 'Counter 2 (Espresso & Hot Coffee Bar)', defaultPin: '2002', cashierName: 'Rahul Joshi', shift: '24x7 Active (Evening)' },
      { id: 3, name: 'Counter 3 (Mukhwas & Essentials)', defaultPin: '2003', cashierName: 'Amit Shah', shift: '24x7 Active (Night Owl)' },
      { id: 4, name: 'Counter 4 (Drive-thru / Express Takeaway)', defaultPin: '2004', cashierName: 'Dhaval Prajapati', shift: '24x7 Active (Round-the-Clock)' },
    ],
    address: 'Ground Floor, Royal Arcade, Vandemataram Cross Road, Gota, Ahmedabad, Gujarat 382481',
    phone: '+91 98250 11202',
    is24x7: true,
    landmark: 'Near Vandemataram Square',
  },
  {
    id: 'sindhubhavan',
    name: 'Richie Rich Pan House - Sindhubhavan Road (SBR)',
    shortName: 'Sindhubhavan',
    area: 'Sindhubhavan Road, Bodakdev, Ahmedabad',
    countersCount: 2,
    counters: [
      { id: 1, name: 'Counter 1 (VIP Lounge & Pan)', defaultPin: '3001', cashierName: 'Pritesh Dave', shift: '24x7 Active (Shift A)' },
      { id: 2, name: 'Counter 2 (Beverages & Mukhwas Bar)', defaultPin: '3002', cashierName: 'Kavita Sharma', shift: '24x7 Active (Shift B)' },
    ],
    address: 'Block A, Titanium Business Park, Sindhubhavan Marg, Bodakdev, Ahmedabad 380054',
    phone: '+91 98250 11203',
    is24x7: true,
    landmark: 'Opp. Symphony House',
  },
  {
    id: 'sg_highway',
    name: 'Richie Rich Pan House - SG Highway Express',
    shortName: 'SG Highway',
    area: 'SG Highway, Thaltej / Prahladnagar, Ahmedabad',
    countersCount: 2,
    counters: [
      { id: 1, name: 'Counter 1 (Highway 24x7 Express)', defaultPin: '4001', cashierName: 'Vikram Rajput', shift: '24x7 Active (Day/Night)' },
      { id: 2, name: 'Counter 2 (Quick Brews & Cigars/Essentials)', defaultPin: '4002', cashierName: 'Anil Desai', shift: '24x7 Active (Late Night)' },
    ],
    address: 'Shop 4-5, Shapath V, Near Crowne Plaza, SG Highway, Ahmedabad 380015',
    phone: '+91 98250 11204',
    is24x7: true,
    landmark: 'Near Iscon Cross Road',
  },
];

// Initial Categories (Strictly Paan, Cafe, Essentials)
export const INITIAL_CATEGORIES: Category[] = [
  { id: 'Paan', name: 'Paan', icon: 'Leaf', description: 'Royal Meetha, Fire, Ice, Chocolate, Sada & 24K Gold Vark creations' },
  { id: 'Cafe', name: 'Cafe', icon: 'Coffee', description: '24x7 Fresh Coffee, Artisanal Espresso, Cold Brews, Kulhad Chai & Rich Shakes' },
  { id: 'Essentials', name: 'Essentials', icon: 'ShoppingBag', description: 'Mukhwas, Supari, Pocket Mouth Sprays, Chilled Hydration, Energy Drinks & Confections' },
];

// Initial Rich Inventory Items with Multi-Store Allocation
export const INITIAL_INVENTORY: InventoryItem[] = [
  // 1. ROYAL PAAN (Paan Category)
  {
    id: 'item-101',
    sku: 'PAN-MAG-01',
    barcode: '890100101',
    name: 'Royal Maghai Meetha Paan',
    category: 'Paan',
    description: 'Crisp Maghai betel leaf stuffed with premium gulkand, sweetened coconut, tutti frutti, dry dates and fragrant royal spices.',
    costPrice: 20,
    sellingPrice: 50,
    stockQuantity: 74,
    lowStockThreshold: 15,
    unit: 'pieces',
    imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 5,
    isAvailableForOnline: true,
    ingredients: ['Maghai Leaf', 'Premium Gulkand', 'Shredded Coconut', 'Saunf', 'Cardamom', 'Silver Vark'],
    marginPercentage: 60,
    profitPerUnit: 30,
    tags: ['Best Seller', 'Traditional', 'Royal'],
    storeAllocations: { bopal: 18, gota: 30, sindhubhavan: 14, sg_highway: 12 },
  },
  {
    id: 'item-102',
    sku: 'PAN-FIR-02',
    barcode: '890100102',
    name: 'Signature Chocolate Fire Paan',
    category: 'Paan',
    description: 'Spectacular flaming clove and dark chocolate blend placed directly into the mouth for an icy-hot sensory thrill.',
    costPrice: 45,
    sellingPrice: 110,
    stockQuantity: 28,
    lowStockThreshold: 12,
    unit: 'pieces',
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 5,
    isAvailableForOnline: true,
    ingredients: ['Betel Leaf', 'Flaming Clove', 'Belgian Dark Chocolate', 'Gulkand', 'Menthol Crystals'],
    marginPercentage: 59.09,
    profitPerUnit: 65,
    tags: ['Trending', 'Must Try', 'Live Experience'],
    storeAllocations: { bopal: 6, gota: 12, sindhubhavan: 6, sg_highway: 4 },
  },
  {
    id: 'item-103',
    sku: 'PAN-ICE-03',
    barcode: '890100103',
    name: 'Sub-Zero Ice Smoke Paan',
    category: 'Paan',
    description: 'Chilled liquid-nitrogen infused betel leaf with crushed cooling syrups and mint crystals creating misty aromatic breaths.',
    costPrice: 35,
    sellingPrice: 90,
    stockQuantity: 34,
    lowStockThreshold: 10,
    unit: 'pieces',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 5,
    isAvailableForOnline: true,
    ingredients: ['Calcutta Leaf', 'Menthol Chuski', 'Rose Jelly', 'Ice Crystals', 'Sweet Spices'],
    marginPercentage: 61.11,
    profitPerUnit: 55,
    tags: ['Cooling', 'Summer Special'],
    storeAllocations: { bopal: 8, gota: 14, sindhubhavan: 6, sg_highway: 6 },
  },
  {
    id: 'item-104',
    sku: 'PAN-SLV-04',
    barcode: '890100104',
    name: 'Kesar Kasturi Gold Vark Paan',
    category: 'Paan',
    description: 'Exotic saffron strands, natural musk syrup, crushed almonds and 24K edible gold vark wrapping for royal palates.',
    costPrice: 80,
    sellingPrice: 220,
    stockQuantity: 18,
    lowStockThreshold: 8,
    unit: 'pieces',
    imageUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 5,
    isAvailableForOnline: true,
    ingredients: ['Gold Leaf Vark', 'Kashmiri Kesar', 'Kasturi Essence', 'Gulkand', 'Chuhara'],
    marginPercentage: 63.64,
    profitPerUnit: 140,
    tags: ['Luxury', 'VIP Specialty'],
    storeAllocations: { bopal: 3, gota: 8, sindhubhavan: 4, sg_highway: 3 },
  },
  {
    id: 'item-105',
    sku: 'PAN-CAL-05',
    barcode: '890100105',
    name: 'Calcutta Sada Paan (100% Tobacco-Free)',
    category: 'Paan',
    description: 'Classic rich bitter-sweet Calcutta betel leaf prepared with fragrant kathaa, chuna, cardamom, and gentle supari.',
    costPrice: 12,
    sellingPrice: 35,
    stockQuantity: 90,
    lowStockThreshold: 15,
    unit: 'pieces',
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 5,
    isAvailableForOnline: true,
    ingredients: ['Calcutta Mitha Leaf', 'Pure Kattha', 'Elachi Churna', 'Betel Nut flakes'],
    marginPercentage: 65.71,
    profitPerUnit: 23,
    tags: ['Classic', 'Digestive'],
    storeAllocations: { bopal: 25, gota: 35, sindhubhavan: 15, sg_highway: 15 },
  },

  // 2. 24x7 FRESH COFFEE & CAFE BREWS (Cafe Category)
  {
    id: 'item-cof-1',
    sku: 'COF-ESP-01',
    barcode: '890100601',
    name: 'Royal Dark Roast Espresso Double Shot',
    category: 'Cafe',
    description: 'Rich, aromatic double shot of 100% Arabica artisanal beans brewed fresh 24x7 with thick golden crema.',
    costPrice: 20,
    sellingPrice: 60,
    stockQuantity: 65,
    lowStockThreshold: 15,
    unit: 'cups',
    imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 5,
    isAvailableForOnline: true,
    ingredients: ['100% Arabica Roasted Beans', 'Purified Hot Spring Water'],
    marginPercentage: 66.67,
    profitPerUnit: 40,
    tags: ['24x7 Fresh', 'Espresso Bar', 'Hot Brew'],
    storeAllocations: { bopal: 15, gota: 25, sindhubhavan: 15, sg_highway: 10 },
  },
  {
    id: 'item-cof-2',
    sku: 'COF-CLD-02',
    barcode: '890100602',
    name: 'Richie Rich Chilled Hazelnut Cold Coffee (350ml)',
    category: 'Cafe',
    description: 'Signature thick cold coffee blended with roasted hazelnut syrup, full cream milk, and topped with chocolate curls.',
    costPrice: 45,
    sellingPrice: 120,
    stockQuantity: 48,
    lowStockThreshold: 12,
    unit: 'bottles',
    imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 5,
    isAvailableForOnline: true,
    ingredients: ['Espresso Decoction', 'Hazelnut Syrup', 'Creamy Milk', 'Ice', 'Cocoa Flakes'],
    marginPercentage: 62.5,
    profitPerUnit: 75,
    tags: ['Best Seller', 'Chilled', '24x7 Night Shift Hit'],
    storeAllocations: { bopal: 10, gota: 20, sindhubhavan: 10, sg_highway: 8 },
  },
  {
    id: 'item-cof-3',
    sku: 'COF-FLT-03',
    barcode: '890100603',
    name: 'Traditional South Indian Filter Kaapi',
    category: 'Cafe',
    description: 'Authentic frothy brass-dabara filter coffee made with chicory blend and bubbling boiled hot milk.',
    costPrice: 15,
    sellingPrice: 50,
    stockQuantity: 80,
    lowStockThreshold: 20,
    unit: 'cups',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 5,
    isAvailableForOnline: true,
    ingredients: ['South Indian Kaapi Blend', 'Boiled Milk', 'Brown Sugar'],
    marginPercentage: 70,
    profitPerUnit: 35,
    tags: ['Authentic', 'Frothy', 'Morning/Night Special'],
    storeAllocations: { bopal: 20, gota: 30, sindhubhavan: 15, sg_highway: 15 },
  },
  {
    id: 'item-cof-4',
    sku: 'COF-KRK-04',
    barcode: '890100604',
    name: 'Royal Karak Saffron Masala Chai (Kulhad)',
    category: 'Cafe',
    description: 'Slow-simmered Assam tea leaves with crushed cardamom, fresh ginger, cloves and infused with Kashmiri saffron strands in terracotta kulhad.',
    costPrice: 12,
    sellingPrice: 40,
    stockQuantity: 110,
    lowStockThreshold: 25,
    unit: 'kulhads',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 5,
    isAvailableForOnline: true,
    ingredients: ['Assam CTC Tea', 'Kesar Strands', 'Fresh Ginger', 'Cardamom', 'Cream Milk'],
    marginPercentage: 70,
    profitPerUnit: 28,
    tags: ['Kulhad Chai', 'All Night Special', 'Hot'],
    storeAllocations: { bopal: 25, gota: 45, sindhubhavan: 20, sg_highway: 20 },
  },
  {
    id: 'item-301',
    sku: 'SHK-KES-01',
    barcode: '890100301',
    name: 'Royal Kesar Badam Rich Shake (350ml)',
    category: 'Cafe',
    description: 'Rich full cream milk slow-boiled with real saffron strands, crushed almonds, pistachios and cardamom syrup.',
    costPrice: 55,
    sellingPrice: 130,
    stockQuantity: 36,
    lowStockThreshold: 10,
    unit: 'bottles',
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 5,
    isAvailableForOnline: true,
    ingredients: ['Full Cream Milk', 'Kashmiri Kesar', 'California Almonds', 'Pista', 'Elaichi'],
    marginPercentage: 57.69,
    profitPerUnit: 75,
    tags: ['Chilled', 'Rich Dryfruit'],
    storeAllocations: { bopal: 8, gota: 16, sindhubhavan: 6, sg_highway: 6 },
  },
  {
    id: 'item-302',
    sku: 'SHK-FAL-02',
    barcode: '890100302',
    name: 'Richie Rich Special Rose Gulkand Falooda',
    category: 'Cafe',
    description: 'Layered delicacy with basil sabja seeds, silky falooda vermicelli, organic rose gulkand, rabdi and vanilla ice cream scoop.',
    costPrice: 60,
    sellingPrice: 150,
    stockQuantity: 28,
    lowStockThreshold: 8,
    unit: 'glasses',
    imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 5,
    isAvailableForOnline: true,
    ingredients: ['Sabja Basil Seeds', 'Rose Syrup', 'Handmade Gulkand', 'Rabdi', 'Ice Cream'],
    marginPercentage: 60,
    profitPerUnit: 90,
    tags: ['Signature Drink', 'Dessert'],
    storeAllocations: { bopal: 6, gota: 12, sindhubhavan: 5, sg_highway: 5 },
  },

  // 3. 24x7 ESSENTIALS, MUKHWAS & REFRESHMENTS (Essentials Category)
  {
    id: 'item-ess-1',
    sku: 'ESS-SPR-01',
    barcode: '890100701',
    name: 'Cool Mint Pocket Mouth Freshener Spray (15ml)',
    category: 'Essentials',
    description: 'Pocket-sized instant breath refresher spray with cooling spearmint and long-lasting freshness for round-the-clock confidence.',
    costPrice: 40,
    sellingPrice: 90,
    stockQuantity: 38,
    lowStockThreshold: 10,
    unit: 'bottles',
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 18,
    isAvailableForOnline: true,
    ingredients: ['Spearmint Oil', 'Menthol Crystals', 'Aloe Vera Extract', 'Purified Aqua'],
    marginPercentage: 55.56,
    profitPerUnit: 50,
    tags: ['24x7 Essential', 'Pocket Size'],
    storeAllocations: { bopal: 8, gota: 16, sindhubhavan: 8, sg_highway: 6 },
  },
  {
    id: 'item-ess-2',
    sku: 'ESS-WAT-02',
    barcode: '890100702',
    name: 'Himalayan Natural Mineral Water (500ml Chilled)',
    category: 'Essentials',
    description: '100% natural alkaline mineral water sourced directly from Himalayan springs, served crisp and ice-cold 24x7.',
    costPrice: 15,
    sellingPrice: 30,
    stockQuantity: 120,
    lowStockThreshold: 30,
    unit: 'bottles',
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: false,
    taxRate: 0,
    isAvailableForOnline: true,
    ingredients: ['Natural Mineral Water', 'Electrolytes'],
    marginPercentage: 50,
    profitPerUnit: 15,
    tags: ['24x7 Hydration', 'Chilled', 'Tax Exempt'],
    storeAllocations: { bopal: 30, gota: 50, sindhubhavan: 20, sg_highway: 20 },
  },
  {
    id: 'item-ess-3',
    sku: 'ESS-ENR-03',
    barcode: '890100703',
    name: 'Red Bull Energy Drink (250ml Ice-Cold Can)',
    category: 'Essentials',
    description: 'Vitalizes body and mind for late-night drives and midnight study shifts.',
    costPrice: 90,
    sellingPrice: 125,
    stockQuantity: 52,
    lowStockThreshold: 15,
    unit: 'cans',
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 28,
    isAvailableForOnline: true,
    ingredients: ['Caffeine', 'Taurine', 'B-Group Vitamins', 'Alpine Water'],
    marginPercentage: 28,
    profitPerUnit: 35,
    tags: ['24x7 Night Owl', 'Energy Booster'],
    storeAllocations: { bopal: 12, gota: 22, sindhubhavan: 10, sg_highway: 8 },
  },
  {
    id: 'item-ess-4',
    sku: 'ESS-LGT-04',
    barcode: '890100704',
    name: 'Luxury Windproof Jet Flame Lighter (Refillable)',
    category: 'Essentials',
    description: 'Heavy metallic windproof jet lighter designed for outdoor use and high altitude performance.',
    costPrice: 65,
    sellingPrice: 150,
    stockQuantity: 26,
    lowStockThreshold: 6,
    unit: 'pieces',
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 18,
    isAvailableForOnline: true,
    ingredients: ['Zinc Alloy Body', 'Piezo Electric Ignition'],
    marginPercentage: 56.67,
    profitPerUnit: 85,
    tags: ['Accessories', 'Windproof'],
    storeAllocations: { bopal: 5, gota: 11, sindhubhavan: 5, sg_highway: 5 },
  },
  {
    id: 'item-201',
    sku: 'MUK-RAJ-01',
    barcode: '890100201',
    name: 'Royal Rajwadi Shahi Mukhwas (200g Jar)',
    category: 'Essentials',
    description: 'Artisanal blend of roasted fennel, candied melon seeds, silver coated cardamom pods, dried rose petals and amber glaze.',
    costPrice: 90,
    sellingPrice: 180,
    stockQuantity: 44,
    lowStockThreshold: 8,
    unit: 'jars',
    imageUrl: 'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 12,
    isAvailableForOnline: true,
    ingredients: ['Roasted Fennel', 'Silver Cardamom', 'Melon Seeds', 'Rose Petals', 'Sugar Crystals'],
    marginPercentage: 50,
    profitPerUnit: 90,
    tags: ['Packaging Jar', 'Digestive'],
    storeAllocations: { bopal: 10, gota: 18, sindhubhavan: 8, sg_highway: 8 },
  },
  {
    id: 'item-202',
    sku: 'MUK-KAS-02',
    barcode: '890100202',
    name: 'Kashmiri Saffron Flavoured Supari (100g)',
    category: 'Essentials',
    description: 'Finely sliced premium betel nuts treated in saffron water, rose essence and light menthol seasoning.',
    costPrice: 65,
    sellingPrice: 140,
    stockQuantity: 32,
    lowStockThreshold: 10,
    unit: 'pouches',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 12,
    isAvailableForOnline: true,
    ingredients: ['Betel Nut Slivers', 'Kashmiri Saffron extract', 'Menthol', 'Natural Fragrance'],
    marginPercentage: 53.57,
    profitPerUnit: 75,
    tags: ['Saffron', 'Premium Supari'],
    storeAllocations: { bopal: 7, gota: 14, sindhubhavan: 6, sg_highway: 5 },
  },
  {
    id: 'item-203',
    sku: 'MUK-CAL-03',
    barcode: '890100203',
    name: 'Calcutta Sweet Meethi Saunf (250g)',
    category: 'Essentials',
    description: 'Crisp green Lucknowi fennel seed coated with light sugar syrup and cooling peppermint.',
    costPrice: 40,
    sellingPrice: 95,
    stockQuantity: 55,
    lowStockThreshold: 12,
    unit: 'pouches',
    imageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 5,
    isAvailableForOnline: true,
    ingredients: ['Lucknowi Saunf', 'Sugar Coating', 'Peppermint Oil'],
    marginPercentage: 57.89,
    profitPerUnit: 55,
    tags: ['Family Pack', 'Sweet'],
    storeAllocations: { bopal: 12, gota: 23, sindhubhavan: 10, sg_highway: 10 },
  },
  {
    id: 'item-401',
    sku: 'CHO-TRU-01',
    barcode: '890100401',
    name: 'Handcrafted Paan Ganache Dark Truffles (Box of 6)',
    category: 'Essentials',
    description: '55% Belgian dark chocolate truffles oozing with creamy gulkand paan cream and sprinkled with silver dust.',
    costPrice: 110,
    sellingPrice: 260,
    stockQuantity: 22,
    lowStockThreshold: 6,
    unit: 'boxes',
    imageUrl: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 18,
    isAvailableForOnline: true,
    ingredients: ['Belgian Dark Chocolate', 'Betel Leaf Extract', 'Rose Petal Cream', 'Edible Silver Dust'],
    marginPercentage: 57.69,
    profitPerUnit: 150,
    tags: ['Gift Box', 'Luxury Confection'],
    storeAllocations: { bopal: 5, gota: 10, sindhubhavan: 4, sg_highway: 3 },
  },
  {
    id: 'item-501',
    sku: 'HER-MNT-01',
    barcode: '890100501',
    name: 'Herbal Molasses 100% Tobacco-Free (Pan Mint - 100g)',
    category: 'Essentials',
    description: 'Natural fruit molasses and sugar cane base infused with cooling icy mint and fresh paan essence.',
    costPrice: 85,
    sellingPrice: 195,
    stockQuantity: 25,
    lowStockThreshold: 5,
    unit: 'packs',
    imageUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
    isTaxApplicable: true,
    taxRate: 18,
    isAvailableForOnline: true,
    ingredients: ['Sugar Cane Molasses', 'Glycerine', 'Herbal Extracts', 'Paan Flavoring'],
    marginPercentage: 56.41,
    profitPerUnit: 110,
    tags: ['Herbal', '0% Tobacco'],
    storeAllocations: { bopal: 5, gota: 11, sindhubhavan: 5, sg_highway: 4 },
  },
];

// Initial Seed Customers
export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Rajesh Sharma',
    phone: '9820199882',
    email: 'rajesh.sharma@example.com',
    loyaltyPoints: 420,
    tier: 'Platinum Royal',
    totalSpent: 4200,
    totalOrders: 18,
    joinDate: '2026-01-10',
    preferences: ['Royal Maghai Meetha', 'No Supari', 'Extra Gulkand'],
  },
  {
    id: 'cust-2',
    name: 'Pooja Mehta',
    phone: '9876543210',
    email: 'pooja.mehta@example.com',
    loyaltyPoints: 185,
    tier: 'Gold',
    totalSpent: 1850,
    totalOrders: 9,
    joinDate: '2026-02-05',
    preferences: ['Signature Chocolate Fire Paan', 'Rose Gulkand Falooda'],
  },
  {
    id: 'cust-3',
    name: 'Amitabh Verma',
    phone: '9123456789',
    email: 'amitabh.v@example.com',
    loyaltyPoints: 80,
    tier: 'Silver',
    totalSpent: 800,
    totalOrders: 4,
    joinDate: '2026-02-14',
    preferences: ['Calcutta Sada Paan'],
  },
];

// Initial Promotions
export const INITIAL_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-1',
    code: 'ROYALPAN20',
    title: 'Flat 20% Off Specialty Paans',
    description: 'Get 20% discount on all Specialty and Fire Paan orders above ₹200.',
    discountType: 'percentage',
    discountValue: 20,
    minOrderAmount: 200,
    startDate: '2026-08-01',
    endDate: '2026-09-30',
    isActive: true,
    usageCount: 42,
    bannerColor: 'from-amber-600 to-emerald-700',
    targetTier: 'All',
  },
  {
    id: 'promo-2',
    code: 'FESTIVE50',
    title: '₹50 Cashback on Mukhwas & Shakes',
    description: 'Flat ₹50 instant deduction on combo orders above ₹300.',
    discountType: 'fixed',
    discountValue: 50,
    minOrderAmount: 300,
    startDate: '2026-08-10',
    endDate: '2026-09-15',
    isActive: true,
    usageCount: 19,
    bannerColor: 'from-emerald-700 to-teal-800',
    targetTier: 'All',
  },
  {
    id: 'promo-3',
    code: 'VIPROYALTY',
    title: 'Platinum Royal VIP 25% Off',
    description: 'Exclusive 25% discount for our top loyalty patrons on all orders.',
    discountType: 'percentage',
    discountValue: 25,
    minOrderAmount: 150,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    isActive: true,
    usageCount: 68,
    bannerColor: 'from-purple-800 to-amber-600',
    targetTier: 'Platinum Royal',
  },
];

// Helper to generate dynamic ISO timestamps for today and recent days
const getRelativeDateISO = (daysAgo: number, hours: number, minutes: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
};

// Initial Recent Orders with full Store & Salesperson details and mixed payment methods
export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1001',
    orderNumber: 'RR-2026-1001',
    source: 'pos_counter',
    storeId: 'gota',
    storeName: 'Richie Rich Pan House & Coffee Lounge - Gota Main',
    counterNumber: 1,
    counterName: 'Counter 1 (Royal Paan Special)',
    cashierName: 'Mahesh Solanki',
    customerId: 'cust-1',
    customerName: 'Rajesh Sharma',
    customerPhone: '9820199882',
    items: [
      { itemId: 'item-101', name: 'Royal Maghai Meetha Paan', sku: 'PAN-MAG-01', price: 50, costPrice: 20, quantity: 2, subtotal: 100, profit: 60, isTaxApplicable: true, taxRate: 5 },
      { itemId: 'item-301', name: 'Royal Kesar Badam Rich Shake (350ml)', sku: 'SHK-KES-01', price: 130, costPrice: 55, quantity: 1, subtotal: 130, profit: 75, isTaxApplicable: true, taxRate: 5 },
    ],
    subtotal: 230,
    discountAmount: 20,
    appliedPromoCode: 'ROYALPAN20',
    loyaltyPointsUsed: 0,
    loyaltyPointsEarned: 21,
    taxAmount: 10.5,
    grandTotal: 220.5,
    totalCost: 95,
    totalProfit: 125.5,
    paymentMethod: 'upi_qr',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: getRelativeDateISO(0, 9, 30), // Today 09:30 AM
  },
  {
    id: 'ord-1002',
    orderNumber: 'RR-2026-1002',
    source: 'customer_online',
    storeId: 'gota',
    storeName: 'Richie Rich Pan House & Coffee Lounge - Gota Main',
    customerId: 'cust-2',
    customerName: 'Pooja Mehta',
    customerPhone: '9876543210',
    items: [
      { itemId: 'item-102', name: 'Signature Chocolate Fire Paan', sku: 'PAN-FIR-02', price: 110, costPrice: 45, quantity: 2, subtotal: 220, profit: 130, isTaxApplicable: true, taxRate: 5 },
      { itemId: 'item-401', name: 'Handcrafted Paan Ganache Dark Truffles (Box of 6)', sku: 'CHO-TRU-01', price: 260, costPrice: 110, quantity: 1, subtotal: 260, profit: 150, isTaxApplicable: true, taxRate: 18 },
    ],
    subtotal: 480,
    discountAmount: 50,
    appliedPromoCode: 'FESTIVE50',
    loyaltyPointsUsed: 0,
    loyaltyPointsEarned: 43,
    taxAmount: 42.5,
    grandTotal: 472.5,
    totalCost: 200,
    totalProfit: 272.5,
    paymentMethod: 'card',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: getRelativeDateISO(0, 10, 45), // Today 10:45 AM
    notes: 'Please pack in insulated cool pouch.',
    cashierName: 'Online Direct App',
  },
  {
    id: 'ord-1003',
    orderNumber: 'RR-2026-1003',
    source: 'pos_counter',
    storeId: 'bopal',
    storeName: 'Richie Rich Pan House - Bopal Branch',
    counterNumber: 1,
    counterName: 'Counter 1 (Main Billing)',
    cashierName: 'Karan Patel',
    customerId: 'cust-3',
    customerName: 'Amitabh Verma',
    customerPhone: '9123456789',
    items: [
      { itemId: 'item-105', name: 'Calcutta Sada Paan', sku: 'PAN-CAL-05', price: 35, costPrice: 12, quantity: 3, subtotal: 105, profit: 69, isTaxApplicable: true, taxRate: 5 },
      { itemId: 'item-cof-1', name: 'Royal Dark Roast Espresso Double Shot', sku: 'COF-ESP-01', price: 60, costPrice: 20, quantity: 1, subtotal: 60, profit: 40, isTaxApplicable: true, taxRate: 5 },
      { itemId: 'item-201', name: 'Royal Rajwadi Shahi Mukhwas (200g Jar)', sku: 'MUK-RAJ-01', price: 180, costPrice: 90, quantity: 1, subtotal: 180, profit: 90, isTaxApplicable: true, taxRate: 12 },
    ],
    subtotal: 345,
    discountAmount: 0,
    loyaltyPointsUsed: 0,
    loyaltyPointsEarned: 35,
    taxAmount: 29.85,
    grandTotal: 374.85,
    totalCost: 146,
    totalProfit: 228.85,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: getRelativeDateISO(0, 11, 20), // Today 11:20 AM
  },
  {
    id: 'ord-1004',
    orderNumber: 'RR-2026-1004',
    source: 'pos_counter',
    storeId: 'sindhubhavan',
    storeName: 'Richie Rich Pan & Espresso Lounge - Sindhubhavan Road',
    counterNumber: 1,
    counterName: 'Counter 1 (VIP Pan Lounge)',
    cashierName: 'Pritesh Dave',
    customerName: 'Vikram Sarabhai',
    customerPhone: '9988776655',
    items: [
      { itemId: 'item-104', name: 'Kesar Kasturi Gold Vark Paan', sku: 'PAN-SLV-04', price: 220, costPrice: 80, quantity: 2, subtotal: 440, profit: 280, isTaxApplicable: true, taxRate: 5 },
      { itemId: 'item-cof-2', name: 'Richie Rich Chilled Hazelnut Cold Coffee (350ml)', sku: 'COF-CLD-02', price: 120, costPrice: 45, quantity: 2, subtotal: 240, profit: 150, isTaxApplicable: true, taxRate: 5 },
    ],
    subtotal: 680,
    discountAmount: 50,
    loyaltyPointsUsed: 0,
    loyaltyPointsEarned: 68,
    taxAmount: 31.5,
    grandTotal: 661.5,
    totalCost: 250,
    totalProfit: 411.5,
    paymentMethod: 'upi_qr',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: getRelativeDateISO(0, 13, 10), // Today 01:10 PM
  },
  {
    id: 'ord-1005',
    orderNumber: 'RR-2026-1005',
    source: 'pos_counter',
    storeId: 'sg_highway',
    storeName: 'Richie Rich Express Drive-Thru - SG Highway',
    counterNumber: 1,
    counterName: 'Counter 1 (Express Highway Window)',
    cashierName: 'Vikram Rajput',
    customerName: 'Hardik Shah',
    customerPhone: '9898012345',
    items: [
      { itemId: 'item-ess-3', name: 'Red Bull Energy Drink (250ml Ice-Cold Can)', sku: 'ESS-ENR-03', price: 125, costPrice: 90, quantity: 2, subtotal: 250, profit: 70, isTaxApplicable: true, taxRate: 28 },
      { itemId: 'item-ess-1', name: 'Cool Mint Pocket Mouth Freshener Spray (15ml)', sku: 'ESS-SPR-01', price: 90, costPrice: 40, quantity: 1, subtotal: 90, profit: 50, isTaxApplicable: true, taxRate: 18 },
      { itemId: 'item-ess-2', name: 'Himalayan Natural Mineral Water (500ml Chilled)', sku: 'ESS-WAT-02', price: 30, costPrice: 15, quantity: 2, subtotal: 60, profit: 30, isTaxApplicable: false, taxRate: 0 },
    ],
    subtotal: 400,
    discountAmount: 0,
    loyaltyPointsUsed: 0,
    loyaltyPointsEarned: 40,
    taxAmount: 86.2,
    grandTotal: 486.2,
    totalCost: 250,
    totalProfit: 236.2,
    paymentMethod: 'card',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: getRelativeDateISO(0, 14, 45), // Today 02:45 PM
  },
  {
    id: 'ord-1006',
    orderNumber: 'RR-2026-1006',
    source: 'pos_counter',
    storeId: 'gota',
    storeName: 'Richie Rich Pan House & Coffee Lounge - Gota Main',
    counterNumber: 2,
    counterName: 'Counter 2 (Beverages & Shakes)',
    cashierName: 'Jayesh Patel',
    customerName: 'Ananya Desai',
    customerPhone: '9879512345',
    items: [
      { itemId: 'item-302', name: 'Belgian Chocolate Thick Shake', sku: 'SHK-CHO-02', price: 140, costPrice: 50, quantity: 2, subtotal: 280, profit: 180, isTaxApplicable: true, taxRate: 5 },
      { itemId: 'item-103', name: 'Silver Coated Navratan Sweet Paan', sku: 'PAN-NAV-03', price: 80, costPrice: 30, quantity: 2, subtotal: 160, profit: 100, isTaxApplicable: true, taxRate: 5 },
    ],
    subtotal: 440,
    discountAmount: 0,
    loyaltyPointsUsed: 0,
    loyaltyPointsEarned: 44,
    taxAmount: 22.0,
    grandTotal: 462.0,
    totalCost: 160,
    totalProfit: 302.0,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: getRelativeDateISO(0, 15, 30), // Today 03:30 PM
  },
  {
    id: 'ord-1007',
    orderNumber: 'RR-2026-1007',
    source: 'pos_counter',
    storeId: 'bopal',
    storeName: 'Richie Rich Pan House - Bopal Branch',
    counterNumber: 1,
    counterName: 'Counter 1 (Main Billing)',
    cashierName: 'Karan Patel',
    customerName: 'Nikhil Trivedi',
    customerPhone: '9426011223',
    items: [
      { itemId: 'item-101', name: 'Royal Maghai Meetha Paan', sku: 'PAN-MAG-01', price: 50, costPrice: 20, quantity: 4, subtotal: 200, profit: 120, isTaxApplicable: true, taxRate: 5 },
      { itemId: 'item-cof-1', name: 'Royal Dark Roast Espresso Double Shot', sku: 'COF-ESP-01', price: 60, costPrice: 20, quantity: 2, subtotal: 120, profit: 80, isTaxApplicable: true, taxRate: 5 },
    ],
    subtotal: 320,
    discountAmount: 20,
    appliedPromoCode: 'ROYALPAN20',
    loyaltyPointsUsed: 0,
    loyaltyPointsEarned: 30,
    taxAmount: 15.0,
    grandTotal: 315.0,
    totalCost: 120,
    totalProfit: 195.0,
    paymentMethod: 'upi_qr',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: getRelativeDateISO(0, 16, 15), // Today 04:15 PM
  },
  {
    id: 'ord-1008',
    orderNumber: 'RR-2026-1008',
    source: 'pos_counter',
    storeId: 'sindhubhavan',
    storeName: 'Richie Rich Pan & Espresso Lounge - Sindhubhavan Road',
    counterNumber: 1,
    counterName: 'Counter 1 (VIP Pan Lounge)',
    cashierName: 'Pritesh Dave',
    customerName: 'Sunil Mittal',
    customerPhone: '9712988334',
    items: [
      { itemId: 'item-401', name: 'Handcrafted Paan Ganache Dark Truffles (Box of 6)', sku: 'CHO-TRU-01', price: 260, costPrice: 110, quantity: 2, subtotal: 520, profit: 300, isTaxApplicable: true, taxRate: 18 },
    ],
    subtotal: 520,
    discountAmount: 0,
    loyaltyPointsUsed: 0,
    loyaltyPointsEarned: 52,
    taxAmount: 93.6,
    grandTotal: 613.6,
    totalCost: 220,
    totalProfit: 393.6,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: getRelativeDateISO(0, 17, 0), // Today 05:00 PM
  },
  {
    id: 'ord-1009',
    orderNumber: 'RR-2026-1009',
    source: 'pos_counter',
    storeId: 'gota',
    storeName: 'Richie Rich Pan House & Coffee Lounge - Gota Main',
    counterNumber: 1,
    counterName: 'Counter 1 (Royal Paan Special)',
    cashierName: 'Mahesh Solanki',
    customerName: 'Rohan Mehra',
    customerPhone: '9925044556',
    items: [
      { itemId: 'item-102', name: 'Signature Chocolate Fire Paan', sku: 'PAN-FIR-02', price: 110, costPrice: 45, quantity: 3, subtotal: 330, profit: 195, isTaxApplicable: true, taxRate: 5 },
      { itemId: 'item-cof-2', name: 'Richie Rich Chilled Hazelnut Cold Coffee (350ml)', sku: 'COF-CLD-02', price: 120, costPrice: 45, quantity: 1, subtotal: 120, profit: 75, isTaxApplicable: true, taxRate: 5 },
    ],
    subtotal: 450,
    discountAmount: 0,
    loyaltyPointsUsed: 0,
    loyaltyPointsEarned: 45,
    taxAmount: 22.5,
    grandTotal: 472.5,
    totalCost: 180,
    totalProfit: 292.5,
    paymentMethod: 'card',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: getRelativeDateISO(1, 19, 20), // Yesterday
  },
  {
    id: 'ord-1010',
    orderNumber: 'RR-2026-1010',
    source: 'pos_counter',
    storeId: 'sg_highway',
    storeName: 'Richie Rich Express Drive-Thru - SG Highway',
    counterNumber: 1,
    counterName: 'Counter 1 (Express Highway Window)',
    cashierName: 'Vikram Rajput',
    customerName: 'Chirag Vyas',
    customerPhone: '9879022334',
    items: [
      { itemId: 'item-201', name: 'Royal Rajwadi Shahi Mukhwas (200g Jar)', sku: 'MUK-RAJ-01', price: 180, costPrice: 90, quantity: 2, subtotal: 360, profit: 180, isTaxApplicable: true, taxRate: 12 },
    ],
    subtotal: 360,
    discountAmount: 0,
    loyaltyPointsUsed: 0,
    loyaltyPointsEarned: 36,
    taxAmount: 43.2,
    grandTotal: 403.2,
    totalCost: 180,
    totalProfit: 223.2,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    status: 'completed',
    createdAt: getRelativeDateISO(2, 18, 10), // 2 days ago
  },
];

// Initial System Notifications
export const INITIAL_NOTIFICATIONS: PushNotification[] = [
  {
    id: 'notif-1',
    title: '⚠️ Low Stock Alert: Signature Chocolate Fire Paan',
    message: 'Current stock is 8 pieces, which is below the minimum threshold (12 pieces). Reorder soon!',
    type: 'low_stock',
    timestamp: '2026-08-22T06:00:00.000Z',
    targetRole: 'admin',
    read: false,
    linkTab: 'inventory',
  },
  {
    id: 'notif-2',
    title: '⚠️ Low Stock Alert: Kesar Kasturi Gold Vark Paan',
    message: 'Current stock is only 5 units remaining (threshold: 8). High profit margin item!',
    type: 'low_stock',
    timestamp: '2026-08-22T06:10:00.000Z',
    targetRole: 'admin',
    read: false,
    linkTab: 'inventory',
  },
  {
    id: 'notif-3',
    title: '👑 Loyalty Tier Upgrade: Rajesh Sharma',
    message: 'Customer Rajesh Sharma has reached Platinum Royal status with over 4,000 points earned!',
    type: 'loyalty_reward',
    timestamp: '2026-08-22T06:15:00.000Z',
    targetRole: 'admin',
    read: false,
    linkTab: 'loyalty',
  },
  {
    id: 'notif-4',
    title: '💾 Automated Daily Database Backup Successful',
    message: 'System snapshot generated and stored safely at 12:00 AM. 12 catalog items and records archived.',
    type: 'system_backup',
    timestamp: '2026-08-22T00:00:00.000Z',
    targetRole: 'admin',
    read: true,
    linkTab: 'backups',
  },
];

// Cross-tab real-time sync via BroadcastChannel
let syncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    syncChannel = new BroadcastChannel('richie_rich_sync_bus');
  }
} catch (e) {
  console.warn('BroadcastChannel not supported', e);
}

export class StorageService {
  private static instance: StorageService;
  private listeners: Set<() => void> = new Set();
  private memoryCache: Map<string, any> = new Map();
  private isNotifyPending = false;

  private constructor() {
    this.initDefaultData();
    this.setupSyncListener();
    this.checkDailyBackupScheduler();
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  getCached<T>(key: string, loader: () => T): T {
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key) as T;
    }
    const val = loader();
    this.memoryCache.set(key, val);
    return val;
  }

  setCached<T>(key: string, val: T): void {
    this.memoryCache.set(key, val);
  }

  invalidateCache(key?: string): void {
    if (key) {
      this.memoryCache.delete(key);
    } else {
      this.memoryCache.clear();
    }
  }

  // Subscribe to real-time changes
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  notifySubscribers() {
    this.notify();
  }

  private notify() {
    if (this.isNotifyPending) return;
    this.isNotifyPending = true;
    queueMicrotask(() => {
      this.isNotifyPending = false;
      this.listeners.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.error('Subscriber error in storage:', err);
        }
      });
      if (syncChannel) {
        try {
          syncChannel.postMessage({ type: 'STATE_CHANGED', timestamp: Date.now() });
        } catch {
          // ignore
        }
      }
    });
  }

  private setupSyncListener() {
    if (typeof window === 'undefined') return;

    if (syncChannel) {
      syncChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'STATE_CHANGED') {
          this.memoryCache.clear();
          this.notify();
        }
      };
    }

    // Also listen to storage event as fallback
    window.addEventListener('storage', (e) => {
      if (e.key && (Object.values(STORAGE_KEYS).includes(e.key) || e.key.startsWith('rr_'))) {
        this.memoryCache.clear();
        this.notify();
      }
    });
  }

  private initDefaultData() {
    if (typeof window === 'undefined') return;

    // Check and seed/merge inventory
    const existingInventory = safeStorage.getItem(STORAGE_KEYS.INVENTORY);
    const cleanedFlag = safeStorage.getItem('rr_wh_cleaned_dummy_v1');

    if (!existingInventory) {
      const zeroStockInit = INITIAL_INVENTORY.map((item) => ({
        ...item,
        category: normalizeProductCategory(item.category),
        stockQuantity: 0,
        storeAllocations: { bopal: 0, gota: 0, sindhubhavan: 0, sg_highway: 0 },
      }));
      safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(zeroStockInit));
    } else {
      try {
        const parsed: InventoryItem[] = JSON.parse(existingInventory);
        let hasChanges = false;

        // One-time cleanup of all dummy stock quantities
        if (!cleanedFlag) {
          parsed.forEach((item) => {
            item.stockQuantity = 0;
            item.storeAllocations = { bopal: 0, gota: 0, sindhubhavan: 0, sg_highway: 0 };
          });
          hasChanges = true;
          safeStorage.setItem('rr_wh_cleaned_dummy_v1', 'true');
        }

        // Deduplicate any items with duplicate IDs or duplicate SKUs
        const seenIds = new Set<string>();
        const seenSkus = new Set<string>();
        const uniqueParsed: InventoryItem[] = [];

        parsed.forEach((item, idx) => {
          if (!item) return;
          let id = item.id ? String(item.id).trim() : '';
          const sku = item.sku ? String(item.sku).trim().toLowerCase() : '';

          if (!id || seenIds.has(id)) {
            id = `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${idx}`;
            item.id = id;
            hasChanges = true;
          }
          seenIds.add(id);

          if (sku) {
            if (seenSkus.has(sku)) {
              // Disambiguate duplicate SKU
              item.sku = `${item.sku}-${idx + 1}`;
              hasChanges = true;
            }
            seenSkus.add(item.sku.trim().toLowerCase());
          }

          uniqueParsed.push(item);
        });

        // Upgrade existing inventory items with 3 canonical categories (Paan, Cafe, or Essentials), GST tax rates, vendors, brand, and price type
        uniqueParsed.forEach((item) => {
          const normalizedCat = normalizeProductCategory(item.category);
          if (item.category !== normalizedCat) {
            item.category = normalizedCat;
            hasChanges = true;
          }
          if (item.taxRate === undefined) {
            item.isTaxApplicable = item.isTaxApplicable !== false;
            item.taxRate = item.isTaxApplicable ? (item.category === 'Paan' ? 5 : item.category === 'Cafe' ? 5 : 18) : 0;
            hasChanges = true;
          }
          if (!item.brand) {
            item.brand = 'Richie Rich Signature';
            hasChanges = true;
          }
          if (!item.priceType) {
            item.priceType = item.sellingPrice === 0 ? 'variable' : 'fixed';
            hasChanges = true;
          }
          if (!item.status) {
            item.status = 'active';
            hasChanges = true;
          }
          if (!item.vendors || item.vendors.length === 0) {
            if (item.vendor) {
              item.vendors = [item.vendor];
            } else if (item.category === 'Paan') {
              item.vendors = ['Gujarat Betel Traders', 'Royal Luxury Packaging & Vark'];
              item.vendor = 'Gujarat Betel Traders';
            } else if (item.category === 'Cafe') {
              item.vendors = ['Apex Cafe & Beverage Distributors'];
              item.vendor = 'Apex Cafe & Beverage Distributors';
            } else {
              item.vendors = ['Shreeji Spices & Supari'];
              item.vendor = 'Shreeji Spices & Supari';
            }
            hasChanges = true;
          } else if (!item.vendor) {
            item.vendor = item.vendors[0];
            hasChanges = true;
          }
        });

        // Ensure catalog items exist
        INITIAL_INVENTORY.forEach((initItem) => {
          const found = uniqueParsed.find((i) => i.id === initItem.id || i.sku === initItem.sku);
          if (!found) {
            uniqueParsed.push({
              ...initItem,
              category: normalizeProductCategory(initItem.category),
              stockQuantity: 0,
              storeAllocations: { bopal: 0, gota: 0, sindhubhavan: 0, sg_highway: 0 },
            });
            hasChanges = true;
          }
        });

        if (hasChanges || uniqueParsed.length !== parsed.length) {
          safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(uniqueParsed));
        }
      } catch {
        const zeroStockInit = INITIAL_INVENTORY.map((item) => ({
          ...item,
          category: normalizeProductCategory(item.category),
          stockQuantity: 0,
          storeAllocations: { bopal: 0, gota: 0, sindhubhavan: 0, sg_highway: 0 },
        }));
        safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(zeroStockInit));
      }
    }

    // Always ensure categories are Paan, Cafe, Essentials
    safeStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));

    if (!safeStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      safeStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.ORDERS)) {
      safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.PROMOTIONS)) {
      safeStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(INITIAL_PROMOTIONS));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)) {
      safeStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
    }
    if (!safeStorage.getItem(STORAGE_KEYS.BACKUPS)) {
      // Seed initial baseline backup
      const baselineBackup: BackupSnapshot = {
        id: 'backup-init-1',
        timestamp: '2026-08-22T00:00:00.000Z',
        type: 'automated_daily',
        itemCount: INITIAL_INVENTORY.length,
        orderCount: INITIAL_ORDERS.length,
        customerCount: INITIAL_CUSTOMERS.length,
        fileSizeKb: 14.8,
        checksum: 'SHA256-RR-0012A',
        dataJson: JSON.stringify({
          inventory: INITIAL_INVENTORY,
          orders: INITIAL_ORDERS,
          customers: INITIAL_CUSTOMERS,
          promotions: INITIAL_PROMOTIONS,
        }),
      };
      safeStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify([baselineBackup]));
    }

    // Check stores and counters
    const existingStores = safeStorage.getItem(STORAGE_KEYS.STORES);
    if (!existingStores) {
      safeStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(INITIAL_STORES));
    }

    // Check store admins
    if (!safeStorage.getItem(STORAGE_KEYS.STORE_ADMINS)) {
      safeStorage.setItem(STORAGE_KEYS.STORE_ADMINS, JSON.stringify(INITIAL_STORE_ADMINS));
    }

    // Check store expenses
    if (!safeStorage.getItem(STORAGE_KEYS.STORE_EXPENSES)) {
      safeStorage.setItem(STORAGE_KEYS.STORE_EXPENSES, JSON.stringify(INITIAL_STORE_EXPENSES));
    }
  }

  // --- MULTI-STORE & POS COUNTER / SALESPERSON MANAGEMENT METHODS ---

  getStores(): StoreLocation[] {
    return this.getCached(STORAGE_KEYS.STORES, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.STORES);
        if (!data) return INITIAL_STORES;
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_STORES;
      } catch {
        return INITIAL_STORES;
      }
    });
  }

  saveStores(stores: StoreLocation[]): void {
    this.setCached(STORAGE_KEYS.STORES, stores);
    safeStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
    this.notify();
  }

  getStoreById(storeId: string): StoreLocation | undefined {
    const stores = this.getStores();
    return stores.find((s) => s.id === storeId);
  }

  updateStore(storeId: string, updates: Partial<StoreLocation>): StoreLocation | null {
    const stores = this.getStores();
    const store = stores.find((s) => s.id === storeId);
    if (!store) return null;

    Object.assign(store, updates);
    this.saveStores(stores);

    this.addNotification({
      title: `🏪 Store Details Updated`,
      message: `Updated details for ${store.name} (${store.shortName}).`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });

    return store;
  }

  addCounter(
    storeId: string,
    counterData: { name: string; cashierName: string; defaultPin: string; shift: string; phone?: string }
  ): CounterInfo | null {
    const stores = this.getStores();
    const store = stores.find((s) => s.id === storeId);
    if (!store) return null;

    const maxId = store.counters.reduce((max, c) => Math.max(max, c.id), 0);
    const newCounterId = maxId + 1;

    const newCounter: CounterInfo = {
      id: newCounterId,
      name: counterData.name || `Counter ${newCounterId} (${counterData.cashierName})`,
      cashierName: counterData.cashierName,
      defaultPin: counterData.defaultPin || `${store.counters.length + 1}001`,
      shift: counterData.shift || '24x7 Active (General Shift)',
      phone: counterData.phone || '',
      isActive: true,
    };

    store.counters.push(newCounter);
    store.countersCount = store.counters.length;

    this.saveStores(stores);

    this.addNotification({
      title: `👤 Salesperson & Counter Added`,
      message: `Added ${newCounter.cashierName} to ${store.shortName} (${newCounter.name}) with PIN ${newCounter.defaultPin}.`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });

    return newCounter;
  }

  updateCounter(
    storeId: string,
    counterId: number,
    updates: Partial<CounterInfo>
  ): CounterInfo | null {
    const stores = this.getStores();
    const store = stores.find((s) => s.id === storeId);
    if (!store) return null;

    const counter = store.counters.find((c) => c.id === counterId);
    if (!counter) return null;

    const oldPin = counter.defaultPin;
    const oldCashier = counter.cashierName;

    Object.assign(counter, updates);

    this.saveStores(stores);

    if (updates.defaultPin && updates.defaultPin !== oldPin) {
      this.addNotification({
        title: `🔑 POS Login PIN Changed`,
        message: `PIN for ${counter.cashierName} (${store.shortName} - Counter ${counter.id}) updated to ${updates.defaultPin}.`,
        type: 'order_update',
        targetRole: 'admin',
        read: false,
      });
    }

    if (updates.cashierName && updates.cashierName !== oldCashier) {
      this.addNotification({
        title: `👤 Salesperson Updated`,
        message: `Assigned ${updates.cashierName} in place of ${oldCashier} at ${store.shortName} Counter ${counter.id}.`,
        type: 'order_update',
        targetRole: 'admin',
        read: false,
      });
    }

    return counter;
  }

  deleteCounter(storeId: string, counterId: number): boolean {
    const stores = this.getStores();
    const store = stores.find((s) => s.id === storeId);
    if (!store) return false;

    if (store.counters.length <= 1) {
      alert('Cannot delete the only remaining counter for this store outlet.');
      return false;
    }

    const removedCounter = store.counters.find((c) => c.id === counterId);
    store.counters = store.counters.filter((c) => c.id !== counterId);
    store.countersCount = store.counters.length;

    this.saveStores(stores);

    if (removedCounter) {
      this.addNotification({
        title: `🗑️ Salesperson / Counter Removed`,
        message: `Removed ${removedCounter.cashierName} (${removedCounter.name}) from ${store.shortName}.`,
        type: 'order_update',
        targetRole: 'admin',
        read: false,
      });
    }

    return true;
  }

  changeCounterPin(storeId: string, counterId: number, newPin: string): boolean {
    return !!this.updateCounter(storeId, counterId, { defaultPin: newPin });
  }

  updateCounterPin(storeId: string, counterId: number, newPin: string): boolean {
    return this.changeCounterPin(storeId, counterId, newPin);
  }

  updateCounterDetails(storeId: string, counterId: number, updates: Partial<CounterInfo>): boolean {
    return !!this.updateCounter(storeId, counterId, updates);
  }

  getActivePOSSession(): POSSession | null {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.POS_SESSION);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  setActivePOSSession(session: POSSession): void {
    safeStorage.setItem(STORAGE_KEYS.POS_SESSION, JSON.stringify(session));
    this.notify();
  }

  clearPOSSession(): void {
    safeStorage.removeItem(STORAGE_KEYS.POS_SESSION);
    this.notify();
  }

  transferStock(itemId: string, fromStoreId: string, toStoreId: string, quantity: number): boolean {
    if (quantity <= 0 || fromStoreId === toStoreId) return false;
    const items = this.getInventory();
    const item = items.find((i) => i.id === itemId);
    if (!item) return false;

    if (!item.storeAllocations) {
      item.storeAllocations = {};
    }

    const fromQty = item.storeAllocations[fromStoreId] || 0;
    if (fromQty < quantity) return false;

    item.storeAllocations[fromStoreId] = fromQty - quantity;
    item.storeAllocations[toStoreId] = (item.storeAllocations[toStoreId] || 0) + quantity;

    this.saveInventory(items);

    const fromStoreName = this.getStoreById(fromStoreId)?.shortName || fromStoreId;
    const toStoreName = this.getStoreById(toStoreId)?.shortName || toStoreId;

    this.addNotification({
      title: `📦 Stock Inter-Store Transfer Complete`,
      message: `Transferred ${quantity} ${item.unit} of "${item.name}" from ${fromStoreName} to ${toStoreName}.`,
      type: 'low_stock',
      targetRole: 'admin',
      read: false,
      linkTab: 'inventory',
    });

    return true;
  }

  // Automated 12:00 AM daily backup scheduler simulation
  checkDailyBackupScheduler() {
    if (typeof window === 'undefined') return;

    const todayStr = new Date().toISOString().split('T')[0];
    const lastBackup = safeStorage.getItem(STORAGE_KEYS.LAST_BACKUP_DATE);

    if (lastBackup !== todayStr) {
      this.createBackup('automated_daily', `Automated daily backup for ${todayStr} (12:00 AM Cycle)`);
      safeStorage.setItem(STORAGE_KEYS.LAST_BACKUP_DATE, todayStr);
    }
  }

  // --- INVENTORY METHODS ---

  getInventory(): InventoryItem[] {
    return this.getCached(STORAGE_KEYS.INVENTORY, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.INVENTORY);
        if (!data) return INITIAL_INVENTORY;
        const rawList: any = JSON.parse(data);
        if (!Array.isArray(rawList)) return INITIAL_INVENTORY;

        const seenIds = new Set<string>();
        const seenSkus = new Set<string>();
        const sanitized: InventoryItem[] = [];
        let hadDuplicatesOrUnnormalized = false;

        for (let i = 0; i < rawList.length; i++) {
          const item = rawList[i];
          if (!item || typeof item !== 'object') continue;

          let itemId = item.id ? String(item.id).trim() : '';
          const itemSku = item.sku ? String(item.sku).trim().toLowerCase() : '';

          // If duplicate ID or empty ID
          if (!itemId || seenIds.has(itemId)) {
            itemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${i}`;
            item.id = itemId;
            hadDuplicatesOrUnnormalized = true;
          }

          // If duplicate SKU, disambiguate
          if (itemSku && seenSkus.has(itemSku)) {
            item.sku = `${item.sku}-${i + 1}`;
            hadDuplicatesOrUnnormalized = true;
          }

          // Normalize Category: Any category other than Paan or Cafe is automatically kept in Essentials
          const normalizedCategory = normalizeProductCategory(item.category);
          if (item.category !== normalizedCategory) {
            item.category = normalizedCategory;
            hadDuplicatesOrUnnormalized = true;
          }

          seenIds.add(itemId);
          if (item.sku) seenSkus.add(item.sku.trim().toLowerCase());

          sanitized.push(item);
        }

        if (hadDuplicatesOrUnnormalized && typeof window !== 'undefined') {
          try {
            safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(sanitized));
          } catch {
            // ignore storage quota errors
          }
        }

        return sanitized;
      } catch {
        return INITIAL_INVENTORY;
      }
    });
  }

  saveInventory(items: InventoryItem[]) {
    // calculate profit and margin on each item and guarantee unique IDs & normalized categories
    const seenIds = new Set<string>();
    const seenSkus = new Set<string>();
    const sanitized: InventoryItem[] = [];

    items.forEach((item, idx) => {
      let itemId = item.id ? String(item.id).trim() : '';
      if (!itemId || seenIds.has(itemId)) {
        itemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${idx}`;
      }
      seenIds.add(itemId);

      let itemSku = item.sku ? String(item.sku).trim() : `SKU-${idx + 1}`;
      if (seenSkus.has(itemSku.toLowerCase())) {
        itemSku = `${itemSku}-${idx + 1}`;
      }
      seenSkus.add(itemSku.toLowerCase());

      const category = normalizeProductCategory(item.category);
      const profitPerUnit = item.sellingPrice - item.costPrice;
      const marginPercentage = item.sellingPrice > 0 ? (profitPerUnit / item.sellingPrice) * 100 : 0;
      sanitized.push({
        ...item,
        id: itemId,
        sku: itemSku,
        category,
        profitPerUnit: Math.round(profitPerUnit * 100) / 100,
        marginPercentage: Math.round(marginPercentage * 10) / 10,
      });
    });

    this.setCached(STORAGE_KEYS.INVENTORY, sanitized);
    safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(sanitized));
    this.checkAndTriggerLowStockAlerts(sanitized);
    this.notify();
  }

  addInventoryItem(item: Omit<InventoryItem, 'id' | 'profitPerUnit' | 'marginPercentage'>): InventoryItem {
    const items = this.getInventory();
    const normalizedCategory = normalizeProductCategory(item.category);
    const newItem: InventoryItem = {
      ...item,
      category: normalizedCategory,
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      profitPerUnit: item.sellingPrice - item.costPrice,
      marginPercentage: Math.round(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 1000) / 10,
    };
    items.unshift(newItem);
    this.saveInventory(items);
    return newItem;
  }

  updateInventoryItem(id: string, updates: Partial<InventoryItem>): InventoryItem | null {
    const items = this.getInventory();
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) return null;

    const current = items[index];
    const updated: InventoryItem = { ...current, ...updates };
    if (updates.category !== undefined) {
      updated.category = normalizeProductCategory(updates.category);
    }
    updated.profitPerUnit = updated.sellingPrice - updated.costPrice;
    updated.marginPercentage =
      updated.sellingPrice > 0
        ? Math.round(((updated.sellingPrice - updated.costPrice) / updated.sellingPrice) * 1000) / 10
        : 0;

    items[index] = updated;
    this.saveInventory(items);
    return updated;
  }

  deleteInventoryItem(id: string): boolean {
    const items = this.getInventory();
    const filtered = items.filter((i) => i.id !== id);
    if (filtered.length !== items.length) {
      this.saveInventory(filtered);
      return true;
    }
    return false;
  }

  importInventoryBatch(
    parsedItems: Array<{
      isUpdate: boolean;
      existingId?: string;
      name: string;
      sku: string;
      barcode: string;
      category: string;
      brand: string;
      vendors: string[];
      vendor: string;
      priceType: 'fixed' | 'variable';
      costPrice: number;
      sellingPrice: number;
      stockQuantity: number;
      lowStockThreshold: number;
      unit: string;
      isTaxApplicable: boolean;
      taxRate: number;
      status: 'active' | 'inactive';
      description: string;
      imageUrl?: string;
    }>,
    options: { updateExisting: boolean } = { updateExisting: true }
  ): { importedCount: number; updatedCount: number } {
    const currentInventory = this.getInventory();
    let importedCount = 0;
    let updatedCount = 0;

    // Track newly added/updated items during batch to avoid intra-batch duplicate creations
    const skuIndexMap = new Map<string, number>();
    const idIndexMap = new Map<string, number>();

    currentInventory.forEach((item, idx) => {
      if (item.id) idIndexMap.set(item.id, idx);
      if (item.sku) skuIndexMap.set(item.sku.trim().toLowerCase(), idx);
    });

    parsedItems.forEach((row, rowIdx) => {
      const cleanSku = row.sku ? row.sku.trim().toLowerCase() : '';
      const normalizedCat = normalizeProductCategory(row.category);
      let existingIndex = -1;

      if (row.existingId && idIndexMap.has(row.existingId)) {
        existingIndex = idIndexMap.get(row.existingId)!;
      } else if (cleanSku && skuIndexMap.has(cleanSku)) {
        existingIndex = skuIndexMap.get(cleanSku)!;
      }

      if (existingIndex >= 0 && existingIndex < currentInventory.length) {
        if (options.updateExisting) {
          const existing = currentInventory[existingIndex];
          const profit = row.sellingPrice - row.costPrice;
          const margin = row.sellingPrice > 0 ? Math.round((profit / row.sellingPrice) * 1000) / 10 : 0;

          currentInventory[existingIndex] = {
            ...existing,
            name: row.name || existing.name,
            sku: row.sku || existing.sku,
            barcode: row.barcode || existing.barcode,
            category: normalizedCat,
            brand: row.brand || existing.brand,
            vendors: row.vendors && row.vendors.length > 0 ? row.vendors : existing.vendors,
            vendor: row.vendor || existing.vendor,
            priceType: row.priceType,
            costPrice: row.costPrice,
            sellingPrice: row.priceType === 'variable' ? 0 : row.sellingPrice,
            stockQuantity: row.stockQuantity > 0 ? row.stockQuantity : existing.stockQuantity,
            lowStockThreshold: row.lowStockThreshold || existing.lowStockThreshold,
            unit: row.unit || existing.unit,
            isTaxApplicable: row.isTaxApplicable,
            taxRate: row.taxRate,
            status: row.status,
            description: row.description || existing.description,
            profitPerUnit: profit,
            marginPercentage: margin,
          };
          updatedCount++;
        }
      } else {
        const profit = row.sellingPrice - row.costPrice;
        const margin = row.sellingPrice > 0 ? Math.round((profit / row.sellingPrice) * 1000) / 10 : 0;
        const initialStock = row.stockQuantity || 0;

        const storeAllocations = {
          gota: Math.round(initialStock * 0.4),
          bopal: Math.round(initialStock * 0.3),
          sindhubhavan: Math.round(initialStock * 0.15),
          sg_highway: Math.round(initialStock * 0.15),
        };

        const newItemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${rowIdx}`;

        const newItem: InventoryItem = {
          id: newItemId,
          name: row.name,
          sku: row.sku,
          barcode: row.barcode || `890100${Math.floor(1000 + Math.random() * 9000)}`,
          category: normalizedCat,
          brand: row.brand || 'Richie Rich Signature',
          vendors: row.vendors && row.vendors.length > 0 ? row.vendors : [row.vendor || 'Central Supply'],
          vendor: row.vendor || 'Central Supply',
          priceType: row.priceType || 'fixed',
          costPrice: row.costPrice,
          sellingPrice: row.priceType === 'variable' ? 0 : row.sellingPrice,
          stockQuantity: initialStock,
          lowStockThreshold: row.lowStockThreshold || 5,
          unit: row.unit || 'pieces',
          isTaxApplicable: row.isTaxApplicable !== false,
          taxRate: row.taxRate ?? (normalizedCat === 'Paan' ? 5 : normalizedCat === 'Cafe' ? 5 : 18),
          status: row.status || 'active',
          isAvailableForOnline: true,
          description: row.description || `${row.name} - Catalog Product`,
          ingredients: ['Artisanal Spices', 'Premium Quality Ingredients'],
          tags: row.priceType === 'variable' ? ['Variable Price', 'New Import'] : ['New Import'],
          imageUrl: row.imageUrl || '',
          profitPerUnit: profit,
          marginPercentage: margin,
          storeAllocations,
        };

        currentInventory.unshift(newItem);
        idIndexMap.set(newItemId, 0);
        if (cleanSku) skuIndexMap.set(cleanSku, 0);

        // Re-index map keys because of unshift
        idIndexMap.clear();
        skuIndexMap.clear();
        currentInventory.forEach((it, idx) => {
          if (it.id) idIndexMap.set(it.id, idx);
          if (it.sku) skuIndexMap.set(it.sku.trim().toLowerCase(), idx);
        });

        importedCount++;
      }
    });

    this.saveInventory(currentInventory);

    this.addNotification({
      title: `📊 Excel Inventory Import Completed`,
      message: `Successfully processed ${parsedItems.length} records (${importedCount} new products added, ${updatedCount} existing products updated).`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
      linkTab: 'inventory',
    });

    return { importedCount, updatedCount };
  }

  findItemByBarcode(barcode: string): InventoryItem | undefined {
    const items = this.getInventory();
    const clean = barcode.trim().toLowerCase();
    return items.find(
      (i) =>
        i.barcode.trim().toLowerCase() === clean ||
        i.sku.trim().toLowerCase() === clean ||
        clean.includes(i.barcode.trim().toLowerCase())
    );
  }

  adjustStock(id: string, delta: number, reason: string = 'Manual Adjustment'): boolean {
    const items = this.getInventory();
    const item = items.find((i) => i.id === id);
    if (!item) return false;

    item.stockQuantity = Math.max(0, item.stockQuantity + delta);
    this.saveInventory(items);

    if (delta < 0 && item.stockQuantity <= item.lowStockThreshold) {
      soundEffects.playWarningChime();
    }
    return true;
  }

  private checkAndTriggerLowStockAlerts(items: InventoryItem[]) {
    const lowStockItems = items.filter((i) => i.stockQuantity <= i.lowStockThreshold);
    if (lowStockItems.length === 0) return;

    // Check if we need to emit new notifications
    const notifications = this.getNotifications();
    const stores = this.getStores();

    // 1. Central Master Warehouse Low Stock Alerts
    lowStockItems.forEach((item) => {
      const alreadyAlertedRecently = notifications.some(
        (n) =>
          n.type === 'low_stock' &&
          n.title.includes(`Central Warehouse`) &&
          n.title.includes(item.name) &&
          Date.now() - new Date(n.timestamp).getTime() < 1000 * 60 * 60 * 4 // 4 hours
      );

      if (!alreadyAlertedRecently) {
        this.addNotification({
          title: `⚠️ Central WH Low Stock: ${item.name}`,
          message: `Central Master Warehouse has only ${item.stockQuantity} ${item.unit} available (Minimum Threshold: ${item.lowStockThreshold}). Issue a Supplier Purchase Order to replenish.`,
          type: 'low_stock',
          targetRole: 'admin',
          read: false,
          linkTab: 'inventory',
        });
      }
    });

    // 2. Individual In-Store Low Stock Alerts (Gota, Bopal, Sindhu Bhavan, SG Highway)
    items.forEach((item) => {
      if (!item.storeAllocations) return;
      const storeMinThreshold = Math.max(2, Math.round((item.lowStockThreshold || 10) * 0.4));

      Object.entries(item.storeAllocations).forEach(([storeId, storeQty]) => {
        if (storeQty <= storeMinThreshold) {
          const storeObj = stores.find((s) => s.id === storeId);
          const storeName = storeObj ? storeObj.shortName || storeObj.name : storeId.toUpperCase();

          const alreadyAlertedStore = notifications.some(
            (n) =>
              n.type === 'low_stock' &&
              n.title.includes(storeName) &&
              n.title.includes(item.name) &&
              Date.now() - new Date(n.timestamp).getTime() < 1000 * 60 * 60 * 3 // 3 hours
          );

          if (!alreadyAlertedStore) {
            this.addNotification({
              title: `⚠️ In-Store Low Stock: ${storeName} - ${item.name}`,
              message: `${storeName} currently has only ${storeQty} ${item.unit} remaining (Store Min Threshold: ${storeMinThreshold}). Dispatch replenishment from Central Master Warehouse.`,
              type: 'low_stock',
              targetRole: 'admin',
              read: false,
              linkTab: 'store_stock',
            });
          }
        }
      });
    });
  }

  // --- CATEGORIES ---

  getCategories(): Category[] {
    return this.getCached(STORAGE_KEYS.CATEGORIES, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.CATEGORIES);
        return data ? JSON.parse(data) : INITIAL_CATEGORIES;
      } catch {
        return INITIAL_CATEGORIES;
      }
    });
  }

  // --- CUSTOMERS & LOYALTY ---

  getCustomers(): Customer[] {
    return this.getCached(STORAGE_KEYS.CUSTOMERS, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.CUSTOMERS);
        return data ? JSON.parse(data) : INITIAL_CUSTOMERS;
      } catch {
        return INITIAL_CUSTOMERS;
      }
    });
  }

  saveCustomers(customers: Customer[]) {
    this.setCached(STORAGE_KEYS.CUSTOMERS, customers);
    safeStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    this.notify();
  }

  findCustomerByPhone(phone: string): Customer | undefined {
    const customers = this.getCustomers();
    const cleanPhone = phone.replace(/\D/g, '');
    return customers.find((c) => c.phone.replace(/\D/g, '').includes(cleanPhone) || cleanPhone.includes(c.phone.replace(/\D/g, '')));
  }

  upsertCustomer(customerData: Partial<Customer> & { name: string; phone: string }): Customer {
    const customers = this.getCustomers();
    const existingIndex = customers.findIndex((c) => c.phone === customerData.phone);

    if (existingIndex >= 0) {
      const current = customers[existingIndex];
      const updated: Customer = {
        ...current,
        ...customerData,
      };
      customers[existingIndex] = updated;
      this.saveCustomers(customers);
      return updated;
    } else {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        name: customerData.name,
        phone: customerData.phone,
        email: customerData.email || '',
        loyaltyPoints: 50, // Welcome gift 50 points
        tier: 'Silver',
        totalSpent: 0,
        totalOrders: 0,
        joinDate: new Date().toISOString().split('T')[0],
        preferences: customerData.preferences || [],
      };
      customers.push(newCust);
      this.saveCustomers(customers);

      this.addNotification({
        title: `🎉 New Customer Joined Loyalty Club!`,
        message: `${newCust.name} (${newCust.phone}) enrolled with 50 welcome loyalty bonus points!`,
        type: 'loyalty_reward',
        targetRole: 'pos',
        read: false,
        linkTab: 'loyalty',
      });

      return newCust;
    }
  }

  // --- ORDERS & REAL-TIME STOCK DEDUCTION ---

  getOrders(): Order[] {
    return this.getCached(STORAGE_KEYS.ORDERS, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.ORDERS);
        return data ? JSON.parse(data) : INITIAL_ORDERS;
      } catch {
        return INITIAL_ORDERS;
      }
    });
  }

  saveOrders(orders: Order[]) {
    this.setCached(STORAGE_KEYS.ORDERS, orders);
    safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    this.notify();
  }

  processOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>): Order {
    const orders = this.getOrders();
    const orderNumber = `RR-${new Date().getFullYear()}-${1000 + orders.length + 1}`;
    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
      orderNumber,
      createdAt: new Date().toISOString(),
    };

    // 1. Deduct Inventory Stock in Real-Time (Store Specific Allocation or Central Warehouse)
    const inventory = this.getInventory();
    const stores = this.getStores();
    let triggeredStoreLowStock = false;

    orderData.items.forEach((item) => {
      const invItem = inventory.find((i) => i.id === item.itemId || i.sku === item.sku);
      if (invItem) {
        if (orderData.storeId) {
          if (!invItem.storeAllocations) invItem.storeAllocations = {};
          const currentStoreStock = invItem.storeAllocations[orderData.storeId] || 0;
          const newStoreStock = Math.max(0, currentStoreStock - item.quantity);
          invItem.storeAllocations[orderData.storeId] = newStoreStock;

          const storeMinThreshold = Math.max(2, Math.round((invItem.lowStockThreshold || 10) * 0.4));
          if (newStoreStock <= storeMinThreshold) {
            triggeredStoreLowStock = true;
            const stObj = stores.find((s) => s.id === orderData.storeId);
            const stName = stObj ? stObj.shortName || stObj.name : orderData.storeId.toUpperCase();
            this.addNotification({
              title: `⚠️ In-Store Low Stock: ${stName} - ${invItem.name}`,
              message: `Post-Sale Alert: ${stName} stock dropped to ${newStoreStock} ${invItem.unit} (Threshold: ${storeMinThreshold}). Warehouse replenishment needed!`,
              type: 'low_stock',
              targetRole: 'admin',
              read: false,
              linkTab: 'store_stock',
            });
          }
        } else {
          // Central Warehouse dispatch for unallocated / direct orders
          invItem.stockQuantity = Math.max(0, invItem.stockQuantity - item.quantity);
        }
      }
    });
    this.saveInventory(inventory);

    if (triggeredStoreLowStock) {
      soundEffects.playWarningChime();
    }

    // 2. Award or Deduct Loyalty Points
    if (orderData.customerPhone || orderData.customerId) {
      const customers = this.getCustomers();
      const cust = customers.find(
        (c) => c.id === orderData.customerId || (orderData.customerPhone && c.phone === orderData.customerPhone)
      );

      if (cust) {
        // 1 point per ₹10 spent
        const pointsEarned = Math.floor(orderData.grandTotal / 10);
        const pointsUsed = orderData.loyaltyPointsUsed || 0;

        cust.loyaltyPoints = Math.max(0, cust.loyaltyPoints - pointsUsed + pointsEarned);
        cust.totalSpent += orderData.grandTotal;
        cust.totalOrders += 1;

        // Tier upgrades
        if (cust.totalSpent >= 3000 && cust.tier !== 'Platinum Royal') {
          cust.tier = 'Platinum Royal';
          this.addNotification({
            title: `👑 VIP Tier Upgrade: ${cust.name}`,
            message: `${cust.name} has been upgraded to Platinum Royal! Enjoy 25% VIP perks.`,
            type: 'loyalty_reward',
            targetRole: 'customer',
            read: false,
          });
        } else if (cust.totalSpent >= 1200 && cust.tier === 'Silver') {
          cust.tier = 'Gold';
        }

        newOrder.loyaltyPointsEarned = pointsEarned;
        this.saveCustomers(customers);
      }
    }

    // 3. Save order
    orders.unshift(newOrder);
    this.saveOrders(orders);

    // 4. Trigger audio & notifications
    soundEffects.playSuccessChime();

    this.addNotification({
      title: `🛍️ New Order #${orderNumber} (${newOrder.source === 'customer_online' ? 'Online' : 'POS Counter'})`,
      message: `${newOrder.items.length} items • Total ${CURRENCY}${newOrder.grandTotal.toFixed(2)} [${newOrder.paymentMethod.toUpperCase()}]`,
      type: 'order_update',
      targetRole: 'all',
      read: false,
      linkTab: 'orders',
    });

    return newOrder;
  }

  updateOrderStatus(orderId: string, newStatus: Order['status']): boolean {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    order.status = newStatus;
    this.saveOrders(orders);

    this.addNotification({
      title: `Order #${order.orderNumber} Status: ${newStatus.toUpperCase()}`,
      message: `Your pan house order is now ${newStatus.toUpperCase()}!`,
      type: 'order_update',
      targetRole: 'customer',
      read: false,
      linkTab: 'orders',
    });

    return true;
  }

  // --- PROMOTIONS ---

  getPromotions(): Promotion[] {
    return this.getCached(STORAGE_KEYS.PROMOTIONS, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.PROMOTIONS);
        return data ? JSON.parse(data) : INITIAL_PROMOTIONS;
      } catch {
        return INITIAL_PROMOTIONS;
      }
    });
  }

  savePromotions(promos: Promotion[]) {
    this.setCached(STORAGE_KEYS.PROMOTIONS, promos);
    safeStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(promos));
    this.notify();
  }

  addPromotion(promo: Omit<Promotion, 'id' | 'usageCount'>): Promotion {
    const promos = this.getPromotions();
    const newPromo: Promotion = {
      ...promo,
      id: `promo-${Date.now()}`,
      usageCount: 0,
    };
    promos.unshift(newPromo);
    this.savePromotions(promos);

    // Send push notification for new promotion
    this.addNotification({
      title: `🔥 Special Deal Alert: ${newPromo.title}`,
      message: `Use code ${newPromo.code} to get ${newPromo.discountType === 'percentage' ? newPromo.discountValue + '%' : CURRENCY + newPromo.discountValue} OFF!`,
      type: 'discount_promo',
      targetRole: 'customer',
      read: false,
      linkTab: 'promos',
    });

    return newPromo;
  }

  togglePromotion(id: string): boolean {
    const promos = this.getPromotions();
    const promo = promos.find((p) => p.id === id);
    if (!promo) return false;
    promo.isActive = !promo.isActive;
    this.savePromotions(promos);
    return true;
  }

  deletePromotion(id: string): boolean {
    const promos = this.getPromotions();
    const filtered = promos.filter((p) => p.id !== id);
    if (filtered.length !== promos.length) {
      this.savePromotions(filtered);
      return true;
    }
    return false;
  }

  // --- NOTIFICATIONS ---

  getNotifications(): PushNotification[] {
    return this.getCached(STORAGE_KEYS.NOTIFICATIONS, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
        return data ? JSON.parse(data) : INITIAL_NOTIFICATIONS;
      } catch {
        return INITIAL_NOTIFICATIONS;
      }
    });
  }

  saveNotifications(notifs: PushNotification[]) {
    const trimmed = notifs.slice(0, 50);
    this.setCached(STORAGE_KEYS.NOTIFICATIONS, trimmed);
    safeStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(trimmed));
    this.notify();
  }

  addNotification(notif: Omit<PushNotification, 'id' | 'timestamp'>) {
    const notifs = this.getNotifications();
    const newNotif: PushNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    notifs.unshift(newNotif);
    this.saveNotifications(notifs);

    // Browser Notification API trigger if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(newNotif.title, {
          body: newNotif.message,
          icon: '/favicon.ico',
        });
      } catch (e) {
        console.warn('Native notification failed', e);
      }
    }
  }

  markNotificationAsRead(id: string) {
    const notifs = this.getNotifications();
    const notif = notifs.find((n) => n.id === id);
    if (notif) {
      notif.read = true;
      this.saveNotifications(notifs);
    }
  }

  markAllNotificationsAsRead() {
    const notifs = this.getNotifications();
    notifs.forEach((n) => (n.read = true));
    this.saveNotifications(notifs);
  }

  clearNotifications() {
    this.saveNotifications([]);
  }

  // --- BACKUP MANAGEMENT (Daily 12:00 AM and Manual) ---

  getBackups(): BackupSnapshot[] {
    return this.getCached(STORAGE_KEYS.BACKUPS, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.BACKUPS);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    });
  }

  createBackup(type: 'automated_daily' | 'manual' = 'manual', note?: string): BackupSnapshot {
    const backups = this.getBackups();
    const inventory = this.getInventory();
    const orders = this.getOrders();
    const customers = this.getCustomers();
    const promotions = this.getPromotions();

    const snapshotPayload = {
      storeName: 'Richie Rich Pan House',
      version: '2.5',
      exportDate: new Date().toISOString(),
      note: note || `${type === 'automated_daily' ? 'Daily 12:00 AM Scheduled' : 'Manual Admin'} Snapshot`,
      inventory,
      orders,
      customers,
      promotions,
    };

    const dataJson = JSON.stringify(snapshotPayload, null, 2);
    const sizeKb = Math.round((new Blob([dataJson]).size / 1024) * 10) / 10;
    const checksum = `SHA256-RR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const newSnapshot: BackupSnapshot = {
      id: `backup-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      itemCount: inventory.length,
      orderCount: orders.length,
      customerCount: customers.length,
      fileSizeKb: sizeKb,
      checksum,
      dataJson,
    };

    const updatedBackups = [newSnapshot, ...backups].slice(0, 30);
    this.setCached(STORAGE_KEYS.BACKUPS, updatedBackups);
    safeStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(updatedBackups));

    this.addNotification({
      title: `💾 Backup Created: ${type === 'automated_daily' ? 'Daily 12:00 AM Auto-Backup' : 'Manual Snapshot'}`,
      message: `Archived ${inventory.length} products, ${orders.length} orders, ${customers.length} customer profiles (${sizeKb} KB).`,
      type: 'system_backup',
      targetRole: 'admin',
      read: false,
      linkTab: 'backups',
    });

    this.notify();
    return newSnapshot;
  }

  restoreBackup(backupId: string): boolean {
    const backups = this.getBackups();
    const backup = backups.find((b) => b.id === backupId);
    if (!backup) return false;

    try {
      const parsed = JSON.parse(backup.dataJson);
      const target = parsed.payload || parsed;
      const { isValid, sanitized } = validateAndSanitizeBackupPayload(target);

      if (!isValid) {
        console.error('Backup validation failed during restore');
        return false;
      }

      this.restoreSanitizedData(sanitized);

      this.addNotification({
        title: `🔄 System Database Restored`,
        message: `Database successfully verified and restored from snapshot ${backup.checksum} dated ${new Date(backup.timestamp).toLocaleString()}.`,
        type: 'system_backup',
        targetRole: 'admin',
        read: false,
        linkTab: 'backups',
      });

      this.notify();
      return true;
    } catch (e) {
      console.error('Failed to restore backup', e);
      return false;
    }
  }

  restoreSanitizedData(data: {
    inventory?: InventoryItem[];
    orders?: Order[];
    customers?: Customer[];
    promotions?: Promotion[];
    stores?: StoreLocation[];
  }): void {
    this.invalidateCache();
    if (data.inventory && Array.isArray(data.inventory)) {
      safeStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(data.inventory));
    }
    if (data.orders && Array.isArray(data.orders)) {
      safeStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(data.orders));
    }
    if (data.customers && Array.isArray(data.customers)) {
      safeStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(data.customers));
    }
    if (data.promotions && Array.isArray(data.promotions)) {
      safeStorage.setItem(STORAGE_KEYS.PROMOTIONS, JSON.stringify(data.promotions));
    }
    if (data.stores && Array.isArray(data.stores)) {
      safeStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(data.stores));
    }
    this.notify();
  }

  // --- FINANCIAL STATS & ANALYTICS ---

  getFinancialStats(): StoreFinancialStats {
    const inventory = this.getInventory();
    const orders = this.getOrders();
    const customers = this.getCustomers();

    let totalRevenue = 0;
    let totalCOGS = 0;
    let totalProfit = 0;

    orders.forEach((ord) => {
      if (ord.paymentStatus !== 'refunded') {
        totalRevenue += ord.grandTotal;
        totalCOGS += ord.totalCost;
        totalProfit += ord.totalProfit;
      }
    });

    const overallMarginPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const lowStockItemsCount = inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold && i.stockQuantity > 0).length;
    const outOfStockCount = inventory.filter((i) => i.stockQuantity === 0).length;
    const totalInventoryValue = inventory.reduce((sum, item) => sum + item.costPrice * item.stockQuantity, 0);
    const loyaltyPointsIssued = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCOGS: Math.round(totalCOGS * 100) / 100,
      grossProfit: Math.round(totalProfit * 100) / 100,
      overallMarginPercent: Math.round(overallMarginPercent * 10) / 10,
      totalOrdersCount: orders.length,
      lowStockItemsCount,
      outOfStockCount,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      totalCustomersCount: customers.length,
      loyaltyPointsIssued,
    };
  }

  // --- EXPORT REPORTS (CSV / JSON) ---

  exportMonthlyAnalyticalReportCSV(): string {
    const stats = this.getFinancialStats();
    const inventory = this.getInventory();
    const orders = this.getOrders();
    const currentDate = new Date().toISOString().split('T')[0];

    let csv = `RICHIE RICH PAN HOUSE - MONTHLY ANALYTICAL & FINANCIAL REPORT\n`;
    csv += `Generated Date,${currentDate}\n`;
    csv += `Currency,${CURRENCY} (INR)\n\n`;

    csv += `EXECUTIVE FINANCIAL SUMMARY\n`;
    csv += `Metric,Value\n`;
    csv += `Gross Sales Revenue,${CURRENCY}${stats.totalRevenue.toFixed(2)}\n`;
    csv += `Cost of Goods Sold (COGS),${CURRENCY}${stats.totalCOGS.toFixed(2)}\n`;
    csv += `Net Gross Profit,${CURRENCY}${stats.grossProfit.toFixed(2)}\n`;
    csv += `Overall Profit Margin (%),${stats.overallMarginPercent.toFixed(1)}%\n`;
    csv += `Total Orders Processed,${stats.totalOrdersCount}\n`;
    csv += `Total Active Customer Profiles,${stats.totalCustomersCount}\n`;
    csv += `Total Inventory Valuation (Cost),${CURRENCY}${stats.totalInventoryValue.toFixed(2)}\n`;
    csv += `Low Stock Alerts Pending,${stats.lowStockItemsCount}\n\n`;

    csv += `INVENTORY ITEM PROFIT MARGIN MATRIX\n`;
    csv += `SKU,Barcode,Item Name,Category,Cost Price (${CURRENCY}),Selling Price (${CURRENCY}),Profit/Unit (${CURRENCY}),Margin (%),Stock Qty,Stock Status\n`;

    inventory.forEach((item) => {
      const status = item.stockQuantity === 0 ? 'OUT OF STOCK' : item.stockQuantity <= item.lowStockThreshold ? 'LOW STOCK' : 'HEALTHY';
      csv += `"${item.sku}","${item.barcode}","${item.name.replace(/"/g, '""')}","${item.category}",${item.costPrice},${item.sellingPrice},${item.profitPerUnit || 0},${item.marginPercentage || 0}%,${item.stockQuantity},"${status}"\n`;
    });

    csv += `\nTRANSACTION SALES AUDIT LOG\n`;
    csv += `Order #,Date,Channel,Customer,Items Qty,Subtotal (${CURRENCY}),Discount (${CURRENCY}),Grand Total (${CURRENCY}),Total Cost (${CURRENCY}),Profit (${CURRENCY}),Payment Method,Status\n`;

    orders.forEach((o) => {
      const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
      csv += `"${o.orderNumber}","${o.createdAt.split('T')[0]}","${o.source}","${o.customerName || 'Walk-in'}",${itemCount},${o.subtotal},${o.discountAmount},${o.grandTotal},${o.totalCost},${o.totalProfit},"${o.paymentMethod}","${o.status}"\n`;
    });

    return csv;
  }

  exportDailyCollectionReportCSV(selectedDate?: string, storeId?: string): string {
    const orders = this.getOrders();
    const targetDate = selectedDate || getLocalDateString(new Date());
    
    // Filter orders by date & optional store (strictly accurate for 12:00 AM local midnight resets)
    const dayOrders = orders.filter((o) => {
      const orderDate = getLocalDateString(o.createdAt);
      const matchesDate = orderDate === targetDate;
      const matchesStore = !storeId || storeId === 'all' || o.storeId === storeId;
      return matchesDate && matchesStore;
    });

    const cashOrders = dayOrders.filter((o) => o.paymentMethod === 'cash');
    const upiOrders = dayOrders.filter((o) => o.paymentMethod === 'upi_qr');
    const cardOrders = dayOrders.filter((o) => o.paymentMethod === 'card');
    const otherOrders = dayOrders.filter((o) => !['cash', 'upi_qr', 'card'].includes(o.paymentMethod));

    const totalSales = dayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalCash = cashOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalUPI = upiOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalCard = cardOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalOther = otherOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalTax = dayOrders.reduce((sum, o) => sum + o.taxAmount, 0);
    const totalProfit = dayOrders.reduce((sum, o) => sum + o.totalProfit, 0);

    let csv = `RICHIE RICH PAN HOUSE - DAILY SALES & COLLECTION RECONCILIATION REPORT\n`;
    csv += `Audit Date,${targetDate}\n`;
    csv += `Store Filter,${storeId && storeId !== 'all' ? storeId.toUpperCase() : 'ALL STORES & OUTLETS'}\n`;
    csv += `Currency,${CURRENCY} (INR)\n`;
    csv += `Generated Timestamp,${new Date().toISOString()}\n\n`;

    csv += `EXECUTIVE DAILY COLLECTION SUMMARY\n`;
    csv += `Payment Method,Total Amount (${CURRENCY}),Transaction Count,Share of Total (%)\n`;
    csv += `ONLY CASH,${totalCash.toFixed(2)},${cashOrders.length},${totalSales > 0 ? ((totalCash / totalSales) * 100).toFixed(1) : 0}%\n`;
    csv += `ONLY UPI (QR / PhonePe / GPay),${totalUPI.toFixed(2)},${upiOrders.length},${totalSales > 0 ? ((totalUPI / totalSales) * 100).toFixed(1) : 0}%\n`;
    csv += `ONLY CARD (POS Swipe / Tap),${totalCard.toFixed(2)},${cardOrders.length},${totalSales > 0 ? ((totalCard / totalSales) * 100).toFixed(1) : 0}%\n`;
    if (otherOrders.length > 0) {
      csv += `LOYALTY / OTHER,${totalOther.toFixed(2)},${otherOrders.length},${totalSales > 0 ? ((totalOther / totalSales) * 100).toFixed(1) : 0}%\n`;
    }
    csv += `TOTAL SALE TODAY / DAY REVENUE,${totalSales.toFixed(2)},${dayOrders.length},100.0%\n\n`;

    csv += `FINANCIAL BREAKDOWN\n`;
    csv += `Gross Daily Sales,${CURRENCY}${totalSales.toFixed(2)}\n`;
    csv += `Total Tax Collected (GST),${CURRENCY}${totalTax.toFixed(2)}\n`;
    csv += `Estimated Gross Profit,${CURRENCY}${totalProfit.toFixed(2)}\n`;
    csv += `Average Ticket Size,${CURRENCY}${dayOrders.length > 0 ? (totalSales / dayOrders.length).toFixed(2) : '0.00'}\n\n`;

    csv += `TRANSACTION REGISTER LOG FOR ${targetDate}\n`;
    csv += `Order #,Time,Store,Counter,Cashier,Customer,Payment Mode,Items Qty,Subtotal,Discount,Tax,Grand Total,Profit,Status\n`;

    dayOrders.forEach((o) => {
      const timeStr = new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const qty = o.items.reduce((s, i) => s + i.quantity, 0);
      csv += `"${o.orderNumber}","${timeStr}","${o.storeName || 'Main'}","${o.counterName || o.counterNumber || 1}","${o.cashierName || 'Staff'}","${o.customerName || 'Walk-in'}","${o.paymentMethod.toUpperCase()}",${qty},${o.subtotal.toFixed(2)},${o.discountAmount.toFixed(2)},${o.taxAmount.toFixed(2)},${o.grandTotal.toFixed(2)},${o.totalProfit.toFixed(2)},"${o.status}"\n`;
    });

    return csv;
  }

  // =========================================================================
  // STORE ADMIN CREDENTIALS MANAGEMENT
  // =========================================================================
  getStoreAdmins(): StoreAdminCredential[] {
    try {
      const data = safeStorage.getItem(STORAGE_KEYS.STORE_ADMINS);
      if (!data) return INITIAL_STORE_ADMINS;
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_STORE_ADMINS;
    } catch {
      return INITIAL_STORE_ADMINS;
    }
  }

  saveStoreAdmins(admins: StoreAdminCredential[]): void {
    try {
      safeStorage.setItem(STORAGE_KEYS.STORE_ADMINS, JSON.stringify(admins));
      this.notifySubscribers();
    } catch (e) {
      console.error('Failed to save store admins:', e);
    }
  }

  addStoreAdmin(adminData: Omit<StoreAdminCredential, 'id' | 'createdAt'>): StoreAdminCredential {
    const admins = this.getStoreAdmins();
    const newAdmin: StoreAdminCredential = {
      ...adminData,
      id: `sa-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    admins.push(newAdmin);
    this.saveStoreAdmins(admins);
    return newAdmin;
  }

  updateStoreAdmin(id: string, updates: Partial<StoreAdminCredential>): boolean {
    const admins = this.getStoreAdmins();
    const idx = admins.findIndex((a) => a.id === id);
    if (idx === -1) return false;
    admins[idx] = { ...admins[idx], ...updates };
    this.saveStoreAdmins(admins);
    return true;
  }

  deleteStoreAdmin(id: string): boolean {
    const admins = this.getStoreAdmins();
    const filtered = admins.filter((a) => a.id !== id);
    if (filtered.length === admins.length) return false;
    this.saveStoreAdmins(filtered);
    return true;
  }

  // =========================================================================
  // STORE EXPENSES MANAGEMENT
  // =========================================================================
  getStoreExpenses(storeId?: string): StoreExpense[] {
    const allExpenses = this.getCached(STORAGE_KEYS.STORE_EXPENSES, () => {
      try {
        const data = safeStorage.getItem(STORAGE_KEYS.STORE_EXPENSES);
        let expenses: StoreExpense[] = [];
        if (!data) {
          expenses = INITIAL_STORE_EXPENSES;
        } else {
          const parsed = JSON.parse(data);
          expenses = Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_STORE_EXPENSES;
        }
        return expenses;
      } catch {
        return INITIAL_STORE_EXPENSES;
      }
    });

    if (storeId && storeId !== 'all') {
      return allExpenses.filter((e) => e.storeId === storeId);
    }
    return allExpenses;
  }

  saveStoreExpenses(expenses: StoreExpense[]): void {
    try {
      this.setCached(STORAGE_KEYS.STORE_EXPENSES, expenses);
      safeStorage.setItem(STORAGE_KEYS.STORE_EXPENSES, JSON.stringify(expenses));
      this.notifySubscribers();
    } catch (e) {
      console.error('Failed to save store expenses:', e);
    }
  }

  addStoreExpense(
    expenseData: Omit<StoreExpense, 'id' | 'createdAt' | 'voucherNumber'> & { voucherNumber?: string }
  ): StoreExpense {
    const expenses = this.getStoreExpenses();
    const storeShort = (expenseData.storeId || 'GEN').toUpperCase().slice(0, 3);
    const voucherNumber =
      expenseData.voucherNumber?.trim() ||
      `EXP-${storeShort}-${Math.floor(100 + Math.random() * 900)}`;

    const newExpense: StoreExpense = {
      ...expenseData,
      voucherNumber,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    expenses.unshift(newExpense);
    this.saveStoreExpenses(expenses);

    this.addNotification({
      title: `Store Expense Added: ${CURRENCY}${newExpense.amount}`,
      message: `[${newExpense.storeName}] ${newExpense.description} (${newExpense.category.replace('_', ' ')}) logged by ${newExpense.loggedBy}`,
      type: 'order_update',
      targetRole: 'admin',
      read: false,
    });

    return newExpense;
  }

  updateStoreExpense(id: string, updates: Partial<StoreExpense>): boolean {
    const expenses = this.getStoreExpenses();
    const idx = expenses.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    expenses[idx] = { ...expenses[idx], ...updates };
    this.saveStoreExpenses(expenses);
    return true;
  }

  deleteStoreExpense(id: string): boolean {
    const expenses = this.getStoreExpenses();
    const filtered = expenses.filter((e) => e.id !== id);
    if (filtered.length === expenses.length) return false;
    this.saveStoreExpenses(filtered);
    return true;
  }

  // =========================================================================
  // STORE FINANCIAL SUMMARY (SALES CREDIT - EXPENSES DEBIT = NET BALANCE)
  // =========================================================================
  getStoreFinancialSummary(storeId: string, startDate?: string, endDate?: string): StoreFinancialSummary {
    const stores = this.getStores();
    const storeObj = stores.find((s) => s.id === storeId) || {
      id: storeId,
      name: `Store (${storeId})`,
    };

    const allOrders = this.getOrders();
    const allExpenses = this.getStoreExpenses(storeId);

    // Filter orders by store and date
    const storeOrders = allOrders.filter((o) => {
      const matchStore = !storeId || storeId === 'all' || o.storeId === storeId;
      if (!matchStore) return false;
      if (o.status === 'cancelled') return false;

      const orderDate = o.createdAt.split('T')[0];
      if (startDate && orderDate < startDate) return false;
      if (endDate && orderDate > endDate) return false;
      return true;
    });

    // Filter expenses by date
    const storeExpenses = allExpenses.filter((e) => {
      const matchStore = !storeId || storeId === 'all' || e.storeId === storeId;
      if (!matchStore) return false;
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      return true;
    });

    // Calculate Sales Breakdown (Credit Inflow)
    const salesByPayment = {
      cash: 0,
      upi_qr: 0,
      card: 0,
      loyalty_points: 0,
      split: 0,
    };

    let totalSalesCredit = 0;
    let totalGSTCollected = 0;

    storeOrders.forEach((o) => {
      totalSalesCredit += o.grandTotal;
      totalGSTCollected += o.taxAmount || 0;
      if (o.paymentMethod === 'cash') salesByPayment.cash += o.grandTotal;
      else if (o.paymentMethod === 'upi_qr') salesByPayment.upi_qr += o.grandTotal;
      else if (o.paymentMethod === 'card') salesByPayment.card += o.grandTotal;
      else if (o.paymentMethod === 'loyalty_points') salesByPayment.loyalty_points += o.grandTotal;
      else salesByPayment.split += o.grandTotal;
    });

    // Calculate Expenses Breakdown (Debit Outflow)
    const expensesByCategory: Record<StoreExpenseCategory, number> = {
      rent: 0,
      utilities: 0,
      staff_salary: 0,
      staff_advance: 0,
      maintenance: 0,
      supplies: 0,
      raw_materials_petty: 0,
      marketing: 0,
      logistics: 0,
      cleaning: 0,
      miscellaneous: 0,
      daily_supplies: 0,
      electricity_utility: 0,
      rent_lease: 0,
      maintenance_repairs: 0,
      store_refreshments: 0,
      local_vendor: 0,
      misc: 0,
    };

    const expensesByPayment = {
      cash: 0,
      upi: 0,
      bank_transfer: 0,
      card: 0,
      cheque: 0,
    };

    let totalExpensesDebit = 0;

    storeExpenses.forEach((e) => {
      totalExpensesDebit += e.amount;
      if (expensesByCategory[e.category] !== undefined) {
        expensesByCategory[e.category] += e.amount;
      } else {
        expensesByCategory.miscellaneous += e.amount;
      }

      if (e.paymentMethod === 'cash') expensesByPayment.cash += e.amount;
      else if (e.paymentMethod === 'upi') expensesByPayment.upi += e.amount;
      else if (e.paymentMethod === 'bank_transfer') expensesByPayment.bank_transfer += e.amount;
      else if (e.paymentMethod === 'card') expensesByPayment.card += e.amount;
      else if (e.paymentMethod === 'cheque') expensesByPayment.cheque += e.amount;
      else expensesByPayment.cash += e.amount;
    });

    // Net Balance = Credit (Sales) - Debit (Expenses)
    const netStoreBalance = totalSalesCredit - totalExpensesDebit;

    // Expected Physical Cash in Drawer = Cash Sales - Cash Expenses Paid Out
    const expectedCashInDrawer = salesByPayment.cash - expensesByPayment.cash;

    const totalOrdersCount = storeOrders.length;
    const averageOrderValue = totalOrdersCount > 0 ? totalSalesCredit / totalOrdersCount : 0;
    const profitMarginPercent =
      totalSalesCredit > 0 ? ((netStoreBalance) / totalSalesCredit) * 100 : 0;

    const salesByMode = {
      cash: salesByPayment.cash,
      upi: salesByPayment.upi_qr,
      card: salesByPayment.card,
    };

    const expensesByMode = {
      cash: expensesByPayment.cash,
      online: totalExpensesDebit - expensesByPayment.cash,
    };

    return {
      storeId: storeObj.id,
      storeName: storeObj.name,
      totalSales: totalSalesCredit,
      totalSalesCredit,
      orderCount: totalOrdersCount,
      totalOrdersCount,
      salesByMode,
      salesByPayment,
      totalExpenses: totalExpensesDebit,
      totalExpensesDebit,
      expenseCount: storeExpenses.length,
      expensesByMode,
      categoryBreakdown: expensesByCategory,
      expensesByCategory,
      expensesByPayment,
      netStoreBalance,
      expectedCashInDrawer,
      profitMarginPercent,
      averageOrderValue,
      totalGSTCollected,
    };
  }

  exportStorePnLCSV(storeId: string, startDate?: string, endDate?: string): string {
    const summary = this.getStoreFinancialSummary(storeId, startDate, endDate);
    const expenses = this.getStoreExpenses(storeId);

    let csv = `RICHIE RICH PAN HOUSE - STORE FINANCIAL P&L & EXPENSE LEDGER\n`;
    csv += `Store Outlet,"${summary.storeName}" (${summary.storeId})\n`;
    csv += `Date Period,${startDate || 'All Past'} to ${endDate || 'Present'}\n`;
    csv += `Generated Timestamp,${new Date().toISOString()}\n\n`;

    csv += `EXECUTIVE FINANCIAL POSITION\n`;
    csv += `Metric,Amount (${CURRENCY})\n`;
    csv += `TOTAL STORE SALES (CREDIT INFLOW),${summary.totalSalesCredit.toFixed(2)}\n`;
    csv += `TOTAL STORE EXPENSES (DEBIT OUTFLOW),${summary.totalExpensesDebit.toFixed(2)}\n`;
    csv += `NET STORE BALANCE (PROFIT/LOSS),${summary.netStoreBalance.toFixed(2)}\n`;
    csv += `EXPECTED CASH IN DRAWER (Cash Sales - Cash Expenses),${summary.expectedCashInDrawer.toFixed(2)}\n`;
    csv += `TOTAL GST COLLECTED,${summary.totalGSTCollected.toFixed(2)}\n`;
    csv += `TOTAL ORDERS BILLED,${summary.totalOrdersCount}\n`;
    csv += `AVERAGE ORDER VALUE (AOV),${summary.averageOrderValue.toFixed(2)}\n\n`;

    csv += `SALES COLLECTION BREAKDOWN\n`;
    csv += `Payment Mode,Credit Amount (${CURRENCY})\n`;
    csv += `Cash,${summary.salesByPayment.cash.toFixed(2)}\n`;
    csv += `UPI QR,${summary.salesByPayment.upi_qr.toFixed(2)}\n`;
    csv += `Card,${summary.salesByPayment.card.toFixed(2)}\n`;
    csv += `Loyalty Points,${summary.salesByPayment.loyalty_points.toFixed(2)}\n`;
    csv += `Split / Other,${summary.salesByPayment.split.toFixed(2)}\n\n`;

    csv += `EXPENSE CATEGORY BREAKDOWN\n`;
    csv += `Expense Category,Debit Amount (${CURRENCY})\n`;
    Object.entries(summary.expensesByCategory).forEach(([cat, amt]) => {
      if (amt > 0) {
        csv += `"${cat.replace('_', ' ').toUpperCase()}",${amt.toFixed(2)}\n`;
      }
    });
    csv += `\n`;

    csv += `DETAILED STORE EXPENSES LOG\n`;
    csv += `Date,Voucher #,Category,Description,Paid To,Payment Mode,Logged By,Amount (${CURRENCY})\n`;
    expenses.forEach((e) => {
      csv += `"${e.date}","${e.voucherNumber}","${e.category}","${e.description.replace(/"/g, '""')}","${e.paidTo}","${e.paymentMethod}","${e.loggedBy}",${e.amount.toFixed(2)}\n`;
    });

    return csv;
  }
}

export const storage = StorageService.getInstance();
