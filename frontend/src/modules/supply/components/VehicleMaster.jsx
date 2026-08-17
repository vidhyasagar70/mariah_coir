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
  const [form, setForm] = useState({ supplier_ids: [], vehicle_type_id: '', vehicle_number: '', notes: '', custom_driver_info: '' });

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
    setForm({ supplier_ids: suppliers.length > 0 ? [suppliers[0].id] : [], vehicle_type_id: '', vehicle_number: '', notes: '', custom_driver_info: '' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      supplier_ids: item.supplier_id ? [item.supplier_id] : [],
      vehicle_type_id: item.vehicle_type_id,
      vehicle_number: item.vehicle_number || '',
      notes: item.notes || '',
      custom_driver_info: item.custom_driver_info || ''
    });
    setShowModal(true);
  };

  const toggleSupplier = (suppId) => {
    setForm(prev => {
      const current = prev.supplier_ids || [];
      if (current.includes(suppId)) {
        return { ...prev, supplier_ids: current.filter(id => id !== suppId) };
      } else {
        return { ...prev, supplier_ids: [...current, suppId] };
      }
    });
  };

  const toggleSelectAllSuppliers = () => {
    if (form.supplier_ids.length === suppliers.length) {
      setForm(prev => ({ ...prev, supplier_ids: [] }));
    } else {
      setForm(prev => ({ ...prev, supplier_ids: suppliers.map(s => s.id) }));
    }
  };

  const handleSave = async () => {
    if (!form.supplier_ids || form.supplier_ids.length === 0 || !form.vehicle_type_id) {
      alert('Please select at least one supplier and a vehicle type.');
      return;
    }
    const method = editItem ? 'PUT' : 'POST';
    const url = editItem ? `${API}/vehicles/${editItem.id}` : `${API}/vehicles`;
    const payload = {
      ...form,
      supplier_id: form.supplier_ids[0],
      supplier_ids: form.supplier_ids,
      status: true
    };
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setShowModal(false);
    fetchData();
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
          <div className="bg-white rounded-2xl border border-[#D6C4B0] w-full max-w-lg p-6 shadow-xl space-y-4 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE6DC] pb-3">
              <div>
                <h3 className="font-extrabold text-[#2E1A0C]">{editItem ? 'Edit Vehicle Assignment' : 'Add Vehicle (Assign Suppliers)'}</h3>
                <p className="text-[11px] text-[#7C5A3E]">Assign vehicle to one or multiple suppliers at a time</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-[#E2D2C2] cursor-pointer"><X className="h-4 w-4 text-[#7C5A3E]" /></button>
            </div>
            
            <div className="space-y-4">
              {/* Multi-Supplier Selection Checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-[#5C3B21] block">Assign to Supplier(s) * ({form.supplier_ids?.length || 0} selected)</label>
                  <button type="button" onClick={toggleSelectAllSuppliers} className="text-[10px] font-bold text-[#965E36] hover:underline cursor-pointer">
                    {form.supplier_ids?.length === suppliers.length ? 'Deselect All' : 'Select All Suppliers'}
                  </button>
                </div>
                <div className="border border-[#D6C4B0] rounded-xl p-3 bg-[#FAF7F2] max-h-36 overflow-y-auto space-y-1.5">
                  {suppliers.length === 0 ? (
                    <p className="text-xs text-[#8C694E]">No active suppliers found</p>
                  ) : (
                    suppliers.map(s => {
                      const isChecked = form.supplier_ids?.includes(s.id);
                      return (
                        <label key={s.id} className={`flex items-center space-x-2.5 p-2 rounded-lg cursor-pointer transition text-xs ${isChecked ? 'bg-[#E2D2C2]/60 font-bold text-[#2E1A0C]' : 'hover:bg-[#EFE6DC]/50 text-[#5C3B21]'}`}>
                          <input type="checkbox" checked={isChecked} onChange={() => toggleSupplier(s.id)}
                            className="rounded border-[#965E36] text-[#965E36] focus:ring-[#965E36]" />
                          <span><strong className="font-mono text-[#965E36]">{s.supplier_code}</strong> – {s.name} ({s.category || 'Raw Material'})</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Vehicle Type *</label>
                <select value={form.vehicle_type_id} onChange={e => setForm({...form, vehicle_type_id: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none">
                  <option value="">Select Vehicle Type</option>
                  {vehicleTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.name}{vt.capacity ? ` (${vt.capacity})` : ''}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Vehicle Number *</label>
                <input value={form.vehicle_number} onChange={e => setForm({...form, vehicle_number: e.target.value})} placeholder="e.g. TN 38 B 9912"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none font-mono font-bold" />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Custom Driver Info / Fleet Alias</label>
                <input value={form.custom_driver_info || ''} onChange={e => setForm({...form, custom_driver_info: e.target.value})} placeholder="e.g. Selvam Driver (+91 94432 55902)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} placeholder="Optional notes..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none resize-none" />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#EFE6DC]">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-[#5C3B21] hover:bg-[#E2D2C2] transition cursor-pointer">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2 rounded-xl bg-[#965E36] text-white text-xs font-bold hover:bg-[#7A4A28] transition shadow-xs cursor-pointer">
                {editItem ? 'Update Assignment' : `Assign to ${form.supplier_ids?.length || 0} Supplier(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
