import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Search, Filter, RotateCcw, CheckCircle2, Clock, XCircle, Calendar, Phone, IndianRupee, Layers } from 'lucide-react';
import api from '../../../../shared/services/api';
import { formatCurrency, formatDate } from '../../../../shared/utils/formatters';

const STANDARD_VEHICLES = ['Tractor', 'Pickup', '6-Wheeler Tipper', '10-Wheeler Lorry', 'Trailer'];
const QUEUE_STATUSES = ['In Queue', 'Partial Delivered', 'Completed', 'Cancelled'];

export default function DustCustomersLanding({ search: globalSearch }) {
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    totalAdvancePaid: 0,
    totalAdvanceBalance: 0,
    inQueueCount: 0,
    completedCount: 0
  });

  const [loading, setLoading] = useState(true);

  // Filters
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    phone_number: '',
    company_name: '',
    preferred_vehicle_type: 'Tractor',
    advance_amount_paid: '',
    advance_date: new Date().toISOString().split('T')[0],
    delivery_due_date: '',
    notes: ''
  });

  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {};
      const querySearch = localSearch || globalSearch;
      if (querySearch) params.search = querySearch;
      if (statusFilter !== 'All') params.queue_status = statusFilter;

      const res = await api.get('/dust/customers', { params });
      setCustomers(res.data.customers || []);
      setSummary(res.data.summary || { totalCustomers: 0, totalAdvancePaid: 0, totalAdvanceBalance: 0, inQueueCount: 0, completedCount: 0 });
    } catch (err) {
      console.error('Error fetching dust customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [globalSearch, localSearch, statusFilter]);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      customer_name: '',
      phone_number: '',
      company_name: '',
      preferred_vehicle_type: 'Tractor',
      advance_amount_paid: '',
      advance_date: new Date().toISOString().split('T')[0],
      delivery_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: ''
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c) => {
    setEditingCustomer(c);
    setFormData({
      customer_name: c.customer_name || '',
      phone_number: c.phone_number || '',
      company_name: c.company_name || '',
      preferred_vehicle_type: c.preferred_vehicle_type || 'Tractor',
      advance_amount_paid: c.advance_amount_paid !== undefined ? String(c.advance_amount_paid) : '',
      advance_date: c.advance_date ? c.advance_date.split('T')[0] : '',
      delivery_due_date: c.delivery_due_date ? c.delivery_due_date.split('T')[0] : '',
      notes: c.notes || ''
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.customer_name.trim()) {
      setModalError('Customer name is required.');
      return;
    }
    if (!formData.phone_number.trim()) {
      setModalError('Phone number is required.');
      return;
    }
    if (!formData.delivery_due_date) {
      setModalError('Delivery due date is required.');
      return;
    }

    const advanceNum = parseFloat(formData.advance_amount_paid);
    if (isNaN(advanceNum) || advanceNum < 0) {
      setModalError('Advance amount paid must be a valid non-negative number.');
      return;
    }

    const payload = {
      customer_name: formData.customer_name.trim(),
      phone_number: formData.phone_number.trim(),
      company_name: formData.company_name ? formData.company_name.trim() : null,
      preferred_vehicle_type: formData.preferred_vehicle_type,
      advance_amount_paid: advanceNum,
      advance_date: formData.advance_date,
      delivery_due_date: formData.delivery_due_date,
      notes: formData.notes ? formData.notes.trim() : null
    };

    try {
      setSubmitting(true);
      if (editingCustomer) {
        await api.put(`/dust/customers/${editingCustomer.id}`, payload);
      } else {
        await api.post('/dust/customers', payload);
      }
      handleCloseModal();
      fetchCustomers();
    } catch (err) {
      console.error('Error saving customer:', err);
      setModalError(err.response?.data?.error || 'Failed to save customer advance record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete dust customer "${name}" (${id})?`)) return;
    try {
      await api.delete(`/dust/customers/${id}`);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting customer: ' + err.message);
    }
  };

  const getQueueBadge = (status) => {
    switch (status) {
      case 'In Queue':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'Partial Delivered':
        return 'bg-blue-50 text-blue-900 border-blue-200';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-900 border-rose-200';
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200';
    }
  };

  const hasActiveFilters = localSearch !== '' || statusFilter !== 'All';

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-130px)]">
      {/* KPI Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 shrink-0">
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL ADVANCE PAID</span>
            <div className="p-1 rounded-md bg-[#FAF0E6] text-[#965E36]">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-[#2E1C11]">
            {formatCurrency(summary.totalAdvancePaid)}
          </div>
        </div>

        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">REMAINING BALANCES</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-emerald-800">
            {formatCurrency(summary.totalAdvanceBalance)}
          </div>
        </div>

        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">ACTIVE IN QUEUE</span>
            <div className="p-1 rounded-md bg-amber-50 text-amber-700">
              <Clock className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-amber-800">
            {summary.inQueueCount} <span className="text-[11px] font-normal text-[#7A6759]">customers</span>
          </div>
        </div>

        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">COMPLETED ORDERS</span>
            <div className="p-1 rounded-md bg-blue-50 text-blue-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-blue-800">
            {summary.completedCount} <span className="text-[11px] font-normal text-[#7A6759]">fulfilled</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card-panel p-3 sm:p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#A8988B]" />
          <input
            type="text"
            placeholder="Search customer, phone, company..."
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
              <option value="All">All Queue Statuses</option>
              {QUEUE_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
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
            <span>Register Customer Advance</span>
          </button>
        </div>
      </div>

      {/* Customer Data Table */}
      <div className="card-panel rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0 border border-[#E8DCD0]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-xs text-[#7A6759] space-y-2">
            <div className="w-5 h-5 border-2 border-[#965E36] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading dust customer records...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <Users className="h-10 w-10 text-[#D4C3B3] mx-auto" />
            <h3 className="text-sm font-bold text-[#2E1C11]">No Dust Customers Found</h3>
            <p className="text-xs text-[#7A6759]">Click "+ Register Customer Advance" to register advance payment and queue status.</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 h-full w-full">
            <table className="w-full text-left text-xs min-w-[820px]">
              <thead className="sticky top-0 z-10 bg-[#F5ECE3] border-b border-[#E8DCD0] shadow-2xs">
                <tr className="text-[#6E594A] font-bold uppercase tracking-wider">
                  <th className="p-3.5">CUST ID</th>
                  <th className="p-3.5">CUSTOMER & COMPANY NAME</th>
                  <th className="p-3.5">PHONE NUMBER</th>
                  <th className="p-3.5">VEHICLE PREF.</th>
                  <th className="p-3.5">ADVANCE PAID (₹)</th>
                  <th className="p-3.5">REMAINING BALANCE (₹)</th>
                  <th className="p-3.5">ADV. DATE</th>
                  <th className="p-3.5">DELIVERY DUE</th>
                  <th className="p-3.5">QUEUE STATUS</th>
                  <th className="p-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EDE4] bg-white">
                {customers.map((c) => {
                  const initialPaid = parseFloat(c.advance_amount_paid) || 0;
                  const currentBal = parseFloat(c.current_advance_balance) || 0;

                  return (
                    <tr key={c.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#2E1C11] whitespace-nowrap">
                        {c.id}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-[#2E1C11] text-xs">{c.customer_name}</div>
                        {c.company_name && (
                          <div className="text-[11px] text-[#7A6759] truncate max-w-xs">{c.company_name}</div>
                        )}
                      </td>
                      <td className="p-3.5 font-mono font-medium text-[#6E594A] whitespace-nowrap">
                        {c.phone_number}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FAF0E6] text-[#8C532E] border border-[#E8D6C5]">
                          {c.preferred_vehicle_type}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-[#2E1C11] whitespace-nowrap">
                        {formatCurrency(initialPaid)}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-emerald-800 text-sm whitespace-nowrap">
                        {formatCurrency(currentBal)}
                      </td>
                      <td className="p-3.5 text-[#6E594A] font-medium whitespace-nowrap text-[11px]">
                        {formatDate(c.advance_date)}
                      </td>
                      <td className="p-3.5 font-semibold text-[#2E1C11] whitespace-nowrap text-[11px]">
                        {formatDate(c.delivery_due_date)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getQueueBadge(c.queue_status)}`}>
                          {c.queue_status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => handleOpenEditModal(c)}
                          className="p-1.5 rounded-lg text-[#6E594A] hover:text-[#965E36] hover:bg-[#FAF0E6] transition-colors cursor-pointer"
                          title="Edit Customer Details"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.customer_name)}
                          className="p-1.5 rounded-lg text-[#A8988B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Customer"
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
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C120C]/60 backdrop-blur-xs">
          <div className="card-panel w-full max-w-lg p-5 rounded-2xl bg-white shadow-2xl space-y-4 border border-[#D6C4B0] animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F4EDE4]">
              <h3 className="text-sm font-extrabold text-[#2E1C11] flex items-center space-x-2">
                <Users className="h-4 w-4 text-[#965E36]" />
                <span>{editingCustomer ? `Edit Customer (${editingCustomer.id})` : 'Register Dust Customer & Advance'}</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">
                    Customer Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="e.g. Green Leaf Bio-Farm"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">
                    Phone Number <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="e.g. +91 98450 11223"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">Company Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="e.g. Green Leaf Organics Ltd"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">
                    Preferred Vehicle Type <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.preferred_vehicle_type}
                    onChange={(e) => setFormData({ ...formData, preferred_vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36] cursor-pointer"
                  >
                    {STANDARD_VEHICLES.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">
                    Advance Paid (₹) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-[#965E36] pointer-events-none">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.advance_amount_paid}
                      onChange={(e) => setFormData({ ...formData, advance_amount_paid: e.target.value })}
                      placeholder="18000.00"
                      className="w-full pl-8 pr-2 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-mono font-bold focus:outline-none focus:border-[#965E36]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">Advance Date</label>
                  <input
                    type="date"
                    value={formData.advance_date}
                    onChange={(e) => setFormData({ ...formData, advance_date: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">
                    Delivery Due Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.delivery_due_date}
                    onChange={(e) => setFormData({ ...formData, delivery_due_date: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11]">Notes / Order Remarks</label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Special customer instructions or load specifications..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                />
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
                  {submitting ? 'Registering...' : editingCustomer ? 'Update Customer' : 'Register Customer Advance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
