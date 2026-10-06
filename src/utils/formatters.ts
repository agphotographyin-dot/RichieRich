/**
 * Universal Null-Safe Currency, Number and Date Formatting Utilities
 * Guarantees zero runtime errors across VPS, Vercel, Node, and browser environments.
 */

export const CURRENCY = '₹';

/**
 * Format any number into Indian Currency (e.g. ₹1,25,000 or ₹1,250.50)
 * Safely handles undefined, null, NaN, string numbers, or malformed inputs.
 */
export function formatINR(val: any, decimals = 0): string {
  const num = typeof val === 'number' ? val : parseFloat(String(val || 0));
  const safeNum = Number.isFinite(num) ? num : 0;
  
  if (decimals > 0) {
    return `${CURRENCY}${safeNum.toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }
  return `${CURRENCY}${safeNum.toLocaleString('en-IN')}`;
}

/**
 * Format plain number with Indian separators (e.g. 1,50,000)
 */
export function formatNumber(val: any): string {
  const num = typeof val === 'number' ? val : parseFloat(String(val || 0));
  const safeNum = Number.isFinite(num) ? num : 0;
  return safeNum.toLocaleString('en-IN');
}

/**
 * Safely format ISO or timestamp string into localized Date string
 */
export function formatDate(val: any, fallback = 'N/A'): string {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val) || fallback;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(val) || fallback;
  }
}

/**
 * Safely format ISO or timestamp string into localized Date & Time string
 */
export function formatDateTime(val: any, fallback = 'N/A'): string {
  if (!val) return fallback;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val) || fallback;
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(val) || fallback;
  }
}
