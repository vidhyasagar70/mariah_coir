import React, { useState, useEffect } from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';

export default function ShiftModal({ isOpen, onClose, onSave, shift }) {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:30');
  const [breakDuration, setBreakDuration] = useState(30);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (shift) {
      setName(shift.name || '');
      setStartTime(shift.start_time || '09:00');
      setEndTime(shift.end_time || '17:30');
      setBreakDuration(shift.break_duration !== undefined ? shift.break_duration : 30);
      setDescription(shift.description || '');
      setStatus(shift.status == 1 || shift.status === true);
    } else {
      setName('');
      setStartTime('09:00');
      setEndTime('17:30');
      setBreakDuration(30);
      setDescription('');
      setStatus(true);
    }
    setError('');
  }, [shift, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Shift Name is required.');
      return;
    }
    if (!startTime) {
      setError('Start time is required.');
      return;
    }
    if (!endTime) {
      setError('End time is required.');
      return;
    }
    if (parseInt(breakDuration, 10) < 0) {
      setError('Break duration cannot be negative.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await onSave({
        name: name.trim(),
        start_time: startTime,
        end_time: endTime,
        break_duration: parseInt(breakDuration, 10) || 0,
        description: description.trim(),
        status
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save shift.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C120C]/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FAF7F2] rounded-2xl border border-[#D6C4B0] shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[#EFE6DC] px-6 py-4 border-b border-[#D6C4B0] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#965E36] text-white">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#2E1A0C] text-base">
                {shift ? 'Edit Work Shift' : 'Create Work Shift'}
              </h3>
              <p className="text-xs text-[#7C5A3E]">Define operational working time range</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#7C5A3E] hover:text-[#2E1A0C] hover:bg-[#E2D2C2] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1.5">
              Shift Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Morning Shift, General Shift, Night Shift..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-sm focus:outline-none focus:ring-2 focus:ring-[#965E36] transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1.5">
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-sm focus:outline-none focus:ring-2 focus:ring-[#965E36]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1.5">
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-sm focus:outline-none focus:ring-2 focus:ring-[#965E36]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1.5">
              Break Duration (Minutes)
            </label>
            <input
              type="number"
              min="0"
              placeholder="30"
              value={breakDuration}
              onChange={(e) => setBreakDuration(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-sm focus:outline-none focus:ring-2 focus:ring-[#965E36]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Shift purpose, overnight details, etc..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-sm focus:outline-none focus:ring-2 focus:ring-[#965E36]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1.5">
              Status
            </label>
            <div className="flex items-center space-x-4 pt-1">
              <label className="inline-flex items-center space-x-2 cursor-pointer text-sm font-medium text-[#2E1A0C]">
                <input
                  type="radio"
                  name="shift_status"
                  checked={status === true}
                  onChange={() => setStatus(true)}
                  className="text-[#965E36] focus:ring-[#965E36]"
                />
                <span>Active</span>
              </label>
              <label className="inline-flex items-center space-x-2 cursor-pointer text-sm font-medium text-[#2E1A0C]">
                <input
                  type="radio"
                  name="shift_status"
                  checked={status === false}
                  onChange={() => setStatus(false)}
                  className="text-[#965E36] focus:ring-[#965E36]"
                />
                <span>Inactive</span>
              </label>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-[#D6C4B0] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#D6C4B0] text-[#5C3B21] hover:bg-[#E2D2C2] text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : shift ? 'Update Shift' : 'Create Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
