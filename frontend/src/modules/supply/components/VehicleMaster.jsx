import React, { useState, useEffect } from 'react';
import { Layers, Plus, Pencil, Trash2, X, Search } from 'lucide-react';

const API = 'http://localhost:5000/api/supply';

export default function VehicleMaster() {
  const [data, setData] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const emptyVehicleRow = () => ({ vehicle_type_id: '', vehicle_number: '', custom_driver_info: '', notes: '' });

  const [form, setForm] = useState({
    supplier_id: '',
    vehicles: [emptyVehicleRow()]
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterSupplier) params.append('supplier_id', filterSupplier);
      const res = await fetch(`${API}/vehicles?${params}`);
      const json = await res.json();
      setData(json.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchMasters = async () => {
    try {
      const [sRes, vtRes] = await Promise.all([
        fetch(`${API}/suppliers?status=Active`),
        fetch(`${API}/vehicle-types?status=active`)
      ]);
      const sJson = await sRes.json();
      const vtJson = await vtRes.json();
      setSuppliers(sJson.data || []);
      setVehicleTypes(vtJson.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchMasters(); }, []);
  useEffect(() => { fetchData(); }, [search, filterSupplier]);

  const openCreate = () => {
    setEditItem(null);
    setForm({
      supplier_id: suppliers.length > 0 ? suppliers[0].id : '',
      vehicles: [emptyVehicleRow()]
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      supplier_id: item.supplier_id || '',
      vehicles: [{
        vehicle_type_id: item.vehicle_type_id || '',
        vehicle_number: item.vehicle_number || '',
        custom_driver_info: item.custom_driver_info || '',
        notes: item.notes || ''
      }]
    });
    setShowModal(true);
  };

  const handleVehicleChange = (index, field, value) => {
    setForm(prev => {
      const updated = [...prev.vehicles];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, vehicles: updated };
    });
  };

  const addVehicleRow = () => {
    setForm(prev => ({
      ...prev,
      vehicles: [...prev.vehicles, emptyVehicleRow()]
    }));
  };

  const removeVehicleRow = (index) => {
    if (form.vehicles.length <= 1) return;
    setForm(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    if (!form.supplier_id) {
      alert('Please select a supplier.');
      return;
    }

    // Validate that every vehicle item has a vehicle_type_id
    for (let i = 0; i < form.vehicles.length; i++) {
      if (!form.vehicles[i].vehicle_type_id) {
        alert(`Please select a Vehicle Type for vehicle #${i + 1}.`);
        return;
      }
    }

    try {
      if (editItem) {
        const url = `${API}/vehicles/${editItem.id}`;
        const singleVehicle = form.vehicles[0];
        const payload = {
          supplier_id: form.supplier_id,
          vehicle_type_id: singleVehicle.vehicle_type_id,
          vehicle_number: singleVehicle.vehicle_number,
          custom_driver_info: singleVehicle.custom_driver_info,
          notes: singleVehicle.notes,
          status: editItem.status !== undefined ? editItem.status : true
        };
        await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        const url = `${API}/vehicles`;
        const payload = {
          supplier_id: form.supplier_id,
          vehicles: form.vehicles
        };
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      setShowModal(false);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Error saving vehicle assignment.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this vehicle?')) return;
    await fetch(`${API}/vehicles/${id}`, { method: 'DELETE' });
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-[#E2D2C2]"><Layers className="h-5 w-5 text-[#965E36]" /></div>
          <div>
            <h2 className="text-base font-extrabold text-[#2E1A0C]">Supplier Vehicles</h2>
            <p className="text-[11px] text-[#7C5A3E]">{data.length} vehicle(s) registered</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto flex-wrap gap-y-2">
          <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none">
            <option value="">All Suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C694E]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full sm:w-44 pl-9 pr-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] placeholder-[#8C694E] focus:ring-2 focus:ring-[#965E36] outline-none transition" />
          </div>
          <button onClick={openCreate} className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#965E36] text-white text-xs font-bold hover:bg-[#7A4A28] transition shadow-xs cursor-pointer">
            <Plus className="h-3.5 w-3.5" /><span>Add Vehicle</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6C4B0] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#EFE6DC] text-[#5C3B21]">
              <tr>
                <th className="text-left px-4 py-3 font-bold">#</th>
                <th className="text-left px-4 py-3 font-bold">Assigned Supplier</th>
                <th className="text-left px-4 py-3 font-bold">Vehicle Type</th>
                <th className="text-left px-4 py-3 font-bold">Vehicle Number</th>
                <th className="text-left px-4 py-3 font-bold">Driver / Fleet Info</th>
                <th className="text-left px-4 py-3 font-bold">Status</th>
                <th className="text-center px-4 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE6DC]">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-8 text-[#8C694E]">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8 text-[#8C694E]">No vehicles found.</td></tr>
              ) : data.map((item, i) => (
                <tr key={item.id} className="hover:bg-[#FAF7F2] transition">
                  <td className="px-4 py-3 text-[#8C694E]">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-semibold text-[#2E1A0C]">{item.supplier_name}</span>
                      <span className="ml-1.5 text-[10px] font-mono text-[#965E36]">{item.supplier_code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#5C3B21]">{item.vehicle_type_name}</td>
                  <td className="px-4 py-3 font-mono font-bold text-[#2E1A0C]">{item.vehicle_number || '-'}</td>
                  <td className="px-4 py-3 text-[#7C5A3E] max-w-[150px] truncate">{item.custom_driver_info || item.notes || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {item.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-[#E2D2C2] text-[#7C5A3E] cursor-pointer transition"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 cursor-pointer transition"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#D6C4B0] w-full max-w-xl p-6 shadow-xl space-y-4 mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#EFE6DC] pb-3 shrink-0">
              <div>
                <h3 className="font-extrabold text-[#2E1A0C]">
                  {editItem ? 'Edit Supplier Vehicle' : 'Add Supplier Vehicles'}
                </h3>
                <p className="text-[11px] text-[#7C5A3E]">
                  {editItem ? 'Update vehicle details for selected supplier' : 'Select a supplier and add one or multiple vehicle types with details'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-[#E2D2C2] cursor-pointer transition">
                <X className="h-4 w-4 text-[#7C5A3E]" />
              </button>
            </div>
            
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">
                  Assign to Supplier *
                </label>
                <select
                  value={form.supplier_id}
                  onChange={e => setForm({ ...form, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] font-semibold focus:ring-2 focus:ring-[#965E36] outline-none"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.supplier_code ? `[${s.supplier_code}] ` : ''}{s.name} ({s.category || 'Raw Material'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#5C3B21] uppercase tracking-wider">
                    Vehicles to Add ({form.vehicles.length})
                  </label>
                  {!editItem && (
                    <button
                      type="button"
                      onClick={addVehicleRow}
                      className="flex items-center space-x-1 text-[11px] font-bold text-[#965E36] hover:text-[#7A4A28] cursor-pointer transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Another Vehicle</span>
                    </button>
                  )}
                </div>

                {form.vehicles.map((vItem, index) => (
                  <div key={index} className="bg-[#FAF7F2] border border-[#D6C4B0] rounded-xl p-3.5 space-y-3 relative group">
                    <div className="flex items-center justify-between border-b border-[#EFE6DC] pb-2">
                      <span className="text-xs font-extrabold text-[#965E36]">
                        Vehicle #{index + 1}
                      </span>
                      {!editItem && form.vehicles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVehicleRow(index)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer transition"
                          title="Remove vehicle entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-[#5C3B21] block mb-1">Vehicle Type *</label>
                        <select
                          value={vItem.vehicle_type_id}
                          onChange={e => handleVehicleChange(index, 'vehicle_type_id', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none"
                        >
                          <option value="">Select Vehicle Type</option>
                          {vehicleTypes.map(vt => (
                            <option key={vt.id} value={vt.id}>
                              {vt.name}{vt.capacity ? ` (${vt.capacity})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[#5C3B21] block mb-1">Vehicle Number *</label>
                        <input
                          value={vItem.vehicle_number}
                          onChange={e => handleVehicleChange(index, 'vehicle_number', e.target.value)}
                          placeholder="e.g. TN 38 B 9912"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#D6C4B0] bg-white text-[#2E1A0C] font-mono font-bold focus:ring-2 focus:ring-[#965E36] outline-none uppercase"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-[#5C3B21] block mb-1">Driver Info / Fleet Alias</label>
                        <input
                          value={vItem.custom_driver_info}
                          onChange={e => handleVehicleChange(index, 'custom_driver_info', e.target.value)}
                          placeholder="e.g. Selvam Driver (+91 94432...)"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-[#5C3B21] block mb-1">Notes</label>
                        <input
                          value={vItem.notes}
                          onChange={e => handleVehicleChange(index, 'notes', e.target.value)}
                          placeholder="Optional notes..."
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {!editItem && (
                  <button
                    type="button"
                    onClick={addVehicleRow}
                    className="w-full py-2.5 border-2 border-dashed border-[#D6C4B0] hover:border-[#965E36] rounded-xl text-xs font-bold text-[#965E36] hover:bg-[#FAF7F2] transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Another Vehicle Row</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#EFE6DC] shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#5C3B21] hover:bg-[#E2D2C2] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-[#965E36] text-white text-xs font-bold hover:bg-[#7A4A28] transition shadow-xs cursor-pointer"
              >
                {editItem ? 'Update Vehicle' : `Save ${form.vehicles.length} Vehicle(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
