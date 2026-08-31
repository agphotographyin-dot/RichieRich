/**
 * Date utility functions for accurate local calendar date comparisons,
 * 12:00 AM midnight resets, and multi-timezone handling.
 */

/**
 * Returns YYYY-MM-DD for a given date or ISO string based on the user's local timezone.
 */
export function getLocalDateString(dateInput: Date | string | number = new Date()): string {
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' 
      ? new Date(dateInput) 
      : dateInput;
      
    if (!d || isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Checks if a given timestamp/ISO string is on the same local calendar day (since 12:00 AM midnight).
 */
export function isToday(dateInput: Date | string | number): boolean {
  if (!dateInput) return false;
  return getLocalDateString(dateInput) === getLocalDateString(new Date());
}

/**
 * Checks if two timestamps/ISO strings occur on the same local calendar day.
 */
export function isSameDay(date1: Date | string | number, date2: Date | string | number = new Date()): boolean {
  if (!date1 || !date2) return false;
  return getLocalDateString(date1) === getLocalDateString(date2);
}

/**
 * Gets the start and end timestamps (in ms) of today's 12:00 AM midnight to 11:59:59 PM window.
 */
export function getTodayBounds(): { startMs: number; endMs: number; dateString: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
    dateString: getLocalDateString(now),
  };
}
