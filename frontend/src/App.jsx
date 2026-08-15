import React, { useState, useEffect } from 'react';
import Sidebar from './shared/components/Sidebar';
import Header from './shared/components/Header';
import MM01_MaintenanceForm from './modules/maintenance/pages/MM01_MaintenanceForm';
import MM02_MaintenanceRecords from './modules/maintenance/pages/MM02_MaintenanceRecords';
import MiscellaneousRecords from './modules/miscellaneous/pages/MiscellaneousRecords';
import MiscellaneousEntry from './modules/miscellaneous/pages/MiscellaneousEntry';
import EmployeeLanding from './modules/employee/pages/EmployeeLanding';
import SupplyLanding from './modules/supply/pages/SupplyLanding';

export default function App() {
  const getTabFromHash = () => {
    let rawHash = window.location.hash.replace(/^#\/?/, '').trim();

    if (rawHash === 'miscellaneous/new' || rawHash === 'miscellaneous_new') {
      return 'miscellaneous_new';
    }

    if (rawHash.startsWith('miscellaneous/edit/')) {
      const id = rawHash.replace('miscellaneous/edit/', '');
      return `miscellaneous_edit_${id}`;
    }

    if (rawHash.startsWith('miscellaneous_edit_')) {
      return rawHash;
    }

    if (rawHash.startsWith('employee')) {
      return rawHash;
    }

    if (rawHash.startsWith('supply')) {
      return rawHash;
    }

    // Strip trailing or leading slashes
    const normalized = rawHash.replace(/^\/+|\/+$/g, '');

    const validTabs = ['mm01', 'mm02', 'miscellaneous', 'miscellaneous_new', 'employee', 'supply'];
    const resolvedTab = validTabs.includes(normalized) ? normalized : 'employee';
    
    return resolvedTab;
  };

  const [activeTab, setActiveTabState] = useState(getTabFromHash);
  const [search, setSearch] = useState('');
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

  const handleEditMiscellaneous = (id) => {
    setActiveTab(`miscellaneous_edit_${id}`);
  };

  const getHeaderMeta = () => {
    if (activeTab.startsWith('miscellaneous_edit_')) {
      return {
        title: 'Miscellaneous Entry',
        subtitle: 'Record a miscellaneous business expense',
        addActionLabel: null,
        onAdd: null
      };
    }

    switch (activeTab) {
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
      case 'miscellaneous':
        return {
          title: 'Miscellaneous',
          subtitle: 'Manage miscellaneous business expense records',
          addActionLabel: '+ Miscellaneous Entry',
          onAdd: () => setActiveTab('miscellaneous_new')
        };
      case 'miscellaneous_new':
        return {
          title: 'Miscellaneous Entry',
          subtitle: 'Record a miscellaneous business expense',
          addActionLabel: null,
          onAdd: null
        };
      case 'employee':
        return {
          title: 'Employee & Attendance Module',
          subtitle: 'Manage company employees, positions, shifts, salaries, attendance & reports',
          addActionLabel: null,
          onAdd: null
        };
      case 'supply':
      default:
        return {
          title: 'Supply Management Module',
          subtitle: 'Manage suppliers, raw materials, pricing, accounts & supply entries',
          addActionLabel: null,
          onAdd: null
        };
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
            {activeTab === 'mm01' && <MM01_MaintenanceForm />}
            {activeTab === 'mm02' && <MM02_MaintenanceRecords search={search} />}
            {activeTab === 'miscellaneous' && (
              <MiscellaneousRecords
                searchProp={search}
                onNavigateToNew={() => setActiveTab('miscellaneous_new')}
                onNavigateToEdit={handleEditMiscellaneous}
              />
            )}
            {activeTab === 'miscellaneous_new' && (
              <MiscellaneousEntry
                onNavigateBack={() => setActiveTab('miscellaneous')}
              />
            )}
            {activeTab.startsWith('miscellaneous_edit_') && (
              <MiscellaneousEntry
                editId={activeTab.replace('miscellaneous_edit_', '')}
                onNavigateBack={() => setActiveTab('miscellaneous')}
              />
            )}
            {(activeTab === 'employee' || activeTab.startsWith('employee_')) && (
              <EmployeeLanding search={search} />
            )}
            {(activeTab === 'supply' || activeTab.startsWith('supply_')) && (
              <SupplyLanding search={search} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
