import { Role, AdminTab, WarehouseTab, StoreAdminTab } from '../types';

export interface RouteState {
  role: Role;
  adminTab: AdminTab;
  warehouseTab?: WarehouseTab;
  storeAdminTab?: StoreAdminTab;
}

export function parseCurrentRoute(): RouteState {
  if (typeof window === 'undefined') {
    return { role: 'landing', adminTab: 'dashboard', warehouseTab: 'dashboard', storeAdminTab: 'overview' };
  }

  try {
    const pathname = (window.location?.pathname || '').toLowerCase();
    const hash = (window.location?.hash || '').toLowerCase();
    const searchParams = new URLSearchParams(window.location?.search || '');
    
    const tabQuery = (searchParams.get('tab') || searchParams.get('admin_tab')) as AdminTab | null;
    const whTabQuery = (searchParams.get('wh_tab') || searchParams.get('warehouse_tab')) as WarehouseTab | null;
    const storeAdminTabQuery = (searchParams.get('store_tab') || searchParams.get('storeadmin_tab')) as StoreAdminTab | null;

    // 1. Flexible Query Parameter & Flag Detection (?role=pos, ?portal=warehouse, ?page=admin, or simply ?pos, ?warehouse, ?admin)
    const rawRoleParam = (searchParams.get('role') || searchParams.get('portal') || searchParams.get('page') || searchParams.get('view') || '').toLowerCase();
    let detectedQueryRole: Role | null = null;
    if (['admin', 'pos', 'customer', 'landing', 'warehouse', 'store_admin', 'storeadmin', 'store-admin'].includes(rawRoleParam)) {
      detectedQueryRole = (rawRoleParam === 'storeadmin' || rawRoleParam === 'store-admin') ? 'store_admin' : (rawRoleParam as Role);
    } else if (searchParams.has('admin')) {
      detectedQueryRole = 'admin';
    } else if (searchParams.has('pos') || searchParams.has('point-of-sale') || searchParams.has('counter')) {
      detectedQueryRole = 'pos';
    } else if (searchParams.has('warehouse') || searchParams.has('inventory')) {
      detectedQueryRole = 'warehouse';
    } else if (searchParams.has('store-admin') || searchParams.has('storeadmin') || searchParams.has('store')) {
      detectedQueryRole = 'store_admin';
    } else if (searchParams.has('customer') || searchParams.has('order') || searchParams.has('menu')) {
      detectedQueryRole = 'customer';
    }

    if (detectedQueryRole) {
      return {
        role: detectedQueryRole,
        adminTab: tabQuery || 'dashboard',
        warehouseTab: whTabQuery || 'dashboard',
        storeAdminTab: storeAdminTabQuery || 'overview',
      };
    }

    // 2. Hash Route Detection (supports /#/pos, /#pos, /#/warehouse/inventory, /#/store-admin/expenses, etc.)
    const cleanHash = hash.replace(/^#\/?/, '');
    if (cleanHash.length > 0) {
      const hashSegments = cleanHash.split('/');
      const primaryHash = hashSegments[0];
      const subHash = hashSegments[1];

      if (primaryHash === 'store-admin' || primaryHash === 'storeadmin' || primaryHash === 'store') {
        const sTab = (subHash as StoreAdminTab) || storeAdminTabQuery || 'overview';
        return {
          role: 'store_admin',
          adminTab: 'dashboard',
          warehouseTab: 'dashboard',
          storeAdminTab: sTab,
        };
      }
      if (primaryHash === 'warehouse' || primaryHash === 'inventory-wh' || primaryHash === 'central-warehouse') {
        const wTab = (subHash as WarehouseTab) || whTabQuery || 'dashboard';
        return {
          role: 'warehouse',
          adminTab: 'dashboard',
          warehouseTab: wTab,
          storeAdminTab: 'overview',
        };
      }
      if (primaryHash === 'pos' || primaryHash === 'point-of-sale' || primaryHash === 'counter' || primaryHash === 'billing') {
        return { role: 'pos', adminTab: 'dashboard', warehouseTab: 'dashboard', storeAdminTab: 'overview' };
      }
      if (primaryHash === 'customer' || primaryHash === 'order' || primaryHash === 'menu' || primaryHash === 'shop') {
        return { role: 'customer', adminTab: 'dashboard', warehouseTab: 'dashboard', storeAdminTab: 'overview' };
      }
      if (primaryHash === 'admin') {
        if (subHash === 'inventory') {
          return { role: 'warehouse', adminTab: 'dashboard', warehouseTab: 'inventory', storeAdminTab: 'overview' };
        }
        return {
          role: 'admin',
          adminTab: (subHash as AdminTab) || tabQuery || 'dashboard',
          warehouseTab: 'dashboard',
          storeAdminTab: 'overview',
        };
      }
      if (primaryHash === 'landing' || primaryHash === 'home' || primaryHash === 'login') {
        return { role: 'landing', adminTab: 'dashboard', warehouseTab: 'dashboard', storeAdminTab: 'overview' };
      }
    }

    // 3. Standard Pathname Deep Link Detection (supports direct URL access like /pos, /warehouse, /admin, /store-admin, etc.)
    // Clean trailing slash for consistent segment inspection
    const normalizedPath = pathname.replace(/\/+$/, '');

    // Check Store Admin first (to avoid substring conflict with /admin)
    if (normalizedPath.includes('/store-admin') || normalizedPath.includes('/storeadmin') || normalizedPath.includes('/store/admin')) {
      let sTab: StoreAdminTab = 'overview';
      if (storeAdminTabQuery && ['overview', 'finances', 'expenses', 'orders', 'inventory', 'staff', 'closing'].includes(storeAdminTabQuery)) {
        sTab = storeAdminTabQuery;
      } else if (normalizedPath.includes('/expenses')) {
        sTab = 'expenses';
      } else if (normalizedPath.includes('/finances') || normalizedPath.includes('/financials')) {
        sTab = 'finances';
      } else if (normalizedPath.includes('/orders') || normalizedPath.includes('/sales')) {
        sTab = 'orders';
      } else if (normalizedPath.includes('/inventory') || normalizedPath.includes('/stock')) {
        sTab = 'inventory';
      } else if (normalizedPath.includes('/staff') || normalizedPath.includes('/counters')) {
        sTab = 'staff';
      } else if (normalizedPath.includes('/closing')) {
        sTab = 'closing';
      }
      return { role: 'store_admin', adminTab: 'dashboard', warehouseTab: 'dashboard', storeAdminTab: sTab };
    }

    // Check Central Warehouse
    if (normalizedPath.includes('/warehouse')) {
      let whTab: WarehouseTab = 'dashboard';
      if (whTabQuery && ['dashboard', 'inventory', 'store_stock', 'transfers', 'purchases', 'locations', 'adjustments', 'audit_trail', 'reports'].includes(whTabQuery)) {
        whTab = whTabQuery;
      } else if (normalizedPath.includes('/warehouse/inventory')) {
        whTab = 'inventory';
      } else if (normalizedPath.includes('/warehouse/store_stock') || normalizedPath.includes('/warehouse/store-stock') || normalizedPath.includes('/warehouse/outlets')) {
        whTab = 'store_stock';
      } else if (normalizedPath.includes('/warehouse/transfers') || normalizedPath.includes('/warehouse/transfer')) {
        whTab = 'transfers';
      } else if (normalizedPath.includes('/warehouse/purchases') || normalizedPath.includes('/warehouse/po') || normalizedPath.includes('/warehouse/bills')) {
        whTab = 'purchases';
      } else if (normalizedPath.includes('/warehouse/locations')) {
        whTab = 'locations';
      } else if (normalizedPath.includes('/warehouse/adjustments')) {
        whTab = 'adjustments';
      } else if (normalizedPath.includes('/warehouse/audit_trail') || normalizedPath.includes('/warehouse/audit-trail') || normalizedPath.includes('/warehouse/audit')) {
        whTab = 'audit_trail';
      } else if (normalizedPath.includes('/warehouse/reports')) {
        whTab = 'reports';
      }
      return { role: 'warehouse', adminTab: 'dashboard', warehouseTab: whTab, storeAdminTab: 'overview' };
    }

    // Check POS Terminal
    if (
      normalizedPath === '/pos' ||
      normalizedPath.startsWith('/pos/') ||
      normalizedPath.includes('/point-of-sale') ||
      normalizedPath.includes('/counter') ||
      normalizedPath.includes('/billing')
    ) {
      return { role: 'pos', adminTab: 'dashboard', warehouseTab: 'dashboard', storeAdminTab: 'overview' };
    }

    // Check Customer Online Portal
    if (
      normalizedPath === '/customer' ||
      normalizedPath.startsWith('/customer/') ||
      normalizedPath.includes('/order') ||
      normalizedPath.includes('/menu') ||
      normalizedPath.includes('/shop')
    ) {
      return { role: 'customer', adminTab: 'dashboard', warehouseTab: 'dashboard', storeAdminTab: 'overview' };
    }

    // Check Master Admin Management
    if (
      normalizedPath === '/admin' ||
      normalizedPath.startsWith('/admin/')
    ) {
      if (tabQuery === ('inventory' as any) || normalizedPath.includes('/admin/inventory')) {
        return { role: 'warehouse', adminTab: 'dashboard', warehouseTab: 'inventory', storeAdminTab: 'overview' };
      }
      let tab: AdminTab = 'dashboard';
      if (tabQuery && ['dashboard', 'staff_counters', 'analytics', 'orders', 'loyalty_promos', 'backups'].includes(tabQuery)) {
        tab = tabQuery;
      } else if (normalizedPath.includes('/admin/staff') || normalizedPath.includes('/admin/counters')) {
        tab = 'staff_counters';
      } else if (normalizedPath.includes('/admin/analytics') || normalizedPath.includes('/admin/stats')) {
        tab = 'analytics';
      } else if (normalizedPath.includes('/admin/orders')) {
        tab = 'orders';
      } else if (normalizedPath.includes('/admin/loyalty') || normalizedPath.includes('/admin/promos')) {
        tab = 'loyalty_promos';
      } else if (normalizedPath.includes('/admin/backups') || normalizedPath.includes('/admin/security')) {
        tab = 'backups';
      }

      return { role: 'admin', adminTab: tab, warehouseTab: 'dashboard', storeAdminTab: 'overview' };
    }
  } catch {
    // fallback if location inspection is blocked
  }

  // Default Root is the Landing Page
  return { role: 'landing', adminTab: 'dashboard', warehouseTab: 'dashboard', storeAdminTab: 'overview' };
}

export function updateRoute(
  role: Role,
  adminTab?: AdminTab,
  replace = false,
  warehouseTab?: WarehouseTab,
  storeAdminTab?: StoreAdminTab
) {
  if (typeof window === 'undefined') return;

  try {
    let targetUrl = '/';
    if (role === 'landing') {
      targetUrl = '/';
    } else if (role === 'store_admin') {
      targetUrl = storeAdminTab && storeAdminTab !== 'overview' ? `/store-admin?store_tab=${storeAdminTab}` : '/store-admin';
    } else if (role === 'warehouse') {
      targetUrl = warehouseTab && warehouseTab !== 'dashboard' ? `/warehouse?wh_tab=${warehouseTab}` : '/warehouse';
    } else if (role === 'pos') {
      targetUrl = '/pos';
    } else if (role === 'customer') {
      targetUrl = '/customer';
    } else if (role === 'admin') {
      targetUrl = adminTab && adminTab !== 'dashboard' ? `/admin?tab=${adminTab}` : '/admin';
    }

    const currentPathWithSearch = (window.location?.pathname || '') + (window.location?.search || '');
    if (currentPathWithSearch !== targetUrl && window.history) {
      const stateObj = { role, adminTab, warehouseTab, storeAdminTab };
      if (replace && typeof window.history.replaceState === 'function') {
        window.history.replaceState(stateObj, '', targetUrl);
      } else if (typeof window.history.pushState === 'function') {
        window.history.pushState(stateObj, '', targetUrl);
      }
    }
  } catch {
    // Gracefully handle iframe sandbox or history security policy by using hash fallback
    try {
      let hashTarget = '#/';
      if (role === 'store_admin') hashTarget = storeAdminTab ? `#/store-admin/${storeAdminTab}` : '#/store-admin';
      else if (role === 'warehouse') hashTarget = warehouseTab ? `#/warehouse/${warehouseTab}` : '#/warehouse';
      else if (role === 'pos') hashTarget = '#/pos';
      else if (role === 'customer') hashTarget = '#/customer';
      else if (role === 'admin') hashTarget = adminTab ? `#/admin/${adminTab}` : '#/admin';

      if (window.location.hash !== hashTarget) {
        window.location.hash = hashTarget;
      }
    } catch {}
  }
}

export function getFullUrlForRole(
  role: Role,
  tab?: AdminTab,
  whTab?: WarehouseTab,
  storeAdminTab?: StoreAdminTab
): string {
  if (typeof window === 'undefined') return '';
  try {
    const origin = window.location?.origin || '';
    if (role === 'landing') return `${origin}/`;
    if (role === 'store_admin') return storeAdminTab && storeAdminTab !== 'overview' ? `${origin}/store-admin?store_tab=${storeAdminTab}` : `${origin}/store-admin`;
    if (role === 'warehouse') return whTab && whTab !== 'dashboard' ? `${origin}/warehouse?wh_tab=${whTab}` : `${origin}/warehouse`;
    if (role === 'pos') return `${origin}/pos`;
    if (role === 'customer') return `${origin}/customer`;
    return tab && tab !== 'dashboard' ? `${origin}/admin?tab=${tab}` : `${origin}/admin`;
  } catch {
    return '';
  }
}
