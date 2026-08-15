import { useState, useEffect } from 'react';
import { supplierApi } from '../../api/supplierApi';
import { Plus, Search, Users, Edit2, Trash2, CheckCircle2, XCircle, RefreshCw, Eye, BookOpen, Truck } from 'lucide-react';

export default function SuppliersView({ onSelectSupplier, onViewAccount }) {
  const [suppliers, setSuppliers] = useState([]);
  const [rawMaterialsList, setRawMaterialsList] = useState([]);
  const [vehicleTypesList, setVehicleTypesList] = useState([]);
  const [allVehiclesList, setAllVehiclesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const [formData, setFormData] = useState({
    supplier_name: '',
    company_name: '',
    supplier_number: '',
    phone_number: '',
    contact_person: '',
    status: 'Active',
    raw_materials: [],
    vehicle_types: [],
    vehicles: []
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [supRes, rmRes, vtRes, vRes] = await Promise.all([
        supplierApi.getSuppliers({ status: statusFilter, search }),
        supplierApi.getRawMaterials({ status: 'Active' }),
        supplierApi.getVehicleTypes({ status: 'Active' }),
        supplierApi.getVehicles({ status: 'Active' })
      ]);
      setSuppliers(supRes.data || []);
      setRawMaterialsList(rmRes.data || []);
      setVehicleTypesList(vtRes.data || []);
      setAllVehiclesList(vRes.data || []);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, search]);

  const handleOpenModal = async (supplier = null) => {
    setError('');
    if (supplier) {
      setEditingSupplier(supplier);
      try {
        const fullDetails = await supplierApi.getSupplierById(supplier.id);
        setFormData({
          supplier_name: fullDetails.supplier_name,
          company_name: fullDetails.company_name || '',
          supplier_number: fullDetails.supplier_number,
          phone_number: fullDetails.phone_number,
          contact_person: fullDetails.contact_person,
          status: fullDetails.status,
          raw_materials: fullDetails.raw_materials ? fullDetails.raw_materials.map(rm => rm.id) : [],
          vehicle_types: fullDetails.vehicle_types ? fullDetails.vehicle_types.map(vt => vt.id) : [],
          vehicles: fullDetails.vehicles ? fullDetails.vehicles.map(v => v.id) : []
        });
      } catch (err) {
        setFormData({
          supplier_name: supplier.supplier_name,
          company_name: supplier.company_name || '',
          supplier_number: supplier.supplier_number,
          phone_number: supplier.phone_number,
          contact_person: supplier.contact_person,
          status: supplier.status,
          raw_materials: [],
          vehicle_types: [],
          vehicles: []
        });
      }
    } else {
      setEditingSupplier(null);
      setFormData({
        supplier_name: '',
        company_name: '',
        supplier_number: '',
        phone_number: '',
        contact_person: '',
        status: 'Active',
        raw_materials: [],
        vehicle_types: [],
        vehicles: []
      });
    }
    setShowModal(true);
  };

  const handleToggleRawMaterial = (id) => {
    setFormData(prev => {
      const exists = prev.raw_materials.includes(id);
      return {
        ...prev,
        raw_materials: exists ? prev.raw_materials.filter(item => item !== id) : [...prev.raw_materials, id]
      };
    });
  };

  const handleToggleVehicleType = (id) => {
    setFormData(prev => {
      const exists = prev.vehicle_types.includes(id);
      const newVehicleTypes = exists ? prev.vehicle_types.filter(item => item !== id) : [...prev.vehicle_types, id];

      // Remove vehicle selections if their vehicle_type_id is no longer selected
      const filteredVehicles = prev.vehicles.filter(vId => {
        const found = allVehiclesList.find(v => v.id === vId);
        return found && newVehicleTypes.includes(found.vehicle_type_id);
      });

      return {
        ...prev,
        vehicle_types: newVehicleTypes,
        vehicles: filteredVehicles
      };
    });
  };

  const handleToggleVehicle = (id) => {
    setFormData(prev => {
      const exists = prev.vehicles.includes(id);
      return {
        ...prev,
        vehicles: exists ? prev.vehicles.filter(item => item !== id) : [...prev.vehicles, id]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (editingSupplier) {
        await supplierApi.updateSupplier(editingSupplier.id, formData);
      } else {
        await supplierApi.createSupplier(formData);
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
    if (!window.confirm('Are you sure you want to deactivate this supplier?')) return;
    try {
      await supplierApi.deleteSupplier(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to deactivate supplier.');
    }
  };

  // Vehicles filtered by selected vehicle types
  const selectableVehicles = allVehiclesList.filter(v => formData.vehicle_types.includes(v.vehicle_type_id));

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-400" />
            Supplier Directory & Master
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Register suppliers, configure assigned raw materials, vehicle types, and registered vehicle numbers.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by supplier name, number, company, phone, contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50 transition"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
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
                <th className="px-6 py-4">Supplier Number</th>
                <th className="px-6 py-4">Supplier Name</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Raw Materials</th>
                <th className="px-6 py-4">Vehicles</th>
                <th className="px-6 py-4">Phone / Contact</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-500">
                    Loading suppliers directory...
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-slate-500">
                    No suppliers found.
                  </td>
                </tr>
              ) : (
                suppliers.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-slate-100 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                        {item.supplier_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-100">{item.supplier_name}</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{item.company_name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                        {item.raw_material_count} Assigned
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-slate-500" />
                        <span>{item.vehicle_count} Vehicles ({item.vehicle_type_count} Types)</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-medium text-slate-200">{item.phone_number}</div>
                      <div className="text-slate-500">{item.contact_person}</div>
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
                    <td className="px-6 py-4 text-right space-x-1.5">
                      <button
                        onClick={() => onSelectSupplier && onSelectSupplier(item.id)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                        title="View Full Supplier Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onViewAccount && onViewAccount(item.id)}
                        className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition"
                        title="View Account Ledger"
                      >
                        <BookOpen className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                        title="Edit Supplier"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Deactivate Supplier"
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

      {/* Comprehensive Supplier Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <h3 className="text-lg font-bold text-slate-100">
              {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </h3>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Supplier Basic Details */}
              <div className="space-y-3 border-b border-slate-800 pb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Section 1: Supplier Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Supplier Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ABC Supplier"
                      value={formData.supplier_name}
                      onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Company Name</label>
                    <input
                      type="text"
                      placeholder="e.g. ABC Traders Ltd"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Supplier Number (Auto-generated if empty)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SUP-001"
                      value={formData.supplier_number}
                      onChange={(e) => setFormData({ ...formData, supplier_number: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm font-mono focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. +91 98765 43210"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Contact Person <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50"
                    />
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
                </div>
              </div>

              {/* Section 2: Raw Materials Supplied */}
              <div className="space-y-3 border-b border-slate-800 pb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Section 2: Raw Materials Supplied</h4>
                <p className="text-xs text-slate-400">Select raw materials this supplier provides:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-36 overflow-y-auto p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                  {rawMaterialsList.map((rm) => {
                    const isChecked = formData.raw_materials.includes(rm.id);
                    return (
                      <label
                        key={rm.id}
                        onClick={() => handleToggleRawMaterial(rm.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition ${
                          isChecked
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="accent-emerald-400 rounded"
                        />
                        <span className="truncate">{rm.name} ({rm.unit_code || rm.unit})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Supplier Vehicle Types */}
              <div className="space-y-3 border-b border-slate-800 pb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Section 3: Supplier Vehicle Types</h4>
                <p className="text-xs text-slate-400">Select vehicle types this supplier operates:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-36 overflow-y-auto p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                  {vehicleTypesList.map((vt) => {
                    const isChecked = formData.vehicle_types.includes(vt.id);
                    return (
                      <label
                        key={vt.id}
                        onClick={() => handleToggleVehicleType(vt.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition ${
                          isChecked
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="accent-emerald-400 rounded"
                        />
                        <span className="truncate">{vt.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section 4: Supplier Vehicle Numbers */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Section 4: Registered Vehicle Numbers</h4>
                <p className="text-xs text-slate-400">
                  Select registered vehicle numbers for this supplier (filtered by selected vehicle types):
                </p>

                {formData.vehicle_types.length === 0 ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
                    Please select at least one Vehicle Type above to assign vehicle numbers.
                  </div>
                ) : selectableVehicles.length === 0 ? (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 text-xs">
                    No vehicles found in Vehicle Master matching the selected vehicle types. Add them in Vehicle Master first.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-36 overflow-y-auto p-2 bg-slate-950/60 rounded-xl border border-slate-800">
                    {selectableVehicles.map((v) => {
                      const isChecked = formData.vehicles.includes(v.id);
                      return (
                        <label
                          key={v.id}
                          onClick={() => handleToggleVehicle(v.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition ${
                            isChecked
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="accent-emerald-400 rounded"
                          />
                          <div className="truncate">
                            <span className="font-mono font-bold block">{v.vehicle_number}</span>
                            <span className="text-[10px] text-slate-400">{v.vehicle_type_name}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
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
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition"
                >
                  {submitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
