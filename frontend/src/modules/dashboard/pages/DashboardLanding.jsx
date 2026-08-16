import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
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
  Scale,
  Sparkles,
  BarChart3,
  PieChart,
  ArrowUpRight,
  Factory
} from 'lucide-react';
import { getDashboardAnalytics, getExpenses, createExpense, deleteExpense } from '../../../shared/services/dashboardApi';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';

const EXPENSE_CATEGORIES = ['Driver Salary', 'Employee Salary', 'Diesel Expense', 'Miscellaneous', 'Utility & Maintenance'];
const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'UPI', 'Cheque'];

// Generate dynamic year list around current year (e.g. 2015 to 2035)
const CURRENT_YEAR = new Date().getFullYear();
const DYNAMIC_YEARS_LIST = ['ALL'];
for (let y = CURRENT_YEAR + 5; y >= CURRENT_YEAR - 10; y--) {
  DYNAMIC_YEARS_LIST.push(String(y));
}
DYNAMIC_YEARS_LIST.push('CUSTOM');

const MONTHS_LIST = [
  { value: 'ALL', label: 'All Months' },
  { value: '1', label: '01 - January' },
  { value: '2', label: '02 - February' },
  { value: '3', label: '03 - March' },
  { value: '4', label: '04 - April' },
  { value: '5', label: '05 - May' },
  { value: '6', label: '06 - June' },
  { value: '7', label: '07 - July' },
  { value: '8', label: '08 - August' },
  { value: '9', label: '09 - September' },
  { value: '10', label: '10 - October' },
  { value: '11', label: '11 - November' },
  { value: '12', label: '12 - December' }
];

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

  // Time & Category Filters
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));
  const [isCustomYearMode, setIsCustomYearMode] = useState(false);
  const [customYearInput, setCustomYearInput] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [localSearch, setLocalSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal Form State
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
      if (selectedYear !== 'ALL') params.year = selectedYear;
      if (selectedMonth !== 'ALL') params.month = selectedMonth;

      const expParams = {};
      const querySearch = localSearch || globalSearch;
      if (querySearch) expParams.search = querySearch;
      if (categoryFilter !== 'ALL') expParams.category = categoryFilter;
      if (selectedYear !== 'ALL') expParams.year = selectedYear;
      if (selectedMonth !== 'ALL') expParams.month = selectedMonth;

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
  }, [globalSearch, selectedYear, selectedMonth, localSearch, categoryFilter]);

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
  const hasTimeFilter = selectedYear !== 'ALL' || selectedMonth !== 'ALL';
  const hasTableFilter = localSearch !== '' || categoryFilter !== 'ALL';

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-130px)] overflow-y-auto pr-1">
      {/* Coir Manufacturing Header & Time Filter Bar */}
      <div className="card-panel p-4 rounded-2xl bg-white border border-[#D6C4B0] shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-[#965E36] text-white shadow-xs shrink-0">
            <Factory className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#965E36] bg-[#FAF0E6] px-2 py-0.5 rounded-md border border-[#E8D6C5]">
                COIR & PEAT MANUFACTURING
              </span>
              {hasTimeFilter && (
                <span className="text-[10px] font-mono font-bold text-[#6E594A]">
                  ({selectedYear !== 'ALL' ? selectedYear : ''} {selectedMonth !== 'ALL' ? MONTHS_LIST.find(m => m.value === selectedMonth)?.label.split('-')[1] : ''})
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-[#2E1C11] tracking-tight">
              Executive Profitability & Operational Analytics
            </h2>
          </div>
        </div>

        {/* TIME FILTERS & EXPENSE ACTION */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Selector */}
          <div className="flex items-center space-x-1 bg-white px-2.5 py-1.5 rounded-xl border border-[#D6C4B0] text-xs text-[#2E1C11]">
            <Calendar className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <span className="text-[11px] font-bold text-[#6E594A]">Year:</span>
            {isCustomYearMode ? (
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min="2000"
                  max="2099"
                  placeholder="YYYY"
                  value={customYearInput}
                  onChange={(e) => {
                    setCustomYearInput(e.target.value);
                    if (e.target.value.length === 4) {
                      setSelectedYear(e.target.value);
                    }
                  }}
                  className="w-14 px-1 py-0.5 rounded bg-[#FAF0E6] border border-[#965E36] font-extrabold text-xs text-[#2E1C11] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => { setIsCustomYearMode(false); setSelectedYear(String(CURRENT_YEAR)); }}
                  className="text-[10px] text-[#965E36] font-bold hover:underline cursor-pointer"
                  title="Switch to Dropdown List"
                >
                  List
                </button>
              </div>
            ) : (
              <select
                value={selectedYear}
                onChange={(e) => {
                  if (e.target.value === 'CUSTOM') {
                    setIsCustomYearMode(true);
                    setCustomYearInput(selectedYear !== 'ALL' ? selectedYear : String(CURRENT_YEAR));
                  } else {
                    setSelectedYear(e.target.value);
                  }
                }}
                className="bg-transparent focus:outline-none font-extrabold cursor-pointer text-xs"
              >
                {DYNAMIC_YEARS_LIST.map(y => (
                  <option key={y} value={y}>{y === 'ALL' ? 'All Years' : y === 'CUSTOM' ? '✏️ Enter Custom Year...' : y}</option>
                ))}
              </select>
            )}
          </div>

          {/* Month Selector */}
          <div className="flex items-center space-x-1 bg-white px-2.5 py-1.5 rounded-xl border border-[#D6C4B0] text-xs text-[#2E1C11]">
            <Filter className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <span className="text-[11px] font-bold text-[#6E594A]">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent focus:outline-none font-bold cursor-pointer text-xs"
            >
              {MONTHS_LIST.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {hasTimeFilter && (
            <button
              onClick={() => { setSelectedYear('ALL'); setSelectedMonth('ALL'); setIsCustomYearMode(false); }}
              className="p-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
              title="Reset Time Filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            onClick={handleOpenModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-extrabold shadow-sm transition-all duration-150 cursor-pointer ml-1"
          >
            <Plus className="h-4 w-4" />
            <span>+ Record Expense</span>
          </button>
        </div>
      </div>

      {/* Financial Verdict Banner */}
      <div className={`card-panel p-4 rounded-2xl border transition-all duration-200 ${
        isProfit ? 'bg-emerald-50/70 border-emerald-300' : 'bg-rose-50/70 border-rose-300'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                isProfit ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                {financials.verdictStatus === 'PROFIT' ? 'NET FINANCIAL SURPLUS' : 'NET OPERATIONAL DEFICIT'}
              </span>
              <span className="text-xs text-[#7A6759] font-medium">Reconciled Net Profit Engine</span>
            </div>
            <div className="flex items-baseline space-x-3">
              <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                isProfit ? 'text-emerald-950' : 'text-rose-950'
              }`}>
                {isProfit ? `+${formatCurrency(financials.netProfit)}` : formatCurrency(financials.netProfit)}
              </span>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-md border ${
                isProfit ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-rose-100 text-rose-900 border-rose-300'
              }`}>
                {isProfit ? `+${financials.profitMargin}% Profit Margin` : `${financials.profitMargin}% Margin Deficit`}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono bg-white/80 p-2.5 rounded-xl border border-[#D6C4B0] w-full sm:w-auto justify-between sm:justify-start">
            <div>
              <span className="text-[10px] text-[#7A6759] block uppercase font-sans font-bold">Gross Income</span>
              <span className="font-extrabold text-emerald-800">{formatCurrency(financials.totalGrossRevenue)}</span>
            </div>
            <div className="h-6 w-px bg-[#E8DCD0]"></div>
            <div>
              <span className="text-[10px] text-[#7A6759] block uppercase font-sans font-bold">Cost Outflows</span>
              <span className="font-extrabold text-rose-800">{formatCurrency(financials.totalExpenses)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {/* Card 1: Gross Revenue */}
        <div className="card-panel px-3.5 py-3 rounded-xl space-y-1 bg-white border border-[#E8DCD0] hover:border-[#965E36] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">GROSS REVENUE</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-black font-mono text-emerald-800">
            {formatCurrency(financials.totalGrossRevenue)}
          </div>
          <div className="text-[10px] text-[#7A6759]">Total sales revenue</div>
        </div>

        {/* Card 2: Coir Products Sales */}
        <div className="card-panel px-3.5 py-3 rounded-xl space-y-1 bg-white border border-[#E8DCD0] hover:border-[#965E36] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">COIR FIBRE & YARN</span>
            <div className="p-1 rounded-md bg-[#FAF0E6] text-[#965E36]">
              <Package className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-black font-mono text-[#2E1C11]">
            {formatCurrency(financials.productSalesRevenue)}
          </div>
          <div className="text-[10px] text-[#7A6759]">Bundles & Bales revenue</div>
        </div>

        {/* Card 3: Coir Dust Sales */}
        <div className="card-panel px-3.5 py-3 rounded-xl space-y-1 bg-white border border-[#E8DCD0] hover:border-[#965E36] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">COIR PEAT (DUST)</span>
            <div className="p-1 rounded-md bg-amber-50 text-amber-800">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-black font-mono text-amber-900">
            {formatCurrency(financials.dustSalesRevenue)}
          </div>
          <div className="text-[10px] text-[#7A6759]">Truck load dispatches</div>
        </div>

        {/* Card 4: Raw Material Husks */}
        <div className="card-panel px-3.5 py-3 rounded-xl space-y-1 bg-white border border-[#E8DCD0] hover:border-[#965E36] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">RAW HUSK PROCUREMENT</span>
            <div className="p-1 rounded-md bg-blue-50 text-blue-700">
              <Truck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-black font-mono text-blue-900">
            {formatCurrency(financials.rawMaterialCost)}
          </div>
          <div className="text-[10px] text-[#7A6759]">Green/Brown husk cost</div>
        </div>

        {/* Card 5: Operational Costs */}
        <div className="card-panel px-3.5 py-3 rounded-xl space-y-1 bg-white border border-[#E8DCD0] hover:border-[#965E36] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">DIESEL & PAYROLL</span>
            <div className="p-1 rounded-md bg-rose-50 text-rose-700">
              <Fuel className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-black font-mono text-rose-800">
            {formatCurrency(financials.dieselExpense + financials.employeeSalary + financials.driverSalary + financials.miscExpense)}
          </div>
          <div className="text-[10px] text-[#7A6759]">Fuel + Wages + Misc</div>
        </div>
      </div>

      {/* Visual Analytics Breakdowns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cost Outflows & Expense Category Distribution */}
        <div className="card-panel p-4 rounded-2xl bg-white border border-[#E8DCD0] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#F4EDE4]">
            <h3 className="text-xs font-extrabold text-[#2E1C11] flex items-center space-x-2">
              <Fuel className="h-4 w-4 text-[#965E36]" />
              <span>Cost Outflows & Expense Distribution</span>
            </h3>
            <span className="text-xs font-mono font-bold text-rose-800">{formatCurrency(financials.totalExpenses)}</span>
          </div>

          <div className="space-y-3">
            {expenseBreakdown.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#2E1C11]">{item.category}</span>
                  <div className="font-mono space-x-2">
                    <span className="text-[#7A6759] text-[11px] font-medium">{item.percentage.toFixed(1)}%</span>
                    <span className="font-extrabold text-[#2E1C11]">{formatCurrency(item.amount)}</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-[#F5ECE3] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#965E36] rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Streams Breakdown */}
        <div className="card-panel p-4 rounded-2xl bg-white border border-[#E8DCD0] space-y-3 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#F4EDE4]">
            <h3 className="text-xs font-extrabold text-[#2E1C11] flex items-center space-x-2">
              <IndianRupee className="h-4 w-4 text-emerald-700" />
              <span>Manufacturing Revenue Stream Distribution</span>
            </h3>
            <span className="text-xs font-mono font-bold text-emerald-800">{formatCurrency(financials.totalGrossRevenue)}</span>
          </div>

          <div className="space-y-4 pt-1">
            {revenueBreakdown.map((item) => (
              <div key={item.stream} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#2E1C11]">{item.stream}</span>
                  <div className="font-mono space-x-2">
                    <span className="text-[#7A6759] text-[11px] font-medium">{item.percentage.toFixed(1)}%</span>
                    <span className="font-extrabold text-emerald-800">{formatCurrency(item.amount)}</span>
                  </div>
                </div>
                <div className="w-full h-3 bg-[#F5ECE3] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
                  ></div>
                </div>
              </div>
            ))}

            <div className="p-3 rounded-xl bg-[#FAF0E6] border border-[#E8D6C5] space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[#7A6759]">
                <span className="font-medium">Coir Yarn & Fibre Products Revenue:</span>
                <span className="font-mono font-bold text-[#2E1C11]">{formatCurrency(financials.productSalesRevenue)}</span>
              </div>
              <div className="flex items-center justify-between text-[#7A6759]">
                <span className="font-medium">Coir Pith / Dust Dispatches Revenue:</span>
                <span className="font-mono font-bold text-[#2E1C11]">{formatCurrency(financials.dustSalesRevenue)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Expenses Directory Table */}
      <div className="space-y-3 pt-1">
        <div className="card-panel p-3 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2 flex-1 min-w-[200px] max-w-xs">
            <Search className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <input
              type="text"
              placeholder="Search expenses by vendor, remarks..."
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
                className="text-xs text-[#2E1C11] bg-transparent focus:outline-none cursor-pointer font-medium"
              >
                <option value="ALL">All Categories</option>
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {hasTableFilter && (
              <button
                onClick={() => { setLocalSearch(''); setCategoryFilter('ALL'); }}
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
              <p>No expense records logged for the selected time filter. Click "+ Record Expense" to log fuel, wages, or factory costs.</p>
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
                      <td className="p-3 text-[#6E594A] font-medium">{formatDate(exp.expense_date)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#FAF0E6] text-[#8C532E] border border-[#E8D6C5]">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-[#2E1C11]">{exp.beneficiary_name || '-'}</td>
                      <td className="p-3 font-medium text-[#6E594A]">{exp.payment_mode}</td>
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
                  placeholder="e.g. Bulk diesel refill for 10-wheeler fleet"
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
