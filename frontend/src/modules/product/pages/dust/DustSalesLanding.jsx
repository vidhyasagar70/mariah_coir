import React, { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, Search, Filter, RotateCcw, CheckCircle2, AlertCircle, IndianRupee, Calculator, Calendar, User, Layers } from 'lucide-react';
import api from '../../../../shared/services/api';
import { formatCurrency, formatDate } from '../../../../shared/utils/formatters';

const STANDARD_VEHICLES = ['Tractor', 'Pickup', '6-Wheeler Tipper', '10-Wheeler Lorry', 'Trailer'];
const PAYMENT_STATUSES = ['Deducted from Advance', 'Payment Due', 'Fully Settled'];

export default function DustSalesLanding({ search: globalSearch }) {
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({
    totalDispatches: 0,
    totalLoadsCount: 0,
    totalSalesAmount: 0,
    totalDeductedFromAdvance: 0,
    totalRemainingDue: 0
  });

  const [loading, setLoading] = useState(true);

  // Filters
  const [localSearch, setLocalSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');

  // Dispatch Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [dustMasterOptions, setDustMasterOptions] = useState([]);

  const [formData, setFormData] = useState({
    customer_id: '',
    dust_id: '',
    vehicle_type: 'Tractor',
    vehicle_number: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    loads_count: '1',
    rate_per_load: ''
  });

  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = {};
      const querySearch = localSearch || globalSearch;
      if (querySearch) params.search = querySearch;
      if (paymentFilter !== 'All') params.payment_status = paymentFilter;

      const res = await api.get('/dust/sales', { params });
      setSales(res.data.sales || []);
      setSummary(res.data.summary || {
        totalDispatches: 0,
        totalLoadsCount: 0,
        totalSalesAmount: 0,
        totalDeductedFromAdvance: 0,
        totalRemainingDue: 0
      });
    } catch (err) {
      console.error('Error fetching dust sales dispatches:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [custRes, masterRes] = await Promise.all([
        api.get('/dust/customers'),
        api.get('/dust/master')
      ]);
      setCustomerOptions(custRes.data.customers || []);
      setDustMasterOptions((masterRes.data.items || []).filter(i => i.status === 'Active'));
    } catch (err) {
      console.error('Error fetching customer/master options for dispatch:', err);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [globalSearch, localSearch, paymentFilter]);

  const handleOpenModal = () => {
    fetchOptions();
    setFormData({
      customer_id: customerOptions[0]?.id || '',
      dust_id: dustMasterOptions[0]?.id || '',
      vehicle_type: dustMasterOptions[0]?.standard_vehicle_type || 'Tractor',
      vehicle_number: '',
      dispatch_date: new Date().toISOString().split('T')[0],
      loads_count: '1',
      rate_per_load: dustMasterOptions[0]?.fixed_rate_per_load !== undefined ? String(dustMasterOptions[0].fixed_rate_per_load) : ''
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleDustMasterChange = (e) => {
    const dId = e.target.value;
    const selectedMaster = dustMasterOptions.find(i => i.id === dId);
    setFormData(prev => ({
      ...prev,
      dust_id: dId,
      vehicle_type: selectedMaster ? selectedMaster.standard_vehicle_type : prev.vehicle_type,
      rate_per_load: selectedMaster ? String(selectedMaster.fixed_rate_per_load) : prev.rate_per_load
    }));
  };

  const selectedCustomer = customerOptions.find(c => c.id === formData.customer_id);
  const custAdvBalance = selectedCustomer ? (parseFloat(selectedCustomer.current_advance_balance) || 0) : 0;
  const loadsCountNum = parseInt(formData.loads_count, 10) || 0;
  const rateNum = parseFloat(formData.rate_per_load) || 0;
  const calcTotalSale = loadsCountNum * rateNum;
  const calcDeduction = Math.min(custAdvBalance, calcTotalSale);
  const calcRemainingDue = Math.max(0, calcTotalSale - calcDeduction);
  const calcNewAdvBalance = Math.max(0, custAdvBalance - calcDeduction);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.customer_id) {
      setModalError('Please select a valid customer.');
      return;
    }
    if (!formData.vehicle_number.trim()) {
      setModalError('Vehicle registration number is required.');
      return;
    }
    if (loadsCountNum < 1) {
      setModalError('Loads count must be at least 1.');
      return;
    }
    if (rateNum <= 0) {
      setModalError('Rate per load must be a positive number.');
      return;
    }

    const payload = {
      customer_id: formData.customer_id,
      dust_id: formData.dust_id || null,
      vehicle_type: formData.vehicle_type,
      vehicle_number: formData.vehicle_number.trim(),
      dispatch_date: formData.dispatch_date,
      loads_count: loadsCountNum,
      rate_per_load: rateNum
    };

    try {
      setSubmitting(true);
      await api.post('/dust/sales', payload);
      handleCloseModal();
      fetchSales();
    } catch (err) {
      console.error('Error logging dust dispatch:', err);
      setModalError(err.response?.data?.error || 'Failed to log dust dispatch entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete dust dispatch ${id}? Customer advance balance will be restored.`)) return;
    try {
      await api.delete(`/dust/sales/${id}`);
      fetchSales();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting dispatch entry: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Deducted from Advance':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200';
      case 'Payment Due':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'Fully Settled':
        return 'bg-blue-50 text-blue-900 border-blue-200';
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200';
    }
  };

  const hasActiveFilters = localSearch !== '' || paymentFilter !== 'All';

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-130px)]">
      {/* KPI Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 shrink-0">
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL DISPATCHES</span>
            <div className="p-1 rounded-md bg-[#FAF0E6] text-[#965E36]">
              <Truck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-[#2E1C11]">
            {summary.totalDispatches} <span className="text-[11px] font-normal text-[#7A6759]">entries</span>
          </div>
        </div>

        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL DISPATCHED LOADS</span>
            <div className="p-1 rounded-md bg-blue-50 text-blue-700">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-blue-800">
            {summary.totalLoadsCount} <span className="text-[11px] font-normal text-[#7A6759]">loads</span>
          </div>
        </div>

        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL DISPATCH AMOUNT</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-emerald-800">
            {formatCurrency(summary.totalSalesAmount)}
          </div>
        </div>

        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">ADVANCE DEDUCTED</span>
            <div className="p-1 rounded-md bg-amber-50 text-amber-700">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-[#965E36]">
            {formatCurrency(summary.totalDeductedFromAdvance)}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card-panel p-3 sm:p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#A8988B]" />
          <input
            type="text"
            placeholder="Search dispatch by vehicle, customer..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#965E36] font-medium transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
            <Filter className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="text-xs text-[#2E1C11] bg-transparent focus:outline-none font-medium cursor-pointer"
            >
              <option value="All">All Payment Statuses</option>
              {PAYMENT_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => { setLocalSearch(''); setPaymentFilter('All'); }}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={handleOpenModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-extrabold shadow-sm transition-all duration-150 cursor-pointer ml-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Log Dust Dispatch</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="card-panel rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0 border border-[#E8DCD0]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-xs text-[#7A6759] space-y-2">
            <div className="w-5 h-5 border-2 border-[#965E36] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading dust dispatch records...</span>
          </div>
        ) : sales.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <Truck className="h-10 w-10 text-[#D4C3B3] mx-auto" />
            <h3 className="text-sm font-bold text-[#2E1C11]">No Dust Dispatches Found</h3>
            <p className="text-xs text-[#7A6759]">Click "+ Log Dust Dispatch" to record dispatched loads and advance deductions.</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 h-full w-full">
            <table className="w-full text-left text-xs min-w-[840px]">
              <thead className="sticky top-0 z-10 bg-[#F5ECE3] border-b border-[#E8DCD0] shadow-2xs">
                <tr className="text-[#6E594A] font-bold uppercase tracking-wider">
                  <th className="p-3.5">DISPATCH ID</th>
                  <th className="p-3.5">DISPATCH DATE</th>
                  <th className="p-3.5">CUSTOMER NAME</th>
                  <th className="p-3.5">DUST & VEHICLE TYPE</th>
                  <th className="p-3.5">VEHICLE NO</th>
                  <th className="p-3.5">LOADS</th>
                  <th className="p-3.5">RATE / LOAD (₹)</th>
                  <th className="p-3.5">TOTAL SALE (₹)</th>
                  <th className="p-3.5">ADV. DEDUCTED (₹)</th>
                  <th className="p-3.5">STATUS</th>
                  <th className="p-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EDE4] bg-white">
                {sales.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-[#2E1C11] whitespace-nowrap">
                      {item.id}
                    </td>
                    <td className="p-3.5 text-[#6E594A] font-medium whitespace-nowrap text-[11px]">
                      {formatDate(item.dispatch_date)}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-[#2E1C11] text-xs">{item.customer_name || '-'}</div>
                      {item.company_name && (
                        <div className="text-[11px] text-[#7A6759] truncate max-w-xs">{item.company_name}</div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-[#2E1C11]">{item.dust_name || item.vehicle_type}</div>
                      <div className="text-[10px] text-[#7A6759] font-medium">{item.vehicle_type}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#2E1C11] whitespace-nowrap">
                      {item.vehicle_number}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#965E36] whitespace-nowrap">
                      {item.loads_count} load(s)
                    </td>
                    <td className="p-3.5 font-mono text-[#6E594A] whitespace-nowrap">
                      {formatCurrency(item.rate_per_load)}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-[#2E1C11] text-sm whitespace-nowrap">
                      {formatCurrency(item.total_sale_amount)}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-800 text-sm whitespace-nowrap">
                      {formatCurrency(item.amount_deducted_from_advance)}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusBadge(item.payment_status)}`}>
                        {item.payment_status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg text-[#A8988B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete & Revert Advance"
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

      {/* Dispatch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C120C]/60 backdrop-blur-xs">
          <div className="card-panel w-full max-w-lg p-5 rounded-2xl bg-white shadow-2xl space-y-4 border border-[#D6C4B0] animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F4EDE4]">
              <h3 className="text-sm font-extrabold text-[#2E1C11] flex items-center space-x-2">
                <Truck className="h-4 w-4 text-[#965E36]" />
                <span>Log Dust Load Dispatch</span>
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
              {/* SELECT CUSTOMER */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11]">
                  Select Customer <span className="text-rose-600">*</span>
                </label>
                <select
                  value={formData.customer_id}
                  onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36] cursor-pointer"
                  required
                >
                  <option value="">-- Choose Queue Customer --</option>
                  {customerOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_name} ({c.id}) - Adv Bal: {formatCurrency(c.current_advance_balance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* SELECT DUST TYPE / VEHICLE CONFIG */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11]">
                  Select Dust Configuration
                </label>
                <select
                  value={formData.dust_id}
                  onChange={handleDustMasterChange}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36] cursor-pointer"
                >
                  <option value="">-- Custom / Manual Rate --</option>
                  {dustMasterOptions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.dust_name} ({m.standard_vehicle_type}) - {formatCurrency(m.fixed_rate_per_load)}/load
                    </option>
                  ))}
                </select>
              </div>

              {/* VEHICLE TYPE & VEHICLE NUMBER */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">
                    Vehicle Type <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36] cursor-pointer"
                  >
                    {STANDARD_VEHICLES.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">
                    Vehicle Number <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    placeholder="e.g. TN-37-AZ-1102"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-mono font-bold focus:outline-none focus:border-[#965E36]"
                    required
                  />
                </div>
              </div>

              {/* DISPATCH DATE, LOADS COUNT, RATE PER LOAD */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">Dispatch Date</label>
                  <input
                    type="date"
                    value={formData.dispatch_date}
                    onChange={(e) => setFormData({ ...formData, dispatch_date: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">
                    Loads Count <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.loads_count}
                    onChange={(e) => setFormData({ ...formData, loads_count: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-mono font-bold focus:outline-none focus:border-[#965E36]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">
                    Rate / Load (₹) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-xs font-bold text-[#965E36] pointer-events-none">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.rate_per_load}
                      onChange={(e) => setFormData({ ...formData, rate_per_load: e.target.value })}
                      placeholder="1800.00"
                      className="w-full pl-6 pr-2 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-mono font-bold focus:outline-none focus:border-[#965E36]"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* LIVE ADVANCE DEDUCTION CALCULATION BOX */}
              <div className="p-3 rounded-xl bg-[#FAF0E6] border border-[#E8D6C5] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#7A6759]">Customer Current Advance:</span>
                  <span className="font-mono font-bold text-[#2E1C11]">{formatCurrency(custAdvBalance)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#7A6759]">Total Dispatch Amount:</span>
                  <span className="font-mono font-bold text-[#2E1C11]">{formatCurrency(calcTotalSale)}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#E2CEBC]">
                  <span className="font-semibold text-emerald-800">Deducted from Advance:</span>
                  <span className="font-mono font-extrabold text-emerald-800">{formatCurrency(calcDeduction)}</span>
                </div>

                {calcRemainingDue > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-800">Remaining Balance Due:</span>
                    <span className="font-mono font-extrabold text-amber-800">{formatCurrency(calcRemainingDue)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-[#E2CEBC] text-[11px]">
                  <span className="text-[#6E594A]">Remaining Customer Advance:</span>
                  <span className="font-mono font-bold text-[#965E36]">{formatCurrency(calcNewAdvBalance)}</span>
                </div>
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
                  {submitting ? 'Dispatching...' : 'Log & Deduct Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
