import React from 'react';
import {
  Building2,
  Store,
  MapPin,
  Phone,
  UserCheck,
  Truck,
  ArrowRight,
  ShieldCheck,
  Boxes,
  ThermometerSnowflake,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Warehouse, WarehouseTab } from '../../../types/warehouse';
import { StoreLocation, InventoryItem } from '../../../types';
import { CURRENCY } from '../../../services/storage';

interface WarehouseLocationsViewProps {
  warehouses: Warehouse[];
  stores: StoreLocation[];
  inventory: InventoryItem[];
  onOpenAddWarehouse?: () => void;
  onOpenTransfer: () => void;
  onNavigateTab?: (tab: WarehouseTab) => void;
}

export const WarehouseLocationsView: React.FC<WarehouseLocationsViewProps> = ({
  warehouses,
  stores,
  inventory,
  onOpenTransfer,
  onNavigateTab,
}) => {
  const centralWh = warehouses[0] || {
    id: 'wh-central-amd',
    code: 'WH-AMD-01',
    name: 'Richie Rich Central Master Warehouse (Ahmedabad Hub)',
    type: 'central_hub',
    address: 'Survey 142/B, Gota-Godhavi Logistics Park, SG Highway',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '382481',
    contactPerson: 'Vikramsinh Vaghela',
    phone: '+91 98251 44550',
    email: 'warehouse.ahmedabad@richierich.in',
    totalCapacitySqFt: 25000,
    utilizationPercent: 64,
    temperatureControlled: true,
    temperatureRange: '18°C - 22°C (Optimal Paan Leaves, Syrups & Cafe Goods)',
    managerName: 'Vikramsinh Vaghela',
    operatingHours: '24 Hours (3 Active Shifts)',
    storageZones: [
      'Zone A: Paan Betel Leaves Humidity Controlled Cold Vault',
      'Zone B: Cafe Espresso Beans, Syrups & Beverage Stock',
      'Zone C: Essentials, Mukhwas, Supari & Silver Vark Safe',
      'Zone D: Dispatched & Inward Staging Bays',
    ],
  };

  const totalCentralUnits = inventory.reduce((sum, item) => sum + item.stockQuantity, 0);
  const totalValuation = inventory.reduce((sum, item) => sum + item.stockQuantity * item.costPrice, 0);

  return (
    <div className="space-y-6">
      {/* 1. Single Central Master Warehouse Spotlight Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Single Master Facility
              </span>
              <span className="text-xs font-mono text-indigo-200 bg-white/10 px-2 py-0.5 rounded border border-white/15">
                {centralWh.code || 'WH-AMD-01'}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-300 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Operational 24x7
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {centralWh.name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{centralWh.address}, {centralWh.city}, {centralWh.state} — {centralWh.pincode}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenTransfer}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Dispatch Stock to Stores</span>
            </button>
          </div>
        </div>

        {/* Facility Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/50">
          <div className="p-4 space-y-0.5">
            <span className="text-[11px] text-slate-500 font-medium">Total Stored Units</span>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {totalCentralUnits.toLocaleString()} <span className="text-xs text-slate-500 font-normal">units</span>
            </div>
          </div>
          <div className="p-4 space-y-0.5">
            <span className="text-[11px] text-slate-500 font-medium">Central Stock Valuation</span>
            <div className="text-lg font-bold text-emerald-700 font-mono">
              {CURRENCY}{totalValuation.toLocaleString()}
            </div>
          </div>
          <div className="p-4 space-y-0.5">
            <span className="text-[11px] text-slate-500 font-medium">Facility Floor Area</span>
            <div className="text-lg font-bold text-slate-900 font-mono">
              {(centralWh.totalCapacitySqFt || 25000).toLocaleString()} <span className="text-xs text-slate-500 font-normal">sq.ft</span>
            </div>
          </div>
          <div className="p-4 space-y-0.5">
            <span className="text-[11px] text-slate-500 font-medium">Capacity Utilization</span>
            <div className="text-lg font-bold text-indigo-700 font-mono">
              {centralWh.utilizationPercent || 64}% <span className="text-xs text-slate-500 font-normal">utilized</span>
            </div>
          </div>
        </div>

        {/* Zones and Environmental Specs */}
        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dedicated Temperature & Storage Zones */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-indigo-600" />
              <span>Storage Zones & Vault Segregation</span>
            </h3>
            <div className="space-y-2">
              {(centralWh.storageZones || [
                'Zone A: Paan Betel Leaves Humidity Controlled Cold Vault',
                'Zone B: Cafe Espresso Beans, Syrups & Beverage Stock',
                'Zone C: Essentials, Mukhwas, Supari & Silver Vark Safe',
                'Zone D: Dispatched & Inward Staging Bays',
              ]).map((zone, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2.5 text-xs text-slate-700 font-medium"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{zone}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Environmental Specs & Management Team */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <ThermometerSnowflake className="w-4 h-4 text-cyan-600" />
              <span>Climate Specifications & Management</span>
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-cyan-50/60 rounded-xl border border-cyan-100 flex items-start gap-2.5">
                <ThermometerSnowflake className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-cyan-950">Active Climate Control Range</div>
                  <div className="text-cyan-800 text-[11px] mt-0.5">
                    {centralWh.temperatureRange || '18°C - 22°C (Optimal Paan Leaves, Syrups & Cafe Goods)'}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Warehouse Head Incharge:</span>
                  <span className="font-bold text-slate-900">{centralWh.managerName || 'Vikramsinh Vaghela'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Emergency Logistics Desk:</span>
                  <span className="font-mono text-slate-800 font-semibold">{centralWh.phone || '+91 98251 44550'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Operating Protocol:</span>
                  <span className="font-semibold text-emerald-700">{centralWh.operatingHours || '24 Hours (3 Active Shifts)'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Connected Retail Store Outlets Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-600" />
              <span>Connected Store Outlets (Replenished by Central Hub)</span>
            </h2>
            <p className="text-xs text-slate-500">
              Live stock levels & POS terminals served directly from Ahmedabad Central Warehouse
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stores.map((st) => {
            const totalStoreUnits = inventory.reduce((sum, item) => {
              const alloc = item.storeAllocations || {};
              return sum + (alloc[st.id] || 0);
            }, 0);

            const storeValuation = inventory.reduce((sum, item) => {
              const alloc = item.storeAllocations || {};
              const qty = alloc[st.id] || 0;
              return sum + qty * item.costPrice;
            }, 0);

            return (
              <div
                key={st.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3 hover:border-emerald-300 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      STORE #{st.id.toUpperCase()}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{st.name}</h3>
                    <p className="text-xs text-slate-500">{st.city} • {st.area || 'Retail Lounge'}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Store className="w-4 h-4" />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/40 rounded-xl space-y-1 text-xs border border-emerald-100/60">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Current Stock:</span>
                    <strong className="font-mono text-emerald-800 text-sm">{totalStoreUnits} units</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Store Stock Value:</span>
                    <span className="font-bold text-slate-800">{CURRENCY}{storeValuation.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-0.5">
                    <span>POS Counters:</span>
                    <span className="text-emerald-700 font-semibold">{st.counters?.length || 2} Online</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  {onNavigateTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('store_stock')}
                      className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs border border-emerald-200/80 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Store className="w-3.5 h-3.5" />
                      <span>Check Individual Stock</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onOpenTransfer}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Replenish from Central Hub</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
