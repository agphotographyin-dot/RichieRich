import { InventoryItem, Order, OrderItem, Customer, Promotion, StoreLocation } from '../types';

export interface BackupEnvelope {
  system: string;
  version: string;
  timestamp: string;
  checksum: string;
  payload: {
    inventory: InventoryItem[];
    orders: Order[];
    customers: Customer[];
    promotions: Promotion[];
    stores?: StoreLocation[];
  };
}

export interface BackupValidationResult {
  isValid: boolean;
  isCryptographicallyVerified: boolean;
  isLegacyUnsigned?: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    inventoryCount: number;
    orderCount: number;
    customerCount: number;
    promotionCount: number;
  };
  sanitizedData?: {
    inventory: InventoryItem[];
    orders: Order[];
    customers: Customer[];
    promotions: Promotion[];
    stores?: StoreLocation[];
  };
}

const BACKUP_SALT_SECRET = 'RR_PAN_HOUSE_CRYPTOGRAPHIC_SALT_PROD_2026';

/**
 * Calculates SHA-256 Checksum using the browser's native Web Crypto API
 */
export async function calculateSha256Checksum(dataString: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString + BACKUP_SALT_SECRET);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (err) {
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `FALLBACK-${Math.abs(hash).toString(16)}`;
  }
}

/**
 * Validates, deep-sanitizes, and enforces strict boundary rules on imported backup data.
 * Eliminates schema poisoning, prototype injections, NaN values, negative prices, and invalid datatypes.
 */
