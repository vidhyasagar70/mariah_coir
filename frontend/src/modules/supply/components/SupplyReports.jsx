import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar } from 'lucide-react';

const API = 'http://localhost:5000/api/supply';

export default function SupplyReports() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [report, setReport] = useState({ byMaterial: [], bySupplier: [], grandTotal: { total_entries: 0, total_quantity: 0, total_amount: 0 } });
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      const res = await fetch(`${API}/entries/reports?${params}`);
      const json = await res.json();
      setReport(json);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchReport(); }, [fromDate, toDate]);

  const fmt = (v) => parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const gt = report.grandTotal || {};
  const maxMaterialAmt = Math.max(...(report.byMaterial || []).map(r => parseFloat(r.total_amount || 0)), 1);
  const maxSupplierAmt = Math.max(...(report.bySupplier || []).map(r => parseFloat(r.total_amount || 0)), 1);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-[#E2D2C2]"><BarChart3 className="h-5 w-5 text-[#965E36]" /></div>
          <div>
            <h2 className="text-base font-extrabold text-[#2E1A0C]">Supply Reports</h2>
            <p className="text-[11px] text-[#7C5A3E]">Analytics summary by material & supplier</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 text-xs text-[#5C3B21]">
            <Calendar className="h-3.5 w-3.5 text-[#8C694E]" />
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
            <span className="text-[#8C694E]">to</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
          </div>
        </div>
      </div>

      {/* Grand Total KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-[#965E36] to-[#7A4A28] rounded-2xl p-5 shadow-md text-white">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Total Entries</p>
          <p className="text-3xl font-extrabold mt-1">{parseInt(gt.total_entries || 0)}</p>
          <p className="text-[10px] text-white/60 mt-0.5">Confirmed supply receipts</p>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 shadow-md text-white">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Total Quantity</p>
          <p className="text-3xl font-extrabold mt-1">{parseFloat(gt.total_quantity || 0).toFixed(1)}</p>
          <p className="text-[10px] text-white/60 mt-0.5">Units received</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-5 shadow-md text-white">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Total Amount</p>
          <p className="text-3xl font-extrabold mt-1">₹ {fmt(gt.total_amount)}</p>
          <p className="text-[10px] text-white/60 mt-0.5">Procurement cost</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#8C694E] text-xs">Loading reports...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* By Material */}
          <div className="bg-white rounded-2xl border border-[#D6C4B0] p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-[#2E1A0C]">By Raw Material</h3>
            {(report.byMaterial || []).length === 0 ? (
              <p className="text-xs text-[#8C694E] py-4 text-center">No data available</p>
            ) : (
              <div className="space-y-3">
                {report.byMaterial.map((row, i) => {
                  const pct = (parseFloat(row.total_amount || 0) / maxMaterialAmt) * 100;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#2E1A0C]">{row.raw_material_name}</span>
                        <span className="text-xs font-bold text-[#965E36]">₹ {fmt(row.total_amount)}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 h-2.5 bg-[#EFE6DC] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#965E36] to-[#C18B5F] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-[#7C5A3E] w-20 text-right">{parseInt(row.total_entries)} entries</span>
                      </div>
                      <p className="text-[10px] text-[#8C694E]">Qty: {parseFloat(row.total_quantity || 0).toFixed(1)} units</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* By Supplier */}
          <div className="bg-white rounded-2xl border border-[#D6C4B0] p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-[#2E1A0C]">By Supplier</h3>
            {(report.bySupplier || []).length === 0 ? (
              <p className="text-xs text-[#8C694E] py-4 text-center">No data available</p>
            ) : (
              <div className="space-y-3">
                {report.bySupplier.map((row, i) => {
                  const pct = (parseFloat(row.total_amount || 0) / maxSupplierAmt) * 100;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#2E1A0C]">
                          {row.supplier_name}
                          <span className="ml-1 text-[10px] font-mono text-[#965E36]">{row.supplier_code}</span>
                        </span>
                        <span className="text-xs font-bold text-blue-600">₹ {fmt(row.total_amount)}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 h-2.5 bg-[#EFE6DC] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-700 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-[#7C5A3E] w-20 text-right">{parseInt(row.total_entries)} entries</span>
                      </div>
                      <p className="text-[10px] text-[#8C694E]">Qty: {parseFloat(row.total_quantity || 0).toFixed(1)} units</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
