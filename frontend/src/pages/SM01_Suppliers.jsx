import React, { useState, useEffect } from 'react';
import { Users, Filter, Edit3, Trash2, Truck, Phone, Building2 } from 'lucide-react';
import api from '../services/api';
import { getCategoryBadgeClass, getStatusBadgeClass } from '../utils/formatters';
import SupplierModal from '../components/SupplierModal';

export default function SM01_Suppliers({ search, onOpenAddModal, isAddModalOpen, setIsAddModalOpen }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal edit state
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (categoryFilter !== 'All') params.category = categoryFilter;
      if (statusFilter !== 'All') params.status = statusFilter;

      const res = await api.get('/suppliers', { params });
      setSuppliers(res.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [search, categoryFilter, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete supplier ${id}?`)) return;
    try {
      await api.delete(`/suppliers/${id}`);
      fetchSuppliers();
    } catch (err) {
      alert('Error deleting supplier: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="card-panel p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-slate-700 text-xs font-semibold">
          <Filter className="h-4 w-4 text-slate-400" />
          <span>Filters:</span>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-medium"
          >
            <option value="All">All Categories</option>
            <option value="Raw Material">Raw Material (Husk)</option>
            <option value="Fuel">Fuel (Diesel)</option>
            <option value="Utility">Utility (Water)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400 font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Supplier Data Table */}
      <div className="card-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading supplier directory...</span>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Suppliers Found</h3>
            <p className="text-xs text-slate-500">Add a new supplier or adjust search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">SUPPLIER ID</th>
                  <th className="p-4">NAME / COMPANY</th>
                  <th className="p-4">CATEGORY</th>
                  <th className="p-4">CONTACT</th>
                  <th className="p-4">VEHICLES (CHIPS)</th>
                  <th className="p-4">STATUS</th>
                  <th className="p-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* SUPPLIER ID */}
                    <td className="p-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {s.id}
                    </td>

                    {/* NAME / COMPANY */}
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                      {s.company_name && (
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          <span>{s.company_name}</span>
                        </div>
                      )}
                    </td>

                    {/* CATEGORY */}
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${getCategoryBadgeClass(s.category)}`}>
                        {s.category}
                      </span>
                    </td>

                    {/* CONTACT */}
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 flex items-center space-x-1">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{s.contact_number}</span>
                      </div>
                      {s.contact_person && (
                        <div className="text-[11px] text-slate-500 font-normal">Contact: {s.contact_person}</div>
                      )}
                    </td>

                    {/* VEHICLES (Chips) */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {s.vehicles && s.vehicles.length > 0 ? (
                          s.vehicles.map((v) => (
                            <span
                              key={v.id}
                              className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700 whitespace-nowrap"
                            >
                              {v.vehicle_type}: <span className="font-mono font-bold text-slate-900">₹{v.rate_per_trip}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-[11px]">No vehicles set</span>
                        )}
                      </div>
                    </td>

                    {/* STATUS */}
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${getStatusBadgeClass(s.status)}`}>
                        {s.status}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => {
                            setSelectedSupplier(s);
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Edit Supplier"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Supplier"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Supplier Modal */}
      <SupplierModal
        supplier={selectedSupplier}
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedSupplier(null);
        }}
        onSuccess={fetchSuppliers}
      />
    </div>
  );
}
