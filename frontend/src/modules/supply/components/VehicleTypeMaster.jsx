import React, { useState, useEffect } from 'react';
import { Truck, Plus, Pencil, Trash2, X, Search } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const API = `${API_BASE}/supply/vehicle-types`;

export default function VehicleTypeMaster() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', capacity: '', description: '', custom_alias: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}?search=${search}`);
      const json = await res.json();
      setData(json.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [search]);

  const openCreate = () => { setEditItem(null); setForm({ name: '', capacity: '', description: '', custom_alias: '' }); setShowModal(true); };
  const openEdit = (item) => { setEditItem(item); setForm({ name: item.name, capacity: item.capacity || '', description: item.description || '', custom_alias: item.custom_alias || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      const method = editItem ? 'PUT' : 'POST';
      const url = editItem ? `${API}/${editItem.id}` : API;
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, status: true }) });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Error saving vehicle type');
        return;
      }
      setShowModal(false);
      fetchData();
    } catch (e) {
      console.error(e);
      alert('Error saving vehicle type: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this vehicle type?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-[#E2D2C2]"><Truck className="h-5 w-5 text-[#965E36]" /></div>
          <div>
            <h2 className="text-base font-extrabold text-[#2E1A0C]">Vehicle Types</h2>
            <p className="text-[11px] text-[#7C5A3E]">{data.length} type(s) registered</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C694E]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search types..."
              className="w-full sm:w-52 pl-9 pr-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] placeholder-[#8C694E] focus:ring-2 focus:ring-[#965E36] focus:border-[#965E36] outline-none transition" />
          </div>
          <button onClick={openCreate} className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#965E36] text-white text-xs font-bold hover:bg-[#7A4A28] transition shadow-xs cursor-pointer">
            <Plus className="h-3.5 w-3.5" /><span>Add Type</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#D6C4B0] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#EFE6DC] text-[#5C3B21]">
              <tr>
                <th className="text-left px-4 py-3 font-bold">#</th>
                <th className="text-left px-4 py-3 font-bold">Vehicle Type</th>
                <th className="text-left px-4 py-3 font-bold">Capacity</th>
                <th className="text-left px-4 py-3 font-bold">Description</th>
                <th className="text-left px-4 py-3 font-bold">Status</th>
                <th className="text-center px-4 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE6DC]">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-8 text-[#8C694E]">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-[#8C694E]">No vehicle types found.</td></tr>
              ) : data.map((item, i) => (
                <tr key={item.id} className="hover:bg-[#FAF7F2] transition">
                  <td className="px-4 py-3 text-[#8C694E]">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-[#2E1A0C]">{item.name}</td>
                  <td className="px-4 py-3 text-[#5C3B21]">{item.capacity || '-'}</td>
                  <td className="px-4 py-3 text-[#7C5A3E] max-w-[200px] truncate">{item.description || '-'}</td>
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
          <div className="bg-white rounded-2xl border border-[#D6C4B0] w-full max-w-md p-6 shadow-xl space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[#2E1A0C]">{editItem ? 'Edit Vehicle Type' : 'Add Vehicle Type'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-[#E2D2C2] cursor-pointer"><X className="h-4 w-4 text-[#7C5A3E]" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Vehicle Type Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. 6-Wheeler Truck"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Capacity</label>
                <input value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} placeholder="e.g. 6 Ton"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Custom Alias / Local Vehicle Name</label>
                <input value={form.custom_alias} onChange={e => setForm({...form, custom_alias: e.target.value})} placeholder="e.g. Rajan Heavy Tipper / 2-Axle Local"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Optional..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none resize-none" />
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
