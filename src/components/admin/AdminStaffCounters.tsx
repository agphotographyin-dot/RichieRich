import React, { useState } from 'react';
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
} from 'lucide-react';
import { StoreLocation, CounterInfo, POSSession } from '../../types';
import { storage } from '../../services/storage';
import { soundEffects } from '../../services/audio';

interface AdminStaffCountersProps {
  onLaunchPOSAs?: (session: POSSession) => void;
}

export const AdminStaffCounters: React.FC<AdminStaffCountersProps> = ({ onLaunchPOSAs }) => {
  const [stores, setStores] = useState<StoreLocation[]>(() => storage.getStores());
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // Modals state
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

  const refreshStores = () => {
    setStores(storage.getStores());
  };

  const togglePinReveal = (uniqueKey: string) => {
    setRevealedPins((prev) => ({
      ...prev,
      [uniqueKey]: !prev[uniqueKey],
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
    refreshStores();
    setIsAddModalOpen(false);
  };

  const handleOpenChangePinModal = (storeId: string, storeName: string, counter: CounterInfo) => {
    setPinChangeModal({ storeId, storeName, counter });
    setNewPinInput('');
    setPinSuccessMsg(null);
  };

  const handleSaveChangedPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinChangeModal || !newPinInput.trim()) return;

    if (newPinInput.trim().length < 4) {
      alert('PIN must be at least 4 digits.');
      return;
    }

    storage.changeCounterPin(pinChangeModal.storeId, pinChangeModal.counter.id, newPinInput.trim());
    soundEffects.playSuccessChime();
    setPinSuccessMsg(`PIN successfully updated to ${newPinInput.trim()}`);
    refreshStores();

    setTimeout(() => {
      setPinChangeModal(null);
      setPinSuccessMsg(null);
    }, 1000);
  };

  const handleOpenEditModal = (storeId: string, storeName: string, counter: CounterInfo) => {
    setEditingCounter({ storeId, storeName, counter });
    setEditCashierName(counter.cashierName);
    setEditCounterName(counter.name);
    setEditShift(counter.shift);
    setEditPhone(counter.phone || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCounter || !editCashierName.trim()) return;

    storage.updateCounter(editingCounter.storeId, editingCounter.counter.id, {
      cashierName: editCashierName.trim(),
      name: editCounterName.trim() || editingCounter.counter.name,
      shift: editShift,
      phone: editPhone.trim(),
    });

    soundEffects.playSuccessChime();
    refreshStores();
    setEditingCounter(null);
  };

  const handleDeleteCounter = (storeId: string, counter: CounterInfo, storeName: string) => {
    if (
      window.confirm(
        `Are you sure you want to remove salesperson "${counter.cashierName}" from ${storeName} (Counter ${counter.id})?`
      )
    ) {
      const ok = storage.deleteCounter(storeId, counter.id);
      if (ok) {
        soundEffects.playWarningChime();
        refreshStores();
      }
    }
  };

  const handleLaunchTerminal = (store: StoreLocation, counter: CounterInfo) => {
    const session: POSSession = {
      storeId: store.id,
      storeName: store.name,
      counterNumber: counter.id,
      counterName: counter.name,
      cashierName: counter.cashierName,
      shift: counter.shift,
      loggedInAt: new Date().toISOString(),
    };
    storage.setActivePOSSession(session);
    if (onLaunchPOSAs) {
      onLaunchPOSAs(session);
    }
  };

  const filteredStores =
    selectedStoreId === 'all' ? stores : stores.filter((s) => s.id === selectedStoreId);

  const totalCountersCount = stores.reduce((sum, s) => sum + s.counters.length, 0);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1E293B] text-amber-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Staff, Salespersons & POS PIN Management
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold">
                  {totalCountersCount} Active Staff Counters
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Add, change, or remove salespersons and update Point of Sale login PINs for cashiers in charge.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Salesperson & Counter</span>
          </button>
        </div>
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

      {/* Store Outlet Sections with Staff Cards */}
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
                          onClick={() => handleOpenChangePinModal(store.id, store.name, counter)}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <KeyRound className="w-3 h-3 text-amber-700" />
                          <span>Change PIN</span>
                        </button>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(store.id, store.name, counter)}
                          title="Edit Salesperson details"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer border border-slate-200 flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-slate-600" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteCounter(store.id, counter, store.shortName)}
                          title="Remove Salesperson"
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold cursor-pointer border border-red-200 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                      {onLaunchPOSAs && (
                        <button
                          onClick={() => handleLaunchTerminal(store, counter)}
                          className="px-2.5 py-1 bg-[#1E293B] hover:bg-slate-900 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Log in to POS immediately as this cashier"
                        >
                          <span>Launch POS</span>
                          <ArrowRight className="w-3 h-3" />
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

      {/* ================================================================= */}
      {/* MODAL 1: ADD NEW SALESPERSON & COUNTER */}
      {/* ================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Add New Salesperson & Counter</h3>
                  <p className="text-xs text-slate-500">Create login credentials and station assignment</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCounter} className="p-5 space-y-4">
              <div>
                <label className="text-xs text-slate-700 font-bold">Store Outlet Branch</label>
                <select
                  value={targetStoreForAdd}
                  onChange={(e) => setTargetStoreForAdd(e.target.value)}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400"
                >
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.shortName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold">Salesperson / Cashier Name *</label>
                <input
                  type="text"
                  required
                  value={newCashierName}
                  onChange={(e) => setNewCashierName(e.target.value)}
                  placeholder="e.g. Suresh Varma"
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold">Counter Title / Station</label>
                <input
                  type="text"
                  value={newCounterName}
                  onChange={(e) => setNewCounterName(e.target.value)}
                  placeholder="e.g. Counter 3 (Royal Paan & Shakes)"
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 font-bold">Assigned Shift</label>
                  <select
                    value={newShift}
                    onChange={(e) => setNewShift(e.target.value)}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400"
                  >
                    <option value="24x7 Active (Day Shift)">24x7 Active (Day Shift)</option>
                    <option value="24x7 Active (Evening Shift)">24x7 Active (Evening Shift)</option>
                    <option value="24x7 Active (Night Owl Shift)">24x7 Active (Night Owl Shift)</option>
                    <option value="24x7 Active (Round-the-Clock)">24x7 Active (Round-the-Clock)</option>
                    <option value="Weekend Special Shift">Weekend Special Shift</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-700 font-bold">POS Login PIN *</label>
                    <button
                      type="button"
                      onClick={() => setNewPin(Math.floor(1000 + Math.random() * 9000).toString())}
                      className="text-[10px] text-amber-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> Randomize
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="4-digit PIN e.g. 5001"
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono font-bold tracking-widest focus:outline-hidden focus:bg-white focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-700 font-bold">Staff Phone / Contact (Optional)</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. +91 98250 99881"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Salesperson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: CHANGE POS LOGIN PIN */}
      {/* ================================================================= */}
      {pinChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">Change POS Login PIN</h3>
                  <p className="text-[11px] text-slate-600">Update security PIN for Point of Sale login</p>
                </div>
              </div>
              <button
                onClick={() => setPinChangeModal(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveChangedPin} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <p className="text-slate-500">
                  Outlet: <strong className="text-slate-800">{pinChangeModal.storeName}</strong>
                </p>
                <p className="text-slate-500">
                  Cashier: <strong className="text-slate-800">{pinChangeModal.counter.cashierName}</strong>
                </p>
                <p className="text-slate-500">
                  Counter: <strong className="text-slate-800">Counter #{pinChangeModal.counter.id}</strong>
                </p>
                <p className="text-slate-500">
                  Current PIN: <code className="text-amber-800 font-mono font-bold">{pinChangeModal.counter.defaultPin}</code>
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-700 font-bold">New POS Login PIN *</label>
                  <button
                    type="button"
                    onClick={() => setNewPinInput(Math.floor(1000 + Math.random() * 9000).toString())}
                    className="text-[10px] text-amber-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> Generate 4-digit PIN
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4-6 digit numeric PIN"
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-center text-lg font-mono font-black tracking-widest text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
                />
              </div>

              {/* Quick Keypad Helper */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (k === 'C') setNewPinInput('');
                      else if (k === '⌫') setNewPinInput((prev) => prev.slice(0, -1));
                      else if (newPinInput.length < 6) setNewPinInput((prev) => prev + k);
                    }}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-mono font-bold text-slate-800 transition-colors cursor-pointer border border-slate-200 text-center"
                  >
                    {k}
                  </button>
                ))}
              </div>

              {pinSuccessMsg && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{pinSuccessMsg}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPinChangeModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Save New PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: EDIT SALESPERSON & COUNTER DETAILS */}
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
                  <option value="24x7 Active (Day Shift)">24x7 Active (Day Shift)</option>
                  <option value="24x7 Active (Evening Shift)">24x7 Active (Evening Shift)</option>
                  <option value="24x7 Active (Night Owl Shift)">24x7 Active (Night Owl Shift)</option>
                  <option value="24x7 Active (Round-the-Clock)">24x7 Active (Round-the-Clock)</option>
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