export function validateAndSanitizeBackupPayload(rawPayload: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitized: {
    inventory: InventoryItem[];
    orders: Order[];
    customers: Customer[];
    promotions: Promotion[];
    stores?: StoreLocation[];
  };
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return {
      isValid: false,
      errors: ['Fatal: Backup payload is not a valid JSON object structure.'],
      warnings: [],
      sanitized: { inventory: [], orders: [], customers: [], promotions: [] },
    };
  }

  // --- 1. INVENTORY SANITIZATION & BOUNDARY CHECKS ---
  const rawInventory = Array.isArray(rawPayload.inventory) ? rawPayload.inventory : [];
  const sanitizedInventory: InventoryItem[] = [];

  rawInventory.forEach((item: any, idx: number) => {
    if (!item || typeof item !== 'object') {
      warnings.push(`Skipped malformed inventory row #${idx + 1}`);
      return;
    }

    const id = String(item.id || `inv-${Date.now()}-${idx}`).trim().slice(0, 64);
    const name = String(item.name || '').trim().slice(0, 150);
    const sku = String(item.sku || `SKU-${idx + 1}`).trim().toUpperCase().slice(0, 32);

    if (!name) {
      warnings.push(`Inventory item SKU ${sku} was dropped because it lacks a valid product name.`);
      return;
    }

    const costPrice = Math.max(0, Number.isFinite(Number(item.costPrice)) ? Number(item.costPrice) : 0);
    const sellingPrice = Math.max(costPrice, Number.isFinite(Number(item.sellingPrice)) ? Number(item.sellingPrice) : 0);
    const stockQuantity = Math.max(0, Number.isFinite(Number(item.stockQuantity)) ? Math.floor(Number(item.stockQuantity)) : 0);
    const lowStockThreshold = Math.max(1, Number.isFinite(Number(item.lowStockThreshold)) ? Math.floor(Number(item.lowStockThreshold)) : 5);
    const taxRate = Math.max(0, Math.min(100, Number.isFinite(Number(item.taxRate)) ? Number(item.taxRate) : 5));

    const storeAllocations: Record<string, number> = {};
    if (item.storeAllocations && typeof item.storeAllocations === 'object') {
      for (const [storeId, qty] of Object.entries(item.storeAllocations)) {
        if (typeof storeId === 'string' && storeId.trim()) {
          storeAllocations[storeId.trim()] = Math.max(0, Number.isFinite(Number(qty)) ? Math.floor(Number(qty)) : 0);
        }
      }
    }

    sanitizedInventory.push({
      id,
      name,
      sku,
      category: String(item.category || 'General').trim().slice(0, 50),
      description: item.description ? String(item.description).slice(0, 500) : '',
      sellingPrice,
      costPrice,
      stockQuantity,
      unit: String(item.unit || 'pcs').trim().slice(0, 20),
      barcode: String(item.barcode || sku).trim().slice(0, 64),
      lowStockThreshold,
      taxRate,
      isTaxApplicable: item.isTaxApplicable !== false,
      isAvailableForOnline: item.isAvailableForOnline !== false,
      marginPercentage: sellingPrice > 0 ? ((sellingPrice - costPrice) / sellingPrice) * 100 : 0,
      profitPerUnit: sellingPrice - costPrice,
      storeAllocations,
    });
  });

  // --- 2. ORDERS SANITIZATION & BOUNDARY CHECKS ---
  const rawOrders = Array.isArray(rawPayload.orders) ? rawPayload.orders : [];
  const sanitizedOrders: Order[] = [];

  rawOrders.forEach((o: any, idx: number) => {
    if (!o || typeof o !== 'object' || !Array.isArray(o.items)) {
      warnings.push(`Skipped malformed order #${idx + 1}`);
      return;
    }

    const orderNumber = String(o.orderNumber || `ORD-${Date.now()}-${idx}`).trim().slice(0, 32);
    const id = String(o.id || `order-${Date.now()}-${idx}`).trim().slice(0, 64);

    let calculatedTotalCost = 0;
    const items: OrderItem[] = [];

    o.items.forEach((it: any) => {
      if (!it || typeof it !== 'object') return;
      const qty = Math.max(1, Number.isFinite(Number(it.quantity)) ? Math.floor(Number(it.quantity)) : 1);
      const price = Math.max(0, Number.isFinite(Number(it.price)) ? Number(it.price) : 0);
      const costPrice = Math.max(0, Number.isFinite(Number(it.costPrice)) ? Number(it.costPrice) : 0);
      const subtotal = Math.max(0, Number.isFinite(Number(it.subtotal)) ? Number(it.subtotal) : price * qty);
      const profit = Number.isFinite(Number(it.profit)) ? Number(it.profit) : (price - costPrice) * qty;

      calculatedTotalCost += costPrice * qty;

      items.push({
        itemId: String(it.itemId || it.id || 'item').slice(0, 64),
        name: String(it.name || 'Product').slice(0, 150),
        sku: String(it.sku || 'SKU').slice(0, 32),
        price,
        costPrice,
        quantity: qty,
        subtotal,
        profit,
        taxRate: Math.max(0, Math.min(100, Number(it.taxRate) || 0)),
        isTaxApplicable: it.isTaxApplicable !== false,
      });
    });

    const grandTotal = Math.max(0, Number.isFinite(Number(o.grandTotal)) ? Number(o.grandTotal) : 0);
    const taxAmount = Math.max(0, Number.isFinite(Number(o.taxAmount)) ? Number(o.taxAmount) : 0);
    const totalCost = Math.max(0, Number.isFinite(Number(o.totalCost)) ? Number(o.totalCost) : calculatedTotalCost);
    const totalProfit = Number.isFinite(Number(o.totalProfit)) ? Number(o.totalProfit) : grandTotal - totalCost;

    const validPaymentMethods = ['cash', 'upi_qr', 'card', 'split', 'loyalty_points'];
    const paymentMethod = validPaymentMethods.includes(o.paymentMethod) ? o.paymentMethod : 'cash';

    sanitizedOrders.push({
      id,
      orderNumber,
      source: ['pos_counter', 'customer_online', 'dine_in'].includes(o.source) ? o.source : 'pos_counter',
      customerPhone: o.customerPhone ? String(o.customerPhone).replace(/[^0-9+]/g, '').slice(0, 15) : undefined,
      customerName: o.customerName ? String(o.customerName).slice(0, 100) : undefined,
      items,
      subtotal: Math.max(0, Number.isFinite(Number(o.subtotal)) ? Number(o.subtotal) : grandTotal - taxAmount),
      discountAmount: Math.max(0, Number.isFinite(Number(o.discountAmount)) ? Number(o.discountAmount) : 0),
      taxAmount,
      grandTotal,
      totalCost,
      totalProfit,
      paymentMethod,
      paymentStatus: ['paid', 'pending', 'refunded'].includes(o.paymentStatus) ? o.paymentStatus : 'paid',
      status: ['completed', 'pending', 'preparing', 'ready', 'cancelled'].includes(o.status) ? o.status : 'completed',
      createdAt: o.createdAt && !isNaN(Date.parse(o.createdAt)) ? o.createdAt : new Date().toISOString(),
      cashierName: o.cashierName ? String(o.cashierName).slice(0, 80) : 'Staff',
      storeId: o.storeId ? String(o.storeId).slice(0, 64) : undefined,
      storeName: o.storeName ? String(o.storeName).slice(0, 100) : undefined,
      counterName: o.counterName ? String(o.counterName).slice(0, 50) : undefined,
    });
  });

  // --- 3. CUSTOMERS SANITIZATION & BOUNDARY CHECKS ---
  const rawCustomers = Array.isArray(rawPayload.customers) ? rawPayload.customers : [];
  const sanitizedCustomers: Customer[] = [];

  rawCustomers.forEach((c: any, idx: number) => {
    if (!c || typeof c !== 'object') return;

    const phone = String(c.phone || '').replace(/[^0-9+]/g, '').slice(0, 15);
    if (!phone || phone.length < 8) {
      warnings.push(`Customer at index #${idx + 1} lacks a valid telephone number.`);
      return;
    }

    sanitizedCustomers.push({
      id: String(c.id || `cust-${Date.now()}-${idx}`).slice(0, 64),
      phone,
      name: String(c.name || 'Walk-in Customer').slice(0, 100),
      loyaltyPoints: Math.max(0, Math.min(1000000, Number.isFinite(Number(c.loyaltyPoints)) ? Math.floor(Number(c.loyaltyPoints)) : 0)),
      totalSpent: Math.max(0, Number.isFinite(Number(c.totalSpent)) ? Number(c.totalSpent) : 0),
      totalOrders: Math.max(1, Number.isFinite(Number(c.totalOrders)) ? Math.floor(Number(c.totalOrders)) : 1),
      tier: ['Silver', 'Gold', 'Platinum Royal'].includes(c.tier) ? c.tier : 'Silver',
      joinDate: c.joinDate || c.joinedDate || new Date().toISOString(),
    });
  });

  // --- 4. PROMOTIONS SANITIZATION ---
  const rawPromos = Array.isArray(rawPayload.promotions) ? rawPayload.promotions : [];
  const sanitizedPromotions: Promotion[] = [];

  rawPromos.forEach((p: any, idx: number) => {
    if (!p || typeof p !== 'object' || !p.code) return;
    sanitizedPromotions.push({
      id: String(p.id || `promo-${idx}`).slice(0, 64),
      code: String(p.code).trim().toUpperCase().slice(0, 30),
      title: String(p.title || p.description || p.code).slice(0, 100),
      description: String(p.description || '').slice(0, 200),
      discountType: p.discountType === 'percentage' ? 'percentage' : 'fixed',
      discountValue: Math.max(0, Number.isFinite(Number(p.discountValue)) ? Number(p.discountValue) : 0),
      minOrderAmount: Math.max(0, Number.isFinite(Number(p.minOrderAmount)) ? Number(p.minOrderAmount) : 0),
      startDate: p.startDate && !isNaN(Date.parse(p.startDate)) ? p.startDate : new Date().toISOString(),
      endDate: p.endDate && !isNaN(Date.parse(p.endDate)) ? p.endDate : new Date(Date.now() + 86400000 * 365).toISOString(),
      isActive: p.isActive !== false,
      usageCount: Math.max(0, Number(p.usageCount) || 0),
    });
  });

  if (sanitizedInventory.length === 0 && sanitizedOrders.length === 0 && sanitizedCustomers.length === 0) {
    errors.push('The backup file contains zero valid inventory items, orders, or customer profiles.');
    return {
      isValid: false,
      errors,
      warnings,
      sanitized: { inventory: [], orders: [], customers: [], promotions: [] },
    };
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitized: {
      inventory: sanitizedInventory,
      orders: sanitizedOrders,
      customers: sanitizedCustomers,
      promotions: sanitizedPromotions,
    },
  };
}

