import React from 'react';
import { Plus, Trash2, Truck, IndianRupee } from 'lucide-react';

export default function VehicleRepeater({ vehicles, setVehicles }) {
  const handleAddRow = () => {
    setVehicles([...vehicles, { vehicle_type: '6-Wheeler', rate_per_trip: '' }]);
  };

  const handleRemoveRow = (index) => {
    const next = vehicles.filter((_, i) => i !== index);
    setVehicles(next);
  };

  const handleChange = (index, field, value) => {
    const next = [...vehicles];
    next[index][field] = value;
    setVehicles(next);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <label className="block text-slate-700 font-bold text-xs uppercase tracking-wider">
          Configured Vehicle Trip Rate Matrix
        </label>
        <button
          type="button"
          onClick={handleAddRow}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Vehicle Rate</span>
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
          No vehicle rates added yet. Click "+ Add Vehicle Rate" above.
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {vehicles.map((v, idx) => (
            <div key={idx} className="flex items-center space-x-2 text-xs p-2 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-1/2">
                <select
                  value={v.vehicle_type}
                  onChange={(e) => handleChange(idx, 'vehicle_type', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-slate-500"
                >
                  <option value="Pickup">Pickup (Small Truck)</option>
                  <option value="6-Wheeler">6-Wheeler Truck</option>
                  <option value="10-Wheeler">10-Wheeler Truck</option>
                  <option value="Tractor Trailer">Tractor Trailer</option>
                  <option value="Diesel Tanker">Diesel Fuel Tanker</option>
                  <option value="Water Tanker (6000L)">Water Tanker (6000L)</option>
                  <option value="Water Tanker (12000L)">Water Tanker (12000L)</option>
                </select>
              </div>

              <div className="w-1/2 relative">
                <IndianRupee className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Rate per trip (₹)"
                  value={v.rate_per_trip}
                  onChange={(e) => handleChange(idx, 'rate_per_trip', e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 font-mono font-semibold placeholder-slate-400 focus:outline-none focus:border-slate-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRemoveRow(idx)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                title="Remove vehicle row"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
