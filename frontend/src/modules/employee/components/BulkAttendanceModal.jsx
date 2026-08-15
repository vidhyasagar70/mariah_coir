import React, { useState, useEffect } from 'react';
import { X, Calendar, CheckSquare, XSquare, Save, AlertCircle, Users, Briefcase } from 'lucide-react';

export default function BulkAttendanceModal({ isOpen, onClose, onSaveSuccess, trackingMode = 'employee' }) {
  const [mode, setMode] = useState(
    trackingMode === 'position' ? 'Position' : 'Employee'
  ); // 'Employee' or 'Position'
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [positionFilter, setPositionFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');

  const [positions, setPositions] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [employeeRows, setEmployeeRows] = useState([]);
  const [positionRows, setPositionRows] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(trackingMode === 'position' ? 'Position' : 'Employee');
      fetchMasterOptions();
    }
  }, [isOpen, trackingMode]);

  const fetchMasterOptions = async () => {
    try {
      const [posRes, shRes] = await Promise.all([
        fetch('/api/positions?status=Active'),
        fetch('/api/shifts?status=Active')
      ]);

      const [posData, shData] = await Promise.all([
        posRes.json(),
        shRes.json()
      ]);

      const activePositions = posData.records || [];
      const activeShifts = shData.records || [];
      setPositions(activePositions);
      setShifts(activeShifts);

      if (activeShifts.length > 0 && !shiftFilter) {
        setShiftFilter(activeShifts[0].id);
      }

      // Initialize position rows for Position mode
      setPositionRows(
        activePositions.map((p) => ({
          position_id: p.id,
          position_name: p.name,
          attendance_status: 'Present',
          count: 1,
          notes: ''
        }))
      );
    } catch (e) {
      console.error('Failed to fetch master options for bulk attendance:', e);
    }
  };

  const loadEmployeesForAttendance = async () => {
    if (mode !== 'Employee') return;
    try {
      setLoading(true);
      setError('');

      const empQuery = new URLSearchParams({
        employment_status: 'Active',
        position_id: positionFilter
      }).toString();

      const empRes = await fetch(`/api/employees?${empQuery}`);
      const empData = await empRes.json();
      const activeEmps = empData.records || [];

      const attQuery = new URLSearchParams({
        date: attendanceDate,
        shift_id: shiftFilter
      }).toString();

      const attRes = await fetch(`/api/attendance?${attQuery}`);
      const attData = await attRes.json();
      const existingAtts = attData.records || [];

      const attMap = {};
      existingAtts.forEach((a) => {
        if (a.employee_id) {
          attMap[a.employee_id] = a;
        }
      });

      const rows = activeEmps.map((emp) => {
        const existing = attMap[emp.id];
        return {
          employee_id: emp.id,
          employee_code: emp.employee_code,
          full_name: emp.full_name,
          position_id: emp.position_id,
          position_name: emp.position_name,
          default_shift_id: emp.default_shift_id,
          shift_name: emp.shift_name,
          attendance_status: existing ? existing.attendance_status : 'Present',
          count: existing ? existing.count : 1.0,
          notes: existing ? (existing.notes || '') : ''
        };
      });

      setEmployeeRows(rows);
    } catch (err) {
      setError('Failed to load employees for attendance entry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && attendanceDate && shiftFilter && mode === 'Employee') {
      loadEmployeesForAttendance();
    }
  }, [isOpen, attendanceDate, positionFilter, shiftFilter, mode]);

  if (!isOpen) return null;

  const handleStatusChange = (index, status) => {
    if (mode === 'Employee') {
      setEmployeeRows((prev) => {
        const updated = [...prev];
        let count = 1.0;
        if (status === 'Present') count = 1.0;
        else if (status === 'Half Day') count = 0.5;
        else count = 0.0;

        updated[index] = { ...updated[index], attendance_status: status, count };
        return updated;
      });
    } else {
      setPositionRows((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], attendance_status: status };
        return updated;
      });
    }
  };

  const handlePositionCountChange = (index, countVal) => {
    setPositionRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], count: parseFloat(countVal) || 0 };
      return updated;
    });
  };

  const handleNoteChange = (index, notes) => {
    if (mode === 'Employee') {
      setEmployeeRows((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], notes };
        return updated;
      });
    } else {
      setPositionRows((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], notes };
        return updated;
      });
    }
  };

  const handleMarkAll = (status) => {
    if (mode === 'Employee') {
      let count = status === 'Present' ? 1.0 : status === 'Half Day' ? 0.5 : 0.0;
      setEmployeeRows((prev) =>
        prev.map((row) => ({
          ...row,
          attendance_status: status,
          count
        }))
      );
    } else {
      setPositionRows((prev) =>
        prev.map((row) => ({
          ...row,
          attendance_status: status
        }))
      );
    }
  };

  const handleSaveBatch = async () => {
    const rowsToSave = mode === 'Employee' ? employeeRows : positionRows;

    if (rowsToSave.length === 0) {
      setError('No attendance rows to save.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        attendance_date: attendanceDate,
        shift_id: shiftFilter,
        entries: rowsToSave.map((row) => ({
          employee_id: mode === 'Employee' ? row.employee_id : null,
          position_id: row.position_id,
          shift_id: shiftFilter,
          attendance_status: row.attendance_status,
          count: row.count,
          notes: row.notes
        }))
      };

      const res = await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save bulk attendance.');
      }

      onSaveSuccess(data.message || 'Batch attendance saved successfully.');
      onClose();
    } catch (err) {
      setError(err.message || 'Error saving bulk attendance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C120C]/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-[#FAF7F2] rounded-2xl border border-[#D6C4B0] shadow-2xl w-full max-w-4xl overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#EFE6DC] px-6 py-4 border-b border-[#D6C4B0] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-[#965E36] text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#2E1A0C] text-base">Bulk Attendance Entry</h3>
              <p className="text-xs text-[#7C5A3E]">Select Employee-based or Position-based batch entry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#7C5A3E] hover:text-[#2E1A0C] hover:bg-[#E2D2C2] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selector & Filter Controls Bar */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex items-center space-x-3 bg-[#EFE6DC] p-1.5 rounded-xl border border-[#D6C4B0]">
            <button
              type="button"
              onClick={() => setMode('Employee')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'Employee'
                  ? 'bg-[#965E36] text-white shadow-xs'
                  : 'text-[#5C3B21] hover:bg-[#E2D2C2]'
              }`}
            >
              Employee-Based Batch (Individual Staff)
            </button>
            <button
              type="button"
              onClick={() => setMode('Position')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === 'Position'
                  ? 'bg-[#965E36] text-white shadow-xs'
                  : 'text-[#5C3B21] hover:bg-[#E2D2C2]'
              }`}
            >
              Position-Based Batch (Job Headcount Logs)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#EFE6DC] p-3.5 rounded-xl border border-[#D6C4B0]">
            <div>
              <label className="block text-[10px] font-bold uppercase text-[#4A3222] mb-1">Attendance Date</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs font-bold text-[#2E1A0C]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-[#4A3222] mb-1">Target Shift</label>
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs font-medium text-[#2E1A0C]"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.start_time} - {s.end_time})
                  </option>
                ))}
              </select>
            </div>

            {mode === 'Employee' && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#4A3222] mb-1">Position Filter</label>
                <select
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs font-medium text-[#2E1A0C]"
                >
                  <option value="">All Positions</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs font-bold text-[#3D2514] flex items-center space-x-1">
              <Users className="h-4 w-4 text-[#965E36]" />
              <span>Rows Loaded: {mode === 'Employee' ? employeeRows.length : positionRows.length}</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleMarkAll('Present')}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Mark All Present</span>
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll('Absent')}
                className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer transition-all"
              >
                <XSquare className="h-3.5 w-3.5" />
                <span>Mark All Absent</span>
              </button>
            </div>
          </div>

          {/* Grid Table */}
          <div className="bg-white rounded-xl border border-[#D6C4B0] max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#7C5A3E]">Loading batch rows...</div>
            ) : (mode === 'Employee' ? employeeRows : positionRows).length === 0 ? (
              <div className="p-8 text-center text-xs text-[#7C5A3E]">No data rows available.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-[#EFE6DC] border-b border-[#D6C4B0] text-[#5C3B21] font-bold uppercase">
                  <tr>
                    {mode === 'Employee' && <th className="py-2.5 px-3">Emp ID</th>}
                    {mode === 'Employee' && <th className="py-2.5 px-3">Employee Name</th>}
                    <th className="py-2.5 px-3">Position</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">{mode === 'Position' ? 'Present Headcount' : 'Count'}</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE0D5]">
                  {(mode === 'Employee' ? employeeRows : positionRows).map((row, idx) => (
                    <tr key={row.employee_id || row.position_id} className="hover:bg-[#FAF7F2]">
                      {mode === 'Employee' && <td className="py-2 px-3 font-mono font-bold text-[#965E36]">{row.employee_code}</td>}
                      {mode === 'Employee' && <td className="py-2 px-3 font-bold text-[#2E1A0C]">{row.full_name}</td>}
                      <td className="py-2 px-3 font-bold text-[#4A3222]">{row.position_name}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center space-x-1">
                          {['Present', 'Absent', 'Half Day', 'Leave'].map((st) => {
                            const isSel = row.attendance_status === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleStatusChange(idx, st)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  isSel
                                    ? st === 'Present'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : st === 'Absent'
                                      ? 'bg-rose-600 text-white shadow-xs'
                                      : st === 'Half Day'
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-[#EFE6DC] text-[#5C3B21] hover:bg-[#E2D2C2]'
                                }`}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {mode === 'Position' ? (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={row.count}
                            onChange={(e) => handlePositionCountChange(idx, e.target.value)}
                            className="w-20 px-2 py-1 rounded-lg border border-[#D6C4B0] text-xs font-bold text-center"
                          />
                        ) : (
                          <span className="font-mono font-bold text-[#2E1A0C]">{row.count}</span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="Optional notes..."
                          value={row.notes}
                          onChange={(e) => handleNoteChange(idx, e.target.value)}
                          className="w-full px-2 py-1 rounded-lg border border-[#D6C4B0] text-[11px] focus:ring-1 focus:ring-[#965E36]"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-[#D6C4B0] flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#D6C4B0] text-[#5C3B21] hover:bg-[#E2D2C2] text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveBatch}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-bold shadow-sm flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving Batch...' : 'Save Attendance Batch'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
