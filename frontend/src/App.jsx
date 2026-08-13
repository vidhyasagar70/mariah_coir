import React, { useState, useEffect } from 'react';
import Sidebar from './shared/components/Sidebar';
import Header from './shared/components/Header';
import SM01_Suppliers from './modules/supplier/pages/SM01_Suppliers';
import TruckMaster from './modules/supplier/pages/TruckMaster';
import SM02_Receipts from './modules/supplier/pages/SM02_Receipts';
import SM03_Ledger from './modules/supplier/pages/SM03_Ledger';
import SM04_Settlements from './modules/supplier/pages/SM04_Settlements';
import MM01_MaintenanceForm from './modules/maintenance/pages/MM01_MaintenanceForm';
import MM02_MaintenanceRecords from './modules/maintenance/pages/MM02_MaintenanceRecords';

export default function App() {
  const getTabFromHash = () => {
    const hash = window.location.hash.replace('#', '');
    const validTabs = ['sm01', 'trucks', 'sm02', 'sm03', 'sm04', 'mm01', 'mm02'];
    return validTabs.includes(hash) ? hash : 'sm01';
  };

  const [activeTab, setActiveTabState] = useState(getTabFromHash);
  const [search, setSearch] = useState('');
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    const handleHashChange = () => {
      setActiveTabState(getTabFromHash());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const getHeaderMeta = () => {
    switch (activeTab) {
      case 'sm01':
        return {
          title: 'SM-01: Supplier Directory & Rate Matrix',
          subtitle: '',
          addActionLabel: 'Add Supplier',
          onAdd: () => setIsAddSupplierModalOpen(true)
        };
      case 'trucks':
        return {
          title: 'Truck Master & Default Trip Rates',
          subtitle: '',
          addActionLabel: null,
          onAdd: null
        };
      case 'sm02':
        return {
          title: 'SM-02: Material Receipts Management (Goods Inward)',
          subtitle: '',
          addActionLabel: null,
          onAdd: null
        };
      case 'sm03':
        return {
          title: 'SM-03: Supplier Payment Ledger',
          subtitle: '',
          addActionLabel: null,
          onAdd: null
        };
      case 'sm04':
        return {
          title: 'SM-04: Account Settlements Hub',
          subtitle: '',
          addActionLabel: null,
          onAdd: null
        };
      case 'mm01':
        return {
          title: 'Maintenance Entry',
          subtitle: '',
          addActionLabel: null,
          onAdd: null
        };
      case 'mm02':
        return {
          title: 'Maintenance Records',
          subtitle: '',
          addActionLabel: 'Add Maintenance Entry',
          onAdd: () => setActiveTab('mm01')
        };
      default:
        return { title: 'Coir Manufacturing ERP', subtitle: '', addActionLabel: null, onAdd: null };
    }
  };

  const headerMeta = getHeaderMeta();

  return (
    <div className="h-screen bg-[#FAF7F2] text-[#2E1C11] flex font-sans selection:bg-[#965E36] selection:text-white overflow-hidden">
      {/* Light Brown Minimalist Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          title={headerMeta.title}
          subtitle={headerMeta.subtitle}
          search={search}
          setSearch={setSearch}
          onAddAction={headerMeta.onAdd}
          addActionLabel={headerMeta.addActionLabel}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-[#FAF7F2]" key={refreshKey}>
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
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
            {activeTab === 'mm01' && <MM01_MaintenanceForm />}
            {activeTab === 'mm02' && <MM02_MaintenanceRecords search={search} />}
          </div>
        </main>
      </div>
    </div>
  );
}
