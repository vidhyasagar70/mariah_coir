import React, { useState, useEffect } from 'react';
import { supplierApi } from '../../api/supplierApi';
import { BookOpen, Plus, Search, DollarSign, Calendar, RefreshCw, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function AccountsView({ selectedSupplierId }) {
  const [suppliers, setSuppliers] = useState([]);
  const [activeSupplierId, setActiveSupplierId] = useState(selectedSupplierId || '');
  const [balanceSummary, setBalanceSummary] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    supplier_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: 'ADVANCE_GIVEN',
    amount: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supplierApi.getSuppliers({ status: 'Active' }).then((res) => {
      const list = res.data || [];
      setSuppliers(list);
      if (!activeSupplierId && list.length > 0) {
        setActiveSupplierId(list[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedSupplierId) {
      setActiveSupplierId(selectedSupplierId);
    }
  }, [selectedSupplierId]);

  const loadSupplierAccountData = async (supId) => {
    if (!supId) return;
    setLoading(true);
    try {
      const [balRes, ledgerRes] = await Promise.all([
        supplierApi.getSupplierBalance(supId),
        supplierApi.getSupplierLedger(supId)
      ]);
      setBalanceSummary(balRes);
      setLedger(ledgerRes.data || []);
    } catch (err) {
      console.error('Error fetching account data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSupplierId) {
      loadSupplierAccountData(activeSupplierId);
    }
  }, [activeSupplierId]);

  const handleOpenModal = () => {
    setError('');
    setFormData({
      supplier_id: activeSupplierId,
      transaction_date: new Date().toISOString().split('T')[0],
      transaction_type: 'ADVANCE_GIVEN',
      amount: '',
      description: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await supplierApi.recordTransaction(formData);
      setShowModal(false);
      loadSupplierAccountData(formData.supplier_id);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to record transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-emerald-400" />
            Supplier Accounts & Financial Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Immutable transaction ledger for advance payments, supplier credits, debits, supply payables, and settlements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activeSupplierId}
            onChange={(e) => setActiveSupplierId(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">-- Select Supplier --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.supplier_name} ({s.supplier_number})
              </option>
            ))}
          </select>

          <button
            onClick={handleOpenModal}
            disabled={!activeSupplierId}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Record Transaction
          </button>
        </div>
      </div>

      {/* Account Summary Cards */}
      {balanceSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-4.5 rounded-2xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Advance Given</p>
            <p className="text-xl font-bold text-emerald-400 mt-1">
              ₹{(balanceSummary.total_advance_given || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Advance Used: ₹{(balanceSummary.total_advance_used || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4.5 rounded-2xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Available Advance</p>
            <p className="text-xl font-bold text-teal-300 mt-1">
              ₹{(balanceSummary.available_advance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Ready for supply adjustments</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4.5 rounded-2xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Supply Value</p>
            <p className="text-xl font-bold text-slate-100 mt-1">
              ₹{(balanceSummary.total_supply_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Total raw material receipts</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-4.5 rounded-2xl">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Outstanding Payable</p>
            <p className="text-xl font-bold text-amber-400 mt-1">
              ₹{(balanceSummary.outstanding_payable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">Amount due after advance/settlements</p>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-400" />
            Transaction Ledger History
          </h3>
          <button
            onClick={() => loadSupplierAccountData(activeSupplierId)}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Transaction Type</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right">Debit (₹)</th>
                <th className="px-6 py-4 text-right">Credit (₹)</th>
                <th className="px-6 py-4 text-right">Running Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-500">
                    Loading ledger statement...
                  </td>
                </tr>
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-slate-500">
                    No transactions recorded for this supplier.
                  </td>
                </tr>
              ) : (
                ledger.map((item) => {
                  const db = parseFloat(item.debit || 0);
                  const cr = parseFloat(item.credit || 0);
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">{item.transaction_date}</td>
                      <td className="px-6 py-4 font-semibold">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          item.transaction_type === 'ADVANCE_GIVEN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          item.transaction_type === 'SUPPLY_PAYABLE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          item.transaction_type === 'ADVANCE_ADJUSTMENT' ? 'bg-teal-500/10 text-teal-300 border-teal-500/20' :
                          'bg-slate-800 text-slate-300 border-slate-700'
                        }`}>
                          {item.transaction_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-300 max-w-xs truncate">{item.description || '—'}</td>
                      <td className="px-6 py-4 text-right font-mono text-emerald-400 font-semibold">
                        {db > 0 ? `₹${db.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-amber-400 font-semibold">
                        {cr > 0 ? `₹${cr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-100 font-bold">
                        ₹{parseFloat(item.running_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100">
              Record Manual Account Transaction
            </h3>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Supplier <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.supplier_name} ({s.supplier_number})</option>
                  ))}
                </select>
              </div>

              {/* Payment Purpose / Nature Field: ADVANCE vs PAYABLE SETTLEMENT */}
              <div>
                <label className="block text-xs font-bold uppercase text-emerald-400 tracking-wider mb-1.5">
                  Payment Purpose / Nature <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transaction_type: 'ADVANCE_GIVEN' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formData.transaction_type === 'ADVANCE_GIVEN'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    💰 Advance Payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, transaction_type: 'SETTLEMENT' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      formData.transaction_type === 'SETTLEMENT'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    🧾 Payable Settlement
                  </button>
                </div>

                <select
                  value={formData.transaction_type}
                  onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="ADVANCE_GIVEN">Advance Payment (Paid to supplier before material delivery)</option>
                  <option value="SETTLEMENT">Payable Settlement (Paid to clear outstanding supply bills)</option>
                  <option value="SUPPLIER_CREDIT">Supplier Credit Memo (Increases amount owed to supplier)</option>
                  <option value="SUPPLIER_DEBIT">Supplier Debit Memo (Reduces amount owed / chargeback)</option>
                  <option value="ADJUSTMENT">Manual Ledger Adjustment</option>
                </select>

                {/* Explanatory Logic Box */}
                <div className="mt-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  {formData.transaction_type === 'ADVANCE_GIVEN' && (
                    <p className="text-emerald-300 font-medium">
                      ✓ <strong>Advance Payment Logic:</strong> Adds to the supplier's <strong>Available Advance balance</strong>. Future raw material supply bills will automatically deduct from this pre-paid advance pool.
                    </p>
                  )}
                  {formData.transaction_type === 'SETTLEMENT' && (
                    <p className="text-amber-300 font-medium">
                      ✓ <strong>Payable Settlement Logic:</strong> Settles and reduces the supplier's <strong>Outstanding Payable amount</strong> for raw materials already delivered.
                    </p>
                  )}
                  {formData.transaction_type === 'SUPPLIER_CREDIT' && (
                    <p className="text-blue-300 font-medium">
                      ✓ <strong>Supplier Credit Logic:</strong> Increases the total amount owed to the supplier for non-supply credits or bonus adjustments.
                    </p>
                  )}
                  {formData.transaction_type === 'SUPPLIER_DEBIT' && (
                    <p className="text-rose-300 font-medium">
                      ✓ <strong>Supplier Debit Logic:</strong> Charges back or debits the supplier's account balance.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Amount (₹) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 15000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm font-semibold focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description / Notes</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Advance paid via Bank Transfer Ref #12345"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-xl hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition"
                >
                  {submitting ? 'Recording...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
