import React, { useEffect, useState } from 'react';
import { Plus, Trash2, IndianRupee } from 'lucide-react';
import api from '../../../shared/services/api';

export default function VehicleRepeater({ vehicles, setVehicles }) {
  const [masterVehicles, setMasterVehicles] = useState([]);

  useEffect(() => {
    api.get('/master-vehicles').then((res) => {
      setMasterVehicles(res.data);
    }).catch(console.error);
  }, []);

  const handleAddRow = () => {
    const defaultType = masterVehicles.length > 0 ? masterVehicles[0].vehicle_type : '6-Wheeler';
    const defaultRate = masterVehicles.length > 0 ? masterVehicles[0].default_rate : '4500';
    setVehicles([...vehicles, { vehicle_type: defaultType, rate_per_trip: defaultRate }]);
  };

  const handleRemoveRow = (index) => {
    const next = vehicles.filter((_, i) => i !== index);
    setVehicles(next);
  };

  const handleVehicleTypeChange = (index, newType) => {
    const matched = masterVehicles.find((mv) => mv.vehicle_type === newType);
    const next = [...vehicles];
    next[index].vehicle_type = newType;
    if (matched && matched.default_rate !== undefined) {
      next[index].rate_per_trip = matched.default_rate;
    }
    setVehicles(next);
  };

  const handleRateChange = (index, rate) => {
    const next = [...vehicles];
    next[index].rate_per_trip = rate;
    setVehicles(next);
  };

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <label className="block text-[#3D281C] font-bold text-xs uppercase tracking-wider">
          Configured Vehicle Trip Rate Matrix
        </label>
        <button
          type="button"
          onClick={handleAddRow}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg border border-[#E8DCD0] text-xs font-semibold text-[#5C361E] bg-[#FAF7F2] hover:bg-[#F5ECE3] transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Vehicle Rate</span>
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E8DCD0] text-center text-xs text-[#7A6759]">
          No vehicle rates added yet. Click "+ Add Vehicle Rate" above.
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {vehicles.map((v, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs p-2.5 sm:p-2 rounded-xl bg-[#FAF7F2] border border-[#E8DCD0]">
              <div className="w-full sm:w-1/2">
                <select
                  value={v.vehicle_type}
                  onChange={(e) => handleVehicleTypeChange(idx, e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#E8DCD0] text-[#2E1C11] focus:outline-none focus:border-[#8C5E3C] font-medium"
                >
                  {masterVehicles.map((mv) => (
                    <option key={mv.id} value={mv.vehicle_type}>
                      {mv.vehicle_type}
                    </option>
                  ))}
                  {/* Fallback option if custom text typed */}
                  {!masterVehicles.some((mv) => mv.vehicle_type === v.vehicle_type) && v.vehicle_type && (
                    <option value={v.vehicle_type}>{v.vehicle_type}</option>
                  )}
                </select>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-1/2">
                <div className="relative flex-1">
                  <IndianRupee className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#A8988B]" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Rate per trip (₹)"
                    value={v.rate_per_trip}
                    onChange={(e) => handleRateChange(idx, e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-white border border-[#E8DCD0] text-[#2E1C11] font-mono font-semibold placeholder-[#A8988B] focus:outline-none focus:border-[#8C5E3C]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveRow(idx)}
                  className="p-1.5 rounded-lg text-[#A8988B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                  title="Remove vehicle row"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
