import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, Calendar, CheckCircle, XCircle, Clock,
  Users, UserCheck, UserX, AlertCircle, FileText, CheckSquare, X, Briefcase
} from 'lucide-react';
import BulkAttendanceModal from './BulkAttendanceModal';

export default function AttendanceManagement({ trackingMode = 'employee' }) {
  const [attendanceList, setAttendanceList] = useState([]);
  const [summary, setSummary] = useState({
    totalRecords: 0,
    presentCount: 0,
    absentCount: 0,
    halfDayCount: 0,
    leaveCount: 0,
    totalAttendanceCount: 0
  });
  const [loading, setLoading] = useState(true);

  // Master options
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [shifts, setShifts] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [entryTypeFilter, setEntryTypeFilter] = useState(
    trackingMode === 'position' ? 'Position' : 'Employee'
  ); // 'All', 'Employee', 'Position'

  // Modals
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  // Single form modal state
  const [entryType, setEntryType] = useState(
    trackingMode === 'position' ? 'Position' : 'Employee'
  ); // 'Employee' or 'Position'
  const [singleEmpId, setSingleEmpId] = useState('');
  const [singlePosId, setSinglePosId] = useState('');
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [singleShiftId, setSingleShiftId] = useState('');
  const [singleStatus, setSingleStatus] = useState('Present');
  const [singleCount, setSingleCount] = useState(1);
  const [singleNotes, setSingleNotes] = useState('');
  const [singleError, setSingleError] = useState('');

  // Sync mode changes
  useEffect(() => {
    const targetType = trackingMode === 'position' ? 'Position' : 'Employee';
    setEntryTypeFilter(targetType);
    setEntryType(targetType);
  }, [trackingMode]);

  useEffect(() => {
    fetchMasterOptions();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [search, dateFilter, dateFrom, dateTo, employeeFilter, positionFilter, shiftFilter, statusFilter, entryTypeFilter]);

  const fetchMasterOptions = async () => {
    try {
      const [empRes, posRes, shRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/positions'),
        fetch('/api/shifts')
      ]);

      const [empData, posData, shData] = await Promise.all([
        empRes.json(),
        posRes.json(),
        shRes.json()
      ]);

      setEmployees(empData.records || []);
      setPositions(posData.records || []);
      setShifts(shData.records || []);
    } catch (e) {
      console.error('Failed to fetch attendance master options:', e);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        date: dateFilter,
        date_from: dateFrom,
        date_to: dateTo,
        employee_id: employeeFilter,
        position_id: positionFilter,
        shift_id: shiftFilter,
        attendance_status: statusFilter,
        entry_type: entryTypeFilter
      }).toString();

      const res = await fetch(`/api/attendance?${query}`);
      const data = await res.json();

      if (res.ok) {
        setAttendanceList(data.records || []);
        setSummary(data.summary || {});
      } else {
        showNotification(data.error || 'Failed to fetch attendance.', 'error');
      }
    } catch (err) {
      showNotification('Network error while fetching attendance records.', 'error');
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDelete = async (att) => {
    if (!window.confirm(`Are you sure you want to delete attendance record for ${att.employee_name} on ${att.attendance_date}?`)) return;

    try {
      const res = await fetch(`/api/attendance/${att.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        showNotification(data.message || 'Attendance deleted successfully.');
        fetchAttendance();
      } else {
        showNotification(data.error || 'Failed to delete attendance.', 'error');
      }
    } catch (err) {
      showNotification('Error deleting attendance.', 'error');
    }
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (entryType === 'Employee' && !singleEmpId) {
      setSingleError('Employee selection is required for Employee-based mode.');
      return;
    }
    if (entryType === 'Position' && !singlePosId) {
      setSingleError('Position selection is required for Position-based mode.');
      return;
    }
    if (entryType === 'Position' && !singleShiftId) {
      setSingleError('Shift selection is required for Position-based mode.');
      return;
    }

    try {
      setSingleError('');
      const url = editingItem ? `/api/attendance/${editingItem.id}` : '/api/attendance';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance_date: singleDate,
          entry_type: entryType,
          employee_id: entryType === 'Employee' ? singleEmpId : null,
          position_id: singlePosId || null,
          shift_id: singleShiftId || null,
          attendance_status: singleStatus,
          count: parseFloat(singleCount) || 1,
          notes: singleNotes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save attendance entry.');
      }

      showNotification(data.message || 'Attendance entry saved successfully.');
      setIsSingleModalOpen(false);
      fetchAttendance();
    } catch (err) {
      setSingleError(err.message || 'Error saving attendance.');
    }
  };

  const openSingleModalForEdit = (item) => {
    setEditingItem(item);
    setEntryType(item.employee_id ? 'Employee' : 'Position');
    setSingleEmpId(item.employee_id || '');
    setSinglePosId(item.position_id || '');
    setSingleDate(item.attendance_date ? item.attendance_date.split('T')[0] : new Date().toISOString().split('T')[0]);
    setSingleShiftId(item.shift_id || '');
    setSingleStatus(item.attendance_status);
    setSingleCount(item.count);
    setSingleNotes(item.notes || '');
    setSingleError('');
    setIsSingleModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {notification && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in ${
            notification.type === 'error'
              ? 'bg-red-100 border border-red-200 text-red-800'
              : 'bg-emerald-100 border border-emerald-200 text-emerald-800'
          }`}
        >
          <span>{notification.msg}</span>
          <button onClick={() => setNotification(null)} className="ml-2 font-bold cursor-pointer">
            ×
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[#EFE6DC] p-3.5 rounded-2xl border border-[#D6C4B0] flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7C5A3E]">Total Logs</p>
            <h3 className="text-xl font-extrabold text-[#2E1A0C] mt-0.5">{summary.totalRecords || 0}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-[#965E36] text-white shadow-xs">
            <Users className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-[#EFE6DC] p-3.5 rounded-2xl border border-[#D6C4B0] flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Present</p>
            <h3 className="text-xl font-extrabold text-emerald-900 mt-0.5">{summary.presentCount || 0}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
            <UserCheck className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-[#EFE6DC] p-3.5 rounded-2xl border border-[#D6C4B0] flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Absent</p>
            <h3 className="text-xl font-extrabold text-rose-900 mt-0.5">{summary.absentCount || 0}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs">
            <UserX className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-[#EFE6DC] p-3.5 rounded-2xl border border-[#D6C4B0] flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Half Day</p>
            <h3 className="text-xl font-extrabold text-amber-900 mt-0.5">{summary.halfDayCount || 0}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-xs">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-[#EFE6DC] p-3.5 rounded-2xl border border-[#D6C4B0] flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Total Headcount</p>
            <h3 className="text-xl font-extrabold text-blue-900 mt-0.5">{summary.totalAttendanceCount || 0}</h3>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
            <Calendar className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-[#EFE6DC] p-4 rounded-2xl border border-[#D6C4B0] space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C694E]" />
            <input
              type="text"
              placeholder="Search employee, position, shift..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36]"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-bold shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <CheckSquare className="h-4 w-4" />
              <span>Bulk Attendance Entry</span>
            </button>
            <button
              onClick={() => {
                setEditingItem(null);
                setEntryType(trackingMode === 'position' ? 'Position' : 'Employee');
                setSingleEmpId('');
                setSinglePosId('');
                setSingleDate(new Date().toISOString().split('T')[0]);
                setSingleShiftId('');
                setSingleStatus('Present');
                setSingleCount(1);
                setSingleNotes('');
                setSingleError('');
                setIsSingleModalOpen(true);
              }}
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-[#E2D2C2] hover:bg-[#D6C4B0] text-[#3D2514] text-xs font-bold border border-[#D6C4B0] flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Single Entry</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 pt-2 border-t border-[#D6C4B0]/60">
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Mode</label>
            <select
              value={entryTypeFilter}
              onChange={(e) => setEntryTypeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C] font-bold"
            >
              <option value="All">All Modes</option>
              <option value="Employee">Employee-Based</option>
              <option value="Position">Position-Based</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Employee</label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C] font-medium"
            >
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Position</label>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C] font-medium"
            >
              <option value="">All Positions</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C] font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Half Day">Half Day</option>
              <option value="Leave">Leave</option>
            </select>
          </div>
        </div>
      </div>

      {/* Attendance Logs Table */}
      <div className="bg-[#FAF7F2] rounded-2xl border border-[#D6C4B0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#7C5A3E] font-medium">Loading daily attendance logs...</div>
        ) : attendanceList.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Calendar className="h-8 w-8 text-[#A88B73] mx-auto" />
            <p className="text-sm font-bold text-[#3D2514]">No Attendance Logs Found</p>
            <p className="text-xs text-[#7C5A3E]">
              Use "Bulk Attendance Entry" for fast shift marking or "+ Single Entry" for individual/position logs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EFE6DC] text-[#5C3B21] border-b border-[#D6C4B0] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Entry Mode</th>
                  <th className="py-3 px-4">Target (Employee / Position)</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Attendance Status</th>
                  <th className="py-3 px-4">Count / Headcount</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0D5]">
                {attendanceList.map((att) => {
                  const st = att.attendance_status;
                  const isPosEntry = !att.employee_id;
                  return (
                    <tr key={att.id} className="hover:bg-[#F5EBE0] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#2E1A0C]">
                        {att.attendance_date ? att.attendance_date.split('T')[0] : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isPosEntry ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}
                        >
                          {isPosEntry ? <Briefcase className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                          <span>{isPosEntry ? 'Position-Based' : 'Employee-Based'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-[#2E1A0C]">
                        {att.employee_name}
                      </td>
                      <td className="py-3 px-4 text-[#4A3222] font-semibold">{att.position_name || '—'}</td>
                      <td className="py-3 px-4 text-[#6B4B32]">{att.shift_name || '—'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            st === 'Present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : st === 'Absent'
                              ? 'bg-rose-100 text-rose-800'
                              : st === 'Half Day'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {st === 'Present' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          <span>{st}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold text-[#2E1A0C]">{att.count}</td>
                      <td className="py-3 px-4 text-[#6B4B32]">{att.notes || '—'}</td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => openSingleModalForEdit(att)}
                          className="p-1.5 rounded-lg bg-[#E2D2C2] hover:bg-[#D6C4B0] text-[#4A3222] transition-colors cursor-pointer"
                          title="Edit Attendance Log"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(att)}
                          className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 transition-colors cursor-pointer"
                          title="Delete Attendance Log"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bulk Attendance Entry Modal */}
      <BulkAttendanceModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        trackingMode={trackingMode}
        onSaveSuccess={(msg) => {
          showNotification(msg);
          fetchAttendance();
        }}
      />

      {/* Single Attendance Modal (Employee or Position Mode) */}
      {isSingleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C120C]/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FAF7F2] rounded-2xl border border-[#D6C4B0] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#EFE6DC] px-6 py-4 border-b border-[#D6C4B0] flex items-center justify-between">
              <h3 className="font-bold text-[#2E1A0C] text-base">
                {editingItem ? 'Edit Attendance Log' : 'Single Attendance Entry'}
              </h3>
              <button
                onClick={() => setIsSingleModalOpen(false)}
                className="p-1 rounded-lg text-[#7C5A3E] hover:text-[#2E1A0C] hover:bg-[#E2D2C2]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSingleSubmit} className="p-6 space-y-4">
              {singleError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                  {singleError}
                </div>
              )}

              {/* Mode Switcher */}
              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase mb-1.5">
                  Attendance Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEntryType('Employee');
                      setSinglePosId('');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      entryType === 'Employee'
                        ? 'bg-[#965E36] text-white shadow-xs'
                        : 'bg-[#EFE6DC] text-[#5C3B21] hover:bg-[#E2D2C2]'
                    }`}
                  >
                    Employee-Based
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEntryType('Position');
                      setSingleEmpId('');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      entryType === 'Position'
                        ? 'bg-[#965E36] text-white shadow-xs'
                        : 'bg-[#EFE6DC] text-[#5C3B21] hover:bg-[#E2D2C2]'
                    }`}
                  >
                    Position-Based
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase mb-1">Attendance Date *</label>
                <input
                  type="date"
                  required
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D6C4B0] bg-white text-xs font-bold"
                />
              </div>

              {entryType === 'Employee' ? (
                <div>
                  <label className="block text-xs font-bold text-[#4A3222] uppercase mb-1">Employee *</label>
                  <select
                    required
                    disabled={Boolean(editingItem)}
                    value={singleEmpId}
                    onChange={(e) => {
                      setSingleEmpId(e.target.value);
                      const selectedEmp = employees.find((emp) => emp.id === e.target.value);
                      if (selectedEmp) {
                        setSinglePosId(selectedEmp.position_id);
                        setSingleShiftId(selectedEmp.default_shift_id);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6C4B0] bg-white text-xs font-bold"
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} ({e.employee_code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-[#4A3222] uppercase mb-1">Position *</label>
                  <select
                    required
                    value={singlePosId}
                    onChange={(e) => setSinglePosId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6C4B0] bg-white text-xs font-bold"
                  >
                    <option value="">-- Select Position --</option>
                    {positions.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase mb-1">
                  Shift {entryType === 'Position' && <span className="text-red-500">*</span>}
                </label>
                <select
                  required={entryType === 'Position'}
                  value={singleShiftId}
                  onChange={(e) => setSingleShiftId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D6C4B0] bg-white text-xs font-medium"
                >
                  <option value="">Select Shift</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#4A3222] uppercase mb-1">Status *</label>
                  <select
                    value={singleStatus}
                    onChange={(e) => {
                      const st = e.target.value;
                      setSingleStatus(st);
                      if (st === 'Present') setSingleCount(1.0);
                      else if (st === 'Half Day') setSingleCount(0.5);
                      else setSingleCount(0.0);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6C4B0] bg-white text-xs font-bold"
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Leave">Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#4A3222] uppercase mb-1">
                    {entryType === 'Position' ? 'Headcount' : 'Count'} *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={singleCount}
                    onChange={(e) => setSingleCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D6C4B0] bg-white text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A3222] uppercase mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes, worker headcount details..."
                  value={singleNotes}
                  onChange={(e) => setSingleNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D6C4B0] bg-white text-xs"
                />
              </div>

              <div className="pt-3 border-t border-[#D6C4B0] flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D6C4B0] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#965E36] text-white text-xs font-bold"
                >
                  {editingItem ? 'Update Log' : 'Save Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
