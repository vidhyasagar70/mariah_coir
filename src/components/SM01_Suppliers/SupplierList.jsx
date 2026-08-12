import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Filter, Edit3, Trash2, Truck, Phone, Building2, Layers, CheckCircle2, XCircle } from 'lucide-react';
import api from '../../api/client';
import { getCategoryBadgeClass, getStatusBadgeClass, formatCurrency } from '../../utils/formatters';
import SupplierModal from './SupplierModal';
import RateMatrixModal from './RateMatrixModal';

export default function SupplierList() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [isRateMatrixModalOpen, setIsRateMatrixModalOpen] = useState(false);
  const [rateSupplier, setRateSupplier] = useState(null);

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
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              SM-01
            </span>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Supplier Directory & Rate Matrix</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage raw material (husk), fuel, and utility suppliers with customized trip rate matrices.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedSupplier(null);
            setIsSupplierModalOpen(true);
          }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/50 cursor-pointer transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-2xl glass-panel grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
        {/* Search */}
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by supplier ID, name, company, contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-500 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="All">All Categories</option>
            <option value="Raw Material">Raw Material (Husk)</option>
            <option value="Fuel">Fuel (Diesel)</option>
            <option value="Utility">Utility (Water)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Supplier Grid / Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading suppliers directory...</span>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl glass-panel space-y-3">
          <Users className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No Suppliers Found</h3>
          <p className="text-xs text-slate-500">Try clearing your filters or create a new supplier entry.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-2xl glass-card border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group relative"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        {s.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getCategoryBadgeClass(s.category)}`}>
                        {s.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-base mt-1.5 group-hover:text-emerald-300 transition-colors">
                      {s.name}
                    </h3>
                  </div>

                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusBadgeClass(s.status)}`}>
                    {s.status}
                  </span>
                </div>

                {/* Info Fields */}
                <div className="space-y-1.5 text-xs text-slate-300 pt-1">
                  {s.company_name && (
                    <div className="flex items-center space-x-2 text-slate-400">
                      <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{s.company_name}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-slate-300">
                    <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>{s.contact_number}</span>
                    {s.contact_person && <span className="text-slate-500">({s.contact_person})</span>}
                  </div>
                </div>
              </div>

              {/* Rate Matrix Status & Actions */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  onClick={() => {
                    setRateSupplier(s);
                    setIsRateMatrixModalOpen(true);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/20 transition-all cursor-pointer"
                >
                  <Truck className="h-3.5 w-3.5" />
                  <span>Rate Matrix ({s.vehicle_count || 0})</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setSelectedSupplier(s);
                      setIsSupplierModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Edit supplier"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Delete supplier"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplier Form Modal */}
      <SupplierModal
        supplier={selectedSupplier}
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccess={fetchSuppliers}
      />

      {/* Vehicle Rate Matrix Modal */}
      <RateMatrixModal
        supplier={rateSupplier}
        isOpen={isRateMatrixModalOpen}
        onClose={() => setIsRateMatrixModalOpen(false)}
        onSuccess={fetchSuppliers}
      />
    </div>
  );
}
