import React from 'react';
import { Users, Truck, BookOpen, Scale, Factory, ChevronRight } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    {
      id: 'sm01',
      label: 'Supplier Directory',
      code: 'SM-01',
      icon: Users,
      desc: 'Suppliers & Rate Matrix'
    },
    {
      id: 'sm02',
      label: 'Material Receipts',
      code: 'SM-02',
      icon: Truck,
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

  return (
    <aside className="w-64 bg-[#0B0F17] border-r border-slate-800 text-slate-300 flex flex-col p-4 space-y-6 select-none shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="flex items-center space-x-3 px-2 pt-2">
        <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center text-slate-950 font-bold shadow-md">
          <Factory className="h-5 w-5 text-slate-950" />
        </div>
        <div>
          <h1 className="font-bold text-white text-base tracking-tight">CoirCraft ERP</h1>
          <span className="text-[11px] font-semibold text-slate-400">Supplier Management</span>
        </div>
      </div>

      <div className="px-2 pt-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ERP Modules</span>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-white font-semibold shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3 text-left">
                <div
                  className={`p-2 rounded-lg ${
                    isActive ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-mono font-bold text-slate-400">{item.code}</span>
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate max-w-[120px]">{item.desc}</p>
                </div>
              </div>
              {isActive && <ChevronRight className="h-4 w-4 text-white shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
        <div className="flex items-center space-x-2 text-xs font-medium text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          <span>Express REST Connected</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-tight">
          Coir Manufacturing ERP System v1.0
        </p>
      </div>
    </aside>
  );
}
