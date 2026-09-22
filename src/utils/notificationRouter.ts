import { Role, AdminTab, StoreAdminTab, PushNotification } from '../types';
import { WarehouseTab } from '../types/warehouse';

export interface NotificationDestination {
  role: Role;
  adminTab?: AdminTab;
  warehouseTab?: WarehouseTab;
  storeAdminTab?: StoreAdminTab;
  targetUrl: string;
  destinationLabel: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
}

const TAB_NAME_MAP: Record<string, string> = {
  inventory: 'Inventory Catalog',
  store_stock: 'Store Outlets Stock',
  transfers: 'Stock Transfers & Indents',
  purchases: 'Purchases & POs',
  locations: 'Hub Locations',
  adjustments: 'Stock Adjustments',
  audit_trail: 'Audit Trail',
  reports: 'Reports & Analytics',
  dashboard: 'Dashboard',
  orders: 'Order Management',
  loyalty_promos: 'Loyalty & Promotions',
  staff_counters: 'Staff & Counters',
  backups: 'System Backups & Security',
  analytics: 'Analytics & Sales',
  overview: 'Branch Overview',
  finances: 'Financial Ledger',
  expenses: 'Store Expenses',
  staff: 'Store Cashiers',
  closing: 'Day-End Closing',
  stock_indents: 'Requisition Indents',
};

