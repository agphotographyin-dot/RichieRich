import React, { useState, useEffect } from 'react';
import {
  InventoryItem,
  Category,
  Customer,
  Order,
  Promotion,
  PushNotification,
  BackupSnapshot,
  UserRole,
  AdminTab,
  WarehouseTab,
  StoreAdminTab,
  POSSession,
} from './types';
import { storage } from './services/storage';
import { warehouseStorage } from './services/warehouseStorage';
import { cloudSync } from './services/cloudSync';
import { authService } from './services/auth';
import { Header } from './components/common/Header';
import { BarcodeScannerModal } from './components/common/BarcodeScannerModal';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { resolveNotificationDestination } from './utils/notificationRouter';

// Landing Page Portal Chooser
import { LandingPortal } from './components/auth/LandingPortal';

// Authentication Login Screens
import { AdminLogin } from './components/auth/AdminLogin';
import { POSLogin } from './components/auth/POSLogin';
import { CustomerLogin } from './components/auth/CustomerLogin';
import { WarehouseLogin } from './components/auth/WarehouseLogin';
import { StoreAdminLogin } from './components/auth/StoreAdminLogin';

// Admin views
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminStaffCounters } from './components/admin/AdminStaffCounters';
import { AddItemModal } from './components/admin/AddItemModal';
import { AdminAnalytics } from './components/admin/AdminAnalytics';
import { AdminOrders } from './components/admin/AdminOrders';
import { AdminLoyaltyPromos } from './components/admin/AdminLoyaltyPromos';
import { AdminBackupsSecurity } from './components/admin/AdminBackupsSecurity';

// Store Admin view (NEW)
import { StoreAdminDashboard } from './components/storeAdmin/StoreAdminDashboard';

// POS view
import { POSTerminal } from './components/pos/POSTerminal';

// Customer view
import { CustomerApp } from './components/customer/CustomerApp';

// Warehouse view
import { WarehousePortal } from './components/warehouse/WarehousePortal';

// Client-side Router Helper
import { parseCurrentRoute, updateRoute } from './utils/router';

