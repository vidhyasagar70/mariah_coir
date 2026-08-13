import React, { useState, useEffect } from 'react';
import { Wrench, Filter, Trash2, IndianRupee, Clock, CreditCard, Layers, Search, Calendar, RotateCcw } from 'lucide-react';
import api from '../../../shared/services/api';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';

export default function MM02_MaintenanceRecords({ search }) {
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ totalExpenditure: 0, totalEntries: 0, cashExpenditure: 0, onlineExpenditure: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [payModeFilter, setPayModeFilter] = useState('All');
  const [localSearch, setLocalSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchMaintenanceRecords = async () => {
    try {
      setLoading(true);
      const params = {};
      const querySearch = localSearch || search;
      if (querySearch) params.search = querySearch;
      if (payModeFilter !== 'All') params.pay_mode = payModeFilter;
      if (fromDate) params.from_date = fromDate;
      if (toDate) params.to_date = toDate;

      const res = await api.get('/maintenance', { params });
      setLogs(res.data.logs || []);
      setSummary(res.data.summary || { totalExpenditure: 0, totalEntries: 0, cashExpenditure: 0, onlineExpenditure: 0 });
    } catch (err) {
      console.error('Error fetching maintenance logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceRecords();
  }, [search, localSearch, payModeFilter, fromDate, toDate]);

  const handleResetFilters = () => {
    setPayModeFilter('All');
    setLocalSearch('');
    setFromDate('');
    setToDate('');
  };

  const hasActiveFilters = payModeFilter !== 'All' || localSearch !== '' || fromDate !== '' || toDate !== '';

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete maintenance record ${id}?`)) return;
    try {
      await api.delete(`/maintenance/${id}`);
      fetchMaintenanceRecords();
    } catch (err) {
      alert('Error deleting maintenance record: ' + err.message);
    }
  };

  const getPayModeBadgeClass = (mode) => {
    switch (mode) {
      case 'Cash':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Online / Bank Transfer':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'UPI':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Cheque':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200';
    }
  };

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-130px)]">
      {/* Top KPI Banner Cards - Compact Half Height */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
        {/* TOTAL EXPENDITURE */}
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL SPENT</span>
            <div className="p-1 rounded-md bg-[#FAF0E6] text-[#965E36]">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-[#2E1C11]">
            {formatCurrency(summary.totalExpenditure)}
          </div>
        </div>

        {/* TOTAL ENTRIES */}
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">MAINTENANCE LOGS</span>
            <div className="p-1 rounded-md bg-blue-50 text-blue-700">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-[#2E1C11]">
            {summary.totalEntries} <span className="text-[11px] font-normal text-[#7A6759]">records</span>
          </div>
        </div>

        {/* CASH VS ONLINE BREAKDOWN */}
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">PAYMENT BREAKDOWN</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-[11px] font-semibold flex items-center justify-between gap-2 pt-0.5">
            <span className="text-[#7A6759]">Cash: <strong className="font-mono text-[#2E1C11]">{formatCurrency(summary.cashExpenditure)}</strong></span>
            <span className="text-[#7A6759]">Online: <strong className="font-mono text-emerald-700">{formatCurrency(summary.onlineExpenditure)}</strong></span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="card-panel p-3 sm:p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Search Input Field */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#A8988B]" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#965E36] font-medium transition-colors"
          />
        </div>

        {/* Date & Payment Mode Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* From Date Filter */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
            <Calendar className="h-3.5 w-3.5 text-[#965E36] shrink-0" />
            <span className="text-[11px] font-semibold text-[#6E594A] whitespace-nowrap">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs text-[#2E1C11] font-medium bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          {/* To Date Filter */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
            <Calendar className="h-3.5 w-3.5 text-[#965E36] shrink-0" />
            <span className="text-[11px] font-semibold text-[#6E594A] whitespace-nowrap">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs text-[#2E1C11] font-medium bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          {/* Payment Mode Filter Dropdown */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
            <Filter className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <select
              value={payModeFilter}
              onChange={(e) => setPayModeFilter(e.target.value)}
              className="text-xs text-[#2E1C11] bg-transparent focus:outline-none font-medium cursor-pointer"
            >
              <option value="All">All Payment Modes</option>
              <option value="Cash">Cash Only</option>
              <option value="Online / Bank Transfer">Online / Bank Transfer</option>
              <option value="UPI">UPI Payment</option>
              <option value="Cheque">Cheque Payment</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Maintenance Data Table Container - Fixed Height Fill to End & Scrollable Content */}
      <div className="card-panel rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0 border border-[#E8DCD0]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-xs text-[#7A6759] space-y-2">
            <div className="w-5 h-5 border-2 border-[#965E36] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading maintenance records...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <Wrench className="h-10 w-10 text-[#D4C3B3] mx-auto" />
            <h3 className="text-sm font-bold text-[#2E1C11]">No Maintenance Records Found</h3>
            <p className="text-xs text-[#7A6759]">Click "+ Add Maintenance Entry" in the top header to start tracking logs.</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 h-full w-full">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead className="sticky top-0 z-10 bg-[#F5ECE3] border-b border-[#E8DCD0] shadow-2xs">
                <tr className="text-[#6E594A] font-bold uppercase tracking-wider">
                  <th className="p-3.5">ENTRY ID</th>
                  <th className="p-3.5">MAINT. DATE</th>
                  <th className="p-3.5">MAINTENANCE NAME & REASON</th>
                  <th className="p-3.5">DAYS TAKEN</th>
                  <th className="p-3.5">AMOUNT SPENT</th>
                  <th className="p-3.5">PAYMENT MODE</th>
                  <th className="p-3.5">PAYMENT DATE</th>
                  <th className="p-3.5">RECEIVER / ACCOUNT NO</th>
                  <th className="p-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EDE4] bg-white">
                {logs.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                    {/* ENTRY ID */}
                    <td className="p-3.5 font-mono font-bold text-[#2E1C11] whitespace-nowrap">
                      {item.id}
                    </td>

                    {/* MAINT. DATE */}
                    <td className="p-3.5 text-[#6E594A] font-medium whitespace-nowrap">
                      {formatDate(item.maintenance_date)}
                    </td>

                    {/* MAINTENANCE NAME & REASON */}
                    <td className="p-3.5">
                      <div className="font-bold text-[#2E1C11] text-xs">{item.maintenance_name}</div>
                      {item.maintenance_reason && (
                        <div className="text-[11px] text-[#7A6759] mt-0.5 max-w-xs truncate">
                          {item.maintenance_reason}
                        </div>
                      )}
                    </td>

                    {/* DAYS TAKEN */}
                    <td className="p-3.5">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#FAF0E6] border border-[#E8D6C5] text-[11px] font-medium text-[#8C532E]">
                        <Clock className="h-3 w-3" />
                        <span>{item.days_taken} Day(s)</span>
                      </span>
                    </td>

                    {/* AMOUNT SPENT */}
                    <td className="p-3.5 font-mono font-bold text-[#2E1C11] text-sm whitespace-nowrap">
                      {formatCurrency(item.amount_spent)}
                    </td>

                    {/* PAYMENT MODE */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${getPayModeBadgeClass(item.pay_mode)}`}>
                        {item.pay_mode}
                      </span>
                    </td>

                    {/* PAYMENT DATE */}
                    <td className="p-3.5 text-[#6E594A] font-medium whitespace-nowrap">
                      {formatDate(item.payment_date || item.maintenance_date)}
                    </td>

                    {/* RECEIVER / ACCOUNT NO */}
                    <td className="p-4">
                      <div>
                        <div className="font-semibold text-[#2E1C11]">{item.receiver_name || '-'}</div>
                        {item.pay_mode !== 'Cash' && item.account_number && (
                          <div className="text-[11px] text-[#7A6759] font-mono">{item.account_number}</div>
                        )}
                        {item.pay_mode === 'Cash' && (
                          <div className="text-[10px] text-[#A8988B]">Cash Recipient</div>
                        )}
                      </div>
                    </td>

                    {/* ACTIONS */}
                    <td className="p-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-[#A8988B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete Record"
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
    </div>
  );
}
