import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SupplierList from './components/SM01_Suppliers/SupplierList';
import ReceiptList from './components/SM02_Receipts/ReceiptList';
import LedgerView from './components/SM03_Ledger/LedgerView';
import SettlementHub from './components/SM04_Settlements/SettlementHub';
import SupplierManagementModule from './components/SupplierManagement/SupplierManagementModule';

export default function App() {
  const [activeTab, setActiveTab] = useState('supplier-management');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleGlobalRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Navbar onRefresh={handleGlobalRefresh} />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Content View Container */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950/90">
          <div className="max-w-7xl mx-auto space-y-6" key={refreshKey}>
            {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
            {activeTab === 'supplier-management' && <SupplierManagementModule />}
            {activeTab === 'sm01' && <SupplierList />}
            {activeTab === 'sm02' && <ReceiptList />}
            {activeTab === 'sm03' && <LedgerView />}
            {activeTab === 'sm04' && <SettlementHub />}
          </div>
        </main>
      </div>
    </div>
  );
}
