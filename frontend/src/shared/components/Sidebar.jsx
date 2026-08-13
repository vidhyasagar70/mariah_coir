import React, { useState } from 'react';
import { Users, Truck, BookOpen, Scale, Factory, ChevronRight, ChevronDown, Layers, SlidersHorizontal, X, Wrench, ClipboardList } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, isMobileOpen, setIsMobileOpen }) {
  const [isSupplierMenuOpen, setIsSupplierMenuOpen] = useState(true);
  const [isMaintenanceMenuOpen, setIsMaintenanceMenuOpen] = useState(true);

  const supplierSubNav = [
    {
      id: 'sm01',
      label: 'Supplier Directory',
      code: 'SM-01',
      icon: Users,
      desc: 'Suppliers & Rate Matrix'
    },
    {
      id: 'trucks',
      label: 'Truck Master',
      code: 'SM-TM',
      icon: Truck,
      desc: 'Vehicle Types & Rates'
    },
    {
      id: 'sm02',
      label: 'Material Receipts',
      code: 'SM-02',
      icon: Layers,
      desc: 'Goods Inward Entry'
    },
    {
      id: 'sm03',
      label: 'Payment Ledger',
      code: 'SM-03',
      icon: BookOpen,
      desc: 'Advances & Liabilities'
    },
    {
      id: 'sm04',
      label: 'Account Settlements',
      code: 'SM-04',
      icon: Scale,
      desc: 'Invoice Settle Hub'
    }
  ];

  const maintenanceSubNav = [
    {
      id: 'mm02',
      label: 'Maintenance',
      code: 'MM',
      icon: Wrench,
      desc: 'Log & Expense Hub'
    }
  ];

  const handleSelectTab = (id) => {
    setActiveTab(id);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  const sidebarContent = (
    <>
      {/* Brand Header */}
      <div className="flex items-center justify-between px-1.5 pt-1">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-[#965E36] border border-[#7A4A28] flex items-center justify-center text-white font-bold shadow-sm shrink-0">
            <Factory className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-[#2E1A0C] text-sm tracking-tight truncate">CoirCraft ERP</h1>
            <span className="text-[10px] font-semibold text-[#7C5A3E] block truncate">Coir Manufacturing</span>
          </div>
        </div>

        {/* Close Button on Mobile Drawer */}
        {setIsMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden p-1 rounded-lg text-[#7C5A3E] hover:text-[#2E1A0C] hover:bg-[#E2D2C2] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Navigation Groups */}
      <div className="space-y-4 flex-1 overflow-y-auto pr-0.5">
        {/* Parent Category 1: SUPPLIER MANAGEMENT */}
        <div className="space-y-1">
          <button
            onClick={() => setIsSupplierMenuOpen(!isSupplierMenuOpen)}
            className="w-full flex items-center justify-between px-1.5 py-1 text-[#7C5A3E] hover:text-[#2E1A0C] transition-colors cursor-pointer"
          >
            <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-[#7C5A3E]">
              <span>Supplier Management</span>
            </div>
            {isSupplierMenuOpen ? (
              <ChevronDown className="h-3 w-3 text-[#7C5A3E]" />
            ) : (
              <ChevronRight className="h-3 w-3 text-[#7C5A3E]" />
            )}
          </button>

          {/* Sub-menus */}
          {isSupplierMenuOpen && (
            <div className="space-y-1 pl-0.5">
              {supplierSubNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-[#965E36] text-white font-semibold shadow-xs border border-[#7A4A28]'
                        : 'text-[#5C3B21] hover:text-[#2E1A0C] hover:bg-[#E2D2C2] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 text-left min-w-0">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isActive ? 'bg-[#7A4A28] text-white' : 'bg-[#E2D2C2] text-[#6B4426]'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1">
                          <span className={`text-[9px] font-mono font-bold ${isActive ? 'text-[#F5EBE6]' : 'text-[#7C5A3E]'}`}>{item.code}</span>
                          <span className="text-xs font-medium truncate">{item.label}</span>
                        </div>
                        <p className={`text-[10px] truncate max-w-[115px] ${isActive ? 'text-[#EBE0D8]' : 'text-[#8C694E]'}`}>{item.desc}</p>
                      </div>
                    </div>
                    {isActive && <ChevronRight className="h-3 w-3 text-white shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Parent Category 2: MAINTENANCE MANAGEMENT */}
        <div className="space-y-1 pt-1 border-t border-[#D6C4B0]/60">
          <button
            onClick={() => setIsMaintenanceMenuOpen(!isMaintenanceMenuOpen)}
            className="w-full flex items-center justify-between px-1.5 py-1 text-[#7C5A3E] hover:text-[#2E1A0C] transition-colors cursor-pointer"
          >
            <div className="flex items-center text-[10px] font-bold uppercase tracking-wider text-[#7C5A3E]">
              <span>Maintenance Management</span>
            </div>
            {isMaintenanceMenuOpen ? (
              <ChevronDown className="h-3 w-3 text-[#7C5A3E]" />
            ) : (
              <ChevronRight className="h-3 w-3 text-[#7C5A3E]" />
            )}
          </button>

          {/* Sub-menus */}
          {isMaintenanceMenuOpen && (
            <div className="space-y-1 pl-0.5">
              {maintenanceSubNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-[#965E36] text-white font-semibold shadow-xs border border-[#7A4A28]'
                        : 'text-[#5C3B21] hover:text-[#2E1A0C] hover:bg-[#E2D2C2] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 text-left min-w-0">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isActive ? 'bg-[#7A4A28] text-white' : 'bg-[#E2D2C2] text-[#6B4426]'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1">
                          <span className={`text-[9px] font-mono font-bold ${isActive ? 'text-[#F5EBE6]' : 'text-[#7C5A3E]'}`}>{item.code}</span>
                          <span className="text-xs font-medium truncate">{item.label}</span>
                        </div>
                        <p className={`text-[10px] truncate max-w-[115px] ${isActive ? 'text-[#EBE0D8]' : 'text-[#8C694E]'}`}>{item.desc}</p>
                      </div>
                    </div>
                    {isActive && <ChevronRight className="h-3 w-3 text-white shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 rounded-xl bg-[#E4D4C4] border border-[#D6C4B0] space-y-0.5">
        <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-[#3D2514]">
          <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0"></span>
          <span className="truncate">Express REST Connected</span>
        </div>
        <p className="text-[10px] text-[#7C5A3E] leading-tight truncate">
          Coir Manufacturing ERP v1.0
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on small screens, flex on md+) */}
      <aside className="hidden md:flex w-[234px] h-screen bg-[#EFE6DC] border-r border-[#D6C4B0] text-[#3D2514] flex-col p-3 space-y-5 select-none shrink-0 sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Overlay Drawer (md:hidden) */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#1C120C]/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Panel */}
          <aside className="relative z-50 w-[234px] bg-[#EFE6DC] border-r border-[#D6C4B0] text-[#3D2514] flex flex-col p-3 space-y-5 select-none h-full shadow-2xl animate-fade-in">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
