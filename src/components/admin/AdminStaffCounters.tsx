import React, { useState, useEffect } from 'react';
import {
  Users,
  KeyRound,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  Store,
  Clock,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Lock,
  X,
  Check,
  Building2,
  Mail,
  CreditCard,
  Boxes,
  Shield,
  UserPlus,
  BadgeCheck,
  User,
} from 'lucide-react';
import {
  StoreLocation,
  CounterInfo,
  POSSession,
  StoreAdminCredential,
  WarehouseStaffCredential,
  AdminStaffCredential,
} from '../../types';
import { storage } from '../../services/storage';
import { soundEffects } from '../../services/audio';
import { authService, SystemCredentials } from '../../services/auth';

interface AdminStaffCountersProps {
  onLaunchPOSAs?: (session: POSSession) => void;
  onNavigateToStoreAdmin?: (storeId: string) => void;
}

export const AdminStaffCounters: React.FC<AdminStaffCountersProps> = ({
  onLaunchPOSAs,
  onNavigateToStoreAdmin,
}) => {
  // Ordered options: Warehouse, Master admin, Store Admin, POS
  const [activeTab, setActiveTab] = useState<'warehouse' | 'admin' | 'store_admins' | 'pos'>('warehouse');
  const [stores, setStores] = useState<StoreLocation[]>(() => storage.getStores());
  const [storeAdmins, setStoreAdmins] = useState<StoreAdminCredential[]>(() => storage.getStoreAdmins());
  const [warehouseStaff, setWarehouseStaff] = useState<WarehouseStaffCredential[]>(() => storage.getWarehouseStaff());
  const [adminStaff, setAdminStaff] = useState<AdminStaffCredential[]>(() => storage.getAdminStaff());
  const [systemCreds, setSystemCreds] = useState<SystemCredentials>(() => authService.getSystemCredentials());
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [revealedAdminPasswords, setRevealedAdminPasswords] = useState<Record<string, boolean>>({});
  const [revealedSystemPasswords, setRevealedSystemPasswords] = useState<Record<string, boolean>>({});
  const [revealedStaffPasswords, setRevealedStaffPasswords] = useState<Record<string, boolean>>({});

  // Unified Add Login ID & Password Modal
  const [isAddLoginModalOpen, setIsAddLoginModalOpen] = useState(false);
  const [addLoginRole, setAddLoginRole] = useState<'warehouse' | 'admin' | 'store_admin' | 'pos'>('warehouse');
  const [addLoginUserId, setAddLoginUserId] = useState('');
  const [addLoginPassword, setAddLoginPassword] = useState('');
  const [addLoginConfirmPassword, setAddLoginConfirmPassword] = useState('');
  const [addLoginName, setAddLoginName] = useState('');
  const [addLoginPhone, setAddLoginPhone] = useState('');
  const [addLoginEmail, setAddLoginEmail] = useState('');
  const [addLoginStoreId, setAddLoginStoreId] = useState('bopal');
  const [addLoginRoleTitle, setAddLoginRoleTitle] = useState('');
  const [addLoginSubRole, setAddLoginSubRole] = useState('warehouse_manager');
  const [addLoginShift, setAddLoginShift] = useState('24x7 Active (Day Shift)');
  const [addLoginPin, setAddLoginPin] = useState('');
  const [addLoginUpdatePrimary, setAddLoginUpdatePrimary] = useState(false);
  const [addLoginMsg, setAddLoginMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showModalPass, setShowModalPass] = useState(false);
  const [showModalConfirmPass, setShowModalConfirmPass] = useState(false);

  // Master Admin edit modal
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminUserIdInput, setAdminUserIdInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [adminModalMsg, setAdminModalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Warehouse edit modal
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [warehouseUserIdInput, setWarehouseUserIdInput] = useState('');
  const [warehousePasswordInput, setWarehousePasswordInput] = useState('');
  const [warehousePasswordConfirm, setWarehousePasswordConfirm] = useState('');
  const [warehouseModalMsg, setWarehouseModalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Master POS edit modal
  const [isPOSMasterModalOpen, setIsPOSMasterModalOpen] = useState(false);
  const [posUserIdInput, setPosUserIdInput] = useState('');
  const [posPasswordInput, setPosPasswordInput] = useState('');
  const [posPasswordConfirm, setPosPasswordConfirm] = useState('');
  const [posModalMsg, setPosModalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state for POS Counters
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetStoreForAdd, setTargetStoreForAdd] = useState<string>('gota');
  const [newCashierName, setNewCashierName] = useState('');
  const [newCounterName, setNewCounterName] = useState('');
  const [newShift, setNewShift] = useState('24x7 Active (Shift A)');
  const [newPin, setNewPin] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Change PIN modal state
  const [pinChangeModal, setPinChangeModal] = useState<{
    storeId: string;
    storeName: string;
    counter: CounterInfo;
  } | null>(null);
  const [newPinInput, setNewPinInput] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string | null>(null);

  // Edit Salesperson modal state
  const [editingCounter, setEditingCounter] = useState<{
    storeId: string;
    storeName: string;
    counter: CounterInfo;
  } | null>(null);
  const [editCashierName, setEditCashierName] = useState('');
  const [editCounterName, setEditCounterName] = useState('');
  const [editShift, setEditShift] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Store Admin Modals state
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [newAdminStoreId, setNewAdminStoreId] = useState('bopal');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRoleTitle, setNewAdminRoleTitle] = useState('Store Branch Manager');

  // Edit Store Admin Modal state
  const [editingStoreAdmin, setEditingStoreAdmin] = useState<StoreAdminCredential | null>(null);
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminUsername, setEditAdminUsername] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [editAdminStoreId, setEditAdminStoreId] = useState('');
  const [editAdminPhone, setEditAdminPhone] = useState('');
  const [editAdminEmail, setEditAdminEmail] = useState('');
  const [editAdminRoleTitle, setEditAdminRoleTitle] = useState('');
  const [editAdminIsActive, setEditAdminIsActive] = useState(true);

  const refreshData = () => {
    setStores(storage.getStores());
    setStoreAdmins(storage.getStoreAdmins());
    setWarehouseStaff(storage.getWarehouseStaff());
    setAdminStaff(storage.getAdminStaff());
    setSystemCreds(authService.getSystemCredentials());
  };

  useEffect(() => {
    const unsub = storage.subscribe(() => {
      refreshData();
    });
    return () => unsub();
  }, []);

  const togglePinReveal = (uniqueKey: string) => {
    setRevealedPins((prev) => ({
      ...prev,
      [uniqueKey]: !prev[uniqueKey],
    }));
  };

  const toggleAdminPasswordReveal = (adminId: string) => {
    setRevealedAdminPasswords((prev) => ({
      ...prev,
      [adminId]: !prev[adminId],
    }));
  };

  const toggleSystemPasswordReveal = (portalKey: string) => {
    setRevealedSystemPasswords((prev) => ({
      ...prev,
      [portalKey]: !prev[portalKey],
    }));
  };

  const toggleStaffPasswordReveal = (id: string) => {
    setRevealedStaffPasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // =========================================================================
  // UNIFIED ADD LOGIN ID & PASSWORD HANDLERS
  // Options: Warehouse, Master admin, Store Admin, POS
  // =========================================================================
  const handleOpenAddLoginModal = (defaultRole?: 'warehouse' | 'admin' | 'store_admin' | 'pos') => {
    const role: 'warehouse' | 'admin' | 'store_admin' | 'pos' =
      defaultRole || (activeTab === 'store_admins' ? 'store_admin' : activeTab);
    setAddLoginRole(role);
    setAddLoginUserId(
      role === 'warehouse'
        ? `WH_${Math.floor(100 + Math.random() * 900)}`
        : role === 'admin'
        ? `ADM_${Math.floor(100 + Math.random() * 900)}`
        : role === 'store_admin'
        ? `admin_${selectedStoreId !== 'all' ? selectedStoreId : 'bopal'}_${Math.floor(10 + Math.random() * 90)}`
        : `POS_CASHIER_${Math.floor(1 + Math.random() * 9)}`
    );
    setAddLoginPassword('');
    setAddLoginConfirmPassword('');
    setAddLoginName('');
    setAddLoginPhone('');
    setAddLoginEmail('');
    setAddLoginStoreId(selectedStoreId !== 'all' ? selectedStoreId : 'bopal');
    setAddLoginRoleTitle(
      role === 'warehouse'
        ? 'Warehouse Floor Supervisor'
        : role === 'admin'
        ? 'Executive Operations Lead'
        : role === 'store_admin'
        ? 'Store Branch Manager'
        : 'Front Counter Cashier'
    );
    setAddLoginSubRole('warehouse_manager');
    setAddLoginShift('24x7 Active (Day Shift)');
    setAddLoginPin(Math.floor(1000 + Math.random() * 9000).toString());
    setAddLoginUpdatePrimary(false);
    setAddLoginMsg(null);
    setIsAddLoginModalOpen(true);
  };

  const handleSaveAddLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoginMsg(null);

    const cleanUserId = addLoginUserId.trim();
    const cleanPassword = addLoginPassword.trim();
    const cleanName = addLoginName.trim();

    if (!cleanUserId) {
      setAddLoginMsg({ type: 'error', text: 'Login ID / Username cannot be empty.' });
      return;
    }
    if (!cleanPassword || cleanPassword.length < 3) {
      setAddLoginMsg({ type: 'error', text: 'Password must be at least 3 characters long.' });
      return;
    }
    if (cleanPassword !== addLoginConfirmPassword.trim()) {
      setAddLoginMsg({ type: 'error', text: 'Passwords do not match. Please re-enter.' });
      return;
    }

    try {
      if (addLoginRole === 'warehouse') {
        if (addLoginUpdatePrimary) {
          authService.updateSystemCredentials('warehouse', cleanUserId, cleanPassword);
        }
        storage.addWarehouseStaff({
          username: cleanUserId,
          password: cleanPassword,
          name: cleanName || `Warehouse Staff (${cleanUserId})`,
          subRole: addLoginSubRole,
          phone: addLoginPhone.trim(),
          email: addLoginEmail.trim(),
          isActive: true,
        });
        soundEffects.playSuccessChime();
        refreshData();
        setAddLoginMsg({ type: 'success', text: `Warehouse login "${cleanUserId}" created successfully!` });
        setTimeout(() => {
          setIsAddLoginModalOpen(false);
          setActiveTab('warehouse');
        }, 1200);
      } else if (addLoginRole === 'admin') {
        if (addLoginUpdatePrimary) {
          authService.updateSystemCredentials('admin', cleanUserId, cleanPassword);
        }
        storage.addAdminStaff({
          username: cleanUserId,
          password: cleanPassword,
          name: cleanName || `Executive Admin (${cleanUserId})`,
          roleTitle: addLoginRoleTitle.trim() || 'HQ Operations Executive',
          phone: addLoginPhone.trim(),
          email: addLoginEmail.trim(),
          isActive: true,
        });
        soundEffects.playSuccessChime();
        refreshData();
        setAddLoginMsg({ type: 'success', text: `Master Admin login "${cleanUserId}" created successfully!` });
        setTimeout(() => {
          setIsAddLoginModalOpen(false);
          setActiveTab('admin');
        }, 1200);
      } else if (addLoginRole === 'store_admin') {
        const storeObj = stores.find((s) => s.id === addLoginStoreId);
        storage.addStoreAdmin({
          storeId: addLoginStoreId,
          storeName: storeObj ? storeObj.name : 'Richie Rich Pan House',
          name: cleanName || `Store Manager (${cleanUserId})`,
          username: cleanUserId,
          password: cleanPassword,
          roleTitle: addLoginRoleTitle.trim() || 'Store Branch Manager',
          phone: addLoginPhone.trim(),
          email: addLoginEmail.trim(),
          isActive: true,
        });
        soundEffects.playSuccessChime();
        refreshData();
        setAddLoginMsg({ type: 'success', text: `Store Admin login for ${storeObj?.shortName || 'Store'} created successfully!` });
        setTimeout(() => {
          setIsAddLoginModalOpen(false);
          setActiveTab('store_admins');
        }, 1200);
      } else if (addLoginRole === 'pos') {
        if (addLoginUpdatePrimary) {
          authService.updateSystemCredentials('pos', cleanUserId, cleanPassword);
        }
        storage.addCounter(addLoginStoreId, {
          cashierName: cleanName || cleanUserId,
          name: addLoginRoleTitle.trim() || `Station (${cleanUserId})`,
          defaultPin: addLoginPin.trim() || '1234',
          shift: addLoginShift,
          phone: addLoginPhone.trim(),
        });
        soundEffects.playSuccessChime();
        refreshData();
        setAddLoginMsg({ type: 'success', text: `POS Counter & Cashier login "${cleanUserId}" created with PIN ${addLoginPin}!` });
        setTimeout(() => {
          setIsAddLoginModalOpen(false);
          setActiveTab('pos');
        }, 1200);
      }
    } catch (err: any) {
      setAddLoginMsg({ type: 'error', text: err?.message || 'Failed to save credentials' });
    }
  };

  const handleDeleteWarehouseStaff = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove warehouse staff account "${name}"?`)) {
      storage.deleteWarehouseStaff(id);
      refreshData();
      soundEffects.playSuccessChime();
    }
  };

  const handleDeleteAdminStaff = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove admin account "${name}"?`)) {
      storage.deleteAdminStaff(id);
      refreshData();
      soundEffects.playSuccessChime();
    }
  };

  // =========================================================================
  // SYSTEM CREDENTIALS HANDLERS (Master Admin, Warehouse, POS Master)
  // =========================================================================
  const handleOpenEditAdminModal = () => {
    const creds = authService.getSystemCredentials().admin;
    setAdminUserIdInput(creds.userId);
    setAdminPasswordInput(creds.password);
    setAdminPasswordConfirm(creds.password);
    setAdminModalMsg(null);
    setIsAdminModalOpen(true);
  };

  const handleSaveAdminCreds = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminModalMsg(null);
    if (!adminUserIdInput.trim()) {
      setAdminModalMsg({ type: 'error', text: 'Admin User ID cannot be empty.' });
      return;
    }
    if (!adminPasswordInput.trim() || adminPasswordInput.length < 3) {
      setAdminModalMsg({ type: 'error', text: 'Password must be at least 3 characters long.' });
      return;
    }
    if (adminPasswordInput !== adminPasswordConfirm) {
      setAdminModalMsg({ type: 'error', text: 'Passwords do not match. Please re-enter.' });
      return;
    }

    const res = authService.updateSystemCredentials('admin', adminUserIdInput.trim(), adminPasswordInput.trim());
    if (res.success) {
      soundEffects.playSuccessChime();
      refreshData();
      setAdminModalMsg({ type: 'success', text: 'Master Admin User ID & Password updated successfully!' });
      setTimeout(() => {
        setIsAdminModalOpen(false);
        setAdminModalMsg(null);
      }, 1400);
    } else {
      setAdminModalMsg({ type: 'error', text: res.error || 'Failed to update credentials' });
    }
  };

  const handleOpenEditWarehouseModal = () => {
    const creds = authService.getSystemCredentials().warehouse;
    setWarehouseUserIdInput(creds.userId);
    setWarehousePasswordInput(creds.password);
    setWarehousePasswordConfirm(creds.password);
    setWarehouseModalMsg(null);
    setIsWarehouseModalOpen(true);
  };

  const handleSaveWarehouseCreds = (e: React.FormEvent) => {
    e.preventDefault();
    setWarehouseModalMsg(null);
    if (!warehouseUserIdInput.trim()) {
      setWarehouseModalMsg({ type: 'error', text: 'Warehouse User ID cannot be empty.' });
      return;
    }
    if (!warehousePasswordInput.trim() || warehousePasswordInput.length < 3) {
      setWarehouseModalMsg({ type: 'error', text: 'Password must be at least 3 characters long.' });
      return;
    }
    if (warehousePasswordInput !== warehousePasswordConfirm) {
      setWarehouseModalMsg({ type: 'error', text: 'Passwords do not match. Please re-enter.' });
      return;
    }

    const res = authService.updateSystemCredentials('warehouse', warehouseUserIdInput.trim(), warehousePasswordInput.trim());
    if (res.success) {
      soundEffects.playSuccessChime();
      refreshData();
      setWarehouseModalMsg({ type: 'success', text: 'Warehouse login credentials updated successfully!' });
      setTimeout(() => {
        setIsWarehouseModalOpen(false);
        setWarehouseModalMsg(null);
      }, 1400);
    } else {
      setWarehouseModalMsg({ type: 'error', text: res.error || 'Failed to update credentials' });
    }
  };

  const handleOpenEditPOSMasterModal = () => {
    const creds = authService.getSystemCredentials().pos;
    setPosUserIdInput(creds.userId);
    setPosPasswordInput(creds.password);
    setPosPasswordConfirm(creds.password);
    setPosModalMsg(null);
    setIsPOSMasterModalOpen(true);
  };

  const handleSavePOSMasterCreds = (e: React.FormEvent) => {
    e.preventDefault();
    setPosModalMsg(null);
    if (!posUserIdInput.trim()) {
      setPosModalMsg({ type: 'error', text: 'POS User ID cannot be empty.' });
      return;
    }
    if (!posPasswordInput.trim() || posPasswordInput.length < 3) {
      setPosModalMsg({ type: 'error', text: 'Password must be at least 3 characters long.' });
      return;
    }
    if (posPasswordInput !== posPasswordConfirm) {
      setPosModalMsg({ type: 'error', text: 'Passwords do not match. Please re-enter.' });
      return;
    }

    const res = authService.updateSystemCredentials('pos', posUserIdInput.trim(), posPasswordInput.trim());
    if (res.success) {
      soundEffects.playSuccessChime();
      refreshData();
      setPosModalMsg({ type: 'success', text: 'POS Terminal Master credentials updated successfully!' });
      setTimeout(() => {
        setIsPOSMasterModalOpen(false);
        setPosModalMsg(null);
      }, 1400);
    } else {
      setPosModalMsg({ type: 'error', text: res.error || 'Failed to update credentials' });
    }
  };

  const handleOpenAddModal = (storeId?: string) => {
    setTargetStoreForAdd(storeId || (selectedStoreId !== 'all' ? selectedStoreId : 'gota'));
    setNewCashierName('');
    setNewCounterName('');
    setNewShift('24x7 Active (Day Shift)');
    setNewPin(Math.floor(1000 + Math.random() * 9000).toString());
    setNewPhone('');
    setIsAddModalOpen(true);
  };

  const handleCreateCounter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCashierName.trim() || !newPin.trim()) return;

    storage.addCounter(targetStoreForAdd, {
      cashierName: newCashierName.trim(),
      name: newCounterName.trim() || `Counter Station (${newCashierName.trim()})`,
      defaultPin: newPin.trim(),
      shift: newShift,
      phone: newPhone.trim(),
    });

    soundEffects.playSuccessChime();
    refreshData();
    setIsAddModalOpen(false);
  };

  const handleOpenPinChange = (storeId: string, storeName: string, counter: CounterInfo) => {
    setPinChangeModal({ storeId, storeName, counter });
    setNewPinInput('');
    setPinSuccessMsg(null);
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinChangeModal || !newPinInput.trim()) return;

    if (newPinInput.trim().length < 3) {
      alert('PIN should be at least 3 digits.');
      return;
    }

    const success = storage.updateCounterPin(
      pinChangeModal.storeId,
      pinChangeModal.counter.id,
      newPinInput.trim()
    );

    if (success) {
      soundEffects.playSuccessChime();
      setPinSuccessMsg(`PIN for Counter #${pinChangeModal.counter.id} updated successfully!`);
      refreshData();
      setTimeout(() => {
        setPinChangeModal(null);
      }, 1200);
    }
  };

  const handleOpenEditCounter = (storeId: string, storeName: string, counter: CounterInfo) => {
    setEditingCounter({ storeId, storeName, counter });
    setEditCashierName(counter.cashierName);
    setEditCounterName(counter.name);
    setEditShift(counter.shift);
    setEditPhone(counter.phone || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCounter || !editCashierName.trim()) return;

    const success = storage.updateCounterDetails(
      editingCounter.storeId,
      editingCounter.counter.id,
      {
        cashierName: editCashierName.trim(),
        name: editCounterName.trim() || `Counter Station (${editCashierName.trim()})`,
        shift: editShift,
        phone: editPhone.trim(),
      }
    );

    if (success) {
      soundEffects.playSuccessChime();
      refreshData();
      setEditingCounter(null);
    }
  };

  const handleDeleteCounter = (storeId: string, counterId: number, cashierName: string) => {
    if (confirm(`Are you sure you want to remove Counter #${counterId} (${cashierName})?`)) {
      storage.deleteCounter(storeId, counterId);
      soundEffects.playTrash();
      refreshData();
    }
  };

  // =========================================================================
  // STORE ADMIN CREDENTIAL HANDLERS
  // =========================================================================
  const handleOpenAddAdminModal = () => {
    setNewAdminStoreId(selectedStoreId !== 'all' ? selectedStoreId : stores[0]?.id || 'bopal');
    setNewAdminName('');
    setNewAdminUsername('');
    setNewAdminPassword('');
    setNewAdminPhone('');
    setNewAdminEmail('');
    setNewAdminRoleTitle('Store Branch Manager');
    setIsAddAdminModalOpen(true);
  };

  const handleCreateStoreAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName.trim() || !newAdminUsername.trim() || !newAdminPassword.trim()) {
      alert('Please fill all required fields (Name, Username, and Password).');
      return;
    }

    const targetStore = stores.find((s) => s.id === newAdminStoreId);
    const storeName = targetStore ? targetStore.name : 'Richie Rich Pan House';

    storage.addStoreAdmin({
      name: newAdminName.trim(),
      username: newAdminUsername.trim().toLowerCase(),
      password: newAdminPassword.trim(),
      storeId: newAdminStoreId,
      storeName,
      phone: newAdminPhone.trim(),
      email: newAdminEmail.trim(),
      roleTitle: newAdminRoleTitle.trim() || 'Store Branch Manager',
      isActive: true,
    });

    soundEffects.playSuccessChime();
    refreshData();
    setIsAddAdminModalOpen(false);
  };

  const handleOpenEditAdmin = (admin: StoreAdminCredential) => {
    setEditingStoreAdmin(admin);
    setEditAdminName(admin.name);
    setEditAdminUsername(admin.username);
    setEditAdminPassword(admin.password);
    setEditAdminStoreId(admin.storeId);
    setEditAdminPhone(admin.phone || '');
    setEditAdminEmail(admin.email || '');
    setEditAdminRoleTitle(admin.roleTitle || 'Store Branch Manager');
    setEditAdminIsActive(admin.isActive);
  };

  const handleSaveEditAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStoreAdmin || !editAdminName.trim() || !editAdminUsername.trim() || !editAdminPassword.trim()) {
      return;
    }

    const targetStore = stores.find((s) => s.id === editAdminStoreId);
    const storeName = targetStore ? targetStore.name : editingStoreAdmin.storeName;

    storage.updateStoreAdmin(editingStoreAdmin.id, {
      name: editAdminName.trim(),
      username: editAdminUsername.trim().toLowerCase(),
      password: editAdminPassword.trim(),
      storeId: editAdminStoreId,
      storeName,
      phone: editAdminPhone.trim(),
      email: editAdminEmail.trim(),
      roleTitle: editAdminRoleTitle.trim(),
      isActive: editAdminIsActive,
    });

    soundEffects.playSuccessChime();
    refreshData();
    setEditingStoreAdmin(null);
  };

  const handleDeleteAdmin = (admin: StoreAdminCredential) => {
    if (confirm(`Are you sure you want to remove Store Admin login for "${admin.name}" (${admin.storeName})?`)) {
      storage.deleteStoreAdmin(admin.id);
      soundEffects.playTrash();
      refreshData();
    }
  };

  const handleToggleAdminStatus = (admin: StoreAdminCredential) => {
    storage.updateStoreAdmin(admin.id, { isActive: !admin.isActive });
    soundEffects.playSoftClick();
    refreshData();
  };

  const filteredStores =
    selectedStoreId === 'all'
      ? stores
      : stores.filter((s) => s.id === selectedStoreId);

  const filteredStoreAdmins =
    selectedStoreId === 'all'
      ? storeAdmins
      : storeAdmins.filter((a) => a.storeId === selectedStoreId);

  const totalCountersCount = stores.reduce((acc, s) => acc + s.counters.length, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-900 flex items-center justify-center shrink-0 border border-amber-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Staff, Salespersons & Login Credentials Management
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold">
                {storeAdmins.length} Store Admins • {warehouseStaff.length} Warehouse • {totalCountersCount} POS Stations
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Add and manage portal login IDs and passwords across Warehouse, Master admin, Store Admin, and POS terminals.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Main Action: Add Login ID & Password */}
          <button
            onClick={() => handleOpenAddLoginModal()}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer hover:shadow-md"
          >
            <KeyRound className="w-4 h-4 text-slate-950" />
            <span>+ Add Login ID & Password</span>
          </button>

          {/* Contextual Action based on active tab */}
          {activeTab === 'warehouse' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenEditWarehouseModal}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-amber-300" />
                <span>Change Warehouse Credentials</span>
              </button>
            </div>
          ) : activeTab === 'admin' ? (
            <button
              onClick={handleOpenEditAdminModal}
              className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Change Admin Credentials</span>
            </button>
          ) : activeTab === 'store_admins' ? (
            <button
              onClick={handleOpenAddAdminModal}
              className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Store Admin Account</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenEditPOSMasterModal}
                className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Change Master POS Password</span>
              </button>
              <button
                onClick={() => handleOpenAddModal()}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Salesperson & Counter</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main 4-Role Navigation Switcher: Warehouse, Master admin, Store Admin, POS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* OPTION 1: WAREHOUSE */}
        <button
          onClick={() => setActiveTab('warehouse')}
          className={`p-4 rounded-xl border transition-all text-left flex items-start gap-3.5 cursor-pointer ${
            activeTab === 'warehouse'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-indigo-500/50'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              activeTab === 'warehouse' ? 'bg-indigo-500 text-white font-bold' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Boxes className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm truncate">Warehouse</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                  activeTab === 'warehouse' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-100 text-slate-600'
                }`}
              >
                /warehouse
              </span>
            </div>
            <p className={`text-xs mt-1 ${activeTab === 'warehouse' ? 'text-slate-300' : 'text-slate-500'}`}>
              Logistics Credentials ({warehouseStaff.length} Staff)
            </p>
          </div>
        </button>

        {/* OPTION 2: MASTER ADMIN */}
        <button
          onClick={() => setActiveTab('admin')}
          className={`p-4 rounded-xl border transition-all text-left flex items-start gap-3.5 cursor-pointer ${
            activeTab === 'admin'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-500/50'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              activeTab === 'admin' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Shield className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm truncate">Master admin</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                  activeTab === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-100 text-slate-600'
                }`}
              >
                /admin
              </span>
            </div>
            <p className={`text-xs mt-1 ${activeTab === 'admin' ? 'text-slate-300' : 'text-slate-500'}`}>
              Login ID & Password ({adminStaff.length + 1} Logins)
            </p>
          </div>
        </button>

        {/* OPTION 3: STORE ADMIN */}
        <button
          onClick={() => setActiveTab('store_admins')}
          className={`p-4 rounded-xl border transition-all text-left flex items-start gap-3.5 cursor-pointer ${
            activeTab === 'store_admins'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-amber-500/50'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              activeTab === 'store_admins' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm truncate">Store Admin</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                  activeTab === 'store_admins' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {storeAdmins.length} Outlets
              </span>
            </div>
            <p className={`text-xs mt-1 ${activeTab === 'store_admins' ? 'text-slate-300' : 'text-slate-500'}`}>
              Store Managers Access
            </p>
          </div>
        </button>

        {/* OPTION 4: POS & PINS */}
        <button
          onClick={() => setActiveTab('pos')}
          className={`p-4 rounded-xl border transition-all text-left flex items-start gap-3.5 cursor-pointer ${
            activeTab === 'pos'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/50'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              activeTab === 'pos' ? 'bg-emerald-500 text-white font-bold' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm truncate">POS</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                  activeTab === 'pos' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {totalCountersCount} PINs
              </span>
            </div>
            <p className={`text-xs mt-1 ${activeTab === 'pos' ? 'text-slate-300' : 'text-slate-500'}`}>
              Master Login & Stations
            </p>
          </div>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: WAREHOUSE & SUPPLY CHAIN CREDENTIALS */}
      {/* ===================================================================== */}
      {activeTab === 'warehouse' && (
        <div className="space-y-5">
          {/* Primary Gate Credentials */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-500/30">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Central Warehouse Gate Credentials</h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                    Supply Chain Portal (/warehouse)
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Master login granting full access to Central Warehouse inventory, supplier POs, GRN inward bills, and store dispatches.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
              <button
                onClick={handleOpenEditWarehouseModal}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-amber-300" />
                <span>Change Warehouse Login ID & Password</span>
              </button>
            </div>
          </div>

          {/* Primary Gate Login ID & Password Display Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Warehouse Master User ID
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-slate-900">
                    {systemCreds.warehouse.userId}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                    Required at Login
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Default master code for warehouse authentication</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Warehouse Master Password
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-slate-900 tracking-wider">
                    {revealedSystemPasswords['warehouse'] ? systemCreds.warehouse.password : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleSystemPasswordReveal('warehouse')}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-200"
                    title={revealedSystemPasswords['warehouse'] ? 'Hide password' : 'Show password'}
                  >
                    {revealedSystemPasswords['warehouse'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Secures purchase orders, supplier ledgers & batches</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Status & Last Updated
                </span>
                <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Active & Enforced</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {systemCreds.warehouse.updatedAt
                    ? `Last changed: ${new Date(systemCreds.warehouse.updatedAt).toLocaleDateString()} at ${new Date(systemCreds.warehouse.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Running with initial default credentials'}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Authorized Warehouse Sub-Roles Unlocked by this Password
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="font-bold text-slate-900 block">Admin</span>
                  <span className="text-[10px] text-slate-500">Full operations</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="font-bold text-slate-900 block">WH Manager</span>
                  <span className="text-[10px] text-slate-500">Inward & Dispatches</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="font-bold text-slate-900 block">Store Manager</span>
                  <span className="text-[10px] text-slate-500">Indents & Receiving</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="font-bold text-slate-900 block">Purchase Mgr</span>
                  <span className="text-[10px] text-slate-500">POs & Supplier Bills</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="font-bold text-slate-900 block">Accountant</span>
                  <span className="text-[10px] text-slate-500">Ledgers & Outstandings</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Warehouse Staff & Manager Accounts */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Warehouse Staff & Individual Login Accounts</h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
                    {warehouseStaff.length} Accounts Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Individual warehouse staff accounts permitted to log in at <code>/warehouse</code> using their own login ID and password.
                </p>
              </div>

              <button
                onClick={() => handleOpenAddLoginModal('warehouse')}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Warehouse Staff Login</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {warehouseStaff.map((staff) => {
                const isRevealed = revealedStaffPasswords[staff.id] || false;
                return (
                  <div
                    key={staff.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-900 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-200">
                          {staff.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-slate-900 text-sm">{staff.name}</h4>
                            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Active
                            </span>
                          </div>
                          <span className="text-xs text-indigo-700 font-semibold uppercase tracking-wider block mt-0.5">
                            {staff.subRole.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteWarehouseStaff(staff.id, staff.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                        title="Delete Warehouse Login"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Login User ID:</span>
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {staff.username}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Password:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {isRevealed ? staff.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleStaffPasswordReveal(staff.id)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                            title={isRevealed ? 'Hide password' : 'Show password'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {(staff.phone || staff.email) && (
                      <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 border-t border-slate-100">
                        {staff.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{staff.phone}</span>
                          </div>
                        )}
                        {staff.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[140px]">{staff.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 2: MASTER ADMIN LOGIN CREDENTIALS */}
      {/* ===================================================================== */}
      {activeTab === 'admin' && (
        <div className="space-y-5">
          {/* Primary Gate Credentials */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Master Admin Management Credentials</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                    Full HQ Access (/admin)
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Controls executive authentication at <code className="text-amber-300 font-mono font-bold">/admin</code>. Grants complete privileges over inventory, multi-store financials, orders, databases, backups, and security.
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenEditAdminModal}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 self-start md:self-auto"
            >
              <KeyRound className="w-4 h-4" />
              <span>Change Admin Login ID & Password</span>
            </button>
          </div>

          {/* Primary Gate Login ID & Password Display Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Admin Login User ID
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-slate-900">
                    {systemCreds.admin.userId}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                    Required at Login
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Case-insensitive username for executive access</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Admin Security Password
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-slate-900 tracking-wider">
                    {revealedSystemPasswords['admin'] ? systemCreds.admin.password : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleSystemPasswordReveal('admin')}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-200"
                    title={revealedSystemPasswords['admin'] ? 'Hide password' : 'Show password'}
                  >
                    {revealedSystemPasswords['admin'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Master password guarding financial ledgers & settings</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Status & Last Updated
                </span>
                <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Active & Enforced</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {systemCreds.admin.updatedAt
                    ? `Last changed: ${new Date(systemCreds.admin.updatedAt).toLocaleDateString()} at ${new Date(systemCreds.admin.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Running with initial default credentials'}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Authorized Executive Privileges
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="font-bold text-slate-900 block">Master Inventory & Catalog</span>
                  <span className="text-[11px] text-slate-500">Edit SKUs, prices, margins & categories</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="font-bold text-slate-900 block">P&L & Analytics Reports</span>
                  <span className="text-[11px] text-slate-500">Consolidated financial statements & exports</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="font-bold text-slate-900 block">Database Backups & Restore</span>
                  <span className="text-[11px] text-slate-500">SHA-256 cloud snapshots & Drive sync</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <span className="font-bold text-slate-900 block">Staff & Portal Credentials</span>
                  <span className="text-[11px] text-slate-500">Manage all portal IDs, passwords & PINs</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Authorized Executive Admin Accounts */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Authorized Executive Admin Accounts</h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                    {adminStaff.length} Accounts Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Executive management logins with individual IDs and passwords for executive HQ operations.
                </p>
              </div>

              <button
                onClick={() => handleOpenAddLoginModal('admin')}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Add Admin Staff Login</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {adminStaff.map((staff) => {
                const isRevealed = revealedStaffPasswords[staff.id] || false;
                return (
                  <div
                    key={staff.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-950 flex items-center justify-center font-black text-sm shrink-0 border border-amber-300">
                          {staff.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-slate-900 text-sm">{staff.name}</h4>
                            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Active
                            </span>
                          </div>
                          <span className="text-xs text-slate-600 font-medium block mt-0.5">
                            {staff.roleTitle || 'HQ Administrator'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteAdminStaff(staff.id, staff.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                        title="Delete Admin Login"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Login User ID:</span>
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {staff.username}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Password:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {isRevealed ? staff.password : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleStaffPasswordReveal(staff.id)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                            title={isRevealed ? 'Hide password' : 'Show password'}
                          >
                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {(staff.phone || staff.email) && (
                      <div className="flex items-center gap-3 text-xs text-slate-500 pt-1 border-t border-slate-100">
                        {staff.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{staff.phone}</span>
                          </div>
                        )}
                        {staff.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[140px]">{staff.email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Outlet Selection Filter Tabs (shown when viewing Store Admins or POS counters) */}
      {(activeTab === 'store_admins' || activeTab === 'pos') && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <button
            onClick={() => setSelectedStoreId('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedStoreId === 'all'
                ? 'bg-[#1E293B] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>All Outlets ({stores.length})</span>
          </button>

          {stores.map((store) => (
            <button
              key={store.id}
              onClick={() => setSelectedStoreId(store.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                selectedStoreId === store.id
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{store.shortName}</span>
              <span className="px-1.5 py-0.2 bg-black/10 rounded-full text-[10px]">
                {activeTab === 'store_admins'
                  ? `${storeAdmins.filter((a) => a.storeId === store.id).length} Admins`
                  : `${store.counters.length} Staff`}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 3: STORE ADMIN CREDENTIALS & ACCESS */}
      {/* ===================================================================== */}
      {activeTab === 'store_admins' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">Store Admin Login Credentials</p>
                <p className="text-slate-600 mt-0.5">
                  Store Admins can login via <strong>Landing Page &gt; Store Admin</strong> by selecting their store outlet and entering their username & password.
                </p>
              </div>
            </div>
            <button
              onClick={handleOpenAddAdminModal}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shrink-0 cursor-pointer shadow-xs"
            >
              + Create Store Admin
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStoreAdmins.map((admin) => {
              const isPasswordRevealed = revealedAdminPasswords[admin.id] || false;
              const storeObj = stores.find((s) => s.id === admin.storeId);

              return (
                <div
                  key={admin.id}
                  className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                    admin.isActive ? 'border-slate-200 hover:border-slate-300' : 'border-red-200 bg-red-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-950 flex items-center justify-center font-black text-sm shrink-0 border border-amber-300/60">
                        {admin.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-slate-900 text-base">{admin.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              admin.isActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            {admin.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-xs text-amber-800 font-bold mt-0.5">{admin.roleTitle || 'Store Manager'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditAdmin(admin)}
                        className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                        title="Edit Store Admin"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAdmin(admin)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                        title="Delete Store Admin"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Store Outlet Tag */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Store className="w-3.5 h-3.5 text-amber-700" />
                        <span>{admin.storeName}</span>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                        {admin.storeId}
                      </span>
                    </div>
                    {storeObj?.area && (
                      <p className="text-[11px] text-slate-500 mt-1">{storeObj.area}</p>
                    )}
                  </div>

                  {/* Credentials Box */}
                  <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Login Username:</span>
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {admin.username}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Password:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {isPasswordRevealed ? admin.password : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleAdminPasswordReveal(admin.id)}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                          title={isPasswordRevealed ? 'Hide password' : 'Show password'}
                        >
                          {isPasswordRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info & Footer Actions */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      {admin.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{admin.phone}</span>
                        </div>
                      )}
                      {admin.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">{admin.email}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        onClick={() => handleToggleAdminStatus(admin)}
                        className={`text-[11px] font-bold px-2 py-1 rounded cursor-pointer ${
                          admin.isActive
                            ? 'text-amber-700 hover:bg-amber-50'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {admin.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 4: POS TERMINAL CREDENTIALS & COUNTER PINS */}
      {/* ===================================================================== */}
      {activeTab === 'pos' && (
        <div className="space-y-6">
          {/* Top Card: Master POS Terminal Login Credentials */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Master POS Terminal Gate Credentials</h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                      Route: /pos
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Controls entry into the Master POS Terminal. Once unlocked, cashiers switch between counter stations using their quick 4-digit PINs below.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenEditPOSMasterModal}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Change Master POS Password</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Master POS User ID
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-slate-900">
                    {systemCreds.pos.userId}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                    Required at Login
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Terminal login identifier for cash desks</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Master POS Password
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-slate-900 tracking-wider">
                    {revealedSystemPasswords['pos'] ? systemCreds.pos.password : '••••••••'}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleSystemPasswordReveal('pos')}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-200"
                    title={revealedSystemPasswords['pos'] ? 'Hide password' : 'Show password'}
                  >
                    {revealedSystemPasswords['pos'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Global gate password for billing desks</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Status & Last Updated
                </span>
                <div className="flex items-center gap-1.5 font-bold text-sm text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Active & Enforced</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {systemCreds.pos.updatedAt
                    ? `Last changed: ${new Date(systemCreds.pos.updatedAt).toLocaleDateString()} at ${new Date(systemCreds.pos.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Running with initial default credentials'}
                </p>
              </div>
            </div>
          </div>

          {/* Section Subheader for Cashiers & PINs */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
                Outlet Counter Cashiers & Quick Station PINs
              </h3>
              <p className="text-xs text-slate-500">
                Individual cashier profiles, assigned shifts, and 4-digit station switch PINs.
              </p>
            </div>
            <button
              onClick={() => handleOpenAddModal()}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Counter Station</span>
            </button>
          </div>

          {filteredStores.map((store) => (
            <div
              key={store.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
            >
              {/* Store Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                        {store.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        24x7 Outlet
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{store.area} • {store.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAddModal(store.id)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add Counter to {store.shortName}</span>
                  </button>
                </div>
              </div>

              {/* Counters / Salespersons Grid */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {store.counters.map((counter) => {
                  const pinKey = `${store.id}-${counter.id}`;
                  const isRevealed = revealedPins[pinKey] || false;

                  return (
                    <div
                      key={counter.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-xs flex flex-col justify-between space-y-3"
                    >
                      <div>
                        {/* Top Counter & Status Badge */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-extrabold text-xs border border-slate-200">
                            Counter #{counter.id}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Active on Duty</span>
                          </span>
                        </div>

                        {/* Cashier Name & Role */}
                        <h4 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                          <span>{counter.cashierName}</span>
                          <span className="text-[11px] text-slate-500 font-normal">(Cashier in charge)</span>
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium">{counter.name}</p>

                        {/* Shift & Phone */}
                        <div className="mt-3 space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span className="truncate">{counter.shift}</span>
                          </div>
                          {counter.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{counter.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* POS Login PIN Display & Quick Change */}
                        <div className="mt-3 p-2.5 rounded-lg bg-amber-50/50 border border-amber-200/80 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] uppercase font-extrabold text-amber-900 block tracking-wider">
                              POS Login PIN
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-sm font-black text-slate-900 tracking-widest">
                                {isRevealed ? counter.defaultPin : '••••'}
                              </span>
                              <button
                                onClick={() => togglePinReveal(pinKey)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                                title={isRevealed ? 'Hide PIN' : 'Reveal PIN'}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={() => handleOpenPinChange(store.id, store.name, counter)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <KeyRound className="w-3 h-3 text-amber-600" />
                            <span>Change PIN</span>
                          </button>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditCounter(store.id, store.name, counter)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Edit Cashier Info"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCounter(store.id, counter.id, counter.cashierName)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Remove Counter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {onLaunchPOSAs && (
                          <button
                            onClick={() =>
                              onLaunchPOSAs({
                                storeId: store.id,
                                storeName: store.name,
                                counterNumber: counter.id,
                                counterName: counter.name,
                                cashierName: counter.cashierName,
                                shift: counter.shift,
                              })
                            }
                            className="px-3 py-1.5 bg-[#1E293B] hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <span>Launch POS</span>
                            <ArrowRight className="w-3 h-3 text-amber-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ADD STORE ADMIN CREDENTIAL */}
      {/* ================================================================= */}
      {isAddAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Create Store Admin Login</h3>
              </div>
              <button
                onClick={() => setIsAddAdminModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStoreAdmin} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-700 font-bold">Select Assigned Store Outlet *</label>
                <select
                  value={newAdminStoreId}
                  onChange={(e) => setNewAdminStoreId(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400 font-medium"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.area})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold">Store Admin Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Shah"
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold">Login Username *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin_bopal"
                    value={newAdminUsername}
                    onChange={(e) => setNewAdminUsername(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold">Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter password"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold">Role Title / Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Store Branch Manager"
                  value={newAdminRoleTitle}
                  onChange={(e) => setNewAdminRoleTitle(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 98250 11201"
                    value={newAdminPhone}
                    onChange={(e) => setNewAdminPhone(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold">Email Address</label>
                  <input
                    type="email"
                    placeholder="manager@richierich.in"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAdminModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Create Store Admin Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: EDIT STORE ADMIN CREDENTIAL */}
      {/* ================================================================= */}
      {editingStoreAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                Edit Store Admin: {editingStoreAdmin.name}
              </h3>
              <button
                onClick={() => setEditingStoreAdmin(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditAdmin} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-700 font-bold">Assigned Store Outlet *</label>
                <select
                  value={editAdminStoreId}
                  onChange={(e) => setEditAdminStoreId(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400 font-medium"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.area})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editAdminName}
                  onChange={(e) => setEditAdminName(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold">Username *</label>
                  <input
                    type="text"
                    required
                    value={editAdminUsername}
                    onChange={(e) => setEditAdminUsername(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold">Password *</label>
                  <input
                    type="text"
                    required
                    value={editAdminPassword}
                    onChange={(e) => setEditAdminPassword(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-hidden focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold">Role Title</label>
                <input
                  type="text"
                  value={editAdminRoleTitle}
                  onChange={(e) => setEditAdminRoleTitle(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold">Phone Number</label>
                  <input
                    type="tel"
                    value={editAdminPhone}
                    onChange={(e) => setEditAdminPhone(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold">Email Address</label>
                  <input
                    type="email"
                    value={editAdminEmail}
                    onChange={(e) => setEditAdminEmail(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="adminIsActive"
                  checked={editAdminIsActive}
                  onChange={(e) => setEditAdminIsActive(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300"
                />
                <label htmlFor="adminIsActive" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Account Active & Enabled for Store Admin Portal Login
                </label>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStoreAdmin(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: ADD COUNTER */}
      {/* ================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">Add New Salesperson & Counter</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCounter} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-700 font-bold">Select Store Outlet</label>
                <select
                  value={targetStoreForAdd}
                  onChange={(e) => setTargetStoreForAdd(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold">Salesperson / Cashier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newCashierName}
                  onChange={(e) => setNewCashierName(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold">Counter Station Title</label>
                <input
                  type="text"
                  placeholder="e.g. Front Cash Counter / Paan Bar Counter"
                  value={newCounterName}
                  onChange={(e) => setNewCounterName(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold">Assigned Shift</label>
                  <select
                    value={newShift}
                    onChange={(e) => setNewShift(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400"
                  >
                    <option value="24x7 Active (Day Shift)">Day Shift</option>
                    <option value="24x7 Active (Evening Shift)">Evening Shift</option>
                    <option value="24x7 Active (Night Owl Shift)">Night Owl Shift</option>
                    <option value="24x7 Active (Round-the-Clock)">Round-the-Clock</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-bold">Login PIN (4 Digits) *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="1234"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-hidden focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="+91 98980 12345"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Add Salesperson & Counter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: CHANGE POS PIN */}
      {/* ================================================================= */}
      {pinChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Change POS PIN: Counter #{pinChangeModal.counter.id}
                </h3>
              </div>
              <button
                onClick={() => setPinChangeModal(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePin} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="text-slate-500">Cashier on Duty:</div>
                <div className="font-bold text-slate-900 text-sm">
                  {pinChangeModal.counter.cashierName}
                </div>
                <div className="text-[11px] text-slate-500">{pinChangeModal.storeName}</div>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">
                  Enter New POS PIN (3-6 Digits) *
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  maxLength={6}
                  placeholder="Enter new numeric PIN"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-black tracking-widest text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                />
              </div>

              {pinSuccessMsg && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{pinSuccessMsg}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPinChangeModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Update PIN Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: EDIT COUNTER DETAILS */}
      {/* ================================================================= */}
      {editingCounter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                Edit Salesperson: {editingCounter.counter.cashierName}
              </h3>
              <button
                onClick={() => setEditingCounter(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-700 font-bold">Salesperson / Cashier Name *</label>
                <input
                  type="text"
                  required
                  value={editCashierName}
                  onChange={(e) => setEditCashierName(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold">Counter Station Title</label>
                <input
                  type="text"
                  value={editCounterName}
                  onChange={(e) => setEditCounterName(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold">Assigned Shift</label>
                <select
                  value={editShift}
                  onChange={(e) => setEditShift(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400"
                >
                  <option value="24x7 Active (Day Shift)">Day Shift</option>
                  <option value="24x7 Active (Evening Shift)">Evening Shift</option>
                  <option value="24x7 Active (Night Owl Shift)">Night Owl Shift</option>
                  <option value="24x7 Active (Round-the-Clock)">Round-the-Clock</option>
                  <option value="Weekend Special Shift">Weekend Special Shift</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold">Phone Number / Staff Contact</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCounter(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: UNIFIED ADD LOGIN ID & PASSWORD */}
      {/* Options: Warehouse, Master admin, Store Admin, POS */}
      {/* ================================================================= */}
      {isAddLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl my-8">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    Add Login ID & Password
                  </h3>
                  <p className="text-xs text-slate-300">
                    Create credentials and assign access for Warehouse, Master admin, Store Admin, or POS
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddLoginModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAddLogin} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Option Selector: Warehouse, Master admin, Store Admin, POS */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-2">
                  1. Select Role / Access Option *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* OPTION: Warehouse */}
                  <button
                    type="button"
                    onClick={() => {
                      setAddLoginRole('warehouse');
                      setAddLoginUserId(`WH_${Math.floor(100 + Math.random() * 900)}`);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      addLoginRole === 'warehouse'
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Boxes className={`w-4 h-4 ${addLoginRole === 'warehouse' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold">Warehouse</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">/warehouse</span>
                  </button>

                  {/* OPTION: Master admin */}
                  <button
                    type="button"
                    onClick={() => {
                      setAddLoginRole('admin');
                      setAddLoginUserId(`ADM_${Math.floor(100 + Math.random() * 900)}`);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      addLoginRole === 'admin'
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Shield className={`w-4 h-4 ${addLoginRole === 'admin' ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold">Master admin</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">/admin</span>
                  </button>

                  {/* OPTION: Store Admin */}
                  <button
                    type="button"
                    onClick={() => {
                      setAddLoginRole('store_admin');
                      setAddLoginUserId(`admin_${selectedStoreId !== 'all' ? selectedStoreId : 'bopal'}_${Math.floor(10 + Math.random() * 90)}`);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      addLoginRole === 'store_admin'
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/20 text-amber-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Building2 className={`w-4 h-4 ${addLoginRole === 'store_admin' ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold">Store Admin</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">/store-admin</span>
                  </button>

                  {/* OPTION: POS */}
                  <button
                    type="button"
                    onClick={() => {
                      setAddLoginRole('pos');
                      setAddLoginUserId(`POS_CASHIER_${Math.floor(1 + Math.random() * 9)}`);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      addLoginRole === 'pos'
                        ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <CreditCard className={`w-4 h-4 ${addLoginRole === 'pos' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold">POS</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">/pos & PINs</span>
                  </button>
                </div>
              </div>

              {/* Login Credentials: User ID & Password */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                  2. Authentication Credentials
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs text-slate-700 font-bold flex items-center justify-between">
                      <span>Login User ID / Username *</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={addLoginUserId}
                      onChange={(e) => setAddLoginUserId(e.target.value)}
                      placeholder={
                        addLoginRole === 'warehouse'
                          ? 'e.g. WH_MANAGER'
                          : addLoginRole === 'admin'
                          ? 'e.g. ADMIN_EXEC'
                          : addLoginRole === 'store_admin'
                          ? 'e.g. admin_bopal'
                          : 'e.g. POS_COUNTER_1'
                      }
                      className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-amber-500"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Required to sign into the selected portal</p>
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 font-bold">Full Staff / User Name *</label>
                    <input
                      type="text"
                      required
                      value={addLoginName}
                      onChange={(e) => setAddLoginName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-amber-500 font-medium"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Display name on rosters and receipts</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-700 font-bold">Password *</label>
                      <button
                        type="button"
                        onClick={() => setShowModalPass(!showModalPass)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
                      >
                        {showModalPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showModalPass ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showModalPass ? 'text' : 'password'}
                      required
                      value={addLoginPassword}
                      onChange={(e) => setAddLoginPassword(e.target.value)}
                      placeholder="Enter minimum 3 characters"
                      className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-slate-700 font-bold">Confirm Password *</label>
                      <button
                        type="button"
                        onClick={() => setShowModalConfirmPass(!showModalConfirmPass)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
                      >
                        {showModalConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showModalConfirmPass ? 'Hide' : 'Show'}</span>
                      </button>
                    </div>
                    <input
                      type={showModalConfirmPass ? 'text' : 'password'}
                      required
                      value={addLoginConfirmPassword}
                      onChange={(e) => setAddLoginConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Role-Specific Fields */}
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                  3. Role & Branch Assignment
                </span>

                {/* STORE ADMIN OR POS: Store Outlet selector */}
                {(addLoginRole === 'store_admin' || addLoginRole === 'pos') && (
                  <div>
                    <label className="text-xs text-slate-700 font-bold">Assigned Store Outlet *</label>
                    <select
                      value={addLoginStoreId}
                      onChange={(e) => setAddLoginStoreId(e.target.value)}
                      className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold focus:outline-hidden focus:border-amber-500"
                    >
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.area})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* WAREHOUSE: Sub-role selector */}
                {addLoginRole === 'warehouse' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs text-slate-700 font-bold">Warehouse Sub-Role *</label>
                      <select
                        value={addLoginSubRole}
                        onChange={(e) => setAddLoginSubRole(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-semibold focus:outline-hidden focus:border-amber-500"
                      >
                        <option value="warehouse_manager">Warehouse Manager (Inward & Dispatches)</option>
                        <option value="inward_supervisor">Inward Supervisor (GRN & Bills)</option>
                        <option value="store_manager">Store Manager (Indents & Stock)</option>
                        <option value="purchase_manager">Purchase Manager (POs & Suppliers)</option>
                        <option value="accountant">Accountant (Supplier Ledgers)</option>
                        <option value="admin">Admin (Full Warehouse Access)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-700 font-bold">Phone Number</label>
                      <input
                        type="tel"
                        value={addLoginPhone}
                        onChange={(e) => setAddLoginPhone(e.target.value)}
                        placeholder="+91 98250 88701"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* MASTER ADMIN: Role Title */}
                {addLoginRole === 'admin' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs text-slate-700 font-bold">Executive Designation / Title</label>
                      <input
                        type="text"
                        value={addLoginRoleTitle}
                        onChange={(e) => setAddLoginRoleTitle(e.target.value)}
                        placeholder="e.g. Managing Director / Operations Head"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-700 font-bold">Phone Number</label>
                      <input
                        type="tel"
                        value={addLoginPhone}
                        onChange={(e) => setAddLoginPhone(e.target.value)}
                        placeholder="+91 98250 99001"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* STORE ADMIN: Role title & Phone */}
                {addLoginRole === 'store_admin' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-xs text-slate-700 font-bold">Store Role Title</label>
                      <input
                        type="text"
                        value={addLoginRoleTitle}
                        onChange={(e) => setAddLoginRoleTitle(e.target.value)}
                        placeholder="e.g. Store Branch Manager"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-700 font-bold">Phone Number</label>
                      <input
                        type="tel"
                        value={addLoginPhone}
                        onChange={(e) => setAddLoginPhone(e.target.value)}
                        placeholder="+91 98250 11201"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* POS: Counter Title, Shift & Quick PIN */}
                {addLoginRole === 'pos' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-700 font-bold">Counter Title</label>
                      <input
                        type="text"
                        value={addLoginRoleTitle}
                        onChange={(e) => setAddLoginRoleTitle(e.target.value)}
                        placeholder="e.g. Main Cash Desk"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-700 font-bold">Assigned Shift</label>
                      <select
                        value={addLoginShift}
                        onChange={(e) => setAddLoginShift(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-amber-500"
                      >
                        <option value="24x7 Active (Day Shift)">Day Shift</option>
                        <option value="24x7 Active (Evening Shift)">Evening Shift</option>
                        <option value="24x7 Active (Night Owl Shift)">Night Owl Shift</option>
                        <option value="24x7 Active (Round-the-Clock)">Round-the-Clock</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-700 font-bold">4-Digit Switch PIN *</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={addLoginPin}
                        onChange={(e) => setAddLoginPin(e.target.value)}
                        placeholder="1234"
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-black focus:outline-hidden focus:border-amber-500 text-center tracking-widest"
                      />
                    </div>
                  </div>
                )}

                {/* Option to also update primary gate login */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <input
                      type="checkbox"
                      checked={addLoginUpdatePrimary}
                      onChange={(e) => setAddLoginUpdatePrimary(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 font-medium">
                      Also set these credentials as the <strong>primary master login</strong> for{' '}
                      {addLoginRole === 'warehouse'
                        ? 'Warehouse (/warehouse)'
                        : addLoginRole === 'admin'
                        ? 'Master Admin (/admin)'
                        : addLoginRole === 'pos'
                        ? 'Master POS Gate (/pos)'
                        : 'Store Outlet'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Status / Error Message */}
              {addLoginMsg && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    addLoginMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {addLoginMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{addLoginMsg.text}</span>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddLoginModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Create & Save Login Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: EDIT MASTER ADMIN CREDENTIALS */}
      {/* ================================================================= */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Change Master Admin Credentials</h3>
                  <p className="text-[11px] text-slate-400">Executive access at /admin</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminModalOpen(false)}
                className="text-slate-400 hover:text-white text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdminCreds} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">
                  Admin Login User ID *
                </label>
                <input
                  type="text"
                  required
                  value={adminUserIdInput}
                  onChange={(e) => setAdminUserIdInput(e.target.value)}
                  placeholder="ADMIN"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">
                  New Admin Password *
                </label>
                <input
                  type="password"
                  required
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={adminPasswordConfirm}
                  onChange={(e) => setAdminPasswordConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500"
                />
              </div>

              {adminModalMsg && (
                <div
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    adminModalMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {adminModalMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{adminModalMsg.text}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Update Admin Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: EDIT WAREHOUSE CREDENTIALS */}
      {/* ================================================================= */}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Change Warehouse Login Credentials</h3>
                  <p className="text-[11px] text-slate-400">Supply chain access at /warehouse</p>
                </div>
              </div>
              <button
                onClick={() => setIsWarehouseModalOpen(false)}
                className="text-slate-400 hover:text-white text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveWarehouseCreds} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">
                  Warehouse User ID *
                </label>
                <input
                  type="text"
                  required
                  value={warehouseUserIdInput}
                  onChange={(e) => setWarehouseUserIdInput(e.target.value)}
                  placeholder="ADMIN"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">
                  New Warehouse Password *
                </label>
                <input
                  type="password"
                  required
                  value={warehousePasswordInput}
                  onChange={(e) => setWarehousePasswordInput(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={warehousePasswordConfirm}
                  onChange={(e) => setWarehousePasswordConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              {warehouseModalMsg && (
                <div
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    warehouseModalMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {warehouseModalMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{warehouseModalMsg.text}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Update Warehouse Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: EDIT MASTER POS CREDENTIALS */}
      {/* ================================================================= */}
      {isPOSMasterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Change Master POS Password</h3>
                  <p className="text-[11px] text-slate-400">Terminal entry gate at /pos</p>
                </div>
              </div>
              <button
                onClick={() => setIsPOSMasterModalOpen(false)}
                className="text-slate-400 hover:text-white text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePOSMasterCreds} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">
                  POS Gate User ID *
                </label>
                <input
                  type="text"
                  required
                  value={posUserIdInput}
                  onChange={(e) => setPosUserIdInput(e.target.value)}
                  placeholder="ADMIN"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">
                  New Master POS Password *
                </label>
                <input
                  type="password"
                  required
                  value={posPasswordInput}
                  onChange={(e) => setPosPasswordInput(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold block mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={posPasswordConfirm}
                  onChange={(e) => setPosPasswordConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-emerald-500"
                />
              </div>

              {posModalMsg && (
                <div
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    posModalMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {posModalMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{posModalMsg.text}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPOSMasterModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                >
                  Update POS Gate Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
