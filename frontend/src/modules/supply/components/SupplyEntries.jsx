import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, X, Search, Filter, Calendar } from 'lucide-react';

const API = 'http://localhost:5000/api/supply';

export default function SupplyEntries() {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({ totalEntries: 0, totalAmount: 0, totalQuantity: 0 });
  const [suppliers, setSuppliers] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [resolvedRate, setResolvedRate] = useState(null);
  const [form, setForm] = useState({
    supplier_id: '', raw_material_id: '', vehicle_type_id: '', vehicle_id: '',
    entry_date: new Date().toISOString().split('T')[0],
    quantity: '1', rate_per_unit: '', payment_mode: 'Credit', notes: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterSupplier) params.append('supplier_id', filterSupplier);
      if (filterMaterial) params.append('raw_material_id', filterMaterial);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      const res = await fetch(`${API}/entries?${params}`);
      const json = await res.json();
      setData(json.data || []);
      setSummary(json.summary || { totalEntries: 0, totalAmount: 0, totalQuantity: 0 });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchMasters = async () => {
    try {
      const [sRes, rmRes, vtRes] = await Promise.all([
        fetch(`${API}/suppliers?status=Active`),
        fetch(`${API}/raw-materials?status=active`),
        fetch(`${API}/vehicle-types?status=active`)
      ]);
      setSuppliers((await sRes.json()).data || []);
      setRawMaterials((await rmRes.json()).data || []);
      setVehicleTypes((await vtRes.json()).data || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchMasters(); }, []);
  useEffect(() => { fetchData(); }, [search, filterSupplier, filterMaterial, fromDate, toDate]);

  // Load vehicles for selected supplier
  useEffect(() => {
    if (form.supplier_id) {
      fetch(`${API}/vehicles?supplier_id=${form.supplier_id}`)
        .then(r => r.json())
        .then(j => setVehicles(j.data || []))
        .catch(() => setVehicles([]));
    } else {
      setVehicles([]);
    }
  }, [form.supplier_id]);

  // Auto-resolve price when material + vehicle type selected
  useEffect(() => {
    if (form.raw_material_id && form.vehicle_type_id && form.entry_date) {
      fetch(`${API}/pricing/resolve?raw_material_id=${form.raw_material_id}&vehicle_type_id=${form.vehicle_type_id}&date=${form.entry_date}`)
        .then(r => r.json())
        .then(j => {
          if (j.resolved) {
            setResolvedRate(j.rate_per_unit);
            setForm(prev => ({ ...prev, rate_per_unit: String(j.rate_per_unit) }));
          } else {
            setResolvedRate(null);
          }
        })
        .catch(() => setResolvedRate(null));
    }
  }, [form.raw_material_id, form.vehicle_type_id, form.entry_date]);

  const openCreate = () => {
    setForm({
      supplier_id: '', raw_material_id: '', vehicle_type_id: '', vehicle_id: '',
      entry_date: new Date().toISOString().split('T')[0],
      quantity: '1', rate_per_unit: '', payment_mode: 'Credit', notes: ''
    });
    setResolvedRate(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.supplier_id || !form.raw_material_id || !form.vehicle_type_id || !form.entry_date) return;
    if (!form.rate_per_unit || parseFloat(form.rate_per_unit) <= 0) return;

    const res = await fetch(`${API}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    if (res.ok) {
      setShowModal(false);
      fetchData();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to create entry');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this supply entry?')) return;
    await fetch(`${API}/entries/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const fmt = (v) => parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const calcTotal = parseFloat(form.rate_per_unit || 0) * parseFloat(form.quantity || 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-[#E2D2C2]"><FileText className="h-5 w-5 text-[#965E36]" /></div>
          <div>
            <h2 className="text-base font-extrabold text-[#2E1A0C]">Supply Entries</h2>
            <p className="text-[11px] text-[#7C5A3E]">Raw material receipt log with auto-price resolution</p>
          </div>
        </div>
        <button onClick={openCreate} className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#965E36] text-white text-xs font-bold hover:bg-[#7A4A28] transition shadow-xs cursor-pointer">
          <Plus className="h-3.5 w-3.5" /><span>New Entry</span>
        </button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-[#D6C4B0] p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#7C5A3E] tracking-wider">Total Entries</p>
          <p className="text-2xl font-extrabold text-[#2E1A0C] mt-1">{summary.totalEntries}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#D6C4B0] p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#7C5A3E] tracking-wider">Total Quantity</p>
          <p className="text-2xl font-extrabold text-blue-600 mt-1">{parseFloat(summary.totalQuantity || 0).toFixed(1)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#D6C4B0] p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#7C5A3E] tracking-wider">Total Amount</p>
          <p className="text-2xl font-extrabold text-[#965E36] mt-1">₹ {fmt(summary.totalAmount)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2 flex-wrap gap-y-2">
        <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none">
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filterMaterial} onChange={e => setFilterMaterial(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none">
          <option value="">All Materials</option>
          {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} title="From Date"
          className="px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} title="To Date"
          className="px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
        <div className="relative flex-1 sm:flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C694E]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="w-full sm:w-40 pl-9 pr-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] placeholder-[#8C694E] focus:ring-2 focus:ring-[#965E36] outline-none transition" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#D6C4B0] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#EFE6DC] text-[#5C3B21]">
              <tr>
                <th className="text-left px-3 py-3 font-bold">Code</th>
                <th className="text-left px-3 py-3 font-bold">Date</th>
                <th className="text-left px-3 py-3 font-bold">Supplier</th>
                <th className="text-left px-3 py-3 font-bold">Material</th>
                <th className="text-left px-3 py-3 font-bold">Vehicle</th>
                <th className="text-right px-3 py-3 font-bold">Qty</th>
                <th className="text-right px-3 py-3 font-bold">Rate (₹)</th>
                <th className="text-right px-3 py-3 font-bold">Total (₹)</th>
                <th className="text-left px-3 py-3 font-bold">Mode</th>
                <th className="text-left px-3 py-3 font-bold">Status</th>
                <th className="text-center px-3 py-3 font-bold">Act</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE6DC]">
              {loading ? (
                <tr><td colSpan="11" className="text-center py-8 text-[#8C694E]">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="11" className="text-center py-8 text-[#8C694E]">No supply entries found. Create your first receipt.</td></tr>
              ) : data.map((item) => (
                <tr key={item.id} className="hover:bg-[#FAF7F2] transition">
                  <td className="px-3 py-3">
                    <span className="px-1.5 py-0.5 rounded bg-[#EFE6DC] text-[#965E36] text-[10px] font-mono font-bold">{item.entry_code}</span>
                  </td>
                  <td className="px-3 py-3 text-[#5C3B21]">{item.entry_date?.split('T')[0]}</td>
                  <td className="px-3 py-3">
                    <span className="font-semibold text-[#2E1A0C]">{item.supplier_name}</span>
                  </td>
                  <td className="px-3 py-3 text-[#5C3B21]">{item.raw_material_name}</td>
                  <td className="px-3 py-3 text-[#7C5A3E]">{item.vehicle_type_name}{item.vehicle_number ? ` (${item.vehicle_number})` : ''}</td>
                  <td className="px-3 py-3 text-right font-mono text-[#2E1A0C]">{parseFloat(item.quantity).toFixed(1)}</td>
                  <td className="px-3 py-3 text-right font-mono text-[#5C3B21]">{fmt(item.rate_per_unit)}</td>
                  <td className="px-3 py-3 text-right font-bold font-mono text-[#2E1A0C]">₹ {fmt(item.total_amount)}</td>
                  <td className="px-3 py-3">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${item.payment_mode === 'Credit' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {item.payment_mode}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${item.status === 'Confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 cursor-pointer transition"><Trash2 className="h-3.5 w-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#D6C4B0] w-full max-w-2xl p-6 shadow-xl space-y-4 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[#2E1A0C]">New Supply Entry</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-[#E2D2C2] cursor-pointer"><X className="h-4 w-4 text-[#7C5A3E]" /></button>
            </div>
            <div className="space-y-3">
              {/* Row 1: Supplier + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Supplier *</label>
                  <select value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value, vehicle_id: ''})}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none">
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_code} – {s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Entry Date *</label>
                  <input type="date" value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
                </div>
              </div>

              {/* Row 2: Material + Vehicle Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Raw Material *</label>
                  <select value={form.raw_material_id} onChange={e => setForm({...form, raw_material_id: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none">
                    <option value="">Select Material</option>
                    {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Vehicle Type *</label>
                  <select value={form.vehicle_type_id} onChange={e => setForm({...form, vehicle_type_id: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none">
                    <option value="">Select Vehicle Type</option>
                    {vehicleTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Vehicle (optional) */}
              {vehicles.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Specific Vehicle (Optional)</label>
                  <select value={form.vehicle_id} onChange={e => setForm({...form, vehicle_id: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none">
                    <option value="">Any / Not Specified</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_type_name} – {v.vehicle_number || 'No Number'}</option>)}
                  </select>
                </div>
              )}

              {/* Price Resolution Indicator */}
              {resolvedRate !== null && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700">
                  <span className="font-bold">✓ Auto-resolved rate:</span> ₹ {fmt(resolvedRate)} per unit from pricing table. You can override below.
                </div>
              )}

              {/* Row 3: Quantity + Rate + Payment */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Quantity *</label>
                  <input type="number" step="0.1" min="0.1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Rate / Unit (₹) *</label>
                  <input type="number" step="0.01" value={form.rate_per_unit} onChange={e => setForm({...form, rate_per_unit: e.target.value})} placeholder="Auto or manual"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Payment Mode</label>
                  <select value={form.payment_mode} onChange={e => setForm({...form, payment_mode: e.target.value})}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none">
                    <option value="Credit">Credit (Payable)</option>
                    <option value="Cash">Cash</option>
                    <option value="Online">Online / UPI</option>
                  </select>
                </div>
              </div>

              {/* Calculated Total */}
              <div className="bg-[#EFE6DC] rounded-xl p-4 flex items-center justify-between">
                <span className="text-xs font-bold text-[#5C3B21]">Calculated Total</span>
                <span className="text-xl font-extrabold text-[#2E1A0C]">₹ {fmt(calcTotal)}</span>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} placeholder="Optional remarks..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none resize-none" />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-[#5C3B21] hover:bg-[#E2D2C2] transition cursor-pointer">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2 rounded-xl bg-[#965E36] text-white text-xs font-bold hover:bg-[#7A4A28] transition shadow-xs cursor-pointer">
                Confirm Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
