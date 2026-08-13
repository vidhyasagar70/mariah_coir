import React, { useState } from 'react';
import { Calendar, Wrench, IndianRupee, Clock, CreditCard, UserCheck, Hash, Save, CheckCircle2, AlertCircle, X } from 'lucide-react';
import api from '../../../shared/services/api';
import { formatCurrency } from '../../../shared/utils/formatters';

export default function MM01_MaintenanceForm() {
  const [formData, setFormData] = useState({
    maintenance_date: new Date().toISOString().split('T')[0],
    payment_date: new Date().toISOString().split('T')[0],
    maintenance_name: '',
    maintenance_reason: '',
    amount_spent: '',
    days_taken: '1',
    pay_mode: 'Cash',
    receiver_name: '',
    account_number: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isOnlinePayment = formData.pay_mode !== 'Cash';

  const handleClose = () => {
    window.location.hash = 'mm02';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!formData.maintenance_date || !formData.payment_date || !formData.maintenance_name || !formData.receiver_name.trim() || !formData.amount_spent || parseFloat(formData.amount_spent) <= 0) {
      setError('Please fill in Maintenance Date, Payment Date, Maintenance Name, Receiver Name, and a valid Amount Spent.');
      return;
    }

    if (isOnlinePayment && !formData.account_number.trim()) {
      setError('Please enter Account Number / UPI ID for online payments.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/maintenance', {
        ...formData,
        amount_spent: parseFloat(formData.amount_spent),
        days_taken: parseInt(formData.days_taken || 1, 10)
      });

      setSuccessMessage(`Maintenance entry ${res.data.id} recorded successfully!`);

      // Reset Form
      setFormData({
        maintenance_date: new Date().toISOString().split('T')[0],
        payment_date: new Date().toISOString().split('T')[0],
        maintenance_name: '',
        maintenance_reason: '',
        amount_spent: '',
        days_taken: '1',
        pay_mode: 'Cash',
        receiver_name: '',
        account_number: ''
      });

      setTimeout(() => {
        setSuccessMessage('');
        window.location.hash = 'mm02';
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Form Panel */}
      <div className="card-panel p-3.5 sm:p-5 md:p-6 rounded-2xl space-y-4 md:space-y-5 relative shadow-sm">
        {/* Top Right Close Button */}
        <div className="flex justify-end border-b border-[#F4EDE4] pb-2">
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

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 md:space-y-4 text-xs">
          {/* 1. Maintenance Name / Machine */}
          <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4">
            <label className="md:w-52 text-[#3D281C] font-semibold shrink-0">Maintenance Name / Machine *</label>
            <div className="relative flex-1 w-full md:max-w-md">
              <Wrench className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
              <input
                type="text"
                required
                placeholder="e.g. Husk Decorticator Motor Servicing"
                value={formData.maintenance_name}
                onChange={(e) => setFormData({ ...formData, maintenance_name: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#965E36] font-medium transition-colors"
              />
            </div>
          </div>

          {/* 2. Maintenance Date */}
          <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4">
            <label className="md:w-52 text-[#3D281C] font-semibold shrink-0">Maintenance Date *</label>
            <div className="relative flex-1 w-full md:max-w-md">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
              <input
                type="date"
                required
                value={formData.maintenance_date}
                onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36] transition-colors"
              />
            </div>
          </div>

          {/* 3. Maintenance Reason / Service Details */}
          <div className="flex flex-col md:flex-row md:items-start gap-1.5 md:gap-4">
            <label className="md:w-52 text-[#3D281C] font-semibold shrink-0 md:pt-2">Maintenance Reason / Details</label>
            <div className="flex-1 w-full md:max-w-md">
              <textarea
                rows="3"
                placeholder="e.g. Regular 500-hour oil filter change, bearing greasing, and V-belt tensioning."
                value={formData.maintenance_reason}
                onChange={(e) => setFormData({ ...formData, maintenance_reason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#965E36] font-medium transition-colors"
              />
            </div>
          </div>

          {/* 4. Amount Spent (₹) */}
          <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4">
            <label className="md:w-52 text-[#3D281C] font-semibold shrink-0">Amount Spent (₹) *</label>
            <div className="relative flex-1 w-full md:max-w-md">
              <IndianRupee className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
              <input
                type="number"
                step="0.01"
                min="1"
                required
                placeholder="e.g. 15400"
                value={formData.amount_spent}
                onChange={(e) => setFormData({ ...formData, amount_spent: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] font-mono font-bold text-sm focus:outline-none focus:border-[#965E36] transition-colors"
              />
            </div>
          </div>

          {/* 5. Days Taken */}
          <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4">
            <label className="md:w-52 text-[#3D281C] font-semibold shrink-0">Days Taken *</label>
            <div className="relative flex-1 w-full md:max-w-md">
              <Clock className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 2"
                value={formData.days_taken}
                onChange={(e) => setFormData({ ...formData, days_taken: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] font-mono font-bold focus:outline-none focus:border-[#965E36] transition-colors"
              />
            </div>
          </div>

          {/* 6. Payment Mode */}
          <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4">
            <label className="md:w-52 text-[#3D281C] font-semibold shrink-0">Payment Mode *</label>
            <div className="relative flex-1 w-full md:max-w-md">
              <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
              <select
                value={formData.pay_mode}
                onChange={(e) => setFormData({ ...formData, pay_mode: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] font-semibold focus:outline-none focus:border-[#965E36] transition-colors"
              >
                <option value="Cash">Cash Payment</option>
                <option value="Online / Bank Transfer">Online / Bank Transfer (NEFT / RTGS)</option>
                <option value="UPI">UPI Payment (GPay / PhonePe / Paytm)</option>
                <option value="Cheque">Cheque Payment</option>
              </select>
            </div>
          </div>

          {/* 7. Payment Date */}
          <div className="flex flex-col md:flex-row md:items-center gap-1.5 md:gap-4">
            <label className="md:w-52 text-[#3D281C] font-semibold shrink-0">Payment Date *</label>
            <div className="relative flex-1 w-full md:max-w-md">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
              <input
                type="date"
                required
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36] transition-colors"
              />
            </div>
          </div>

          {/* 7. Receiver Name / Technician */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4">
            <label className="sm:w-52 text-[#3D281C] font-semibold shrink-0">Receiver Name / Technician *</label>
            <div className="relative flex-1 max-w-md">
              <UserCheck className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
              <input
                type="text"
                required
                placeholder="e.g. Kavitha Electricals / Technician Name"
                value={formData.receiver_name}
                onChange={(e) => setFormData({ ...formData, receiver_name: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#965E36] font-medium transition-colors"
              />
            </div>
          </div>

          {/* 8. Online Account Details (Conditional when non-Cash mode) */}
          {isOnlinePayment && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 pt-1 animate-fade-in">
              <label className="sm:w-52 text-[#965E36] font-bold shrink-0">Account Number / UPI ID *</label>
              <div className="relative flex-1 max-w-md">
                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-[#A8988B]" />
                <input
                  type="text"
                  required={isOnlinePayment}
                  placeholder="e.g. SBIN00042189012 or kavitha@okaxis"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#965E36] text-[#2E1C11] font-mono placeholder-[#A8988B] focus:outline-none focus:border-[#7A4A28] transition-colors"
                />
              </div>
            </div>
          )}

          {/* Form Submit & Cancel Actions */}
          <div className="pt-3 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-[#5C3B21] font-semibold border border-[#D6C4B0] cursor-pointer transition-all text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white font-bold cursor-pointer disabled:opacity-50 transition-all text-xs shadow-sm"
            >
              <Save className="h-4 w-4" />
              <span>{submitting ? 'Recording Entry...' : 'Record Maintenance Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
