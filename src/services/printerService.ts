import { Order, Customer, PrinterSettings, PrinterConnectionType } from '../types';
import { safeStorage } from '../utils/safeStorage';
import { CURRENCY } from './storage';
import { soundEffects } from './audio';

const STORAGE_KEY_PRINTER = 'rr_printer_settings';

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  directPrintEnabled: true,
  connectionType: 'silent_direct',
  paperWidth: '80mm',
  baudRate: 9600,
  autoPrintOnCheckout: false,
  cutPaper: true,
  kickDrawer: false,
  copies: 1,
  printDensity: 'normal',
  networkPrinterIp: '192.168.1.100',
  networkPrinterPort: 9100,
  headerTitle: '★ RICHIE RICH ★',
  headerTagline: 'Pan | Coffee | Essentials | 24x7',
  headerGstin: 'GSTIN: 27AABCR1234F1Z8',
  headerPhone: '+91 98201 99882',
  headerAddress: 'Ahmedabad Chain Outlets • Gujarat',
  showLogo: true,
  showCashierAndCounter: true,
  showCustomerLoyalty: true,
  showBarcode: true,
  showTaxBreakdown: true,
  footerGreeting: 'Thank you for visiting Richie Rich Pan House!',
  footerPolicy: 'Fresh artisanal leaves prepared with royal hygiene. Exchange within 24h with bill.',
};

class PrinterService {
  private activeSerialPort: any = null;
  private activeBluetoothDevice: any = null;
  private activeBluetoothCharacteristic: any = null;
  private cachedSettings: PrinterSettings | null = null;
  private listeners: Array<() => void> = [];

