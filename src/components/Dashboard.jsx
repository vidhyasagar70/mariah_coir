import React, { useEffect, useState } from 'react';
import { Users, Truck, BookOpen, Scale, ArrowUpRight, ArrowDownRight, Layers, Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../api/client';
import { formatCurrency, formatDate, getMaterialBadgeClass, getStatusBadgeClass } from '../utils/formatters';

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [recentReceipts, setRecentReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, receiptsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/receipts')
      ]);
      setStats(statsRes.data);
      setRecentReceipts(receiptsRes.data.slice(0, 5));
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 space-x-2">
        <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
        <span>Loading Executive Coir Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800/90 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none"></div>
        <div className="space-y-1 relative z-10">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Coir Manufacturing ERP
            </span>
            <span className="text-xs text-slate-400">Live Financial & Inward Sync</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Supplier Operations & Ledger Hub</h2>
          <p className="text-sm text-slate-400 max-w-xl">
            Real-time material delivery logs (Green Husk, Brown Husk, Fuel & Water) with automated vehicle trip rate calculations and account settlement linkage.
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex items-center space-x-3 relative z-10">
          <button
            onClick={() => onNavigate('sm02')}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
          >
            <Truck className="h-4 w-4" />
            <span>Record Material Receipt</span>
          </button>
          <button
            onClick={() => onNavigate('sm04')}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
          >
            <Scale className="h-4 w-4 text-emerald-400" />
            <span>Settle Accounts</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Suppliers */}
        <div
          onClick={() => onNavigate('sm01')}
          className="p-5 rounded-2xl glass-card hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Suppliers</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">{stats?.activeSuppliersCount || 0}</span>
            <div className="mt-1 flex items-center space-x-1 text-xs text-emerald-400">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Verified Rate Matrices</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Deliveries Value */}
        <div
          onClick={() => onNavigate('sm02')}
          className="p-5 rounded-2xl glass-card hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Goods Inward</span>
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 transition-colors">
              <Truck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">{formatCurrency(stats?.totalReceiptsValue)}</span>
            <div className="mt-1 flex items-center space-x-1 text-xs text-sky-400">
              <span className="font-semibold">{stats?.totalReceiptsCount || 0}</span>
              <span className="text-slate-400">receipts recorded</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Owner Owes */}
        <div
          onClick={() => onNavigate('sm03')}
          className="p-5 rounded-2xl glass-card hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Owner Owes (Deliveries)</span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-amber-400 tracking-tight">{formatCurrency(stats?.totalOwnerOwes)}</span>
            <div className="mt-1 flex items-center space-x-1 text-xs text-amber-400/90">
              <ArrowUpRight className="h-3.5 w-3.5" />
              <span>Gross Delivery Ledger</span>
            </div>
          </div>
        </div>

        {/* Card 4: Net Outstanding Balance */}
        <div
          onClick={() => onNavigate('sm04')}
          className="p-5 rounded-2xl glass-card hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Outstanding Payable</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20 transition-colors">
              <Scale className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-rose-400 tracking-tight">{formatCurrency(stats?.netOutstandingBalance)}</span>
            <div className="mt-1 flex items-center space-x-1 text-xs text-rose-400/90">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Pending Settle Amount</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Material Breakdown & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Material Inward Breakdown */}
        <div className="p-5 rounded-2xl glass-panel space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              <h3 className="font-bold text-slate-100 text-sm">Material Inward Summary</h3>
            </div>
            <span className="text-xs text-slate-400">By Commodity</span>
          </div>

          <div className="space-y-3">
            {stats?.materialBreakdown?.map((mat) => (
              <div key={mat.material_type} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div className="space-y-1">
                  <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md border ${getMaterialBadgeClass(mat.material_type)}`}>
                    {mat.material_type}
                  </span>
                  <div className="text-[11px] text-slate-400">
                    {mat.total_trips} vehicle trip(s) • {mat.receipt_count} receipt(s)
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-200">{formatCurrency(mat.total_val)}</span>
                </div>
              </div>
            ))}
            {(!stats?.materialBreakdown || stats.materialBreakdown.length === 0) && (
              <div className="text-xs text-slate-500 py-4 text-center">No material receipts recorded yet.</div>
            )}
          </div>
        </div>

        {/* Recent Goods Inward Feed */}
        <div className="lg:col-span-2 p-5 rounded-2xl glass-panel space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Truck className="h-4 w-4 text-sky-400" />
              <h3 className="font-bold text-slate-100 text-sm">Recent Material Receipts (Goods Inward)</h3>
            </div>
            <button
              onClick={() => onNavigate('sm02')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              View All Receipts &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="pb-2.5">Receipt ID</th>
                  <th className="pb-2.5">Supplier</th>
                  <th className="pb-2.5">Material</th>
                  <th className="pb-2.5">Trips & Rate</th>
                  <th className="pb-2.5">Total Value</th>
                  <th className="pb-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-mono font-bold text-emerald-400">{r.id}</td>
                    <td className="py-3 font-medium text-slate-200">
                      <div>{r.supplier_name}</div>
                      <div className="text-[11px] text-slate-500">{r.supplier_id}</div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getMaterialBadgeClass(r.material_type)}`}>
                        {r.material_type}
                      </span>
                    </td>
                    <td className="py-3 text-slate-300">
                      <div>{r.trip_count} trip(s) × {formatCurrency(r.rate_per_trip)}</div>
                      <div className="text-[11px] text-slate-500">{r.vehicle_type}</div>
                    </td>
                    <td className="py-3 font-bold text-slate-100">{formatCurrency(r.total_amount)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusBadgeClass(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
