import React, { useState, useEffect } from 'react';
import { X, Truck, Calendar, Hash, IndianRupee, Save, Info, AlertTriangle } from 'lucide-react';
import api from '../../api/client';
import { formatCurrency } from '../../utils/formatters';

export default function ReceiptModal({ isOpen, onClose, onSuccess }) {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierVehicles, setSelectedSupplierVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    supplier_id: '',
    material_type: 'Green Husk',
    vehicle_type: '',
    receipt_date: new Date().toISOString().split('T')[0],
    trip_count: 1,
    rate_per_trip: 0
  });

  // Load active suppliers list
  useEffect(() => {
    if (isOpen) {
      api.get('/suppliers?status=Active').then((res) => {
        setSuppliers(res.data);
        if (res.data.length > 0 && !formData.supplier_id) {
          setFormData((prev) => ({ ...prev, supplier_id: res.data[0].id }));
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  // When selected supplier changes, fetch their vehicle rate matrix
  useEffect(() => {
    if (formData.supplier_id) {
      api.get(`/suppliers/${formData.supplier_id}/vehicles`).then((res) => {
        setSelectedSupplierVehicles(res.data);
        if (res.data.length > 0) {
          // Auto select first vehicle type and populate rate_per_trip
          const firstVeh = res.data[0];
          setFormData((prev) => ({
            ...prev,
            vehicle_type: firstVeh.vehicle_type,
            rate_per_trip: firstVeh.rate_per_trip
          }));
        } else {
          // Default vehicle if matrix is empty
          setFormData((prev) => ({
            ...prev,
            vehicle_type: '6-Wheeler',
            rate_per_trip: 0
          }));
        }
      }).catch(console.error);
    }
  }, [formData.supplier_id]);

  // Handle Vehicle Selection Change
  const handleVehicleChange = (vehicleType) => {
    const matched = selectedSupplierVehicles.find((v) => v.vehicle_type === vehicleType);
    setFormData((prev) => ({
      ...prev,
      vehicle_type: vehicleType,
      rate_per_trip: matched ? matched.rate_per_trip : prev.rate_per_trip
    }));
  };

  const calculatedTotal = (parseInt(formData.trip_count || 0, 10)) * (parseFloat(formData.rate_per_trip || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.supplier_id || !formData.vehicle_type || formData.trip_count <= 0 || formData.rate_per_trip < 0) {
      setError('Please fill in all required fields accurately.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/receipts', {
        ...formData,
        trip_count: parseInt(formData.trip_count, 10),
        rate_per_trip: parseFloat(formData.rate_per_trip)
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-2xl glass-panel p-6 border border-slate-700 shadow-2xl space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Record Material Receipt (Goods Inward)</h3>
              <p className="text-xs text-slate-400">Creates receipt entry (RCT-xxxx) and updates supplier ledger</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Supplier Selection */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Supplier *</label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} - {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>

          {/* Material Type & Receipt Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Material Type *</label>
              <select
                value={formData.material_type}
                onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="Green Husk">Green Husk</option>
                <option value="Brown Husk">Brown Husk</option>
                <option value="Water">Water</option>
                <option value="Diesel">Diesel</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Receipt Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="date"
                  required
                  value={formData.receipt_date}
                  onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Type Selection */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Vehicle Type *</label>
            {selectedSupplierVehicles.length > 0 ? (
              <select
                value={formData.vehicle_type}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {selectedSupplierVehicles.map((v) => (
                  <option key={v.id} value={v.vehicle_type}>
                    {v.vehicle_type} (Configured Rate: ₹ {v.rate_per_trip} / trip)
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="e.g. 6-Wheeler"
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-amber-400/90 flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>No preset vehicle rate matrix found for this supplier. Enter manually.</span>
                </p>
              </div>
            )}
          </div>

          {/* Trip Count & Rate Per Trip */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Trip Count *</label>
              <div className="relative">
                <Hash className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.trip_count}
                  onChange={(e) => setFormData({ ...formData, trip_count: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Rate Per Trip (₹) *</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.rate_per_trip}
                  onChange={(e) => setFormData({ ...formData, rate_per_trip: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Calculated Total Amount Live Preview */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Total Amount</span>
              <p className="text-[11px] text-slate-500">
                {formData.trip_count || 0} trip(s) × ₹ {formData.rate_per_trip || 0}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xl font-extrabold text-emerald-400 font-mono tracking-tight">
                {formatCurrency(calculatedTotal)}
              </span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Recording...' : 'Record Goods Inward'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
