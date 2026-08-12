import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SM01_Suppliers from './pages/SM01_Suppliers';
import TruckMaster from './pages/TruckMaster';
import SM02_Receipts from './pages/SM02_Receipts';
import SM03_Ledger from './pages/SM03_Ledger';
import SM04_Settlements from './pages/SM04_Settlements';

export default function App() {
  const [activeTab, setActiveTab] = useState('sm01');
  const [search, setSearch] = useState('');
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const getHeaderMeta = () => {
    switch (activeTab) {
      case 'sm01':
        return {
          title: 'SM-01: Supplier Directory & Rate Matrix',
          subtitle: 'Manage coir suppliers, categories, and vehicle transport trip rate matrices',
          addActionLabel: 'Add Supplier',
          onAdd: () => setIsAddSupplierModalOpen(true)
        };
      case 'trucks':
        return {
          title: 'Truck Master & Default Trip Rates',
          subtitle: 'Define global transport vehicle types and benchmark trip rates for supplier onboarding',
          addActionLabel: null,
          onAdd: null
        };
      case 'sm02':
        return {
          title: 'SM-02: Material Receipts Management (Goods Inward)',
          subtitle: 'Log inward shipments of Green Husk, Brown Husk, Fuel, and Water with auto-calculated rates & Custom Truck support',
          addActionLabel: null,
          onAdd: null
        };
      case 'sm03':
        return {
          title: 'SM-03: Supplier Payment Ledger',
          subtitle: 'Track delivery liabilities (Owner Owes) vs advance payments & settlements (Owner Paid)',
          addActionLabel: null,
          onAdd: null
        };
      case 'sm04':
        return {
          title: 'SM-04: Account Settlements Hub',
          subtitle: 'Link pending receipt invoices, process settlements, and calculate remaining balances',
          addActionLabel: null,
          onAdd: null
        };
      default:
        return { title: 'Supplier Management', subtitle: '', addActionLabel: null, onAdd: null };
    }
  };

  const headerMeta = getHeaderMeta();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-slate-900 selection:text-white">
      {/* Deep Charcoal Minimalist Sidebar with Parent Menu Group */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={headerMeta.title}
          subtitle={headerMeta.subtitle}
          search={search}
          setSearch={setSearch}
          onAddAction={headerMeta.onAdd}
          addActionLabel={headerMeta.addActionLabel}
          onRefresh={() => setRefreshKey((k) => k + 1)}
        />

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50" key={refreshKey}>
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'sm01' && (
              <SM01_Suppliers
                search={search}
                isAddModalOpen={isAddSupplierModalOpen}
                setIsAddModalOpen={setIsAddSupplierModalOpen}
              />
            )}
            {activeTab === 'trucks' && <TruckMaster />}
            {activeTab === 'sm02' && <SM02_Receipts search={search} />}
            {activeTab === 'sm03' && <SM03_Ledger search={search} />}
            {activeTab === 'sm04' && <SM04_Settlements search={search} />}
          </div>
        </main>
      </div>
    </div>
  );
}
