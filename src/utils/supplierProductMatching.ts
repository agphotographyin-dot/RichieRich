import { Supplier } from '../types/warehouse';
import { InventoryItem } from '../types';

/**
 * Returns all active products supplied or distributed by a given supplier.
 * Matches by:
 * 1. Explicit vendor / supplier name (item.vendor, item.vendors)
 * 2. Vendor ID or Supplier Code (item.vendorId, item.vendors)
 * 3. Supplier specialty/category affinity:
 *    - 'raw_materials' / Paan / Betel -> Paan leaves, betel nuts, gulkand, paan ingredients
 *    - 'spices_mukhwas' / Spices / Supari -> Mukhwas, Supari, Spices, Mouth Fresheners
 *    - 'cafe_beverages' / Cafe / Drinks -> Coffee, Tea, Chai, Cold Drinks, Beverages, Water
 *    - 'packaging' / Vark / Luxury -> Packaging, Silver/Gold Vark, Gift Boxes
 * 4. Item tags, names, or categories matching supplier keywords
 */
export function getSupplierProducts(
  supplier: Supplier | undefined | null,
  inventory: InventoryItem[]
): InventoryItem[] {
  const activeItems = inventory.filter((item) => item.status !== 'inactive');
  if (!supplier) return activeItems;

  const sName = (supplier.name || '').toLowerCase().trim();
  const sCode = (supplier.code || '').toLowerCase().trim();
  const sId = (supplier.id || '').toLowerCase().trim();
  const sCategory = (supplier.category || '').toLowerCase().trim();

  // Extract core keywords from supplier name (e.g., "Gujarat Betel Traders" -> ["gujarat", "betel"])
  const nameKeywords = sName
    .replace(/traders|distributors|distributor|enterprises|pvt|ltd|co|and|agency|supplier|works|market|supply/gi, '')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const matched = activeItems.filter((item) => {
    const v1 = (item.vendor || '').toLowerCase().trim();
    const vList = (item.vendors || []).map((v) => v.toLowerCase().trim());
    const vId = ((item as any).vendorId || '').toLowerCase().trim();
    const itemCat = (item.category || '').toLowerCase().trim();
    const tags = (item.tags || []).map((t) => t.toLowerCase().trim());
    const itemName = (item.name || '').toLowerCase().trim();
    const itemDesc = (item.description || '').toLowerCase().trim();
    const ingredients = (item.ingredients || []).map((ing) => ing.toLowerCase().trim());

    // 1. Direct match on item.vendor or item.vendors list
    if (v1 === sName || v1.includes(sName) || (sName.includes(v1) && v1.length >= 3)) {
      return true;
    }
    if (vList.some((v) => v === sName || v.includes(sName) || (sName.includes(v) && v.length >= 3))) {
      return true;
    }
    if (vId === sId || (item.vendors && item.vendors.includes(supplier.id))) {
      return true;
    }

    // 2. Keyword match from supplier name against item's vendor, name, or tags
    if (nameKeywords.some((kw) => v1.includes(kw) || vList.some((v) => v.includes(kw)))) {
      return true;
    }

    // 3. Category & Industry Specialty Association
    // Raw Materials / Betel Leaves / Paan Ingredients Supplier
    if (
      sCategory === 'raw_materials' ||
      sName.includes('betel') ||
      sName.includes('paan') ||
      sName.includes('gujarat betel')
    ) {
      if (
        itemCat === 'paan' ||
        tags.some((t) => t.includes('paan') || t.includes('betel') || t.includes('traditional') || t.includes('royal')) ||
        itemName.includes('paan') ||
        itemName.includes('betel') ||
        itemName.includes('gulkand') ||
        ingredients.some((ing) => ing.includes('leaf') || ing.includes('betel') || ing.includes('gulkand'))
      ) {
        return true;
      }
    }

    // Spices / Supari / Mukhwas / Mouth Freshener Supplier
    if (
      sCategory === 'spices_mukhwas' ||
      sName.includes('spice') ||
      sName.includes('supari') ||
      sName.includes('mukhwas') ||
      sName.includes('shreeji')
    ) {
      if (
        itemCat === 'mukhwas' ||
        itemCat === 'spices' ||
        tags.some((t) => t.includes('mukhwas') || t.includes('supari') || t.includes('digestive') || t.includes('freshener')) ||
        itemName.includes('mukhwas') ||
        itemName.includes('supari') ||
        itemName.includes('freshener') ||
        itemName.includes('saunf') ||
        itemName.includes('elaichi') ||
        itemName.includes('spray') ||
        itemName.includes('churna')
      ) {
        return true;
      }
    }

    // Cafe / Beverages / Coffee / Tea / Drinks Supplier
    if (
      sCategory === 'cafe_beverages' ||
      sCategory === 'cafe' ||
      sCategory === 'beverages' ||
      sName.includes('cafe') ||
      sName.includes('beverage') ||
      sName.includes('apex') ||
      sName.includes('coffee') ||
      sName.includes('tea')
    ) {
      if (
        itemCat === 'cafe' ||
        itemCat === 'beverages' ||
        itemCat === 'drinks' ||
        tags.some((t) => t.includes('coffee') || t.includes('tea') || t.includes('brew') || t.includes('water') || t.includes('beverage') || t.includes('espresso')) ||
        itemName.includes('coffee') ||
        itemName.includes('espresso') ||
        itemName.includes('chai') ||
        itemName.includes('tea') ||
        itemName.includes('water') ||
        itemName.includes('beverage') ||
        itemName.includes('shake') ||
        itemName.includes('latte') ||
        itemName.includes('cooler') ||
        ingredients.some((ing) => ing.includes('coffee') || ing.includes('arabica') || ing.includes('tea') || ing.includes('milk') || ing.includes('water'))
      ) {
        return true;
      }
    }

    // Packaging / Vark / Gold Foil Supplier
    if (
      sCategory === 'packaging' ||
      sName.includes('packaging') ||
      sName.includes('vark') ||
      sName.includes('royal luxury')
    ) {
      if (
        itemCat === 'packaging' ||
        tags.some((t) => t.includes('vark') || t.includes('gold') || t.includes('luxury') || t.includes('packaging') || t.includes('box')) ||
        itemName.includes('vark') ||
        itemName.includes('gold') ||
        itemName.includes('box') ||
        itemName.includes('packaging') ||
        ingredients.some((ing) => ing.includes('vark') || ing.includes('gold') || ing.includes('silver'))
      ) {
        return true;
      }
    }

    return false;
  });

  // If specific items matched the supplier, return all of them;
  // If nothing matched (e.g. a general supplier), return active inventory so user is never blocked
  return matched.length > 0 ? matched : activeItems;
}
