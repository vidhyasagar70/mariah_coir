import React, { useState, useEffect } from 'react';
import { supplierApi } from '../../api/supplierApi';
import { Plus, Search, Tag, Edit2, Trash2, CheckCircle2, XCircle, RefreshCw, Calendar } from 'lucide-react';

export default function PricingView() {
  const [pricingList, setPricingList] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    raw_material_id: '', vehicle_type_id: '', price: '', effective_from: new Date().toISOString().split('T')[0], effective_to: '', status: 'Active'
  });
  const [selectedUnitName, setSelectedUnitName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, mRes, vtRes] = await Promise.all([
        supplierApi.getPricing({ raw_material_id: materialFilter, status: statusFilter }),
        supplierApi.getRawMaterials({ status: 'Active' }),
        supplierApi.getVehicleTypes({ status: 'Active' })
      ]);
      setPricingList(pRes.data || []);
      setMaterials(mRes.data || []);
      setVehicleTypes(vtRes.data || []);
    } catch (err) {
      console.error('Failed to fetch pricing list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [materialFilter, statusFilter]);

  const handleMaterialChange = (materialId) => {
    const found = materials.find((m) => m.id === materialId);
    setFormData({ ...formData, raw_material_id: materialId });
    if (found) {
      setSelectedUnitName(`${found.unit_name || found.unit} (${found.unit_code || found.unit})`);
    } else {
      setSelectedUnitName('');
    }
  };

  const handleOpenModal = (item = null) => {
    setError('');
    if (item) {
      setEditingItem(item);
      setFormData({
        raw_material_id: item.raw_material_id,
        vehicle_type_id: item.vehicle_type_id,
        price: item.price,
        effective_from: item.effective_from ? item.effective_from.split('T')[0] : '',
        effective_to: item.effective_to ? item.effective_to.split('T')[0] : '',
        status: item.status
      });
      setSelectedUnitName(item.unit_name ? `${item.unit_name} (${item.unit_code})` : '');
    } else {
      setEditingItem(null);
      const defaultMat = materials[0];
      setFormData({
        raw_material_id: defaultMat?.id || '',
        vehicle_type_id: vehicleTypes[0]?.id || '',
        price: '',
        effective_from: new Date().toISOString().split('T')[0],
        effective_to: '',
        status: 'Active'
      });
      setSelectedUnitName(defaultMat ? `${defaultMat.unit_name || defaultMat.unit} (${defaultMat.unit_code || defaultMat.unit})` : '');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (editingItem) {
        await supplierApi.updatePricing(editingItem.id, formData);
      } else {
        await supplierApi.createPricing(formData);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this pricing rule?')) return;
    try {
      await supplierApi.deletePricing(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete pricing.');
    }
  };

  const filteredPricing = pricingList.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (p.raw_material_name && p.raw_material_name.toLowerCase().includes(term)) ||
      (p.vehicle_type_name && p.vehicle_type_name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Tag className="h-6 w-6 text-emerald-400" />
            Product Pricing Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Define pricing rules based on <strong className="text-slate-200">Raw Material + Vehicle Type + Effective Date</strong>. Unit is derived automatically.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Product Price
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter matrix by material or vehicle type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50 transition"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={materialFilter}
            onChange={(e) => setMaterialFilter(e.target.value)}
            className="bg-slate-900/90 border border-slate-800 text-slate-300 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">All Raw Materials</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900/90 border border-slate-800 text-slate-300 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Raw Material</th>
                <th className="px-6 py-4">Vehicle Type</th>
                <th className="px-6 py-4">Unit</th>
                <th className="px-6 py-4">Price / Rate</th>
                <th className="px-6 py-4">Effective Period</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-500">
                    Loading pricing matrix...
                  </td>
                </tr>
              ) : filteredPricing.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-500">
                    No product pricing rules configured.
                  </td>
                </tr>
              ) : (
                filteredPricing.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-medium text-slate-100">{item.raw_material_name}</td>
                    <td className="px-6 py-4 text-slate-200 font-medium">{item.vehicle_type_name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">
                      {item.unit_code || item.unit_name}
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-400 text-base">
                      ₹{parseFloat(item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 flex items-center gap-1.5 pt-5">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      {item.effective_from ? item.effective_from.split('T')[0] : '—'}
                      <span className="text-slate-600">to</span>
                      {item.effective_to ? item.effective_to.split('T')[0] : 'Present'}
                    </td>
                    <td className="px-6 py-4">
                      {item.status === 'Active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          <XCircle className="h-3.5 w-3.5" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                        title="Edit Price"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Delete Price Rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100">
              {editingItem ? 'Edit Product Price' : 'Add Product Price'}
            </h3>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Raw Material <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  disabled={Boolean(editingItem)}
                  value={formData.raw_material_id}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                >
                  <option value="">-- Select Raw Material --</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Derived Unit (Read-only)</label>
                <input
                  type="text"
                  readOnly
                  value={selectedUnitName || 'Automatically resolved from Raw Material'}
                  className="w-full px-3.5 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-emerald-400 font-semibold text-sm cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Vehicle Type <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  disabled={Boolean(editingItem)}
                  value={formData.vehicle_type_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_type_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                >
                  <option value="">-- Select Vehicle Type --</option>
                  {vehicleTypes.map((vt) => (
                    <option key={vt.id} value={vt.id}>{vt.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Price / Rate (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="e.g. 15.00 or 850.00"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Effective From <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.effective_from}
                    onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Effective To (Optional)</label>
                  <input
                    type="date"
                    value={formData.effective_to}
                    onChange={(e) => setFormData({ ...formData, effective_to: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition"
                >
                  {submitting ? 'Saving...' : editingItem ? 'Update Price' : 'Save Product Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