/**
 * Creates a cryptographically signed Backup Envelope with SHA-256 checksum
 */
export async function createSignedBackupEnvelope(payload: {
  inventory: InventoryItem[];
  orders: Order[];
  customers: Customer[];
  promotions: Promotion[];
  stores?: StoreLocation[];
}): Promise<BackupEnvelope> {
  const payloadString = JSON.stringify(payload);
  const checksum = await calculateSha256Checksum(payloadString);

  return {
    system: 'RICHIE_RICH_POS_CLOUD',
    version: '2.6',
    timestamp: new Date().toISOString(),
    checksum,
    payload,
  };
}

/**
 * Verifies and parses an imported backup file, performing SHA-256 integrity checks and deep schema validation.
 */
export async function verifyAndSanitizeImportFile(fileContent: string): Promise<BackupValidationResult> {
  let parsed: any;
  try {
    parsed = JSON.parse(fileContent);
  } catch (err: any) {
    return {
      isValid: false,
      isCryptographicallyVerified: false,
      errors: [`JSON Syntax Error: File is corrupted or not valid JSON (${err.message}).`],
      warnings: [],
      stats: { inventoryCount: 0, orderCount: 0, customerCount: 0, promotionCount: 0 },
    };
  }

  // Case A: Modern Cryptographically Signed Envelope
  if (parsed.system === 'RICHIE_RICH_POS_CLOUD' && parsed.checksum && parsed.payload) {
    const payloadString = JSON.stringify(parsed.payload);
    const expectedChecksum = await calculateSha256Checksum(payloadString);

    if (expectedChecksum !== parsed.checksum) {
      return {
        isValid: false,
        isCryptographicallyVerified: false,
        errors: [
          'CRITICAL SECURITY ALERT: Cryptographic Checksum Mismatch! This backup file has been tampered with or modified since its creation.',
        ],
        warnings: [],
        stats: { inventoryCount: 0, orderCount: 0, customerCount: 0, promotionCount: 0 },
      };
    }

    const { isValid, errors, warnings, sanitized } = validateAndSanitizeBackupPayload(parsed.payload);

    return {
      isValid,
      isCryptographicallyVerified: true,
      errors,
      warnings,
      stats: {
        inventoryCount: sanitized.inventory.length,
        orderCount: sanitized.orders.length,
        customerCount: sanitized.customers.length,
        promotionCount: sanitized.promotions.length,
      },
      sanitizedData: sanitized,
    };
  }

  // Case B: Legacy Raw Payload (or older snapshot format)
  const targetPayload = parsed.payload ? parsed.payload : parsed;
  const { isValid, errors, warnings, sanitized } = validateAndSanitizeBackupPayload(targetPayload);

  return {
    isValid,
    isCryptographicallyVerified: false,
    isLegacyUnsigned: true,
    errors,
    warnings: [
      'Notice: This backup was generated by a legacy version or lacks a SHA-256 digital signature envelope. It has been strictly sanitized.',
      ...warnings,
    ],
    stats: {
      inventoryCount: sanitized.inventory.length,
      orderCount: sanitized.orders.length,
      customerCount: sanitized.customers.length,
      promotionCount: sanitized.promotions.length,
    },
    sanitizedData: sanitized,
  };
}
