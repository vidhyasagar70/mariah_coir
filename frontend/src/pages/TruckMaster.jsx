import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, IndianRupee, Save, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function TruckMaster() {
  const [masterVehicles, setMasterVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [newVehicle, setNewVehicle] = useState({
    vehicle_type: '',
    default_rate: ''
  });

  const fetchMasterVehicles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/master-vehicles');
      setMasterVehicles(res.data);
    } catch (err) {
      console.error('Error fetching master vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterVehicles();
  }, []);

  const handleAddMasterVehicle = async (e) => {
    e.preventDefault();
    setError('');

    if (!newVehicle.vehicle_type) {
      setError('Please enter a vehicle type name.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/master-vehicles', {
        vehicle_type: newVehicle.vehicle_type.trim(),
        default_rate: newVehicle.default_rate !== '' ? parseFloat(newVehicle.default_rate) : 0
      });
      setNewVehicle({ vehicle_type: '', default_rate: '' });
      fetchMasterVehicles();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, vehicleType) => {
    if (!window.confirm(`Are you sure you want to delete vehicle type "${vehicleType}" from Truck Master?`)) return;
    try {
      await api.delete(`/master-vehicles/${id}`);
      fetchMasterVehicles();
    } catch (err) {
      alert('Error deleting vehicle type: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="card-panel p-6 rounded-2xl space-y-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-slate-900 text-white">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Truck Master & Default Vehicle Rates</h3>
            <p className="text-xs text-slate-500">
              Define standard transport vehicle types and benchmark trip rates used across supplier entries.
            </p>
          </div>
        </div>
      </div>

      {/* Add Master Vehicle Type Form */}
      <div className="card-panel p-6 rounded-2xl space-y-4">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Add New Master Vehicle Type</h4>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleAddMasterVehicle} className="flex flex-col sm:flex-row items-center gap-3 text-xs">
          <div className="w-full sm:w-1/2">
            <label className="block text-slate-700 font-semibold mb-1">Vehicle Type / Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. 14-Wheeler Heavy Hauler"
              value={newVehicle.vehicle_type}
              onChange={(e) => setNewVehicle({ ...newVehicle, vehicle_type: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-500"
            />
          </div>

          <div className="w-full sm:w-1/3">
            <label className="block text-slate-700 font-semibold mb-1">Default Rate Per Trip (₹)</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 9500"
                value={newVehicle.default_rate}
                onChange={(e) => setNewVehicle({ ...newVehicle, default_rate: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold placeholder-slate-400 focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          <div className="w-full sm:w-auto pt-5">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-bold cursor-pointer disabled:opacity-50 transition-all shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>{submitting ? 'Adding...' : 'Add Vehicle Type'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Master Vehicle List Table */}
      <div className="card-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading Truck Master list...</span>
          </div>
        ) : masterVehicles.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Truck className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Vehicle Types Configured</h3>
            <p className="text-xs text-slate-500">Add standard vehicle types above to configure trip rate matrices.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">VEHICLE TYPE</th>
                  <th className="p-4">DEFAULT TRIP RATE</th>
                  <th className="p-4">USAGE NOTE</th>
                  <th className="p-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {masterVehicles.map((mv) => (
                  <tr key={mv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-bold text-slate-900 flex items-center space-x-2">
                      <Truck className="h-4 w-4 text-slate-500" />
                      <span>{mv.vehicle_type}</span>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(mv.default_rate)} <span className="text-[11px] font-normal text-slate-400">/ trip</span>
                    </td>
                    <td className="p-4 text-slate-500">
                      Populates dynamic vehicle choices when registering suppliers
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(mv.id, mv.vehicle_type)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Vehicle Type"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
