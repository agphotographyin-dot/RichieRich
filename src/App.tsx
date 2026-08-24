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
} from './types';
import { storage } from './services/storage';
import { Header } from './components/common/Header';
import { BarcodeScannerModal } from './components/common/BarcodeScannerModal';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { AdminPinLockModal } from './components/admin/AdminPinLockModal';

// Admin views
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminInventory } from './components/admin/AdminInventory';
import { AdminStaffCounters } from './components/admin/AdminStaffCounters';
import { AddItemModal } from './components/admin/AddItemModal';
import { AdminAnalytics } from './components/admin/AdminAnalytics';
import { AdminOrders } from './components/admin/AdminOrders';
import { AdminLoyaltyPromos } from './components/admin/AdminLoyaltyPromos';
import { AdminBackupsSecurity } from './components/admin/AdminBackupsSecurity';

// POS view
import { POSTerminal } from './components/pos/POSTerminal';

// Customer view
import { CustomerApp } from './components/customer/CustomerApp';

export const App: React.FC = () => {
  // Navigation Role & Admin Tab state
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('dashboard');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(true);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);

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
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Handle barcode scanned from camera or manual entry
  const handleBarcodeDetected = (code: string) => {
    // Check if barcode already exists in inventory
    const found = storage.findItemByBarcode(code);

    if (found) {
      if (currentRole === 'pos') {
        // POS mode: notify scanned item
        storage.addNotification({
          title: `Item Scanned: ${found.name}`,
          message: `SKU: ${found.sku} • Stock: ${found.stockQuantity} ${found.unit} available`,
          type: 'order_update',
          targetRole: 'pos',
          read: false,
        });
      } else {
        // Admin mode: Prompt for quick restock or open inventory
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
      // New Barcode detected -> prompt to register new item
      if (confirm(`New barcode detected: "${code}". Would you like to register a new Pan House inventory item with this barcode?`)) {
        setIsAddItemOpen(true);
      }
    }
  };

  const lowStockCount = inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold).length;

  const handleRoleSelect = (role: UserRole) => {
    if (role === 'admin' && !isAdminUnlocked) {
      setPendingRole('admin');
      setIsAdminPinModalOpen(true);
    } else {
      setCurrentRole(role);
    }
  };

  const handleAdminAuthSuccess = () => {
    setIsAdminUnlocked(true);
    setIsAdminPinModalOpen(false);
    if (pendingRole) {
      setCurrentRole(pendingRole);
      setPendingRole(null);
    } else {
      setCurrentRole('admin');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Universal Navigation Header */}
      <Header
        currentRole={currentRole}
        onSelectRole={handleRoleSelect}
        activeAdminTab={activeAdminTab}
        onSelectAdminTab={setActiveAdminTab}
        notifications={notifications}
        onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        lowStockCount={lowStockCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ================================================================= */}
        {/* INTERFACE 1: ADMIN INTERFACE */}
        {/* ================================================================= */}
        {currentRole === 'admin' && (
          <div className="space-y-6">
            {activeAdminTab === 'dashboard' && (
              <AdminDashboard
                inventory={inventory}
                orders={orders}
                customers={customers}
                onOpenScanner={() => setIsScannerOpen(true)}
                onOpenAddItem={() => setIsAddItemOpen(true)}
                onNavigateTab={setActiveAdminTab}
                onSelectRole={setCurrentRole}
              />
            )}

            {activeAdminTab === 'inventory' && (
              <AdminInventory
                inventory={inventory}
                categories={categories}
                onOpenScanner={() => setIsScannerOpen(true)}
                onOpenAddItem={() => setIsAddItemOpen(true)}
              />
            )}

            {activeAdminTab === 'staff_counters' && (
              <AdminStaffCounters
                onLaunchPOSAs={() => {
                  setCurrentRole('pos');
                }}
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

        {/* ================================================================= */}
        {/* INTERFACE 2: POINT OF SALE (POS) PERSON INTERFACE */}
        {/* ================================================================= */}
        {currentRole === 'pos' && (
          <POSTerminal
            inventory={inventory}
            categories={categories}
            customers={customers}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        )}

        {/* ================================================================= */}
        {/* INTERFACE 3: END CUSTOMER ORDERING PORTAL */}
        {/* ================================================================= */}
        {currentRole === 'customer' && (
          <CustomerApp
            inventory={inventory}
            categories={categories}
            customers={customers}
            orders={orders}
            promotions={promotions}
          />
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
        onMarkAllAsRead={() => storage.markAllNotificationsAsRead()}
        onClearAll={() => storage.clearNotifications()}
      />

      <AdminPinLockModal
        isOpen={isAdminPinModalOpen}
        onSuccess={handleAdminAuthSuccess}
        onCancel={() => {
          setIsAdminPinModalOpen(false);
          setPendingRole(null);
        }}
      />
    </div>
  );
};

export default App;
