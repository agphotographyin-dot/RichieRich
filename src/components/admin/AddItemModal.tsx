import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Package,
  Sparkles,
  Image as ImageIcon,
  Trash2,
  Upload,
  Check,
  Percent,
  Scan,
  Camera,
  CheckCircle,
  Barcode as BarcodeIcon,
  Tag,
  Building,
} from 'lucide-react';
import { Category, InventoryItem } from '../../types';
import { CURRENCY, storage, normalizeProductCategory } from '../../services/storage';
import { warehouseStorage } from '../../services/warehouseStorage';
import { soundEffects } from '../../services/audio';
import { BarcodeVisualizer } from '../common/BarcodeVisualizer';
import { Html5Qrcode } from 'html5-qrcode';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

const SAMPLE_PHOTO_PRESETS = [
  { name: 'Royal Meetha Paan', url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80' },
  { name: 'Chocolate Fire Paan', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80' },
  { name: 'Fresh Espresso Coffee', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80' },
  { name: 'Cold Brew / Frappe', url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80' },
  { name: 'Silver Mukhwas', url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=600&auto=format&fit=crop&q=80' },
  { name: 'Luxury Confections', url: 'https://images.unsplash.com/photo-1548848221-0c2e497ed557?w=600&auto=format&fit=crop&q=80' },
];

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  categories,
}) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Richie Rich Signature');
  const [vendor, setVendor] = useState('Gujarat Betel Traders');
  const [priceType, setPriceType] = useState<'fixed' | 'variable'>('fixed');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState(categories[0]?.id || 'Paan');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState<number>(30);
  const [sellingPrice, setSellingPrice] = useState<number>(70);
  const [stockQuantity, setStockQuantity] = useState<number>(25);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);
  const [unit, setUnit] = useState('pieces');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80');
  const [isTaxApplicable, setIsTaxApplicable] = useState<boolean>(true);
  const [taxRate, setTaxRate] = useState<number>(5);
  const [ingredientsText, setIngredientsText] = useState('Betel Leaf, Gulkand, Cardamom, Dry Fruits');
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerElementId = 'add-item-camera-scanner-view';

  // Registered suppliers
  const suppliers = warehouseStorage.getSuppliers();

  // Initialize or reset state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      const defaultCat = categories[0]?.id || 'Paan';
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      const prefix = defaultCat.slice(0, 3).toUpperCase();
      
      setName('');
      setBrand('Richie Rich Signature');
      setVendor(suppliers[0]?.name || 'Gujarat Betel Traders');
      setPriceType('fixed');
      setStatus('active');
      setCategory(defaultCat);
      setSku(`${prefix}-${randomSuffix}`);
      setBarcode(`890100${randomSuffix}${Math.floor(10 + Math.random() * 90)}`);
      setDescription('');
      setCostPrice(30);
      setSellingPrice(70);
      setStockQuantity(25);
      setLowStockThreshold(10);
      setUnit('pieces');
      setImageUrl('https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80');
      setIsTaxApplicable(true);
      setTaxRate(5);
      setIngredientsText('Betel Leaf, Gulkand, Cardamom, Dry Fruits');
      setIsCameraScanning(false);
      setCameraError(null);
    } else {
      stopCamera();
    }
  }, [isOpen, categories]);

  const autoGenerateSkuBarcode = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const prefix = (category || 'ITEM').slice(0, 3).toUpperCase();
    setSku(`${prefix}-${randomSuffix.toString().slice(-3)}`);
    setBarcode(`890100${randomSuffix}`);
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
          qrbox: { width: 220, height: 160 },
        },
        (decodedText) => {
          soundEffects.playScanBeep();
          setBarcode(decodedText);
          stopCamera();
        },
        () => {}
      );
      setIsCameraScanning(true);
    } catch (err) {
      console.warn('Camera start error:', err);
      setCameraError('Camera access unavailable. You can enter or auto-generate the barcode.');
      setIsCameraScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && isCameraScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Camera stop error:', e);
      }
      setIsCameraScanning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setImageUrl('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    const ingredients = ingredientsText
      .split(',')
      .map((i) => i.trim())
      .filter(Boolean);

    const generatedSku = sku.trim() || `SKU-${Date.now().toString().slice(-4)}`;
    const generatedBarcode = barcode.trim() || `8901${Math.floor(10000 + Math.random() * 90000)}`;

    const initialStock = Number(stockQuantity) || 0;
    // Distribute across stores
    const storeAllocations = {
      gota: Math.round(initialStock * 0.4),
      bopal: Math.round(initialStock * 0.3),
      sindhubhavan: Math.round(initialStock * 0.15),
      sg_highway: Math.round(initialStock * 0.15),
    };

    storage.addInventoryItem({
      sku: generatedSku,
      barcode: generatedBarcode,
      name: name.trim(),
      brand: brand.trim() || undefined,
      vendor: vendor.trim() || undefined,
      vendors: vendor.trim() ? [vendor.trim()] : undefined,
      priceType,
      status,
      category: normalizeProductCategory(category),
      description: description.trim() || `${name} - Richie Rich Pan House master catalog product.`,
      costPrice: Number(costPrice) || 0,
      sellingPrice: priceType === 'variable' ? 0 : Number(sellingPrice) || 0,
      stockQuantity: initialStock,
      lowStockThreshold: Number(lowStockThreshold) || 5,
      unit: unit || 'pieces',
      imageUrl: imageUrl || '',
      isTaxApplicable,
      taxRate: isTaxApplicable ? Number(taxRate) : 0,
      isAvailableForOnline: true,
      ingredients: ingredients.length > 0 ? ingredients : ['Artisanal Spices', 'Premium Extract'],
      tags: ['New Arrival'],
      storeAllocations,
    });

    soundEffects.playSuccessJingle();
    stopCamera();
    onClose();
  };

  const profitPerUnit = sellingPrice - costPrice;
  const marginPercent = sellingPrice > 0 ? ((profitPerUnit / sellingPrice) * 100).toFixed(1) : '0';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Add New Store Inventory Item</h3>
              <p className="text-xs text-slate-500">Configure brand, vendor, retail pricing & tax applicability</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Product Name & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-700 font-bold">Product / SKU Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Royal Silver Chandi Paan"
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-700 font-bold">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Richie Rich Signature"
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400"
              />
            </div>
          </div>

          {/* Vendor Supplier & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-700 font-bold">Primary Vendor / Supplier</label>
              <input
                type="text"
                list="suppliers-modal-list"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g. Gujarat Betel Traders"
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400"
              />
              <datalist id="suppliers-modal-list">
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="text-xs text-slate-700 font-bold">Catalog Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400"
              >
                <option value="active">Active (POS & PO enabled)</option>
                <option value="inactive">Inactive (Archived)</option>
              </select>
            </div>
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-700 font-bold">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Non-Paan and non-Cafe products are automatically kept in Essentials.
              </span>
            </div>

            <div>
              <label className="text-xs text-slate-700 font-bold">Unit Type</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400"
              >
                <option value="pieces">pieces</option>
                <option value="jars">jars</option>
                <option value="pouches">pouches</option>
                <option value="bottles">bottles</option>
                <option value="glasses">glasses</option>
                <option value="boxes">boxes</option>
                <option value="packs">packs</option>
                <option value="grams">grams</option>
              </select>
            </div>
          </div>

          {/* SKU & Barcode with Live Barcode Registration */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-700 font-bold">SKU Code</label>
                  <button
                    type="button"
                    onClick={autoGenerateSkuBarcode}
                    className="text-[10px] text-amber-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Sparkles className="w-2.5 h-2.5" /> Auto Fill SKU
                  </button>
                </div>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. PAN-ROY-01"
                  className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-hidden focus:border-slate-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-700 font-bold">Barcode (Optical Scanner ID)</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => (isCameraScanning ? stopCamera() : startCamera())}
                      className="text-[10px] text-sky-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Camera className="w-2.5 h-2.5 text-sky-600" />
                      <span>{isCameraScanning ? 'Stop Camera' : 'Scan Packaging'}</span>
                    </button>
                  </div>
                </div>
                <div className="relative mt-1">
                  <BarcodeIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="e.g. 890100205"
                    className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3.5 py-2 text-xs text-slate-900 font-mono placeholder-slate-400 focus:outline-hidden focus:border-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Camera Viewport if scanning */}
            {isCameraScanning && (
              <div className="relative bg-black rounded-xl overflow-hidden min-h-[160px] p-2 flex flex-col items-center justify-center">
                <div id={scannerElementId} className="w-full max-w-xs rounded-lg overflow-hidden" />
                <p className="text-slate-300 text-[10px] mt-1.5">Point camera at product packaging barcode</p>
              </div>
            )}

            {cameraError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                {cameraError}
              </div>
            )}

            {/* Live Visualizer for Barcode */}
            {barcode.trim() && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Registered Barcode Preview:
                </span>
                <div className="bg-white px-2 py-1 rounded-md border border-slate-200">
                  <BarcodeVisualizer value={barcode.trim()} width={130} height={26} showText={true} />
                </div>
              </div>
            )}
          </div>

          {/* Price Type & Pricing Configuration */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div>
              <label className="text-xs text-slate-700 font-bold block mb-1">Pricing Model</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPriceType('fixed')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    priceType === 'fixed'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>Fixed Retail Price</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriceType('variable')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    priceType === 'variable'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Variable Price (POS Input)</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                {priceType === 'variable'
                  ? 'For loose / custom items (custom paan combos, weights) where cashier enters final price at checkout.'
                  : 'Standard catalog item with a fixed retail selling price.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-700 font-bold">Cost Price ({CURRENCY})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  className="w-full mt-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:border-slate-400 font-medium"
                />
              </div>
              <div>
                <label className="text-xs text-slate-700 font-bold">
                  Selling Price ({CURRENCY}) {priceType === 'variable' && '(Optional Estimate)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required={priceType !== 'variable'}
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  disabled={priceType === 'variable'}
                  placeholder={priceType === 'variable' ? 'Prompted at POS' : 'e.g. 70'}
                  className={`w-full mt-1 border rounded-xl px-3 py-2 text-xs font-bold ${
                    priceType === 'variable'
                      ? 'bg-slate-100 border-slate-200 text-slate-400'
                      : 'bg-white border-slate-200 text-slate-900 focus:outline-hidden focus:border-slate-400'
                  }`}
                />
              </div>
            </div>

            {priceType !== 'variable' && (
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-medium">Net Profit Margin:</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">+{CURRENCY}{profitPerUnit.toFixed(2)}/unit</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[11px] border border-emerald-200">
                    {marginPercent}% Margin
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* TAX APPLICABLE ON BILL SETTING & GST RATE PERCENTAGE */}
          {/* ========================================================= */}
          <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Percent className="w-3.5 h-3.5" />
                </div>
                <div>
                  <label className="text-xs text-slate-900 font-bold block">
                    Is Tax on the Bill Applicable for this Product?
                  </label>
                  <p className="text-[11px] text-slate-600">
                    Determines whether GST is charged or if this item is 0% tax-exempt.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                  isTaxApplicable
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-slate-200 text-slate-700 border-slate-300'
                }`}
              >
                {isTaxApplicable ? `${taxRate}% GST Applicable` : 'Tax Exempt (0% Tax)'}
              </span>
            </div>

            {/* Toggle Options */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsTaxApplicable(true);
                  if (taxRate === 0) setTaxRate(5);
                }}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isTaxApplicable
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${isTaxApplicable ? 'opacity-100' : 'opacity-0'}`} />
                <span>Yes, Tax Applicable</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsTaxApplicable(false);
                  setTaxRate(0);
                }}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  !isTaxApplicable
                    ? 'bg-[#1E293B] text-white border-slate-800 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Check className={`w-3.5 h-3.5 ${!isTaxApplicable ? 'opacity-100' : 'opacity-0'}`} />
                <span>No, Tax Exempt (0%)</span>
              </button>
            </div>

            {/* GST Percentage Rate Selector when Tax is Applicable */}
            {isTaxApplicable && (
              <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-800 font-bold">
                    GST Rate Percentage (%):
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Math.max(0, Number(e.target.value)))}
                      className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right font-extrabold text-slate-900 focus:outline-hidden focus:border-amber-400"
                    />
                    <span className="text-xs font-bold text-slate-700">%</span>
                  </div>
                </div>

                {/* Preset Rates */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-semibold">Standard GST Slabs:</span>
                  {[5, 12, 18, 28].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setTaxRate(rate)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        taxRate === rate
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {rate}% GST
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-600 bg-white/70 p-2 rounded-lg border border-slate-200/60">
              ℹ️ {isTaxApplicable
                ? `Calculates ${taxRate}% GST (SGST ${(taxRate / 2).toFixed(1)}% + CGST ${(taxRate / 2).toFixed(1)}%) on customer invoice.`
                : 'Tax will NOT be applicable on this product. The line item will be charged at 0% tax.'}
            </p>
          </div>

          {/* ========================================================= */}
          {/* PRODUCT / SKU PHOTO MANAGER & REMOVE PHOTO FEATURE */}
          {/* ========================================================= */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-700" />
                <label className="text-xs text-slate-900 font-bold">Product / SKU Photo</label>
              </div>

              {imageUrl ? (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold rounded-lg border border-red-200 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Remove Photo
                </button>
              ) : (
                <span className="text-[10px] text-slate-500 font-medium italic">No photo attached</span>
              )}
            </div>

            {/* Photo Preview or Empty State */}
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <div className="relative group shrink-0">
                  <img
                    src={imageUrl}
                    alt="Product preview"
                    className="w-16 h-16 rounded-xl object-cover border-2 border-amber-400/60 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    title="Remove Photo"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-xs cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-200/80 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 text-[10px] shrink-0">
                  <Package className="w-5 h-5 mb-0.5 text-slate-400" />
                  <span>No Photo</span>
                </div>
              )}

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-2xs">
                    <Upload className="w-3 h-3 text-slate-600" />
                    <span>Upload Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-xs text-red-600 hover:underline font-medium cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Or paste image URL (https://...)"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-400"
                />
              </div>
            </div>

            {/* Quick Preset Photos */}
            <div className="pt-1">
              <span className="text-[10px] font-bold text-slate-500 block mb-1.5">Quick Presets:</span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {SAMPLE_PHOTO_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImageUrl(preset.url)}
                    className="shrink-0 p-1 bg-white border border-slate-200 hover:border-amber-400 rounded-lg flex items-center gap-1 text-[10px] text-slate-700 cursor-pointer shadow-2xs"
                  >
                    <img src={preset.url} alt={preset.name} className="w-4 h-4 rounded-md object-cover" />
                    <span className="truncate max-w-[90px]">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stock & Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-700 font-bold">Initial Stock Quantity</label>
              <input
                type="number"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(Number(e.target.value))}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-hidden focus:bg-white focus:border-slate-400"
              />
            </div>
            <div>
              <label className="text-xs text-slate-700 font-bold">Low-Stock Alert Threshold</label>
              <input
                type="number"
                required
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-hidden focus:bg-white focus:border-slate-400"
              />
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <label className="text-xs text-slate-700 font-bold">Ingredients / Flavor Profile</label>
            <input
              type="text"
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              placeholder="Separated by comma"
              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-slate-700 font-bold">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Delicious royal delight crafted with artisanal ingredients..."
              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400"
            />
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1E293B] hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" /> Save to Inventory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
