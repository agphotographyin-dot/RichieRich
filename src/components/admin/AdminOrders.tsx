import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  Clock,
  Filter,
  DollarSign,
  User,
  ArrowRight,
  Printer,
  ChevronDown,
  Store,
  BadgePercent,
  UserCheck,
  FileText,
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { CURRENCY, storage } from '../../services/storage';
import { DocumentManifestModal } from '../common/DocumentManifestModal';

interface AdminOrdersProps {
  orders: Order[];
}

export const AdminOrders: React.FC<AdminOrdersProps> = ({ orders }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [salespersonFilter, setSalespersonFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState<Order | null>(null);

  const stores = storage.getStores();

  // Extract unique salespersons from orders & store counters
  const salespersons = Array.from(
    new Set([
      ...orders.map((o) => o.cashierName).filter(Boolean),
      ...stores.flatMap((s) => s.counters.map((c) => c.cashierName)),
    ])
  ) as string[];

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.customerPhone && o.customerPhone.includes(searchTerm)) ||
      (o.storeName && o.storeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.cashierName && o.cashierName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || o.source === sourceFilter;
    const matchesStore =
      storeFilter === 'all' ||
      o.storeId === storeFilter ||
      (o.storeName && o.storeName.toLowerCase().includes(storeFilter.toLowerCase()));
    const matchesSalesperson =
      salespersonFilter === 'all' ||
      o.cashierName === salespersonFilter;

    return matchesSearch && matchesStatus && matchesSource && matchesStore && matchesSalesperson;
  });

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    storage.updateOrderStatus(orderId, newStatus);
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Master Orders & Sales Ledger</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
              {orders.length} Total Orders
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time fulfillment ledger with complete Store outlet and Salesperson in-charge details.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col lg:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search order #, customer, store, staff..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          {/* Store Filter */}
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-lg px-2.5 py-2 focus:outline-hidden focus:border-slate-400 cursor-pointer max-w-[160px]"
          >
            <option value="all">🏬 All Stores</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.shortName}
              </option>
            ))}
          </select>

          {/* Salesperson Filter */}
          <select
            value={salespersonFilter}
            onChange={(e) => setSalespersonFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-lg px-2.5 py-2 focus:outline-hidden focus:border-slate-400 cursor-pointer max-w-[150px]"
          >
            <option value="all">👤 All Staff / Cashiers</option>
            {salespersons.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-lg px-2.5 py-2 focus:outline-hidden focus:border-slate-400 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready for Pickup</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium rounded-lg px-2.5 py-2 focus:outline-hidden focus:border-slate-400 cursor-pointer"
          >
            <option value="all">All Channels</option>
            <option value="pos_counter">POS Counter</option>
            <option value="customer_online">Customer Online App</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Order ID & Date</th>
                <th className="py-3.5 px-3">Store Outlet & Counter</th>
                <th className="py-3.5 px-3">Salesperson / Staff</th>
                <th className="py-3.5 px-3">Customer Info</th>
                <th className="py-3.5 px-3">Items Summary</th>
                <th className="py-3.5 px-3">Grand Total</th>
                <th className="py-3.5 px-3">Profit</th>
                <th className="py-3.5 px-3">Payment</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <ShoppingBag className="w-10 h-10 stroke-1 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700">No orders found matching filters</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const store = stores.find((s) => s.id === o.storeId);
                  const displayStoreName = o.storeName || store?.name || 'Gota Main Branch';
                  const displayShortStore = store?.shortName || (o.storeName ? o.storeName.split('-')[0] : 'Gota Main');

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{o.orderNumber}</div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                          {new Date(o.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Store & Counter */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-start gap-1.5">
                          <Store className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate max-w-[130px]" title={displayStoreName}>
                              {displayShortStore}
                            </p>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {o.counterNumber ? `Counter ${o.counterNumber}` : o.source === 'customer_online' ? 'Online Direct' : 'Counter 1'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Salesperson / Cashier */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {(o.cashierName || 'Staff')[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 truncate max-w-[110px]">
                              {o.cashierName || 'Cashier Desk'}
                            </p>
                            <span className="text-[9px] text-slate-400 uppercase font-mono">
                              {o.source === 'pos_counter' ? 'Counter POS' : 'Online System'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900">{o.customerName || 'Walk-in Guest'}</div>
                        {o.customerPhone && <div className="text-[10px] text-slate-500 font-mono">{o.customerPhone}</div>}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="text-slate-700 truncate max-w-xs font-medium">
                          {o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                        {o.notes && <div className="text-[10px] text-amber-700 italic mt-0.5">Note: {o.notes}</div>}
                      </td>

                      <td className="py-3.5 px-3 font-bold text-slate-900 text-sm">
                        {CURRENCY}{o.grandTotal.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 font-bold text-emerald-600">
                        +{CURRENCY}{o.totalProfit.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-3 uppercase text-[10px] font-mono text-slate-500">
                        {o.paymentMethod.replace('_', ' ')}
                      </td>

                      <td className="py-3.5 px-3">
                        <select
                          value={o.status}
                          onChange={(e) => handleStatusChange(o.id, e.target.value as OrderStatus)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border focus:outline-hidden cursor-pointer ${
                            o.status === 'completed'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : o.status === 'ready'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : o.status === 'preparing'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="preparing">Preparing</option>
                          <option value="ready">Ready for Pickup</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInvoiceToPrint(o)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition-colors cursor-pointer border border-slate-200"
                            title="Print Tax Invoice / Slip"
                          >
                            <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          </button>
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-200"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Order #{selectedOrder.orderNumber}</h3>
                <p className="text-xs text-slate-500">
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInvoiceToPrint(selectedOrder)}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 text-base font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Store & Salesperson Information Card */}
              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2.5 text-xs">
                <h4 className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-amber-700" />
                  <span>Store Outlet & Staff Details</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Store Branch:</span>
                    <span className="font-bold text-slate-900">
                      {selectedOrder.storeName || storage.getStoreById(selectedOrder.storeId || '')?.name || 'Richie Rich Pan House - Gota Main'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Counter Desk:</span>
                    <span className="font-bold text-slate-900">
                      {selectedOrder.counterName || (selectedOrder.counterNumber ? `Counter ${selectedOrder.counterNumber}` : 'Counter 1 (Main Billing)')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Salesperson / Cashier:</span>
                    <span className="font-bold text-emerald-800">
                      {selectedOrder.cashierName || 'Staff Cashier'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Channel Source:</span>
                    <span className="font-bold text-slate-900">
                      {selectedOrder.source === 'pos_counter' ? 'Point of Sale (POS)' : 'Customer Online Order'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Customer:</span>
                  <span className="font-bold text-slate-900">{selectedOrder.customerName || 'Walk-in Guest'}</span>
                </div>
                {selectedOrder.customerPhone && (
                  <div>
                    <span className="text-slate-500 block text-[11px]">Phone:</span>
                    <span className="font-mono text-slate-800 font-bold">{selectedOrder.customerPhone}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 block text-[11px]">Payment:</span>
                  <span className="font-mono uppercase font-bold text-slate-800">{selectedOrder.paymentMethod}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700">Items Ordered:</div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{it.quantity}x {it.name}</span>
                        {it.taxRate !== undefined && (
                          <span className="ml-2 text-[10px] text-slate-500">
                            ({it.taxRate > 0 ? `${it.taxRate}% GST` : '0% Exempt'})
                          </span>
                        )}
                        {it.customization && <p className="text-[10px] text-amber-700">{it.customization}</p>}
                      </div>
                      <span className="font-bold text-slate-900">{CURRENCY}{it.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ledger Summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-700">{CURRENCY}{selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount Applied ({selectedOrder.appliedPromoCode || 'Promo'}):</span>
                    <span className="font-semibold">-{CURRENCY}{selectedOrder.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>GST Tax & Levies:</span>
                  <span className="font-semibold text-slate-700">{CURRENCY}{selectedOrder.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-1 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-slate-900">{CURRENCY}{selectedOrder.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 text-[11px] pt-1">
                  <span>Net Profit Contribution:</span>
                  <span className="font-bold">+{CURRENCY}{selectedOrder.totalProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 shrink-0">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice / Receipt Modal */}
      <DocumentManifestModal
        isOpen={Boolean(invoiceToPrint)}
        onClose={() => setInvoiceToPrint(null)}
        documentType="retail_order"
        documentData={invoiceToPrint}
      />
    </div>
  );
};
