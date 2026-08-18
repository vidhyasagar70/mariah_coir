import React, { useState, useEffect } from 'react';
import { Truck, Plus, Edit2, Trash2, Search, Filter, RotateCcw, CheckCircle2, XCircle, Tag, Scale, IndianRupee } from 'lucide-react';
import api from '../../../../shared/services/api';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../../../../shared/utils/formatters';

const STANDARD_VEHICLES = ['Tractor', 'Pickup', '6-Wheeler Tipper', '10-Wheeler Lorry', 'Trailer'];

export default function DustMasterLanding({ search: globalSearch }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ totalItems: 0, activeItems: 0, inactiveItems: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    dust_name: '',
    standard_vehicle_type: 'Tractor',
    custom_vehicle_name: '',
    fixed_rate_per_load: '',
    status: 'Active'
  });
  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = {};
      const querySearch = localSearch || globalSearch;
      if (querySearch) params.search = querySearch;
      if (statusFilter !== 'All') params.status = statusFilter;

      const res = await api.get('/dust/master', { params });
      setItems(res.data.items || []);
      setSummary(res.data.summary || { totalItems: 0, activeItems: 0, inactiveItems: 0 });
    } catch (err) {
      console.error('Error fetching dust master:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [globalSearch, localSearch, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      dust_name: '',
      standard_vehicle_type: 'Tractor',
      custom_vehicle_name: '',
      fixed_rate_per_load: '',
      status: 'Active'
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      dust_name: item.dust_name || '',
      standard_vehicle_type: item.standard_vehicle_type || 'Tractor',
      custom_vehicle_name: item.custom_vehicle_name || '',
      fixed_rate_per_load: item.fixed_rate_per_load !== undefined ? String(item.fixed_rate_per_load) : '',
      status: item.status || 'Active'
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.dust_name.trim()) {
      setModalError('Dust name is required.');
      return;
    }

    const rateNum = parseFloat(formData.fixed_rate_per_load);
    if (isNaN(rateNum) || rateNum < 0) {
      setModalError('Fixed rate per load must be a valid non-negative number.');
      return;
    }

    const payload = {
      dust_name: formData.dust_name.trim(),
      standard_vehicle_type: formData.standard_vehicle_type,
      custom_vehicle_name: formData.custom_vehicle_name ? formData.custom_vehicle_name.trim() : null,
      fixed_rate_per_load: rateNum,
      status: formData.status
    };

    try {
      setSubmitting(true);
      if (editingItem) {
        await api.put(`/dust/master/${editingItem.id}`, payload);
      } else {
        await api.post('/dust/master', payload);
      }
      handleCloseModal();
      fetchItems();
    } catch (err) {
      console.error('Error saving dust master item:', err);
      setModalError(err.response?.data?.error || 'Failed to save dust master item.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete Dust Master item "${name}" (${id})?`)) return;
    try {
      await api.delete(`/dust/master/${id}`);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting dust master item: ' + err.message);
    }
  };

  const hasActiveFilters = localSearch !== '' || statusFilter !== 'All';

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-130px)]">
      {/* KPI Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL DUST CONFIGS</span>
            <div className="p-1 rounded-md bg-[#FAF0E6] text-[#965E36]">
              <Truck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-[#2E1C11]">
            {summary.totalItems} <span className="text-[11px] font-normal text-[#7A6759]">configurations</span>
          </div>
        </div>

        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">ACTIVE TYPES</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-emerald-800">
            {summary.activeItems} <span className="text-[11px] font-normal text-[#7A6759]">active</span>
          </div>
        </div>

        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">INACTIVE TYPES</span>
            <div className="p-1 rounded-md bg-rose-50 text-rose-700">
              <XCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-rose-800">
            {summary.inactiveItems} <span className="text-[11px] font-normal text-[#7A6759]">disabled</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card-panel p-3 sm:p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#A8988B]" />
          <input
            type="text"
            placeholder="Search dust master by name, vehicle..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#965E36] font-medium transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
            <Filter className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs text-[#2E1C11] bg-transparent focus:outline-none font-medium cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => { setLocalSearch(''); setStatusFilter('All'); }}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-extrabold shadow-sm transition-all duration-150 cursor-pointer ml-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add Dust Configuration</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="card-panel rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0 border border-[#E8DCD0]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-xs text-[#7A6759] space-y-2">
            <div className="w-5 h-5 border-2 border-[#965E36] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading dust master configurations...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <Truck className="h-10 w-10 text-[#D4C3B3] mx-auto" />
            <h3 className="text-sm font-bold text-[#2E1C11]">No Dust Master Configurations Found</h3>
            <p className="text-xs text-[#7A6759]">Click "+ Add Dust Configuration" to register your first dust type & vehicle load rate.</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 h-full w-full">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead className="sticky top-0 z-10 bg-[#F5ECE3] border-b border-[#E8DCD0] shadow-2xs">
                <tr className="text-[#6E594A] font-bold uppercase tracking-wider">
                  <th className="p-3.5">MASTER ID</th>
                  <th className="p-3.5">DUST TYPE NAME</th>
                  <th className="p-3.5">STANDARD VEHICLE TYPE</th>
                  <th className="p-3.5">CUSTOM VEHICLE NAME / ALIAS</th>
                  <th className="p-3.5">FIXED RATE PER LOAD (₹)</th>
                  <th className="p-3.5">STATUS</th>
                  <th className="p-3.5">CREATED AT</th>
                  <th className="p-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EDE4] bg-white">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[#2E1C11] whitespace-nowrap">
                      {item.id}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#2E1C11] text-xs">{item.dust_name}</div>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-900 border border-blue-200">
                        {item.standard_vehicle_type}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-[#6E594A] whitespace-nowrap">
                      {item.custom_vehicle_name || '-'}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#965E36] text-sm whitespace-nowrap">
                      {formatCurrency(item.fixed_rate_per_load)} <span className="text-[10px] text-[#7A6759] font-normal">/ load</span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-[#6E594A] font-medium whitespace-nowrap text-[11px]">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 rounded-lg text-[#6E594A] hover:text-[#965E36] hover:bg-[#FAF0E6] transition-colors cursor-pointer"
                        title="Edit Configuration"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.dust_name)}
                        className="p-1.5 rounded-lg text-[#A8988B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Configuration"
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

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C120C]/60 backdrop-blur-xs">
          <div className="card-panel w-full max-w-md p-5 rounded-2xl bg-white shadow-2xl space-y-4 border border-[#D6C4B0] animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#F4EDE4]">
              <h3 className="text-sm font-extrabold text-[#2E1C11] flex items-center space-x-2">
                <Truck className="h-4 w-4 text-[#965E36]" />
                <span>{editingItem ? `Edit Dust Configuration (${editingItem.id})` : 'Add Dust Configuration'}</span>
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-[#A8988B] hover:text-[#2E1C11] text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11]">
                  Dust Product Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.dust_name}
                  onChange={(e) => setFormData({ ...formData, dust_name: e.target.value })}
                  placeholder="e.g. Raw Coir Pith, Washed Dust"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11]">
                  Standard Vehicle Type <span className="text-rose-600">*</span>
                </label>
                <select
                  value={formData.standard_vehicle_type}
                  onChange={(e) => setFormData({ ...formData, standard_vehicle_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36] cursor-pointer"
                >
                  {STANDARD_VEHICLES.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11]">
                  Custom Vehicle Name / Alias (Optional)
                </label>
                <input
                  type="text"
                  value={formData.custom_vehicle_name}
                  onChange={(e) => setFormData({ ...formData, custom_vehicle_name: e.target.value })}
                  placeholder="e.g. Rajan Blue Tractor, Factory Tipper 1"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11]">
                  Fixed Rate per Load (₹) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-[#965E36] pointer-events-none">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.fixed_rate_per_load}
                    onChange={(e) => setFormData({ ...formData, fixed_rate_per_load: e.target.value })}
                    placeholder="e.g. 1800.00"
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-mono font-bold focus:outline-none focus:border-[#965E36]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label className="block text-xs font-bold text-[#2E1C11]">Status</label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-1.5 text-xs text-[#2E1C11] font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="modal_status"
                      value="Active"
                      checked={formData.status === 'Active'}
                      onChange={() => setFormData({ ...formData, status: 'Active' })}
                      className="text-[#965E36]"
                    />
                    <span>Active</span>
                  </label>
                  <label className="flex items-center space-x-1.5 text-xs text-[#2E1C11] font-semibold cursor-pointer">
                    <input
                      type="radio"
                      name="modal_status"
                      value="Inactive"
                      checked={formData.status === 'Inactive'}
                      onChange={() => setFormData({ ...formData, status: 'Inactive' })}
                      className="text-[#965E36]"
                    />
                    <span>Inactive</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#F4EDE4]">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#6E594A] bg-[#F5ECE3] hover:bg-[#E8DCD0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-xl text-xs font-extrabold text-white bg-[#965E36] hover:bg-[#7A4A28] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Update Configuration' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
