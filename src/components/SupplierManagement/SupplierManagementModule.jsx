import { useState } from 'react';
import UnitsView from './UnitsView';
import RawMaterialsView from './RawMaterialsView';
import VehicleTypesView from './VehicleTypesView';
import VehiclesView from './VehiclesView';
import PricingView from './PricingView';
import SuppliersView from './SuppliersView';
import SupplierDetailPage from './SupplierDetailPage';
import AccountsView from './AccountsView';
import SupplyEntriesView from './SupplyEntriesView';
import {
  Scale, Box, Truck, Tag, Users, BookOpen, ClipboardList
} from 'lucide-react';

export default function SupplierManagementModule({ initialTab = 'supply-entries' }) {
  const [activeSubTab, setActiveSubTab] = useState(initialTab);

  // Detail view states
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);

  const handleSelectSupplierDetail = (id) => {
    setSelectedSupplierId(id);
    setActiveSubTab('supplier-detail');
  };

  const handleViewAccount = (id) => {
    setSelectedSupplierId(id);
    setActiveSubTab('accounts');
  };

  const tabs = [
    { id: 'units', label: 'Units', icon: Scale },
    { id: 'raw-materials', label: 'Raw Materials', icon: Box },
    { id: 'vehicle-types', label: 'Vehicle Types', icon: Truck },
    { id: 'vehicles', label: 'Vehicles', icon: Truck },
    { id: 'pricing', label: 'Product Pricing', icon: Tag },
    { id: 'suppliers', label: 'Suppliers', icon: Users },
    { id: 'accounts', label: 'Supplier Accounts', icon: BookOpen },
    { id: 'supply-entries', label: 'Supply Entries', icon: ClipboardList }
  ];

  return (
    <div className="space-y-6">
      {/* Sub-Module Navigation Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-2xl flex items-center justify-between overflow-x-auto select-none gap-2 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeSubTab === t.id || (t.id === 'suppliers' && activeSubTab === 'supplier-detail');
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (t.id === 'suppliers') setSelectedSupplierId(null);
                  setActiveSubTab(t.id);
                }}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Active View */}
      <div className="transition-all duration-300">
        {activeSubTab === 'units' && <UnitsView />}
        {activeSubTab === 'raw-materials' && <RawMaterialsView />}
        {activeSubTab === 'vehicle-types' && <VehicleTypesView />}
        {activeSubTab === 'vehicles' && <VehiclesView />}
        {activeSubTab === 'pricing' && <PricingView />}
        {activeSubTab === 'suppliers' && (
          <SuppliersView
            onSelectSupplier={handleSelectSupplierDetail}
            onViewAccount={handleViewAccount}
          />
        )}
        {activeSubTab === 'supplier-detail' && (
          <SupplierDetailPage
            supplierId={selectedSupplierId}
            onBack={() => setActiveSubTab('suppliers')}
            onViewAccount={handleViewAccount}
          />
        )}
        {activeSubTab === 'accounts' && (
          <AccountsView selectedSupplierId={selectedSupplierId} />
        )}
        {activeSubTab === 'supply-entries' && (
          <SupplyEntriesView onSelectSupplier={handleSelectSupplierDetail} />
        )}
      </div>
    </div>
  );
}
