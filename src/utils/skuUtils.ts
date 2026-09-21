import { InventoryItem } from '../types';

/**
 * Standard prefix mapping by product category or keywords
 */
export const CATEGORY_SKU_PREFIXES: Record<string, string> = {
  paan: 'PAN',
  cafe: 'COF',
  coffee: 'COF',
  beverages: 'BEV',
  shakes: 'SHK',
  shake: 'SHK',
  mukhwas: 'MUK',
  chocolates: 'CHO',
  chocolate: 'CHO',
  essentials: 'ESS',
  herbal: 'HER',
  hookah: 'HUK',
  tobacco_free: 'HER',
  confectionery: 'CNF',
};

/**
 * Sanitize and standardize a single SKU string:
 * - Trims whitespace
 * - Converts to UPPERCASE
 * - Replaces dots, underscores, slashes, and spaces with hyphens
 * - Removes non-alphanumeric and non-hyphen characters
 * - Collapses consecutive hyphens into a single hyphen
 * - Strips leading and trailing hyphens
 */
export function cleanSingleSku(
  rawSku: string | undefined | null,
  fallback?: {
    name?: string;
    category?: string;
    id?: string;
    index?: number;
  }
): string {
  let sku = (rawSku || '').trim();

  // Replace common delimiter symbols with hyphen
  sku = sku.replace(/[_\.\/\\\|\s,;:~+=]+/g, '-');

  // Remove any character that is not alphanumeric or hyphen
  sku = sku.replace(/[^a-zA-Z0-9\-]/g, '');

  // Collapse consecutive hyphens
  sku = sku.replace(/\-+/g, '-');

  // Strip leading and trailing hyphens
  sku = sku.replace(/^\-+|\-+$/g, '');

  // Convert to clean UPPERCASE
  sku = sku.toUpperCase();

  // If valid, return cleaned string
  if (sku.length >= 2) {
    return sku;
  }

  // Fallback generation if SKU was completely empty or invalid
  const cat = (fallback?.category || 'Essentials').toLowerCase();
  let prefix = CATEGORY_SKU_PREFIXES[cat] || 'ESS';
  
  if (cat.includes('paan') || cat.includes('pan')) prefix = 'PAN';
  else if (cat.includes('cafe') || cat.includes('coffee') || cat.includes('tea')) prefix = 'COF';
  else if (cat.includes('shake') || cat.includes('beverage')) prefix = 'SHK';
  else if (cat.includes('mukhwas')) prefix = 'MUK';
  else if (cat.includes('chocolate')) prefix = 'CHO';

  // Sub-code from product name
  let nameCode = '';
  if (fallback?.name) {
    const words = fallback.name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);
    if (words.length >= 2) {
      nameCode = words.slice(0, 2).map((w) => w.substring(0, 3).toUpperCase()).join('-');
    } else if (words.length === 1) {
      nameCode = words[0].substring(0, 3).toUpperCase();
    }
  }

  const num = String((fallback?.index ?? 0) + 1).padStart(2, '0');
  if (nameCode) {
    return `${prefix}-${nameCode}-${num}`;
  }

  return `${prefix}-${num}`;
}

export interface SkuAuditChange {
  id: string;
  name: string;
  category: string;
  oldSku: string;
  newSku: string;
  reason: string;
}

export interface SkuCleanResult {
  items: InventoryItem[];
  totalAudited: number;
  totalCleaned: number;
  duplicateResolvedCount: number;
  changes: SkuAuditChange[];
  timestamp: string;
}

/**
 * Standardize and clean all SKUs across an inventory collection.
 * Guarantees 100% uniqueness, uppercase consistency, and no dirty artifacts.
 */
