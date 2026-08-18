import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Scale,
  Calendar,
  Layers,
  TrendingUp,
  TrendingDown,
  Building2,
  Package,
  X
} from 'lucide-react';
import api from '../../../shared/services/api';
import { getSalesDispatches, createSalesDispatch, updateSalesDispatch, deleteSalesDispatch } from '../../../shared/services/salesApi';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../../../shared/utils/formatters';

const VEHICLE_TYPES = ['Pickup', '6-Wheeler', '10-Wheeler', 'Tractor', 'Trailer'];
const PAYMENT_STATUSES = ['Pending', 'Partial', 'Paid'];

export default function SalesStockOutLanding({ search: globalSearch }) {
  const [dispatches, setDispatches] = useState([]);
  const [summary, setSummary] = useState({
    totalDispatches: 0,
    totalQuantityUnits: 0,
    totalActualWeight: 0,
    totalApproxWeight: 0,
    netWeightDifference: 0,
    totalSalesAmount: 0,
    pendingPaymentsCount: 0,
    pendingPaymentsAmount: 0
  });

  const [loading, setLoading] = useState(true);

  // Filters
  const [localSearch, setLocalSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Products for Form Dropdown
  const [productsList, setProductsList] = useState([]);

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDispatch, setEditingDispatch] = useState(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    order_date: new Date().toISOString().split('T')[0],
    warehouse: 'Main Factory Yard',
    vehicle_type: '10-Wheeler',
    vehicle_number: '',
    product_id: '',
    quantity_units: '100',
    actual_scale_weight: '',
    notes: '',
    payment_status: 'Pending'
  });

  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDispatches = async () => {
    try {
      setLoading(true);
      const params = {};
      const querySearch = localSearch || globalSearch;
      if (querySearch) params.search = querySearch;
      if (paymentFilter !== 'ALL') params.payment_status = paymentFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const data = await getSalesDispatches(params);
      setDispatches(data.dispatches || []);
      setSummary(data.summary || {
        totalDispatches: 0,
        totalQuantityUnits: 0,
        totalActualWeight: 0,
        totalApproxWeight: 0,
        netWeightDifference: 0,
        totalSalesAmount: 0,
        pendingPaymentsCount: 0,
        pendingPaymentsAmount: 0
      });
    } catch (err) {
      console.error('Error fetching sales dispatches:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      const activePrds = (res.data.products || []).filter(p => p.status === 'Active');
      setProductsList(activePrds);
      if (activePrds.length > 0 && !formData.product_id) {
        setFormData(prev => ({ ...prev, product_id: activePrds[0].id }));
      }
    } catch (err) {
      console.error('Error fetching active products:', err);
    }
  };

  useEffect(() => {
    fetchDispatches();
  }, [globalSearch, localSearch, paymentFilter, dateFrom, dateTo]);

  const handleOpenAddModal = () => {
    fetchProducts();
    setEditingDispatch(null);
    const defaultPrd = productsList[0];
    setFormData({
      customer_name: '',
      customer_phone: '',
      order_date: new Date().toISOString().split('T')[0],
      warehouse: 'Main Factory Yard',
      vehicle_type: '10-Wheeler',
      vehicle_number: '',
      product_id: defaultPrd ? defaultPrd.id : '',
      quantity_units: '100',
      actual_scale_weight: defaultPrd ? String((parseFloat(defaultPrd.approx_bundle_weight) || 0) * 100) : '',
      notes: '',
      payment_status: 'Pending'
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (d) => {
    fetchProducts();
    setEditingDispatch(d);
    setFormData({
      customer_name: d.customer_name || '',
      customer_phone: d.customer_phone || '',
      order_date: d.order_date ? d.order_date.split('T')[0] : new Date().toISOString().split('T')[0],
      warehouse: d.warehouse || 'Main Factory Yard',
      vehicle_type: d.vehicle_type || '10-Wheeler',
      vehicle_number: d.vehicle_number || '',
      product_id: d.product_id || '',
      quantity_units: String(d.quantity_units || 1),
      actual_scale_weight: String(d.actual_scale_weight || ''),
      notes: d.notes || '',
      payment_status: d.payment_status || 'Pending'
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDispatch(null);
  };

  // Selected Product Moisture Engine Calculations
  const selectedProduct = productsList.find(p => p.id === formData.product_id);
  const approxUnitWeight = selectedProduct ? (parseFloat(selectedProduct.approx_bundle_weight) || 0) : 0;
  const ratePerKg = selectedProduct ? (parseFloat(selectedProduct.sell_price_per_kg) || 0) : 0;

  const qtyNum = parseInt(formData.quantity_units, 10) || 0;
  const totalApproxWeight = qtyNum * approxUnitWeight;
  const actualScaleWeightNum = parseFloat(formData.actual_scale_weight) || 0;
  const weightDifference = actualScaleWeightNum - totalApproxWeight;
  const calculatedTotalSalesAmount = actualScaleWeightNum * ratePerKg;

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formData.customer_name.trim()) {
      setModalError('Customer name is required.');
      return;
    }
    if (!formData.vehicle_number.trim()) {
      setModalError('Vehicle registration number is required.');
      return;
    }
    if (!formData.product_id) {
      setModalError('Please select a valid product.');
      return;
    }
    if (qtyNum <= 0) {
      setModalError('Quantity units must be at least 1.');
      return;
    }
    if (actualScaleWeightNum <= 0) {
      setModalError('Actual scale weight (kg) must be a positive number.');
      return;
    }

    const payload = {
      customer_name: formData.customer_name.trim(),
      customer_phone: formData.customer_phone ? formData.customer_phone.trim() : null,
      order_date: formData.order_date,
      warehouse: formData.warehouse ? formData.warehouse.trim() : 'Main Factory Yard',
      vehicle_type: formData.vehicle_type,
      vehicle_number: formData.vehicle_number.trim().toUpperCase(),
      product_id: formData.product_id,
      quantity_units: qtyNum,
      actual_scale_weight: actualScaleWeightNum,
      notes: formData.notes ? formData.notes.trim() : null,
      payment_status: formData.payment_status
    };

    try {
      setSubmitting(true);
      if (editingDispatch) {
        await updateSalesDispatch(editingDispatch.id, payload);
      } else {
        await createSalesDispatch(payload);
      }
      handleCloseModal();
      fetchDispatches();
    } catch (err) {
      console.error('Error saving sales dispatch:', err);
      setModalError(err.response?.data?.error || 'Failed to save sales dispatch record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete sales dispatch record ${id}?`)) return;
    try {
      await deleteSalesDispatch(id);
      fetchDispatches();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting sales dispatch record: ' + err.message);
    }
  };

  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200';
      case 'Partial':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'Pending':
        return 'bg-rose-50 text-rose-900 border-rose-200';
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200';
    }
  };

  const hasActiveFilters = localSearch !== '' || paymentFilter !== 'ALL' || dateFrom !== '' || dateTo !== '';

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-130px)]">
      {/* KPI Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 shrink-0">
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL DISPATCHES</span>
            <div className="p-1 rounded-md bg-[#FAF0E6] text-[#965E36]">
              <Truck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-[#2E1C11]">
            {summary.totalDispatches} <span className="text-[11px] font-normal text-[#7A6759]">deliveries</span>
          </div>
        </div>

        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">SCALE WEIGHT DISPATCHED</span>
            <div className="p-1 rounded-md bg-blue-50 text-blue-700">
              <Scale className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-blue-800">
            {summary.totalActualWeight.toLocaleString('en-IN', { maximumFractionDigits: 2 })} <span className="text-[11px] font-normal text-[#7A6759]">kg</span>
          </div>
        </div>

        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL SALES REVENUE</span>
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">NET MOISTURE VARIANCE</span>
            <div className={`p-1 rounded-md ${summary.netWeightDifference >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {summary.netWeightDifference >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            </div>
          </div>
          <div className={`text-base font-extrabold font-mono ${summary.netWeightDifference >= 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
            {summary.netWeightDifference >= 0 ? `+${summary.netWeightDifference.toFixed(2)}` : summary.netWeightDifference.toFixed(2)} <span className="text-[11px] font-normal text-[#7A6759]">kg</span>
          </div>
        </div>

        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">PENDING PAYMENTS</span>
            <div className="p-1 rounded-md bg-rose-50 text-rose-700">
              <AlertCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-rose-800">
            {formatCurrency(summary.pendingPaymentsAmount)}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card-panel p-3 sm:p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#A8988B]" />
            <input
              type="text"
              placeholder="Search customer, vehicle, product..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#965E36] font-medium transition-colors"
            />
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
            <Filter className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="text-xs text-[#2E1C11] bg-transparent focus:outline-none font-medium cursor-pointer"
            >
              <option value="ALL">All Payment Statuses</option>
              {PAYMENT_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Date Range Pickers */}
          <div className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded-xl border border-[#D6C4B0] text-xs text-[#2E1C11]">
            <Calendar className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer font-medium text-[11px]"
              title="From Order Date"
            />
            <span className="text-[#A8988B]">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer font-medium text-[11px]"
              title="To Order Date"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => { setLocalSearch(''); setPaymentFilter('ALL'); setDateFrom(''); setDateTo(''); }}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-extrabold shadow-sm transition-all duration-150 cursor-pointer ml-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Sales Stock Out</span>
        </button>
      </div>

      {/* Main Table */}
      <div className="card-panel rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0 border border-[#E8DCD0]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-xs text-[#7A6759] space-y-2">
            <div className="w-5 h-5 border-2 border-[#965E36] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading sales outbound dispatches...</span>
          </div>
        ) : dispatches.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <Truck className="h-10 w-10 text-[#D4C3B3] mx-auto" />
            <h3 className="text-sm font-bold text-[#2E1C11]">No Sales Dispatches Found</h3>
            <p className="text-xs text-[#7A6759]">Click "+ New Sales Stock Out" to log outbound deliveries and scale weights.</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 h-full w-full">
            <table className="w-full text-left text-xs min-w-[950px]">
              <thead className="sticky top-0 z-10 bg-[#F5ECE3] border-b border-[#E8DCD0] shadow-2xs">
                <tr className="text-[#6E594A] font-bold uppercase tracking-wider">
                  <th className="p-3.5">DISPATCH ID</th>
                  <th className="p-3.5">ORDER DATE</th>
                  <th className="p-3.5">CUSTOMER NAME</th>
                  <th className="p-3.5">VEHICLE DETAILS</th>
                  <th className="p-3.5">PRODUCT NAME</th>
                  <th className="p-3.5">QTY (UNITS)</th>
                  <th className="p-3.5">STD. APPROX WT (KG)</th>
                  <th className="p-3.5">SCALE ACTUAL WT (KG)</th>
                  <th className="p-3.5">WT DIFF (MOISTURE)</th>
                  <th className="p-3.5">RATE (₹/KG)</th>
                  <th className="p-3.5">TOTAL BILLING (₹)</th>
                  <th className="p-3.5">PAYMENT</th>
                  <th className="p-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EDE4] bg-white">
                {dispatches.map((d) => {
                  const wtDiff = parseFloat(d.weight_difference) || 0;
                  const isGain = wtDiff > 0;
                  const isLoss = wtDiff < 0;

                  return (
                    <tr key={d.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#2E1C11] whitespace-nowrap">
                        {d.id}
                      </td>
                      <td className="p-3.5 text-[#6E594A] font-medium whitespace-nowrap text-[11px]">
                        {formatDate(d.order_date)}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-[#2E1C11] text-xs">{d.customer_name}</div>
                        {d.customer_phone && (
                          <div className="text-[11px] text-[#7A6759] font-mono">{d.customer_phone}</div>
                        )}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-[#2E1C11]">{d.vehicle_number}</div>
                        <div className="text-[10px] text-[#7A6759] font-medium">{d.vehicle_type}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-[#2E1C11] text-xs">{d.product_name || '-'}</div>
                        <div className="text-[10px] text-[#7A6759]">{d.product_category}</div>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-[#965E36] whitespace-nowrap">
                        {d.quantity_units} {d.product_unit || 'units'}
                      </td>
                      <td className="p-3.5 font-mono text-[#6E594A] whitespace-nowrap">
                        {parseFloat(d.total_approx_weight).toFixed(2)} kg
                      </td>
                      <td className="p-3.5 font-mono font-extrabold text-[#2E1C11] text-sm whitespace-nowrap">
                        {parseFloat(d.actual_scale_weight).toFixed(2)} kg
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-extrabold border flex items-center space-x-1 w-max ${
                          isGain ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : isLoss ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-stone-50 text-stone-700 border-stone-200'
                        }`}>
                          {isGain ? <TrendingUp className="h-3 w-3 text-emerald-700" /> : isLoss ? <TrendingDown className="h-3 w-3 text-amber-700" /> : null}
                          <span>{isGain ? `+${wtDiff.toFixed(2)} kg` : `${wtDiff.toFixed(2)} kg`}</span>
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[#6E594A] whitespace-nowrap">
                        ₹{parseFloat(d.rate_per_kg).toFixed(2)}
                      </td>
                      <td className="p-3.5 font-mono font-extrabold text-emerald-800 text-sm whitespace-nowrap">
                        {formatCurrency(d.total_sales_amount)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getPaymentStatusBadge(d.payment_status)}`}>
                          {d.payment_status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => handleOpenEditModal(d)}
                          className="p-1.5 rounded-lg text-[#6E594A] hover:text-[#965E36] hover:bg-[#FAF0E6] transition-colors cursor-pointer"
                          title="Edit Sales Dispatch"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
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
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C120C]/60 backdrop-blur-xs">
          <div className="card-panel w-full max-w-xl p-5 rounded-2xl bg-white shadow-2xl space-y-4 border border-[#D6C4B0] animate-fade-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F4EDE4]">
              <h3 className="text-sm font-extrabold text-[#2E1C11] flex items-center space-x-2">
                <Truck className="h-4 w-4 text-[#965E36]" />
                <span>{editingDispatch ? `Edit Sales Stock Out (${editingDispatch.id})` : 'New Sales Stock Out & Dispatch'}</span>
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
              {/* CUSTOMER NAME & PHONE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">
                    Customer Name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="e.g. Southern Geo-Fabrics Ltd"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">Customer Phone Number</label>
                  <input
                    type="text"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="e.g. +91 94433 22110"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                  />
                </div>
              </div>

              {/* ORDER DATE, WAREHOUSE, VEHICLE TYPE, VEHICLE NUMBER */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">Order Date</label>
                  <input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">Warehouse</label>
                  <input
                    type="text"
                    value={formData.warehouse}
                    onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                    placeholder="Main Yard"
                    className="w-full px-2 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">Vehicle Type</label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-2 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36] cursor-pointer"
                  >
                    {VEHICLE_TYPES.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">
                    Vehicle No <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                    placeholder="TN-38-BY-8821"
                    className="w-full px-2 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-mono font-bold focus:outline-none focus:border-[#965E36]"
                    required
                  />
                </div>
              </div>

              {/* SELECT PRODUCT */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11]">
                  Select Product <span className="text-rose-600">*</span>
                </label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36] cursor-pointer"
                  required
                >
                  <option value="">-- Choose Product Catalog Item --</option>
                  {productsList.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.product_name} ({p.category}) - {p.approx_bundle_weight}kg/{p.unit} @ ₹{p.sell_price_per_kg}/kg
                    </option>
                  ))}
                </select>
              </div>

              {/* QUANTITY & ACTUAL SCALE WEIGHT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">
                    Quantity ({selectedProduct ? selectedProduct.unit : 'Units'}) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.quantity_units}
                    onChange={(e) => setFormData({ ...formData, quantity_units: e.target.value })}
                    placeholder="e.g. 100"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-mono font-bold focus:outline-none focus:border-[#965E36]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">
                    Actual Scale Weight (kg) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={formData.actual_scale_weight}
                      onChange={(e) => setFormData({ ...formData, actual_scale_weight: e.target.value })}
                      placeholder="e.g. 3620.00"
                      className="w-full px-3 py-2 pr-8 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-mono font-bold focus:outline-none focus:border-[#965E36]"
                      required
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-[#7A6759] pointer-events-none">kg</span>
                  </div>
                </div>
              </div>

              {/* LIVE MOISTURE ENGINE WEIGHT VARIANCE & BILLING BOX */}
              <div className="p-3 rounded-xl bg-[#FAF0E6] border border-[#E8D6C5] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#7A6759]">
                  <span>Standard Approx Weight ({qtyNum} × {approxUnitWeight} kg):</span>
                  <span className="font-mono font-bold text-[#2E1C11]">{totalApproxWeight.toFixed(2)} kg</span>
                </div>

                <div className="flex items-center justify-between text-[#7A6759]">
                  <span>Actual Scale Measured Weight:</span>
                  <span className="font-mono font-bold text-[#2E1C11]">{actualScaleWeightNum.toFixed(2)} kg</span>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-[#E2CEBC]">
                  <span className="font-semibold text-[#2E1C11]">Weight Difference (Moisture Variance):</span>
                  <span className={`font-mono font-extrabold px-2 py-0.5 rounded-md border ${
                    weightDifference > 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : weightDifference < 0 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-stone-50 text-stone-700 border-stone-200'
                  }`}>
                    {weightDifference > 0 ? `+${weightDifference.toFixed(2)} kg (Moisture Gain)` : weightDifference < 0 ? `${weightDifference.toFixed(2)} kg (Weight Loss)` : '0.00 kg (Standard Match)'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#E2CEBC]">
                  <span className="font-bold text-[#2E1C11]">Total Billing Amount ({actualScaleWeightNum.toFixed(2)} kg × ₹{ratePerKg}/kg):</span>
                  <span className="font-mono font-extrabold text-emerald-800 text-sm">{formatCurrency(calculatedTotalSalesAmount)}</span>
                </div>
              </div>

              {/* PAYMENT STATUS & NOTES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">Payment Status</label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36] cursor-pointer"
                  >
                    {PAYMENT_STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">Dispatch Remarks / Notes</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Moisture scale gain of +120kg"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                  />
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
                  {submitting ? 'Logging...' : editingDispatch ? 'Update Dispatch' : 'Log Sales Stock Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
