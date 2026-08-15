import React, { useState } from 'react';
import {
  Truck, Package, Users, DollarSign, FileText, Layers, CreditCard, BarChart3, Settings
} from 'lucide-react';
import RawMaterialMaster from '../components/RawMaterialMaster';
import VehicleTypeMaster from '../components/VehicleTypeMaster';
import SupplierMaster from '../components/SupplierMaster';
import VehicleMaster from '../components/VehicleMaster';
import PricingMaster from '../components/PricingMaster';
import AccountManagement from '../components/AccountManagement';
import SupplyEntries from '../components/SupplyEntries';
import SupplyReports from '../components/SupplyReports';

export default function SupplyLanding({ search = '' }) {
  const [activeTab, setActiveTab] = useState('entries');

  const navTabs = [
    { id: 'entries', label: 'Supply Entries', icon: FileText, desc: 'Incoming Material Receipts' },
    { id: 'suppliers', label: 'Suppliers', icon: Users, desc: 'Vendor Directory' },
    { id: 'raw-materials', label: 'Raw Materials', icon: Package, desc: 'Material Master' },
    { id: 'vehicle-types', label: 'Vehicle Types', icon: Truck, desc: 'Transport Categories' },
    { id: 'vehicles', label: 'Vehicles', icon: Layers, desc: 'Supplier Fleet' },
    { id: 'pricing', label: 'Pricing', icon: DollarSign, desc: 'Rate Configuration' },
    { id: 'accounts', label: 'Accounts', icon: CreditCard, desc: 'Payables & Advances' },
    { id: 'reports', label: 'Reports', icon: BarChart3, desc: 'Analytics & Summary' }
  ];

  return (
    <div className="space-y-6">
      {/* Module Header Banner */}
      <div className="bg-[#EFE6DC] p-5 rounded-3xl border border-[#D6C4B0] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="h-12 w-12 rounded-2xl bg-[#965E36] border border-[#7A4A28] flex items-center justify-center text-white shadow-sm shrink-0">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#965E36] bg-[#E2D2C2] px-2 py-0.5 rounded-md border border-[#D6C4B0]">
                SUPPLY MANAGEMENT MODULE
              </span>
            </div>
            <h1 className="text-xl font-extrabold text-[#2E1A0C] tracking-tight mt-0.5">
              Supply & Procurement Hub
            </h1>
            <p className="text-xs text-[#7C5A3E]">
              Manage suppliers, raw materials, vehicle types, pricing, accounts & supply receipts.
            </p>
          </div>
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
        {activeTab === 'entries' && <SupplyEntries />}
        {activeTab === 'suppliers' && <SupplierMaster />}
        {activeTab === 'raw-materials' && <RawMaterialMaster />}
        {activeTab === 'vehicle-types' && <VehicleTypeMaster />}
        {activeTab === 'vehicles' && <VehicleMaster />}
        {activeTab === 'pricing' && <PricingMaster />}
        {activeTab === 'accounts' && <AccountManagement />}
        {activeTab === 'reports' && <SupplyReports />}
      </div>
    </div>
  );
}
