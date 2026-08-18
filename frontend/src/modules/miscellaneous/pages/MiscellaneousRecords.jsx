import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Calendar,
  Filter,
  RotateCcw,
  IndianRupee,
  CreditCard,
  Layers,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import api from '../../../shared/services/api';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import MiscellaneousViewDrawer, { maskAccountNumber } from '../components/MiscellaneousViewDrawer';

export default function MiscellaneousRecords({ onNavigateToNew, onNavigateToEdit, searchProp = '' }) {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    totalRecords: 0,
    totalAmount: 0,
    onlineAmount: 0,
    offlineAmount: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalRecords: 0,
    totalPages: 1
  });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchProp);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentModeFilter, setPaymentModeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Drawer / View State
  const [selectedRecordForView, setSelectedRecordForView] = useState(null);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search,
        date_from: dateFrom,
        date_to: dateTo,
        payment_mode: paymentModeFilter,
        status: statusFilter
      };

      const res = await api.get('/miscellaneous', { params });
      setRecords(res.data.records || []);
      setSummary(res.data.summary || { totalRecords: 0, totalAmount: 0, onlineAmount: 0, offlineAmount: 0 });
      setPagination(res.data.pagination || { page: 1, limit: 20, totalRecords: 0, totalPages: 1 });
    } catch (err) {
      console.error('Error fetching miscellaneous records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, limit, paymentModeFilter, statusFilter]);

  const handleApplySearch = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchRecords();
  };

  const handleResetFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setPaymentModeFilter('All');
    setStatusFilter('All');
    setPage(1);
  };

  const handleDelete = async (id, desc) => {
    if (!window.confirm(`Are you sure you want to delete miscellaneous record: "${desc}"?`)) return;
    try {
      await api.delete(`/miscellaneous/${id}`);
      fetchRecords();
    } catch (err) {
      alert('Error deleting record: ' + (err.response?.data?.error || err.message));
    }
  };

  const getStatusBadge = (status) => {
    const st = (status || 'PAID').toUpperCase();
    switch (st) {
      case 'PAID':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle className="h-3 w-3" />
            <span>PAID</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="h-3 w-3" />
            <span>PENDING</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="h-3 w-3" />
            <span>CANCELLED</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-stone-50 text-stone-700 border border-stone-200">
            {status}
          </span>
        );
    }
  };

  const getPaymentModeBadge = (mode) => {
    const isOnline = (mode || '').toUpperCase() === 'ONLINE';
    return (
      <span
        className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
          isOnline
            ? 'bg-blue-50 text-blue-800 border-blue-200'
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}
      >
        {isOnline ? 'Online' : 'Offline'}
      </span>
    );
  };

  const hasActiveFilters =
    search !== '' || dateFrom !== '' || dateTo !== '' || paymentModeFilter !== 'All' || statusFilter !== 'All';

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-130px)]">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {/* Total Records */}
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1 bg-white border border-[#E8DCD0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL RECORDS</span>
            <div className="p-1 rounded-md bg-[#FAF0E6] text-[#965E36]">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-[#2E1C11]">
            {summary.totalRecords} <span className="text-[11px] font-normal text-[#7A6759]">entries</span>
          </div>
        </div>

        {/* Total Amount */}
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1 bg-white border border-[#E8DCD0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL EXPENSE</span>
            <div className="p-1 rounded-md bg-amber-50 text-amber-700">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-[#2E1C11]">
            {formatCurrency(summary.totalAmount)}
          </div>
        </div>

        {/* Online Amount */}
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1 bg-white border border-[#E8DCD0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">ONLINE AMOUNT</span>
            <div className="p-1 rounded-md bg-blue-50 text-blue-700">
              <CreditCard className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-blue-700">
            {formatCurrency(summary.onlineAmount)}
          </div>
        </div>

        {/* Offline Amount */}
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1 bg-white border border-[#E8DCD0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">OFFLINE AMOUNT</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-emerald-800">
            {formatCurrency(summary.offlineAmount)}
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Bar */}
      <form onSubmit={handleApplySearch} className="card-panel p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white border border-[#E8DCD0]">
        
        {/* Search Field */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#A8988B]" />
          <input
            type="text"
            placeholder="Search description, reference... (Press Enter)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#965E36] font-medium transition-colors"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date From */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
            <Calendar className="h-3.5 w-3.5 text-[#965E36] shrink-0" />
            <span className="text-[11px] font-semibold text-[#6E594A] whitespace-nowrap">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs text-[#2E1C11] font-medium bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
            <Calendar className="h-3.5 w-3.5 text-[#965E36] shrink-0" />
            <span className="text-[11px] font-semibold text-[#6E594A] whitespace-nowrap">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-xs text-[#2E1C11] font-medium bg-transparent focus:outline-none cursor-pointer"
            />
          </div>

          {/* Payment Mode */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
            <Filter className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <select
              value={paymentModeFilter}
              onChange={(e) => {
                setPaymentModeFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs text-[#2E1C11] bg-transparent focus:outline-none font-medium cursor-pointer"
            >
              <option value="All">All Modes</option>
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
            <Filter className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs text-[#2E1C11] bg-transparent focus:outline-none font-medium cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Action Buttons (Hidden Submit for Enter key support) */}
          <button type="submit" className="hidden">Search</button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </form>

      {/* Main Table Container */}
      <div className="card-panel rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0 border border-[#E8DCD0] bg-white">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-xs text-[#7A6759] space-y-2">
            <div className="w-5 h-5 border-2 border-[#965E36] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading miscellaneous expense records...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <FileText className="h-10 w-10 text-[#D4C3B3] mx-auto" />
            <h3 className="text-sm font-bold text-[#2E1C11]">No Miscellaneous Records Found</h3>
            <p className="text-xs text-[#7A6759] max-w-sm">
              There are no miscellaneous expense records matching the current filters.
            </p>
            {onNavigateToNew && (
              <button
                onClick={onNavigateToNew}
                className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#965E36] text-white text-xs font-bold hover:bg-[#7A4A28] transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>+ Miscellaneous Entry</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-auto flex-1 h-full w-full">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="sticky top-0 z-10 bg-[#F5ECE3] border-b border-[#E8DCD0] shadow-2xs">
                <tr className="text-[#6E594A] font-bold uppercase tracking-wider">
                  <th className="p-3.5">DATE</th>
                  <th className="p-3.5">DESCRIPTION</th>
                  <th className="p-3.5">PAYMENT MODE</th>
                  <th className="p-3.5">ACCOUNT / REFERENCE</th>
                  <th className="p-3.5">AMOUNT</th>
                  <th className="p-3.5">STATUS</th>
                  <th className="p-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EDE4] bg-white">
                {records.map((item) => {
                  const isOnline = (item.payment_mode || '').toUpperCase() === 'ONLINE';
                  return (
                    <tr key={item.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                      {/* DATE */}
                      <td className="p-3.5 text-[#6E594A] font-medium whitespace-nowrap">
                        {formatDate(item.expense_date)}
                      </td>

                      {/* DESCRIPTION */}
                      <td className="p-3.5 max-w-xs">
                        <div className="font-bold text-[#2E1C11] text-xs line-clamp-2">{item.description}</div>
                        {item.bank_name && (
                          <div className="text-[10px] text-[#7A6759] mt-0.5 truncate">{item.bank_name}</div>
                        )}
                      </td>

                      {/* PAYMENT MODE */}
                      <td className="p-3.5 whitespace-nowrap">
                        {getPaymentModeBadge(item.payment_mode)}
                      </td>

                      {/* ACCOUNT / REFERENCE (Masked if Online) */}
                      <td className="p-3.5 whitespace-nowrap">
                        {isOnline ? (
                          <span className="font-mono font-bold text-[#2E1C11]">
                            {maskAccountNumber(item.account_number)}
                          </span>
                        ) : (
                          <span className="font-mono text-[#7A6759]">
                            {item.payment_reference || '-'}
                          </span>
                        )}
                      </td>

                      {/* AMOUNT */}
                      <td className="p-3.5 font-mono font-bold text-[#2E1C11] text-sm whitespace-nowrap">
                        {formatCurrency(item.amount)}
                      </td>

                      {/* STATUS */}
                      <td className="p-3.5 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* ACTIONS */}
                      <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                        {/* View Action */}
                        <button
                          onClick={() => setSelectedRecordForView(item)}
                          className="p-1.5 rounded-lg text-[#7C5A3E] hover:text-[#2E1C11] hover:bg-[#E2D2C2] transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Edit Action */}
                        {onNavigateToEdit && (
                          <button
                            onClick={() => onNavigateToEdit(item.id)}
                            className="p-1.5 rounded-lg text-[#7C5A3E] hover:text-[#965E36] hover:bg-[#FAF0E6] transition-colors cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}

                        {/* Delete Action */}
                        <button
                          onClick={() => handleDelete(item.id, item.description)}
                          className="p-1.5 rounded-lg text-[#A8988B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server Side Pagination Footer */}
        <div className="p-3 bg-[#F5ECE3] border-t border-[#E8DCD0] flex flex-wrap items-center justify-between gap-3 text-xs text-[#6E594A] shrink-0">
          <div className="flex items-center space-x-2">
            <span>Rows per page:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="bg-white border border-[#D6C4B0] rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-[11px] text-[#7A6759]">
              Showing {records.length > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, pagination.totalRecords)} of {pagination.totalRecords}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px]">Page {pagination.page} of {pagination.totalPages}</span>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-white border border-[#D6C4B0] text-[#5C3B21] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAF7F2] cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-white border border-[#D6C4B0] text-[#5C3B21] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FAF7F2] cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Side Drawer Modal for View Action */}
      {selectedRecordForView && (
        <MiscellaneousViewDrawer
          record={selectedRecordForView}
          onClose={() => setSelectedRecordForView(null)}
          onEdit={(rec) => {
            setSelectedRecordForView(null);
            if (onNavigateToEdit) onNavigateToEdit(rec.id);
          }}
        />
      )}
    </div>
  );
}
