import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Scan, CheckCircle, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { soundEffects } from '../../services/audio';
import { storage } from '../../services/storage';
import { InventoryItem } from '../../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan?: (barcode: string) => void;
  onScanSuccess?: (barcode: string) => void;
  inventory?: InventoryItem[];
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  onScanSuccess,
  inventory = [],
  title = 'Barcode & QR Scanner',
}) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementId = 'html5-qr-reader-container';

  const activeInventory = inventory && inventory.length > 0 ? inventory : storage.getInventory();

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setLastScanned(null);
      setManualCode('');
      setCameraError(null);
    }
  }, [isOpen]);

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
          handleSuccessfulScan(decodedText);
        },
        () => {
          // ignore frame decode errors
        }
      );
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera start error:', err);
      setCameraError('Camera access not granted or unavailable. You can use the instant barcode simulator below!');
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && cameraActive) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Camera stop error:', e);
      }
      setCameraActive(false);
    }
  };

  const handleSuccessfulScan = (code: string) => {
    soundEffects.playScanBeep();
    setLastScanned(code);
    if (onScan) onScan(code);
    if (onScanSuccess) onScanSuccess(code);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSuccessfulScan(manualCode.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-slate-700">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base tracking-tight">{title}</h3>
              <p className="text-xs text-slate-500">Richie Rich Pan House Optical System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Camera Viewport Container */}
          <div className="relative bg-slate-50 rounded-xl border border-slate-200 overflow-hidden min-h-[220px] flex flex-col items-center justify-center text-center p-3">
            <div id={scannerElementId} className={`w-full max-w-sm rounded-lg overflow-hidden ${cameraActive ? 'block' : 'hidden'}`} />

            {!cameraActive && (
              <div className="space-y-3 p-4 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-700">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Hardware Camera Scanner</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Scan retail product barcodes or customer digital loyalty QR codes instantly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-sky-400" />
                  Enable Optical Camera
                </button>
              </div>
            )}

            {cameraActive && (
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={stopCamera}
                  className="bg-white/90 text-slate-700 text-xs px-2.5 py-1 rounded-md border border-slate-300 hover:text-slate-900 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Stop Camera
                </button>
              </div>
            )}

            {cameraError && (
              <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>{cameraError}</span>
              </div>
            )}

            {lastScanned && (
              <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-emerald-300 gap-2 animate-in zoom-in-95">
                <CheckCircle className="w-12 h-12 text-emerald-400" />
                <p className="font-bold text-white text-sm">Scanned: {lastScanned}</p>
                <p className="text-xs text-emerald-200">Applying to inventory / cart...</p>
              </div>
            )}
          </div>

          {/* Manual Input Form */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Manual Barcode / SKU Entry</span>
              <span className="text-[11px] text-slate-400 font-normal">Press Enter or click Submit</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. 890100101 or PAN-MAG-01"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400"
                autoFocus
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-[#1E293B] hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Scan Code
              </button>
            </div>
          </form>

          {/* Instant Quick-Test Barcode Grid from active Store Inventory */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Live Product Barcode Simulator
              </span>
              <span className="text-[10px] text-slate-400">Click any product to simulate scan</span>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {activeInventory.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSuccessfulScan(item.barcode)}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left transition-all group flex flex-col justify-between cursor-pointer"
                >
                  <div className="truncate font-bold text-xs text-slate-800 group-hover:text-sky-700">
                    {item.name}
                  </div>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200 text-[10px]">
                    <span className="font-mono text-slate-500">{item.barcode}</span>
                    <span className="text-slate-900 font-bold">₹{item.sellingPrice}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Ready for USB & Bluetooth Barcode Guns</span>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900 font-bold px-3 py-1 cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
