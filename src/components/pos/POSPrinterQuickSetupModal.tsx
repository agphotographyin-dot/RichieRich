import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Zap,
  Sliders,
  Usb,
  Bluetooth,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Save,
  HelpCircle,
  Copy,
  ChevronRight,
} from 'lucide-react';
import { printerService } from '../../services/printerService';
import { PrinterSettings } from '../../types';
import { soundEffects } from '../../services/audio';

interface POSPrinterQuickSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullAdminSetup?: () => void;
}

export const POSPrinterQuickSetupModal: React.FC<POSPrinterQuickSetupModalProps> = ({
  isOpen,
  onClose,
  onOpenFullAdminSetup,
}) => {
  const [settings, setSettings] = useState<PrinterSettings>(() => printerService.getSettings());
  const [isSaved, setIsSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(printerService.getSettings());
      setTestStatus(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdate = <K extends keyof PrinterSettings>(key: K, value: PrinterSettings[K]) => {
    const updated = printerService.saveSettings({ [key]: value });
    setSettings(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleConnectSerial = async () => {
    setIsConnecting(true);
    setTestStatus('Authorizing USB Serial printer port...');
    const res = await printerService.connectSerial(settings.baudRate);
    setIsConnecting(false);
    setTestStatus(res.message);
    if (res.success) {
      setSettings(printerService.getSettings());
    }
    setTimeout(() => setTestStatus(null), 5000);
  };

  const handleDisconnectSerial = async () => {
    await printerService.disconnectSerial();
    handleUpdate('connectionType', 'silent_direct');
    setTestStatus('USB printer disconnected.');
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleConnectBluetooth = async () => {
    setIsConnecting(true);
    setTestStatus('Searching for Bluetooth thermal printer...');
    const res = await printerService.connectBluetooth();
    setIsConnecting(false);
    setTestStatus(res.message);
    if (res.success) {
      setSettings(printerService.getSettings());
    }
    setTimeout(() => setTestStatus(null), 5000);
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    setTestStatus('Dispatching test slip directly to thermal printer...');
    try {
      const res = await printerService.testPrint(settings);
      setTestStatus(res.message);
    } catch (err: any) {
      setTestStatus(`Test print failed: ${err.message || 'Check printer connection'}`);
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestStatus(null), 5000);
    }
  };

  const isSerialConnected = printerService.isSerialConnected();
  const isBleConnected = printerService.isBluetoothConnected();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="bg-[#0F172A] border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-white flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Printer className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  Counter Thermal Printer Setup
                </h3>
                {settings.directPrintEnabled && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5 fill-current" /> Zero-Prompt
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Direct silent printing & receipt roll settings for this register.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification */}
        {testStatus && (
          <div className="bg-amber-500/20 border-b border-amber-500/30 text-amber-300 px-4 py-2 text-xs flex items-center justify-between animate-in fade-in">
            <span className="truncate">{testStatus}</span>
            <button
              onClick={() => setTestStatus(null)}
              className="text-[10px] font-bold text-amber-400 hover:text-white ml-2 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs custom-scrollbar">
          {/* 1. Direct Printing Switch */}
          <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-white text-xs flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Direct Silent Print (Bypass OS Dialog)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Clicking "Print thermal slip" immediately outputs to printer without prompt.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.directPrintEnabled}
                onChange={(e) => handleUpdate('directPrintEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* 2. Auto-Print on Checkout Switch */}
          <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-white text-xs">
                <span>Auto-Print Slip on Tender</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                Instantly prints slip when payment completes without clicking print.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={settings.autoPrintOnCheckout}
                onChange={(e) => handleUpdate('autoPrintOnCheckout', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* 3. Paper Roll Width */}
          <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
            <div className="font-bold text-slate-300">Thermal Paper Width</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleUpdate('paperWidth', '80mm')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  settings.paperWidth === '80mm'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                80mm (Standard POS)
              </button>
              <button
                type="button"
                onClick={() => handleUpdate('paperWidth', '58mm')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  settings.paperWidth === '58mm'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                }`}
              >
                58mm (Compact Roll)
              </button>
            </div>
          </div>

          {/* 4. Connection Mode Quick Selection */}
          <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300">Connection Mode</span>
              <span className="text-[10px] font-mono text-amber-400">
                Current: {settings.connectionType}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleUpdate('connectionType', 'silent_direct')}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  settings.connectionType === 'silent_direct'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                }`}
              >
                <div className="font-bold">Silent Direct</div>
                <div className="text-[10px] text-slate-400">POS Kiosk / Iframe</div>
              </button>

              <button
                type="button"
                onClick={() => handleUpdate('connectionType', 'web_serial')}
                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  settings.connectionType === 'web_serial'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">USB Serial</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSerialConnected ? 'bg-emerald-400' : 'bg-slate-600'
                    }`}
                  ></span>
                </div>
                <div className="text-[10px] text-slate-400">Direct USB ESC/POS</div>
              </button>
            </div>

            {/* Quick Connect Hardware Buttons */}
            {settings.connectionType === 'web_serial' && (
              <div className="pt-1 flex items-center justify-between gap-2 bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60">
                <span className="text-[11px] text-slate-300">
                  {isSerialConnected ? '● USB Thermal Connected' : 'Device not paired'}
                </span>
                {!isSerialConnected ? (
                  <button
                    type="button"
                    onClick={handleConnectSerial}
                    disabled={isConnecting}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    {isConnecting ? 'Connecting...' : 'Pair USB Printer'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDisconnectSerial}
                    className="px-3 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleTestPrint}
            disabled={isTesting}
            className="flex-1 py-2.5 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-98"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isTesting ? 'Printing...' : 'Test Direct Print'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
