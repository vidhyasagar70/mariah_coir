import React, { useState } from 'react';
import { Factory, Database, RefreshCw, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';
import api from '../api/client';

export default function Navbar({ onRefresh }) {
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      await api.post('/seed');
      setSeedSuccess(true);
      if (onRefresh) onRefresh();
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to seed data:', err);
      alert('Error seeding sample data: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/85 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between shadow-lg">
      {/* Brand & App Title */}
      <div className="flex items-center space-x-3.5">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-amber-500 p-0.5 shadow-md shadow-emerald-950/50">
          <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
            <Factory className="h-5 w-5 text-emerald-400" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-slate-100 text-lg tracking-tight">CoirCraft ERP</h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
              Supplier Module
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Coir Manufacturing Supply Chain & Financial Ledger</p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-3">
        {/* Status Indicator */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-medium text-slate-300">PostgreSQL / Supabase Active</span>
        </div>

        {/* Demo Data Seeder Button */}
        <button
          onClick={handleSeedData}
          disabled={seeding}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/50 transition-all border border-emerald-400/20 disabled:opacity-50 cursor-pointer"
        >
          {seeding ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : seedSuccess ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-200" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          )}
          <span>{seeding ? 'Seeding...' : seedSuccess ? 'Data Reset Complete!' : 'Reset Demo Data'}</span>
        </button>
      </div>
    </header>
  );
}
