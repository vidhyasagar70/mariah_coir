import React, { useState, useEffect } from 'react';
import { X, DollarSign, AlertCircle, Info, Briefcase, User } from 'lucide-react';

export default function SalaryModal({ isOpen, onClose, onSave, salary }) {
  const [mode, setMode] = useState('Position'); // 'Position' or 'Employee'
  const [employeeId, setEmployeeId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [genderId, setGenderId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [salaryFrequency, setSalaryFrequency] = useState('Daily');
  const [salaryAmount, setSalaryAmount] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState('');
  const [status, setStatus] = useState('Active');

  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [genders, setGenders] = useState([]);
  const [shifts, setShifts] = useState([]);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMasterOptions();
    }
  }, [isOpen]);

  const fetchMasterOptions = async () => {
    try {
      const [empRes, posRes, genRes, shRes] = await Promise.all([
        fetch('/api/employees?employment_status=Active'),
        fetch('/api/positions?status=Active'),
        fetch('/api/genders?status=Active'),
        fetch('/api/shifts?status=Active')
      ]);

      const [empData, posData, genData, shData] = await Promise.all([
        empRes.json(),
        posRes.json(),
        genRes.json(),
        shRes.json()
      ]);

      setEmployees(empData.records || []);
      setPositions(posData.records || []);
      setGenders(genData.records || []);
      setShifts(shData.records || []);
    } catch (e) {
      console.error('Failed to load salary master options:', e);
    }
  };

  useEffect(() => {
    if (salary) {
      setMode(salary.employee_id ? 'Employee' : 'Position');
      setEmployeeId(salary.employee_id || '');
      setPositionId(salary.position_id || '');
      setGenderId(salary.gender_id || '');
      setShiftId(salary.shift_id || '');
      setSalaryFrequency(salary.salary_frequency || 'Daily');
      setSalaryAmount(salary.salary_amount || '');
      setEffectiveFrom(salary.effective_from ? salary.effective_from.split('T')[0] : new Date().toISOString().split('T')[0]);
      setEffectiveTo(salary.effective_to ? salary.effective_to.split('T')[0] : '');
      setStatus(salary.status || 'Active');
    } else {
      setMode('Position');
      setEmployeeId('');
      setPositionId('');
      setGenderId('');
      setShiftId('');
      setSalaryFrequency('Daily');
      setSalaryAmount('');
      setEffectiveFrom(new Date().toISOString().split('T')[0]);
      setEffectiveTo('');
      setStatus('Active');
    }
    setError('');
  }, [salary, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (mode === 'Position' && !positionId) {
      setError('Position selection is required for Position-Based salary structure.');
      return;
    }

    if (mode === 'Employee' && !employeeId) {
      setError('Employee selection is required for Employee-Based salary structure.');
      return;
    }

    const amt = parseFloat(salaryAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Salary amount must be a positive number.');
      return;
    }

    if (!effectiveFrom) {
      setError('Effective From date is required.');
      return;
    }

    if (effectiveTo && effectiveTo < effectiveFrom) {
      setError('Effective To date cannot be earlier than Effective From date.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await onSave({
        employee_id: mode === 'Employee' ? employeeId : null,
        position_id: positionId || null,
        gender_id: mode === 'Position' ? (genderId || null) : null,
        shift_id: mode === 'Position' ? (shiftId || null) : null,
        salary_frequency: salaryFrequency,
        salary_amount: amt,
        effective_from: effectiveFrom,
        effective_to: effectiveTo || null,
        status
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save salary structure.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C120C]/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-[#FAF7F2] rounded-2xl border border-[#D6C4B0] shadow-2xl w-full max-w-xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-[#EFE6DC] px-6 py-4 border-b border-[#D6C4B0] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#965E36] text-white">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#2E1A0C] text-base">
                {salary ? 'Edit Salary Structure' : 'Create Salary Structure'}
              </h3>
              <p className="text-xs text-[#7C5A3E]">Define pay frequency & rates for Position or Employee</p>
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

          {/* Mode Switcher */}
          <div>
            <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1.5">
              Salary Applicability Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('Position');
                  setEmployeeId('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  mode === 'Position'
                    ? 'bg-[#965E36] text-white shadow-xs'
                    : 'bg-[#EFE6DC] text-[#5C3B21] hover:bg-[#E2D2C2]'
                }`}
              >
                <Briefcase className="h-4 w-4" />
                <span>Position-Based Salary</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('Employee')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  mode === 'Employee'
                    ? 'bg-[#965E36] text-white shadow-xs'
                    : 'bg-[#EFE6DC] text-[#5C3B21] hover:bg-[#E2D2C2]'
                }`}
              >
                <User className="h-4 w-4" />
                <span>Employee-Based Salary</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#E2D2C2]/60 border border-[#D6C4B0] text-xs text-[#4A3222] flex items-start space-x-2">
            <Info className="h-4 w-4 text-[#965E36] shrink-0 mt-0.5" />
            <span>
              {mode === 'Position'
                ? 'Position-based rates apply automatically to all staff holding this position unless an individual employee-based override rate exists.'
                : 'Employee-based rates apply specifically to the selected individual staff member.'}
            </span>
          </div>

          {/* Position Mode Fields */}
          {mode === 'Position' && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Position <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={positionId}
                  onChange={(e) => setPositionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-bold focus:ring-2 focus:ring-[#965E36]"
                >
                  <option value="">-- Select Position --</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#4A3222] mb-1">Shift (Optional)</label>
                  <select
                    value={shiftId}
                    onChange={(e) => setShiftId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-medium"
                  >
                    <option value="">All Shifts</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#4A3222] mb-1">Gender (Optional)</label>
                  <select
                    value={genderId}
                    onChange={(e) => setGenderId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-medium"
                  >
                    <option value="">All Genders</option>
                    {genders.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Employee Mode Fields */}
          {mode === 'Employee' && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Specific Employee <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={employeeId}
                  onChange={(e) => {
                    setEmployeeId(e.target.value);
                    const selectedEmp = employees.find((emp) => emp.id === e.target.value);
                    if (selectedEmp) {
                      setPositionId(selectedEmp.position_id);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-bold focus:ring-2 focus:ring-[#965E36]"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name} ({e.employee_code}) - {e.position_name || 'No Position'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Salary Details */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-extrabold text-[#7C5A3E] uppercase tracking-wider border-b border-[#D6C4B0] pb-1">
              Salary Details & Effective Range
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Salary Frequency <span className="text-red-500">*</span>
                </label>
                <select
                  value={salaryFrequency}
                  onChange={(e) => setSalaryFrequency(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-bold focus:ring-2 focus:ring-[#965E36]"
                >
                  <option value="Daily">Daily Pay Rate</option>
                  <option value="Weekly">Weekly Pay Rate</option>
                  <option value="Monthly">Monthly Salary</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Salary Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="e.g. 650.00"
                  value={salaryAmount}
                  onChange={(e) => setSalaryAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-bold focus:ring-2 focus:ring-[#965E36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Effective From <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-medium focus:ring-2 focus:ring-[#965E36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Effective To <span className="text-xs font-normal text-[#7C5A3E]">(Optional)</span>
                </label>
                <input
                  type="date"
                  value={effectiveTo}
                  onChange={(e) => setEffectiveTo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-medium focus:ring-2 focus:ring-[#965E36]"
                />
              </div>
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
              {submitting ? 'Saving...' : salary ? 'Update Salary' : 'Create Salary'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
