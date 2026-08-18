import React, { useState, useEffect } from 'react';
import { 
  FileText, Calendar, IndianRupee, CreditCard, Hash, Building2, 
  Tag, Info, Activity, Save, X, AlertCircle, CheckCircle2 
} from 'lucide-react';
import api from '../../../shared/services/api';

export default function MiscellaneousEntry({ editId, onNavigateBack }) {
  const isEditMode = Boolean(editId);

  // Form State
  const [formData, setFormData] = useState({
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_mode: 'Online',
    account_number: '',
    bank_name: '',
    transaction_reference: '',
    payment_reference: '',
    notes: '',
    status: 'PAID'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRecord, setIsLoadingRecord] = useState(isEditMode);
  const [successMessage, setSuccessMessage] = useState('');
  const [generalError, setGeneralError] = useState('');

  const isOnlinePayment = formData.payment_mode === 'Online';

  // Fetch record details if in edit mode
  useEffect(() => {
    if (!editId) return;

    const fetchRecord = async () => {
      try {
        setIsLoadingRecord(true);
        const res = await api.get(`/miscellaneous/${editId}`);
        const rec = res.data;
        if (rec) {
          const mode = (rec.payment_mode || 'ONLINE').toUpperCase() === 'ONLINE' ? 'Online' : 'Offline';
          setFormData({
            description: rec.description || '',
            expense_date: rec.expense_date || new Date().toISOString().split('T')[0],
            amount: rec.amount !== undefined ? String(rec.amount) : '',
            payment_mode: mode,
            account_number: rec.account_number || '',
            bank_name: rec.bank_name || '',
            transaction_reference: rec.transaction_reference || '',
            payment_reference: rec.payment_reference || '',
            notes: rec.notes || '',
            status: rec.status || 'PAID'
          });
        }
      } catch (err) {
        setGeneralError('Failed to load record for editing: ' + (err.response?.data?.error || err.message));
      } finally {
        setIsLoadingRecord(false);
      }
    };

    fetchRecord();
  }, [editId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleClose = () => {
    if (onNavigateBack) onNavigateBack();
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setGeneralError('');
    setSuccessMessage('');
    setErrors({});

    try {
      setIsSubmitting(true);
      const descFinal = formData.description && formData.description.trim() ? formData.description.trim() : 'Miscellaneous Expense';
      const dateFinal = formData.expense_date || new Date().toISOString().split('T')[0];
      const amountFinal = parseFloat(formData.amount) || 0;

      const payload = {
        description: descFinal,
        expense_date: dateFinal,
        amount: amountFinal,
        payment_mode: formData.payment_mode.toUpperCase(),
        account_number: formData.account_number ? formData.account_number.trim() : null,
        bank_name: formData.payment_mode === 'Online' ? (formData.bank_name ? formData.bank_name.trim() : null) : null,
        transaction_reference: formData.payment_mode === 'Online' ? (formData.transaction_reference ? formData.transaction_reference.trim() : null) : null,
        payment_reference: formData.payment_mode === 'Offline' ? (formData.payment_reference ? formData.payment_reference.trim() : null) : null,
        notes: formData.notes ? formData.notes.trim() : null,
        status: formData.status
      };

      if (isEditMode) {
        await api.put(`/miscellaneous/${editId}`, payload);
        setSuccessMessage('Miscellaneous record updated successfully!');
      } else {
        await api.post('/miscellaneous', payload);
        setSuccessMessage('Miscellaneous record created successfully!');
      }

      setTimeout(() => {
        if (onNavigateBack) onNavigateBack();
      }, 1500);
    } catch (err) {
      console.error('Error saving miscellaneous entry:', err);
      setGeneralError(err.response?.data?.error || err.message || 'Failed to save miscellaneous entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingRecord) {
    return (
      <div className="card-panel p-8 max-w-4xl mx-auto rounded-2xl bg-white border border-[#E8DCD0] flex flex-col items-center justify-center space-y-3">
        <div className="w-6 h-6 border-2 border-[#965E36] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs text-[#7A6759]">Loading record data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Form Panel */}
      <div className="card-panel p-3.5 sm:p-5 md:p-6 rounded-2xl space-y-4 md:space-y-5 relative shadow-sm">
        {/* Top Header & Close Button */}
        <div className="flex items-center justify-between border-b border-[#F4EDE4] pb-2">
          <div>
            <h1 className="text-lg font-extrabold text-[#2E1C11]">
              {isEditMode ? 'Edit Miscellaneous Entry' : 'New Miscellaneous Entry'}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-xl bg-[#FAF7F2] hover:bg-rose-50 text-[#7A6759] hover:text-rose-600 border border-[#E8DCD0] hover:border-rose-200 transition-colors cursor-pointer flex items-center space-x-1 text-xs font-semibold"
            title="Close Form"
          >
            <X className="h-4 w-4" />
            <span>Close</span>
          </button>
        </div>

        {generalError && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{generalError}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 md:space-y-4 text-xs">
          
          {/* 1. Description */}
          <div className="flex flex-col md:flex-row md:items-start gap-1.5 md:gap-4">
            <label className="md:w-52 text-[#3D281C] font-semibold shrink-0 md:pt-2">Miscellaneous Description (Optional)</label>
            <div className="flex-1 w-full md:max-w-md">
              <textarea
                rows="2"
                placeholder="e.g. Office stationery, Staff refreshments..."
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#965E36] transition-colors font-medium"
              />
            </div>
          </div>

          {/* 2. Expense Date */}
          <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4">
            <label className="md:w-52 text-[#3D281C] font-semibold shrink-0">Expense Date (Optional)</label>
            <div className="relative flex-1 w-full md:max-w-md">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
              <input
                type="date"
                value={formData.expense_date}
                onChange={(e) => handleChange('expense_date', e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36] transition-colors"
              />
            </div>
          </div>

          {/* 3. Amount Spent */}
          <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4">
            <label className="md:w-52 text-[#3D281C] font-semibold shrink-0">Amount Spent (₹) (Optional)</label>
            <div className="relative flex-1 w-full md:max-w-md">
              <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 1500"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] font-mono font-bold text-sm text-[#2E1C11] focus:outline-none focus:border-[#965E36] transition-colors"
              />
            </div>
          </div>

          {/* 4. Payment Mode */}
          <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4">
            <label className="md:w-52 text-[#3D281C] font-semibold shrink-0">Payment Mode</label>
            <div className="relative flex-1 w-full md:max-w-md">
              <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
              <select
                value={formData.payment_mode}
                onChange={(e) => handleChange('payment_mode', e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] font-semibold focus:outline-none focus:border-[#965E36] transition-colors"
              >
                <option value="Online">Online / Bank Transfer (UPI / NEFT)</option>
                <option value="Offline">Offline / Cash Payment</option>
              </select>
            </div>
          </div>

          {/* 5. Online Conditional Fields */}
          {isOnlinePayment && (
            <>
              {/* Account Number */}
              <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4 pt-1 animate-fade-in">
                <label className="md:w-52 text-[#5C3B21] font-semibold shrink-0">Account Number / UPI ID (Optional)</label>
                <div className="relative flex-1 w-full md:max-w-md">
                  <Hash className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
                  <input
                    type="text"
                    placeholder="e.g. SBIN00012345 or user@upi"
                    value={formData.account_number}
                    onChange={(e) => handleChange('account_number', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] font-mono font-medium text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#965E36] transition-colors"
                  />
                </div>
              </div>

              {/* Bank Name */}
              <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4 animate-fade-in">
                <label className="md:w-52 text-[#3D281C] font-semibold shrink-0">Bank / Account Name</label>
                <div className="relative flex-1 w-full md:max-w-md">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
                  <input
                    type="text"
                    placeholder="e.g. State Bank of India"
                    value={formData.bank_name}
                    onChange={(e) => handleChange('bank_name', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] placeholder-[#A8988B] font-medium focus:outline-none focus:border-[#965E36] transition-colors"
                  />
                </div>
              </div>

              {/* Transaction Reference */}
              <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4 animate-fade-in">
                <label className="md:w-52 text-[#3D281C] font-semibold shrink-0">Transaction Ref</label>
                <div className="relative flex-1 w-full md:max-w-md">
                  <Tag className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
                  <input
                    type="text"
                    placeholder="e.g. UTR / NEFT reference"
                    value={formData.transaction_reference}
                    onChange={(e) => handleChange('transaction_reference', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] placeholder-[#A8988B] font-mono focus:outline-none focus:border-[#965E36] transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          {/* 6. Offline Conditional Fields */}
          {!isOnlinePayment && (
            <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4 animate-fade-in">
              <label className="md:w-52 text-[#3D281C] font-semibold shrink-0">Payment Reference</label>
              <div className="relative flex-1 w-full md:max-w-md">
                <FileText className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
                <input
                  type="text"
                  placeholder="e.g. Cash voucher / Receipt no"
                  value={formData.payment_reference}
                  onChange={(e) => handleChange('payment_reference', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] placeholder-[#A8988B] font-mono focus:outline-none focus:border-[#965E36] transition-colors"
                />
              </div>
            </div>
          )}

          {/* 7. Notes */}
          <div className="flex flex-col md:flex-row md:items-start gap-1.5 md:gap-4">
            <label className="md:w-52 text-[#3D281C] font-semibold shrink-0 md:pt-2">Additional Notes</label>
            <div className="flex-1 w-full md:max-w-md relative">
              <Info className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
              <textarea
                rows="2"
                placeholder="Add any internal notes..."
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#965E36] transition-colors font-medium"
              />
            </div>
          </div>

          {/* 8. Status */}
          <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4">
            <label className="md:w-52 text-[#3D281C] font-semibold shrink-0">Status</label>
            <div className="relative flex-1 w-full md:max-w-md">
              <Activity className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] font-semibold focus:outline-none focus:border-[#965E36] transition-colors"
              >
                <option value="PAID">PAID</option>
                <option value="PENDING">PENDING</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          {/* Form Submit & Cancel Actions */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-[#F4EDE4] mt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-[#5C3B21] font-semibold border border-[#D6C4B0] cursor-pointer transition-all text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white font-bold cursor-pointer disabled:opacity-50 transition-all text-xs shadow-sm"
            >
              <Save className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving Entry...' : 'Save Entry'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

