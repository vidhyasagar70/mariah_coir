import React, { useState, useEffect } from 'react';
import { X, Scale, Calendar, CheckSquare, Square, IndianRupee, Save, FileCheck, Info } from 'lucide-react';
import api from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function NewSettlementModal({ isOpen, onClose, onSuccess }) {
  const [suppliers, setSuppliers] = useState([]);
  const [unpaidReceipts, setUnpaidReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    supplier_id: '',
    settlement_date: new Date().toISOString().split('T')[0],
    settlement_type: 'Full Settlement',
    amount_paid: '',
    linked_invoices: [],
    note: ''
  });

  // Load Active Suppliers
  useEffect(() => {
    if (isOpen) {
      api.get('/suppliers?status=Active').then((res) => {
        setSuppliers(res.data);
        if (res.data.length > 0 && !formData.supplier_id) {
          setFormData((prev) => ({ ...prev, supplier_id: res.data[0].id }));
        }
      }).catch(console.error);
    }
  }, [isOpen]);

  // When selected supplier changes, fetch their pending receipts
  useEffect(() => {
    if (formData.supplier_id) {
      api.get(`/receipts?supplier_id=${formData.supplier_id}`).then((res) => {
        const pending = res.data.filter((r) => r.status === 'Pending' || r.status === 'Partial');
        setUnpaidReceipts(pending);
        // Select all pending receipts by default
        const allIds = pending.map((r) => r.id);
        const totalPendingVal = pending.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);

        setFormData((prev) => ({
          ...prev,
          linked_invoices: allIds,
          amount_paid: totalPendingVal > 0 ? totalPendingVal.toString() : ''
        }));
      }).catch(console.error);
    }
  }, [formData.supplier_id]);

  // Toggle selected receipt
  const toggleReceiptSelection = (receiptId) => {
    const current = formData.linked_invoices;
    let next = [];
    if (current.includes(receiptId)) {
      next = current.filter((id) => id !== receiptId);
    } else {
      next = [...current, receiptId];
    }

    // Auto recalculate suggested amount_paid
    const selectedObj = unpaidReceipts.filter((r) => next.includes(r.id));
    const totalSelectedVal = selectedObj.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);

    setFormData((prev) => ({
      ...prev,
      linked_invoices: next,
      amount_paid: totalSelectedVal > 0 ? totalSelectedVal.toString() : prev.amount_paid
    }));
  };

  // Calculate stats for selected invoices
  const selectedReceiptsObjects = unpaidReceipts.filter((r) => formData.linked_invoices.includes(r.id));
  const totalSelectedInvoiceAmount = selectedReceiptsObjects.reduce((sum, r) => sum + parseFloat(r.total_amount || 0), 0);
  const paidVal = parseFloat(formData.amount_paid || 0);
  const remainingBal = Math.max(0, totalSelectedInvoiceAmount - paidVal);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.supplier_id || !formData.amount_paid || parseFloat(formData.amount_paid) <= 0) {
      setError('Please select a supplier and enter a valid settlement payment amount.');
      return;
    }

    if (formData.linked_invoices.length === 0) {
      setError('Please check at least one receipt invoice to link with this settlement.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/settlements', {
        ...formData,
        amount_paid: parseFloat(formData.amount_paid)
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-2xl glass-panel p-6 border border-slate-700 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Create Account Settlement (SM-04)</h3>
              <p className="text-xs text-slate-400">Link unpaid material receipts and process settlement (STL-xxx)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Supplier Selection & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Supplier *</label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Settlement Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="date"
                  required
                  value={formData.settlement_date}
                  onChange={(e) => setFormData({ ...formData, settlement_date: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Linked Receipts Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-slate-300 font-semibold">Link Unpaid Invoices / Receipts *</label>
              <span className="text-[11px] text-slate-400">
                {formData.linked_invoices.length} of {unpaidReceipts.length} selected
              </span>
            </div>

            {unpaidReceipts.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                No pending or partial receipts found for this supplier!
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                {unpaidReceipts.map((r) => {
                  const isChecked = formData.linked_invoices.includes(r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => toggleReceiptSelection(r.id)}
                      className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-500 shrink-0" />
                        )}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-slate-200">{r.id}</span>
                            <span className="text-[11px] text-slate-400">({formatDate(r.receipt_date)})</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {r.material_type} • {r.trip_count} trip(s) via {r.vehicle_type}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-white text-xs">{formatCurrency(r.total_amount)}</span>
                        <div className="text-[10px] uppercase font-semibold text-amber-400">{r.status}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settlement Type & Payment Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Settlement Type *</label>
              <select
                value={formData.settlement_type}
                onChange={(e) => setFormData({ ...formData, settlement_type: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="Full Settlement">Full Settlement (Clear Selected Receipts)</option>
                <option value="Partial">Partial Settlement</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Amount Paid (₹) *</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="e.g. 15000"
                  value={formData.amount_paid}
                  onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono font-bold text-emerald-400 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Settlement Summary Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 grid grid-cols-2 gap-4">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Linked Receipts Value</span>
              <div className="text-sm font-mono font-bold text-slate-200 mt-1">
                {formatCurrency(totalSelectedInvoiceAmount)}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Calculated Remaining Balance</span>
              <div className="text-sm font-mono font-bold text-amber-400 mt-1">
                {formatCurrency(remainingBal)}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50 transition-all"
            >
              <FileCheck className="h-4 w-4" />
              <span>{loading ? 'Processing...' : 'Execute Settlement'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
