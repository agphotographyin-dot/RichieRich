import React, { useState, useEffect } from 'react';
import {
  Printer,
  Sliders,
  Settings,
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
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Zap,
  Eye,
  SlidersHorizontal,
  Smartphone,
  Monitor,
  Scissors,
  DollarSign,
  Receipt,
  Store,
} from 'lucide-react';
import { printerService, DEFAULT_PRINTER_SETTINGS } from '../../services/printerService';
import { PrinterSettings, PrinterConnectionType } from '../../types';
import { CURRENCY } from '../../services/storage';
import { soundEffects } from '../../services/audio';

interface AdminPrinterSetupViewProps {
  storeName?: string;
  onNavigateTab?: (tab: any) => void;
}

export const AdminPrinterSetupView: React.FC<AdminPrinterSetupViewProps> = ({
  storeName = 'Richie Rich Pan House',
}) => {
  const [settings, setSettings] = useState<PrinterSettings>(() => printerService.getSettings());
  const [isSaved, setIsSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showKioskGuide, setShowKioskGuide] = useState(false);
  const [copiedKioskCmd, setCopiedKioskCmd] = useState(false);

  // Mobile navigation tabs: 'hardware' | 'branding' | 'preview'
  const [mobileTab, setMobileTab] = useState<'hardware' | 'branding' | 'preview'>('hardware');

  // Subscribe to external printer settings changes
  useEffect(() => {
    const unsub = printerService.subscribe(() => {
      setSettings(printerService.getSettings());
    });
    return unsub;
  }, []);

  const handleChange = <K extends keyof PrinterSettings>(key: K, value: PrinterSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsSaved(false);
  };

  const handleSave = () => {
    printerService.saveSettings(settings);
    soundEffects.playSuccessChime();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all printer settings and receipt slip layout to Richie Rich defaults?')) {
      const reset = printerService.saveSettings(DEFAULT_PRINTER_SETTINGS);
      setSettings(reset);
      soundEffects.playClick();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    }
  };

  // Preset Configurations
  const applyPreset = (preset: '80mm_standard' | '58mm_compact' | 'kiosk_fast') => {
    soundEffects.playClick();
    if (preset === '80mm_standard') {
      const updated: PrinterSettings = {
        ...settings,
        paperWidth: '80mm',
        directPrintEnabled: true,
        connectionType: 'silent_direct',
        cutPaper: true,
        kickDrawer: true,
        showTaxBreakdown: true,
        showBarcode: true,
        showCashierAndCounter: true,
        showCustomerLoyalty: true,
        copies: 1,
      };
      setSettings(updated);
      printerService.saveSettings(updated);
    } else if (preset === '58mm_compact') {
      const updated: PrinterSettings = {
        ...settings,
        paperWidth: '58mm',
        directPrintEnabled: true,
        connectionType: 'silent_direct',
        cutPaper: false,
        kickDrawer: false,
        showTaxBreakdown: false,
        showBarcode: false,
        showCashierAndCounter: false,
        showCustomerLoyalty: true,
        copies: 1,
      };
      setSettings(updated);
      printerService.saveSettings(updated);
    } else if (preset === 'kiosk_fast') {
      const updated: PrinterSettings = {
        ...settings,
        paperWidth: '80mm',
        directPrintEnabled: true,
        autoPrintOnCheckout: true,
        connectionType: 'silent_direct',
        cutPaper: true,
        kickDrawer: true,
        copies: 1,
      };
      setSettings(updated);
      printerService.saveSettings(updated);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // Direct Serial USB Connection
  const handleConnectSerial = async () => {
    setIsConnecting(true);
    setConnectionMessage('Requesting USB Serial device authorization...');
    const res = await printerService.connectSerial(settings.baudRate);
    setIsConnecting(false);
    setConnectionMessage(res.message);
    if (res.success) {
      handleChange('connectionType', 'web_serial');
      handleChange('directPrintEnabled', true);
    }
  };

  const handleDisconnectSerial = async () => {
    await printerService.disconnectSerial();
    handleChange('connectionType', 'silent_direct');
    setConnectionMessage('USB Serial thermal printer disconnected.');
  };

  // Bluetooth Connection
  const handleConnectBluetooth = async () => {
    setIsConnecting(true);
    setConnectionMessage('Scanning for nearby Bluetooth thermal printers...');
    const res = await printerService.connectBluetooth();
    setIsConnecting(false);
    setConnectionMessage(res.message);
    if (res.success) {
      handleChange('connectionType', 'web_bluetooth');
      handleChange('directPrintEnabled', true);
    }
  };

  const handleDisconnectBluetooth = async () => {
    await printerService.disconnectBluetooth();
    handleChange('connectionType', 'silent_direct');
    setConnectionMessage('Bluetooth thermal printer disconnected.');
  };

  // Diagnostic Test Print
  const handleTestPrint = async () => {
    setIsTesting(true);
    soundEffects.playClick();
    setTestStatus('Sending test thermal slip to printer (no prompt)...');
    try {
      const res = await printerService.testPrint(settings);
      setTestStatus(res.message);
    } catch (err: any) {
      setTestStatus(`Test failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestStatus(null), 5000);
    }
  };

  // Test Drawer Kick
  const handleTestDrawer = async () => {
    const res = await printerService.testKickDrawer();
    setTestStatus(res.message);
    setTimeout(() => setTestStatus(null), 4000);
  };

  const handleCopyKiosk = () => {
    const cmd = `chrome.exe --kiosk --kiosk-printing --app="${window.location.origin}"`;
    navigator.clipboard?.writeText(cmd);
    setCopiedKioskCmd(true);
    soundEffects.playClick();
    setTimeout(() => setCopiedKioskCmd(false), 3000);
  };

  const isSerialActive = printerService.isSerialConnected();
  const isBleActive = printerService.isBluetoothConnected();

  return (
    <div className="space-y-4 sm:space-y-5 w-full max-w-full pb-8 text-slate-900">
      {/* 1. Header Banner & Status Bar */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#0F172A] rounded-2xl border border-slate-800 p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Printer className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Thermal Printer & Slip Setup
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 fill-current" /> Direct Print Engine
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-snug">
                Configure direct zero-prompt takeout printing, 80mm/58mm rolls, and custom receipt branding for{' '}
                <span className="text-amber-300 font-semibold">{storeName}</span>.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/60">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex-1 sm:flex-none px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              title="Reset to factory defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer ${
                isSaved
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black'
              }`}
            >
              {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4 stroke-[2.5]" />}
              <span>{isSaved ? 'Saved!' : 'Save Setup'}</span>
            </button>
          </div>
        </div>

        {/* Status badges strip */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-300">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Direct Mode:</span>
              <span
                className={`font-bold flex items-center gap-1 ${
                  settings.directPrintEnabled ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    settings.directPrintEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                ></span>
                {settings.directPrintEnabled ? 'ACTIVE (Zero-Prompt)' : 'DISABLED (Shows Dialog)'}
              </span>
            </div>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Paper Roll:</span>
              <span className="font-bold text-amber-300 font-mono">
                {settings.paperWidth} ({settings.paperWidth === '58mm' ? '32 Cols' : '48 Cols'})
              </span>
            </div>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Mode:</span>
              <span className="font-bold text-slate-200 uppercase font-mono">
                {settings.connectionType.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Quick Presets Row */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">
              Presets:
            </span>
            <button
              type="button"
              onClick={() => applyPreset('80mm_standard')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
            >
              80mm POS
            </button>
            <button
              type="button"
              onClick={() => applyPreset('58mm_compact')}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[10px] font-bold border border-slate-700 transition-colors cursor-pointer"
            >
              58mm Mobile
            </button>
            <button
              type="button"
              onClick={() => applyPreset('kiosk_fast')}
              className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-[10px] font-bold border border-amber-500/40 transition-colors cursor-pointer"
            >
              Kiosk Auto
            </button>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {connectionMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <Info className="w-4 h-4 shrink-0 text-blue-600" />
            <span className="truncate">{connectionMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setConnectionMessage(null)}
            className="text-blue-700 hover:text-blue-900 cursor-pointer text-[11px] font-bold shrink-0 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {testStatus && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-600" />
            <span className="truncate">{testStatus}</span>
          </div>
          <button
            type="button"
            onClick={() => setTestStatus(null)}
            className="text-amber-800 hover:text-amber-950 cursor-pointer text-[11px] font-bold shrink-0 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mobile / Tablet View Switcher (Visible on < lg screens) */}
      <div className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-3 gap-1">
        <button
          type="button"
          onClick={() => setMobileTab('hardware')}
          className={`py-2 px-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'hardware'
              ? 'bg-slate-900 text-white shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="truncate">Hardware</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('branding')}
          className={`py-2 px-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'branding'
              ? 'bg-slate-900 text-white shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          <span className="truncate">Slip Layout</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('preview')}
          className={`py-2 px-1 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            mobileTab === 'preview'
              ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-slate-950" />
          <span className="truncate">Slip Preview</span>
        </button>
      </div>

      {/* Main Grid: Responsive 12-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Controls & Settings (7 cols on Desktop) */}
        <div className={`lg:col-span-7 space-y-5 ${mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
          {/* SECTION 1: DIRECT PRINTING & HARDWARE */}
          <div className={`${mobileTab === 'branding' ? 'hidden lg:block' : 'block'} space-y-5`}>
            {/* Direct Printing Switch Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                      Direct Printing Engine
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Bypass OS print dialog for instant counter takeaway printing
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Zero-Prompt
                </span>
              </div>

              {/* Direct Print Toggle */}
              <div className="p-3.5 sm:p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start justify-between gap-3">
                <div>
                  <label className="text-xs font-black text-slate-900 block cursor-pointer">
                    Direct Silent Printing (Bypass Printer Selection)
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    When enabled, clicking <strong>"Print Thermal Slip"</strong> in POS directly outputs the receipt to the thermal printer immediately, bypassing the browser / OS printer selection dialog.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={settings.directPrintEnabled}
                    onChange={(e) => handleChange('directPrintEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Auto Print on Checkout */}
              <div className="p-3.5 sm:p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-start justify-between gap-3">
                <div>
                  <label className="text-xs font-black text-slate-900 block cursor-pointer">
                    Auto-Print Thermal Slip on Order Checkout
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Automatically print the thermal receipt the moment the cashier completes tender/cashout without needing to click any buttons.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={settings.autoPrintOnCheckout}
                    onChange={(e) => handleChange('autoPrintOnCheckout', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Connection Mode Radios */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Hardware Connection Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* 1. Silent POS Direct Print (Kiosk & Iframe) */}
                  <button
                    type="button"
                    onClick={() => handleChange('connectionType', 'silent_direct')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      settings.connectionType === 'silent_direct'
                        ? 'bg-amber-500/10 border-amber-500 text-slate-950 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black flex items-center gap-1.5 text-slate-900">
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" /> Direct Silent Mode
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight font-normal">
                      Optimized for POS Kiosk & browser direct printing without popups.
                    </p>
                  </button>

                  {/* 2. Direct USB Serial (ESC/POS) */}
                  <button
                    type="button"
                    onClick={() => handleChange('connectionType', 'web_serial')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      settings.connectionType === 'web_serial'
                        ? 'bg-amber-500/10 border-amber-500 text-slate-950 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black flex items-center gap-1.5 text-slate-900">
                        <Usb className="w-3.5 h-3.5 text-blue-600" /> USB Serial (ESC/POS)
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSerialActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      ></span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight font-normal">
                      Direct USB port (Epson, TVS, Rongta, Xprinter) with zero OS prompt.
                    </p>
                  </button>

                  {/* 3. Bluetooth Thermal (ESC/POS) */}
                  <button
                    type="button"
                    onClick={() => handleChange('connectionType', 'web_bluetooth')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      settings.connectionType === 'web_bluetooth'
                        ? 'bg-amber-500/10 border-amber-500 text-slate-950 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black flex items-center gap-1.5 text-slate-900">
                        <Bluetooth className="w-3.5 h-3.5 text-sky-600" /> Bluetooth Thermal
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isBleActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      ></span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight font-normal">
                      Wireless portable 58mm/80mm Bluetooth receipt printer.
                    </p>
                  </button>

                  {/* 4. Standard Browser Dialog */}
                  <button
                    type="button"
                    onClick={() => handleChange('connectionType', 'browser_dialog')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      settings.connectionType === 'browser_dialog'
                        ? 'bg-amber-500/10 border-amber-500 text-slate-950 shadow-2xs font-bold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black flex items-center gap-1.5 text-slate-900">
                        <FileText className="w-3.5 h-3.5 text-slate-500" /> Browser Dialog
                      </span>
                      <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight font-normal">
                      Standard operating system print selection preview window.
                    </p>
                  </button>
                </div>
              </div>

              {/* Hardware Pairing Action Strip */}
              {(settings.connectionType === 'web_serial' || settings.connectionType === 'web_bluetooth') && (
                <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      {settings.connectionType === 'web_serial' ? (
                        <Usb className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Bluetooth className="w-4 h-4 text-sky-400" />
                      )}
                      Device Pairing & Authorization
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        (settings.connectionType === 'web_serial' && isSerialActive) ||
                        (settings.connectionType === 'web_bluetooth' && isBleActive)
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {(settings.connectionType === 'web_serial' && isSerialActive) ||
                      (settings.connectionType === 'web_bluetooth' && isBleActive)
                        ? '● PAIRED & READY'
                        : 'NOT CONNECTED'}
                    </span>
                  </div>

                  {settings.connectionType === 'web_serial' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400 text-[11px]">Baud:</span>
                        <select
                          value={settings.baudRate}
                          onChange={(e) => handleChange('baudRate', Number(e.target.value))}
                          className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                        >
                          <option value={9600}>9600 bps (Standard)</option>
                          <option value={19200}>19200 bps</option>
                          <option value={38400}>38400 bps</option>
                          <option value={115200}>115200 bps (Fast)</option>
                        </select>
                      </div>

                      {!isSerialActive ? (
                        <button
                          type="button"
                          onClick={handleConnectSerial}
                          disabled={isConnecting}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1 ml-auto shadow-xs"
                        >
                          <Usb className="w-3.5 h-3.5" />
                          <span>{isConnecting ? 'Pairing...' : 'Pair USB Printer'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleDisconnectSerial}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer ml-auto"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  )}

                  {settings.connectionType === 'web_bluetooth' && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-300">
                        Search and pair nearby Bluetooth thermal printer.
                      </span>
                      {!isBleActive ? (
                        <button
                          type="button"
                          onClick={handleConnectBluetooth}
                          disabled={isConnecting}
                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <Bluetooth className="w-3.5 h-3.5" />
                          <span>{isConnecting ? 'Searching...' : 'Pair Bluetooth'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleDisconnectBluetooth}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Paper Roll & Hardware Automation Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                      Paper Specifications & Commands
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Receipt width, knife cutting, and cash drawer automation
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Paper Roll Width */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Paper Roll Width
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleChange('paperWidth', '80mm')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        settings.paperWidth === '80mm'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>80mm (Standard)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('paperWidth', '58mm')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        settings.paperWidth === '58mm'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>58mm (Compact)</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {settings.paperWidth === '80mm'
                      ? '48 characters per line. Standard counter roll.'
                      : '32 characters per line. Compact handheld roll.'}
                  </p>
                </div>

                {/* Number of Copies */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Print Copies per Order
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleChange('copies', 1)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        settings.copies === 1
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>1 Copy (Customer)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('copies', 2)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        settings.copies === 2
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>2 (Cust + Store)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Hardware Commands */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Automatic Paper Cut</span>
                    <span className="text-[10px] text-slate-500">Sends ESC/POS GS V 0 knife cut</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.cutPaper}
                    onChange={(e) => handleChange('cutPaper', e.target.checked)}
                    className="rounded bg-white border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Kick Cash Drawer</span>
                    <span className="text-[10px] text-slate-500">Sends ESC/POS drawer kick pulse</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.kickDrawer}
                    onChange={(e) => handleChange('kickDrawer', e.target.checked)}
                    className="rounded bg-white border-slate-300 text-amber-500 focus:ring-amber-400 w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Kiosk Mode Zero-Prompt Guide (Placed in Hardware section where it belongs!) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => setShowKioskGuide(!showKioskGuide)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 truncate">
                    How POS Terminals Achieve 100% Zero-Prompt Direct Printing (Kiosk Mode)
                  </span>
                </div>
                {showKioskGuide ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                )}
              </button>

              {showKioskGuide && (
                <div className="p-4 pt-1 border-t border-slate-100 space-y-3 text-xs text-slate-600 bg-slate-50/50">
                  <p>
                    To configure your register machine so every thermal slip prints with <strong>0 popups</strong> on Windows, Mac, or Linux POS terminals:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-[11px] text-slate-600">
                    <li>
                      Set your 80mm or 58mm thermal printer as the <strong>Default Printer</strong> in Windows / OS settings.
                    </li>
                    <li>
                      In printer preferences, set paper size to <strong>80mm x Receipt</strong> or <strong>58mm x Receipt</strong>.
                    </li>
                    <li>
                      Launch Chrome or Edge with the <code>--kiosk-printing</code> flag:
                    </li>
                  </ol>

                  <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 font-mono text-[11px] text-amber-300 flex items-center justify-between gap-2 overflow-x-auto">
                    <span className="truncate">chrome.exe --kiosk --kiosk-printing --app="{window.location.origin}"</span>
                    <button
                      type="button"
                      onClick={handleCopyKiosk}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedKioskCmd ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: SLIP BRANDING & CONTENT LAYOUT */}
          <div className={`${mobileTab === 'hardware' ? 'hidden lg:block' : 'block'} space-y-5`}>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider">
                      Thermal Slip Header & Branding
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Store details, tax lines, and customer appreciation copy
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Branding
                </span>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Store Title */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Store Brand Title
                  </label>
                  <input
                    type="text"
                    value={settings.headerTitle}
                    onChange={(e) => handleChange('headerTitle', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-hidden transition-all"
                    placeholder="★ RICHIE RICH ★"
                  />
                </div>

                {/* Tagline */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tagline / Category Banner
                  </label>
                  <input
                    type="text"
                    value={settings.headerTagline}
                    onChange={(e) => handleChange('headerTagline', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-hidden transition-all"
                    placeholder="Pan | Coffee | Essentials | 24x7"
                  />
                </div>

                {/* GSTIN & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      GSTIN / Tax Registration
                    </label>
                    <input
                      type="text"
                      value={settings.headerGstin}
                      onChange={(e) => handleChange('headerGstin', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-hidden transition-all"
                      placeholder="GSTIN: 27AABCR1234F1Z8"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Contact Phone Number
                    </label>
                    <input
                      type="text"
                      value={settings.headerPhone}
                      onChange={(e) => handleChange('headerPhone', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-hidden transition-all"
                      placeholder="+91 98201 99882"
                    />
                  </div>
                </div>

                {/* Store Address */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Store Address / Outlets Line
                  </label>
                  <input
                    type="text"
                    value={settings.headerAddress}
                    onChange={(e) => handleChange('headerAddress', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-hidden transition-all"
                    placeholder="Ahmedabad Chain Outlets • Gujarat"
                  />
                </div>

                {/* Toggles for Slip Information Elements */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.showCashierAndCounter}
                      onChange={(e) => handleChange('showCashierAndCounter', e.target.checked)}
                      className="rounded bg-white border-slate-300 text-amber-500 w-3.5 h-3.5"
                    />
                    <span className="text-[11px] font-medium text-slate-700">Cashier & Stn</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.showCustomerLoyalty}
                      onChange={(e) => handleChange('showCustomerLoyalty', e.target.checked)}
                      className="rounded bg-white border-slate-300 text-amber-500 w-3.5 h-3.5"
                    />
                    <span className="text-[11px] font-medium text-slate-700">Loyalty Pts</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.showTaxBreakdown}
                      onChange={(e) => handleChange('showTaxBreakdown', e.target.checked)}
                      className="rounded bg-white border-slate-300 text-amber-500 w-3.5 h-3.5"
                    />
                    <span className="text-[11px] font-medium text-slate-700">Tax Breakdown</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.showBarcode}
                      onChange={(e) => handleChange('showBarcode', e.target.checked)}
                      className="rounded bg-white border-slate-300 text-amber-500 w-3.5 h-3.5"
                    />
                    <span className="text-[11px] font-medium text-slate-700">Barcode</span>
                  </label>
                </div>

                {/* Footer Appreciation */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Footer Appreciation Note
                  </label>
                  <input
                    type="text"
                    value={settings.footerGreeting}
                    onChange={(e) => handleChange('footerGreeting', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-hidden transition-all"
                    placeholder="Thank you for visiting Richie Rich Pan House!"
                  />
                </div>

                {/* Policy Note */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Return / Hygiene Policy
                  </label>
                  <input
                    type="text"
                    value={settings.footerPolicy}
                    onChange={(e) => handleChange('footerPolicy', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-amber-400 focus:bg-white focus:outline-hidden transition-all"
                    placeholder="Fresh artisanal leaves prepared with royal hygiene. Exchange within 24h with bill."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Realistic Live Thermal Slip Preview & Diagnostic Actions (5 cols on Desktop) */}
        <div
          className={`lg:col-span-5 space-y-4 lg:sticky lg:top-2 self-start ${
            mobileTab !== 'preview' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Action Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleTestPrint}
              disabled={isTesting}
              className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isTesting ? 'Printing Test...' : 'Test Direct Print'}</span>
            </button>

            {settings.kickDrawer && (
              <button
                type="button"
                onClick={handleTestDrawer}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
                title="Test Drawer Kick Pulse"
              >
                <span>Kick Drawer</span>
              </button>
            )}

            {/* Quick 80mm / 58mm roll toggle */}
            <button
              type="button"
              onClick={() => handleChange('paperWidth', settings.paperWidth === '80mm' ? '58mm' : '80mm')}
              className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
              title="Toggle Paper Width"
            >
              {settings.paperWidth}
            </button>
          </div>

          {/* Thermal Receipt Paper Roll Container */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Live Thermal Slip Preview
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-mono font-bold border border-slate-200">
                  {settings.paperWidth}
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[9px] font-bold">
                  Live Sync
                </span>
              </div>
            </div>

            {/* Receipt Preview Canvas */}
            <div className="bg-slate-900/90 rounded-xl p-3 sm:p-4 flex justify-center overflow-x-auto shadow-inner">
              <div
                className={`bg-white text-slate-950 font-mono text-[11px] leading-snug p-3.5 select-none relative transition-all duration-200 border-t-4 border-dashed border-slate-300 border-b-4 mx-auto max-w-full ${
                  settings.paperWidth === '58mm' ? 'w-[230px] text-[10px]' : 'w-[290px]'
                }`}
                style={{
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                }}
              >
                {/* Store Header */}
                <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-2.5">
                  <div className="font-black text-sm uppercase tracking-wider text-slate-950">
                    {settings.headerTitle || '★ RICHIE RICH ★'}
                  </div>
                  {settings.headerTagline && (
                    <div className="text-[10px] font-bold text-slate-800 tracking-tight">
                      {settings.headerTagline}
                    </div>
                  )}
                  {settings.headerGstin && (
                    <div className="text-[9px] text-slate-600">
                      {settings.headerGstin} • Ph: {settings.headerPhone}
                    </div>
                  )}
                  {settings.headerAddress && (
                    <div className="text-[9px] text-slate-500">
                      {settings.headerAddress}
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="py-2 border-b border-dashed border-slate-300 text-[10px] space-y-0.5 text-slate-800">
                  <div className="flex justify-between font-bold">
                    <span>INVOICE: RR-2026-9041</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TIME: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>PAY: CASH</span>
                  </div>
                  {settings.showCashierAndCounter && (
                    <div className="flex justify-between text-slate-600">
                      <span>CASHIER: Rajesh Shah</span>
                      <span>STATION: Reg 01</span>
                    </div>
                  )}
                  {settings.showCustomerLoyalty && (
                    <div className="flex justify-between font-bold text-slate-900 pt-0.5">
                      <span>PATRON: Vikram Patel</span>
                      <span>*9882</span>
                    </div>
                  )}
                </div>

                {/* Sample Items Header */}
                <div className="py-1.5 border-b border-dashed border-slate-400 text-[10px] font-bold text-slate-700 flex justify-between">
                  <span>ITEM</span>
                  <span>QTY</span>
                  <span>AMT</span>
                </div>

                {/* Sample Items List */}
                <div className="py-1.5 space-y-1 border-b border-dashed border-slate-300 text-[10px]">
                  <div>
                    <div className="flex justify-between font-bold">
                      <span className="truncate">Shahi Maghai Meetha Paan</span>
                      <span>{CURRENCY}120.00</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>2 x {CURRENCY}60.00</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-bold">
                      <span className="truncate">Filter Cold Coffee 350ml</span>
                      <span>{CURRENCY}110.00</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>1 x {CURRENCY}110.00</span>
                    </div>
                  </div>
                </div>

                {/* Totals */}
                <div className="py-2 space-y-1 text-[10px] border-b border-dashed border-slate-400">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{CURRENCY}230.00</span>
                  </div>
                  {settings.showTaxBreakdown && (
                    <>
                      <div className="flex justify-between text-slate-600 text-[9px]">
                        <span>CGST (2.5%):</span>
                        <span>{CURRENCY}5.75</span>
                      </div>
                      <div className="flex justify-between text-slate-600 text-[9px]">
                        <span>SGST (2.5%):</span>
                        <span>{CURRENCY}5.75</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>Loyalty Savings:</span>
                    <span>-{CURRENCY}10.00</span>
                  </div>
                  <div className="flex justify-between font-black text-xs text-slate-950 pt-1 border-t border-slate-300">
                    <span>GRAND TOTAL:</span>
                    <span>{CURRENCY}231.50</span>
                  </div>
                </div>

                {/* Royalty Bonus */}
                {settings.showCustomerLoyalty && (
                  <div className="my-2 p-1.5 bg-amber-50 rounded border border-amber-200 text-center text-[9px] text-amber-900">
                    <div className="font-bold">+ 23 Royalty Points Earned!</div>
                    <div className="text-[8px] text-slate-600">Total Balance: 363 pts (Gold)</div>
                  </div>
                )}

                {/* Barcode / Invoice Identifier */}
                {settings.showBarcode && (
                  <div className="text-center pt-2 space-y-0.5">
                    <div className="font-mono text-[9px] tracking-widest text-slate-600">
                      ||| | ||||| || |||||| | |||
                    </div>
                    <div className="text-[8px] font-mono text-slate-500">
                      RR-2026-9041
                    </div>
                  </div>
                )}

                {/* Footer Notes */}
                <div className="text-center pt-2 space-y-0.5 text-slate-600">
                  {settings.footerGreeting && (
                    <div className="text-[9px] font-bold text-slate-800">
                      {settings.footerGreeting}
                    </div>
                  )}
                  {settings.footerPolicy && (
                    <div className="text-[8px] text-slate-500">
                      {settings.footerPolicy}
                    </div>
                  )}
                  <div className="text-[7px] text-slate-400 font-mono pt-1">
                    [ END OF RECEIPT • {settings.cutPaper ? 'PAPER CUT' : 'TEAR'} ]
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Mode: {settings.connectionType}</span>
              <span className={settings.directPrintEnabled ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                {settings.directPrintEnabled ? '● Direct Zero-Prompt' : '○ Prompt Dialog'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Toolbar (Scoped inside main content, never covers left sidebar!) */}
      <div className="sticky bottom-0 z-20 p-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-lg flex items-center justify-between gap-3 mt-4">
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 font-medium">
          <Printer className="w-4 h-4 text-amber-500" />
          <span>
            Thermal settings auto-apply to POS checkout slips.
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
          <button
            type="button"
            onClick={handleTestPrint}
            disabled={isTesting}
            className="flex-1 sm:flex-none py-2 px-3.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 text-amber-400 fill-current" />
            <span>{isTesting ? 'Printing...' : 'Test Print'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`flex-1 sm:flex-none py-2 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all ${
              isSaved ? 'bg-emerald-600 text-white' : 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black'
            }`}
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4 stroke-[2.5]" />}
            <span>{isSaved ? 'Saved!' : 'Save Setup'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
