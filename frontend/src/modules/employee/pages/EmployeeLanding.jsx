import React, { useState } from 'react';
import {
  Users, Briefcase, Clock, DollarSign, Calendar, FileText, UserCheck, Layers
} from 'lucide-react';
import EmployeeList from '../components/EmployeeList';
import PositionMaster from '../components/PositionMaster';
import GenderMaster from '../components/GenderMaster';
import ShiftMaster from '../components/ShiftMaster';
import SalaryList from '../components/SalaryList';
import AttendanceManagement from '../components/AttendanceManagement';
import EmployeeReports from '../components/EmployeeReports';

export default function EmployeeLanding({ initialTab = 'employees', search = '' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [trackingMode, setTrackingModeState] = useState(() => {
    return localStorage.getItem('coir_employee_tracking_mode') || 'employee';
  });

  const handleSetTrackingMode = (newMode) => {
    setTrackingModeState(newMode);
    localStorage.setItem('coir_employee_tracking_mode', newMode);
  };

  const navTabs = [
    { id: 'employees', label: 'Employees', icon: Users, desc: 'Workforce Directory' },
    { id: 'positions', label: 'Positions', icon: Briefcase, desc: 'Job Roles Master' },
    { id: 'genders', label: 'Genders', icon: UserCheck, desc: 'Gender Master' },
    { id: 'shifts', label: 'Shifts', icon: Clock, desc: 'Work Shift Timings' },
    { id: 'salaries', label: 'Salaries', icon: DollarSign, desc: 'Pay Structures & History' },
    { id: 'attendance', label: 'Attendance', icon: Calendar, desc: 'Daily & Bulk Attendance' },
    { id: 'reports', label: 'Reports', icon: FileText, desc: 'Attendance & Cost Reports' }
  ];

  return (
    <div className="space-y-6">
      {/* Module Header Banner with Mode Toggle */}
      <div className="bg-[#EFE6DC] p-5 rounded-3xl border border-[#D6C4B0] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-[#965E36] border border-[#7A4A28] flex items-center justify-center text-white shadow-sm shrink-0">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#965E36] bg-[#E2D2C2] px-2 py-0.5 rounded-md border border-[#D6C4B0]">
                HUMAN RESOURCES MODULE
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                trackingMode === 'position'
                  ? 'bg-amber-500/15 text-amber-800 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30'
              }`}>
                {trackingMode === 'position' ? '💼 Position-Based Mode' : '👤 Employee-Based Mode'}
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-[#2E1A0C] tracking-tight mt-0.5">
              Employee & Attendance Hub
            </h1>
            <p className="text-xs text-[#7C5A3E]">
              Manage employees, master positions, work shifts, salary structures, daily attendance & reports.
            </p>
          </div>
        </div>

        {/* Segmented Mode Toggle Switch */}
        <div className="bg-[#E2D2C2] p-1 rounded-2xl border border-[#D6C4B0] flex items-center space-x-1 shadow-inner shrink-0">
          <button
            onClick={() => handleSetTrackingMode('employee')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              trackingMode === 'employee'
                ? 'bg-[#965E36] text-white shadow-sm'
                : 'text-[#5C3B21] hover:text-[#2E1A0C]'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Employee Based</span>
          </button>
          <button
            onClick={() => handleSetTrackingMode('position')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              trackingMode === 'position'
                ? 'bg-[#965E36] text-white shadow-sm'
                : 'text-[#5C3B21] hover:text-[#2E1A0C]'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>Position Based</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tab Bar */}
      <div className="bg-[#EFE6DC] p-1.5 rounded-2xl border border-[#D6C4B0] flex items-center space-x-1 overflow-x-auto shadow-2xs">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#965E36] text-white shadow-xs'
                  : 'text-[#5C3B21] hover:bg-[#E2D2C2] hover:text-[#2E1A0C]'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-[#7C5A3E]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="pt-1">
        {activeTab === 'employees' && <EmployeeList externalSearch={search} trackingMode={trackingMode} />}
        {activeTab === 'positions' && <PositionMaster trackingMode={trackingMode} />}
        {activeTab === 'genders' && <GenderMaster trackingMode={trackingMode} />}
        {activeTab === 'shifts' && <ShiftMaster trackingMode={trackingMode} />}
        {activeTab === 'salaries' && <SalaryList trackingMode={trackingMode} />}
        {activeTab === 'attendance' && <AttendanceManagement trackingMode={trackingMode} />}
        {activeTab === 'reports' && <EmployeeReports trackingMode={trackingMode} />}
      </div>
    </div>
  );
}