export function cleanAndStandardizeInventorySkus(items: InventoryItem[]): SkuCleanResult {
  if (!Array.isArray(items)) {
    return {
      items: [],
      totalAudited: 0,
      totalCleaned: 0,
      duplicateResolvedCount: 0,
      changes: [],
      timestamp: new Date().toISOString(),
    };
  }

  const seenSkus = new Set<string>();
  const changes: SkuAuditChange[] = [];
  let duplicateResolvedCount = 0;

  const cleanedItems: InventoryItem[] = items.map((item, index) => {
    const rawOldSku = item.sku || '';
    let cleaned = cleanSingleSku(rawOldSku, {
      name: item.name,
      category: item.category,
      id: item.id,
      index,
    });

    let reasons: string[] = [];

    if (rawOldSku !== cleaned) {
      if (!rawOldSku) reasons.push('Generated missing SKU code');
      else if (rawOldSku.toLowerCase() === cleaned.toLowerCase() && rawOldSku !== cleaned) {
        reasons.push('Standardized uppercase & trimmed spaces');
      } else {
        reasons.push('Sanitized symbols & formatted delimiters');
      }
    }

    // Resolve duplicate SKU collisions
    const baseCleaned = cleaned;
    let collisionCounter = 1;
    while (seenSkus.has(cleaned)) {
      collisionCounter++;
      cleaned = `${baseCleaned}-${String(collisionCounter).padStart(2, '0')}`;
      if (!reasons.includes('Resolved duplicate SKU collision')) {
        reasons.push('Resolved duplicate SKU collision');
        duplicateResolvedCount++;
      }
    }

    seenSkus.add(cleaned);

    if (reasons.length > 0 || rawOldSku !== cleaned) {
      changes.push({
        id: item.id,
        name: item.name,
        category: item.category,
        oldSku: rawOldSku || '(empty)',
        newSku: cleaned,
        reason: reasons.join(', ') || 'Standardized format',
      });
    }

    return {
      ...item,
      sku: cleaned,
    };
  });

  return {
    items: cleanedItems,
    totalAudited: items.length,
    totalCleaned: changes.length,
    duplicateResolvedCount,
    changes,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Detect all duplicate SKUs across an inventory collection.
 * Returns a Map of normalized SKU -> array of conflicting InventoryItems.
 */
export function detectDuplicateSkus(items: InventoryItem[]): Map<string, InventoryItem[]> {
  const map = new Map<string, InventoryItem[]>();
  if (!Array.isArray(items)) return map;

  for (const item of items) {
    const raw = (item.sku || '').trim().toUpperCase();
    if (!raw) continue;
    const existing = map.get(raw) || [];
    existing.push(item);
    map.set(raw, existing);
  }

  // Filter down to only those with duplicates (length > 1)
  const duplicateOnlyMap = new Map<string, InventoryItem[]>();
  for (const [sku, list] of map.entries()) {
    if (list.length > 1) {
      duplicateOnlyMap.set(sku, list);
    }
  }

  return duplicateOnlyMap;
}

/**
 * Check if a prospective SKU is already assigned to another item in the catalog.
 */
export function checkIsSkuDuplicate(
  targetSku: string | undefined | null,
  existingItems: InventoryItem[],
  excludeItemId?: string
): { isDuplicate: boolean; conflictingItem?: InventoryItem; duplicateCount: number } {
  if (!targetSku || !Array.isArray(existingItems)) {
    return { isDuplicate: false, duplicateCount: 0 };
  }

  const cleanTarget = cleanSingleSku(targetSku).toUpperCase();
  if (!cleanTarget) return { isDuplicate: false, duplicateCount: 0 };

  const matches = existingItems.filter((i) => {
    if (excludeItemId && i.id === excludeItemId) return false;
    const itemSku = cleanSingleSku(i.sku).toUpperCase();
    return itemSku === cleanTarget;
  });

  return {
    isDuplicate: matches.length > 0,
    conflictingItem: matches[0],
    duplicateCount: matches.length,
  };
}

/**
 * Generates the next guaranteed-unique SKU if a collision exists.
 */
export function generateUniqueSku(
  baseSku: string,
  existingItems: InventoryItem[],
  excludeItemId?: string
): string {
  let cleaned = cleanSingleSku(baseSku);
  if (!cleaned) cleaned = 'SKU-01';

  let counter = 1;
  let candidate = cleaned;
  while (checkIsSkuDuplicate(candidate, existingItems, excludeItemId).isDuplicate) {
    counter++;
    const root = cleaned.replace(/-\d+$/, '');
    candidate = `${root}-${String(counter).padStart(2, '0')}`;
  }

  return candidate;
}

export interface DuplicateMergedGroup {
  sku: string;
  keptItem: InventoryItem;
  removedItems: InventoryItem[];
  consolidatedStock: number;
}

export interface BulkDuplicateRemovalResult {
  cleanedItems: InventoryItem[];
  removedItems: InventoryItem[];
  mergedGroups: DuplicateMergedGroup[];
  totalRemoved: number;
  totalUniqueKept: number;
  timestamp: string;
}

/**
 * Bulk removes duplicate SKU records from the inventory catalog.
 * For each duplicate group, keeps the primary item (highest stock or earliest entry)
 * and consolidates all stock into the kept item so no inventory is lost.
 */
export function bulkRemoveDuplicateSkus(items: InventoryItem[]): BulkDuplicateRemovalResult {
  if (!Array.isArray(items)) {
    return {
      cleanedItems: [],
      removedItems: [],
      mergedGroups: [],
      totalRemoved: 0,
      totalUniqueKept: 0,
      timestamp: new Date().toISOString(),
    };
  }

  const skuGroups = new Map<string, InventoryItem[]>();

  for (const item of items) {
    const normSku = cleanSingleSku(item.sku).toUpperCase();
    const group = skuGroups.get(normSku) || [];
    group.push(item);
    skuGroups.set(normSku, group);
  }

  const cleanedItems: InventoryItem[] = [];
  const removedItems: InventoryItem[] = [];
  const mergedGroups: DuplicateMergedGroup[] = [];

  for (const [sku, group] of skuGroups.entries()) {
    if (group.length === 1) {
      cleanedItems.push({
        ...group[0],
        sku,
      });
      continue;
    }

    // Sort group: prefer item with highest stock, or earlier id
    const sorted = [...group].sort((a, b) => {
      const stockDiff = (b.stockQuantity || 0) - (a.stockQuantity || 0);
      if (stockDiff !== 0) return stockDiff;
      return a.id.localeCompare(b.id);
    });

    const primary = sorted[0];
    const duplicates = sorted.slice(1);

    // Sum stock from all duplicates
    let addedStock = 0;
    duplicates.forEach((dup) => {
      addedStock += dup.stockQuantity || 0;
      removedItems.push(dup);
    });

    const consolidatedStock = (primary.stockQuantity || 0) + addedStock;

    // Consolidate store allocations if present
    const consolidatedStoreAllocations = { ...(primary.storeAllocations || {}) };
    duplicates.forEach((dup) => {
      if (dup.storeAllocations) {
        Object.entries(dup.storeAllocations).forEach(([storeKey, qty]) => {
          consolidatedStoreAllocations[storeKey] =
            (consolidatedStoreAllocations[storeKey] || 0) + (Number(qty) || 0);
        });
      }
    });

    const keptItem: InventoryItem = {
      ...primary,
      sku,
      stockQuantity: consolidatedStock,
      storeAllocations: consolidatedStoreAllocations,
    };

    cleanedItems.push(keptItem);
    mergedGroups.push({
      sku,
      keptItem,
      removedItems: duplicates,
      consolidatedStock,
    });
  }

  return {
    cleanedItems,
    removedItems,
    mergedGroups,
    totalRemoved: removedItems.length,
    totalUniqueKept: cleanedItems.length,
    timestamp: new Date().toISOString(),
  };
}

