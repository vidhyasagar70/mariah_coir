import { useState, useEffect } from 'react';
import { supplierApi } from '../../api/supplierApi';
import SupplyEntryModal from './SupplyEntryModal';
import PrintReceiptModal from './PrintReceiptModal';
import {
  Plus, Search, Truck, Calendar, Printer, XCircle, RefreshCw, Eye, Scale, DollarSign
} from 'lucide-react';

export default function SupplyEntriesView({ onSelectSupplier }) {
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({
    today_supply_amount: 0,
    today_quantity: 0,
    total_supply_amount: 0,
    total_advance_adjusted: 0,
    total_payable: 0
  });
  const [suppliers, setSuppliers] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');
  const [fromDateFilter, setFromDateFilter] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedEntryForPrint, setSelectedEntryForPrint] = useState(null);
  const [selectedEntryDetail, setSelectedEntryDetail] = useState(null);

  const fetchFiltersData = async () => {
    try {
      const [supRes, rmRes, vtRes] = await Promise.all([
        supplierApi.getSuppliers({ status: 'Active' }),
        supplierApi.getRawMaterials({ status: 'Active' }),
        supplierApi.getVehicleTypes({ status: 'Active' })
      ]);
      setSuppliers(supRes.data || []);
      setRawMaterials(rmRes.data || []);
      setVehicleTypes(vtRes.data || []);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await supplierApi.getSupplyEntries({
        supplier_id: supplierFilter,
        raw_material_id: materialFilter,
        vehicle_type_id: vehicleTypeFilter,
        from_date: fromDateFilter,
        to_date: toDateFilter,
        status: statusFilter,
        search
      });
      setEntries(res.data || []);
      if (res.summary) setSummary(res.summary);
    } catch (err) {
      console.error('Failed to fetch supply entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [supplierFilter, materialFilter, vehicleTypeFilter, fromDateFilter, toDateFilter, statusFilter, search]);

  const handleCancelEntry = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this supply entry? This will reverse stock and ledger adjustments.')) return;
    try {
      await supplierApi.cancelSupplyEntry(id);
      fetchEntries();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel supply entry.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Truck className="h-6 w-6 text-emerald-400" />
            Daily Raw Material Supply Entry Records
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Record raw material supply receipts, calculate total amount, auto-resolve pricing, and apply against supplier advance balance.
          </p>
        </div>
        <button
          onClick={() => setShowEntryModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          New Supply Entry
        </button>
      </div>

      {/* 5 Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Today's Supply Amount</p>
          <p className="text-lg font-bold text-emerald-400 mt-1">
            ₹{summary.today_supply_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Today's Quantity</p>
          <p className="text-lg font-bold text-slate-100 mt-1">
            {summary.today_quantity.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Supply Amount</p>
          <p className="text-lg font-bold text-slate-100 mt-1">
            ₹{summary.total_supply_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Advance Adjusted</p>
          <p className="text-lg font-bold text-teal-300 mt-1">
            ₹{summary.total_advance_adjusted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Outstanding Payable</p>
          <p className="text-lg font-bold text-amber-400 mt-1">
            ₹{summary.total_payable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Supply No, Supplier, Material, Vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.supplier_name} ({s.supplier_number})</option>
            ))}
          </select>

          <select
            value={materialFilter}
            onChange={(e) => setMaterialFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">All Raw Materials</option>
            {rawMaterials.map((rm) => (
              <option key={rm.id} value={rm.id}>{rm.name}</option>
            ))}
          </select>

          <select
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">All Vehicle Types</option>
            {vehicleTypes.map((vt) => (
              <option key={vt.id} value={vt.id}>{vt.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Date Range:</span>
            <input
              type="date"
              value={fromDateFilter}
              onChange={(e) => setFromDateFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500/50"
            />
            <span className="text-xs text-slate-500">to</span>
            <input
              type="date"
              value={toDateFilter}
              onChange={(e) => setToDateFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="All">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <button
              onClick={fetchEntries}
              className="p-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition cursor-pointer"
              title="Refresh List"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Supply Entries Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Supply Number</th>
                <th className="px-5 py-4">Supplier</th>
                <th className="px-5 py-4">Raw Material</th>
                <th className="px-5 py-4">Quantity</th>
                <th className="px-5 py-4">Vehicle</th>
                <th className="px-5 py-4 text-right">Price (₹)</th>
                <th className="px-5 py-4 text-right">Total Amount (₹)</th>
                <th className="px-5 py-4 text-right">Advance Adjusted</th>
                <th className="px-5 py-4 text-right">Remaining Due</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="12" className="text-center py-8 text-slate-500">
                    Loading supply records...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan="12" className="text-center py-8 text-slate-500">
                    No supply entry records found matching filters.
                  </td>
                </tr>
              ) : (
                entries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-4 font-mono text-slate-400">{item.date}</td>
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-slate-100 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                        {item.supply_number}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => onSelectSupplier && onSelectSupplier(item.supplier_id)}
                        className="font-semibold text-slate-100 hover:text-emerald-400 transition text-left"
                      >
                        {item.supplier_name}
                      </button>
                      <div className="text-[10px] text-slate-500 font-mono">{item.supplier_number}</div>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-200">{item.raw_material_name}</td>
                    <td className="px-5 py-4 font-bold text-slate-100">
                      {item.quantity} <span className="text-slate-400 font-mono font-normal text-[11px]">{item.unit_code}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-mono font-bold text-slate-200">{item.vehicle_number}</div>
                      <div className="text-[10px] text-slate-500">{item.vehicle_type_name}</div>
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-slate-300">
                      ₹{parseFloat(item.price).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      ₹{parseFloat(item.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-teal-300 font-semibold">
                      ₹{parseFloat(item.amount_adjusted).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-amber-400 font-semibold">
                      ₹{parseFloat(item.remaining_due).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium border ${
                        item.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right space-x-1.5">
                      <button
                        onClick={() => setSelectedEntryForPrint(item)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition"
                        title="Print Receipt"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      {item.status === 'Confirmed' && (
                        <button
                          onClick={() => handleCancelEntry(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                          title="Cancel Entry"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Components */}
      <SupplyEntryModal
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        onSuccess={fetchEntries}
      />

      {selectedEntryForPrint && (
        <PrintReceiptModal
          entry={selectedEntryForPrint}
          onClose={() => setSelectedEntryForPrint(null)}
        />
      )}
    </div>
  );
}
