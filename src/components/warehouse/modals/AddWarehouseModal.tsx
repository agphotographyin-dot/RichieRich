import React, { useState } from 'react';
import { X, Building2, MapPin, Phone, User } from 'lucide-react';
import { warehouseStorage } from '../../../services/warehouseStorage';

interface AddWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddWarehouseModal: React.FC<AddWarehouseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Ahmedabad');
  const [address, setAddress] = useState('');
  const [capacitySqFt, setCapacitySqFt] = useState<number>(5000);
  const [isCentral, setIsCentral] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    warehouseStorage.addWarehouse({
      code: `WH-AHM-${Date.now().toString().slice(-3)}`,
      name,
      type: isCentral ? 'central_hub' : 'regional_depot',
      address,
      city,
      state: 'Gujarat',
      pincode: '380060',
      contactPerson: managerName,
      managerName,
      phone: phone || '+91 98250 99999',
      email: 'ops@richierichpan.com',
      totalCapacitySqFt: capacitySqFt,
      utilizationPercent: 15,
      temperatureControlled: true,
      temperatureRange: '18°C to 24°C',
      isActive: true,
      operatingHours: '24x7 Active Operations',
      storageZones: ['Zone A - Inward Staging', 'Zone B - High-Value Inventory', 'Zone C - Temperature Storage'],
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden my-8">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base">Add Warehouse Facility</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Warehouse Facility Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sanand Logistics Depot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Facility Incharge
              </label>
              <input
                type="text"
                required
                placeholder="Manager Name"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Direct Phone
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98250 00000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Address & Area
            </label>
            <input
              type="text"
              required
              placeholder="Plot No, GIDC Phase II"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Storage Area (Sq Ft)
              </label>
              <input
                type="number"
                min="500"
                value={capacitySqFt}
                onChange={(e) => setCapacitySqFt(parseInt(e.target.value) || 5000)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                City / Zone
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md"
            >
              Save Warehouse
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
