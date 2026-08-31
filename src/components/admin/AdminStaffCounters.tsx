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
} from 'lucide-react';
import { StoreLocation, CounterInfo, POSSession, StoreAdminCredential } from '../../types';
import { storage } from '../../services/storage';
import { soundEffects } from '../../services/audio';

interface AdminStaffCountersProps {
  onLaunchPOSAs?: (session: POSSession) => void;
  onNavigateToStoreAdmin?: (storeId: string) => void;
}

export const AdminStaffCounters: React.FC<AdminStaffCountersProps> = ({
  onLaunchPOSAs,
  onNavigateToStoreAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'store_admins' | 'counters'>('store_admins');
  const [stores, setStores] = useState<StoreLocation[]>(() => storage.getStores());
  const [storeAdmins, setStoreAdmins] = useState<StoreAdminCredential[]>(() => storage.getStoreAdmins());
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});
  const [revealedAdminPasswords, setRevealedAdminPasswords] = useState<Record<string, boolean>>({});

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
                {storeAdmins.length} Store Admins • {totalCountersCount} POS Stations
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage Store Admin portal login credentials, store assignments, salespersons, and POS checkout PINs across all outlets.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'store_admins' ? (
            <button
              onClick={handleOpenAddAdminModal}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Store Admin Account</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Salesperson & Counter</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Section Navigation Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Store Admin Credentials</span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                  activeTab === 'store_admins' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {storeAdmins.length} Outlets
              </span>
            </div>
            <p className={`text-xs mt-1 ${activeTab === 'store_admins' ? 'text-slate-300' : 'text-slate-500'}`}>
              Store login credentials, passwords, manager profile & expense authorization
            </p>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('counters')}
          className={`p-4 rounded-xl border transition-all text-left flex items-start gap-3.5 cursor-pointer ${
            activeTab === 'counters'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/50'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              activeTab === 'counters' ? 'bg-emerald-500 text-white font-bold' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Counter Cashiers & POS PINs</span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                  activeTab === 'counters' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {totalCountersCount} Stations
              </span>
            </div>
            <p className={`text-xs mt-1 ${activeTab === 'counters' ? 'text-slate-300' : 'text-slate-500'}`}>
              Counter cashiers, shifts, phone numbers, and quick POS login PINs
            </p>
          </div>
        </button>
      </div>

      {/* Outlet Selection Filter Tabs */}
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
              {store.counters.length} Staff
            </span>
          </button>
        ))}
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: STORE ADMIN CREDENTIALS & ACCESS */}
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
      {/* SECTION 2: COUNTER SALESPERSONS & POS PINS */}
      {/* ===================================================================== */}
      {activeTab === 'counters' && (
        <div className="space-y-6">
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
                    placeholder="e.g. RRbopal"
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
    </div>
  );
};
