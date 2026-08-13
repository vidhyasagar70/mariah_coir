import React, { useState, useEffect } from 'react';
import { BookOpen, ArrowUpRight, ArrowDownRight, Scale, Plus, Filter, Calendar, FileText, IndianRupee, Save } from 'lucide-react';
import api from '../../../shared/services/api';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';

export default function SM03_Ledger({ search }) {
  const [suppliers, setSuppliers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalPayable: 0, totalAdvanceHeld: 0, netBalanceDue: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    supplier_id: '',
    transaction_type: 'Advance Paid',
    transaction_date: new Date().toISOString().split('T')[0],
    amount: '',
    note: ''
  });

  // Filter
  const [supplierFilter, setSupplierFilter] = useState('All');

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers?status=Active');
      setSuppliers(res.data);
      if (res.data.length > 0 && !formData.supplier_id) {
        setFormData((prev) => ({ ...prev, supplier_id: res.data[0].id }));
      }
    } catch (err) {
      console.error('Error loading suppliers:', err);
    }
  };

  const fetchLedgerData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (supplierFilter !== 'All') params.supplier_id = supplierFilter;

      const [txRes, sumRes] = await Promise.all([
        api.get('/ledger', { params }),
        api.get(`/ledger/summary/${supplierFilter}`)
      ]);

      setTransactions(txRes.data);
      setSummary(sumRes.data);
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
    fetchLedgerData();
  }, [supplierFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.supplier_id || !formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please select a supplier and enter a valid positive transaction amount.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/ledger', {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      setFormData((prev) => ({
        ...prev,
        amount: '',
        note: ''
      }));
      fetchLedgerData();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top KPI Banner Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* TOTAL PAYABLE */}
        <div className="card-panel p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL PAYABLE (DELIVERIES)</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#2E1C11]">
            {formatCurrency(summary.totalPayable)}
          </div>
          <p className="text-[11px] text-[#7A6759]">Gross Delivery Due liability</p>
        </div>

        {/* TOTAL ADVANCE HELD */}
        <div className="card-panel p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL ADVANCE HELD</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-emerald-600">
            {formatCurrency(summary.totalAdvanceHeld)}
          </div>
          <p className="text-[11px] text-[#7A6759]">Sum of advances and payments issued</p>
        </div>

        {/* NET BALANCE DUE */}
        <div className="card-panel p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E594A]">NET BALANCE DUE</span>
            <div className="p-2 rounded-xl bg-[#FAF0E6] text-[#965E36]">
              <Scale className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold font-mono text-[#2E1C11]">
            {formatCurrency(summary.netBalanceDue)}
          </div>
          <p className="text-[11px] text-[#7A6759]">Net outstanding payable to suppliers</p>
        </div>
      </div>

      {/* Transaction Entry Form Panel */}
      <div className="card-panel p-6 rounded-2xl space-y-5">
        <div className="flex items-center space-x-3 border-b border-[#F4EDE4] pb-3">
          <div className="p-2 rounded-xl bg-[#965E36] text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#2E1C11] text-base">Record Payment Ledger Entry</h3>
            <p className="text-xs text-[#7A6759]">Post advance payment (+) or delivery liability (-)</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Supplier Select */}
            <div>
              <label className="block text-[#3D281C] font-semibold mb-1">Select Supplier *</label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DCD0] text-[#2E1C11] font-medium focus:outline-none focus:border-[#8C5E3C]"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Transaction Type */}
            <div>
              <label className="block text-[#3D281C] font-semibold mb-1">Transaction Type *</label>
              <select
                value={formData.transaction_type}
                onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DCD0] text-[#2E1C11] font-medium focus:outline-none focus:border-[#8C5E3C]"
              >
                <option value="Advance Paid">Owner Paid Advance to Supplier (+)</option>
                <option value="Delivery Due">Delivery Due (-)</option>
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-[#3D281C] font-semibold mb-1">Amount (₹) *</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="e.g. 5000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DCD0] text-[#2E1C11] font-mono font-bold focus:outline-none focus:border-[#8C5E3C]"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-[#3D281C] font-semibold mb-1">Transaction Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
                <input
                  type="date"
                  required
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DCD0] text-[#2E1C11] focus:outline-none focus:border-[#8C5E3C] font-medium"
                />
              </div>
            </div>
          </div>

          {/* Note & Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="w-full sm:w-2/3 relative">
              <FileText className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
              <input
                type="text"
                placeholder="Note / Reference (e.g. Advance for Season Green Husk Batch via UTR #90218)"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DCD0] text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#8C5E3C]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white font-bold cursor-pointer disabled:opacity-50 transition-all shrink-0"
            >
              <Save className="h-4 w-4" />
              <span>{submitting ? 'Processing...' : 'Post Transaction'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Supplier Filter Bar */}
      <div className="card-panel p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-[#3D281C] text-xs font-semibold">
          <Filter className="h-4 w-4 text-[#A8988B]" />
          <span>Filter Ledger by Supplier:</span>
        </div>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E8DCD0] text-xs text-[#2E1C11] focus:outline-none font-medium w-full sm:w-64"
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
      <div className="card-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#7A6759] flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-[#965E36] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading ledger timeline...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="h-10 w-10 text-[#D4C3B3] mx-auto" />
            <h3 className="text-sm font-bold text-[#2E1C11]">No Ledger Transactions Found</h3>
            <p className="text-xs text-[#7A6759]">Record an advance payment or goods inward receipt.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8DCD0] bg-[#F5ECE3] text-[#6E594A] font-bold uppercase tracking-wider">
                  <th className="p-4">DATE</th>
                  <th className="p-4">SUPPLIER</th>
                  <th className="p-4">TYPE</th>
                  <th className="p-4">NOTE</th>
                  <th className="p-4">AMOUNT</th>
                  <th className="p-4">BALANCE IMPACT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EDE4]">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                    <td className="p-4 text-[#6E594A] font-medium whitespace-nowrap">{formatDate(t.transaction_date)}</td>
                    <td className="p-4 font-semibold text-[#2E1C11]">
                      <div>{t.supplier_name}</div>
                      <div className="text-[11px] text-[#A8988B] font-mono">{t.supplier_id}</div>
                    </td>
                    <td className="p-4 font-medium text-[#3D281C]">{t.transaction_type}</td>
                    <td className="p-4 text-[#7A6759] max-w-xs truncate">{t.note || '-'}</td>
                    {/* AMOUNT (+ Green / - Red) */}
                    <td className="p-4 font-mono font-bold text-sm">
                      {t.balance_impact === 'Owner Paid' ? (
                        <span className="text-emerald-600">+₹{parseFloat(t.amount).toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-rose-600">-₹{parseFloat(t.amount).toLocaleString('en-IN')}</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          t.balance_impact === 'Owner Paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {t.balance_impact}
                      </span>
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
