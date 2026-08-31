import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Scan,
  Sparkles,
  Camera,
  CheckCircle,
  AlertTriangle,
  Search,
  Package,
  Barcode as BarcodeIcon,
  Printer,
  Check,
  RefreshCw,
} from 'lucide-react';
import { InventoryItem } from '../../types';
import { CURRENCY, storage } from '../../services/storage';
import { BarcodeVisualizer } from '../common/BarcodeVisualizer';
import { soundEffects } from '../../services/audio';
import { Html5Qrcode } from 'html5-qrcode';

interface RegisterBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  preselectedItem?: InventoryItem | null;
  onBarcodeRegistered?: (item: InventoryItem, newBarcode: string) => void;
}

export const RegisterBarcodeModal: React.FC<RegisterBarcodeModalProps> = ({
  isOpen,
  onClose,
  inventory,
  preselectedItem = null,
  onBarcodeRegistered,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementId = 'register-barcode-camera-container';

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialItem = preselectedItem || inventory[0];
      if (initialItem) {
        setSelectedItemId(initialItem.id);
        setBarcodeInput(initialItem.barcode || '');
      }
      setProductSearch('');
      setSuccessMessage(null);
      setDuplicateWarning(null);
      setCameraError(null);
    } else {
      stopCamera().catch(() => {});
    }
    return () => {
      stopCamera().catch(() => {});
    };
  }, [isOpen, preselectedItem, inventory]);

  const selectedItem = inventory.find((i) => i.id === selectedItemId) || inventory[0];

  // When selected item changes, update barcode input
  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItemId(item.id);
    setBarcodeInput(item.barcode || '');
    setSuccessMessage(null);
    setDuplicateWarning(null);
  };

  // Check for barcode duplicates when input changes
  useEffect(() => {
    if (!barcodeInput.trim() || !selectedItem) {
      setDuplicateWarning(null);
      return;
    }
    const clean = barcodeInput.trim();
    const existing = inventory.find((i) => i.barcode === clean && i.id !== selectedItem.id);
    if (existing) {
      setDuplicateWarning(`Warning: Barcode "${clean}" is already assigned to "${existing.name}" (SKU: ${existing.sku}).`);
    } else {
      setDuplicateWarning(null);
    }
  }, [barcodeInput, selectedItem, inventory]);

  const handleAutoGenerateBarcode = () => {
    // Generate standard EAN-13 style retail barcode
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const generated = `890100${randomSuffix}`;
    setBarcodeInput(generated);
    soundEffects.playClick();
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerElementId);
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 180 },
        },
        (decodedText) => {
          soundEffects.playScanBeep();
          setBarcodeInput(decodedText);
          stopCamera();
        },
        () => {
          // ignore frame errors
        }
      );
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError('Camera access unavailable. You can enter or paste the barcode manually or auto-generate one.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        // safely handled
      }
      setIsCameraActive(false);
    }
  };

  const handleRegisterBarcode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !barcodeInput.trim()) return;

    const trimmed = barcodeInput.trim();
    const updated = storage.updateInventoryItem(selectedItem.id, {
      barcode: trimmed,
    });

    if (updated) {
      soundEffects.playSuccessJingle();
      setSuccessMessage(`Barcode "${trimmed}" successfully registered to "${selectedItem.name}"!`);
      if (onBarcodeRegistered) {
        onBarcodeRegistered(updated, trimmed);
      }
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    }
  };

  if (!isOpen) return null;

  const filteredItems = inventory.filter((item) => {
    if (!productSearch) return true;
    const q = productSearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.barcode.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-bold shadow-xs">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Register Product Barcode</h3>
              <p className="text-xs text-slate-400">
                Link optical barcodes to master catalog items for scanner POS & Warehouse dispatch
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-200" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-200 hover:text-white text-xs">
              ✕
            </button>
          </div>
        )}

        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Step 1: Select Catalog Product */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-extrabold flex items-center justify-center">
                  1
                </span>
                <span>Select Product to Register Barcode</span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {filteredItems.length} Products Available
              </span>
            </div>

            {/* Product search bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search product by name, SKU or category..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400"
              />
            </div>

            {/* Product selection tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
              {filteredItems.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-slate-950 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-xs truncate text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {item.sku} • Current: <span className="font-bold text-slate-700">{item.barcode || 'None'}</span>
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Barcode Input, Camera Scan & Auto Generation */}
          {selectedItem && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-extrabold flex items-center justify-center">
                    2
                  </span>
                  <span>Barcode Assignment for "{selectedItem.name}"</span>
                </label>
                <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[10px] font-mono font-bold">
                  SKU: {selectedItem.sku}
                </span>
              </div>

              {/* Barcode input with actions */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <BarcodeIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder="Type or scan barcode (e.g. 890100101)..."
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-slate-400"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleAutoGenerateBarcode}
                      className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-200"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Auto Generate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => (isCameraActive ? stopCamera() : startCamera())}
                      className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border ${
                        isCameraActive
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-[#1E293B] hover:bg-slate-900 text-white border-slate-800 shadow-xs'
                      }`}
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isCameraActive ? 'Close Camera' : 'Camera Scan'}</span>
                    </button>
                  </div>
                </div>

                {/* Duplicate Barcode Warning */}
                {duplicateWarning && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{duplicateWarning}</span>
                  </div>
                )}
              </div>

              {/* Camera Scanner Viewport */}
              {isCameraActive && (
                <div className="relative bg-black rounded-xl overflow-hidden min-h-[180px] p-2 flex flex-col items-center justify-center">
                  <div id={scannerElementId} className="w-full max-w-sm rounded-lg overflow-hidden" />
                  <p className="text-slate-300 text-[11px] mt-2 font-medium">
                    Point camera at packaging barcode to capture code automatically.
                  </p>
                </div>
              )}

              {cameraError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {cameraError}
                </div>
              )}

              {/* Live Barcode Visualizer Preview */}
              {barcodeInput.trim() && (
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Live Optical Barcode Preview
                    </span>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedItem.name}</p>
                    <p className="text-[10px] text-slate-500">
                      Retail Price: {CURRENCY}{selectedItem.sellingPrice} | Unit: {selectedItem.unit}
                    </p>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex flex-col items-center">
                    <BarcodeVisualizer value={barcodeInput.trim()} width={160} height={34} showText={true} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer transition-colors"
          >
            Cancel / Close
          </button>

          <button
            type="button"
            disabled={!barcodeInput.trim() || !selectedItem}
            onClick={handleRegisterBarcode}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Register & Save Barcode</span>
          </button>
        </div>
      </div>
    </div>
  );
};
