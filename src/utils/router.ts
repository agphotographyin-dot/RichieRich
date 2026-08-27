import { Role, AdminTab, WarehouseTab } from '../types';

export interface RouteState {
  role: Role;
  adminTab: AdminTab;
  warehouseTab?: WarehouseTab;
}

export function parseCurrentRoute(): RouteState {
  if (typeof window === 'undefined') {
    return { role: 'landing', adminTab: 'dashboard', warehouseTab: 'dashboard' };
  }

  const pathname = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const tabQuery = searchParams.get('tab') as AdminTab | null;
  const whTabQuery = searchParams.get('wh_tab') as WarehouseTab | null;

  // 1. Check Hash first (supports static hosting /#/pos /#/warehouse etc)
  const cleanHash = hash.replace(/^#\/?/, '');
  if (cleanHash.startsWith('warehouse') || cleanHash.startsWith('inventory-wh')) {
    const hashTab = cleanHash.split('/')[1] as WarehouseTab | undefined;
    return { role: 'warehouse', adminTab: 'dashboard', warehouseTab: hashTab || whTabQuery || 'dashboard' };
  }
  if (cleanHash.startsWith('pos') || cleanHash.startsWith('point-of-sale')) {
    return { role: 'pos', adminTab: 'dashboard' };
  }
  if (cleanHash.startsWith('customer') || cleanHash.startsWith('order') || cleanHash.startsWith('menu')) {
    return { role: 'customer', adminTab: 'dashboard' };
  }
  if (cleanHash.startsWith('admin')) {
    const hashTab = cleanHash.split('/')[1];
    if (hashTab === 'inventory') {
      return { role: 'warehouse', adminTab: 'dashboard', warehouseTab: 'inventory' };
    }
    return {
      role: 'admin',
      adminTab: (hashTab as AdminTab) || tabQuery || 'dashboard',
    };
  }
  if (cleanHash === 'landing' || cleanHash === 'login' || cleanHash === 'home') {
    return { role: 'landing', adminTab: 'dashboard' };
  }

  // 2. Check Standard Pathname
  if (pathname.includes('/warehouse')) {
    let whTab: WarehouseTab = 'dashboard';
    if (whTabQuery && ['dashboard', 'inventory', 'transfers', 'purchases', 'locations', 'adjustments', 'audit_trail', 'reports'].includes(whTabQuery)) {
      whTab = whTabQuery;
    }
    return { role: 'warehouse', adminTab: 'dashboard', warehouseTab: whTab };
  }

  if (pathname.includes('/pos') || pathname.includes('/point-of-sale')) {
    return { role: 'pos', adminTab: 'dashboard' };
  }

  if (pathname.includes('/customer') || pathname.includes('/order') || pathname.includes('/menu')) {
    return { role: 'customer', adminTab: 'dashboard' };
  }

  if (pathname.includes('/admin')) {
    if (tabQuery === 'inventory' as any || pathname.includes('/admin/inventory')) {
      return { role: 'warehouse', adminTab: 'dashboard', warehouseTab: 'inventory' };
    }
    let tab: AdminTab = 'dashboard';
    if (tabQuery && ['dashboard', 'staff_counters', 'analytics', 'orders', 'loyalty_promos', 'backups'].includes(tabQuery)) {
      tab = tabQuery;
    } else if (pathname.includes('/admin/staff') || pathname.includes('/admin/counters')) tab = 'staff_counters';
    else if (pathname.includes('/admin/analytics')) tab = 'analytics';
    else if (pathname.includes('/admin/orders')) tab = 'orders';
    else if (pathname.includes('/admin/loyalty') || pathname.includes('/admin/promos')) tab = 'loyalty_promos';
    else if (pathname.includes('/admin/backups') || pathname.includes('/admin/security')) tab = 'backups';

    return { role: 'admin', adminTab: tab };
  }

  // 3. Query Parameter ?role=
  const roleQuery = searchParams.get('role') as Role | null;
  if (roleQuery && ['admin', 'pos', 'customer', 'landing', 'warehouse'].includes(roleQuery)) {
    return { role: roleQuery, adminTab: tabQuery || 'dashboard', warehouseTab: whTabQuery || 'dashboard' };
  }

  // Default Root is the Landing Page
  return { role: 'landing', adminTab: 'dashboard', warehouseTab: 'dashboard' };
}

export function updateRoute(role: Role, adminTab?: AdminTab, replace = false, warehouseTab?: WarehouseTab) {
  if (typeof window === 'undefined') return;

  let targetUrl = '/';
  if (role === 'landing') {
    targetUrl = '/';
  } else if (role === 'warehouse') {
    targetUrl = warehouseTab && warehouseTab !== 'dashboard' ? `/warehouse?wh_tab=${warehouseTab}` : '/warehouse';
  } else if (role === 'pos') {
    targetUrl = '/pos';
  } else if (role === 'customer') {
    targetUrl = '/customer';
  } else if (role === 'admin') {
    targetUrl = adminTab && adminTab !== 'dashboard' ? `/admin?tab=${adminTab}` : '/admin';
  }

  const currentPathWithSearch = window.location.pathname + window.location.search;
  if (currentPathWithSearch !== targetUrl) {
    if (replace) {
      window.history.replaceState({ role, adminTab, warehouseTab }, '', targetUrl);
    } else {
      window.history.pushState({ role, adminTab, warehouseTab }, '', targetUrl);
    }
  }
}

export function getFullUrlForRole(role: Role, tab?: AdminTab, whTab?: WarehouseTab): string {
  if (typeof window === 'undefined') return '';
  const origin = window.location.origin;
  if (role === 'landing') return `${origin}/`;
  if (role === 'warehouse') return whTab && whTab !== 'dashboard' ? `${origin}/warehouse?wh_tab=${whTab}` : `${origin}/warehouse`;
  if (role === 'pos') return `${origin}/pos`;
  if (role === 'customer') return `${origin}/customer`;
  return tab && tab !== 'dashboard' ? `${origin}/admin?tab=${tab}` : `${origin}/admin`;
}
