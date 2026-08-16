import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Pencil, Trash2, X, Search } from 'lucide-react';

const API = 'http://localhost:5000/api/supply';

export default function PricingMaster() {
  const [data, setData] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ raw_material_id: '', vehicle_type_id: '', rate_per_unit: '', effective_from: '', effective_to: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMaterial) params.append('raw_material_id', filterMaterial);
      if (filterVehicle) params.append('vehicle_type_id', filterVehicle);
      const res = await fetch(`${API}/pricing?${params}`);
      const json = await res.json();
      setData(json.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchMasters = async () => {
    try {
      const [rmRes, vtRes] = await Promise.all([
        fetch(`${API}/raw-materials?status=active`),
        fetch(`${API}/vehicle-types?status=active`)
      ]);
      const rmJson = await rmRes.json();
      const vtJson = await vtRes.json();
      setRawMaterials(rmJson.data || []);
      setVehicleTypes(vtJson.data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchMasters(); }, []);
  useEffect(() => { fetchData(); }, [filterMaterial, filterVehicle]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ raw_material_id: '', vehicle_type_id: '', rate_per_unit: '', effective_from: new Date().toISOString().split('T')[0], effective_to: '' });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      raw_material_id: item.raw_material_id,
      vehicle_type_id: item.vehicle_type_id,
      rate_per_unit: item.rate_per_unit,
      effective_from: item.effective_from?.split('T')[0] || '',
      effective_to: item.effective_to?.split('T')[0] || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.raw_material_id || !form.vehicle_type_id || !form.rate_per_unit || !form.effective_from) return;
    const method = editItem ? 'PUT' : 'POST';
    const url = editItem ? `${API}/pricing/${editItem.id}` : `${API}/pricing`;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this pricing rule?')) return;
    await fetch(`${API}/pricing/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const fmt = (v) => parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-[#E2D2C2]"><DollarSign className="h-5 w-5 text-[#965E36]" /></div>
          <div>
            <h2 className="text-base font-extrabold text-[#2E1A0C]">Pricing Configuration</h2>
            <p className="text-[11px] text-[#7C5A3E]">{data.length} pricing rule(s) • Material + Vehicle Type → Rate</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#965E36] text-white text-xs font-bold hover:bg-[#7A4A28] transition shadow-xs cursor-pointer">
          <Plus className="h-3.5 w-3.5" /><span>Add Price</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2 flex-wrap gap-y-2">
        <select value={filterMaterial} onChange={e => setFilterMaterial(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none">
          <option value="">All Materials</option>
          {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
        </select>
        <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none">
          <option value="">All Vehicle Types</option>
          {vehicleTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
        </select>
      </div>

      {/* Pricing Table */}
      <div className="bg-white rounded-2xl border border-[#D6C4B0] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#EFE6DC] text-[#5C3B21]">
              <tr>
                <th className="text-left px-4 py-3 font-bold">#</th>
                <th className="text-left px-4 py-3 font-bold">Raw Material</th>
                <th className="text-left px-4 py-3 font-bold">Vehicle Type</th>
                <th className="text-right px-4 py-3 font-bold">Rate / Unit (₹)</th>
                <th className="text-left px-4 py-3 font-bold">Effective From</th>
                <th className="text-left px-4 py-3 font-bold">Effective To</th>
                <th className="text-left px-4 py-3 font-bold">Status</th>
                <th className="text-center px-4 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE6DC]">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-8 text-[#8C694E]">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-8 text-[#8C694E]">No pricing rules found. Add one to configure rates.</td></tr>
              ) : data.map((item, i) => (
                <tr key={item.id} className="hover:bg-[#FAF7F2] transition">
                  <td className="px-4 py-3 text-[#8C694E]">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-[#2E1A0C]">{item.raw_material_name}</td>
                  <td className="px-4 py-3 text-[#5C3B21]">{item.vehicle_type_name}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#2E1A0C]">₹ {fmt(item.rate_per_unit)}</td>
                  <td className="px-4 py-3 text-[#5C3B21]">{item.effective_from?.split('T')[0]}</td>
                  <td className="px-4 py-3 text-[#7C5A3E]">{item.effective_to?.split('T')[0] || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.status}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#D6C4B0] w-full max-w-lg p-6 shadow-xl space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[#2E1A0C]">{editItem ? 'Edit Pricing' : 'Add Pricing Rule'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-[#E2D2C2] cursor-pointer"><X className="h-4 w-4 text-[#7C5A3E]" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Raw Material *</label>
                <select value={form.raw_material_id} onChange={e => setForm({...form, raw_material_id: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none">
                  <option value="">Select Material</option>
                  {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Vehicle Type *</label>
                <select value={form.vehicle_type_id} onChange={e => setForm({...form, vehicle_type_id: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none">
                  <option value="">Select Vehicle Type</option>
                  {vehicleTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Rate per Unit (₹) *</label>
                <input type="number" step="0.01" value={form.rate_per_unit} onChange={e => setForm({...form, rate_per_unit: e.target.value})} placeholder="e.g. 4500.00"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Effective From *</label>
                  <input type="date" value={form.effective_from} onChange={e => setForm({...form, effective_from: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Effective To</label>
                  <input type="date" value={form.effective_to} onChange={e => setForm({...form, effective_to: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Custom Rate Label / Seasonal Tag / Remarks</label>
                <input value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} placeholder="e.g. Monsoon Rate Surge / Festival Discount"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-[#5C3B21] hover:bg-[#E2D2C2] transition cursor-pointer">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2 rounded-xl bg-[#965E36] text-white text-xs font-bold hover:bg-[#7A4A28] transition shadow-xs cursor-pointer">
                {editItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