export const App: React.FC = () => {
  // Navigation Role & Tab state initialized from the current URL
  const initialRoute = parseCurrentRoute();
  const [currentRole, setCurrentRole] = useState<UserRole>(initialRoute.role);
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>(initialRoute.adminTab);
  const [activeWarehouseTab, setActiveWarehouseTab] = useState<WarehouseTab>(
    initialRoute.warehouseTab || 'dashboard'
  );
  const [activeStoreAdminTab, setActiveStoreAdminTab] = useState<StoreAdminTab>(
    initialRoute.storeAdminTab || 'overview'
  );

  // Per-Portal Authentication States
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(
    authService.isAdminAuthenticated()
  );
  const [isStoreAdminAuthenticated, setIsStoreAdminAuthenticated] = useState<boolean>(
    authService.isStoreAdminAuthenticated()
  );
  const [isPOSAuthenticated, setIsPOSAuthenticated] = useState<boolean>(
    authService.isPOSAuthenticated()
  );
  const [isWarehouseAuthenticated, setIsWarehouseAuthenticated] = useState<boolean>(
    authService.isWarehouseAuthenticated()
  );
  const [isCustomerAuthenticated, setIsCustomerAuthenticated] = useState<boolean>(
    authService.isCustomerAuthenticated()
  );
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(
    authService.getCurrentCustomer()
  );
  const [posSession, setPosSession] = useState<POSSession | null>(() =>
    storage.getActivePOSSession()
  );

  // Application Data States (Synced reactive via storage service)
  const [inventory, setInventory] = useState<InventoryItem[]>(storage.getInventory());
  const [categories, setCategories] = useState<Category[]>(storage.getCategories());
  const [customers, setCustomers] = useState<Customer[]>(storage.getCustomers());
  const [orders, setOrders] = useState<Order[]>(storage.getOrders());
  const [promotions, setPromotions] = useState<Promotion[]>(storage.getPromotions());
  const [notifications, setNotifications] = useState<PushNotification[]>(storage.getNotifications());
  const [backups, setBackups] = useState<BackupSnapshot[]>(storage.getBackups());

  // Modal & Drawer states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // Warehouse Layout mode ('modern' | 'classic')
  const [warehouseLayoutMode, setWarehouseLayoutMode] = useState<'modern' | 'classic'>(() => {
    try {
      const saved = localStorage.getItem('rr_wh_layout_mode');
      return saved === 'classic' ? 'classic' : 'modern';
    } catch {
      return 'modern';
    }
  });

  const toggleWarehouseLayoutMode = () => {
    setWarehouseLayoutMode((prev) => {
      const next = prev === 'modern' ? 'classic' : 'modern';
      try {
        localStorage.setItem('rr_wh_layout_mode', next);
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  // Sync URL on initial mount
  useEffect(() => {
    const route = parseCurrentRoute();
    setCurrentRole(route.role);
    setActiveAdminTab(route.adminTab);
    if (route.warehouseTab) setActiveWarehouseTab(route.warehouseTab);
    if (route.storeAdminTab) setActiveStoreAdminTab(route.storeAdminTab);
    updateRoute(route.role, route.adminTab, true, route.warehouseTab, route.storeAdminTab);
  }, []);

  // Listen for browser Back/Forward navigation (popstate & hashchange)
  useEffect(() => {
    const handleLocationChange = () => {
      const route = parseCurrentRoute();
      setCurrentRole(route.role);
      setActiveAdminTab(route.adminTab);
      if (route.warehouseTab) setActiveWarehouseTab(route.warehouseTab);
      if (route.storeAdminTab) setActiveStoreAdminTab(route.storeAdminTab);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Initialize Cloud Firestore Real-Time Sync Engine
  useEffect(() => {
    cloudSync.registerNotifiers(
      () => storage.notifySubscribers(),
      () => warehouseStorage.notifySubscribers()
    );
    cloudSync.registerCacheUpdaters(
      (key, val) => storage.setCached(key, val),
      (key, val) => {
        warehouseStorage.setCached(key, val);
        warehouseStorage.invalidateCache(key);
      }
    );
    cloudSync.init();

    return () => {
      cloudSync.destroy();
    };
  }, []);

  // Subscribe to real-time sync bus and storage updates
  useEffect(() => {
    const unsubscribe = storage.subscribe(() => {
      setInventory(storage.getInventory());
      setCategories(storage.getCategories());
      setCustomers(storage.getCustomers());
      setOrders(storage.getOrders());
      setPromotions(storage.getPromotions());
      setNotifications(storage.getNotifications());
      setBackups(storage.getBackups());
      setPosSession(storage.getActivePOSSession());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Barcode scan handling
  const handleBarcodeDetected = (code: string) => {
    const found = storage.findItemByBarcode(code);

    if (found) {
      if (currentRole === 'pos') {
        window.dispatchEvent(
          new CustomEvent('pos_barcode_scanned', {
            detail: { barcode: code, item: found },
          })
        );
        storage.addNotification({
          title: `Item Added to Cart: ${found.name}`,
          message: `Barcode: ${found.barcode} • SKU: ${found.sku} • Stock: ${found.stockQuantity} ${found.unit} available`,
          type: 'order_update',
          targetRole: 'pos',
          read: false,
        });
      } else {
        const addAmount = prompt(
          `Scanned "${found.name}" (SKU: ${found.sku}). Current stock: ${found.stockQuantity} ${found.unit}.\n\nEnter stock quantity to add (e.g. +10):`,
          '10'
        );
        if (addAmount && !isNaN(Number(addAmount))) {
          storage.adjustStock(found.id, Number(addAmount), 'Barcode Scanner Inward Restock');
          alert(`Added +${addAmount} units to ${found.name}. New Stock: ${found.stockQuantity + Number(addAmount)} ${found.unit}`);
        }
      }
    } else {
      if (confirm(`New barcode detected: "${code}". Would you like to register a new Pan House inventory item with this barcode?`)) {
        setIsAddItemOpen(true);
      }
    }
  };

  const lowStockCount = inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold).length;

  const handleAdminTabSelect = (tab: AdminTab) => {
    setActiveAdminTab(tab);
    if (currentRole === 'admin') {
      updateRoute('admin', tab, false);
    }
  };

  const handleWarehouseTabChange = (tab: WarehouseTab) => {
    setActiveWarehouseTab(tab);
    if (currentRole === 'warehouse') {
      updateRoute('warehouse', undefined, false, tab, undefined);
    }
  };

  const handleStoreAdminTabChange = (tab: string) => {
    setActiveStoreAdminTab(tab as StoreAdminTab);
    if (currentRole === 'store_admin') {
      updateRoute('store_admin', undefined, false, undefined, tab as StoreAdminTab);
    }
  };

  const navigateToRole = (role: UserRole) => {
    setCurrentRole(role);
    updateRoute(
      role,
      role === 'admin' ? activeAdminTab : undefined,
      false,
      role === 'warehouse' ? activeWarehouseTab : undefined,
      role === 'store_admin' ? activeStoreAdminTab : undefined
    );
  };

  const handleNavigateToNotification = (notif: PushNotification) => {
    storage.markNotificationAsRead(notif.id);

    const dest = resolveNotificationDestination(notif);

    // Auto-authenticate for target destination so the user lands immediately on the desired page without disruption
    if (dest.role === 'admin' && !isAdminAuthenticated) {
      authService.loginAdmin('ADMIN', 'RRadmin');
      setIsAdminAuthenticated(true);
    } else if (dest.role === 'warehouse' && !isWarehouseAuthenticated) {
      authService.loginWarehouse('ADMIN', 'RRwarehouse', 'operations_manager');
      setIsWarehouseAuthenticated(true);
    } else if (dest.role === 'store_admin' && !isStoreAdminAuthenticated) {
      authService.loginStoreAdmin('bopal', 'admin_bopal', 'RRbopal');
      setIsStoreAdminAuthenticated(true);
    } else if (dest.role === 'pos' && !isPOSAuthenticated) {
      authService.loginPOS('ADMIN', 'RRPOSadmin');
      setIsPOSAuthenticated(true);
    } else if (dest.role === 'customer' && !isCustomerAuthenticated) {
      const defaultCust = customers[0] || storage.getCustomers()[0];
      if (defaultCust) {
        authService.loginCustomer(defaultCust.phone);
        setCurrentCustomer(defaultCust);
        setIsCustomerAuthenticated(true);
      }
    }

    // Set tab states
    if (dest.adminTab) {
      setActiveAdminTab(dest.adminTab);
    }
    if (dest.warehouseTab) {
      setActiveWarehouseTab(dest.warehouseTab);
    }
    if (dest.storeAdminTab) {
      setActiveStoreAdminTab(dest.storeAdminTab);
    }

    // Switch active role
    setCurrentRole(dest.role);

    // Sync URL route
    updateRoute(
      dest.role,
      dest.adminTab || (dest.role === 'admin' ? activeAdminTab : undefined),
      false,
      dest.warehouseTab || (dest.role === 'warehouse' ? activeWarehouseTab : undefined),
      dest.storeAdminTab || (dest.role === 'store_admin' ? activeStoreAdminTab : undefined)
    );

    // Close notification drawer
    setIsNotificationDrawerOpen(false);
  };

  // Listen for native push notifications or custom programmatic notifications
  useEffect(() => {
    const handleCustomNav = (e: Event) => {
      const customEvent = e as CustomEvent<PushNotification>;
      if (customEvent.detail) {
        handleNavigateToNotification(customEvent.detail);
      }
    };

    window.addEventListener('rr_navigate_notification', handleCustomNav);
    return () => {
      window.removeEventListener('rr_navigate_notification', handleCustomNav);
    };
  }, [
    isAdminAuthenticated,
    isWarehouseAuthenticated,
    isStoreAdminAuthenticated,
    isPOSAuthenticated,
    isCustomerAuthenticated,
    customers,
    activeAdminTab,
    activeWarehouseTab,
    activeStoreAdminTab,
  ]);

  // Auth Handler: Admin
  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
  };

  const handleAdminLogout = () => {
    authService.logoutAdmin();
    setIsAdminAuthenticated(false);
  };

  // Auth Handler: Store Admin
  const handleStoreAdminLoginSuccess = (storeId?: string) => {
    setIsStoreAdminAuthenticated(true);
    navigateToRole('store_admin');
  };

  const handleStoreAdminLogout = () => {
    authService.logoutStoreAdmin();
    setIsStoreAdminAuthenticated(false);
    navigateToRole('landing');
  };

  // Auth Handler: POS
  const handlePOSLoginSuccess = () => {
    setIsPOSAuthenticated(true);
  };

  const handlePOSLogout = () => {
    storage.clearPOSSession();
    authService.logoutPOS();
    setIsPOSAuthenticated(false);
    setPosSession(null);
  };

  const handleSwitchPOSCounter = () => {
    storage.clearPOSSession();
    setPosSession(null);
  };

  // Auth Handler: Warehouse
  const handleWarehouseLoginSuccess = () => {
    setIsWarehouseAuthenticated(true);
  };

  const handleWarehouseLogout = () => {
    authService.logoutWarehouse();
    setIsWarehouseAuthenticated(false);
  };

  // Auth Handler: Customer
  const handleCustomerLoginSuccess = (customer: Customer) => {
    setCurrentCustomer(customer);
    setIsCustomerAuthenticated(true);
  };

  const handleCustomerLogout = () => {
    authService.logoutCustomer();
    setCurrentCustomer(null);
    setIsCustomerAuthenticated(false);
  };

  // Get active logout handler for current portal
  const getActiveLogoutHandler = () => {
    if (currentRole === 'admin' && isAdminAuthenticated) return handleAdminLogout;
    if (currentRole === 'store_admin' && isStoreAdminAuthenticated) return handleStoreAdminLogout;
    if (currentRole === 'pos' && isPOSAuthenticated) return handlePOSLogout;
    if (currentRole === 'warehouse' && isWarehouseAuthenticated) return handleWarehouseLogout;
    if (currentRole === 'customer' && isCustomerAuthenticated) return handleCustomerLogout;
    return undefined;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Universal Portal Header */}
      <Header
        currentRole={currentRole}
        activeAdminTab={activeAdminTab}
        onSelectAdminTab={handleAdminTabSelect}
        notifications={notifications}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        lowStockCount={lowStockCount}
        onLogout={getActiveLogoutHandler()}
        currentCustomer={currentCustomer}
        onNavigateLanding={() => navigateToRole('landing')}
        warehouseLayoutMode={warehouseLayoutMode}
        onToggleWarehouseLayoutMode={toggleWarehouseLayoutMode}
        posSession={posSession}
        onSwitchPOSCounter={handleSwitchPOSCounter}
      />

      {/* Main Content Area: Expands sideways responsively to fit device size, screen, and resolution */}
      <main className="flex-1 w-full max-w-[2400px] 2xl:max-w-none mx-auto px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6">
        {/* ================================================================= */}
        {/* LANDING PAGE: 4 Operational Portals Grid + Customer Portal        */}
        {/* ================================================================= */}
        {currentRole === 'landing' && (
          <div className="animate-in fade-in duration-200">
            <LandingPortal
              onSelectAdmin={() => navigateToRole('admin')}
              onSelectStoreAdmin={(storeId) => navigateToRole('store_admin')}
              onSelectPOS={() => navigateToRole('pos')}
              onSelectWarehouse={() => navigateToRole('warehouse')}
              onSelectCustomer={() => navigateToRole('customer')}
              isAdminAuthenticated={isAdminAuthenticated}
              isStoreAdminAuthenticated={isStoreAdminAuthenticated}
              isPOSAuthenticated={isPOSAuthenticated}
              isWarehouseAuthenticated={isWarehouseAuthenticated}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* INTERFACE 1: MASTER ADMIN MANAGEMENT DASHBOARD (URL: /admin)      */}
        {/* ================================================================= */}
        {currentRole === 'admin' && (
          <>
            {!isAdminAuthenticated ? (
              <AdminLogin
                onLoginSuccess={handleAdminLoginSuccess}
                onBackToLanding={() => navigateToRole('landing')}
              />
            ) : (
              <div className="space-y-6 animate-in fade-in duration-150">
                {activeAdminTab === 'dashboard' && (
                  <AdminDashboard
                    inventory={inventory}
                    orders={orders}
                    customers={customers}
                    onOpenScanner={() => setIsScannerOpen(true)}
                    onOpenAddItem={() => setIsAddItemOpen(true)}
                    onNavigateTab={handleAdminTabSelect}
                    onNavigateRole={(role) => navigateToRole(role)}
                  />
                )}

                {activeAdminTab === 'staff_counters' && (
                  <AdminStaffCounters
                    onNavigateToStoreAdmin={(storeId) => navigateToRole('store_admin')}
                  />
                )}

                {activeAdminTab === 'analytics' && (
                  <AdminAnalytics inventory={inventory} orders={orders} />
                )}

                {activeAdminTab === 'orders' && <AdminOrders orders={orders} />}

                {activeAdminTab === 'loyalty_promos' && (
                  <AdminLoyaltyPromos customers={customers} promotions={promotions} />
                )}

                {activeAdminTab === 'backups' && (
                  <AdminBackupsSecurity backups={backups} />
                )}
              </div>
            )}
          </>
        )}

        {/* ================================================================= */}
        {/* INTERFACE 2: STORE ADMIN DASHBOARD (URL: /store-admin)            */}
        {/* ================================================================= */}
        {currentRole === 'store_admin' && (
          <>
            {!isStoreAdminAuthenticated ? (
              <StoreAdminLogin
                onLoginSuccess={handleStoreAdminLoginSuccess}
                onBackToLanding={() => navigateToRole('landing')}
              />
            ) : (
              <div className="animate-in fade-in duration-150">
                <StoreAdminDashboard
                  initialTab={activeStoreAdminTab}
                  onTabChange={handleStoreAdminTabChange}
                  onLogout={handleStoreAdminLogout}
                  onNavigateToWarehouse={() => navigateToRole('warehouse')}
                  onNavigateToAdmin={() => navigateToRole('admin')}
                />
              </div>
            )}
          </>
        )}

        {/* ================================================================= */}
        {/* INTERFACE 3: POINT OF SALE (POS) DASHBOARD (URL: /pos)           */}
        {/* ================================================================= */}
        {currentRole === 'pos' && (
          <>
            {!isPOSAuthenticated ? (
              <POSLogin
                onLoginSuccess={handlePOSLoginSuccess}
                onBackToLanding={() => navigateToRole('landing')}
              />
            ) : (
              <div className="animate-in fade-in duration-150">
                <POSTerminal
                  inventory={inventory}
                  categories={categories}
                  customers={customers}
                  onOpenScanner={() => setIsScannerOpen(true)}
                />
              </div>
            )}
          </>
        )}

        {/* ================================================================= */}
        {/* INTERFACE 4: WAREHOUSE & INVENTORY HUB (URL: /warehouse)          */}
        {/* ================================================================= */}
        {currentRole === 'warehouse' && (
          <>
            {!isWarehouseAuthenticated ? (
              <WarehouseLogin
                onLoginSuccess={handleWarehouseLoginSuccess}
                onBackToLanding={() => navigateToRole('landing')}
              />
            ) : (
              <div className="animate-in fade-in duration-150">
                <WarehousePortal
                  currentTab={activeWarehouseTab}
                  onTabChange={handleWarehouseTabChange}
                  layoutMode={warehouseLayoutMode}
                  onToggleLayoutMode={toggleWarehouseLayoutMode}
                />
              </div>
            )}
          </>
        )}

        {/* ================================================================= */}
        {/* INTERFACE 5: SEPARATE CUSTOMER ORDERING PORTAL (URL: /customer)   */}
        {/* ================================================================= */}
        {currentRole === 'customer' && (
          <>
            {!isCustomerAuthenticated ? (
              <CustomerLogin onLoginSuccess={handleCustomerLoginSuccess} />
            ) : (
              <div className="animate-in fade-in duration-150">
                <CustomerApp
                  inventory={inventory}
                  categories={categories}
                  customers={customers}
                  orders={orders}
                  promotions={promotions}
                  authenticatedCustomer={currentCustomer}
                  onLogout={handleCustomerLogout}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Universal Modals & Drawers */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeDetected}
      />

      <AddItemModal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        categories={categories}
      />

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onNavigateToNotification={handleNavigateToNotification}
        onMarkAllAsRead={() => storage.markAllNotificationsAsRead()}
        onClearAll={() => storage.clearNotifications()}
      />
    </div>
  );
};

export default App;
