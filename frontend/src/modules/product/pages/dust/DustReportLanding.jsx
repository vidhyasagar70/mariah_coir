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
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Clock,
  ExternalLink,
  Layers,
  ChevronRight
} from 'lucide-react';
import { getDustReportSummary, getDustCustomerLedger } from '../../../../shared/services/dustApi';
import { formatCurrency, formatDate } from '../../../../shared/utils/formatters';

export default function DustReportLanding({ search: globalSearch }) {
  const [report, setReport] = useState([]);
  const [summary, setSummary] = useState({
    totalAdvanceHeld: 0,
    totalPaymentDue: 0,
    totalDispatchedValue: 0,
    activeQueueCount: 0
  });

  const [loading, setLoading] = useState(true);

  // Filters
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Side Drawer / Ledger Modal State
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {};
      const querySearch = localSearch || globalSearch;
      if (querySearch) params.search = querySearch;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const data = await getDustReportSummary(params);
      setReport(data.report || []);
      setSummary(data.summary || {
        totalAdvanceHeld: 0,
        totalPaymentDue: 0,
        totalDispatchedValue: 0,
        activeQueueCount: 0
      });
    } catch (err) {
      console.error('Error fetching dust customer report summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [globalSearch, localSearch, statusFilter, dateFrom, dateTo]);

  const handleOpenLedger = async (customerId) => {
    setSelectedCustomerId(customerId);
    setLedgerData(null);
    setLoadingLedger(true);
    try {
      const data = await getDustCustomerLedger(customerId);
      setLedgerData(data);
    } catch (err) {
      console.error('Error fetching customer ledger statement:', err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleCloseLedger = () => {
    setSelectedCustomerId(null);
    setLedgerData(null);
  };

  const handleExportCSV = () => {
    if (report.length === 0) return;

    const headers = [
      'Customer ID',
      'Customer Name',
      'Company Name',
      'Phone Number',
      'Advance Paid Date',
      'Delivery Due Date',
      'Initial Advance (₹)',
      'Total Dispatched (₹)',
      'Remaining Advance Held (₹)',
      'Payment Due Outstanding (₹)',
      'Account Status'
    ];

    const rows = report.map(r => [
      `"${r.id}"`,
      `"${r.customer_name}"`,
      `"${r.company_name || ''}"`,
      `"${r.phone_number}"`,
      `"${r.advance_date}"`,
      `"${r.delivery_due_date}"`,
      r.initial_advance_paid,
      r.total_dispatched_value,
      r.remaining_advance_held,
      r.payment_due_outstanding,
      `"${r.account_status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Dust_Customer_Ledger_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getAccountBadge = (status) => {
    switch (status) {
      case 'Advance Available':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200';
      case 'Payment Due':
        return 'bg-rose-50 text-rose-900 border-rose-200';
      case 'Settled':
        return 'bg-stone-50 text-stone-700 border-stone-200';
      default:
        return 'bg-amber-50 text-amber-900 border-amber-200';
    }
  };

  const isOverdue = (dueDateStr, remainingAdv) => {
    if (remainingAdv <= 0) return false;
    const due = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  const hasActiveFilters = localSearch !== '' || statusFilter !== 'ALL' || dateFrom !== '' || dateTo !== '';

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-130px)]">
      {/* Top Metric KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 shrink-0">
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">ADVANCE HELD (FACTORY SIDE)</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <IndianRupee className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-emerald-800">
            {formatCurrency(summary.totalAdvanceHeld)}
          </div>
        </div>

        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">PAYMENT DUE (CUSTOMER OWES)</span>
            <div className="p-1 rounded-md bg-rose-50 text-rose-700">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-rose-800">
            {formatCurrency(summary.totalPaymentDue)}
          </div>
        </div>

        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">DISPATCHED MATERIAL VALUE</span>
            <div className="p-1 rounded-md bg-blue-50 text-blue-700">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-[#2E1C11]">
            {formatCurrency(summary.totalDispatchedValue)}
          </div>
        </div>

        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">ACTIVE QUEUE CUSTOMERS</span>
            <div className="p-1 rounded-md bg-[#FAF0E6] text-[#965E36]">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-[#965E36]">
            {summary.activeQueueCount} <span className="text-[11px] font-normal text-[#7A6759]">active</span>
          </div>
        </div>
      </div>

      {/* Control Action & Filter Bar */}
      <div className="card-panel p-3 sm:p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#A8988B]" />
            <input
              type="text"
              placeholder="Search customer, company, phone..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#965E36] font-medium transition-colors"
            />
          </div>

          {/* Account Status Filter */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
            <Filter className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs text-[#2E1C11] bg-transparent focus:outline-none font-medium cursor-pointer"
            >
              <option value="ALL">All Account Statuses</option>
              <option value="ADVANCE_HELD">Advance Available</option>
              <option value="PAYMENT_DUE">Payment Due</option>
              <option value="SETTLED">Settled</option>
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
              title="From Advance Date"
            />
            <span className="text-[#A8988B]">-</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer font-medium text-[11px]"
              title="To Advance Date"
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => { setLocalSearch(''); setStatusFilter('ALL'); setDateFrom(''); setDateTo(''); }}
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

      {/* Main Table */}
      <div className="card-panel rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0 border border-[#E8DCD0]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-xs text-[#7A6759] space-y-2">
            <div className="w-5 h-5 border-2 border-[#965E36] border-t-transparent rounded-full animate-spin"></div>
            <span>Generating dust customer ledger report...</span>
          </div>
        ) : report.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <FileText className="h-10 w-10 text-[#D4C3B3] mx-auto" />
            <h3 className="text-sm font-bold text-[#2E1C11]">No Matching Customer Ledger Records</h3>
            <p className="text-xs text-[#7A6759]">Try adjusting search terms or status filters to display ledger entries.</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1 h-full w-full">
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead className="sticky top-0 z-10 bg-[#F5ECE3] border-b border-[#E8DCD0] shadow-2xs">
                <tr className="text-[#6E594A] font-bold uppercase tracking-wider">
                  <th className="p-3.5">CUST ID</th>
                  <th className="p-3.5">CUSTOMER & COMPANY NAME</th>
                  <th className="p-3.5">ADV. PAID DATE</th>
                  <th className="p-3.5">DELIVERY DUE</th>
                  <th className="p-3.5">INITIAL ADV. (₹)</th>
                  <th className="p-3.5">DISPATCHED (₹)</th>
                  <th className="p-3.5">REMAINING ADV. (FACTORY HELD)</th>
                  <th className="p-3.5">PAYMENT DUE (CUSTOMER OWES)</th>
                  <th className="p-3.5">STATUS</th>
                  <th className="p-3.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EDE4] bg-white">
                {report.map((r) => {
                  const overdue = isOverdue(r.delivery_due_date, r.remaining_advance_held);

                  return (
                    <tr key={r.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#2E1C11] whitespace-nowrap">
                        {r.id}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-[#2E1C11] text-xs">{r.customer_name}</div>
                        <div className="text-[11px] text-[#7A6759] flex items-center space-x-1">
                          <span>{r.phone_number}</span>
                          {r.company_name && <span>• {r.company_name}</span>}
                        </div>
                      </td>
                      <td className="p-3.5 text-[#6E594A] font-medium whitespace-nowrap text-[11px]">
                        {formatDate(r.advance_date)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`font-semibold text-[11px] ${overdue ? 'text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200' : 'text-[#2E1C11]'}`}>
                          {formatDate(r.delivery_due_date)} {overdue && '(Overdue)'}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[#6E594A] font-semibold whitespace-nowrap">
                        {formatCurrency(r.initial_advance_paid)}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-[#2E1C11] whitespace-nowrap">
                        {formatCurrency(r.total_dispatched_value)}
                      </td>
                      <td className="p-3.5 font-mono font-extrabold text-emerald-800 text-sm whitespace-nowrap">
                        {r.remaining_advance_held > 0 ? `+${formatCurrency(r.remaining_advance_held)}` : '₹0.00'}
                      </td>
                      <td className="p-3.5 font-mono font-extrabold text-rose-800 text-sm whitespace-nowrap">
                        {r.payment_due_outstanding > 0 ? `-${formatCurrency(r.payment_due_outstanding)}` : '₹0.00'}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${getAccountBadge(r.account_status)}`}>
                          {r.account_status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenLedger(r.id)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-[#FAF0E6] text-[#965E36] hover:bg-[#965E36] hover:text-white border border-[#E8D6C5] font-bold text-xs transition-colors cursor-pointer"
                        >
                          <span>View Statement</span>
                          <ChevronRight className="h-3.5 w-3.5" />
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

      {/* Customer Statement / Ledger Slide-out Side Modal */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#1C120C]/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-[#D6C4B0] animate-slide-left">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 bg-[#F5ECE3] border-b border-[#E8DCD0] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#965E36]">CUSTOMER AUDIT STATEMENT</span>
                <h3 className="text-base font-extrabold text-[#2E1C11]">
                  {ledgerData?.customer?.customer_name} ({selectedCustomerId})
                </h3>
              </div>
              <button
                onClick={handleCloseLedger}
                className="p-1.5 rounded-full hover:bg-[#E8DCD0] text-[#7A6759] hover:text-[#2E1C11] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingLedger ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-xs text-[#7A6759] space-y-2">
                <div className="w-6 h-6 border-2 border-[#965E36] border-t-transparent rounded-full animate-spin"></div>
                <span>Loading chronological ledger statement...</span>
              </div>
            ) : ledgerData ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Customer Profile & Financial Summary Box */}
                <div className="p-4 bg-[#FAF7F2] border-b border-[#E8DCD0] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
                  <div>
                    <span className="text-[10px] text-[#7A6759] font-bold uppercase">INITIAL ADVANCE</span>
                    <div className="font-mono font-bold text-[#2E1C11]">{formatCurrency(ledgerData.summary?.totalInitialAdvance)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7A6759] font-bold uppercase">TOTAL DISPATCHED</span>
                    <div className="font-mono font-bold text-[#2E1C11]">{formatCurrency(ledgerData.summary?.totalDispatchedValue)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7A6759] font-bold uppercase">ADVANCE HELD</span>
                    <div className="font-mono font-extrabold text-emerald-800">{formatCurrency(ledgerData.summary?.currentAdvanceBalance)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#7A6759] font-bold uppercase">OUTSTANDING DUE</span>
                    <div className="font-mono font-extrabold text-rose-800">{formatCurrency(ledgerData.summary?.totalOutstandingDue)}</div>
                  </div>
                </div>

                {/* Chronological Statement List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <h4 className="text-xs font-bold text-[#2E1C11] uppercase tracking-wider">Chronological Transaction Log</h4>
                  
                  {ledgerData.statementEntries?.map((entry, idx) => (
                    <div
                      key={entry.entry_id || idx}
                      className="card-panel p-3.5 rounded-xl border border-[#E8DCD0] bg-white space-y-2 hover:shadow-xs transition-shadow"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className={`p-1 rounded-md ${entry.type === 'ADVANCE_DEPOSIT' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                            {entry.type === 'ADVANCE_DEPOSIT' ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                          </span>
                          <span className="font-bold text-[#2E1C11]">{entry.title}</span>
                        </div>
                        <span className="font-mono text-[11px] text-[#7A6759]">{formatDate(entry.date)}</span>
                      </div>

                      <p className="text-xs text-[#6E594A] pl-7">{entry.description}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-[#F4EDE4] text-xs font-mono pl-7">
                        <div>
                          {entry.credit_amount > 0 && (
                            <span className="text-emerald-800 font-bold">+Deposit: {formatCurrency(entry.credit_amount)}</span>
                          )}
                          {entry.debit_amount > 0 && (
                            <span className="text-rose-800 font-bold">-Dispatch: {formatCurrency(entry.debit_amount)}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[#7A6759]">Running Adv Bal: </span>
                          <span className="font-extrabold text-emerald-800">{formatCurrency(entry.running_advance_balance)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Drawer Footer */}
                <div className="p-4 bg-[#F5ECE3] border-t border-[#E8DCD0] flex justify-end shrink-0">
                  <button
                    onClick={handleCloseLedger}
                    className="px-4 py-1.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-extrabold cursor-pointer"
                  >
                    Close Statement
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
