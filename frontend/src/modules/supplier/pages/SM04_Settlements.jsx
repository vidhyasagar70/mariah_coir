import React, { useState, useEffect } from 'react';
import { Scale, Calendar, CheckSquare, Square, IndianRupee, Save, Filter, FileText } from 'lucide-react';
import api from '../../../shared/services/api';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';

export default function SM04_Settlements({ search }) {
  const [suppliers, setSuppliers] = useState([]);
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    supplier_id: '',
    settlement_date: new Date().toISOString().split('T')[0],
    settlement_type: 'Full Settlement',
    amount_paid: '',
    linked_invoices: [],
    note: ''
  });

  // Filter
  const [supplierFilter, setSupplierFilter] = useState('All');

  // Load Active Suppliers
  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers?status=Active');
      setSuppliers(res.data);
      if (res.data.length > 0 && !formData.supplier_id) {
        setFormData((prev) => ({ ...prev, supplier_id: res.data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const params = {};
      if (supplierFilter !== 'All') params.supplier_id = supplierFilter;

      const res = await api.get('/settlements', { params });
      setSettlements(res.data);
    } catch (err) {
      console.error('Error fetching settlements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchSettlements();
  }, [supplierFilter]);

  // Step 2: Dynamically fetch pending receipt IDs belonging to selected supplier
  useEffect(() => {
    if (formData.supplier_id) {
      api.get(`/receipts/pending/${formData.supplier_id}`).then((res) => {
        setPendingReceipts(res.data);
        const allIds = res.data.map((r) => r.id);
        const totalPendingVal = res.data.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);

        setFormData((prev) => ({
          ...prev,
          linked_invoices: allIds,
          amount_paid: totalPendingVal > 0 ? totalPendingVal.toString() : ''
        }));
      }).catch(console.error);
    }
  }, [formData.supplier_id]);

  // Checkbox toggle for linked receipt IDs
  const toggleReceipt = (rId) => {
    const current = formData.linked_invoices;
    let next = [];
    if (current.includes(rId)) {
      next = current.filter((id) => id !== rId);
    } else {
      next = [...current, rId];
    }

    const selectedObj = pendingReceipts.filter((r) => next.includes(r.id));
    const totalSelectedVal = selectedObj.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);

    setFormData((prev) => ({
      ...prev,
      linked_invoices: next,
      amount_paid: totalSelectedVal > 0 ? totalSelectedVal.toString() : prev.amount_paid
    }));
  };

  // Remaining Balance calculation
  const selectedReceiptsObjects = pendingReceipts.filter((r) => formData.linked_invoices.includes(r.id));
  const totalSelectedUnpaid = selectedReceiptsObjects.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);
  const paidVal = parseFloat(formData.amount_paid || 0);
  const remainingBalance = Math.max(0, totalSelectedUnpaid - paidVal);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.supplier_id || !formData.amount_paid || parseFloat(formData.amount_paid) <= 0) {
      setError('Please select a supplier and specify a valid settlement payment amount.');
      return;
    }

    if (formData.linked_invoices.length === 0) {
      setError('Please check at least one pending receipt invoice to link with this settlement.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/settlements', {
        ...formData,
        amount_paid: parseFloat(formData.amount_paid)
      });
      fetchSettlements();
      // Refetch pending receipts
      if (formData.supplier_id) {
        const pendingRes = await api.get(`/receipts/pending/${formData.supplier_id}`);
        setPendingReceipts(pendingRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Settlement Form Wizard Panel */}
      <div className="card-panel p-6 rounded-2xl space-y-5">
        <div className="flex items-center space-x-3 border-b border-[#F4EDE4] pb-3">
          <div className="p-2 rounded-xl bg-[#965E36] text-white">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#2E1C11] text-base">Record Account Settlement (SM-04)</h3>
            <p className="text-xs text-[#7A6759]">Link unpaid material receipts and compute remaining balances</p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Step 1: Select Supplier & Settlement Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#3D281C] font-semibold mb-1">Step 1: Select Supplier *</label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DCD0] text-[#2E1C11] font-medium focus:outline-none focus:border-[#8C5E3C]"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} - {s.name} ({s.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#3D281C] font-semibold mb-1">Settlement Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
                <input
                  type="date"
                  required
                  value={formData.settlement_date}
                  onChange={(e) => setFormData({ ...formData, settlement_date: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DCD0] text-[#2E1C11] focus:outline-none focus:border-[#8C5E3C] font-medium"
                />
              </div>
            </div>
          </div>

          {/* Step 2: Dynamically fetch & display pending receipts with checkboxes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[#3D281C] font-semibold">
                Step 2: Link Unpaid Material Receipts (Checkboxes) *
              </label>
              <span className="text-[11px] text-[#7A6759] font-medium">
                {formData.linked_invoices.length} of {pendingReceipts.length} receipts selected
              </span>
            </div>

            {pendingReceipts.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8DCD0] text-center text-xs text-[#7A6759]">
                No pending or partial delivery receipts found for this supplier!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-2 bg-[#FAF7F2] rounded-xl border border-[#E8DCD0]">
                {pendingReceipts.map((r) => {
                  const isChecked = formData.linked_invoices.includes(r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleReceipt(r.id)}
                      className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-white border-[#965E36] shadow-xs'
                          : 'bg-[#FAF7F2]/60 border-[#E8DCD0] text-[#7A6759] hover:border-[#8C5E3C]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-[#965E36] shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-[#A8988B] shrink-0" />
                        )}
                        <div>
                          <span className="font-mono font-bold text-[#2E1C11]">{r.id}</span>
                          <div className="text-[11px] text-[#7A6759]">
                            {r.material_type} ({r.trip_count} trips)
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-[#2E1C11]">{formatCurrency(r.total_amount)}</span>
                        <div className="text-[10px] uppercase font-bold text-[#92400E]">{r.status}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 3 & 4: Settlement Type & Amount Paid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#3D281C] font-semibold mb-1">Step 3: Settlement Type *</label>
              <select
                value={formData.settlement_type}
                onChange={(e) => setFormData({ ...formData, settlement_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DCD0] text-[#2E1C11] font-medium focus:outline-none focus:border-[#8C5E3C]"
              >
                <option value="Full Settlement">Full Settlement (Settle Checked Invoices)</option>
                <option value="Partial Payment">Partial Payment</option>
              </select>
            </div>

            <div>
              <label className="block text-[#3D281C] font-semibold mb-1">Step 4: Amount Paid / Received (₹) *</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="e.g. 15000"
                  value={formData.amount_paid}
                  onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF7F2] border border-[#E8DCD0] text-[#2E1C11] font-mono font-bold text-sm focus:outline-none focus:border-[#8C5E3C]"
                />
              </div>
            </div>
          </div>

          {/* Live Remaining Balance Strip */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E8DCD0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E594A]">Selected Invoices Total: ₹{totalSelectedUnpaid.toLocaleString('en-IN')}</span>
              <p className="text-xs font-semibold text-[#3D281C] mt-0.5">
                Calculated Remaining Balance = Selected Total - Amount Paid
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="text-xs text-[#7A6759] block font-medium">Remaining Balance</span>
                <span className={`text-xl font-extrabold font-mono ${remainingBalance > 0 ? 'text-rose-600' : 'text-[#2E1C11]'}`}>
                  {formatCurrency(remainingBalance)}
                </span>
              </div>

              {/* Step 5: Record Settlement Button */}
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white font-bold cursor-pointer disabled:opacity-50 transition-all text-xs shadow-sm"
              >
                <Save className="h-4 w-4" />
                <span>{submitting ? 'Processing...' : 'Record Settlement'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Supplier Filter Bar */}
      <div className="card-panel p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-[#3D281C] text-xs font-semibold">
          <Filter className="h-4 w-4 text-[#A8988B]" />
          <span>Filter Settlements by Supplier:</span>
        </div>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E8DCD0] text-xs text-[#2E1C11] focus:outline-none font-medium w-full sm:w-64"
        >
          <option value="All">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} - {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Settlements History Table */}
      <div className="card-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#7A6759] flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-[#965E36] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading settlement vouchers...</span>
          </div>
        ) : settlements.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Scale className="h-10 w-10 text-[#D4C3B3] mx-auto" />
            <h3 className="text-sm font-bold text-[#2E1C11]">No Account Settlements Recorded</h3>
            <p className="text-xs text-[#7A6759]">Record a settlement voucher to settle unpaid delivery receipts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8DCD0] bg-[#F5ECE3] text-[#6E594A] font-bold uppercase tracking-wider">
                  <th className="p-4">SETTLEMENT ID</th>
                  <th className="p-4">DATE</th>
                  <th className="p-4">SUPPLIER</th>
                  <th className="p-4">LINKED INVOICES (CHIPS)</th>
                  <th className="p-4">TYPE</th>
                  <th className="p-4">AMOUNT PAID</th>
                  <th className="p-4">REMAINING BALANCE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EDE4]">
                {settlements.map((st) => (
                  <tr key={st.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                    <td className="p-4 font-mono font-bold text-[#2E1C11]">{st.id}</td>
                    <td className="p-4 text-[#6E594A] font-medium whitespace-nowrap">{formatDate(st.settlement_date)}</td>
                    <td className="p-4 font-semibold text-[#2E1C11]">
                      <div>{st.supplier_name}</div>
                      <div className="text-[11px] text-[#A8988B] font-mono">{st.supplier_id}</div>
                    </td>
                    {/* LINKED INVOICES (Chips) */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {st.linked_invoices && st.linked_invoices.length > 0 ? (
                          st.linked_invoices.map((inv) => (
                            <span key={inv} className="px-2 py-0.5 rounded bg-[#FAF0E6] border border-[#E8D6C5] text-[10px] font-mono font-bold text-[#8C532E]">
                              {inv}
                            </span>
                          ))
                        ) : (
                          <span className="text-[#A8988B] text-[11px]">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-[#3D281C]">{st.settlement_type}</td>
                    {/* AMOUNT PAID (Green text) */}
                    <td className="p-4 font-mono font-bold text-sm text-emerald-600">
                      +₹{parseFloat(st.amount_paid).toLocaleString('en-IN')}
                    </td>
                    {/* REMAINING BALANCE (Red text or Nil) */}
                    <td className="p-4 font-mono font-bold text-sm">
                      {parseFloat(st.remaining_balance) > 0 ? (
                        <span className="text-rose-600">₹{parseFloat(st.remaining_balance).toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-[#A8988B] font-normal text-xs">Nil (Cleared)</span>
                      )}
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