export function formatTabLabel(tabKey: string): string {
  if (TAB_NAME_MAP[tabKey]) return TAB_NAME_MAP[tabKey];
  return tabKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Intelligently resolves any PushNotification to its exact target Portal/Role,
 * specific Tab, URL route, and user-facing descriptive label.
 */
export function resolveNotificationDestination(notif: PushNotification): NotificationDestination {
  const linkTab = (notif.linkTab || '').toLowerCase().trim();
  const linkRole = notif.linkRole;
  const title = (notif.title || '').toLowerCase();
  const message = (notif.message || '').toLowerCase();
  const type = notif.type;
  const targetRole = notif.targetRole;

  // 1. Explicit linkRole match if provided
  if (linkRole) {
    if (linkRole === 'warehouse') {
      const validWarehouseTabs: WarehouseTab[] = [
        'inventory',
        'store_stock',
        'transfers',
        'purchases',
        'locations',
        'adjustments',
        'audit_trail',
        'reports',
        'dashboard',
      ];
      const whTab = validWarehouseTabs.includes(linkTab as WarehouseTab)
        ? (linkTab as WarehouseTab)
        : 'inventory';
      return {
        role: 'warehouse',
        warehouseTab: whTab,
        targetUrl: `/warehouse?wh_tab=${whTab}`,
        destinationLabel: `Warehouse • ${formatTabLabel(whTab)}`,
        badgeColor: 'text-emerald-700',
        badgeBg: 'bg-emerald-50',
        badgeBorder: 'border-emerald-200',
      };
    }

    if (linkRole === 'store_admin') {
      const validStoreTabs: StoreAdminTab[] = [
        'overview',
        'finances',
        'expenses',
        'orders',
        'inventory',
        'staff',
        'closing',
        'stock_indents',
      ];
      const sTab = validStoreTabs.includes(linkTab as StoreAdminTab)
        ? (linkTab as StoreAdminTab)
        : 'overview';
      return {
        role: 'store_admin',
        storeAdminTab: sTab,
        targetUrl: `/store-admin?store_tab=${sTab}`,
        destinationLabel: `Store Admin • ${formatTabLabel(sTab)}`,
        badgeColor: 'text-purple-700',
        badgeBg: 'bg-purple-50',
        badgeBorder: 'border-purple-200',
      };
    }

    if (linkRole === 'admin') {
      const validAdminTabs: AdminTab[] = [
        'dashboard',
        'staff_counters',
        'analytics',
        'orders',
        'loyalty_promos',
        'backups',
      ];
      const aTab = validAdminTabs.includes(linkTab as AdminTab)
        ? (linkTab as AdminTab)
        : 'dashboard';
      return {
        role: 'admin',
        adminTab: aTab,
        targetUrl: `/admin?tab=${aTab}`,
        destinationLabel: `Admin • ${formatTabLabel(aTab)}`,
        badgeColor: 'text-amber-700',
        badgeBg: 'bg-amber-50',
        badgeBorder: 'border-amber-200',
      };
    }

    if (linkRole === 'pos') {
      return {
        role: 'pos',
        targetUrl: '/pos',
        destinationLabel: 'POS Billing Terminal',
        badgeColor: 'text-blue-700',
        badgeBg: 'bg-blue-50',
        badgeBorder: 'border-blue-200',
      };
    }

    if (linkRole === 'customer') {
      return {
        role: 'customer',
        targetUrl: '/customer',
        destinationLabel: 'Customer Ordering Portal',
        badgeColor: 'text-rose-700',
        badgeBg: 'bg-rose-50',
        badgeBorder: 'border-rose-200',
      };
    }
  }

  // 2. Explicit linkTab match
  if (linkTab === 'inventory' || linkTab === 'catalog' || linkTab === 'items' || linkTab === 'stock') {
    return {
      role: 'warehouse',
      warehouseTab: 'inventory',
      targetUrl: '/warehouse?wh_tab=inventory',
      destinationLabel: 'Warehouse • Inventory Catalog',
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  }

  if (linkTab === 'store_stock' || linkTab === 'store-stock' || linkTab === 'outlets') {
    return {
      role: 'warehouse',
      warehouseTab: 'store_stock',
      targetUrl: '/warehouse?wh_tab=store_stock',
      destinationLabel: 'Warehouse • Store Outlets Stock',
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  }

  if (linkTab === 'transfers' || linkTab === 'transfer') {
    return {
      role: 'warehouse',
      warehouseTab: 'transfers',
      targetUrl: '/warehouse?wh_tab=transfers',
      destinationLabel: 'Warehouse • Stock Transfers',
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  }

  if (linkTab === 'purchases' || linkTab === 'po' || linkTab === 'bills' || linkTab === 'supplier') {
    return {
      role: 'warehouse',
      warehouseTab: 'purchases',
      targetUrl: '/warehouse?wh_tab=purchases',
      destinationLabel: 'Warehouse • Purchases & POs',
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  }

  if (linkTab === 'adjustments' || linkTab === 'adjustment') {
    return {
      role: 'warehouse',
      warehouseTab: 'adjustments',
      targetUrl: '/warehouse?wh_tab=adjustments',
      destinationLabel: 'Warehouse • Stock Adjustments',
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  }

  if (linkTab === 'locations' || linkTab === 'warehouses') {
    return {
      role: 'warehouse',
      warehouseTab: 'locations',
      targetUrl: '/warehouse?wh_tab=locations',
      destinationLabel: 'Warehouse • Hub Locations',
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  }

  if (linkTab === 'audit_trail' || linkTab === 'audit') {
    return {
      role: 'warehouse',
      warehouseTab: 'audit_trail',
      targetUrl: '/warehouse?wh_tab=audit_trail',
      destinationLabel: 'Warehouse • Audit Trail',
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  }

  if (linkTab === 'reports') {
    return {
      role: 'warehouse',
      warehouseTab: 'reports',
      targetUrl: '/warehouse?wh_tab=reports',
      destinationLabel: 'Warehouse • Reports & Analytics',
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  }

  if (linkTab === 'expenses' || linkTab === 'expense') {
    return {
      role: 'store_admin',
      storeAdminTab: 'expenses',
      targetUrl: '/store-admin?store_tab=expenses',
      destinationLabel: 'Store Admin • Expenses',
      badgeColor: 'text-purple-700',
      badgeBg: 'bg-purple-50',
      badgeBorder: 'border-purple-200',
    };
  }

  if (linkTab === 'finances' || linkTab === 'financials') {
    return {
      role: 'store_admin',
      storeAdminTab: 'finances',
      targetUrl: '/store-admin?store_tab=finances',
      destinationLabel: 'Store Admin • Financial Ledger',
      badgeColor: 'text-purple-700',
      badgeBg: 'bg-purple-50',
      badgeBorder: 'border-purple-200',
    };
  }

  if (linkTab === 'indents' || linkTab === 'stock_indents') {
    return {
      role: 'warehouse',
      warehouseTab: 'transfers',
      targetUrl: '/warehouse?wh_tab=transfers',
      destinationLabel: 'Warehouse • Store Indents',
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  }

  if (linkTab === 'orders' || linkTab === 'sales' || linkTab === 'order') {
    if (targetRole === 'customer') {
      return {
        role: 'customer',
        targetUrl: '/customer',
        destinationLabel: 'Customer • Orders & Status',
        badgeColor: 'text-rose-700',
        badgeBg: 'bg-rose-50',
        badgeBorder: 'border-rose-200',
      };
    }
    return {
      role: 'admin',
      adminTab: 'orders',
      targetUrl: '/admin?tab=orders',
      destinationLabel: 'Admin • Order Management',
      badgeColor: 'text-amber-700',
      badgeBg: 'bg-amber-50',
      badgeBorder: 'border-amber-200',
    };
  }

  if (
    linkTab === 'loyalty' ||
    linkTab === 'promos' ||
    linkTab === 'loyalty_promos' ||
    linkTab === 'rewards' ||
    linkTab === 'coupons'
  ) {
    if (targetRole === 'customer') {
      return {
        role: 'customer',
        targetUrl: '/customer',
        destinationLabel: 'Customer • Rewards & Deals',
        badgeColor: 'text-rose-700',
        badgeBg: 'bg-rose-50',
        badgeBorder: 'border-rose-200',
      };
    }
    return {
      role: 'admin',
      adminTab: 'loyalty_promos',
      targetUrl: '/admin?tab=loyalty_promos',
      destinationLabel: 'Admin • Loyalty & Promos',
      badgeColor: 'text-amber-700',
      badgeBg: 'bg-amber-50',
      badgeBorder: 'border-amber-200',
    };
  }

  if (linkTab === 'backups' || linkTab === 'security' || linkTab === 'backup') {
    return {
      role: 'admin',
      adminTab: 'backups',
      targetUrl: '/admin?tab=backups',
      destinationLabel: 'Admin • Backups & Security',
      badgeColor: 'text-sky-700',
      badgeBg: 'bg-sky-50',
      badgeBorder: 'border-sky-200',
    };
  }

  if (linkTab === 'staff' || linkTab === 'counters' || linkTab === 'staff_counters' || linkTab === 'pins') {
    return {
      role: 'admin',
      adminTab: 'staff_counters',
      targetUrl: '/admin?tab=staff_counters',
      destinationLabel: 'Admin • Staff & Counters',
      badgeColor: 'text-amber-700',
      badgeBg: 'bg-amber-50',
      badgeBorder: 'border-amber-200',
    };
  }

  if (linkTab === 'analytics' || linkTab === 'stats') {
    return {
      role: 'admin',
      adminTab: 'analytics',
      targetUrl: '/admin?tab=analytics',
      destinationLabel: 'Admin • Sales Analytics',
      badgeColor: 'text-amber-700',
      badgeBg: 'bg-amber-50',
      badgeBorder: 'border-amber-200',
    };
  }

  if (linkTab === 'pos' || linkTab === 'billing' || linkTab === 'cart') {
    return {
      role: 'pos',
      targetUrl: '/pos',
      destinationLabel: 'POS Billing Terminal',
      badgeColor: 'text-blue-700',
      badgeBg: 'bg-blue-50',
      badgeBorder: 'border-blue-200',
    };
  }

  // 3. Inference based on TargetRole
  if (targetRole === 'customer') {
    return {
      role: 'customer',
      targetUrl: '/customer',
      destinationLabel: 'Customer Portal',
      badgeColor: 'text-rose-700',
      badgeBg: 'bg-rose-50',
      badgeBorder: 'border-rose-200',
    };
  }

  if (targetRole === 'pos' && (title.includes('cart') || title.includes('barcode') || title.includes('item added'))) {
    return {
      role: 'pos',
      targetUrl: '/pos',
      destinationLabel: 'POS Billing Terminal',
      badgeColor: 'text-blue-700',
      badgeBg: 'bg-blue-50',
      badgeBorder: 'border-blue-200',
    };
  }

  // 4. Stock & Inventory Inference
  if (type === 'low_stock' || title.includes('low stock') || title.includes('out of stock')) {
    if (title.includes('in-store') || title.includes('store stock')) {
      return {
        role: 'warehouse',
        warehouseTab: 'store_stock',
        targetUrl: '/warehouse?wh_tab=store_stock',
        destinationLabel: 'Warehouse • Store Outlets Stock',
        badgeColor: 'text-amber-700',
        badgeBg: 'bg-amber-50',
        badgeBorder: 'border-amber-200',
      };
    }
    return {
      role: 'warehouse',
      warehouseTab: 'inventory',
      targetUrl: '/warehouse?wh_tab=inventory',
      destinationLabel: 'Warehouse • Inventory Catalog',
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  }

  // 5. Purchases, Inwards, and Supplier Bills
  if (
    title.includes('purchase order') ||
    title.includes('supplier payment') ||
    title.includes('goods received') ||
    title.includes('po created') ||
    message.includes('purchase order') ||
    message.includes('inwarded')
  ) {
    return {
      role: 'warehouse',
      warehouseTab: 'purchases',
      targetUrl: '/warehouse?wh_tab=purchases',
      destinationLabel: 'Warehouse • Purchases & POs',
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  }

  // 6. Transfers & Indents
  if (
    title.includes('stock transfer') ||
    title.includes('inter-store transfer') ||
    title.includes('stock inward completed') ||
    message.includes('transferred')
  ) {
    return {
      role: 'warehouse',
      warehouseTab: 'transfers',
      targetUrl: '/warehouse?wh_tab=transfers',
      destinationLabel: 'Warehouse • Stock Transfers',
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  }

  if (title.includes('indent') || message.includes('indent requisition')) {
    return {
      role: 'warehouse',
      warehouseTab: 'transfers',
      targetUrl: '/warehouse?wh_tab=transfers',
      destinationLabel: 'Warehouse • Store Indents',
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  }

  // 7. Adjustments
  if (title.includes('adjustment') || message.includes('adjusted stock') || message.includes('valuation impact')) {
    return {
      role: 'warehouse',
      warehouseTab: 'adjustments',
      targetUrl: '/warehouse?wh_tab=adjustments',
      destinationLabel: 'Warehouse • Stock Adjustments',
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  }

  // 8. Store Expenses
  if (title.includes('expense') || message.includes('expense')) {
    return {
      role: 'store_admin',
      storeAdminTab: 'expenses',
      targetUrl: '/store-admin?store_tab=expenses',
      destinationLabel: 'Store Admin • Expenses',
      badgeColor: 'text-purple-700',
      badgeBg: 'bg-purple-50',
      badgeBorder: 'border-purple-200',
    };
  }

  // 9. Staff, Counters, PINs, Store Details
  if (
    title.includes('salesperson') ||
    title.includes('pos login pin') ||
    title.includes('counter added') ||
    title.includes('counter updated') ||
    title.includes('counter removed') ||
    title.includes('store details updated')
  ) {
    return {
      role: 'admin',
      adminTab: 'staff_counters',
      targetUrl: '/admin?tab=staff_counters',
      destinationLabel: 'Admin • Staff & Counters',
      badgeColor: 'text-amber-700',
      badgeBg: 'bg-amber-50',
      badgeBorder: 'border-amber-200',
    };
  }

  // 10. Loyalty, VIP, Points, and Promotions
  if (
    type === 'loyalty_reward' ||
    type === 'discount_promo' ||
    title.includes('loyalty') ||
    title.includes('tier upgrade') ||
    title.includes('points') ||
    title.includes('deal alert') ||
    title.includes('special deal') ||
    title.includes('bonus')
  ) {
    return {
      role: 'admin',
      adminTab: 'loyalty_promos',
      targetUrl: '/admin?tab=loyalty_promos',
      destinationLabel: 'Admin • Loyalty & Promos',
      badgeColor: 'text-amber-700',
      badgeBg: 'bg-amber-50',
      badgeBorder: 'border-amber-200',
    };
  }

  // 11. System Backup & Restore
  if (
    type === 'system_backup' ||
    title.includes('backup') ||
    title.includes('database restored') ||
    message.includes('snapshot') ||
    message.includes('archived')
  ) {
    return {
      role: 'admin',
      adminTab: 'backups',
      targetUrl: '/admin?tab=backups',
      destinationLabel: 'Admin • Backups & Security',
      badgeColor: 'text-sky-700',
      badgeBg: 'bg-sky-50',
      badgeBorder: 'border-sky-200',
    };
  }

  // 12. Excel / Product Catalog Import
  if (title.includes('excel') || title.includes('import') || title.includes('catalog')) {
    return {
      role: 'warehouse',
      warehouseTab: 'inventory',
      targetUrl: '/warehouse?wh_tab=inventory',
      destinationLabel: 'Warehouse • Inventory Catalog',
      badgeColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50',
      badgeBorder: 'border-emerald-200',
    };
  }

  // 13. Orders & POS Transactions
  if (type === 'order_update' || title.includes('order') || message.includes('order')) {
    return {
      role: 'admin',
      adminTab: 'orders',
      targetUrl: '/admin?tab=orders',
      destinationLabel: 'Admin • Order Management',
      badgeColor: 'text-amber-700',
      badgeBg: 'bg-amber-50',
      badgeBorder: 'border-amber-200',
    };
  }

  // Default fallback to Admin Dashboard
  return {
    role: 'admin',
    adminTab: 'dashboard',
    targetUrl: '/admin',
    destinationLabel: 'Admin • Dashboard',
    badgeColor: 'text-slate-700',
    badgeBg: 'bg-slate-50',
    badgeBorder: 'border-slate-200',
  };
}
