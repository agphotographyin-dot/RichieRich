import { Customer, StoreAdminAuthState } from '../types';
import { storage } from './storage';
import { safeStorage } from '../utils/safeStorage';

const ADMIN_STORAGE_KEY = 'rr_auth_admin';
const POS_STORAGE_KEY = 'rr_auth_pos';
const CUSTOMER_STORAGE_KEY = 'rr_auth_customer';
const WAREHOUSE_STORAGE_KEY = 'rr_auth_warehouse';
const STORE_ADMIN_STORAGE_KEY = 'rr_auth_store_admin';

export interface AdminAuthState {
  isAuthenticated: boolean;
  username: string;
  loginTime: string;
}

export interface POSAuthState {
  isAuthenticated: boolean;
  username: string;
  loginTime: string;
}

export interface CustomerAuthState {
  isAuthenticated: boolean;
  customerId: string;
  phone: string;
  customerName: string;
}

export interface WarehouseAuthState {
  isAuthenticated: boolean;
  username: string;
  subRole: string;
  loginTime: string;
}

export const authService = {
  // =========================================================================
  // 1. ADMIN AUTHENTICATION (User ID: ADMIN, Password: RRadmin)
  // =========================================================================
  isAdminAuthenticated(): boolean {
    try {
      const data = safeStorage.getItem(ADMIN_STORAGE_KEY);
      if (!data) return false;
      const parsed: AdminAuthState = JSON.parse(data);
      return parsed.isAuthenticated === true;
    } catch {
      return false;
    }
  },

  loginAdmin(userId: string, password: string): { success: boolean; error?: string } {
    const cleanUserId = userId.trim().toUpperCase();
    const cleanPassword = password.trim();

    if (cleanUserId !== 'ADMIN') {
      return { success: false, error: 'Invalid User ID. Please enter ADMIN.' };
    }

    if (cleanPassword !== 'RRadmin') {
      return { success: false, error: 'Invalid Password. Please enter the correct Admin password.' };
    }

    const state: AdminAuthState = {
      isAuthenticated: true,
      username: 'ADMIN',
      loginTime: new Date().toISOString(),
    };
    safeStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(state));
    return { success: true };
  },

  logoutAdmin(): void {
    safeStorage.removeItem(ADMIN_STORAGE_KEY);
  },

  // =========================================================================
  // 2. POS AUTHENTICATION (User ID: ADMIN, Password: RRPOSadmin)
  // =========================================================================
  isPOSAuthenticated(): boolean {
    try {
      const data = safeStorage.getItem(POS_STORAGE_KEY);
      if (!data) return false;
      const parsed: POSAuthState = JSON.parse(data);
      return parsed.isAuthenticated === true;
    } catch {
      return false;
    }
  },

  loginPOS(userId: string, password: string): { success: boolean; error?: string } {
    const cleanUserId = userId.trim().toUpperCase();
    const cleanPassword = password.trim();

    if (cleanUserId !== 'ADMIN') {
      return { success: false, error: 'Invalid User ID. Please enter ADMIN.' };
    }

    if (cleanPassword !== 'RRPOSadmin') {
      return { success: false, error: 'Invalid Password. Please enter the correct POS password.' };
    }

    const state: POSAuthState = {
      isAuthenticated: true,
      username: 'ADMIN',
      loginTime: new Date().toISOString(),
    };
    safeStorage.setItem(POS_STORAGE_KEY, JSON.stringify(state));
    return { success: true };
  },

  logoutPOS(): void {
    safeStorage.removeItem(POS_STORAGE_KEY);
  },

  // =========================================================================
  // 3. CUSTOMER AUTHENTICATION (Username / ID: 10-digit mobile number)
  // =========================================================================
  isCustomerAuthenticated(): boolean {
    try {
      const data = safeStorage.getItem(CUSTOMER_STORAGE_KEY);
      if (!data) return false;
      const parsed: CustomerAuthState = JSON.parse(data);
      return parsed.isAuthenticated === true && Boolean(parsed.phone);
    } catch {
      return false;
    }
  },

  getCurrentCustomer(): Customer | null {
    try {
      const data = safeStorage.getItem(CUSTOMER_STORAGE_KEY);
      if (!data) return null;
      const parsed: CustomerAuthState = JSON.parse(data);
      if (!parsed.isAuthenticated || !parsed.phone) return null;

      const customers = storage.getCustomers();
      const found = customers.find((c) => c.phone.replace(/\D/g, '') === parsed.phone.replace(/\D/g, ''));
      if (found) return found;

      // Fallback customer object if not found in array
      return {
        id: parsed.customerId || `cust-${parsed.phone}`,
        name: parsed.customerName || 'Valued Guest',
        phone: parsed.phone,
        loyaltyPoints: 100,
        tier: 'Silver',
        totalSpent: 0,
        totalOrders: 0,
        joinDate: new Date().toISOString().split('T')[0],
      };
    } catch {
      return null;
    }
  },

  loginCustomer(phoneNumber: string, name?: string): { success: boolean; customer: Customer; error?: string } {
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    if (cleanPhone.length !== 10) {
      return {
        success: false,
        customer: null as unknown as Customer,
        error: 'Please enter a valid 10-digit mobile number.',
      };
    }

    const customers = storage.getCustomers();
    let existingCustomer = customers.find((c) => c.phone.replace(/\D/g, '') === cleanPhone);

    if (!existingCustomer) {
      // Create and register new customer with 10-digit user ID and 100 welcome bonus points
      const newCustomer: Customer = {
        id: `cust-${cleanPhone}`,
        name: name?.trim() || `Guest (${cleanPhone.slice(-4)})`,
        phone: cleanPhone,
        email: `${cleanPhone}@customer.richierich.in`,
        loyaltyPoints: 100, // 100 Welcome Points
        tier: 'Silver',
        totalSpent: 0,
        totalOrders: 0,
        joinDate: new Date().toISOString().split('T')[0],
        preferences: ['Royal Maghai Meetha', 'Fresh Coffee'],
      };

      const updatedList = [...customers, newCustomer];
      storage.saveCustomers(updatedList);
      existingCustomer = newCustomer;

      storage.addNotification({
        title: 'New Customer Registered',
        message: `${newCustomer.name} (Mobile: ${cleanPhone}) joined with 100 Welcome Points!`,
        type: 'loyalty_reward',
        targetRole: 'pos',
        read: false,
      });
    } else if (name && name.trim() && existingCustomer.name.startsWith('Guest')) {
      // Update name if previously guest
      existingCustomer.name = name.trim();
      const updatedList = customers.map((c) => (c.id === existingCustomer!.id ? existingCustomer! : c));
      storage.saveCustomers(updatedList);
    }

    const authState: CustomerAuthState = {
      isAuthenticated: true,
      customerId: existingCustomer.id,
      phone: cleanPhone,
      customerName: existingCustomer.name,
    };
    safeStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(authState));

    return { success: true, customer: existingCustomer };
  },

  logoutCustomer(): void {
    safeStorage.removeItem(CUSTOMER_STORAGE_KEY);
  },

  // =========================================================================
  // 4. WAREHOUSE & INVENTORY AUTHENTICATION (User ID: ADMIN, Password: RRwarehouse or RRadmin)
  // =========================================================================
  isWarehouseAuthenticated(): boolean {
    try {
      const data = safeStorage.getItem(WAREHOUSE_STORAGE_KEY);
      if (!data) return false;
      const parsed: WarehouseAuthState = JSON.parse(data);
      return parsed.isAuthenticated === true;
    } catch {
      return false;
    }
  },

  getWarehouseAuthState(): WarehouseAuthState | null {
    try {
      const data = safeStorage.getItem(WAREHOUSE_STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  loginWarehouse(userId: string, password: string, subRole: string = 'admin'): { success: boolean; error?: string } {
    const cleanUserId = userId.trim().toUpperCase();
    const cleanPassword = password.trim();

    if (cleanUserId !== 'ADMIN' && cleanUserId !== 'WAREHOUSE' && cleanUserId !== 'WHADMIN') {
      return { success: false, error: 'Invalid User ID. Please enter ADMIN or WAREHOUSE.' };
    }

    if (cleanPassword !== 'RRwarehouse' && cleanPassword !== 'RRadmin' && cleanPassword !== 'admin123') {
      return { success: false, error: 'Invalid Password. Please enter the correct Warehouse password (RRwarehouse).' };
    }

    const state: WarehouseAuthState = {
      isAuthenticated: true,
      username: cleanUserId,
      subRole,
      loginTime: new Date().toISOString(),
    };
    safeStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(state));
    return { success: true };
  },

  logoutWarehouse(): void {
    safeStorage.removeItem(WAREHOUSE_STORAGE_KEY);
  },

  // =========================================================================
  // 5. STORE ADMIN AUTHENTICATION (Store Selection -> Username -> Password)
  // =========================================================================
  isStoreAdminAuthenticated(): boolean {
    try {
      const data = safeStorage.getItem(STORE_ADMIN_STORAGE_KEY);
      if (!data) return false;
      const parsed: StoreAdminAuthState = JSON.parse(data);
      return parsed.isAuthenticated === true && Boolean(parsed.storeId);
    } catch {
      return false;
    }
  },

  getStoreAdminAuthState(): StoreAdminAuthState | null {
    try {
      const data = safeStorage.getItem(STORE_ADMIN_STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  loginStoreAdmin(
    storeId: string,
    username: string,
    password: string
  ): { success: boolean; error?: string; session?: StoreAdminAuthState } {
    const cleanStoreId = storeId.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanStoreId) {
      return { success: false, error: 'Please select an authorized store outlet.' };
    }

    if (!cleanUsername) {
      return { success: false, error: 'Please enter your Store Admin username.' };
    }

    if (!cleanPassword) {
      return { success: false, error: 'Please enter your password.' };
    }

    const storeAdmins = storage.getStoreAdmins();
    const stores = storage.getStores();
    const storeObj = stores.find((s) => s.id === cleanStoreId);

    if (!storeObj) {
      return { success: false, error: 'Selected store outlet was not found in system.' };
    }

    // Check against store admin credentials list
    const matchedAdmin = storeAdmins.find(
      (a) =>
        a.storeId === cleanStoreId &&
        a.username.toLowerCase() === cleanUsername &&
        a.password === cleanPassword
    );

    // Also allow master admin credentials override for testing/emergency
    const isMasterAdminOverride =
      cleanUsername === 'admin' &&
      (cleanPassword === 'RRadmin' || cleanPassword === 'RRbopal' || cleanPassword === 'RRgota');

    if (!matchedAdmin && !isMasterAdminOverride) {
      return {
        success: false,
        error: `Invalid credentials for ${storeObj.shortName || storeObj.name}. Please check username & password.`,
      };
    }

    if (matchedAdmin && !matchedAdmin.isActive) {
      return {
        success: false,
        error: `This Store Admin account is currently deactivated. Please contact Master Admin.`,
      };
    }

    // Update last login timestamp if matched
    if (matchedAdmin) {
      storage.updateStoreAdmin(matchedAdmin.id, {
        lastLoginAt: new Date().toISOString(),
      });
    }

    const authState: StoreAdminAuthState = {
      isAuthenticated: true,
      username: matchedAdmin ? matchedAdmin.username : 'admin',
      storeId: cleanStoreId,
      storeName: storeObj.name,
      adminName: matchedAdmin ? matchedAdmin.name : 'Master Store Admin',
      loginTime: new Date().toISOString(),
    };

    safeStorage.setItem(STORE_ADMIN_STORAGE_KEY, JSON.stringify(authState));
    return { success: true, session: authState };
  },

  logoutStoreAdmin(): void {
    safeStorage.removeItem(STORE_ADMIN_STORAGE_KEY);
  },
};
