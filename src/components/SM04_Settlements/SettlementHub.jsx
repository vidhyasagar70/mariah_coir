import React, { useState, useEffect } from 'react';
import { Scale, Plus, Filter, Calendar, Eye, FileText, CheckCircle2, DollarSign } from 'lucide-react';
import api from '../../api/client';
import { formatCurrency, formatDate } from '../../utils/formatters';
import NewSettlementModal from './NewSettlementModal';
import SettlementDetailModal from './SettlementDetailModal';

export default function SettlementHub() {
  const [settlements, setSettlements] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter
  const [supplierFilter, setSupplierFilter] = useState('All');

  // Modals
  const [isNewSettlementModalOpen, setIsNewSettlementModalOpen] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchSettlements = async () => {
    try {
      setLoading(true);
      const params = {};
      if (supplierFilter !== 'All') params.supplier_id = supplierFilter;

      const res = await api.get('/settlements', { params });
      setSettlements(res.data);
    } catch (err) {
      console.error('Error fetching settlements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    fetchSettlements();
  }, [supplierFilter]);

  const totalSettledAmount = settlements.reduce((sum, s) => sum + parseFloat(s.amount_paid || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              SM-04
            </span>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Account Settlements Hub</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Perform partial or full settlements, link material receipt invoices (`linked_invoices`), and manage remaining balances.
          </p>
        </div>

        <button
          onClick={() => setIsNewSettlementModalOpen(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/50 cursor-pointer transition-all shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Account Settlement</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl glass-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Settlements Processed</span>
            <div className="text-xl font-bold text-white mt-1">{settlements.length} <span className="text-xs font-normal text-slate-400">vouchers generated</span></div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Scale className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Disbursed Settlement Amount</span>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-1">{formatCurrency(totalSettledAmount)}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Supplier Filter Bar */}
      <div className="p-4 rounded-2xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-xs font-semibold text-slate-300">Filter Settlements by Supplier:</span>
        </div>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-medium sm:w-72"
        >
          <option value="All">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id} - {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Settlements History Table */}
      <div className="rounded-2xl glass-panel overflow-hidden border border-slate-800">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading settlement vouchers...</span>
          </div>
        ) : settlements.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Scale className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-300">No Settlements Recorded</h3>
            <p className="text-xs text-slate-500">Create a settlement voucher to settle pending supplier receipts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold">
                  <th className="p-3.5">Settlement ID</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Supplier Name & ID</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Amount Paid</th>
                  <th className="p-3.5">Remaining Balance</th>
                  <th className="p-3.5">Linked Receipts</th>
                  <th className="p-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {settlements.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-emerald-400">{st.id}</td>
                    <td className="p-3.5 text-slate-300 font-medium whitespace-nowrap">{formatDate(st.settlement_date)}</td>
                    <td className="p-3.5 text-slate-200 font-medium">
                      <div>{st.supplier_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{st.supplier_id}</div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                          st.settlement_type === 'Full Settlement'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {st.settlement_type}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-emerald-300 text-sm">{formatCurrency(st.amount_paid)}</td>
                    <td className="p-3.5 font-mono font-bold text-amber-400">{formatCurrency(st.remaining_balance)}</td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {st.linked_invoices && st.linked_invoices.length > 0 ? (
                          st.linked_invoices.map((inv) => (
                            <span key={inv} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                              {inv}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[11px]">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => {
                          setSelectedSettlement(st);
                          setIsDetailModalOpen(true);
                        }}
                        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer transition-colors"
                      >
                        <Eye className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Voucher</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Settlement Modal */}
      <NewSettlementModal
        isOpen={isNewSettlementModalOpen}
        onClose={() => setIsNewSettlementModalOpen(false)}
        onSuccess={fetchSettlements}
      />

      {/* Settlement Detail Modal */}
      <SettlementDetailModal
        settlement={selectedSettlement}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
    </div>
  );
}
