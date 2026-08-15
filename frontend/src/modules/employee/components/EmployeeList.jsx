import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, CheckCircle, XCircle, Users, UserCheck,
  UserX, Phone, Calendar, Briefcase, Clock, Eye, X
} from 'lucide-react';
import EmployeeModal from './EmployeeModal';

export default function EmployeeList({ externalSearch, trackingMode = 'employee' }) {
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState({ totalEmployees: 0, activeEmployees: 0, inactiveEmployees: 0 });
  const [loading, setLoading] = useState(true);

  // Master options for filter dropdowns
  const [positions, setPositions] = useState([]);
  const [genders, setGenders] = useState([]);
  const [shifts, setShifts] = useState([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchMasterDropdowns();
  }, []);

  useEffect(() => {
    if (externalSearch !== undefined) {
      setSearch(externalSearch);
    }
  }, [externalSearch]);

  useEffect(() => {
    fetchEmployees();
  }, [search, positionFilter, genderFilter, shiftFilter, statusFilter]);

  const fetchMasterDropdowns = async () => {
    try {
      const [posRes, genRes, shRes] = await Promise.all([
        fetch('/api/positions'),
        fetch('/api/genders'),
        fetch('/api/shifts')
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
      console.error('Failed to fetch master data for employee filters:', e);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        search,
        position_id: positionFilter,
        gender_id: genderFilter,
        shift_id: shiftFilter,
        employment_status: statusFilter
      }).toString();

      const res = await fetch(`/api/employees?${query}`);
      const data = await res.json();

      if (res.ok) {
        setEmployees(data.records || []);
        setSummary(data.summary || { totalEmployees: 0, activeEmployees: 0, inactiveEmployees: 0 });
      } else {
        showNotification(data.error || 'Failed to fetch employees.', 'error');
      }
    } catch (err) {
      showNotification('Network error while fetching employee directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveEmployee = async (formData) => {
    const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : '/api/employees';
    const method = editingEmployee ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to save employee.');
    }

    showNotification(data.message || 'Employee record saved successfully.');
    fetchEmployees();
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`Are you sure you want to deactivate/delete employee '${emp.full_name}' (${emp.employee_code})?`)) return;

    try {
      const res = await fetch(`/api/employees/${emp.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        showNotification(data.message || 'Employee record deleted successfully.');
        fetchEmployees();
      } else {
        showNotification(data.error || 'Failed to delete employee.', 'error');
      }
    } catch (err) {
      showNotification('Error deleting employee record.', 'error');
    }
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#EFE6DC] p-4 rounded-2xl border border-[#D6C4B0] flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#7C5A3E]">Total Workforce</p>
            <h3 className="text-2xl font-extrabold text-[#2E1A0C] mt-0.5">{summary.totalEmployees}</h3>
          </div>
          <div className="p-3 rounded-xl bg-[#965E36] text-white shadow-xs">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#EFE6DC] p-4 rounded-2xl border border-[#D6C4B0] flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Active Employees</p>
            <h3 className="text-2xl font-extrabold text-emerald-900 mt-0.5">{summary.activeEmployees}</h3>
          </div>
          <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-xs">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#EFE6DC] p-4 rounded-2xl border border-[#D6C4B0] flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Inactive Employees</p>
            <h3 className="text-2xl font-extrabold text-rose-900 mt-0.5">{summary.inactiveEmployees}</h3>
          </div>
          <div className="p-3 rounded-xl bg-rose-600 text-white shadow-xs">
            <UserX className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-[#EFE6DC] p-4 rounded-2xl border border-[#D6C4B0] space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8C694E]" />
            <input
              type="text"
              placeholder="Search employee, ID, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36]"
            />
          </div>

          <button
            onClick={() => {
              setEditingEmployee(null);
              setIsModalOpen(true);
            }}
            className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-bold shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Employee</span>
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#D6C4B0]/60">
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
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Gender</label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C] font-medium"
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
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Shift</label>
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C] font-medium"
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
            <label className="block text-[10px] font-bold uppercase text-[#7C5A3E] mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1A0C] font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employees Data Table */}
      <div className="bg-[#FAF7F2] rounded-2xl border border-[#D6C4B0] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#7C5A3E] font-medium">Loading employee directory...</div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="h-8 w-8 text-[#A88B73] mx-auto" />
            <p className="text-sm font-bold text-[#3D2514]">No Employee Records Found</p>
            <p className="text-xs text-[#7C5A3E]">
              Adjust your search/filters or click "+ Add Employee" to create an employee record.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#EFE6DC] text-[#5C3B21] border-b border-[#D6C4B0] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Employee ID</th>
                  <th className="py-3 px-4">Employee Name</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-4">Default Shift</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE0D5]">
                {employees.map((emp) => {
                  const isActive = emp.employment_status === 'Active';
                  return (
                    <tr key={emp.id} className="hover:bg-[#F5EBE0] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#965E36]">{emp.employee_code}</td>
                      <td className="py-3 px-4 font-bold text-[#2E1A0C]">{emp.full_name}</td>
                      <td className="py-3 px-4 text-[#6B4B32]">{emp.gender_name || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-[#E2D2C2] text-[#4A3222] font-semibold text-[10px]">
                          <Briefcase className="h-3 w-3 text-[#7C5A3E]" />
                          <span>{emp.position_name || '—'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center space-x-1 text-[#3D2514] font-medium text-[11px]">
                          <Clock className="h-3 w-3 text-[#965E36]" />
                          <span>{emp.shift_name || '—'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#6B4B32] font-mono">
                        {emp.phone ? (
                          <span className="flex items-center space-x-1">
                            <Phone className="h-3 w-3 text-[#7C5A3E]" />
                            <span>{emp.phone}</span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#6B4B32] font-mono">
                        {emp.joining_date ? emp.joining_date.split('T')[0] : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isActive ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          <span>{emp.employment_status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => setViewingEmployee(emp)}
                          className="p-1.5 rounded-lg bg-[#E2D2C2] hover:bg-[#D6C4B0] text-[#4A3222] transition-colors cursor-pointer"
                          title="View Employee Profile"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingEmployee(emp);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-[#E2D2C2] hover:bg-[#D6C4B0] text-[#4A3222] transition-colors cursor-pointer"
                          title="Edit Employee"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp)}
                          className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 transition-colors cursor-pointer"
                          title="Delete Employee"
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

      {/* Employee Quick View Drawer / Modal */}
      {viewingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C120C]/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FAF7F2] rounded-2xl border border-[#D6C4B0] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-[#EFE6DC] px-6 py-4 border-b border-[#D6C4B0] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-[#965E36] text-white">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-[#2E1A0C] text-base">{viewingEmployee.full_name}</h3>
                  <p className="text-xs font-mono font-semibold text-[#7C5A3E]">{viewingEmployee.employee_code}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingEmployee(null)}
                className="p-1 rounded-lg text-[#7C5A3E] hover:text-[#2E1A0C] hover:bg-[#E2D2C2] transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-[#2E1A0C]">
              <div className="grid grid-cols-2 gap-4 bg-[#EFE6DC]/50 p-4 rounded-xl border border-[#D6C4B0]">
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#7C5A3E]">Position</p>
                  <p className="font-bold text-sm text-[#3D2514]">{viewingEmployee.position_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#7C5A3E]">Gender</p>
                  <p className="font-semibold text-sm text-[#3D2514]">{viewingEmployee.gender_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#7C5A3E]">Default Shift</p>
                  <p className="font-semibold text-sm text-[#3D2514]">{viewingEmployee.shift_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#7C5A3E]">Status</p>
                  <span
                    className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      viewingEmployee.employment_status === 'Active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {viewingEmployee.employment_status}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between py-1 border-b border-[#EAE0D5]">
                  <span className="text-[#7C5A3E] font-medium">Joining Date</span>
                  <span className="font-bold">{viewingEmployee.joining_date ? viewingEmployee.joining_date.split('T')[0] : '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EAE0D5]">
                  <span className="text-[#7C5A3E] font-medium">Date of Birth</span>
                  <span className="font-semibold">{viewingEmployee.date_of_birth ? viewingEmployee.date_of_birth.split('T')[0] : '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#EAE0D5]">
                  <span className="text-[#7C5A3E] font-medium">Phone</span>
                  <span className="font-mono font-semibold">{viewingEmployee.phone || '—'}</span>
                </div>
                <div className="py-1">
                  <span className="text-[#7C5A3E] font-medium block mb-0.5">Address</span>
                  <span className="font-medium text-[#4A3222]">{viewingEmployee.address || '—'}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setViewingEmployee(null)}
                  className="px-4 py-2 rounded-xl bg-[#965E36] text-white font-bold cursor-pointer"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEmployee}
        employee={editingEmployee}
      />
    </div>
  );
}
