import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, CheckCircle, XCircle, DollarSign, Calendar,
  Briefcase, Clock, User, Award
} from 'lucide-react';
import SalaryModal from './SalaryModal';

export default function SalaryList({ trackingMode = 'employee' }) {
  const [salaries, setSalaries] = useState([]);
  const [summary, setSummary] = useState({
    totalSalaries: 0,
    dailyCount: 0,
    weeklyCount: 0,
    monthlyCount: 0,
    totalDailyAmount: 0,
    totalWeeklyAmount: 0,
    totalMonthlyAmount: 0
  });
  const [loading, setLoading] = useState(true);

  // Master options for filters
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [genders, setGenders] = useState([]);
  const [shifts, setShifts] = useState([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Active');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    fetchSalaries();
  }, [search, employeeFilter, positionFilter, genderFilter, shiftFilter, frequencyFilter, statusFilter]);

  const fetchMasterData = async () => {
    try {
      const [empRes, posRes, genRes, shRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/positions'),
        fetch('/api/genders'),
        fetch('/api/shifts')
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
      console.error('Failed to fetch master data for salary filters:', e);
    }
  };

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        employee_id: employeeFilter,
        position_id: positionFilter,
        gender_id: genderFilter,
        shift_id: shiftFilter,
        salary_frequency: frequencyFilter,
        status: statusFilter
      }).toString();

      const res = await fetch(`/api/salaries?${query}`);
      const data = await res.json();

      if (res.ok) {
        setSalaries(data.records || []);
        setSummary(data.summary || {});
      } else {
        showNotification(data.error || 'Failed to fetch salary structures.', 'error');
      }
    } catch (err) {
      showNotification('Network error while fetching salary structures.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveSalary = async (formData) => {
    const url = editingSalary ? `/api/salaries/${editingSalary.id}` : '/api/salaries';
    const method = editingSalary ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to save salary structure.');
    }

    showNotification(data.message || 'Salary structure saved successfully.');
    fetchSalaries();
  };

  const handleDelete = async (sal) => {
    if (!window.confirm('Are you sure you want to soft-delete this salary structure record?')) return;

    try {
      const res = await fetch(`/api/salaries/${sal.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        showNotification(data.message || 'Salary structure deleted successfully.');
        fetchSalaries();
      } else {
        showNotification(data.error || 'Failed to delete salary structure.', 'error');
      }
    } catch (err) {
      showNotification('Error deleting salary structure.', 'error');
    }
  };

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amt || 0);
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#EFE6DC] p-4 rounded-2xl border border-[#D6C4B0] flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7C5A3E]">Total Structures</p>
            <h3 className="text-xl font-extrabold text-[#2E1A0C] mt-0.5">{summary.totalSalaries || 0}</h3>
          </div>
          <div className="p-3 rounded-xl bg-[#965E36] text-white shadow-xs">
            <Award className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#EFE6DC] p-4 rounded-2xl border border-[#D6C4B0] flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7C5A3E]">Daily Pay Rates</p>
            <h3 className="text-xl font-extrabold text-[#2E1A0C] mt-0.5">{summary.dailyCount || 0}</h3>
          </div>
          <div className="p-3 rounded-xl bg-amber-700 text-white shadow-xs">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#EFE6DC] p-4 rounded-2xl border border-[#D6C4B0] flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7C5A3E]">Weekly Pay Rates</p>
            <h3 className="text-xl font-extrabold text-[#2E1A0C] mt-0.5">{summary.weeklyCount || 0}</h3>
          </div>
          <div className="p-3 rounded-xl bg-blue-700 text-white shadow-xs">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#EFE6DC] p-4 rounded-2xl border border-[#D6C4B0] flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7C5A3E]">Monthly Salaries</p>
            <h3 className="text-xl font-extrabold text-[#2E1A0C] mt-0.5">{summary.monthlyCount || 0}</h3>
          </div>
          <div className="p-3 rounded-xl bg-emerald-700 text-white shadow-xs">
            <Award className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-[#EFE6DC] p-4 rounded-2xl border border-[#D6C4B0] space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C694E]" />
            <input
              type="text"
              placeholder="Search employee or position..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36]"
            />
          </div>

          <button
            onClick={() => {
              setEditingSalary(null);
              setIsModalOpen(true);
            }}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-bold shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Salary Structure</span>
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-2 border-t border-[#D6C4B0]/60">
          <div>
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Frequency</label>
            <select
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs font-medium text-[#2E1A0C]"
            >
              <option value="All">All Frequencies</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Employee</label>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs font-medium text-[#2E1A0C]"
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
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs font-medium text-[#2E1A0C]"
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
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs font-medium text-[#2E1A0C]"
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
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Gender</label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs font-medium text-[#2E1A0C]"
            >
              <option value="">All Genders</option>
              {genders.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs font-medium text-[#2E1A0C]"
            >
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive/Historical</option>
              <option value="All">All Records</option>
            </select>
          </div>
        </div>
      </div>

      {/* Salary Structures Table */}
      <div className="bg-[#FAF7F2] rounded-2xl border border-[#D6C4B0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#7C5A3E] font-medium">Loading salary structures...</div>
        ) : salaries.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <DollarSign className="h-8 w-8 text-[#A88B73] mx-auto" />
            <p className="text-sm font-bold text-[#3D2514]">No Salary Structures Found</p>
            <p className="text-xs text-[#7C5A3E]">Click "+ Create Salary Structure" to define pay structures.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EFE6DC] text-[#5C3B21] border-b border-[#D6C4B0] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Applicability Target</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Frequency</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Effective Range</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0D5]">
                {salaries.map((sal) => {
                  const isActive = sal.status === 'Active';
                  return (
                    <tr key={sal.id} className="hover:bg-[#F5EBE0] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#2E1A0C]">
                        {sal.employee_name ? (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200 mb-1">
                              <User className="h-3 w-3 text-[#965E36]" />
                              <span>Employee-Based</span>
                            </span>
                            <div className="text-xs font-bold text-[#2E1A0C]">
                              {sal.employee_name} ({sal.employee_code})
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 mb-1">
                              <Briefcase className="h-3 w-3 text-[#7C5A3E]" />
                              <span>Position-Based</span>
                            </span>
                            <div className="text-xs font-bold text-[#2E1A0C]">
                              {sal.position_name || 'General Position Rate'}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#4A3222] font-semibold">{sal.position_name || 'All Positions'}</td>
                      <td className="py-3 px-4 text-[#6B4B32]">{sal.shift_name || 'All Shifts'}</td>
                      <td className="py-3 px-4 text-[#6B4B32]">{sal.gender_name || 'All Genders'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#E2D2C2] text-[#4A3222] font-bold text-[10px]">
                          {sal.salary_frequency}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold text-[#2E1A0C]">
                        {formatCurrency(sal.salary_amount)}
                      </td>
                      <td className="py-3 px-4 text-[#6B4B32] font-mono text-[11px]">
                        {sal.effective_from ? sal.effective_from.split('T')[0] : '—'}
                        {' → '}
                        {sal.effective_to ? sal.effective_to.split('T')[0] : 'Present'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          <span>{sal.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingSalary(sal);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-[#E2D2C2] hover:bg-[#D6C4B0] text-[#4A3222] transition-colors cursor-pointer"
                          title="Edit / Revise Salary"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(sal)}
                          className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 transition-colors cursor-pointer"
                          title="Delete Salary"
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

      <SalaryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSalary}
        salary={editingSalary}
      />
    </div>
  );
}
