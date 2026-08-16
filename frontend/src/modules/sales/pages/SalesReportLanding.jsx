import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  RotateCcw,
  Download,
  Printer,
  Calendar,
  IndianRupee,
  Scale,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../../../shared/services/api';
import { getSalesReportSummary } from '../../../shared/services/salesApi';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';

export default function SalesReportLanding({ search: globalSearch }) {
  const [reportData, setReportData] = useState({
    dispatches: [],
    customerSummary: [],
    productSummary: [],
    summary: {
      totalDispatches: 0,
      totalUnits: 0,
      totalActualWeight: 0,
      totalApproxWeight: 0,
      netWeightDifference: 0,
      totalSalesRevenue: 0,
      paidRevenue: 0,
      pendingRevenue: 0
    }
  });

  const [loading, setLoading] = useState(true);

  // Filters
  const [localSearch, setLocalSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [productIdFilter, setProductIdFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [productsList, setProductsList] = useState([]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {};
      const querySearch = localSearch || globalSearch;
      if (querySearch) params.search = querySearch;
      if (paymentFilter !== 'ALL') params.payment_status = paymentFilter;
      if (productIdFilter !== 'ALL') params.product_id = productIdFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const data = await getSalesReportSummary(params);
      setReportData(data);
    } catch (err) {
      console.error('Error fetching sales report summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProductsList(res.data.products || []);
    } catch (err) {
      console.error('Error fetching products list:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [globalSearch, localSearch, paymentFilter, productIdFilter, dateFrom, dateTo]);

  const handleExportCSV = () => {
    if (reportData.dispatches.length === 0) return;

    const headers = [
      'Dispatch ID',
      'Order Date',
      'Customer Name',
      'Customer Phone',
      'Vehicle Number',
      'Product Name',
      'Quantity Units',
      'Std Approx Weight (kg)',
      'Actual Scale Weight (kg)',
      'Weight Difference (kg)',
      'Rate per Kg (₹)',
      'Total Billing (₹)',
      'Payment Status'
    ];

    const rows = reportData.dispatches.map(d => [
      `"${d.id}"`,
      `"${d.order_date}"`,
      `"${d.customer_name}"`,
      `"${d.customer_phone || ''}"`,
      `"${d.vehicle_number}"`,
      `"${d.product_name || ''}"`,
      d.quantity_units,
      d.total_approx_weight,
      d.actual_scale_weight,
      d.weight_difference,
      d.rate_per_kg,
      d.total_sales_amount,
      `"${d.payment_status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_StockOut_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const { summary, customerSummary, productSummary } = reportData;
  const hasActiveFilters = localSearch !== '' || paymentFilter !== 'ALL' || productIdFilter !== 'ALL' || dateFrom !== '' || dateTo !== '';

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-130px)]">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 shrink-0">
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL REVENUE</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-emerald-800">
            {formatCurrency(summary.totalSalesRevenue)}
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">MOISTURE WEIGHT VARIANCE</span>
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
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">PAID VS PENDING REVENUE</span>
            <div className="p-1 rounded-md bg-[#FAF0E6] text-[#965E36]">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-xs font-mono font-bold text-[#2E1C11] flex items-center justify-between pt-0.5">
            <span className="text-emerald-800">Paid: {formatCurrency(summary.paidRevenue)}</span>
            <span className="text-rose-800">Due: {formatCurrency(summary.pendingRevenue)}</span>
          </div>
        </div>
      </div>

      {/* Control Action Bar */}
      <div className="card-panel p-3 sm:p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#A8988B]" />
            <input
              type="text"
              placeholder="Search customer, product..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#965E36] font-medium transition-colors"
            />
          </div>

          {/* Product Filter */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
            <Package className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <select
              value={productIdFilter}
              onChange={(e) => setProductIdFilter(e.target.value)}
              className="text-xs text-[#2E1C11] bg-transparent focus:outline-none font-medium cursor-pointer"
            >
              <option value="ALL">All Products</option>
              {productsList.map(p => (
                <option key={p.id} value={p.id}>{p.product_name}</option>
              ))}
            </select>
          </div>

          {/* Payment Filter */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
            <Filter className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="text-xs text-[#2E1C11] bg-transparent focus:outline-none font-medium cursor-pointer"
            >
              <option value="ALL">All Payment Statuses</option>
              <option value="Paid">Paid Only</option>
              <option value="Pending">Pending Only</option>
              <option value="Partial">Partial Only</option>
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
            />
            <span className="text-[#A8988B]">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer font-medium text-[11px]"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => { setLocalSearch(''); setPaymentFilter('ALL'); setProductIdFilter('ALL'); setDateFrom(''); setDateTo(''); }}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Actions: CSV Export / Print */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] hover:bg-[#FAF0E6] text-[#2E1C11] text-xs font-extrabold shadow-2xs transition-all duration-150 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#965E36]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-extrabold shadow-sm transition-all duration-150 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Split Tables */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer Breakdown Table */}
        <div className="card-panel rounded-2xl overflow-hidden flex flex-col min-h-0 border border-[#E8DCD0]">
          <div className="p-3.5 bg-[#F5ECE3] border-b border-[#E8DCD0] flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-[#2E1C11] flex items-center space-x-1.5">
              <Users className="h-4 w-4 text-[#965E36]" />
              <span>Customer Sales & Dues Summary</span>
            </h3>
            <span className="text-[11px] font-bold font-mono text-[#7A6759]">{customerSummary.length} customers</span>
          </div>

          <div className="overflow-auto flex-1 h-full w-full">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#FAF7F2] border-b border-[#E8DCD0]">
                <tr className="text-[#6E594A] font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-2.5">CUSTOMER</th>
                  <th className="p-2.5">TRIPS</th>
                  <th className="p-2.5">SCALE WT (KG)</th>
                  <th className="p-2.5">WT DIFF (KG)</th>
                  <th className="p-2.5">TOTAL BILLING (₹)</th>
                  <th className="p-2.5 text-right">PENDING (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EDE4] bg-white">
                {customerSummary.map((c) => (
                  <tr key={c.customer_name} className="hover:bg-[#FAF7F2]/80 transition-colors">
                    <td className="p-2.5">
                      <div className="font-bold text-[#2E1C11] text-xs">{c.customer_name}</div>
                      {c.customer_phone && <div className="text-[10px] text-[#7A6759]">{c.customer_phone}</div>}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-[#965E36]">{c.dispatches_count}</td>
                    <td className="p-2.5 font-mono font-semibold text-[#2E1C11]">{c.total_actual_weight.toFixed(2)}</td>
                    <td className="p-2.5 font-mono font-bold whitespace-nowrap">
                      <span className={c.net_weight_difference >= 0 ? 'text-emerald-800' : 'text-amber-800'}>
                        {c.net_weight_difference >= 0 ? `+${c.net_weight_difference.toFixed(2)}` : c.net_weight_difference.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono font-extrabold text-emerald-800">{formatCurrency(c.total_revenue)}</td>
                    <td className="p-2.5 font-mono font-bold text-right text-rose-800">
                      {c.pending_revenue > 0 ? formatCurrency(c.pending_revenue) : '₹0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Volume Breakdown Table */}
        <div className="card-panel rounded-2xl overflow-hidden flex flex-col min-h-0 border border-[#E8DCD0]">
          <div className="p-3.5 bg-[#F5ECE3] border-b border-[#E8DCD0] flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-[#2E1C11] flex items-center space-x-1.5">
              <Package className="h-4 w-4 text-[#965E36]" />
              <span>Product Dispatch & Variance Summary</span>
            </h3>
            <span className="text-[11px] font-bold font-mono text-[#7A6759]">{productSummary.length} products</span>
          </div>

          <div className="overflow-auto flex-1 h-full w-full">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#FAF7F2] border-b border-[#E8DCD0]">
                <tr className="text-[#6E594A] font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-2.5">PRODUCT NAME</th>
                  <th className="p-2.5">UNITS DISPATCHED</th>
                  <th className="p-2.5">STD WT (KG)</th>
                  <th className="p-2.5">SCALE WT (KG)</th>
                  <th className="p-2.5">MOISTURE DIFF</th>
                  <th className="p-2.5 text-right">TOTAL REVENUE (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EDE4] bg-white">
                {productSummary.map((p) => (
                  <tr key={p.product_name} className="hover:bg-[#FAF7F2]/80 transition-colors">
                    <td className="p-2.5">
                      <div className="font-bold text-[#2E1C11] text-xs">{p.product_name}</div>
                      <div className="text-[10px] text-[#7A6759]">{p.category}</div>
                    </td>
                    <td className="p-2.5 font-mono font-bold text-[#965E36]">{p.total_units} {p.unit}s</td>
                    <td className="p-2.5 font-mono text-[#6E594A]">{p.total_approx_weight.toFixed(2)}</td>
                    <td className="p-2.5 font-mono font-bold text-[#2E1C11]">{p.total_actual_weight.toFixed(2)}</td>
                    <td className="p-2.5 font-mono font-bold whitespace-nowrap">
                      <span className={p.net_weight_difference >= 0 ? 'text-emerald-800' : 'text-amber-800'}>
                        {p.net_weight_difference >= 0 ? `+${p.net_weight_difference.toFixed(2)} kg` : `${p.net_weight_difference.toFixed(2)} kg`}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono font-extrabold text-right text-emerald-800">{formatCurrency(p.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
