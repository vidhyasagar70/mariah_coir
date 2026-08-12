import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Filter, ArrowUpRight, ArrowDownRight, DollarSign, Calendar, FileText, CheckCircle2, User } from 'lucide-react';
import api from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/formatters';
import AdvancePaymentModal from './AdvancePaymentModal';

export default function LedgerView() {
  const [ledgerData, setLedgerData] = useState({
    summary: { totalDeliveryDue: 0, totalAdvancePaid: 0, netOutstanding: 0 },
    transactions: []
  });
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [supplierFilter, setSupplierFilter] = useState('All');

  // Modal State
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = {};
      if (supplierFilter !== 'All') params.supplier_id = supplierFilter;

      const res = await api.get('/ledger', { params });
      setLedgerData(res.data);
    } catch (err) {
      console.error('Error fetching ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [supplierFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
              SM-03
            </span>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Supplier Payment Ledger & Balance Summary</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete financial ledger tracking goods inward liabilities (Owner Owes) vs advance payments & settlements (Owner Paid).
          </p>
        </div>

        <button
          onClick={() => setIsAdvanceModalOpen(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/50 cursor-pointer transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Record Advance Payment</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Delivery Due */}
        <div className="p-5 rounded-2xl glass-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Delivery Due (Owner Owes)</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
            {formatCurrency(ledgerData.summary.totalDeliveryDue)}
          </div>
          <p className="text-[11px] text-slate-400">Total liability generated from Goods Inward receipts</p>
        </div>

        {/* Total Advance Paid */}
        <div className="p-5 rounded-2xl glass-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Advances & Payments (Owner Paid)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono tracking-tight">
            {formatCurrency(ledgerData.summary.totalAdvancePaid)}
          </div>
          <p className="text-[11px] text-slate-400">Sum of advances and account settlement payments issued</p>
        </div>

        {/* Net Outstanding Balance */}
        <div className="p-5 rounded-2xl glass-card space-y-2 border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Outstanding Balance</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono tracking-tight">
            {formatCurrency(ledgerData.summary.netOutstanding)}
          </div>
          <p className="text-[11px] text-slate-400">Current net payable balance remaining to suppliers</p>
        </div>
      </div>

      {/* Supplier Filter Bar */}
      <div className="p-4 rounded-2xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-300">Filter Ledger by Supplier:</span>
        </div>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-medium sm:w-72"
        >
          <option value="All">All Suppliers (Global Ledger)</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} - {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Ledger Table */}
      <div className="rounded-2xl glass-panel overflow-hidden border border-slate-800">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading ledger timeline...</span>
          </div>
        ) : ledgerData.transactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No Ledger Transactions Found</h3>
            <p className="text-xs text-slate-500">Record a goods inward receipt or advance payment to view ledger entries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold">
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Supplier Name & ID</th>
                  <th className="p-3.5">Transaction Type</th>
                  <th className="p-3.5">Balance Impact</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Note / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ledgerData.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5 text-slate-300 font-medium whitespace-nowrap">{formatDate(t.transaction_date)}</td>
                    <td className="p-3.5 text-slate-200 font-medium">
                      <div>{t.supplier_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{t.supplier_id}</div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                          t.transaction_type === 'Advance Paid'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {t.transaction_type}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {t.balance_impact === 'Owner Owes' ? (
                        <div className="flex items-center space-x-1 text-rose-400 font-medium">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          <span>Owner Owes (Liability +)</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-emerald-400 font-medium">
                          <ArrowDownRight className="h-3.5 w-3.5" />
                          <span>Owner Paid (Liability -)</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-sm text-slate-100">
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="p-3.5 text-slate-400 max-w-xs truncate">{t.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Advance Payment Modal */}
      <AdvancePaymentModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        onSuccess={fetchLedger}
      />
    </div>
  );
}
