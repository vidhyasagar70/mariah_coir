import React, { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, X, Search, Phone, MapPin } from 'lucide-react';

const API = 'http://localhost:5000/api/supply/suppliers';

export default function SupplierMaster() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', contact_person: '', phone: '', address: '' });

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

  const openCreate = () => { setEditItem(null); setForm({ name: '', contact_person: '', phone: '', address: '' }); setShowModal(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ name: item.name, contact_person: item.contact_person || '', phone: item.phone || '', address: item.address || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const method = editItem ? 'PUT' : 'POST';
    const url = editItem ? `${API}/${editItem.id}` : API;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, status: 'Active' }) });
    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this supplier?')) return;
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    fetchData();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-[#E2D2C2]"><Users className="h-5 w-5 text-[#965E36]" /></div>
          <div>
            <h2 className="text-base font-extrabold text-[#2E1A0C]">Suppliers</h2>
            <p className="text-[11px] text-[#7C5A3E]">{data.length} supplier(s) registered</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C694E]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..."
              className="w-full sm:w-52 pl-9 pr-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] placeholder-[#8C694E] focus:ring-2 focus:ring-[#965E36] focus:border-[#965E36] outline-none transition" />
          </div>
          <button onClick={openCreate} className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#965E36] text-white text-xs font-bold hover:bg-[#7A4A28] transition shadow-xs cursor-pointer">
            <Plus className="h-3.5 w-3.5" /><span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-[#D6C4B0] p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#7C5A3E] tracking-wider">Total Suppliers</p>
          <p className="text-2xl font-extrabold text-[#2E1A0C] mt-1">{data.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#D6C4B0] p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#7C5A3E] tracking-wider">Active</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{data.filter(s => s.status === 'Active').length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#D6C4B0] p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#7C5A3E] tracking-wider">Inactive</p>
          <p className="text-2xl font-extrabold text-red-500 mt-1">{data.filter(s => s.status === 'Inactive').length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#D6C4B0] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#EFE6DC] text-[#5C3B21]">
              <tr>
                <th className="text-left px-4 py-3 font-bold">Code</th>
                <th className="text-left px-4 py-3 font-bold">Supplier Name</th>
                <th className="text-left px-4 py-3 font-bold">Contact Person</th>
                <th className="text-left px-4 py-3 font-bold">Phone</th>
                <th className="text-left px-4 py-3 font-bold">Address</th>
                <th className="text-left px-4 py-3 font-bold">Status</th>
                <th className="text-center px-4 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE6DC]">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-8 text-[#8C694E]">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-8 text-[#8C694E]">No suppliers found. Add one to get started.</td></tr>
              ) : data.map((item) => (
                <tr key={item.id} className="hover:bg-[#FAF7F2] transition">
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md bg-[#EFE6DC] text-[#965E36] text-[10px] font-mono font-bold">{item.supplier_code}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-[#2E1A0C]">{item.name}</td>
                  <td className="px-4 py-3 text-[#5C3B21]">{item.contact_person || '-'}</td>
                  <td className="px-4 py-3 text-[#5C3B21]">
                    {item.phone ? (
                      <span className="flex items-center space-x-1"><Phone className="h-3 w-3 text-[#8C694E]" /><span>{item.phone}</span></span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-[#7C5A3E] max-w-[180px] truncate">{item.address || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
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
              <h3 className="font-extrabold text-[#2E1A0C]">{editItem ? 'Edit Supplier' : 'Add Supplier'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-[#E2D2C2] cursor-pointer"><X className="h-4 w-4 text-[#7C5A3E]" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Supplier Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Sri Lakshmi Husk Yard"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Contact Person</label>
                  <input value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} placeholder="e.g. S. Murugan"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 98421 88301"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Address</label>
                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows={2} placeholder="Full address..."
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
