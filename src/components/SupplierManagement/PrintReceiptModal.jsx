import React from 'react';
import { Printer, CheckCircle2, Building2 } from 'lucide-react';

export default function PrintReceiptModal({ entry, onClose }) {
  if (!entry) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-white text-slate-900 border border-slate-300 rounded-2xl max-w-xl w-full p-8 shadow-2xl space-y-6 print:shadow-none print:border-none print:w-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-emerald-600" />
              <h2 className="text-xl font-bold text-slate-900">Coir Manufacturing ERP</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Raw Material Goods Inward Receipt</p>
          </div>
          <div className="text-right">
            <span className="font-mono text-base font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200">
              {entry.supply_number}
            </span>
            <p className="text-xs text-slate-500 mt-1">Date: {entry.date}</p>
          </div>
        </div>

        {/* Supplier & Vehicle Details */}
        <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <p className="text-slate-500 uppercase font-bold text-[10px]">Supplier Details</p>
            <p className="font-bold text-sm text-slate-900 mt-0.5">{entry.supplier_name}</p>
            <p className="text-slate-600 font-mono text-[11px]">{entry.supplier_number}</p>
            {entry.supplier_company && <p className="text-slate-600">{entry.supplier_company}</p>}
          </div>

          <div>
            <p className="text-slate-500 uppercase font-bold text-[10px]">Vehicle & Transport</p>
            <p className="font-mono font-bold text-sm text-slate-900 mt-0.5">{entry.vehicle_number}</p>
            <p className="text-slate-600 text-[11px]">Type: {entry.vehicle_type_name}</p>
          </div>
        </div>

        {/* Material & Pricing Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-100 font-bold uppercase text-[10px] text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3">Raw Material</th>
                <th className="p-3">Quantity</th>
                <th className="p-3 text-right">Unit Price</th>
                <th className="p-3 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="p-3 font-semibold text-slate-900">{entry.raw_material_name}</td>
                <td className="p-3 font-bold">{entry.quantity} {entry.unit_code}</td>
                <td className="p-3 text-right font-mono">₹{parseFloat(entry.price).toFixed(2)}</td>
                <td className="p-3 text-right font-mono font-bold text-slate-900">₹{parseFloat(entry.total_amount).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Financial Adjustment Summary */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Total Supply Value:</span>
            <span className="font-mono font-bold text-slate-900">₹{parseFloat(entry.total_amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Previous Available Advance:</span>
            <span className="font-mono">₹{parseFloat(entry.previous_advance || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-200 pt-2">
            <span>Amount Adjusted from Advance:</span>
            <span className="font-mono">₹{parseFloat(entry.amount_adjusted || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-amber-700 font-bold">
            <span>Remaining Amount Due / Payable:</span>
            <span className="font-mono">₹{parseFloat(entry.remaining_due || 0).toFixed(2)}</span>
          </div>
        </div>

        {entry.notes && (
          <div className="text-xs text-slate-500 italic">
            Notes: {entry.notes}
          </div>
        )}

        {/* Signatures & Print Button */}
        <div className="pt-8 border-t border-slate-200 flex items-end justify-between print:pt-12">
          <div className="text-center text-[10px] text-slate-400">
            <div className="h-10 border-b border-slate-300 w-32 mb-1"></div>
            Received By (Weighbridge Incharge)
          </div>
          <div className="text-center text-[10px] text-slate-400">
            <div className="h-10 border-b border-slate-300 w-32 mb-1"></div>
            Supplier / Driver Signature
          </div>

          <div className="flex gap-2 print:hidden">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-300"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow hover:bg-emerald-500"
            >
              <Printer className="h-4 w-4" /> Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
