import React, { useState, useEffect } from 'react';
import { X, UserCheck, AlertCircle } from 'lucide-react';

export default function EmployeeModal({ isOpen, onClose, onSave, employee }) {
  const [employeeCode, setEmployeeCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [genderId, setGenderId] = useState('');
  const [positionId, setPositionId] = useState('');
  const [defaultShiftId, setDefaultShiftId] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('Active');

  const [positions, setPositions] = useState([]);
  const [genders, setGenders] = useState([]);
  const [shifts, setShifts] = useState([]);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMasterData();
    }
  }, [isOpen]);

  const fetchMasterData = async () => {
    try {
      const [posRes, genRes, shRes] = await Promise.all([
        fetch('/api/positions?status=Active'),
        fetch('/api/genders?status=Active'),
        fetch('/api/shifts?status=Active')
      ]);

      const [posData, genData, shData] = await Promise.all([
        posRes.json(),
        genRes.json(),
        shRes.json()
      ]);

      setPositions(posData.records || []);
      setGenders(genData.records || []);
      setShifts(shData.records || []);
    } catch (e) {
      console.error('Failed to load master dropdown data:', e);
    }
  };

  useEffect(() => {
    if (employee) {
      setEmployeeCode(employee.employee_code || '');
      setFullName(employee.full_name || '');
      setGenderId(employee.gender_id || '');
      setPositionId(employee.position_id || '');
      setDefaultShiftId(employee.default_shift_id || '');
      setDateOfBirth(employee.date_of_birth ? employee.date_of_birth.split('T')[0] : '');
      setJoiningDate(employee.joining_date ? employee.joining_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setPhone(employee.phone || '');
      setAddress(employee.address || '');
      setEmploymentStatus(employee.employment_status || 'Active');
    } else {
      setEmployeeCode('');
      setFullName('');
      setGenderId('');
      setPositionId('');
      setDefaultShiftId('');
      setDateOfBirth('');
      setJoiningDate(new Date().toISOString().split('T')[0]);
      setPhone('');
      setAddress('');
      setEmploymentStatus('Active');
    }
    setError('');
  }, [employee, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeCode.trim()) {
      setError('Employee ID is required.');
      return;
    }
    if (!fullName.trim()) {
      setError('Employee Name is required.');
      return;
    }
    if (!genderId) {
      setError('Gender selection is required.');
      return;
    }
    if (!positionId) {
      setError('Position selection is required.');
      return;
    }
    if (!defaultShiftId) {
      setError('Default shift selection is required.');
      return;
    }
    if (!joiningDate) {
      setError('Joining Date is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await onSave({
        employee_code: employeeCode.trim(),
        full_name: fullName.trim(),
        gender_id: genderId,
        position_id: positionId,
        default_shift_id: defaultShiftId,
        date_of_birth: dateOfBirth || null,
        joining_date: joiningDate,
        phone: phone.trim() || null,
        address: address.trim() || null,
        employment_status: employmentStatus
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save employee.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C120C]/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-[#FAF7F2] rounded-2xl border border-[#D6C4B0] shadow-2xl w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-[#EFE6DC] px-6 py-4 border-b border-[#D6C4B0] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#965E36] text-white">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#2E1A0C] text-base">
                {employee ? 'Edit Employee Details' : 'Create New Employee'}
              </h3>
              <p className="text-xs text-[#7C5A3E]">Master workforce directory record</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-[#7C5A3E] uppercase tracking-wider border-b border-[#D6C4B0] pb-1">
              1. Basic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Employee ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-007"
                  value={employeeCode}
                  onChange={(e) => setEmployeeCode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-mono font-bold focus:ring-2 focus:ring-[#965E36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S. Murugan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-medium focus:ring-2 focus:ring-[#965E36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Gender <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={genderId}
                  onChange={(e) => setGenderId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-medium focus:ring-2 focus:ring-[#965E36]"
                >
                  <option value="">-- Select Gender --</option>
                  {genders.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-medium focus:ring-2 focus:ring-[#965E36]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Employment Information */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-[#7C5A3E] uppercase tracking-wider border-b border-[#D6C4B0] pb-1">
              2. Employment Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Position <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={positionId}
                  onChange={(e) => setPositionId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-medium focus:ring-2 focus:ring-[#965E36]"
                >
                  <option value="">-- Select Position --</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Default Shift <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={defaultShiftId}
                  onChange={(e) => setDefaultShiftId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-medium focus:ring-2 focus:ring-[#965E36]"
                >
                  <option value="">-- Select Default Shift --</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.start_time} - {s.end_time})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Joining Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-medium focus:ring-2 focus:ring-[#965E36]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Employment Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-medium focus:ring-2 focus:ring-[#965E36]"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-[#7C5A3E] uppercase tracking-wider border-b border-[#D6C4B0] pb-1">
              3. Contact Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+91 98420 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-medium focus:ring-2 focus:ring-[#965E36]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#4A3222] uppercase tracking-wider mb-1">
                  Residential Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Street, City, Pin Code..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] text-xs font-medium focus:ring-2 focus:ring-[#965E36]"
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
              {submitting ? 'Saving...' : employee ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
