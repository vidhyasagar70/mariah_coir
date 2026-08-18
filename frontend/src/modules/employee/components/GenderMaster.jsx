import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle, Users } from 'lucide-react';
import GenderModal from './GenderModal';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export default function GenderMaster() {
  const [genders, setGenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGender, setEditingGender] = useState(null);
  const [notification, setNotification] = useState(null);

  const fetchGenders = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({ search, status: statusFilter }).toString();
      const res = await fetch(`${API_BASE}/genders?${query}`);
      const data = await res.json();
      if (res.ok) {
        setGenders(data.records || []);
      } else {
        showNotification(data.error || 'Failed to fetch genders', 'error');
      }
    } catch (err) {
      showNotification('Network error while fetching genders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenders();
  }, [search, statusFilter]);

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveGender = async (formData) => {
    const url = editingGender ? `${API_BASE}/genders/${editingGender.id}` : `${API_BASE}/genders`;
    const method = editingGender ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to save gender.');
    }

    showNotification(data.message || 'Gender saved successfully.');
    fetchGenders();
  };

  const handleDelete = async (gender) => {
    if (!window.confirm(`Are you sure you want to delete gender '${gender.name}'?`)) return;

    try {
      const res = await fetch(`${API_BASE}/genders/${gender.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        showNotification(data.message || 'Gender deleted successfully.');
        fetchGenders();
      } else {
        showNotification(data.error || 'Failed to delete gender.', 'error');
      }
    } catch (err) {
      showNotification('Error deleting gender.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {notification && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in ${
            notification.type === 'error'
              ? 'bg-red-100 border border-red-200 text-red-800'
              : 'bg-emerald-100 border border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{notification.msg}</span>
          <button onClick={() => setNotification(null)} className="ml-2 font-bold cursor-pointer">
            ×
          </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-[#EFE6DC] p-4 rounded-2xl border border-[#D6C4B0] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C694E]" />
            <input
              type="text"
              placeholder="Search gender..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C] focus:outline-none focus:ring-2 focus:ring-[#965E36]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C] font-medium focus:outline-none focus:ring-2 focus:ring-[#965E36]"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>

        <button
          onClick={() => {
            setEditingGender(null);
            setIsModalOpen(true);
          }}
          className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-bold shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Gender</span>
        </button>
      </div>

      {/* Genders Table */}
      <div className="bg-[#FAF7F2] rounded-2xl border border-[#D6C4B0] shadow-sm overflow-hidden max-w-2xl">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#7C5A3E] font-medium">Loading gender master data...</div>
        ) : genders.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="h-8 w-8 text-[#A88B73] mx-auto" />
            <p className="text-sm font-bold text-[#3D2514]">No Genders Found</p>
            <p className="text-xs text-[#7C5A3E]">Click "+ Add Gender" to create reusable gender options.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EFE6DC] text-[#5C3B21] border-b border-[#D6C4B0] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0D5]">
                {genders.map((g) => {
                  const isActive = g.status == 1 || g.status === true;
                  return (
                    <tr key={g.id} className="hover:bg-[#F5EBE0] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#2E1A0C]">{g.name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          <span>{isActive ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingGender(g);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-[#E2D2C2] hover:bg-[#D6C4B0] text-[#4A3222] transition-colors cursor-pointer"
                          title="Edit Gender"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(g)}
                          className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 transition-colors cursor-pointer"
                          title="Delete Gender"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <GenderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveGender}
        gender={editingGender}
      />
    </div>
  );
}
