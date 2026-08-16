import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  DollarSign,
  Plus,
  Search,
  Filter,
  RotateCcw,
  Calendar,
  Layers,
  Truck,
  Users,
  Wrench,
  Fuel,
  Package,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  Scale
} from 'lucide-react';
import { getDashboardAnalytics, getExpenses, createExpense, deleteExpense } from '../../../shared/services/dashboardApi';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';

const EXPENSE_CATEGORIES = ['Driver Salary', 'Employee Salary', 'Diesel Expense', 'Miscellaneous', 'Utility & Maintenance'];
const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'UPI', 'Cheque'];

export default function DashboardLanding({ search: globalSearch }) {
  const [analytics, setAnalytics] = useState({
    financials: {
      totalGrossRevenue: 0,
      productSalesRevenue: 0,
      dustSalesRevenue: 0,
      totalExpenses: 0,
      rawMaterialCost: 0,
      dieselExpense: 0,
      driverSalary: 0,
      employeeSalary: 0,
      miscExpense: 0,
      netProfit: 0,
      profitMargin: 0,
      verdictStatus: 'PROFIT'
    },
    expenseBreakdown: [],
    revenueBreakdown: []
  });

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [localSearch, setLocalSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Diesel Expense',
    amount: '',
    payment_mode: 'Cash',
    beneficiary_name: '',
    notes: '',
    expense_date: new Date().toISOString().split('T')[0]
  });

  const [modalError, setModalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const expParams = {};
      const querySearch = localSearch || globalSearch;
      if (querySearch) expParams.search = querySearch;
      if (categoryFilter !== 'ALL') expParams.category = categoryFilter;

      const [dataRes, expRes] = await Promise.all([
        getDashboardAnalytics(params),
        getExpenses(expParams)
      ]);

      setAnalytics(dataRes);
      setExpenses(expRes.items || []);
    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [globalSearch, localSearch, categoryFilter, dateFrom, dateTo]);

  const handleOpenModal = () => {
    setFormData({
      category: 'Diesel Expense',
      amount: '',
      payment_mode: 'Cash',
      beneficiary_name: '',
      notes: '',
      expense_date: new Date().toISOString().split('T')[0]
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    const amtNum = parseFloat(formData.amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setModalError('Expense amount must be a positive number.');
      return;
    }

    const payload = {
      category: formData.category,
      amount: amtNum,
      payment_mode: formData.payment_mode,
      beneficiary_name: formData.beneficiary_name ? formData.beneficiary_name.trim() : null,
      notes: formData.notes ? formData.notes.trim() : null,
      expense_date: formData.expense_date
    };

    try {
      setSubmitting(true);
      await createExpense(payload);
      handleCloseModal();
      fetchDashboardData();
    } catch (err) {
      console.error('Error recording expense:', err);
      setModalError(err.response?.data?.error || 'Failed to record operational expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm(`Are you sure you want to delete expense record ${id}?`)) return;
    try {
      await deleteExpense(id);
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting expense record: ' + err.message);
    }
  };

  const { financials, expenseBreakdown, revenueBreakdown } = analytics;
  const isProfit = financials.netProfit >= 0;
  const hasActiveFilters = localSearch !== '' || categoryFilter !== 'ALL' || dateFrom !== '' || dateTo !== '';

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-130px)] overflow-y-auto pr-1">
      {/* Top Financial Verdict Banner */}
      <div className="card-panel p-4 sm:p-5 rounded-2xl bg-white border border-[#D6C4B0] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#965E36]">EXECUTIVE FINANCIAL VERDICT</span>
          <h2 className="text-xl sm:text-2xl font-black text-[#2E1C11] tracking-tight">
            Coir Factory Net Profitability Engine
          </h2>
          <p className="text-xs text-[#7A6759]">
            Real-time reconciliation of Finished Products & Dust Pith Revenue vs Raw Husks & Operating Costs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* NET PROFIT VERDICT BADGE */}
          <div className={`p-3 sm:p-4 rounded-xl border flex items-center space-x-3 w-full md:w-auto min-w-[240px] ${
            isProfit ? 'bg-emerald-50 text-emerald-950 border-emerald-300' : 'bg-rose-50 text-rose-950 border-rose-300'
          }`}>
            <div className={`p-2.5 rounded-lg ${isProfit ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
              {isProfit ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">NET PROFIT / MARGIN</span>
              <div className={`text-base sm:text-lg font-black font-mono ${isProfit ? 'text-emerald-900' : 'text-rose-900'}`}>
                {isProfit ? `+${formatCurrency(financials.netProfit)}` : formatCurrency(financials.netProfit)}
              </div>
              <div className={`text-xs font-extrabold ${isProfit ? 'text-emerald-800' : 'text-rose-800'}`}>
                {isProfit ? `+${financials.profitMargin}% Margin` : `${financials.profitMargin}% Margin Deficit`}
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenModal}
            className="flex items-center justify-center space-x-1.5 px-4 py-3 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-extrabold shadow-sm transition-all duration-150 cursor-pointer w-full md:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>+ Record Operational Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="card-panel px-3.5 py-3 rounded-xl space-y-1 bg-white border border-[#E8DCD0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL GROSS REVENUE</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg font-black font-mono text-emerald-800">
            {formatCurrency(financials.totalGrossRevenue)}
          </div>
          <div className="text-[11px] text-[#7A6759] pt-0.5">
            Products: {formatCurrency(financials.productSalesRevenue)} • Dust: {formatCurrency(financials.dustSalesRevenue)}
          </div>
        </div>

        <div className="card-panel px-3.5 py-3 rounded-xl space-y-1 bg-white border border-[#E8DCD0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL OPERATIONAL EXPENSES</span>
            <div className="p-1 rounded-md bg-rose-50 text-rose-700">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg font-black font-mono text-rose-800">
            {formatCurrency(financials.totalExpenses)}
          </div>
          <div className="text-[11px] text-[#7A6759] pt-0.5">
            Husks + Diesel + Payroll + Wages + Utilities
          </div>
        </div>

        <div className="card-panel px-3.5 py-3 rounded-xl space-y-1 bg-white border border-[#E8DCD0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">RAW MATERIAL HUSKS COST</span>
            <div className="p-1 rounded-md bg-[#FAF0E6] text-[#965E36]">
              <Package className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg font-black font-mono text-[#2E1C11]">
            {formatCurrency(financials.rawMaterialCost)}
          </div>
          <div className="text-[11px] text-[#7A6759] pt-0.5">
            Green & Brown husk procurement
          </div>
        </div>

        <div className="card-panel px-3.5 py-3 rounded-xl space-y-1 bg-white border border-[#E8DCD0]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">DIESEL & LABOR PAYROLL</span>
            <div className="p-1 rounded-md bg-blue-50 text-blue-700">
              <Fuel className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-lg font-black font-mono text-blue-900">
            {formatCurrency(financials.dieselExpense + financials.employeeSalary + financials.driverSalary)}
          </div>
          <div className="text-[11px] text-[#7A6759] pt-0.5">
            Fuel: {formatCurrency(financials.dieselExpense)} • Payroll: {formatCurrency(financials.employeeSalary)}
          </div>
        </div>
      </div>

      {/* Visual Analytics Breakdowns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cost Outflows Distribution */}
        <div className="card-panel p-4 rounded-2xl bg-white border border-[#E8DCD0] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#F4EDE4]">
            <h3 className="text-xs font-extrabold text-[#2E1C11] flex items-center space-x-2">
              <Fuel className="h-4 w-4 text-[#965E36]" />
              <span>Operational Expense Distribution</span>
            </h3>
            <span className="text-xs font-mono font-bold text-rose-800">{formatCurrency(financials.totalExpenses)}</span>
          </div>

          <div className="space-y-2.5">
            {expenseBreakdown.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#2E1C11]">{item.category}</span>
                  <div className="font-mono space-x-2">
                    <span className="text-[#7A6759] text-[11px]">{item.percentage.toFixed(1)}%</span>
                    <span className="font-bold text-[#2E1C11]">{formatCurrency(item.amount)}</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-[#F5ECE3] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#965E36] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Streams Distribution */}
        <div className="card-panel p-4 rounded-2xl bg-white border border-[#E8DCD0] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#F4EDE4]">
            <h3 className="text-xs font-extrabold text-[#2E1C11] flex items-center space-x-2">
              <IndianRupee className="h-4 w-4 text-emerald-700" />
              <span>Revenue Streams Breakdown</span>
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-800">{formatCurrency(financials.totalGrossRevenue)}</span>
          </div>

          <div className="space-y-3.5 pt-1">
            {revenueBreakdown.map((item) => (
              <div key={item.stream} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#2E1C11]">{item.stream}</span>
                  <div className="font-mono space-x-2">
                    <span className="text-[#7A6759] text-[11px]">{item.percentage.toFixed(1)}%</span>
                    <span className="font-extrabold text-emerald-800">{formatCurrency(item.amount)}</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-[#F5ECE3] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                  ></div>
                </div>
              </div>
            ))}

            <div className="p-3 rounded-xl bg-[#FAF0E6] border border-[#E8D6C5] space-y-1 text-xs">
              <div className="flex items-center justify-between text-[#7A6759]">
                <span>Total Finished Products Sold:</span>
                <span className="font-mono font-bold text-[#2E1C11]">{formatCurrency(financials.productSalesRevenue)}</span>
              </div>
              <div className="flex items-center justify-between text-[#7A6759]">
                <span>Total Coir Pith Dust Dispatched:</span>
                <span className="font-mono font-bold text-[#2E1C11]">{formatCurrency(financials.dustSalesRevenue)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Expenses Directory Table */}
      <div className="space-y-3 pt-2">
        <div className="card-panel p-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 flex-1 min-w-[200px] max-w-xs">
            <Search className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <input
              type="text"
              placeholder="Search expenses by beneficiary, notes..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full px-2.5 py-1 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] focus:outline-none focus:border-[#965E36]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
              <Filter className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs text-[#2E1C11] bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Categories</option>
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => { setLocalSearch(''); setCategoryFilter('ALL'); setDateFrom(''); setDateTo(''); }}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="card-panel rounded-2xl overflow-hidden border border-[#E8DCD0]">
          {expenses.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#7A6759] space-y-2">
              <FileText className="h-8 w-8 text-[#D4C3B3] mx-auto" />
              <p>No operational expense records logged yet. Click "+ Record Operational Expense" to add diesel, wages, or labor payments.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5ECE3] border-b border-[#E8DCD0] text-[#6E594A] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">EXPENSE ID</th>
                    <th className="p-3">DATE</th>
                    <th className="p-3">CATEGORY</th>
                    <th className="p-3">BENEFICIARY / VENDOR</th>
                    <th className="p-3">PAYMENT MODE</th>
                    <th className="p-3">AMOUNT (₹)</th>
                    <th className="p-3">REMARKS</th>
                    <th className="p-3 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4EDE4] bg-white">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                      <td className="p-3 font-mono font-bold text-[#2E1C11]">{exp.id}</td>
                      <td className="p-3 text-[#6E594A]">{formatDate(exp.expense_date)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FAF0E6] text-[#8C532E] border border-[#E8D6C5]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-[#2E1C11]">{exp.beneficiary_name || '-'}</td>
                      <td className="p-3 font-semibold text-[#6E594A]">{exp.payment_mode}</td>
                      <td className="p-3 font-mono font-extrabold text-rose-800 text-sm">
                        {formatCurrency(exp.amount)}
                      </td>
                      <td className="p-3 text-[#6E594A] truncate max-w-xs">{exp.notes || '-'}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1 rounded-lg text-[#A8988B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Expense"
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

      {/* Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C120C]/60 backdrop-blur-xs">
          <div className="card-panel w-full max-w-md p-5 rounded-2xl bg-white shadow-2xl space-y-4 border border-[#D6C4B0] animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#F4EDE4]">
              <h3 className="text-sm font-extrabold text-[#2E1C11] flex items-center space-x-2">
                <Fuel className="h-4 w-4 text-[#965E36]" />
                <span>Record Operational Expense</span>
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
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11]">
                  Expense Category <span className="text-rose-600">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36] cursor-pointer"
                >
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">
                    Amount (₹) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-[#965E36] pointer-events-none">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="e.g. 18500.00"
                      className="w-full pl-8 pr-2 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-mono font-bold focus:outline-none focus:border-[#965E36]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#2E1C11]">Payment Mode</label>
                  <select
                    value={formData.payment_mode}
                    onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36] cursor-pointer"
                  >
                    {PAYMENT_MODES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11]">Beneficiary / Vendor Name</label>
                <input
                  type="text"
                  value={formData.beneficiary_name}
                  onChange={(e) => setFormData({ ...formData, beneficiary_name: e.target.value })}
                  placeholder="e.g. Rajan Driver / HP Bunk"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11]">Expense Date</label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11]">Remarks / Notes</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Fuel refill for 10-Wheeler truck"
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
                  {submitting ? 'Recording...' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
