import React from 'react';
import { X, Scale, FileText, Printer, CheckCircle2, Building2, Calendar, DollarSign } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function SettlementDetailModal({ settlement, isOpen, onClose }) {
  if (!isOpen || !settlement) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl glass-panel p-6 border border-slate-700 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-100 text-base">Settlement Document</h3>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                  {settlement.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">Coir Manufacturing ERP Settlement Receipt</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
              title="Print Settlement Voucher"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Supplier Info & Voucher Metadata */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Supplier Name</span>
            <div className="font-bold text-slate-100 text-sm mt-0.5">{settlement.supplier_name}</div>
            <div className="text-slate-400 font-mono text-[11px]">{settlement.supplier_id}</div>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Settlement Date</span>
            <div className="font-bold text-slate-100 mt-0.5 flex items-center space-x-1">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span>{formatDate(settlement.settlement_date)}</span>
            </div>
            <div className="text-[11px] font-semibold text-emerald-400 uppercase mt-0.5">
              {settlement.settlement_type}
            </div>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase">Amount Settled (Paid)</span>
            <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
              {formatCurrency(settlement.amount_paid)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
            <span className="text-[11px] font-semibold text-amber-400 uppercase">Remaining Balance</span>
            <div className="text-xl font-bold font-mono text-amber-300 mt-1">
              {formatCurrency(settlement.remaining_balance)}
            </div>
          </div>
        </div>

        {/* Linked Invoices List */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Linked Invoices / Receipts ({settlement.linked_invoices?.length || 0})
          </h4>

          {settlement.linked_invoices && settlement.linked_invoices.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {settlement.linked_invoices.map((rId) => (
                <span
                  key={rId}
                  className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-emerald-400 flex items-center space-x-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>{rId}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-500">No specific receipt IDs linked.</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
