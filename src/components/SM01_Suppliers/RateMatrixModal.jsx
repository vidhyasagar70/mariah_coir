import React, { useState, useEffect } from 'react';
import { X, Truck, Plus, Trash2, ShieldCheck, IndianRupee } from 'lucide-react';
import api from '../../api/client';
import { formatCurrency } from '../../utils/formatters';

export default function RateMatrixModal({ supplier, isOpen, onClose, onSuccess }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ vehicle_type: '6-Wheeler', rate_per_trip: '' });
  const [error, setError] = useState('');

  const fetchVehicles = async () => {
    if (!supplier) return;
    try {
      setLoading(true);
      const res = await api.get(`/suppliers/${supplier.id}/vehicles`);
      setVehicles(res.data);
    } catch (err) {
      console.error('Error loading vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && supplier) {
      fetchVehicles();
    }
    setError('');
  }, [isOpen, supplier]);

  if (!isOpen || !supplier) return null;

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!newVehicle.vehicle_type || !newVehicle.rate_per_trip) {
      setError('Please provide vehicle type and rate per trip.');
      return;
    }

    try {
      setError('');
      await api.post(`/suppliers/${supplier.id}/vehicles`, {
        vehicle_type: newVehicle.vehicle_type,
        rate_per_trip: parseFloat(newVehicle.rate_per_trip)
      });
      setNewVehicle({ vehicle_type: '6-Wheeler', rate_per_trip: '' });
      fetchVehicles();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    try {
      await api.delete(`/vehicles/${vehicleId}`);
      fetchVehicles();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError('Failed to delete vehicle rate entry.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl glass-panel p-6 border border-slate-700 shadow-2xl space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-100 text-base">Vehicle Rate Matrix</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-800 text-emerald-400 font-semibold">
                  {supplier.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">{supplier.name} • {supplier.company_name || supplier.category}</p>
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

        {/* Existing Rate Matrix List */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Configured Transport Rates</h4>

          {loading ? (
            <div className="py-4 text-center text-xs text-slate-500">Loading matrix...</div>
          ) : vehicles.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500">
              No vehicle rates configured for this supplier yet. Add one below!
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800/80 bg-slate-950/50 overflow-hidden">
              {vehicles.map((v) => (
                <div key={v.id} className="p-3.5 flex items-center justify-between hover:bg-slate-900/50 transition-colors text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-200 text-sm">{v.vehicle_type}</span>
                      <p className="text-[11px] text-slate-400">Fixed rate per transport trip</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <span className="font-mono text-sm font-bold text-emerald-400">
                      {formatCurrency(v.rate_per_trip)} <span className="text-[11px] font-normal text-slate-500">/ trip</span>
                    </span>
                    <button
                      onClick={() => handleDeleteVehicle(v.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Remove rate"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Rate Form */}
        <form onSubmit={handleAddVehicle} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
          <h4 className="text-xs font-semibold text-slate-300">Add Vehicle & Trip Rate</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Vehicle Type</label>
              <select
                value={newVehicle.vehicle_type}
                onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="Pickup">Pickup (Small Truck)</option>
                <option value="6-Wheeler">6-Wheeler Heavy Truck</option>
                <option value="10-Wheeler">10-Wheeler Heavy Truck</option>
                <option value="Tractor Trailer">Tractor Trailer</option>
                <option value="Diesel Tanker">Diesel Fuel Tanker</option>
                <option value="Water Tanker (6000L)">Water Tanker (6000L)</option>
                <option value="Water Tanker (12000L)">Water Tanker (12000L)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Rate Per Trip (₹)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="e.g. 4500"
                  value={newVehicle.rate_per_trip}
                  onChange={(e) => setNewVehicle({ ...newVehicle, rate_per_trip: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add to Rate Matrix</span>
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
