import * as XLSX from 'xlsx';
import { InventoryItem } from '../types';
import { normalizeProductCategory } from './storage';

export interface ColumnMapping {
  nameCol: number;
  skuCol: number;
  categoryCol: number;
  brandCol: number;
  vendorCol: number;
  priceTypeCol: number;
  costCol: number;
  sellCol: number;
  stockCol: number;
  unitCol: number;
  taxAppCol: number;
  gstRateCol: number;
  lowStockCol: number;
  statusCol: number;
  barcodeCol: number;
  descCol: number;
}

export interface SheetInfo {
  name: string;
  rowCount: number;
  colCount: number;
  headerRowIndex: number;
  detectedHeaders: string[];
}

export interface ExcelImportValidationResult {
  totalFound: number;
  validProducts: ParsedInventoryRow[];
  newCount: number;
  updateCount: number;
  skippedCount: number;
  errorCount: number;
  warningsCount: number;
  availableSheets: SheetInfo[];
  selectedSheetName: string;
  columnMapping: ColumnMapping;
  rawHeaders: string[];
  errors: Array<{
    rowNumber: number;
    itemName: string;
    field: string;
    message: string;
    canAutoFix?: boolean;
  }>;
  warnings: Array<{
    rowNumber: number;
    itemName: string;
    message: string;
    autoFixed?: boolean;
  }>;
}

export interface ParsedInventoryRow {
  rowNumber: number;
  isUpdate: boolean;
  existingId?: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  vendors: string[];
  vendor: string;
  priceType: 'fixed' | 'variable';
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockThreshold: number;
  unit: string;
  isTaxApplicable: boolean;
  taxRate: number;
  status: 'active' | 'inactive';
  description: string;
  imageUrl?: string;
  wasAutoCorrected?: boolean;
  correctionNotes?: string[];
}

/**
 * Intelligent category guesser based on product keywords
 */
function inferCategoryFromName(name: string): 'Paan' | 'Cafe' | 'Essentials' {
  const lower = name.toLowerCase();
  if (
    lower.includes('paan') ||
    lower.includes('pan') ||
    lower.includes('maghai') ||
    lower.includes('banarasi') ||
    lower.includes('calcutta') ||
    lower.includes('gulkand') ||
    lower.includes('betel') ||
    lower.includes('vark') ||
    lower.includes('meetha') ||
    lower.includes('sadha') ||
    lower.includes('sada') ||
    lower.includes('chocolate fire')
  ) {
    return 'Paan';
  }
  if (
    lower.includes('cafe') ||
    lower.includes('café') ||
    lower.includes('coffee') ||
    lower.includes('espresso') ||
    lower.includes('latte') ||
    lower.includes('cappuccino') ||
    lower.includes('shake') ||
    lower.includes('falooda') ||
    lower.includes('tea') ||
    lower.includes('chai') ||
    lower.includes('frappe') ||
    lower.includes('beverage') ||
    lower.includes('drink') ||
    lower.includes('smoothie')
  ) {
    return 'Cafe';
  }
  // Any product other than Paan or Cafe is automatically kept in Essentials
  return 'Essentials';
}

/**
 * Clean & parse numeric values safely (handles ₹, $, commas, /- etc.)
 */
