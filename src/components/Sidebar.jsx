import React from 'react';
import { LayoutDashboard, Users, Truck, BookOpen, Scale, ChevronRight } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Overview',
      code: 'ERP-00',
      icon: LayoutDashboard,
      desc: 'KPIs & Supply Summary'
    },
    {
      id: 'supplier-management',
      label: 'Supplier Management',
      code: 'SM-MAIN',
      icon: Users,
      desc: 'Raw Material, Pricing & Ledger'
    },
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
      desc: 'Advances & Balance'
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
    <aside className="w-64 bg-slate-900/60 border-r border-slate-800/80 flex flex-col p-4 space-y-6 select-none shrink-0">
      <div className="px-2 pt-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Modules</span>
      </div>

      <nav className="space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-950/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3 text-left">
                <div
                  className={`p-2 rounded-lg ${
                    isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800/80 text-slate-400'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-mono font-bold text-slate-500">{item.code}</span>
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate max-w-[120px]">{item.desc}</p>
                </div>
              </div>
              {isActive && <ChevronRight className="h-4 w-4 text-emerald-400 shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* Module Footer Card */}
      <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span>Coir ERP System</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Green Husk, Brown Husk, Fuel & Water Log Matrix with Linked Account Settlements.
        </p>
      </div>
    </aside>
  );
}
