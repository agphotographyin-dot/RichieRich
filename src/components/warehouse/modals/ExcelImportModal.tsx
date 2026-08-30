import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Layers,
  Sparkles,
  ShieldCheck,
  Check,
  Building,
  Wand2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Search,
  FileDown,
  Info,
  PackagePlus,
  Edit3,
} from 'lucide-react';
import { InventoryItem } from '../../../types';
import { storage } from '../../../services/storage';
import { soundEffects } from '../../../services/audio';
import {
  excelInventoryService,
  ExcelImportValidationResult,
  ColumnMapping,
} from '../../../services/excelInventoryService';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingInventory: InventoryItem[];
  onImportComplete: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  existingInventory,
  onImportComplete,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [validationResult, setValidationResult] = useState<ExcelImportValidationResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'new' | 'update' | 'fixed' | 'variable'>('all');
  const [previewSearch, setPreviewSearch] = useState('');
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'review' | 'success'>('upload');

  const [importSummary, setImportSummary] = useState<{
    imported: number;
    updated: number;
    total: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const parseFileBuffer = async (buffer: ArrayBuffer, sheetName?: string, customMap?: Partial<ColumnMapping>) => {
    setIsParsing(true);
    setParseError(null);
    try {
      const result = await excelInventoryService.parseAndValidateExcel(
        buffer,
        existingInventory,
        sheetName,
        customMap
      );
      setValidationResult(result);
      setActiveTab('review');
      if (result.validProducts.length > 0) {
        soundEffects.playClick();
      }
    } catch (err: any) {
      setParseError(err.message || 'Failed to read or parse the spreadsheet. Please check the file format.');
      setActiveTab('upload');
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = async (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setIsParsing(true);
    setParseError(null);
    setValidationResult(null);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        setFileBuffer(buffer);
        await parseFileBuffer(buffer);
      }
    };
    reader.onerror = () => {
      setParseError('Could not read the uploaded file.');
      setIsParsing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSheetChange = (newSheetName: string) => {
    if (!fileBuffer) return;
    parseFileBuffer(fileBuffer, newSheetName);
  };

  const handleColumnMappingChange = (key: keyof ColumnMapping, colIndex: number) => {
    if (!fileBuffer || !validationResult) return;
    const newMapping = { ...validationResult.columnMapping, [key]: colIndex };
    parseFileBuffer(fileBuffer, validationResult.selectedSheetName, newMapping);
  };

  const handleAutoFixAll = () => {
    if (!validationResult) return;
    const autoFixed = excelInventoryService.autoFixValidationResult(validationResult, existingInventory);
    setValidationResult(autoFixed);
    soundEffects.playSuccessJingle();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleExecuteImport = () => {
    if (!validationResult || validationResult.validProducts.length === 0) return;

    setIsImporting(true);
    try {
      const { importedCount, updatedCount } = storage.importInventoryBatch(
        validationResult.validProducts,
        { updateExisting }
      );

      setImportSummary({
        imported: importedCount,
        updated: updatedCount,
        total: importedCount + updatedCount,
      });

      setActiveTab('success');
      soundEffects.playSuccessJingle();
      onImportComplete();
    } catch (err: any) {
      setParseError(err.message || 'An error occurred while importing products.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileBuffer(null);
    setValidationResult(null);
    setParseError(null);
    setImportSummary(null);
    setActiveTab('upload');
    setShowColumnMapper(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Filtered preview products
  const previewProducts = (validationResult?.validProducts || []).filter((item) => {
    const matchesSearch =
      !previewSearch ||
      item.name.toLowerCase().includes(previewSearch.toLowerCase()) ||
      item.sku.toLowerCase().includes(previewSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(previewSearch.toLowerCase()) ||
      item.vendor.toLowerCase().includes(previewSearch.toLowerCase());

    if (!matchesSearch) return false;

    if (previewFilter === 'new') return !item.isUpdate;
    if (previewFilter === 'update') return item.isUpdate;
    if (previewFilter === 'fixed') return item.priceType === 'fixed';
    if (previewFilter === 'variable') return item.priceType === 'variable';

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Simple Excel / CSV Inventory Import
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  Smart Auto-Fix
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Upload catalog spreadsheets with automated column matching, vendor grouping & error-free recovery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Wizard Steps Navigation */}
        <div className="px-5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-1.5 font-bold ${
                activeTab === 'upload' ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Upload Spreadsheet</span>
            </div>

            <span className="text-slate-300">→</span>

            <div
              className={`flex items-center gap-1.5 font-bold ${
                activeTab === 'review' ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Smart Review & Auto-Fix</span>
            </div>

            <span className="text-slate-300">→</span>

            <div
              className={`flex items-center gap-1.5 font-bold ${
                activeTab === 'success' ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center text-[10px]">
                3
              </span>
              <span>Import Complete</span>
            </div>
          </div>

          {activeTab === 'review' && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
            >
              Upload Different File
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800">
          {/* STEP 3: Success Screen */}
          {activeTab === 'success' && importSummary && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4 animate-in zoom-in-95 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-extrabold text-lg text-emerald-950">
                  Master Inventory Successfully Updated!
                </h4>
                <p className="text-xs text-emerald-800 mt-1 max-w-md mx-auto">
                  All {importSummary.total} products have been safely saved into Central Warehouse & Stores. Ready for POS billing and Purchase Orders.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto pt-2">
                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-[11px] text-slate-500 block font-medium">Total Processed</span>
                  <span className="text-xl font-black text-slate-900">{importSummary.total}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-[11px] text-emerald-600 block font-medium">New Products Added</span>
                  <span className="text-xl font-black text-emerald-700">+{importSummary.imported}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                  <span className="text-[11px] text-amber-600 block font-medium">Existing SKUs Updated</span>
                  <span className="text-xl font-black text-amber-700">{importSummary.updated}</span>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-emerald-200">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer shadow-2xs"
                >
                  Import Another File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    excelInventoryService.exportInventory(storage.getInventory());
                  }}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  Download Backup Excel
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Done & View Master Inventory
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Upload Dropzone & Templates */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* File dropzone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/70 hover:bg-emerald-50/30 rounded-2xl p-8 text-center transition-all cursor-pointer group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>

                <h4 className="font-bold text-sm text-slate-800 group-hover:text-emerald-900">
                  Select or Drag & Drop any Excel (.xlsx, .xls) or CSV file
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Works with any sheet format from Tally, Busy, Marg, Shopify, or custom spreadsheets. Missing SKUs, categories, or prices are auto-corrected.
                </p>

                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-600 shadow-2xs">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Accepts .xlsx, .xls, .csv</span>
                </div>
              </div>

              {/* Parsing Spinner */}
              {isParsing && (
                <div className="py-6 text-center space-y-2">
                  <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Analyzing & Auto-Matching Spreadsheet Columns...</p>
                </div>
              )}

              {/* Parsing Error */}
              {parseError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-red-800 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Upload Notice</span>
                  </div>
                  <p className="text-xs text-red-700">{parseError}</p>
                </div>
              )}

              {/* Convenient Quick Download Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* 1. Blank Official Template */}
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Download className="w-5 h-5 text-emerald-700 shrink-0" />
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">Blank Excel Template</h5>
                      <p className="text-[11px] text-slate-600">Sample columns with guidelines</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => excelInventoryService.downloadTemplate()}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 text-xs font-bold rounded-lg border border-emerald-300 cursor-pointer transition-colors shadow-2xs"
                  >
                    Download
                  </button>
                </div>

                {/* 2. Current Catalog as Editable Template */}
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <FileDown className="w-5 h-5 text-amber-700 shrink-0" />
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">Edit Current Catalog</h5>
                      <p className="text-[11px] text-slate-600">Download current data to bulk edit</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => excelInventoryService.exportTemplateWithExistingData(existingInventory)}
                    className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg border border-amber-300 cursor-pointer transition-colors shadow-2xs"
                  >
                    Export Template
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Review, Auto-Fix & Columns */}
          {activeTab === 'review' && validationResult && (
            <div className="space-y-4">
              {/* Sheet & Auto-Fix Banner */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">{selectedFile?.name}</span>
                      {validationResult.availableSheets.length > 1 && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-600">
                          <span>Sheet:</span>
                          <select
                            value={validationResult.selectedSheetName}
                            onChange={(e) => handleSheetChange(e.target.value)}
                            className="p-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 cursor-pointer"
                          >
                            {validationResult.availableSheets.map((s) => (
                              <option key={s.name} value={s.name}>
                                {s.name} ({s.rowCount} rows)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Found <strong className="text-slate-800">{validationResult.validProducts.length}</strong> items ready to import.
                    </p>
                  </div>
                </div>

                {/* Auto-Fix or 100% Ready Status */}
                {validationResult.errorCount > 0 ? (
                  <button
                    type="button"
                    onClick={handleAutoFixAll}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors border border-amber-400"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>⚡ 1-Click Auto-Fix {validationResult.errorCount} Issues</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100/80 text-emerald-900 text-xs font-bold border border-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>100% Ready for Import</span>
                  </div>
                )}
              </div>

              {/* Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[10px] text-emerald-700 block font-medium">New Products</span>
                  <span className="text-lg font-black text-emerald-700">+{validationResult.newCount}</span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                  <span className="text-[10px] text-amber-700 block font-medium">Existing SKUs to Update</span>
                  <span className="text-lg font-black text-amber-700">{validationResult.updateCount}</span>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
                  <span className="text-[10px] text-purple-700 block font-medium">Auto-Adjusted Items</span>
                  <span className="text-lg font-black text-purple-700">
                    {validationResult.validProducts.filter((p) => p.wasAutoCorrected).length}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 block font-medium">Total Ready</span>
                  <span className="text-lg font-black text-slate-900">{validationResult.validProducts.length}</span>
                </div>
              </div>

              {/* Column Mapping Toggle & Drawer */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setShowColumnMapper(!showColumnMapper)}
                  className="w-full p-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                    <span>Auto-Matched Columns Inspector</span>
                    <span className="text-[10px] font-normal text-slate-500">(Click to view or adjust column assignments)</span>
                  </div>
                  {showColumnMapper ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showColumnMapper && (
                  <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {[
                      { key: 'nameCol', label: 'Product Name' },
                      { key: 'skuCol', label: 'SKU / Code' },
                      { key: 'categoryCol', label: 'Category' },
                      { key: 'sellCol', label: 'Selling Price (MRP)' },
                      { key: 'costCol', label: 'Purchase Cost' },
                      { key: 'stockCol', label: 'Stock Quantity' },
                      { key: 'vendorCol', label: 'Vendor / Supplier' },
                      { key: 'brandCol', label: 'Brand Name' },
                      { key: 'priceTypeCol', label: 'Price Type' },
                    ].map((col) => (
                      <div key={col.key}>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          {col.label}:
                        </label>
                        <select
                          value={(validationResult.columnMapping as any)[col.key] ?? -1}
                          onChange={(e) =>
                            handleColumnMappingChange(col.key as keyof ColumnMapping, Number(e.target.value))
                          }
                          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                        >
                          <option value={-1}>-- Not In Sheet (Auto Default) --</option>
                          {validationResult.rawHeaders.map((header, idx) => (
                            <option key={idx} value={idx}>
                              Col #{idx + 1}: {header || `Column ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Update Existing Checkbox */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-slate-600" />
                  <div>
                    <label className="font-bold text-slate-800 block cursor-pointer">
                      Update existing products if SKU matches
                    </label>
                    <span className="text-[10px] text-slate-500">
                      When enabled, matching catalog items will safely update prices, vendor tags, and stock.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="w-4 h-4 accent-slate-800 rounded-sm cursor-pointer"
                />
              </div>

              {/* Preview Search & Table */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-slate-600" />
                    <h4 className="font-bold text-xs text-slate-800">
                      Import Preview ({previewProducts.length} items shown)
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        placeholder="Search preview..."
                        value={previewSearch}
                        onChange={(e) => setPreviewSearch(e.target.value)}
                        className="pl-8 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs w-36 sm:w-48"
                      />
                    </div>

                    <select
                      value={previewFilter}
                      onChange={(e) => setPreviewFilter(e.target.value as any)}
                      className="p-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                    >
                      <option value="all">All Items</option>
                      <option value="new">New Items Only</option>
                      <option value="update">Updates Only</option>
                      <option value="fixed">Fixed Price</option>
                      <option value="variable">Variable Price</option>
                    </select>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Product Name</th>
                        <th className="py-2 px-3">SKU</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Vendor</th>
                        <th className="py-2 px-3">Price Type</th>
                        <th className="py-2 px-3 text-right">Cost (₹)</th>
                        <th className="py-2 px-3 text-right">Selling (₹)</th>
                        <th className="py-2 px-3 text-center">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {previewProducts.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 whitespace-nowrap">
                            {row.isUpdate ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold border border-amber-200">
                                Update
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold border border-emerald-200">
                                New Item
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900 max-w-[180px] truncate">
                            {row.name}
                            {row.wasAutoCorrected && (
                              <span className="ml-1 text-[9px] font-normal text-purple-600 bg-purple-50 px-1 rounded">
                                Auto-fixed
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 font-mono text-[10px] text-slate-500">
                            {row.sku}
                          </td>
                          <td className="py-2 px-3 text-slate-700">{row.category}</td>
                          <td className="py-2 px-3 text-slate-600 max-w-[130px] truncate">
                            {row.vendors.join(', ')}
                          </td>
                          <td className="py-2 px-3">
                            {row.priceType === 'variable' ? (
                              <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[9px] font-bold border border-purple-200">
                                Variable
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-bold border border-slate-200">
                                Fixed
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-slate-700">
                            ₹{row.costPrice.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">
                            {row.priceType === 'variable' ? (
                              <span className="text-purple-700">₹0 (POS entry)</span>
                            ) : (
                              `₹${row.sellingPrice.toFixed(2)}`
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-800">
                            {row.stockQuantity} {row.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer shadow-2xs"
          >
            Cancel
          </button>

          {activeTab === 'review' && validationResult && (
            <button
              type="button"
              disabled={isImporting || validationResult.validProducts.length === 0}
              onClick={handleExecuteImport}
              className="px-6 py-2.5 bg-[#1E293B] hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-2 transition-colors"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving into Master Inventory...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    Import {validationResult.validProducts.length} Products
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
