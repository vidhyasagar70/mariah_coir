import React, { useState, useEffect } from 'react';
import { Truck, Calendar, Hash, IndianRupee, Save, Filter, FileText, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../utils/formatters';

export default function SM02_Receipts({ search }) {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierVehicles, setSelectedSupplierVehicles] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    supplier_id: '',
    material_type: 'Green Husk',
    vehicle_type: '',
    receipt_date: new Date().toISOString().split('T')[0],
    trip_count: 1,
    rate_per_trip: 0
  });

  // Filter States
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [materialFilter, setMaterialFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Load Active Suppliers
  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers?status=Active');
      setSuppliers(res.data);
      if (res.data.length > 0 && !formData.supplier_id) {
        setFormData((prev) => ({ ...prev, supplier_id: res.data[0].id }));
      }
    } catch (err) {
      console.error('Error loading suppliers:', err);
    }
  };

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (supplierFilter !== 'All') params.supplier_id = supplierFilter;
      if (materialFilter !== 'All') params.material_type = materialFilter;
      if (statusFilter !== 'All') params.status = statusFilter;

      const res = await api.get('/receipts', { params });
      setReceipts(res.data);
    } catch (err) {
      console.error('Error loading receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [search, supplierFilter, materialFilter, statusFilter]);

  // When supplier_id changes, fetch their vehicle rates matrix
  useEffect(() => {
    if (formData.supplier_id) {
      api.get(`/suppliers/${formData.supplier_id}/vehicles`).then((res) => {
        setSelectedSupplierVehicles(res.data);
        if (res.data.length > 0) {
          const firstVeh = res.data[0];
          setFormData((prev) => ({
            ...prev,
            vehicle_type: firstVeh.vehicle_type,
            rate_per_trip: firstVeh.rate_per_trip
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            vehicle_type: '6-Wheeler',
            rate_per_trip: 0
          }));
        }
      }).catch(console.error);
    }
  }, [formData.supplier_id]);

  // Handle Vehicle Selection change
  const handleVehicleChange = (vType) => {
    const matched = selectedSupplierVehicles.find((v) => v.vehicle_type === vType);
    setFormData((prev) => ({
      ...prev,
      vehicle_type: vType,
      rate_per_trip: matched ? matched.rate_per_trip : prev.rate_per_trip
    }));
  };

  const calculatedTotal = (parseInt(formData.trip_count || 0, 10)) * (parseFloat(formData.rate_per_trip || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.supplier_id || !formData.vehicle_type || formData.trip_count <= 0 || formData.rate_per_trip < 0) {
      setError('Please fill in all required fields accurately.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/receipts', {
        ...formData,
        trip_count: parseInt(formData.trip_count, 10),
        rate_per_trip: parseFloat(formData.rate_per_trip)
      });
      // Reset form
      setFormData((prev) => ({
        ...prev,
        trip_count: 1
      }));
      fetchReceipts();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Goods Inward Entry Form Panel */}
      <div className="card-panel p-6 rounded-2xl space-y-5">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
          <div className="p-2 rounded-xl bg-slate-900 text-white">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">Record Material Receipt (Goods Inward)</h3>
            <p className="text-xs text-slate-500">Auto-populates vehicle rates and posts delivery liability to ledger</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supplier Select */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Select Supplier *</label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-slate-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} - {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Material Type */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Material Type *</label>
              <select
                value={formData.material_type}
                onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-slate-500"
              >
                <option value="Green Husk">Green Husk</option>
                <option value="Brown Husk">Brown Husk</option>
                <option value="Water">Water</option>
                <option value="Diesel">Diesel</option>
              </select>
            </div>

            {/* Receipt Date */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Receipt Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  required
                  value={formData.receipt_date}
                  onChange={(e) => setFormData({ ...formData, receipt_date: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-500 font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Vehicle Type */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Vehicle Type *</label>
              {selectedSupplierVehicles.length > 0 ? (
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:outline-none focus:border-slate-500"
                >
                  {selectedSupplierVehicles.map((v) => (
                    <option key={v.id} value={v.vehicle_type}>
                      {v.vehicle_type} (Rate: ₹{v.rate_per_trip}/trip)
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. 6-Wheeler"
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-slate-500"
                />
              )}
            </div>

            {/* Trip Count */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Trip Count *</label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.trip_count}
                  onChange={(e) => setFormData({ ...formData, trip_count: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            {/* Rate Per Trip */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Rate Per Trip (₹) *</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.rate_per_trip}
                  onChange={(e) => setFormData({ ...formData, rate_per_trip: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Full-width Dark Calculation Strip */}
          <div className="p-4 rounded-xl bg-[#0B0F17] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Calculated Amount</span>
              <p className="text-xs text-slate-300 font-medium">
                {formData.trip_count || 0} trip(s) × ₹ {formData.rate_per_trip || 0} / trip
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-2xl font-extrabold font-mono text-emerald-400">
                {formatCurrency(calculatedTotal)}
              </span>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-white text-slate-950 font-bold hover:bg-slate-100 cursor-pointer disabled:opacity-50 transition-all text-xs"
              >
                <Save className="h-4 w-4 text-slate-950" />
                <span>{submitting ? 'Recording...' : 'Record Goods Inward'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Receipts Table Controls */}
      <div className="card-panel p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-slate-700 text-xs font-semibold">
          <Filter className="h-4 w-4 text-slate-400" />
          <span>Receipt Filters:</span>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none font-medium"
          >
            <option value="All">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} - {s.name}
              </option>
            ))}
          </select>

          <select
            value={materialFilter}
            onChange={(e) => setMaterialFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none font-medium"
          >
            <option value="All">All Materials</option>
            <option value="Green Husk">Green Husk</option>
            <option value="Brown Husk">Brown Husk</option>
            <option value="Water">Water</option>
            <option value="Diesel">Diesel</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
            <option value="Settled">Settled</option>
          </select>
        </div>
      </div>

      {/* Material Receipts Data Table */}
      <div className="card-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading material receipts...</span>
          </div>
        ) : receipts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Receipts Recorded</h3>
            <p className="text-xs text-slate-500">Record a goods inward receipt to begin tracking material arrivals.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="p-4">RECEIPT ID</th>
                  <th className="p-4">DATE</th>
                  <th className="p-4">SUPPLIER</th>
                  <th className="p-4">MATERIAL</th>
                  <th className="p-4">VEHICLE & TRIPS</th>
                  <th className="p-4">RATE/TRIP</th>
                  <th className="p-4">TOTAL AMOUNT</th>
                  <th className="p-4">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900">{r.id}</td>
                    <td className="p-4 text-slate-600 font-medium whitespace-nowrap">{formatDate(r.receipt_date)}</td>
                    <td className="p-4 font-semibold text-slate-900">
                      <div>{r.supplier_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.supplier_id}</div>
                    </td>
                    <td className="p-4 font-medium text-slate-800">{r.material_type}</td>
                    <td className="p-4 text-slate-700">
                      <span className="font-bold">{r.trip_count} trip(s)</span> via {r.vehicle_type}
                    </td>
                    <td className="p-4 font-mono text-slate-700">₹{r.rate_per_trip}</td>
                    <td className="p-4 font-mono font-bold text-slate-900 text-sm">{formatCurrency(r.total_amount)}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${getStatusBadgeClass(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
