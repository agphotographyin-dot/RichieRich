import { Role, AdminTab } from '../types';

export interface RouteState {
  role: Role;
  adminTab: AdminTab;
}

export function parseCurrentRoute(): RouteState {
  if (typeof window === 'undefined') {
    return { role: 'admin', adminTab: 'dashboard' };
  }

  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const tabQuery = searchParams.get('tab') as AdminTab | null;

  // 1. Check Hash first (supports static hosting /#/pos etc)
  const cleanHash = hash.replace(/^#\/?/, '');
  if (cleanHash.startsWith('pos') || cleanHash.startsWith('point-of-sale')) {
    return { role: 'pos', adminTab: 'dashboard' };
  }
  if (cleanHash.startsWith('customer') || cleanHash.startsWith('order') || cleanHash.startsWith('menu')) {
    return { role: 'customer', adminTab: 'dashboard' };
  }
  if (cleanHash.startsWith('admin')) {
    const hashTab = cleanHash.split('/')[1] as AdminTab | undefined;
    return {
      role: 'admin',
      adminTab: hashTab || tabQuery || 'dashboard',
    };
  }

  // 2. Check Standard Pathname
  if (pathname.includes('/pos') || pathname.includes('/point-of-sale')) {
    return { role: 'pos', adminTab: 'dashboard' };
  }

  if (pathname.includes('/customer') || pathname.includes('/order') || pathname.includes('/menu')) {
    return { role: 'customer', adminTab: 'dashboard' };
  }

  if (pathname.includes('/admin')) {
    let tab: AdminTab = 'dashboard';
    if (tabQuery && ['dashboard', 'inventory', 'staff_counters', 'analytics', 'orders', 'loyalty_promos', 'backups'].includes(tabQuery)) {
      tab = tabQuery;
    } else if (pathname.includes('/admin/inventory')) tab = 'inventory';
    else if (pathname.includes('/admin/staff') || pathname.includes('/admin/counters')) tab = 'staff_counters';
    else if (pathname.includes('/admin/analytics')) tab = 'analytics';
    else if (pathname.includes('/admin/orders')) tab = 'orders';
    else if (pathname.includes('/admin/loyalty') || pathname.includes('/admin/promos')) tab = 'loyalty_promos';
    else if (pathname.includes('/admin/backups') || pathname.includes('/admin/security')) tab = 'backups';

    return { role: 'admin', adminTab: tab };
  }

  // Default root `/` -> check if query param or default to admin
  const roleQuery = searchParams.get('role') as Role | null;
  if (roleQuery && ['admin', 'pos', 'customer'].includes(roleQuery)) {
    return { role: roleQuery, adminTab: tabQuery || 'dashboard' };
  }

  return { role: 'admin', adminTab: 'dashboard' };
}

export function updateRoute(role: Role, adminTab?: AdminTab, replace = false) {
  if (typeof window === 'undefined') return;

  let targetUrl = '/admin';
  if (role === 'pos') {
    targetUrl = '/pos';
  } else if (role === 'customer') {
    targetUrl = '/customer';
  } else {
    targetUrl = adminTab && adminTab !== 'dashboard' ? `/admin?tab=${adminTab}` : '/admin';
  }

  const currentPathWithSearch = window.location.pathname + window.location.search;
  if (currentPathWithSearch !== targetUrl) {
    if (replace) {
      window.history.replaceState({ role, adminTab }, '', targetUrl);
    } else {
      window.history.pushState({ role, adminTab }, '', targetUrl);
    }
  }
}

export function getFullUrlForRole(role: Role, tab?: AdminTab): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  if (role === 'pos') return `${origin}/pos`;
  if (role === 'customer') return `${origin}/customer`;
  return tab && tab !== 'dashboard' ? `${origin}/admin?tab=${tab}` : `${origin}/admin`;
}