  constructor() {
    this.cachedSettings = this.loadSettings();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error notifying printer listener:', err);
      }
    });
  }

  public getSettings(): PrinterSettings {
    if (!this.cachedSettings) {
      this.cachedSettings = this.loadSettings();
    }
    return { ...this.cachedSettings };
  }

  public saveSettings(updated: Partial<PrinterSettings>): PrinterSettings {
    const current = this.getSettings();
    const merged: PrinterSettings = { ...current, ...updated };
    safeStorage.setItem(STORAGE_KEY_PRINTER, JSON.stringify(merged));
    this.cachedSettings = merged;
    this.notify();
    return merged;
  }

  private loadSettings(): PrinterSettings {
    try {
      const raw = safeStorage.getItem(STORAGE_KEY_PRINTER);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_PRINTER_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to parse stored printer settings, using defaults', e);
    }
    return { ...DEFAULT_PRINTER_SETTINGS };
  }

  // Hardware Capability Checks
  public hasWebSerialSupport(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public hasWebBluetoothSupport(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public isSerialConnected(): boolean {
    return this.activeSerialPort !== null && this.activeSerialPort.readable !== null;
  }

  public isBluetoothConnected(): boolean {
    return this.activeBluetoothDevice !== null && this.activeBluetoothDevice.gatt?.connected;
  }

  // Web Serial Port Connection (Direct USB / COM Thermal Printers)
  public async connectSerial(baudRate?: number): Promise<{ success: boolean; message: string }> {
    if (!this.hasWebSerialSupport()) {
      return {
        success: false,
        message: 'Web Serial API is not supported in this browser. Please use Google Chrome or Microsoft Edge.',
      };
    }

    try {
      const serial = (navigator as any).serial;
      const port = await serial.requestPort();
      const targetBaud = baudRate || this.getSettings().baudRate || 9600;
      await port.open({ baudRate: targetBaud });
      this.activeSerialPort = port;
      this.saveSettings({ connectionType: 'web_serial' });
      soundEffects.playSuccessChime();
      return {
        success: true,
        message: `Direct USB Serial thermal printer connected at ${targetBaud} baud! Direct print is active with zero dialog.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to connect to serial thermal printer.',
      };
    }
  }

  public async disconnectSerial(): Promise<void> {
    if (this.activeSerialPort) {
      try {
        await this.activeSerialPort.close();
      } catch {
        // ignore
      }
      this.activeSerialPort = null;
      this.notify();
    }
  }

  // Web Bluetooth Connection
  public async connectBluetooth(): Promise<{ success: boolean; message: string }> {
    if (!this.hasWebBluetoothSupport()) {
      return {
        success: false,
        message: 'Web Bluetooth API is not supported in this browser.',
      };
    }

    try {
      const bluetooth = (navigator as any).bluetooth;
      const device = await bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
      });

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      this.activeBluetoothDevice = device;
      this.activeBluetoothCharacteristic = characteristic;
      this.saveSettings({ connectionType: 'web_bluetooth' });
      soundEffects.playSuccessChime();
      return {
        success: true,
        message: `Bluetooth thermal printer "${device.name || 'Printer'}" paired successfully!`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to connect Bluetooth printer.',
      };
    }
  }

  public async disconnectBluetooth(): Promise<void> {
    if (this.activeBluetoothDevice && this.activeBluetoothDevice.gatt.connected) {
      this.activeBluetoothDevice.gatt.disconnect();
    }
    this.activeBluetoothDevice = null;
    this.activeBluetoothCharacteristic = null;
    this.notify();
  }

  // Send raw byte stream over active hardware port
  public async sendRawBytes(bytes: Uint8Array): Promise<boolean> {
    if (this.isSerialConnected()) {
      try {
        const writer = this.activeSerialPort.writable.getWriter();
        await writer.write(bytes);
        writer.releaseLock();
        return true;
      } catch (err) {
        console.error('Failed writing bytes to serial printer:', err);
        return false;
      }
    }

    if (this.isBluetoothConnected() && this.activeBluetoothCharacteristic) {
      try {
        // Send in 512-byte chunks for BLE MTU limits
        const chunkSize = 128;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.slice(i, i + chunkSize);
          await this.activeBluetoothCharacteristic.writeValue(chunk);
        }
        return true;
      } catch (err) {
        console.error('Failed writing bytes to bluetooth printer:', err);
        return false;
      }
    }

    return false;
  }

  // ESC/POS Command Generator for thermal slip
  public generateEscPos(order: Order, customer?: Customer | null, settings?: PrinterSettings): Uint8Array {
    const s = settings || this.getSettings();
    const cols = s.paperWidth === '58mm' ? 32 : 48;
    const divider = '-'.repeat(cols);
    const doubleDivider = '='.repeat(cols);

    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];

    const push = (...arrays: Uint8Array[]) => {
      arrays.forEach((a) => chunks.push(a));
    };

    const pushText = (text: string) => {
      push(encoder.encode(text + '\n'));
    };

    const centerText = (text: string): string => {
      if (text.length >= cols) return text.slice(0, cols);
      const pad = Math.floor((cols - text.length) / 2);
      return ' '.repeat(pad) + text;
    };

    const padRow = (left: string, right: string): string => {
      const space = cols - left.length - right.length;
      if (space <= 0) return (left + ' ' + right).slice(0, cols);
      return left + ' '.repeat(space) + right;
    };

    // ESC/POS Control Sequences
    const CMD_INIT = new Uint8Array([0x1b, 0x40]); // ESC @
    const CMD_ALIGN_CENTER = new Uint8Array([0x1b, 0x61, 0x01]); // ESC a 1
    const CMD_ALIGN_LEFT = new Uint8Array([0x1b, 0x61, 0x00]); // ESC a 0
    const CMD_ALIGN_RIGHT = new Uint8Array([0x1b, 0x61, 0x02]); // ESC a 2
    const CMD_BOLD_ON = new Uint8Array([0x1b, 0x45, 0x01]); // ESC E 1
    const CMD_BOLD_OFF = new Uint8Array([0x1b, 0x45, 0x00]); // ESC E 0
    const CMD_DOUBLE_ON = new Uint8Array([0x1d, 0x21, 0x11]); // GS ! 0x11
    const CMD_NORMAL = new Uint8Array([0x1d, 0x21, 0x00]); // GS ! 0x00
    const CMD_CUT = new Uint8Array([0x1d, 0x56, 0x00]); // GS V 0
    const CMD_DRAWER = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]); // ESC p 0 25 250

    // 1. Initialize
    push(CMD_INIT);

    // 2. Kick cash drawer if enabled
    if (s.kickDrawer) {
      push(CMD_DRAWER);
    }

    // 3. Store Crest & Header
    push(CMD_ALIGN_CENTER);
    push(CMD_BOLD_ON);
    push(CMD_DOUBLE_ON);
    pushText(s.headerTitle || '★ RICHIE RICH ★');
    push(CMD_NORMAL);
    push(CMD_BOLD_OFF);

    if (s.headerTagline) pushText(s.headerTagline);
    if (s.headerGstin) pushText(s.headerGstin);
    if (s.headerPhone) pushText(`Ph: ${s.headerPhone}`);
    if (s.headerAddress) pushText(s.headerAddress);
    pushText(divider);

    // 4. Order Meta
    push(CMD_ALIGN_LEFT);
    pushText(padRow(`INVOICE: ${order.orderNumber}`, new Date(order.createdAt).toLocaleDateString()));
    pushText(padRow(`TIME: ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, `PAY: ${order.paymentMethod?.toUpperCase() || 'CASH'}`));

    if (s.showCashierAndCounter) {
      const cashier = order.cashierName || 'Cashier 01';
      const counter = (order as any).counterId || 'Register 1';
      pushText(padRow(`CASHIER: ${cashier}`, `STATION: ${counter}`));
    }

    if (order.isModified) {
      push(CMD_BOLD_ON);
      pushText(centerText('* AMENDED / MODIFIED BILL *'));
      push(CMD_BOLD_OFF);
    }

    if (s.showCustomerLoyalty && customer) {
      pushText(padRow(`CUSTOMER: ${customer.name}`, customer.phone || ''));
    }

    pushText(doubleDivider);

    // 5. Line Items Header
    push(CMD_BOLD_ON);
    if (cols === 32) {
      // 58mm layout: ITEM (16) QTY(4) TOT(10)
      pushText('ITEM             QTY      TOTAL');
    } else {
      // 80mm layout: ITEM (24) QTY(6) RATE(8) TOT(10)
      pushText('ITEM                     QTY    RATE      TOTAL');
    }
    push(CMD_BOLD_OFF);
    pushText(divider);

    // 6. Line Items List
    order.items.forEach((item) => {
      const itemPrice = `${CURRENCY}${item.price.toFixed(2)}`;
      const itemTotal = `${CURRENCY}${item.subtotal.toFixed(2)}`;
      const qtyStr = `${item.quantity}`;

      if (cols === 32) {
        // 58mm compact format
        const namePart = item.name.slice(0, 15).padEnd(16, ' ');
        const qtyPart = qtyStr.padStart(4, ' ');
        const totPart = itemTotal.padStart(10, ' ');
        pushText(namePart + qtyPart + totPart);
      } else {
        // 80mm wide format
        const namePart = item.name.slice(0, 23).padEnd(24, ' ');
        const qtyPart = qtyStr.padStart(6, ' ');
        const ratePart = itemPrice.padStart(8, ' ');
        const totPart = itemTotal.padStart(10, ' ');
        pushText(namePart + qtyPart + ratePart + totPart);
      }
    });

    pushText(divider);

    // 7. Totals & Tax Breakdown
    push(CMD_ALIGN_LEFT);
    pushText(padRow('SUBTOTAL:', `${CURRENCY}${order.subtotal.toFixed(2)}`));

    if (s.showTaxBreakdown) {
      pushText(padRow('CGST (2.5%):', `${CURRENCY}${(order.taxAmount / 2).toFixed(2)}`));
      pushText(padRow('SGST (2.5%):', `${CURRENCY}${(order.taxAmount / 2).toFixed(2)}`));
    }

    if (order.discountAmount && order.discountAmount > 0) {
      pushText(padRow('SAVINGS / DISCOUNT:', `-${CURRENCY}${order.discountAmount.toFixed(2)}`));
    }

    pushText(doubleDivider);
    push(CMD_BOLD_ON);
    push(CMD_DOUBLE_ON);
    pushText(padRow('GRAND TOTAL:', `${CURRENCY}${order.grandTotal.toFixed(2)}`));
    push(CMD_NORMAL);
    push(CMD_BOLD_OFF);
    pushText(doubleDivider);

    // 8. Loyalty Earned Info
    if (s.showCustomerLoyalty && order.loyaltyPointsEarned && order.loyaltyPointsEarned > 0) {
      push(CMD_ALIGN_CENTER);
      pushText(`+ ${order.loyaltyPointsEarned} Royalty Points Earned!`);
      if (customer) {
        pushText(`Balance: ${customer.loyaltyPoints} pts (${customer.tier} Tier)`);
      }
      pushText(divider);
    }

    // 9. Footer
    push(CMD_ALIGN_CENTER);
    if (s.footerGreeting) pushText(s.footerGreeting);
    if (s.footerPolicy) pushText(s.footerPolicy);
    pushText(`*** ${order.orderNumber} ***`);

    // 10. Feed lines & cut
    pushText('\n\n\n');
    if (s.cutPaper) {
      push(CMD_CUT);
    }

    // Combine all chunks
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return result;
  }

  // Silent Direct Print via Hidden Isolated Iframe
  public printViaDirectIframe(order: Order, customer?: Customer | null, settings?: PrinterSettings): Promise<boolean> {
    return new Promise((resolve) => {
      const s = settings || this.getSettings();
      const paperWidthPx = s.paperWidth === '58mm' ? '58mm' : '80mm';
      const printableContentWidth = s.paperWidth === '58mm' ? '48mm' : '72mm';

      // Find or create hidden iframe
      let iframe = document.getElementById('rr-silent-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'rr-silent-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        resolve(true);
        return;
      }

      const isAmended = !!order.isModified;
      const dateStr = new Date(order.createdAt).toLocaleDateString();
      const timeStr = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Thermal Receipt - ${order.orderNumber}</title>
          <style>
            @page {
              size: ${paperWidthPx} auto;
              margin: 0mm;
            }
            @media print {
              html, body {
                width: ${paperWidthPx};
                margin: 0;
                padding: 0;
                background: #ffffff;
                color: #000000;
              }
            }
            body {
              font-family: 'Courier New', Courier, monospace, monospace;
              font-size: ${s.paperWidth === '58mm' ? '10px' : '11px'};
              line-height: 1.25;
              margin: 0;
              padding: 3mm;
              width: ${printableContentWidth};
              color: #000000;
              background: #ffffff;
              box-sizing: border-box;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .title { font-size: 15px; font-weight: 900; letter-spacing: 1px; }
            .divider { border-bottom: 1px dashed #000000; margin: 4px 0; }
            .double-divider { border-bottom: 2px solid #000000; margin: 5px 0; }
            .flex-row { display: flex; justify-content: space-between; }
            .item-row { margin: 2px 0; }
            .badge { display: inline-block; padding: 2px 4px; border: 1px solid #000; font-size: 9px; font-weight: bold; margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; font-size: inherit; }
            th { text-align: left; border-bottom: 1px dashed #000; padding: 2px 0; }
            td { padding: 2px 0; vertical-align: top; }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="title">${s.headerTitle}</div>
            <div style="font-size: 10px; font-weight: bold;">${s.headerTagline}</div>
            <div style="font-size: 9px;">${s.headerGstin} • Ph: ${s.headerPhone}</div>
            <div style="font-size: 9px;">${s.headerAddress}</div>
          </div>

          <div class="divider"></div>

          <div>
            <div class="flex-row"><span>INVOICE: <b>${order.orderNumber}</b></span><span>${dateStr}</span></div>
            <div class="flex-row"><span>TIME: ${timeStr}</span><span>PAY: <b>${order.paymentMethod?.toUpperCase()}</b></span></div>
            ${
              s.showCashierAndCounter
                ? `<div class="flex-row"><span>CASHIER: ${order.cashierName || 'Cashier 01'}</span><span>STN: ${(order as any).counterId || 'Reg 1'}</span></div>`
                : ''
            }
            ${
              isAmended
                ? `<div class="center"><span class="badge">* AMENDED / MODIFIED BILL *</span></div>`
                : ''
            }
            ${
              s.showCustomerLoyalty && customer
                ? `<div class="flex-row"><span>CUST: ${customer.name}</span><span>${customer.phone || ''}</span></div>`
                : ''
            }
          </div>

          <div class="double-divider"></div>

          <table>
            <thead>
              <tr>
                <th style="width: 50%;">ITEM</th>
                <th class="center" style="width: 15%;">QTY</th>
                <th class="right" style="width: 35%;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${order.items
                .map(
                  (item) => `
                <tr>
                  <td>${item.name}</td>
                  <td class="center">${item.quantity}</td>
                  <td class="right">${CURRENCY}${item.subtotal.toFixed(2)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div class="divider"></div>

          <div>
            <div class="flex-row"><span>SUBTOTAL</span><span>${CURRENCY}${order.subtotal.toFixed(2)}</span></div>
            ${
              s.showTaxBreakdown
                ? `
              <div class="flex-row" style="font-size: 9px;"><span>CGST (2.5%)</span><span>${CURRENCY}${(order.taxAmount / 2).toFixed(2)}</span></div>
              <div class="flex-row" style="font-size: 9px;"><span>SGST (2.5%)</span><span>${CURRENCY}${(order.taxAmount / 2).toFixed(2)}</span></div>
            `
                : ''
            }
            ${
              order.discountAmount && order.discountAmount > 0
                ? `<div class="flex-row bold"><span>DISCOUNT</span><span>-${CURRENCY}${order.discountAmount.toFixed(2)}</span></div>`
                : ''
            }
            <div class="double-divider"></div>
            <div class="flex-row bold" style="font-size: 14px;"><span>GRAND TOTAL</span><span>${CURRENCY}${order.grandTotal.toFixed(2)}</span></div>
            <div class="double-divider"></div>
          </div>

          ${
            s.showCustomerLoyalty && order.loyaltyPointsEarned && order.loyaltyPointsEarned > 0
              ? `
            <div class="center" style="background: #f0f0f0; padding: 3px; margin: 4px 0; border: 1px solid #ccc;">
              <div class="bold">+ ${order.loyaltyPointsEarned} Royalty Points Earned!</div>
              ${customer ? `<div style="font-size: 9px;">Balance: ${customer.loyaltyPoints} pts (${customer.tier})</div>` : ''}
            </div>
            <div class="divider"></div>
          `
              : ''
          }

          <div class="center" style="margin-top: 6px;">
            <div style="font-size: 10px; font-weight: bold;">${s.footerGreeting}</div>
            <div style="font-size: 8px; margin-top: 2px;">${s.footerPolicy}</div>
            <div style="font-size: 9px; margin-top: 4px; font-family: monospace;">||||||||||||||||||||||||||||||</div>
            <div style="font-size: 9px; font-family: monospace;">${order.orderNumber}</div>
          </div>
        </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch {
          window.print();
          resolve(true);
        }
      }, 150);
    });
  }

  // Unified Print Receipt Action (Called by POS Print Thermal Slip button)
  public async printReceipt(
    order: Order,
    customer?: Customer | null,
    forceDialog = false
  ): Promise<{ success: boolean; method: string; message: string }> {
    const settings = this.getSettings();
    soundEffects.playPrinterFeed();

    // 1. If cashier explicitly requests standard dialog, or direct print is disabled
    if (forceDialog || !settings.directPrintEnabled) {
      window.print();
      return {
        success: true,
        method: 'browser_dialog',
        message: 'Printer selection dialog opened.',
      };
    }

    // 2. Direct Hardware Web Serial (Zero prompt)
    if (this.isSerialConnected()) {
      try {
        const rawBytes = this.generateEscPos(order, customer, settings);
        const sent = await this.sendRawBytes(rawBytes);
        if (sent) {
          return {
            success: true,
            method: 'web_serial',
            message: 'Direct thermal slip sent directly to USB Serial printer (no prompt)!',
          };
        }
      } catch (err) {
        console.warn('Serial print failed, falling back to silent direct print', err);
      }
    }

    // 3. Direct Hardware Web Bluetooth (Zero prompt)
    if (this.isBluetoothConnected()) {
      try {
        const rawBytes = this.generateEscPos(order, customer, settings);
        const sent = await this.sendRawBytes(rawBytes);
        if (sent) {
          return {
            success: true,
            method: 'web_bluetooth',
            message: 'Direct thermal slip sent directly to Bluetooth printer (no prompt)!',
          };
        }
      } catch (err) {
        console.warn('Bluetooth print failed, falling back to silent direct print', err);
      }
    }

    // 4. Silent Direct Iframe Mode (Zero prompt in POS kiosk mode / clean formatted thermal slip)
    await this.printViaDirectIframe(order, customer, settings);
    return {
      success: true,
      method: 'silent_direct',
      message: 'Direct thermal slip sent directly to printer!',
    };
  }

  // Diagnostic Test Print Action
  public async testPrint(customSettings?: Partial<PrinterSettings>): Promise<{ success: boolean; message: string }> {
    const s = { ...this.getSettings(), ...customSettings };
    soundEffects.playPrinterFeed();

    const sampleOrder: Order = {
      id: 'TEST-' + Date.now().toString().slice(-6),
      orderNumber: 'TEST-REC-8899',
      source: 'pos_counter',
      customerPhone: '9820199882',
      items: [
        {
          itemId: 'test-item-1',
          name: 'Royal Shahi Maghai Meetha Paan',
          sku: 'SKU-PAAN-01',
          price: 60,
          costPrice: 25,
          quantity: 2,
          subtotal: 120,
          profit: 70,
        },
        {
          itemId: 'test-item-2',
          name: 'Signature Filter Cold Coffee 350ml',
          sku: 'SKU-COFFEE-02',
          price: 110,
          costPrice: 45,
          quantity: 1,
          subtotal: 110,
          profit: 65,
        },
      ],
      subtotal: 230,
      taxAmount: 11.5,
      discountAmount: 10,
      grandTotal: 231.5,
      totalCost: 95,
      totalProfit: 136.5,
      paymentMethod: 'cash',
      paymentStatus: 'paid',
      status: 'completed',
      cashierName: 'Admin Diagnostic',
      loyaltyPointsEarned: 23,
      createdAt: new Date().toISOString(),
    };

    const sampleCustomer: Customer = {
      id: 'cust-test',
      name: 'Diagnostic Tester',
      phone: '9820199882',
      email: 'test@richierich.in',
      loyaltyPoints: 340,
      tier: 'Gold',
      totalSpent: 4500,
      totalOrders: 18,
      joinDate: new Date().toISOString(),
    };

    if (this.isSerialConnected() || this.isBluetoothConnected()) {
      const bytes = this.generateEscPos(sampleOrder, sampleCustomer, s);
      const sent = await this.sendRawBytes(bytes);
      if (sent) {
        this.saveSettings({ lastTestedAt: new Date().toISOString() });
        return {
          success: true,
          message: 'Diagnostic test slip printed directly to hardware printer without prompt!',
        };
      }
    }

    await this.printViaDirectIframe(sampleOrder, sampleCustomer, s);
    this.saveSettings({ lastTestedAt: new Date().toISOString() });
    return {
      success: true,
      message: 'Direct diagnostic test slip dispatched to thermal printer!',
    };
  }

  // Kick cash drawer test
  public async testKickDrawer(): Promise<{ success: boolean; message: string }> {
    const CMD_DRAWER = new Uint8Array([0x1b, 0x70, 0x00, 0x19, 0xfa]);
    soundEffects.playClick();
    if (this.isSerialConnected() || this.isBluetoothConnected()) {
      const sent = await this.sendRawBytes(CMD_DRAWER);
      if (sent) {
        return { success: true, message: 'Cash drawer kick pulse sent to printer!' };
      }
    }
    return {
      success: false,
      message: 'Hardware printer must be paired via USB Serial or Bluetooth to kick cash drawer solenoid.',
    };
  }
}

export const printerService = new PrinterService();
