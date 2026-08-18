import React, { useState, useEffect } from 'react';
import {
  FileText, Calendar, Filter, Download, Briefcase, Clock, Users,
  CheckCircle, XCircle, Award
} from 'lucide-react';

export default function EmployeeReports({ trackingMode = 'employee' }) {
  const [reportData, setReportData] = useState({
    positionReport: [],
    shiftReport: [],
    employeeReport: []
  });
  const [loading, setLoading] = useState(true);

  // Filter States
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [activeReportTab, setActiveReportTab] = useState(
    trackingMode === 'position' ? 'position' : 'employee'
  );

  const [positions, setPositions] = useState([]);
  const [shifts, setShifts] = useState([]);

  useEffect(() => {
    setActiveReportTab(trackingMode === 'position' ? 'position' : 'employee');
  }, [trackingMode]);

  useEffect(() => {
    fetchMasterOptions();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [dateFrom, dateTo, positionFilter, shiftFilter]);

  const fetchMasterOptions = async () => {
    try {
      const [posRes, shRes] = await Promise.all([
        fetch('/api/positions'),
        fetch('/api/shifts')
      ]);

      const [posData, shData] = await Promise.all([
        posRes.json(),
        shRes.json()
      ]);

      setPositions(posData.records || []);
      setShifts(shData.records || []);
    } catch (e) {
      console.error('Failed to load report filter options:', e);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        position_id: positionFilter,
        shift_id: shiftFilter
      }).toString();

      const res = await fetch(`/api/attendance/reports?${query}`);
      const data = await res.json();

      if (res.ok) {
        setReportData({
          positionReport: data.positionReport || [],
          shiftReport: data.shiftReport || [],
          employeeReport: data.employeeReport || []
        });
      }
    } catch (err) {
      console.error('Error fetching attendance reports:', err);
    } finally {
      setLoading(false);
    }
  };

  // Quick preset ranges
  const setQuickDateRange = (preset) => {
    const today = new Date();
    if (preset === 'today') {
      const dateStr = today.toISOString().split('T')[0];
      setDateFrom(dateStr);
      setDateTo(dateStr);
    } else if (preset === 'this_week') {
      const first = today.getDate() - today.getDay();
      const firstDay = new Date(today.setDate(first)).toISOString().split('T')[0];
      const lastDay = new Date().toISOString().split('T')[0];
      setDateFrom(firstDay);
      setDateTo(lastDay);
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date().toISOString().split('T')[0];
      setDateFrom(firstDay);
      setDateTo(lastDay);
    } else if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
    }
  };

  return (
    <div className="space-y-5">
      {/* Control & Date Range Bar */}
      <div className="bg-[#EFE6DC] p-4 rounded-2xl border border-[#D6C4B0] space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#2E1A0C]">
            <Filter className="h-4 w-4 text-[#965E36]" />
            <span>Attendance & Operations Reporting</span>
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setQuickDateRange('today')}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-[11px] font-bold text-[#4A3222] hover:bg-[#E2D2C2] cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => setQuickDateRange('this_week')}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-[11px] font-bold text-[#4A3222] hover:bg-[#E2D2C2] cursor-pointer"
            >
              This Week
            </button>
            <button
              onClick={() => setQuickDateRange('this_month')}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-[11px] font-bold text-[#4A3222] hover:bg-[#E2D2C2] cursor-pointer"
            >
              This Month
            </button>
            <button
              onClick={() => setQuickDateRange('all')}
              className="px-3 py-1.5 rounded-xl bg-[#965E36] text-white text-[11px] font-bold cursor-pointer"
            >
              All Time
            </button>
          </div>
        </div>

        {/* Date Inputs & Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#D6C4B0]/60">
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
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Position</label>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C]"
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
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Shift</label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C]"
            >
              <option value="">All Shifts</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Report Sub-Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#D6C4B0] pb-2">
        <button
          onClick={() => setActiveReportTab('position')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeReportTab === 'position'
              ? 'bg-[#965E36] text-white shadow-xs'
              : 'bg-[#EFE6DC] text-[#5C3B21] hover:bg-[#E2D2C2]'
          }`}
        >
          Position Attendance Report
        </button>
        <button
          onClick={() => setActiveReportTab('shift')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeReportTab === 'shift'
              ? 'bg-[#965E36] text-white shadow-xs'
              : 'bg-[#EFE6DC] text-[#5C3B21] hover:bg-[#E2D2C2]'
          }`}
        >
          Shift Attendance Report
        </button>
        <button
          onClick={() => setActiveReportTab('employee')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeReportTab === 'employee'
              ? 'bg-[#965E36] text-white shadow-xs'
              : 'bg-[#EFE6DC] text-[#5C3B21] hover:bg-[#E2D2C2]'
          }`}
        >
          Employee Participation Ledger
        </button>
      </div>

      {/* Report Tables */}
      <div className="bg-[#FAF7F2] rounded-2xl border border-[#D6C4B0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#7C5A3E] font-medium">Generating report breakdown...</div>
        ) : activeReportTab === 'position' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EFE6DC] text-[#5C3B21] border-b border-[#D6C4B0] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Total Logs</th>
                  <th className="py-3 px-4 text-emerald-800">Present</th>
                  <th className="py-3 px-4 text-rose-800">Absent</th>
                  <th className="py-3 px-4 text-amber-800">Half Day</th>
                  <th className="py-3 px-4 text-blue-800">Leave</th>
                  <th className="py-3 px-4">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0D5]">
                {reportData.positionReport.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[#7C5A3E]">
                      No position attendance data available for selected filter range.
                    </td>
                  </tr>
                ) : (
                  reportData.positionReport.map((row, i) => {
                    const total = parseInt(row.total_entries || 0, 10);
                    const present = parseInt(row.present_count || 0, 10);
                    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                    return (
                      <tr key={i} className="hover:bg-[#F5EBE0]">
                        <td className="py-3 px-4 font-bold text-[#2E1A0C]">{row.position_name || 'Unassigned'}</td>
                        <td className="py-3 px-4 font-mono font-bold">{total}</td>
                        <td className="py-3 px-4 text-emerald-700 font-bold">{present}</td>
                        <td className="py-3 px-4 text-rose-700 font-bold">{row.absent_count}</td>
                        <td className="py-3 px-4 text-amber-700 font-bold">{row.half_day_count}</td>
                        <td className="py-3 px-4 text-blue-700 font-bold">{row.leave_count}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-emerald-600 h-full" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="font-mono font-bold text-[11px] text-[#2E1A0C]">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : activeReportTab === 'shift' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EFE6DC] text-[#5C3B21] border-b border-[#D6C4B0] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Shift Name</th>
                  <th className="py-3 px-4">Total Logs</th>
                  <th className="py-3 px-4 text-emerald-800">Present</th>
                  <th className="py-3 px-4 text-rose-800">Absent</th>
                  <th className="py-3 px-4 text-amber-800">Half Day</th>
                  <th className="py-3 px-4 text-blue-800">Leave</th>
                  <th className="py-3 px-4">Attendance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0D5]">
                {reportData.shiftReport.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[#7C5A3E]">
                      No shift attendance data available for selected filter range.
                    </td>
                  </tr>
                ) : (
                  reportData.shiftReport.map((row, i) => {
                    const total = parseInt(row.total_entries || 0, 10);
                    const present = parseInt(row.present_count || 0, 10);
                    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                    return (
                      <tr key={i} className="hover:bg-[#F5EBE0]">
                        <td className="py-3 px-4 font-bold text-[#2E1A0C]">{row.shift_name || 'Unassigned'}</td>
                        <td className="py-3 px-4 font-mono font-bold">{total}</td>
                        <td className="py-3 px-4 text-emerald-700 font-bold">{present}</td>
                        <td className="py-3 px-4 text-rose-700 font-bold">{row.absent_count}</td>
                        <td className="py-3 px-4 text-amber-700 font-bold">{row.half_day_count}</td>
                        <td className="py-3 px-4 text-blue-700 font-bold">{row.leave_count}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-emerald-600 h-full" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="font-mono font-bold text-[11px] text-[#2E1A0C]">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EFE6DC] text-[#5C3B21] border-b border-[#D6C4B0] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Total Days Logged</th>
                  <th className="py-3 px-4 text-emerald-800">Present</th>
                  <th className="py-3 px-4 text-rose-800">Absent</th>
                  <th className="py-3 px-4 text-amber-800">Half Day</th>
                  <th className="py-3 px-4 text-blue-800">Leave</th>
                  <th className="py-3 px-4">Effective Attendance Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0D5]">
                {reportData.employeeReport.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-xs text-[#7C5A3E]">
                      No employee attendance ledger data available.
                    </td>
                  </tr>
                ) : (
                  reportData.employeeReport.map((row) => (
                    <tr key={row.employee_id} className="hover:bg-[#F5EBE0]">
                      <td className="py-3 px-4 font-bold text-[#2E1A0C]">
                        {row.employee_name} ({row.employee_code})
                      </td>
                      <td className="py-3 px-4 text-[#4A3222] font-semibold">{row.position_name || '—'}</td>
                      <td className="py-3 px-4 text-[#6B4B32]">{row.shift_name || '—'}</td>
                      <td className="py-3 px-4 font-mono font-bold">{row.total_days_logged}</td>
                      <td className="py-3 px-4 text-emerald-700 font-bold">{row.present_days}</td>
                      <td className="py-3 px-4 text-rose-700 font-bold">{row.absent_days}</td>
                      <td className="py-3 px-4 text-amber-700 font-bold">{row.half_days}</td>
                      <td className="py-3 px-4 text-blue-700 font-bold">{row.leave_days}</td>
                      <td className="py-3 px-4 font-mono font-extrabold text-[#965E36]">
                        {row.effective_attendance_count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
