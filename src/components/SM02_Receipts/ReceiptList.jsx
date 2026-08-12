import React, { useState, useEffect } from 'react';
import { Truck, Plus, Search, Filter, Calendar, FileText, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import api from '../../api/client';
import { formatCurrency, formatDate, getMaterialBadgeClass, getStatusBadgeClass } from '../../utils/formatters';
import ReceiptModal from './ReceiptModal';

export default function ReceiptList() {
  const [receipts, setReceipts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('All');
  const [materialFilter, setMaterialFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
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
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await api.get('/receipts', { params });
      setReceipts(res.data);
    } catch (err) {
      console.error('Error fetching receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [search, supplierFilter, materialFilter, statusFilter, dateFrom, dateTo]);

  // Aggregate Metrics
  const totalValue = receipts.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);
  const pendingCount = receipts.filter((r) => r.status === 'Pending' || r.status === 'Partial').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & New Receipt Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 font-bold border border-sky-500/20">
              SM-02
            </span>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Material Receipts Management (Goods Inward)</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Log inward shipments of Green Husk, Brown Husk, Fuel, and Water with automated trip rate calculation.
          </p>
        </div>

        <button
          onClick={() => setIsReceiptModalOpen(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/50 cursor-pointer transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Record Goods Inward</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl glass-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Receipts Logged</span>
            <div className="text-xl font-bold text-white mt-1">{receipts.length} <span className="text-xs font-normal text-slate-400">shipments</span></div>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Deliveries Value</span>
            <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">{formatCurrency(totalValue)}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Unsettled / Pending Receipts</span>
            <div className="text-xl font-bold text-amber-400 mt-1">{pendingCount} <span className="text-xs font-normal text-slate-400">awaiting settlement</span></div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl glass-panel space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search RCT ID, supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Supplier Filter */}
          <div>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} - {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Material Type Filter */}
          <div>
            <select
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All Material Types</option>
              <option value="Green Husk">Green Husk</option>
              <option value="Brown Husk">Brown Husk</option>
              <option value="Water">Water</option>
              <option value="Diesel">Diesel</option>
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
              <option value="Pending">Pending Settle</option>
              <option value="Partial">Partial Settle</option>
              <option value="Settled">Settled</option>
            </select>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-slate-800/80 gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <Calendar className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold text-slate-300">Date Range Filter:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
            />
            <span>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs"
            />
          </div>

          {(dateFrom || dateTo || search || supplierFilter !== 'All' || materialFilter !== 'All' || statusFilter !== 'All') && (
            <button
              onClick={() => {
                setSearch('');
                setSupplierFilter('All');
                setMaterialFilter('All');
                setStatusFilter('All');
                setDateFrom('');
                setDateTo('');
              }}
              className="text-xs text-rose-400 hover:underline cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Receipts Data Table */}
      <div className="rounded-2xl glass-panel overflow-hidden border border-slate-800">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading material receipts log...</span>
          </div>
        ) : receipts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Truck className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No Receipts Found</h3>
            <p className="text-xs text-slate-500">Record a new goods inward receipt to start tracking shipments.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold">
                  <th className="p-3.5">Receipt ID</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Supplier Name & ID</th>
                  <th className="p-3.5">Material</th>
                  <th className="p-3.5">Vehicle Type</th>
                  <th className="p-3.5">Trips & Rate</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5">Settlement Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {receipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-emerald-400">{r.id}</td>
                    <td className="p-3.5 text-slate-300 font-medium whitespace-nowrap">{formatDate(r.receipt_date)}</td>
                    <td className="p-3.5 text-slate-200 font-medium">
                      <div>{r.supplier_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{r.supplier_id}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${getMaterialBadgeClass(r.material_type)}`}>
                        {r.material_type}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300 font-medium">{r.vehicle_type}</td>
                    <td className="p-3.5 text-slate-300">
                      <div className="font-bold">{r.trip_count} trip(s)</div>
                      <div className="text-[11px] text-slate-500 font-mono">@ {formatCurrency(r.rate_per_trip)} / trip</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-100 text-sm">{formatCurrency(r.total_amount)}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusBadgeClass(r.status)}`}>
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

      {/* New Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onSuccess={fetchReceipts}
      />
    </div>
  );
}
