import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, StoreLocation, InventoryItem } from '../types';
import { Supplier, WarehouseOverviewStats } from '../types/warehouse';
import { storage } from './storage';

// Helper for formatting currency
const formatCurrency = (num: number): string => {
  return `Rs. ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper for header branding
const addBrandHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top Accent Bar
  doc.setFillColor(217, 119, 6); // amber-600
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('RICHIE RICH PAN HOUSE & CAFE', 14, 16);

  // Subtitle / Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Premium FMCG, Beverages, Confectionery & Pan Lounges • Ahmedabad, Gujarat', 14, 21);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(title.toUpperCase(), 14, 30);

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(subtitle, 14, 35);
  }

  // Generation timestamp on right
  const nowStr = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${nowStr}`, pageWidth - 14, 16, { align: 'right' });
  doc.text(`System: Richie Rich POS Cloud`, pageWidth - 14, 21, { align: 'right' });

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.line(14, subtitle ? 39 : 34, pageWidth - 14, subtitle ? 39 : 34);

  return subtitle ? 43 : 38;
};

// Add standard footer with page numbering
const addPageFooters = (doc: jsPDF) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Richie Rich Pan House - Confidential Audit & Management Report', 14, pageHeight - 7);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }
};

export const pdfReportService = {
  /**
   * 1. DAILY COLLECTION & SETTLEMENT REPORT (Z-REPORT)
   */
  exportDailyCollectionPDF(
    orders: Order[],
    stores: StoreLocation[],
    selectedDate: string,
    selectedStoreId: string = 'all'
  ) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const storeLabel = selectedStoreId === 'all' ? 'All Outlets & Stores' : stores.find((s) => s.id === selectedStoreId)?.name || 'Store';

    let currentY = addBrandHeader(
      doc,
      'Daily Collection & Settlement Report (Z-Report)',
      `Audit Date: ${selectedDate}  |  Outlet: ${storeLabel}`
    );

    // Filter day orders
    const dayOrders = orders.filter((o) => {
      const orderDate = o.createdAt.split('T')[0];
      const matchesDate = orderDate === selectedDate;
      const matchesStore = selectedStoreId === 'all' || o.storeId === selectedStoreId;
      return matchesDate && matchesStore;
    });

    const cashOrders = dayOrders.filter((o) => o.paymentMethod === 'cash');
    const upiOrders = dayOrders.filter((o) => o.paymentMethod === 'upi_qr');
    const cardOrders = dayOrders.filter((o) => o.paymentMethod === 'card');

    const totalSale = dayOrders.reduce((s, o) => s + o.grandTotal, 0);
    const totalCash = cashOrders.reduce((s, o) => s + o.grandTotal, 0);
    const totalUPI = upiOrders.reduce((s, o) => s + o.grandTotal, 0);
    const totalCard = cardOrders.reduce((s, o) => s + o.grandTotal, 0);
    const totalTax = dayOrders.reduce((s, o) => s + o.taxAmount, 0);
    const totalProfit = dayOrders.reduce((s, o) => s + o.totalProfit, 0);

    const cashPct = totalSale > 0 ? ((totalCash / totalSale) * 100).toFixed(1) : '0.0';
    const upiPct = totalSale > 0 ? ((totalUPI / totalSale) * 100).toFixed(1) : '0.0';
    const cardPct = totalSale > 0 ? ((totalCard / totalSale) * 100).toFixed(1) : '0.0';

    // Executive Summary KPI Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, currentY, 182, 32, 2, 2, 'FD');

    // Row 1: Key totals
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`TOTAL GROSS SALE: ${formatCurrency(totalSale)}`, 18, currentY + 7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`(${dayOrders.length} Invoices)`, 105, currentY + 7);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // emerald
    doc.text(`GROSS PROFIT: +${formatCurrency(totalProfit)}`, 130, currentY + 7);

    // Row 2: Payment splits
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105);
    doc.text(`💵 ONLY CASH: ${formatCurrency(totalCash)} (${cashPct}%)`, 18, currentY + 16);

    doc.setTextColor(79, 70, 229);
    doc.text(`📱 ONLY UPI / QR: ${formatCurrency(totalUPI)} (${upiPct}%)`, 80, currentY + 16);

    doc.setTextColor(2, 132, 199);
    doc.text(`💳 ONLY CARD: ${formatCurrency(totalCard)} (${cardPct}%)`, 140, currentY + 16);

    // Row 3: Tax and notes
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`GST Tax Collected: ${formatCurrency(totalTax)}`, 18, currentY + 24);
    doc.text(`Average Ticket: ${formatCurrency(dayOrders.length > 0 ? totalSale / dayOrders.length : 0)}`, 80, currentY + 24);
    doc.text(`Register Status: Verified Reconciled`, 140, currentY + 24);

    currentY += 38;

    // Staff Handover Breakdown
    const staffMap = new Map<string, { name: string; store: string; count: number; cash: number; upi: number; card: number; total: number }>();
    dayOrders.forEach((o) => {
      const staffName = o.cashierName || 'Online Direct';
      const storeName = o.storeName ? o.storeName.split('-')[0].trim() : 'Gota Main';
      const curr = staffMap.get(staffName) || { name: staffName, store: storeName, count: 0, cash: 0, upi: 0, card: 0, total: 0 };
      curr.count++;
      curr.total += o.grandTotal;
      if (o.paymentMethod === 'cash') curr.cash += o.grandTotal;
      else if (o.paymentMethod === 'upi_qr') curr.upi += o.grandTotal;
      else if (o.paymentMethod === 'card') curr.card += o.grandTotal;
      staffMap.set(staffName, curr);
    });

    const staffRows = Array.from(staffMap.values()).map((s) => [
      s.name,
      s.store,
      s.count.toString(),
      formatCurrency(s.cash),
      formatCurrency(s.upi),
      formatCurrency(s.card),
      formatCurrency(s.total),
    ]);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('1. Cashier & Counter Collection Handover Ledger', 14, currentY);
    currentY += 3;

    autoTable(doc, {
      startY: currentY,
      head: [['Staff / Cashier', 'Branch', 'Bills', 'Cash Handover', 'UPI Collected', 'Card POS', 'Total Collection']],
      body: staffRows.length > 0 ? staffRows : [['No staff entries for this date', '-', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      foot: [
        [
          'TOTALS',
          '-',
          dayOrders.length.toString(),
          formatCurrency(totalCash),
          formatCurrency(totalUPI),
          formatCurrency(totalCard),
          formatCurrency(totalSale),
        ],
      ],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Itemized Transactions Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('2. Itemized Transactions & Payment Mode Audit', 14, currentY);
    currentY += 3;

    const orderRows = dayOrders.map((o) => {
      const timeStr = new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const storeName = o.storeName ? o.storeName.split('-')[0].trim() : 'Main';
      const itemsStr = o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ');
      return [
        o.orderNumber,
        timeStr,
        o.paymentMethod.toUpperCase().replace('_', ' '),
        `${storeName} (${o.counterName || 'C1'})`,
        o.cashierName || 'Staff',
        o.customerName || 'Walk-in',
        itemsStr.length > 30 ? itemsStr.substring(0, 30) + '...' : itemsStr,
        formatCurrency(o.taxAmount),
        formatCurrency(o.grandTotal),
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Order #', 'Time', 'Mode', 'Store/Counter', 'Staff', 'Customer', 'Items', 'GST', 'Grand Total']],
      body: orderRows.length > 0 ? orderRows : [['No orders recorded for this date', '-', '-', '-', '-', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        8: { fontStyle: 'bold', halign: 'right' },
        7: { halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    // Signature Signoff at end of document
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    if (finalY < doc.internal.pageSize.getHeight() - 35) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);

      doc.text('Prepared By: _____________________ (Cashier)', 14, finalY);
      doc.text('Verified By: _____________________ (Store Manager)', 75, finalY);
      doc.text('Audited By: _____________________ (Accounts)', 140, finalY);
    }

    addPageFooters(doc);
    doc.save(`Richie_Rich_Daily_Collection_${selectedDate}_${selectedStoreId}.pdf`);
  },

  /**
   * 2. MASTER ORDERS & SALES LEDGER PDF REPORT
   */
  exportOrdersLedgerPDF(
    orders: Order[],
    filterLabel: string = 'Current Filtered View',
    customDateLabel?: string
  ) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    let currentY = addBrandHeader(
      doc,
      'Master Orders & Sales Fulfillment Ledger',
      `Filter Scope: ${filterLabel} ${customDateLabel ? `| ${customDateLabel}` : ''} | Total Invoices: ${orders.length}`
    );

    const totalSale = orders.reduce((s, o) => s + o.grandTotal, 0);
    const totalProfit = orders.reduce((s, o) => s + o.totalProfit, 0);
    const totalTax = orders.reduce((s, o) => s + o.taxAmount, 0);
    const cashTotal = orders.filter((o) => o.paymentMethod === 'cash').reduce((s, o) => s + o.grandTotal, 0);
    const upiTotal = orders.filter((o) => o.paymentMethod === 'upi_qr').reduce((s, o) => s + o.grandTotal, 0);
    const cardTotal = orders.filter((o) => o.paymentMethod === 'card').reduce((s, o) => s + o.grandTotal, 0);

    // KPI Summary Header
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, currentY, 269, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`TOTAL REVENUE: ${formatCurrency(totalSale)}`, 18, currentY + 6);
    doc.setTextColor(16, 185, 129);
    doc.text(`NET PROFIT: +${formatCurrency(totalProfit)}`, 85, currentY + 6);
    doc.setTextColor(100, 116, 139);
    doc.text(`GST TAX: ${formatCurrency(totalTax)}`, 150, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`Cash: ${formatCurrency(cashTotal)}  |  UPI: ${formatCurrency(upiTotal)}  |  Card: ${formatCurrency(cardTotal)}`, 18, currentY + 12);
    doc.text(`Orders Count: ${orders.length}  |  Avg Order: ${formatCurrency(orders.length ? totalSale / orders.length : 0)}`, 180, currentY + 12);

    currentY += 21;

    const rows = orders.map((o) => {
      const dateStr = new Date(o.createdAt).toLocaleDateString() + ' ' + new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const storeName = o.storeName ? o.storeName.split('-')[0].trim() : 'Gota Main';
      const itemsStr = o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ');
      return [
        o.orderNumber,
        dateStr,
        o.paymentMethod.toUpperCase().replace('_', ' '),
        storeName,
        o.counterName || (o.counterNumber ? `Counter ${o.counterNumber}` : 'Counter 1'),
        o.cashierName || 'Staff',
        o.customerName || 'Walk-in',
        itemsStr.length > 35 ? itemsStr.substring(0, 35) + '...' : itemsStr,
        formatCurrency(o.taxAmount),
        `+${formatCurrency(o.totalProfit)}`,
        o.status.toUpperCase(),
        formatCurrency(o.grandTotal),
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Order #', 'Date & Time', 'Payment', 'Outlet', 'Counter', 'Staff', 'Customer', 'Items Summary', 'GST', 'Profit', 'Status', 'Grand Total']],
      body: rows.length > 0 ? rows : [['No orders found', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        9: { textColor: [16, 185, 129] },
        11: { fontStyle: 'bold', halign: 'right' },
      },
      foot: [
        ['TOTALS', '-', '-', '-', '-', '-', '-', `${orders.length} orders`, formatCurrency(totalTax), `+${formatCurrency(totalProfit)}`, '-', formatCurrency(totalSale)],
      ],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
      margin: { left: 14, right: 14 },
    });

    addPageFooters(doc);
    doc.save(`Richie_Rich_Orders_Sales_Ledger_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  /**
   * 3. MASTER INVENTORY & VALUATION REPORT PDF
   */
  exportInventoryValuationPDF(inventory: InventoryItem[]) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    let currentY = addBrandHeader(
      doc,
      'Master Catalog & Inventory Valuation Report',
      `Audit Methodology: Landed Unit Cost & Retail MRP Matrix | Total SKUs: ${inventory.length}`
    );

    const totalUnits = inventory.reduce((s, i) => s + i.stockQuantity, 0);
    const totalCostVal = inventory.reduce((s, i) => s + i.stockQuantity * i.costPrice, 0);
    const totalRetailVal = inventory.reduce((s, i) => s + i.stockQuantity * i.sellingPrice, 0);
    const potentialProfit = Math.max(0, totalRetailVal - totalCostVal);
    const lowStockCount = inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold).length;

    // Top KPI Strip
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, currentY, 269, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`TOTAL COST VALUATION: ${formatCurrency(totalCostVal)}`, 18, currentY + 6);
    doc.setTextColor(79, 70, 229);
    doc.text(`TOTAL RETAIL VALUE: ${formatCurrency(totalRetailVal)}`, 95, currentY + 6);
    doc.setTextColor(16, 185, 129);
    doc.text(`ESTIMATED PROFIT VALUE: +${formatCurrency(potentialProfit)}`, 175, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Physical Units: ${totalUnits} | Active SKUs: ${inventory.length} | Low Stock Alerts: ${lowStockCount}`, 18, currentY + 12);

    currentY += 21;

    const rows = inventory.map((item) => {
      const valCost = item.stockQuantity * item.costPrice;
      const valRetail = item.stockQuantity * item.sellingPrice;
      const margin = item.sellingPrice > 0 ? (((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100).toFixed(1) : '0';
      const isLow = item.stockQuantity <= item.lowStockThreshold;

      return [
        item.sku,
        item.name,
        item.category,
        `${item.stockQuantity} ${item.unit || 'pcs'}${isLow ? ' ⚠️' : ''}`,
        item.lowStockThreshold.toString(),
        formatCurrency(item.costPrice),
        formatCurrency(item.sellingPrice),
        `${margin}%`,
        item.isTaxApplicable !== false ? `${item.taxRate || 5}%` : 'Exempt',
        formatCurrency(valCost),
        formatCurrency(valRetail),
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['SKU', 'Item Name', 'Category', 'Stock Qty', 'Min Thresh', 'Cost Price', 'Selling Price', 'Margin %', 'GST', 'Cost Valuation', 'Retail Valuation']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        9: { fontStyle: 'bold', halign: 'right' },
        10: { fontStyle: 'bold', halign: 'right', textColor: [79, 70, 229] },
      },
      foot: [
        ['TOTALS', `${inventory.length} SKUs`, '-', `${totalUnits} units`, '-', '-', '-', '-', '-', formatCurrency(totalCostVal), formatCurrency(totalRetailVal)],
      ],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
      margin: { left: 14, right: 14 },
    });

    addPageFooters(doc);
    doc.save(`Richie_Rich_Master_Inventory_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  /**
   * 4. FINANCIAL & OPERATIONAL ANALYTICS REPORT PDF
   */
  exportMonthlyAnalyticsPDF(selectedMonth: string, selectedStoreName: string = 'All Outlets') {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    let currentY = addBrandHeader(
      doc,
      'Financial & Operational Analytics Report',
      `Audit Month: ${selectedMonth} | Scope: ${selectedStoreName}`
    );

    const orders = storage.getOrders();
    const inventory = storage.getInventory();

    const totalRevenue = orders.reduce((s, o) => s + o.grandTotal, 0);
    const totalProfit = orders.reduce((s, o) => s + o.totalProfit, 0);
    const totalTax = orders.reduce((s, o) => s + o.taxAmount, 0);
    const cashTotal = orders.filter((o) => o.paymentMethod === 'cash').reduce((s, o) => s + o.grandTotal, 0);
    const upiTotal = orders.filter((o) => o.paymentMethod === 'upi_qr').reduce((s, o) => s + o.grandTotal, 0);
    const cardTotal = orders.filter((o) => o.paymentMethod === 'card').reduce((s, o) => s + o.grandTotal, 0);

    // Summary Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, currentY, 182, 32, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`TOTAL REVENUE: ${formatCurrency(totalRevenue)}`, 18, currentY + 7);
    doc.setTextColor(16, 185, 129);
    doc.text(`NET GROSS PROFIT: +${formatCurrency(totalProfit)}`, 105, currentY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Total Orders: ${orders.length} bills`, 18, currentY + 16);
    doc.text(`Average Order Value: ${formatCurrency(orders.length ? totalRevenue / orders.length : 0)}`, 105, currentY + 16);

    doc.setTextColor(100, 116, 139);
    doc.text(`Cash: ${formatCurrency(cashTotal)}  |  UPI: ${formatCurrency(upiTotal)}  |  Card: ${formatCurrency(cardTotal)}`, 18, currentY + 25);
    doc.text(`GST Tax: ${formatCurrency(totalTax)}`, 140, currentY + 25);

    currentY += 38;

    // Top Selling Items Table
    const invMap = new Map<string, InventoryItem>();
    inventory.forEach((i) => invMap.set(i.name, i));

    const itemSalesMap = new Map<string, { name: string; category: string; qty: number; revenue: number; profit: number }>();
    orders.forEach((o) => {
      o.items.forEach((it) => {
        const itemCat = invMap.get(it.name)?.category || 'General';
        const curr = itemSalesMap.get(it.name) || { name: it.name, category: itemCat, qty: 0, revenue: 0, profit: 0 };
        curr.qty += it.quantity;
        curr.revenue += it.subtotal;
        curr.profit += it.profit || ((it.price - it.costPrice) * it.quantity);
        itemSalesMap.set(it.name, curr);
      });
    });

    const topItems = Array.from(itemSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('Top Performing Products & Revenue Drivers', 14, currentY);
    currentY += 3;

    const itemRows = topItems.map((item, idx) => [
      `#${idx + 1}`,
      item.name,
      item.category,
      `${item.qty} units`,
      formatCurrency(item.revenue),
      `+${formatCurrency(item.profit)}`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Rank', 'Product Name', 'Category', 'Units Sold', 'Total Revenue', 'Profit Contribution']],
      body: itemRows.length > 0 ? itemRows : [['-', 'No product sales recorded', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      columnStyles: {
        4: { fontStyle: 'bold', halign: 'right' },
        5: { textColor: [16, 185, 129], halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Category Breakdown
    const catMap = new Map<string, { name: string; revenue: number; items: number }>();
    inventory.forEach((i) => {
      const cat = i.category || 'Other';
      const curr = catMap.get(cat) || { name: cat, revenue: 0, items: 0 };
      curr.items += 1;
      curr.revenue += i.stockQuantity * i.sellingPrice;
      catMap.set(cat, curr);
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('Category Catalog & Stock Valuation Split', 14, currentY);
    currentY += 3;

    const catRows = Array.from(catMap.values()).map((c) => [c.name, `${c.items} SKUs`, formatCurrency(c.revenue)]);

    autoTable(doc, {
      startY: currentY,
      head: [['Category Name', 'Active Catalog SKUs', 'Inventory Valuation']],
      body: catRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      columnStyles: {
        2: { fontStyle: 'bold', halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    addPageFooters(doc);
    doc.save(`Richie_Rich_Analytics_${selectedMonth.replace(' ', '_')}.pdf`);
  },

  /**
   * 5. WAREHOUSE FIFO & OUTLET VALUATION MATRIX PDF
   */
  exportWarehouseValuationPDF(inventory: InventoryItem[], stats: WarehouseOverviewStats) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    let currentY = addBrandHeader(
      doc,
      'Warehouse Inventory Valuation (FIFO & Landed Cost)',
      `Total Inventory Value: ${formatCurrency(stats.totalInventoryValuationFIFO)} | Central WH + All Outlets`
    );

    const rows = inventory.map((i) => {
      const alloc = i.storeAllocations || {};
      const storesSum = Object.values(alloc).reduce<number>((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
      const centralStock = Math.max(0, Number(i.stockQuantity) - storesSum);
      const totalVal = i.stockQuantity * i.costPrice;

      return [
        i.sku,
        i.name,
        i.category,
        centralStock.toString(),
        storesSum.toString(),
        `${i.stockQuantity} ${i.unit}`,
        formatCurrency(i.costPrice),
        formatCurrency(i.sellingPrice),
        formatCurrency(totalVal),
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['SKU', 'Item Name', 'Category', 'Central WH', 'Stores Sum', 'Total Units', 'Landed Cost', 'Selling MRP', 'Total Valuation']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        8: { fontStyle: 'bold', halign: 'right' },
      },
      foot: [
        ['TOTALS', `${inventory.length} Items`, '-', '-', '-', '-', '-', '-', formatCurrency(stats.totalInventoryValuationFIFO)],
      ],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
      margin: { left: 14, right: 14 },
    });

    addPageFooters(doc);
    doc.save(`Richie_Rich_Warehouse_Valuation_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  /**
   * 6. SUPPLIER PAYABLES & OUTSTANDING PDF REPORT
   */
  exportSupplierOutstandingPDF(suppliers: Supplier[], stats?: WarehouseOverviewStats) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const totalOutstanding = suppliers.reduce((s, v) => s + v.currentOutstanding, 0);

    let currentY = addBrandHeader(
      doc,
      'Supplier Outstanding Aging & Payables Summary',
      `Total Outstanding Payables: ${formatCurrency(totalOutstanding)} | Active Vendors: ${suppliers.length}`
    );

    const rows = suppliers.map((s) => [
      s.name,
      s.category,
      `${s.city}, ${s.state}`,
      s.paymentTerms,
      s.phone,
      formatCurrency(s.creditLimit),
      formatCurrency(s.currentOutstanding),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Supplier Name', 'Category', 'City / State', 'Terms', 'Contact', 'Credit Limit', 'Outstanding']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [190, 18, 60], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        6: { fontStyle: 'bold', halign: 'right', textColor: [190, 18, 60] },
      },
      foot: [
        ['TOTALS', `${suppliers.length} Vendors`, '-', '-', '-', '-', formatCurrency(totalOutstanding)],
      ],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    addPageFooters(doc);
    doc.save(`Richie_Rich_Supplier_Payables_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  /**
   * 7. CRITICAL & LOW STOCK AUDIT PDF REPORT
   */
  exportLowStockHealthPDF(inventory: InventoryItem[]) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const lowStockItems = inventory.filter((i) => i.stockQuantity <= i.lowStockThreshold);

    let currentY = addBrandHeader(
      doc,
      'Critical & Low Stock SKU Health Audit',
      `Items Below Minimum Reorder Threshold: ${lowStockItems.length} SKUs`
    );

    const rows = lowStockItems.map((i) => {
      const deficit = Math.max(0, i.lowStockThreshold - i.stockQuantity);
      const recommendedOrder = Math.max(20, deficit * 2);
      return [
        i.sku,
        i.name,
        i.category,
        `${i.stockQuantity} ${i.unit}`,
        `${i.lowStockThreshold} ${i.unit}`,
        `-${deficit} ${i.unit}`,
        `${recommendedOrder} ${i.unit}`,
        formatCurrency(recommendedOrder * i.costPrice),
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['SKU', 'Item Name', 'Category', 'Current Stock', 'Min Threshold', 'Deficit', 'Reorder Qty', 'Est. PO Cost']],
      body: rows.length > 0 ? rows : [['-', 'All stock levels healthy! No critical shortages.', '-', '-', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        5: { textColor: [225, 29, 72], fontStyle: 'bold' },
        7: { fontStyle: 'bold', halign: 'right' },
      },
      margin: { left: 14, right: 14 },
    });

    addPageFooters(doc);
    doc.save(`Richie_Rich_Low_Stock_Audit_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  /**
   * 8. STORE SPECIFIC STOCK AUDIT PDF REPORT
   */
  exportStoreStockPDF(store: StoreLocation, inventory: InventoryItem[]) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    let currentY = addBrandHeader(
      doc,
      `Store Inventory Allocation Audit - ${store.name}`,
      `Address: ${store.address} | Contact: ${store.phone} | Landmark: ${store.landmark || 'Main Road'}`
    );

    const storeRows = inventory.map((i) => {
      const alloc = (i.storeAllocations || {})[store.id] || 0;
      const val = alloc * i.sellingPrice;
      return [
        i.sku,
        i.name,
        i.category,
        `${alloc} ${i.unit || 'pcs'}`,
        formatCurrency(i.sellingPrice),
        formatCurrency(val),
        alloc <= 5 ? 'LOW STOCK ⚠️' : 'OPTIMAL ✓',
      ];
    });

    const totalStoreUnits = inventory.reduce((s, i) => s + ((i.storeAllocations || {})[store.id] || 0), 0);
    const totalStoreVal = inventory.reduce((s, i) => s + (((i.storeAllocations || {})[store.id] || 0) * i.sellingPrice), 0);

    autoTable(doc, {
      startY: currentY,
      head: [['SKU', 'Product Name', 'Category', 'Store Stock', 'MRP Rate', 'Retail Valuation', 'Status']],
      body: storeRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold' },
        5: { fontStyle: 'bold', halign: 'right' },
      },
      foot: [
        ['TOTALS', `${inventory.length} SKUs`, '-', `${totalStoreUnits} units`, '-', formatCurrency(totalStoreVal), '-'],
      ],
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8 },
      margin: { left: 14, right: 14 },
    });

    addPageFooters(doc);
    doc.save(`Richie_Rich_Stock_${store.shortName || store.id}_${new Date().toISOString().split('T')[0]}.pdf`);
  },

  /**
   * 9. AUDIT TRAIL LOGS PDF REPORT
   */
  exportAuditTrailPDF(logs: any[]) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    let currentY = addBrandHeader(
      doc,
      'Warehouse Security & Transaction Audit Trail',
      `Total Logged Actions: ${logs.length} | System Activity Timeline`
    );

    const rows = logs.map((l) => [
      new Date(l.timestamp || Date.now()).toLocaleString(),
      (l.action || 'ACTION').toUpperCase(),
      l.entity || 'System',
      l.user || 'Admin',
      l.details || '-',
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Timestamp', 'Action Type', 'Entity / Module', 'Operator / Staff', 'Audit Details']],
      body: rows.length > 0 ? rows : [['-', 'No logs found', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      margin: { left: 14, right: 14 },
    });

    addPageFooters(doc);
    doc.save(`Richie_Rich_Audit_Trail_${new Date().toISOString().split('T')[0]}.pdf`);
  },
};
