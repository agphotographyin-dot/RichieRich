import React, { useState, useMemo } from 'react';
import {
  X,
  Package,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Building2,
  Tag,
  Barcode,
  Layers,
  Sparkles,
  Truck,
  FileText,
  Clock,
  Check,
  ChevronRight,
  Boxes,
  ArrowDownToLine,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { InventoryItem, StoreLocation } from '../../types';
import { StoreStockIndent, StockTransfer, StockMovementAudit, MovementType } from '../../types/warehouse';
import { CURRENCY, storage } from '../../services/storage';
import { warehouseStorage } from '../../services/warehouseStorage';
import { soundEffects } from '../../services/audio';

interface StoreManageStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  currentStore: StoreLocation;
  performedBy?: string;
  initialTab?: 'add_stock' | 'purchase_orders' | 'transfers' | 'overview';
  onSuccess?: () => void;
}

export const StoreManageStockModal: React.FC<StoreManageStockModalProps> = ({
  isOpen,
  onClose,
  inventory,
  currentStore,
  performedBy = 'Store Admin',
  initialTab = 'add_stock',
  onSuccess,
}) => {
  const storeId = currentStore.id;
  const storeName = currentStore.name;

  // Active top navigation tab
  const [activeTab, setActiveTab] = useState<'add_stock' | 'purchase_orders' | 'transfers' | 'overview'>(initialTab);

  // ---------------------------------------------------------------------------
  // TAB 1: ADD / MANAGE STOCK (Search existing SKU, update stock, never duplicate)
  // ---------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [mode, setMode] = useState<'add' | 'set' | 'deduct'>('add');
  const [quantityInput, setQuantityInput] = useState<string>('10');
  const [loosePiecesInput, setLoosePiecesInput] = useState<string>('0');
  const [reasonPreset, setReasonPreset] = useState<string>('Direct Store Inward / Supplier Delivery');
  const [customNote, setCustomNote] = useState<string>('');
  const [isSubmittingStock, setIsSubmittingStock] = useState<boolean>(false);
  const [stockSuccessFeedback, setStockSuccessFeedback] = useState<string>('');

  // ---------------------------------------------------------------------------
  // TAB 2: DIRECT PURCHASE ORDER FROM STORE
  // ---------------------------------------------------------------------------
  const [poSearchQuery, setPoSearchQuery] = useState('');
  const [poSelectedItems, setPoSelectedItems] = useState<
    Array<{
      item: InventoryItem;
      requestedQty: number;
    }>
  >([]);
  const [poUrgency, setPoUrgency] = useState<'routine' | 'urgent_low_stock' | 'emergency_event'>('routine');
  const [poNotes, setPoNotes] = useState('');
  const [isSubmittingPO, setIsSubmittingPO] = useState(false);
  const [poSuccessMessage, setPoSuccessMessage] = useState('');

  // ---------------------------------------------------------------------------
  // TAB 3: TRANSFERS & RECEIVING
  // ---------------------------------------------------------------------------
  const [receivingTransferId, setReceivingTransferId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // TAB 4: OVERVIEW SEARCH & FILTER
  // ---------------------------------------------------------------------------
  const [overviewSearch, setOverviewSearch] = useState('');
  const [overviewCategory, setOverviewCategory] = useState('all');

  // Search results for Tab 1
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return inventory.slice(0, 10);
    }
    const q = searchQuery.toLowerCase().trim();
    return inventory
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.sku && item.sku.toLowerCase().includes(q)) ||
          (item.barcode && item.barcode.includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q))
      )
      .slice(0, 15);
  }, [inventory, searchQuery]);

  // Selected item for Tab 1
  const selectedItem = useMemo(() => {
    if (selectedItemId) {
      return inventory.find((i) => i.id === selectedItemId) || null;
    }
    return null;
  }, [inventory, selectedItemId]);

  // Stock details for selected item
  const ppb = Math.max(1, selectedItem?.piecesPerBox && selectedItem.piecesPerBox > 1 ? selectedItem.piecesPerBox : 1);
  const isLooseItem = Boolean(
    selectedItem &&
      (selectedItem.sellAsLoose ||
        selectedItem.loosePrice ||
        (selectedItem.piecesPerBox && selectedItem.piecesPerBox > 1))
  );

  const currentStoreBoxes = selectedItem ? selectedItem.storeAllocations?.[storeId] ?? 0 : 0;
  const currentStoreLoose = selectedItem ? selectedItem.storeBoxAllocations?.[storeId]?.loosePieces ?? 0 : 0;
  const currentTotalPieces = currentStoreBoxes * ppb + currentStoreLoose;
  const centralStock = selectedItem?.stockQuantity ?? 0;

  const parsedQty = Math.max(0, parseInt(quantityInput) || 0);
  const parsedLoose = Math.max(0, parseInt(loosePiecesInput) || 0);

  // Calculate projected new balance
  let projectedBoxes = currentStoreBoxes;
  let projectedLoose = currentStoreLoose;
  let projectedTotalPieces = currentTotalPieces;

  if (selectedItem) {
    if (mode === 'add') {
      projectedTotalPieces = currentTotalPieces + parsedQty * ppb + parsedLoose;
      projectedBoxes = Math.floor(projectedTotalPieces / ppb);
      projectedLoose = projectedTotalPieces % ppb;
    } else if (mode === 'deduct') {
      projectedTotalPieces = Math.max(0, currentTotalPieces - (parsedQty * ppb + parsedLoose));
      projectedBoxes = Math.floor(projectedTotalPieces / ppb);
      projectedLoose = projectedTotalPieces % ppb;
    } else {
      projectedBoxes = parsedQty;
      projectedLoose = parsedLoose;
      projectedTotalPieces = parsedQty * ppb + parsedLoose;
    }
  }

  const pieceChange = projectedTotalPieces - currentTotalPieces;

  // Recent movement history for selected SKU
  const itemMovementHistory = useMemo(() => {
    if (!selectedItem) return [];
    return warehouseStorage
      .getAuditTrail()
      .filter((a) => a.itemId === selectedItem.id || a.sku === selectedItem.sku)
      .slice(0, 8);
  }, [selectedItem]);

  // Store Purchase Orders (Indents)
  const storeIndents = useMemo(() => {
    return warehouseStorage.getStoreIndents().filter((ind) => ind.storeId === storeId);
  }, [storeId, poSuccessMessage]);

  // Incoming stock transfers for this store
  const incomingTransfers = useMemo(() => {
    return warehouseStorage
      .getStockTransfers()
      .filter((t) => t.destinationId === storeId && (t.status === 'dispatched_in_transit' || t.status === 'approved'));
  }, [storeId]);

  // Warehouses list for PO target
  const warehouses = useMemo(() => warehouseStorage.getWarehouses(), []);

  // Filtered Overview Items
  const filteredOverviewItems = useMemo(() => {
    return inventory.filter((item) => {
      const matchSearch =
        overviewSearch === '' ||
        item.name.toLowerCase().includes(overviewSearch.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(overviewSearch.toLowerCase())) ||
        (item.barcode && item.barcode.includes(overviewSearch));
      const matchCat = overviewCategory === 'all' || item.category === overviewCategory;
      return matchSearch && matchCat;
    });
  }, [inventory, overviewSearch, overviewCategory]);

  // Handlers for Tab 1: Add Stock
  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItemId(item.id);
    setSearchQuery('');
    setStockSuccessFeedback('');
  };

  const handleUpdateStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingStock || !selectedItem) return;

    if (mode !== 'set' && parsedQty === 0 && parsedLoose === 0) {
      alert('Please enter a valid quantity of units/boxes.');
      return;
    }

    setIsSubmittingStock(true);
    const finalReason = customNote.trim() ? `${reasonPreset}: ${customNote.trim()}` : reasonPreset;

    const movementType: MovementType =
      mode === 'deduct' ? 'damage_scrap' : 'physical_adjustment';

    const success = warehouseStorage.adjustStoreStock(
      selectedItem.id,
      storeId,
      mode === 'add' ? parsedQty : mode === 'deduct' ? -parsedQty : projectedBoxes,
      finalReason,
      performedBy,
      {
        loosePieces: mode === 'add' ? parsedLoose : mode === 'deduct' ? -parsedLoose : projectedLoose,
        isDeltaAdd: mode === 'add' || mode === 'deduct',
        movementType,
      }
    );

    setIsSubmittingStock(false);

    if (success) {
      soundEffects.playSuccessChime();
      setStockSuccessFeedback(
        `Successfully updated ${selectedItem.name}! New Store Stock: ${projectedBoxes} ${selectedItem.unit || 'units'}${
          projectedLoose > 0 ? ` + ${projectedLoose} loose pcs` : ''
        }`
      );
      setQuantityInput('0');
      setLoosePiecesInput('0');
      setCustomNote('');
      onSuccess?.();
    } else {
      soundEffects.playWarningChime();
      alert('Failed to update stock. Please verify values.');
    }
  };

  // Handlers for Tab 2: Create Store Purchase Order
  const handleAddPOItem = (item: InventoryItem) => {
    if (poSelectedItems.some((p) => p.item.id === item.id)) return;
    setPoSelectedItems((prev) => [...prev, { item, requestedQty: 10 }]);
    setPoSearchQuery('');
  };

  const handleUpdatePOItemQty = (itemId: string, qty: number) => {
    setPoSelectedItems((prev) =>
      prev.map((p) => (p.item.id === itemId ? { ...p, requestedQty: Math.max(1, qty) } : p))
    );
  };

  const handleRemovePOItem = (itemId: string) => {
    setPoSelectedItems((prev) => prev.filter((p) => p.item.id !== itemId));
  };

  const handleSubmitPO = (e: React.FormEvent) => {
    e.preventDefault();
    if (poSelectedItems.length === 0) {
      alert('Please add at least one SKU to the purchase order.');
      return;
    }

    setIsSubmittingPO(true);
    const targetWH = warehouses[0] || { id: 'wh-central', name: 'Central Warehouse Hub' };

    const indentItems = poSelectedItems.map((p) => ({
      itemId: p.item.id,
      sku: p.item.sku,
      name: p.item.name,
      currentStoreStock: p.item.storeAllocations?.[storeId] ?? 0,
      minThreshold: p.item.lowStockThreshold || 10,
      requestedQty: p.requestedQty,
      unit: p.item.unit || 'units',
    }));

    const newPO = warehouseStorage.createStoreIndent({
      storeId,
      storeName,
      targetWarehouseId: targetWH.id,
      targetWarehouseName: targetWH.name,
      urgency: poUrgency,
      requestDate: new Date().toISOString().split('T')[0],
      items: indentItems,
      requestedBy: performedBy,
      notes: poNotes.trim() || `Direct Purchase Order from ${storeName}`,
    });

    setIsSubmittingPO(false);
    setPoSelectedItems([]);
    setPoNotes('');
    setPoSuccessMessage(`Purchase Order ${newPO.indentNumber} successfully submitted to Central Warehouse!`);
    soundEffects.playSuccessChime();
    onSuccess?.();
  };

  // Confirm Receipt for In-Transit Transfer / PO
  const handleConfirmTransferReceipt = (transfer: StockTransfer) => {
    setReceivingTransferId(transfer.id);

    // Build received map for all items
    const receivedMap: Record<string, number> = {};
    transfer.items.forEach((it) => {
      receivedMap[it.itemId] = it.dispatchedQty || it.requestedQty || 0;
    });

    const success = warehouseStorage.receiveTransfer(transfer.id, performedBy, receivedMap);

    setReceivingTransferId(null);
    if (success) {
      soundEffects.playSuccessChime();
      alert(`Transfer ${transfer.transferNumber} received! All items added to ${storeName} inventory.`);
      onSuccess?.();
    } else {
      soundEffects.playWarningChime();
      alert('Failed to confirm receipt or already processed.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden text-slate-900 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <span>Manage Stock</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {storeName}
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Centralized Stock Management • Master Catalog Synchronization • Direct Purchase Orders
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('add_stock')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'add_stock'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add / Adjust Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('purchase_orders')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'purchase_orders'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Purchase Orders</span>
            {storeIndents.filter((p) => p.status === 'pending' || p.status === 'dispatched').length > 0 && (
              <span className="bg-amber-500 text-slate-950 font-mono text-[10px] px-1.5 py-0.2 rounded-full">
                {storeIndents.filter((p) => p.status === 'pending' || p.status === 'dispatched').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transfers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'transfers'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Transfers & Inwards</span>
            {incomingTransfers.length > 0 && (
              <span className="bg-indigo-500 text-white font-mono text-[10px] px-1.5 py-0.2 rounded-full">
                {incomingTransfers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Stock Overview ({inventory.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* ========================================================================= */}
          {/* TAB 1: ADD OR MANAGE STOCK FOR EXISTING SKU (NEVER DUPLICATE)            */}
          {/* ========================================================================= */}
          {activeTab === 'add_stock' && (
            <div className="space-y-4">
              {stockSuccessFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{stockSuccessFeedback}</span>
                </div>
              )}

              {/* 1. Search Existing SKU */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Search Existing SKU, Product Name, or Barcode:</span>
                </label>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by SKU code (e.g. SKU-PAN-001), item name, or barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                {/* Search Suggestions Dropdown */}
                {searchQuery.trim() && (
                  <div className="mt-1.5 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 z-10">
                    {searchResults.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        No matching SKU found for "{searchQuery}".
                      </div>
                    ) : (
                      searchResults.map((item) => {
                        const allocated = item.storeAllocations?.[storeId] ?? 0;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => handleSelectItem(item)}
                            className={`w-full text-left p-3 hover:bg-indigo-50/80 transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer ${
                              selectedItemId === item.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                            }`}
                          >
                            <div>
                              <div className="font-bold text-slate-900">{item.name}</div>
                              <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                                SKU: <strong>{item.sku}</strong> • {item.category} • Barcode: {item.barcode || 'N/A'} • {CURRENCY}
                                {item.sellingPrice.toFixed(2)}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-slate-500 block">Current Store Stock</span>
                              <span className="font-mono font-bold text-slate-800 text-sm">
                                {allocated} {item.unit || 'units'}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* 2. Selected SKU Card & Quantity Addition */}
              {selectedItem ? (
                <form onSubmit={handleUpdateStock} className="space-y-4">
                  <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                          Existing Master SKU (No Duplication)
                        </span>
                        <h4 className="font-black text-base text-slate-900 mt-1">{selectedItem.name}</h4>
                        <p className="text-xs font-mono text-slate-600">
                          SKU: <strong>{selectedItem.sku}</strong> • Barcode: {selectedItem.barcode || 'N/A'} • Category:{' '}
                          {selectedItem.category}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block uppercase">Price</span>
                        <span className="text-base font-mono font-black text-indigo-900">
                          {CURRENCY}{selectedItem.sellingPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Current Stock Strip */}
                    <div className="pt-2 border-t border-indigo-200/80 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Current Store Stock</span>
                        <span className="font-black text-slate-900 text-sm font-mono block mt-0.5">
                          {currentStoreBoxes} {selectedItem.unit || 'units'}
                          {isLooseItem && (
                            <span className="text-xs text-amber-800 font-bold ml-1">
                              + {currentStoreLoose} Loose ({currentTotalPieces} Pcs)
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Central WH Stock</span>
                        <span className="font-black text-indigo-700 text-sm font-mono block mt-0.5">
                          {centralStock} {selectedItem.unit || 'units'}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-indigo-100 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Unit Conversion</span>
                        <span className="font-mono text-xs text-slate-700 block mt-0.5">
                          1 {selectedItem.unit || 'Box'} = {ppb} pcs
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operation Mode */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                      Stock Action:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('add');
                          setReasonPreset('Direct Store Inward / Supplier Delivery');
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                          mode === 'add'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Stock (+)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMode('set');
                          setQuantityInput(String(currentStoreBoxes));
                          setLoosePiecesInput(String(currentStoreLoose));
                          setReasonPreset('Physical Store Stock Audit');
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                          mode === 'set'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Exact Verified Count (=)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setMode('deduct');
                          setReasonPreset('Damage / Spoilage / Expired Write-Off');
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                          mode === 'deduct'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>Deduct / Scrap (-)</span>
                      </button>
                    </div>
                  </div>

                  {/* Quantity Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                        {mode === 'set' ? 'Exact Full Boxes / Units' : `Box Units to ${mode === 'add' ? 'Add' : 'Deduct'}`}:
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={quantityInput}
                        onChange={(e) => setQuantityInput(e.target.value)}
                        placeholder="Enter quantity..."
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                        required
                      />
                    </div>

                    {isLooseItem && (
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                          {mode === 'set' ? 'Exact Loose Pieces' : `Loose Pieces to ${mode === 'add' ? 'Add' : 'Deduct'}`}:
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={ppb > 1 ? ppb - 1 : 9999}
                          step="1"
                          value={loosePiecesInput}
                          onChange={(e) => setLoosePiecesInput(e.target.value)}
                          placeholder="0"
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                        />
                      </div>
                    )}
                  </div>

                  {/* Reason & Notes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                        Reason & Audit Log:
                      </label>
                      <select
                        value={reasonPreset}
                        onChange={(e) => setReasonPreset(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="Direct Store Inward / Supplier Delivery">📥 Direct Store Inward / Supplier Delivery</option>
                        <option value="Physical Store Stock Audit">🔍 Physical Store Stock Count Audit</option>
                        <option value="Local Store Purchase">🛍️ Local Store Purchase</option>
                        <option value="Damage / Spoilage / Expired Write-Off">⚠️ Damage / Spoilage / Expired Write-off</option>
                        <option value="Customer Return / Exchange">↩️ Customer Return / Exchange</option>
                        <option value="Tasting Sample / Store Consumption">🎁 Sample / Store Consumption</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                        Invoice / Reference Note:
                      </label>
                      <input
                        type="text"
                        value={customNote}
                        onChange={(e) => setCustomNote(e.target.value)}
                        placeholder="Supplier Bill #, PO ref, or count note..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Projected Stock Strip */}
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-3.5 rounded-xl space-y-2 shadow-xs">
                    <div className="flex items-center justify-between text-xs border-b border-indigo-800/80 pb-1.5">
                      <span className="font-bold text-indigo-200 flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Projected Store Stock Balance</span>
                      </span>
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                          pieceChange > 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                            : pieceChange < 0
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {pieceChange > 0 ? `+${pieceChange} Pcs` : `${pieceChange} Pcs`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Previous Store Stock</span>
                        <span className="font-mono text-xs text-slate-300">
                          {currentStoreBoxes} Box + {currentStoreLoose} Loose ({currentTotalPieces} pcs)
                        </span>
                      </div>

                      <ArrowRight className="w-4 h-4 text-amber-400" />

                      <div className="text-right">
                        <span className="text-[10px] text-emerald-300 font-bold block uppercase">New Store Stock</span>
                        <span className="font-mono text-sm font-bold text-emerald-400">
                          {projectedBoxes} Box + {projectedLoose} Loose ({projectedTotalPieces} pcs)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingStock}
                      className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isSubmittingStock ? 'Updating...' : 'Update Stock & Sync Warehouse'}</span>
                    </button>
                  </div>

                  {/* Movement History for this SKU */}
                  {itemMovementHistory.length > 0 && (
                    <div className="pt-3 border-t border-slate-200">
                      <span className="text-xs font-bold text-slate-700 block mb-2">
                        Recent Stock Movement Log for {selectedItem.name}:
                      </span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {itemMovementHistory.map((m) => (
                          <div
                            key={m.id}
                            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] flex items-center justify-between gap-2"
                          >
                            <div>
                              <span className="font-semibold text-slate-800">{m.movementType.replace(/_/g, ' ')}</span>
                              <span className="text-slate-400 ml-1.5">• {m.notes || m.referenceNumber}</span>
                            </div>
                            <div className="text-right font-mono font-bold shrink-0">
                              <span className={m.quantity >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                {m.quantity >= 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              ) : (
                <div className="p-8 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center space-y-2">
                  <Package className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">
                    Search an existing SKU or product above to add or adjust stock for {storeName}.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Existing SKU records are updated with full audit trails. No duplicate products are created.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: DIRECT PURCHASE ORDERS FROM STORE TO CENTRAL WAREHOUSE            */}
          {/* ========================================================================= */}
          {activeTab === 'purchase_orders' && (
            <div className="space-y-5">
              {poSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{poSuccessMessage}</span>
                </div>
              )}

              {/* Raise New Purchase Order Section */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Raise Direct Purchase Order / Stock Requisition</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select catalog SKUs and submit requisition directly to Central Warehouse
                    </p>
                  </div>
                </div>

                {/* SKU Search to Add Line Items */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search SKU code or item name to add to purchase order..."
                    value={poSearchQuery}
                    onChange={(e) => setPoSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  {poSearchQuery.trim() && (
                    <div className="mt-1.5 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 z-10">
                      {inventory
                        .filter(
                          (item) =>
                            item.name.toLowerCase().includes(poSearchQuery.toLowerCase()) ||
                            (item.sku && item.sku.toLowerCase().includes(poSearchQuery.toLowerCase()))
                        )
                        .slice(0, 8)
                        .map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => handleAddPOItem(item)}
                            className="w-full text-left p-2.5 hover:bg-indigo-50/80 transition-colors flex items-center justify-between text-xs cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-slate-900">{item.name}</span>
                              <span className="text-[10px] font-mono text-slate-500 ml-2">SKU: {item.sku}</span>
                            </div>
                            <span className="text-xs font-bold text-indigo-600">+ Add to PO</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Selected PO Items Table */}
                {poSelectedItems.length > 0 && (
                  <form onSubmit={handleSubmitPO} className="space-y-3">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/80 text-slate-700 font-bold text-[10px] uppercase border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Item & SKU</th>
                            <th className="py-2.5 px-3">Current Store Stock</th>
                            <th className="py-2.5 px-3">Required Quantity</th>
                            <th className="py-2.5 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {poSelectedItems.map(({ item, requestedQty }) => (
                            <tr key={item.id}>
                              <td className="py-2 px-3 font-semibold text-slate-900">
                                {item.name}
                                <span className="block text-[10px] font-mono text-slate-400">{item.sku}</span>
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-700">
                                {item.storeAllocations?.[storeId] ?? 0} {item.unit || 'units'}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  min="1"
                                  value={requestedQty}
                                  onChange={(e) => handleUpdatePOItemQty(item.id, parseInt(e.target.value) || 1)}
                                  className="w-24 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePOItem(item.id)}
                                  className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          Requisition Urgency:
                        </label>
                        <select
                          value={poUrgency}
                          onChange={(e) => setPoUrgency(e.target.value as any)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          <option value="routine">Routine Weekly Replenishment</option>
                          <option value="urgent_low_stock">Urgent - Low Stock Out Warning</option>
                          <option value="emergency_event">Emergency Festival / Bulk Order</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                          Purchase Order Notes:
                        </label>
                        <input
                          type="text"
                          value={poNotes}
                          onChange={(e) => setPoNotes(e.target.value)}
                          placeholder="Optional notes for Central Warehouse..."
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={isSubmittingPO}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{isSubmittingPO ? 'Submitting...' : 'Submit Purchase Order to Warehouse'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Purchase Orders Status Tracking List */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center justify-between">
                  <span>Store Purchase Orders Lifecycle ({storeIndents.length})</span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Track statuses: Pending ➔ Approved ➔ Dispatched ➔ Completed
                  </span>
                </h4>

                {storeIndents.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                    No purchase orders raised yet by {storeName}.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {storeIndents.map((indent) => {
                      const totalUnits = indent.items.reduce((s, i) => s + i.requestedQty, 0);

                      // Status Badge Styling
                      const statusStyles = {
                        pending: 'bg-amber-100 text-amber-900 border-amber-300',
                        approved: 'bg-blue-100 text-blue-900 border-blue-300',
                        converted_to_transfer: 'bg-indigo-100 text-indigo-900 border-indigo-300',
                        dispatched: 'bg-purple-100 text-purple-900 border-purple-300 font-black',
                        partially_fulfilled: 'bg-orange-100 text-orange-900 border-orange-300',
                        completed: 'bg-emerald-100 text-emerald-900 border-emerald-300',
                        declined: 'bg-slate-100 text-slate-700 border-slate-300',
                      };

                      const statusLabels = {
                        pending: 'Pending Review',
                        approved: 'Approved by WH',
                        converted_to_transfer: 'Approved / In Prep',
                        dispatched: 'Dispatched (In Transit)',
                        partially_fulfilled: 'Partially Fulfilled',
                        completed: 'Completed (Stock Added)',
                        declined: 'Declined',
                      };

                      return (
                        <div
                          key={indent.id}
                          className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-slate-300 transition-colors space-y-2"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-slate-900">
                                {indent.indentNumber}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  statusStyles[indent.status] || 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                {statusLabels[indent.status] || indent.status.toUpperCase()}
                              </span>
                            </div>

                            <span className="text-[11px] text-slate-500 font-mono">
                              Requested: {indent.requestDate}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
                            <div>
                              <span>Items: <strong>{indent.items.length} SKUs</strong> ({totalUnits} total units)</span>
                              <span className="mx-2">•</span>
                              <span>Target: <strong>{indent.targetWarehouseName}</strong></span>
                            </div>

                            {/* One-click confirm receipt if dispatched */}
                            {indent.status === 'dispatched' && (
                              <button
                                type="button"
                                onClick={() => {
                                  // Locate linked transfer or confirm receipt
                                  const linkedTr = warehouseStorage
                                    .getStockTransfers()
                                    .find((t) => t.id === indent.linkedTransferId || t.destinationId === storeId);
                                  if (linkedTr) {
                                    handleConfirmTransferReceipt(linkedTr);
                                  } else {
                                    alert('Linked dispatch record confirmed.');
                                  }
                                }}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirm Delivery & Inward</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: STOCK TRANSFERS & CONFIRM RECEIPT                                 */}
          {/* ========================================================================= */}
          {activeTab === 'transfers' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Dispatched shipments from Central Warehouse automatically deduct warehouse stock and appear here in
                  real-time for store receipt confirmation.
                </span>
              </div>

              {incomingTransfers.length === 0 ? (
                <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  No incoming shipments currently in transit for {storeName}.
                </div>
              ) : (
                <div className="space-y-3">
                  {incomingTransfers.map((tr) => (
                    <div
                      key={tr.id}
                      className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="font-mono font-bold text-sm text-slate-900">{tr.transferNumber}</span>
                          <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                            {tr.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>

                        <span className="text-xs text-slate-500 font-mono">
                          Dispatched: {tr.dispatchDate || tr.requestedDate}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div>Carrier: <strong>{tr.carrierName || 'Company Fleet'}</strong></div>
                        <div>Vehicle: <strong>{tr.vehicleNumber || 'GJ-01-XX-0000'}</strong></div>
                        <div>Driver: <strong>{tr.driverContact || 'N/A'}</strong></div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Dispatched Items:</span>
                        {tr.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs py-1 border-b border-slate-100">
                            <span>{it.name} (SKU: {it.sku})</span>
                            <span className="font-mono font-bold text-slate-900">
                              {it.dispatchedQty || it.requestedQty} {it.unit}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          disabled={receivingTransferId === tr.id}
                          onClick={() => handleConfirmTransferReceipt(tr)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{receivingTransferId === tr.id ? 'Processing...' : 'Confirm Delivery & Inward Stock'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: CENTRALIZED STOCK OVERVIEW ACROSS LOCATIONS                       */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search SKU, item name, barcode..."
                    value={overviewSearch}
                    onChange={(e) => setOverviewSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>

                <select
                  value={overviewCategory}
                  onChange={(e) => setOverviewCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer w-full sm:w-auto"
                >
                  <option value="all">All Categories</option>
                  <option value="Paan">Paan</option>
                  <option value="Cafe">Cafe</option>
                  <option value="Essentials">Essentials</option>
                </select>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Item & SKU</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">This Store Stock</th>
                        <th className="py-2.5 px-3 text-center">Central WH Stock</th>
                        <th className="py-2.5 px-3 text-center">Total Network</th>
                        <th className="py-2.5 px-3 text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOverviewItems.map((item) => {
                        const storeQty = item.storeAllocations?.[storeId] ?? 0;
                        const whQty = item.stockQuantity ?? 0;
                        const networkQty = whQty + Object.values(item.storeAllocations || {}).reduce((s, v) => s + (v || 0), 0);

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {item.name}
                              <span className="block text-[10px] font-mono text-slate-400">SKU: {item.sku}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                {item.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              {storeQty} {item.unit || 'units'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-700">
                              {whQty} {item.unit || 'units'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                              {networkQty} {item.unit || 'units'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedItemId(item.id);
                                  setActiveTab('add_stock');
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg cursor-pointer transition-colors"
                              >
                                Manage Stock
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            Logged as: <strong className="text-slate-800">{performedBy}</strong> ({storeName})
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