function cleanNumber(val: any, fallback: number = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const str = String(val).replace(/[₹$Rs.,\s]/gi, '').replace(/\/-$/, '').trim();
  const parsed = parseFloat(str);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Service to handle Master Inventory Excel Import, Export, and Template Generation.
 */
export const excelInventoryService = {
  /**
   * Downloads an official Excel Template for Master Inventory
   */
  downloadTemplate(): void {
    const templateHeaders = [
      'Product Name',
      'SKU / Product Code',
      'Category',
      'Brand',
      'Vendor / Supplier',
      'Price Type',
      'Purchase Price',
      'Selling Price',
      'Current Stock',
      'Unit',
      'Tax / GST Applicable',
      'GST Rate (%)',
      'Low Stock Threshold',
      'Product Status',
      'Barcode',
      'Description',
    ];

    const sampleRows = [
      [
        'Royal Maghai Meetha Paan',
        'PAN-MAG-01',
        'Paan',
        'Richie Rich Signature',
        'Gujarat Betel Traders, Royal Fragrance Works',
        'Fixed Price',
        20,
        45,
        100,
        'pieces',
        'Yes',
        5,
        15,
        'Active',
        '890100101',
        'Fresh Betel Leaf, Gulkand, Cardamom & Saffron dry fruits',
      ],
      [
        'Signature Chocolate Fire Paan',
        'PAN-CHOC-02',
        'Paan',
        'Richie Rich Signature',
        'Gujarat Betel Traders',
        'Fixed Price',
        30,
        70,
        60,
        'pieces',
        'Yes',
        5,
        10,
        'Active',
        '890100102',
        'Swiss dark cocoa, flamed clove, crushed roasted almonds',
      ],
      [
        'Custom Royal Gift Hamper (Assorted)',
        'HAMPER-CUST-01',
        'Paan',
        'Richie Rich Royal Club',
        'Royal Luxury Packaging, Shreeji Spices',
        'Variable Price',
        150,
        0,
        25,
        'boxes',
        'Yes',
        5,
        5,
        'Active',
        '890100501',
        'Customized curated luxury paan & silver mukhwas hamper (Price entered at POS)',
      ],
      [
        'Royal Dark Roast Espresso Double Shot',
        'CAF-ESP-01',
        'Cafe',
        'Artisanal Roast Co.',
        'Apex Cafe & Beverage Distributors',
        'Fixed Price',
        25,
        90,
        80,
        'glasses',
        'Yes',
        5,
        20,
        'Active',
        '890100201',
        '100% Arabica fresh ground beans, intense crema extraction',
      ],
      [
        'Royal Rajwadi Shahi Mukhwas (200g Jar)',
        'ESS-MUK-01',
        'Essentials',
        'Shreeji Artisanal',
        'Shreeji Spices & Supari',
        'Fixed Price',
        55,
        120,
        45,
        'jars',
        'No',
        0,
        10,
        'Active',
        '890100301',
        'Silver vark coated roasted seeds, menthol crystals, dry dates (Tax Exempt)',
      ],
      [
        'Custom Curated Paan Box (Special Request)',
        'CUST-BOX-02',
        'Paan',
        'Richie Rich Signature',
        'Gujarat Betel Traders',
        'Variable Price',
        50,
        0,
        30,
        'boxes',
        'Yes',
        5,
        5,
        'Active',
        '890100502',
        'Custom salesperson configured packaging (Variable Price)',
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([templateHeaders, ...sampleRows]);

    ws['!cols'] = [
      { wch: 32 }, // Product Name
      { wch: 18 }, // SKU
      { wch: 14 }, // Category
      { wch: 22 }, // Brand
      { wch: 36 }, // Vendor/Supplier
      { wch: 16 }, // Price Type
      { wch: 16 }, // Purchase Price
      { wch: 16 }, // Selling Price
      { wch: 14 }, // Current Stock
      { wch: 12 }, // Unit
      { wch: 20 }, // Tax Applicable
      { wch: 14 }, // GST Rate
      { wch: 18 }, // Low Stock Threshold
      { wch: 16 }, // Product Status
      { wch: 16 }, // Barcode
      { wch: 45 }, // Description
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Template');

    // Instructions sheet
    const guideHeaders = ['Field Name', 'Mandatory / Optional', 'Accepted Values / Format', 'Description & Business Rules'];
    const guideRows = [
      ['Product Name', 'MANDATORY', 'Text (e.g. Royal Meetha Paan)', 'Full descriptive name of the product'],
      ['SKU / Product Code', 'OPTIONAL', 'Alphanumeric (e.g. PAN-001)', 'Unique SKU code. If left blank, system auto-generates one.'],
      ['Category', 'OPTIONAL', 'Paan, Cafe, Essentials', 'Category (Paan, Cafe, or Essentials. Any other category is auto-kept in Essentials)'],
      ['Brand', 'OPTIONAL', 'Text (e.g. Richie Rich Signature)', 'Brand or manufacturer name'],
      ['Vendor / Supplier', 'OPTIONAL', 'Single or Comma Separated', 'Suppliers who provide this item. Used for Vendor-based PO filtering.'],
      ['Price Type', 'OPTIONAL', 'Fixed Price OR Variable Price', 'Fixed uses preset price. Variable allows entering price during billing at POS.'],
      ['Purchase Price', 'OPTIONAL', 'Number (e.g. 25)', 'Cost/Purchase price per unit in INR (₹)'],
      ['Selling Price', 'OPTIONAL', 'Number (e.g. 60)', 'Selling price. Can be 0 or blank for Variable Price.'],
      ['Current Stock', 'OPTIONAL', 'Number (default 0)', 'Initial stock quantity in Central Warehouse'],
      ['Unit', 'OPTIONAL', 'pieces, boxes, jars, bottles, grams', 'Unit of measurement (defaults to pieces)'],
      ['Tax / GST Applicable', 'OPTIONAL', 'Yes / No (default Yes)', 'Set to No if the product is 0% GST Tax Exempt'],
      ['GST Rate (%)', 'OPTIONAL', '0, 5, 12, 18, 28 (default 5)', 'Tax percentage if Tax Applicable is Yes'],
      ['Low Stock Threshold', 'OPTIONAL', 'Number (default 10)', 'Safety alert threshold for re-order notifications'],
      ['Product Status', 'OPTIONAL', 'Active / Inactive (default Active)', 'Active or Inactive in catalog'],
      ['Barcode', 'OPTIONAL', 'Numeric code (e.g. 890100101)', 'Optical barcode. Auto-generated if blank.'],
      ['Description', 'OPTIONAL', 'Text', 'Product description or flavor profile'],
    ];

    const guideWs = XLSX.utils.aoa_to_sheet([guideHeaders, ...guideRows]);
    guideWs['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 35 }, { wch: 55 }];
    XLSX.utils.book_append_sheet(wb, guideWs, 'Import Guidelines');

    XLSX.writeFile(wb, 'Richie_Rich_Master_Inventory_Template.xlsx');
  },

  /**
   * Exports the entire Master Inventory to an Excel workbook (.xlsx)
   */
  exportInventory(inventory: InventoryItem[]): void {
    const exportHeaders = [
      'Product Name',
      'SKU / Product Code',
      'Category',
      'Brand',
      'Vendor / Supplier',
      'Price Type',
      'Purchase Price (₹)',
      'Selling Price (₹)',
      'Current Stock',
      'Unit',
      'Tax / GST',
      'Low Stock Safety Level',
      'Product Status',
      'Barcode',
      'Gross Profit (₹)',
      'Gross Margin (%)',
      'Total Valuation (₹)',
      'Description',
    ];

    const dataRows = inventory.map((item) => {
      const isVariable = item.priceType === 'variable';
      const profit = isVariable ? 0 : item.profitPerUnit || (item.sellingPrice - item.costPrice);
      const margin = isVariable
        ? 'Variable'
        : `${item.marginPercentage || (item.sellingPrice > 0 ? Math.round(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100) : 0)}%`;

      const vendorDisplay =
        (item.vendors && item.vendors.length > 0 ? item.vendors.join(', ') : item.vendor) || 'Central Supply';

      const taxDisplay = item.isTaxApplicable !== false ? `${item.taxRate ?? 5}% GST` : '0% Exempt';

      return [
        item.name,
        item.sku,
        item.category,
        item.brand || 'Richie Rich Signature',
        vendorDisplay,
        isVariable ? 'Variable Price' : 'Fixed Price',
        item.costPrice,
        isVariable ? 0 : item.sellingPrice,
        item.stockQuantity,
        item.unit || 'pieces',
        taxDisplay,
        item.lowStockThreshold || 5,
        item.status === 'inactive' ? 'Inactive' : 'Active',
        item.barcode || '',
        profit,
        margin,
        item.stockQuantity * item.costPrice,
        item.description || '',
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([exportHeaders, ...dataRows]);

    ws['!cols'] = [
      { wch: 32 }, // Product Name
      { wch: 16 }, // SKU
      { wch: 14 }, // Category
      { wch: 22 }, // Brand
      { wch: 34 }, // Vendor/Supplier
      { wch: 16 }, // Price Type
      { wch: 18 }, // Purchase Price
      { wch: 18 }, // Selling Price
      { wch: 14 }, // Current Stock
      { wch: 12 }, // Unit
      { wch: 14 }, // Tax/GST
      { wch: 20 }, // Low Stock
      { wch: 14 }, // Status
      { wch: 16 }, // Barcode
      { wch: 16 }, // Profit
      { wch: 16 }, // Margin
      { wch: 22 }, // Valuation
      { wch: 45 }, // Description
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Master Inventory');

    // Add Summary sheet
    const totalValuation = inventory.reduce((sum, i) => sum + i.stockQuantity * i.costPrice, 0);
    const totalUnits = inventory.reduce((sum, i) => sum + i.stockQuantity, 0);
    const variableCount = inventory.filter((i) => i.priceType === 'variable').length;
    const lowStockCount = inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold).length;

    const summaryData = [
      ['Metric', 'Value'],
      ['Total SKUs in Master Catalog', inventory.length],
      ['Total Stock Units across Network', totalUnits],
      ['Total Inventory Valuation (Cost/FIFO)', `₹${totalValuation.toLocaleString('en-IN')}`],
      ['Fixed Price Products', inventory.length - variableCount],
      ['Variable Price Products', variableCount],
      ['Low Stock SKUs Requiring Re-order', lowStockCount],
      ['Export Date & Time', new Date().toLocaleString()],
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 35 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary & Valuation');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Richie_Rich_Master_Inventory_${dateStr}.xlsx`);
  },

  /**
   * Exports Catalog as a pre-populated Excel template ready for direct bulk edits & re-upload
   */
  exportTemplateWithExistingData(inventory: InventoryItem[]): void {
    const headers = [
      'Product Name',
      'SKU / Product Code',
      'Category',
      'Brand',
      'Vendor / Supplier',
      'Price Type',
      'Purchase Price',
      'Selling Price',
      'Current Stock',
      'Unit',
      'Tax / GST Applicable',
      'GST Rate (%)',
      'Low Stock Threshold',
      'Product Status',
      'Barcode',
      'Description',
    ];

    const dataRows = inventory.map((item) => [
      item.name,
      item.sku,
      item.category,
      item.brand || 'Richie Rich Signature',
      (item.vendors && item.vendors.length > 0 ? item.vendors.join(', ') : item.vendor) || 'Central Supply',
      item.priceType === 'variable' ? 'Variable Price' : 'Fixed Price',
      item.costPrice,
      item.priceType === 'variable' ? 0 : item.sellingPrice,
      item.stockQuantity,
      item.unit || 'pieces',
      item.isTaxApplicable !== false ? 'Yes' : 'No',
      item.taxRate ?? 5,
      item.lowStockThreshold || 10,
      item.status === 'inactive' ? 'Inactive' : 'Active',
      item.barcode || '',
      item.description || '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws['!cols'] = [
      { wch: 32 },
      { wch: 18 },
      { wch: 14 },
      { wch: 22 },
      { wch: 36 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
      { wch: 20 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
      { wch: 16 },
      { wch: 45 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Catalog Edit Template');

    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Richie_Rich_Catalog_Edit_Template_${dateStr}.xlsx`);
  },

  /**
   * Exports plain CSV format
   */
  exportInventoryCSV(inventory: InventoryItem[]): void {
    const headers = [
      'Product Name',
      'SKU',
      'Category',
      'Brand',
      'Vendor',
      'Price Type',
      'Cost Price',
      'Selling Price',
      'Current Stock',
      'Unit',
      'GST Rate',
      'Status',
      'Barcode',
    ];

    const rows = inventory.map((item) => [
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${item.sku || ''}"`,
      `"${item.category || ''}"`,
      `"${item.brand || ''}"`,
      `"${(item.vendor || '').replace(/"/g, '""')}"`,
      item.priceType || 'fixed',
      item.costPrice || 0,
      item.sellingPrice || 0,
      item.stockQuantity || 0,
      item.unit || 'pieces',
      item.taxRate ?? 5,
      item.status || 'active',
      `"${item.barcode || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Richie_Rich_Inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  },

  /**
   * Helper to inspect workbook sheets and find best candidate sheet
   */
  inspectWorkbook(wb: XLSX.WorkBook): SheetInfo[] {
    return wb.SheetNames.map((name) => {
      const sheet = wb.Sheets[name];
      if (!sheet) return { name, rowCount: 0, colCount: 0, headerRowIndex: 0, detectedHeaders: [] };
      const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      let headerRowIndex = 0;
      let detectedHeaders: string[] = [];

      for (let r = 0; r < Math.min(rawData.length, 10); r++) {
        const row = rawData[r] || [];
        const matches = row.filter((cell: any) => {
          if (typeof cell !== 'string') return false;
          const lower = cell.toLowerCase().trim();
          return (
            lower.includes('product') ||
            lower.includes('item') ||
            lower.includes('name') ||
            lower.includes('sku') ||
            lower.includes('code') ||
            lower.includes('price') ||
            lower.includes('rate') ||
            lower.includes('mrp') ||
            lower.includes('stock') ||
            lower.includes('qty')
          );
        });

        if (matches.length >= 2 || (matches.length >= 1 && row.length >= 2)) {
          headerRowIndex = r;
          detectedHeaders = row.map((h: any) => String(h).trim());
          break;
        }
      }

      return {
        name,
        rowCount: rawData.length,
        colCount: rawData[0]?.length || 0,
        headerRowIndex,
        detectedHeaders,
      };
    });
  },

  /**
   * Smart column index finder with broad alias dictionary
   */
  detectColumnIndices(headers: string[]): ColumnMapping {
    const cleanHeaders = headers.map((h) => h.toLowerCase().trim());

    const findCol = (...keywords: string[]): number => {
      // 1. Exact match
      for (const kw of keywords) {
        const exact = cleanHeaders.findIndex((h) => h === kw.toLowerCase());
        if (exact >= 0) return exact;
      }
      // 2. Contains match
      for (const kw of keywords) {
        const idx = cleanHeaders.findIndex((h) => h.includes(kw.toLowerCase()));
        if (idx >= 0) return idx;
      }
      return -1;
    };

    return {
      nameCol: findCol('product name', 'item name', 'product', 'item', 'title', 'particulars', 'item description', 'dish', 'article name', 'name'),
      skuCol: findCol('sku / product code', 'sku', 'product code', 'item code', 'code', 'item id', 'product id', 'article no', 'part number', 'model no', 'item no'),
      categoryCol: findCol('category', 'dept', 'department', 'group', 'classification', 'type', 'cat', 'sub category'),
      brandCol: findCol('brand', 'make', 'manufacturer', 'company', 'mfg', 'brand name'),
      vendorCol: findCol('vendor / supplier', 'vendor', 'supplier', 'distributor', 'party name', 'party', 'source'),
      priceTypeCol: findCol('price type', 'variable price setting', 'variable', 'pricing type', 'price_type'),
      costCol: findCol('purchase price', 'cost price', 'cost', 'purchase rate', 'buy price', 'buying rate', 'cp', 'purchase', 'buying price'),
      sellCol: findCol('selling price', 'retail price', 'sale price', 'mrp', 'rate', 'sale rate', 'selling rate', 'sp', 'unit price', 'price'),
      stockCol: findCol('current stock', 'stock quantity', 'stock', 'qty', 'quantity', 'opening stock', 'closing stock', 'bal qty', 'in stock', 'count', 'units'),
      unitCol: findCol('unit', 'uom', 'measurement', 'packing', 'pack', 'measure'),
      taxAppCol: findCol('tax / gst applicable', 'tax applicable', 'tax / gst', 'gst applicable', 'is taxable', 'taxable', 'gst'),
      gstRateCol: findCol('gst rate (%)', 'gst rate', 'tax rate (%)', 'tax rate', 'gst %', 'tax %', 'gst', 'igst', 'cgst'),
      lowStockCol: findCol('low stock threshold', 'low stock', 'min threshold', 'safety level', 'reorder level', 'min stock', 'minimum level'),
      statusCol: findCol('product status', 'status', 'active / inactive', 'active', 'state'),
      barcodeCol: findCol('barcode', 'bar code', 'upc', 'ean', 'qr code', 'scan code'),
      descCol: findCol('description', 'notes', 'details', 'remarks', 'specification'),
    };
  },

  /**
   * Parses raw file or array buffer with zero-friction auto-recovery
   */
  async parseAndValidateExcel(
    file: File | ArrayBuffer,
    existingInventory: InventoryItem[],
    targetSheetName?: string,
    customMapping?: Partial<ColumnMapping>
  ): Promise<ExcelImportValidationResult> {
    return new Promise((resolve, reject) => {
      const processBuffer = (buffer: ArrayBuffer) => {
        try {
          const wb = XLSX.read(buffer, { type: 'array' });
          if (!wb.SheetNames || wb.SheetNames.length === 0) {
            throw new Error('The uploaded file does not contain any readable sheets.');
          }

          const sheetInfos = this.inspectWorkbook(wb);

          // Find the best sheet (one with highest data row count or matching targetSheetName)
          let activeSheetName = targetSheetName || '';
          if (!activeSheetName || !wb.Sheets[activeSheetName]) {
            const sortedSheets = [...sheetInfos].sort((a, b) => b.rowCount - a.rowCount);
            activeSheetName = sortedSheets[0]?.name || wb.SheetNames[0];
          }

          const ws = wb.Sheets[activeSheetName];
          if (!ws) {
            throw new Error(`Sheet "${activeSheetName}" could not be opened.`);
          }

          const rawData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          if (rawData.length === 0) {
            throw new Error(`Sheet "${activeSheetName}" is empty.`);
          }

          // Locate header row
          const activeSheetInfo = sheetInfos.find((s) => s.name === activeSheetName);
          let headerRowIndex = activeSheetInfo?.headerRowIndex ?? 0;

          // If headerRowIndex looks invalid, search first 10 rows
          if (headerRowIndex === 0 && rawData.length > 1) {
            for (let r = 0; r < Math.min(rawData.length, 10); r++) {
              const row = rawData[r] || [];
              const hasKeyTerms = row.some((c: any) => {
                if (typeof c !== 'string') return false;
                const low = c.toLowerCase();
                return low.includes('name') || low.includes('product') || low.includes('sku') || low.includes('item') || low.includes('price');
              });
              if (hasKeyTerms) {
                headerRowIndex = r;
                break;
              }
            }
          }

          const rawHeaders = (rawData[headerRowIndex] || []).map((h: any) => String(h).trim());
          const defaultMapping = this.detectColumnIndices(rawHeaders);
          const colMap: ColumnMapping = { ...defaultMapping, ...customMapping };

          const dataRows = rawData.slice(headerRowIndex + 1);

          const errors: ExcelImportValidationResult['errors'] = [];
          const warnings: ExcelImportValidationResult['warnings'] = [];
          const validProducts: ParsedInventoryRow[] = [];

          let newCount = 0;
          let updateCount = 0;
          let skippedCount = 0;

          // Lookup map for existing catalog
          const existingSkuMap = new Map<string, InventoryItem>();
          const existingNameMap = new Map<string, InventoryItem>();
          const existingBarcodeMap = new Map<string, InventoryItem>();

          existingInventory.forEach((item) => {
            if (item.sku) existingSkuMap.set(item.sku.trim().toLowerCase(), item);
            if (item.name) existingNameMap.set(item.name.trim().toLowerCase(), item);
            if (item.barcode) existingBarcodeMap.set(item.barcode.trim().toLowerCase(), item);
          });

          // Duplicate tracking within current file
          const seenSkusInFile = new Map<string, number>();

          dataRows.forEach((row, idx) => {
            const rowNumber = headerRowIndex + 2 + idx;

            // Check if entire row is truly blank or just empty strings
            const isEmptyRow = row.every((c: any) => c === '' || c === null || c === undefined || String(c).trim() === '');
            if (isEmptyRow) {
              skippedCount++;
              return;
            }

            // Check for potential summary/footer rows (e.g. "Total", "Grand Total", "Count:")
            const firstCellStr = String(row[0] || '').trim().toLowerCase();
            if (firstCellStr.startsWith('total') || firstCellStr.startsWith('grand total') || firstCellStr.startsWith('subtotal') || firstCellStr.startsWith('count:')) {
              skippedCount++;
              return;
            }

            const correctionNotes: string[] = [];
            let wasAutoCorrected = false;

            // 1. PRODUCT NAME
            let rawName = colMap.nameCol >= 0 ? String(row[colMap.nameCol] || '').trim() : '';

            // If name is blank but we have an SKU or price, try to auto-construct a name
            if (!rawName) {
              const fallbackSku = colMap.skuCol >= 0 ? String(row[colMap.skuCol] || '').trim() : '';
              if (fallbackSku) {
                rawName = `Product ${fallbackSku}`;
                wasAutoCorrected = true;
                correctionNotes.push(`Name was blank; auto-assigned "${rawName}"`);
              } else {
                // Check if any other text cell exists in row
                const textCells = row.filter((c: any) => typeof c === 'string' && c.trim().length > 2);
                if (textCells.length > 0) {
                  rawName = String(textCells[0]).trim();
                  wasAutoCorrected = true;
                  correctionNotes.push(`Name was blank; used "${rawName}"`);
                } else {
                  errors.push({
                    rowNumber,
                    itemName: `Row #${rowNumber}`,
                    field: 'Product Name',
                    message: 'Product Name is missing on this row.',
                    canAutoFix: true,
                  });
                  return;
                }
              }
            }

            // 2. CATEGORY (Strict standard: Paan, Cafe, or Essentials; any other category is auto-kept in Essentials)
            let rawCat = colMap.categoryCol >= 0 ? String(row[colMap.categoryCol] || '').trim() : '';
            if (!rawCat) {
              rawCat = inferCategoryFromName(rawName);
              wasAutoCorrected = true;
              correctionNotes.push(`Category auto-detected as "${rawCat}"`);
            } else {
              const originalCat = rawCat;
              rawCat = normalizeProductCategory(rawCat);
              if (originalCat.trim().toLowerCase() !== rawCat.toLowerCase()) {
                wasAutoCorrected = true;
                correctionNotes.push(`Category "${originalCat}" auto-mapped to "${rawCat}" (Products outside Paan or Cafe default to Essentials)`);
              }
            }

            // 3. SKU
            let rawSku = colMap.skuCol >= 0 ? String(row[colMap.skuCol] || '').trim() : '';
            if (!rawSku) {
              const prefix = rawCat.slice(0, 3).toUpperCase();
              const nameClean = rawName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
              rawSku = `${prefix}-${nameClean || 'ITM'}-${Math.floor(100 + Math.random() * 900)}`;
              wasAutoCorrected = true;
              correctionNotes.push(`SKU auto-generated as "${rawSku}"`);
              warnings.push({
                rowNumber,
                itemName: rawName,
                message: `Auto-generated SKU "${rawSku}"`,
                autoFixed: true,
              });
            }

            // Handle intra-file duplicate SKUs gracefully (auto-suffix instead of erroring out!)
            let skuLower = rawSku.toLowerCase();
            if (seenSkusInFile.has(skuLower)) {
              const occCount = (seenSkusInFile.get(skuLower) || 1) + 1;
              seenSkusInFile.set(skuLower, occCount);
              const originalSku = rawSku;
              rawSku = `${rawSku}-${occCount}`;
              skuLower = rawSku.toLowerCase();
              wasAutoCorrected = true;
              correctionNotes.push(`Duplicate SKU in file auto-adjusted from "${originalSku}" to "${rawSku}"`);
              warnings.push({
                rowNumber,
                itemName: rawName,
                message: `Duplicate SKU in spreadsheet automatically adjusted to "${rawSku}"`,
                autoFixed: true,
              });
            } else {
              seenSkusInFile.set(skuLower, 1);
            }

            // 4. BRAND
            const rawBrand = colMap.brandCol >= 0 ? String(row[colMap.brandCol] || '').trim() : '';
            const brand = rawBrand || 'Richie Rich Signature';

            // 5. VENDORS / SUPPLIER
            const rawVendor = colMap.vendorCol >= 0 ? String(row[colMap.vendorCol] || '').trim() : '';
            let vendorsList: string[] = [];
            if (rawVendor) {
              vendorsList = rawVendor
                .split(/[,;|/]/)
                .map((v) => v.trim())
                .filter(Boolean);
            }
            const primaryVendor = vendorsList[0] || (rawCat === 'Paan' ? 'Gujarat Betel Traders' : rawCat === 'Cafe' ? 'Apex Cafe & Beverage Distributors' : 'Shreeji Spices & Supari');

            // 6. PRICE TYPE & PRICES
            const rawPriceType = colMap.priceTypeCol >= 0 ? String(row[colMap.priceTypeCol] || '').toLowerCase() : '';
            const isVariableFlag =
              rawPriceType.includes('var') ||
              rawPriceType.includes('custom') ||
              rawPriceType.includes('open') ||
              rawPriceType === 'yes';

            const rawCost = colMap.costCol >= 0 ? row[colMap.costCol] : 0;
            const rawSell = colMap.sellCol >= 0 ? row[colMap.sellCol] : 0;

            let costPrice = cleanNumber(rawCost, 0);
            let sellingPrice = cleanNumber(rawSell, 0);

            let priceType: 'fixed' | 'variable' = isVariableFlag ? 'variable' : 'fixed';

            // If selling price is 0 and not explicitly marked variable
            if (sellingPrice === 0 && !isVariableFlag) {
              if (costPrice > 0) {
                // If cost is known, assume standard markup or variable price
                sellingPrice = Math.round(costPrice * 1.4);
                wasAutoCorrected = true;
                correctionNotes.push(`Selling Price was 0/blank; auto-calculated ₹${sellingPrice} based on cost`);
              } else {
                // If both cost & selling price are 0, treat as variable price
                priceType = 'variable';
                wasAutoCorrected = true;
                correctionNotes.push(`Zero price detected; configured as Variable Price product`);
              }
            } else if (costPrice === 0 && sellingPrice > 0) {
              // Estimate cost price at ~60% of selling price
              costPrice = Math.round(sellingPrice * 0.6);
              wasAutoCorrected = true;
              correctionNotes.push(`Purchase Cost was 0/blank; estimated as ₹${costPrice} (60% of price)`);
            }

            // 7. STOCK QUANTITY
            const rawStock = colMap.stockCol >= 0 ? row[colMap.stockCol] : 0;
            const stockQuantity = Math.max(0, Math.round(cleanNumber(rawStock, 0)));

            // 8. UNIT
            const rawUnit = colMap.unitCol >= 0 ? String(row[colMap.unitCol] || '').trim().toLowerCase() : '';
            const unit = rawUnit || (rawCat === 'Cafe' ? 'glasses' : 'pieces');

            // 9. TAX & GST
            const rawTaxApp = colMap.taxAppCol >= 0 ? String(row[colMap.taxAppCol] || '').toLowerCase() : 'yes';
            const isTaxApplicable =
              !rawTaxApp.includes('no') &&
              !rawTaxApp.includes('exempt') &&
              !rawTaxApp.includes('false') &&
              rawTaxApp !== '0' &&
              rawTaxApp !== '0%';

            const rawGstRate = colMap.gstRateCol >= 0 ? row[colMap.gstRateCol] : undefined;
            let taxRate = 5;
            if (isTaxApplicable) {
              if (rawGstRate !== undefined && rawGstRate !== '') {
                taxRate = cleanNumber(rawGstRate, rawCat === 'Essentials' ? 18 : 5);
              } else {
                taxRate = rawCat === 'Essentials' ? 18 : 5;
              }
            } else {
              taxRate = 0;
            }

            // 10. LOW STOCK THRESHOLD
            const rawLow = colMap.lowStockCol >= 0 ? row[colMap.lowStockCol] : 10;
            const lowStockThreshold = Math.max(1, Math.round(cleanNumber(rawLow, 10)));

            // 11. STATUS
            const rawStatus = colMap.statusCol >= 0 ? String(row[colMap.statusCol] || '').toLowerCase() : 'active';
            const status: 'active' | 'inactive' = rawStatus.includes('inact') ? 'inactive' : 'active';

            // 12. BARCODE
            const rawBarcode = colMap.barcodeCol >= 0 ? String(row[colMap.barcodeCol] || '').trim() : '';
            const barcode = rawBarcode || `890100${Math.floor(1000 + Math.random() * 9000)}`;

            // 13. DESCRIPTION
            const rawDesc = colMap.descCol >= 0 ? String(row[colMap.descCol] || '').trim() : '';
            const description = rawDesc || `${rawName} (${brand}) - Catalog Item`;

            // Check if existing product in catalog (by SKU or Name)
            const existingMatch = existingSkuMap.get(skuLower) || existingNameMap.get(rawName.toLowerCase());
            const isUpdate = !!existingMatch;

            if (isUpdate) {
              updateCount++;
            } else {
              newCount++;
            }

            validProducts.push({
              rowNumber,
              isUpdate,
              existingId: existingMatch?.id,
              name: rawName,
              sku: rawSku,
              barcode,
              category: rawCat,
              brand,
              vendors: vendorsList.length > 0 ? vendorsList : [primaryVendor],
              vendor: primaryVendor,
              priceType,
              costPrice,
              sellingPrice: priceType === 'variable' ? 0 : sellingPrice,
              stockQuantity,
              lowStockThreshold,
              unit,
              isTaxApplicable,
              taxRate,
              status,
              description,
              imageUrl: existingMatch?.imageUrl || '',
              wasAutoCorrected,
              correctionNotes,
            });
          });

          resolve({
            totalFound: dataRows.length - skippedCount,
            validProducts,
            newCount,
            updateCount,
            skippedCount,
            errorCount: errors.length,
            warningsCount: warnings.length,
            availableSheets: sheetInfos,
            selectedSheetName: activeSheetName,
            columnMapping: colMap,
            rawHeaders,
            errors,
            warnings,
          });
        } catch (err: any) {
          reject(err);
        }
      };

      if (file instanceof ArrayBuffer) {
        processBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const buffer = e.target?.result as ArrayBuffer;
          if (!buffer) {
            reject(new Error('Unable to read uploaded file buffer.'));
            return;
          }
          processBuffer(buffer);
        };
        reader.onerror = () => {
          reject(new Error('Failed to read file. Please ensure it is a valid .xlsx, .xls, or .csv file.'));
        };
        reader.readAsArrayBuffer(file);
      }
    });
  },

  /**
   * Automatically fixes any remaining row errors and produces 100% valid products
   */
  autoFixValidationResult(
    result: ExcelImportValidationResult,
    existingInventory: InventoryItem[]
  ): ExcelImportValidationResult {
    const fixedProducts = [...result.validProducts];
    const fixedErrors = [...result.errors];
    const newWarnings = [...result.warnings];

    // Attempt to convert any errored rows into valid products
    const remainingErrors: typeof result.errors = [];

    fixedErrors.forEach((err) => {
      const generatedSku = `RR-AUTO-${Math.floor(1000 + Math.random() * 9000)}`;
      const generatedName = err.itemName.startsWith('Row #') ? `Item ${generatedSku}` : err.itemName;
      const cat = inferCategoryFromName(generatedName);

      fixedProducts.push({
        rowNumber: err.rowNumber,
        isUpdate: false,
        name: generatedName,
        sku: generatedSku,
        barcode: `890100${Math.floor(1000 + Math.random() * 9000)}`,
        category: cat,
        brand: 'Richie Rich Signature',
        vendors: [cat === 'Paan' ? 'Gujarat Betel Traders' : cat === 'Cafe' ? 'Apex Cafe & Beverage Distributors' : 'Shreeji Spices & Supari'],
        vendor: cat === 'Paan' ? 'Gujarat Betel Traders' : cat === 'Cafe' ? 'Apex Cafe & Beverage Distributors' : 'Shreeji Spices & Supari',
        priceType: 'fixed',
        costPrice: 20,
        sellingPrice: 45,
        stockQuantity: 10,
        lowStockThreshold: 5,
        unit: 'pieces',
        isTaxApplicable: true,
        taxRate: 5,
        status: 'active',
        description: `${generatedName} (Auto-recovered item)`,
        wasAutoCorrected: true,
        correctionNotes: [`Auto-fixed missing field "${err.field}"`],
      });

      newWarnings.push({
        rowNumber: err.rowNumber,
        itemName: generatedName,
        message: `Auto-fixed row #${err.rowNumber} with default safe values`,
        autoFixed: true,
      });
    });

    return {
      ...result,
      validProducts: fixedProducts,
      errors: remainingErrors,
      errorCount: remainingErrors.length,
      warnings: newWarnings,
      warningsCount: newWarnings.length,
      newCount: fixedProducts.filter((p) => !p.isUpdate).length,
      updateCount: fixedProducts.filter((p) => p.isUpdate).length,
    };
  },
};
