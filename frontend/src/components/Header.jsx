import React, { useState } from 'react';
import { Search, Plus, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function Header({ title, subtitle, search, setSearch, onAddAction, addActionLabel, onRefresh }) {
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      await api.post('/seed');
      setSeedSuccess(true);
      if (onRefresh) onRefresh();
      setTimeout(() => setSeedSuccess(false), 2500);
    } catch (err) {
      console.error('Error seeding data:', err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 shadow-xs">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center space-x-3">
        {/* Search Input */}
        {search !== undefined && setSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 transition-all"
            />
          </div>
        )}

        {/* Demo Data Seeder Button */}
        <button
          onClick={handleSeedData}
          disabled={seeding}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          title="Reset sample Coir ERP database"
        >
          {seeding ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-600" />
          ) : seedSuccess ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span>{seeding ? 'Seeding...' : seedSuccess ? 'Reset Complete' : 'Reset Sample Data'}</span>
        </button>

        {/* Primary Action Button */}
        {onAddAction && addActionLabel && (
          <button
            onClick={onAddAction}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>{addActionLabel}</span>
          </button>
        )}
      </div>
    </header>
  );
}
