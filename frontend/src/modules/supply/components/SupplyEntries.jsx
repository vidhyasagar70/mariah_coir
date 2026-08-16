import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, X, Search, Filter, Calendar, Truck, PackageCheck, AlertCircle } from 'lucide-react';

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
  const [resolvedRate, setResolvedRate] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    supplier_id: '', raw_material_id: '', vehicle_type_id: '', vehicle_id: '',
    entry_date: new Date().toISOString().split('T')[0],
    quantity: '1', rate_per_unit: '', payment_mode: 'Credit', notes: '',
    custom_vehicle_name: '', custom_vehicle_rate: '', custom_vehicle_number: ''
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

  // Auto-resolve price when material + vehicle type selected (for registered vehicles)
  useEffect(() => {
    if (form.vehicle_type_id === 'CUSTOM' || !form.vehicle_type_id) return;
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

  const handleSave = async () => {
    if (!form.supplier_id || !form.raw_material_id || !form.vehicle_type_id || !form.entry_date) {
      alert('Please fill all required fields (*).');
      return;
    }

    if (form.vehicle_type_id === 'CUSTOM') {
      if (!form.custom_vehicle_name || !form.custom_vehicle_name.trim()) {
        alert('Please enter the custom vehicle name.');
        return;
      }
      if (!form.rate_per_unit || parseFloat(form.rate_per_unit) <= 0) {
        alert('Please enter a valid rate per trip for the custom truck.');
        return;
      }
    }

    if (!form.rate_per_unit || parseFloat(form.rate_per_unit) <= 0) {
      alert('Please enter a valid rate per trip.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        custom_vehicle_rate: form.rate_per_unit
      };
      const res = await fetch(`${API}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Reset form
        setForm({
          supplier_id: '', raw_material_id: '', vehicle_type_id: '', vehicle_id: '',
          entry_date: new Date().toISOString().split('T')[0],
          quantity: '1', rate_per_unit: '', payment_mode: 'Credit', notes: '',
          custom_vehicle_name: '', custom_vehicle_rate: '', custom_vehicle_number: ''
        });
        setResolvedRate(null);
        fetchData();
        fetchMasters(); // Refresh vehicle types
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to record goods inward receipt.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while saving receipt.');
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this goods inward receipt?')) return;
    await fetch(`${API}/entries/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const fmt = (v) => {
    const num = parseFloat(v);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calcTotal = (parseFloat(form.rate_per_unit) || 0) * (parseFloat(form.quantity) || 1);

  return (
    <div className="space-y-6">
      {/* Module Title Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2.5 rounded-2xl bg-[#E2D2C2] text-[#965E36]">
          <FileText className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-[#2E1A0C] tracking-tight">SM-02: Material Receipts Management (Goods Inward)</h1>
          <p className="text-xs text-[#7C5A3E] font-medium">
            Log inward shipments of Green Husk, Brown Husk, Fuel, and Water with auto-calculated rates & Custom Truck support
          </p>
        </div>
      </div>

      {/* Record Material Receipt Top Card Form */}
      <div className="bg-white rounded-3xl border border-[#D6C4B0] shadow-sm overflow-hidden">
        <div className="p-6 space-y-5">
          {/* Card Header */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#965E36] flex items-center justify-center shadow-sm">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#2E1A0C]">Record Material Receipt (Goods Inward)</h2>
              <p className="text-[11px] text-[#7C5A3E] font-medium">Includes Custom Truck option & auto-calculates total goods inward amount</p>
            </div>
          </div>

          {/* Row 1: Supplier, Material Type, Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#5C3B21] block mb-1.5">Select Supplier *</label>
              <select value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value, vehicle_id: ''})}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none font-medium">
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_code} – {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#5C3B21] block mb-1.5">Material Type *</label>
              <select value={form.raw_material_id} onChange={e => setForm({...form, raw_material_id: e.target.value})}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none font-medium">
                <option value="">Select Material</option>
                {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#5C3B21] block mb-1.5">Receipt Date *</label>
              <input type="date" value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none font-medium" />
            </div>
          </div>

          {/* Row 2: Vehicle Type, Trip Count, Rate Per Trip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#5C3B21] block mb-1.5">Vehicle Type *</label>
              <select value={form.vehicle_type_id} onChange={e => {
                const val = e.target.value;
                if (val === 'CUSTOM') {
                  const initialRate = form.custom_vehicle_rate || form.rate_per_unit || '';
                  setForm(prev => ({ ...prev, vehicle_type_id: val, rate_per_unit: initialRate }));
                  setResolvedRate(initialRate ? parseFloat(initialRate) : null);
                } else {
                  setForm(prev => ({ ...prev, vehicle_type_id: val }));
                }
              }}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none font-semibold">
                <option value="">Select Vehicle Type</option>
                {vehicleTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.name}{vt.capacity ? ` (${vt.capacity})` : ''}</option>)}
                <option value="CUSTOM">🚛 Custom Truck (Manual Rate Entry)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#5C3B21] block mb-1.5">Trip Count *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#7C5A3E]">#</span>
                <input type="number" min="1" step="1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})}
                  className="w-full pl-8 pr-3.5 py-2.5 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none font-semibold" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#5C3B21] block mb-1.5">Rate Per Trip (₹) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-[#7C5A3E]">₹</span>
                <input type="number" step="0.01" value={form.rate_per_unit} onChange={e => {
                  const val = e.target.value;
                  const num = parseFloat(val);
                  setForm(prev => ({ ...prev, rate_per_unit: val, custom_vehicle_rate: val }));
                  setResolvedRate(!isNaN(num) && num > 0 ? num : null);
                }}
                disabled={form.vehicle_type_id !== 'CUSTOM' && resolvedRate !== null}
                placeholder="Auto or manual rate"
                className={`w-full pl-8 pr-3.5 py-2.5 text-xs rounded-xl border border-[#D6C4B0] outline-none font-semibold ${
                  form.vehicle_type_id !== 'CUSTOM' && resolvedRate !== null
                    ? 'bg-[#EFE6DC] text-[#5C3B21] cursor-not-allowed'
                    : 'bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36]'
                }`} />
              </div>
            </div>
          </div>

          {/* Inline Custom Truck Name & Reg No */}
          {form.vehicle_type_id === 'CUSTOM' && (
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#D6C4B0] space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#965E36]">
                <Truck className="h-4 w-4" />
                <span>Custom Truck Information</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Custom Truck / Vehicle Name *</label>
                  <input value={form.custom_vehicle_name || ''} onChange={e => setForm({...form, custom_vehicle_name: e.target.value})} placeholder="e.g. Local Eicher 14-ft / Unregistered Tipper"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Vehicle Registration No (Optional)</label>
                  <input value={form.custom_vehicle_number || ''} onChange={e => setForm({...form, custom_vehicle_number: e.target.value})} placeholder="e.g. TN 38 B 9912 / Weighbridge Slip #4410"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
                </div>
              </div>
            </div>
          )}

          {/* Price Auto-Fetch Resolution Banner */}
          {resolvedRate !== null && form.vehicle_type_id !== 'CUSTOM' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 font-medium flex items-center justify-between">
              <span>✓ Auto-fetched rate per trip from pricing table:</span>
              <span className="font-extrabold text-emerald-900">₹ {fmt(resolvedRate)} / trip</span>
            </div>
          )}

          {/* Dark Calculation Banner & Record Button */}
          <div className="bg-[#2E1A0C] text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border border-[#965E36]/30">
            <div className="space-y-0.5 text-center sm:text-left">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#E2D2C2]">Total Calculated Amount</p>
              <p className="text-xs font-semibold text-[#D6C4B0]">
                {form.quantity || 1} trip(s) × ₹ {fmt(form.rate_per_unit || 0)} / trip
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#34D399]">
                ₹ {fmt(calcTotal)}
              </span>
              <button onClick={handleSave} disabled={submitting}
                className="flex items-center space-x-2 px-5 py-3 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-extrabold transition cursor-pointer shadow-md active:scale-95 disabled:opacity-50">
                <PackageCheck className="h-4 w-4 text-white" />
                <span>{submitting ? 'Recording...' : 'Record Goods Inward'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FAF7F2] rounded-2xl border border-[#D6C4B0] p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#7C5A3E] tracking-wider">Total Inward Receipts</p>
          <p className="text-2xl font-black text-[#2E1A0C] mt-1">{summary.totalEntries}</p>
        </div>
        <div className="bg-[#FAF7F2] rounded-2xl border border-[#D6C4B0] p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#7C5A3E] tracking-wider">Total Trips Inward</p>
          <p className="text-2xl font-black text-blue-700 mt-1">{parseFloat(summary.totalQuantity || 0).toFixed(0)} Trips</p>
        </div>
        <div className="bg-[#FAF7F2] rounded-2xl border border-[#D6C4B0] p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#7C5A3E] tracking-wider">Total Inward Amount</p>
          <p className="text-2xl font-black text-[#965E36] mt-1">₹ {fmt(summary.totalAmount)}</p>
        </div>
      </div>

      {/* Receipts Table Section */}
      <div className="bg-white rounded-3xl border border-[#D6C4B0] shadow-xs overflow-hidden p-6 space-y-4">
        {/* Table Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#5C3B21]">
            <Filter className="h-4 w-4 text-[#965E36]" />
            <span>Receipt Filters:</span>
          </div>
          <div className="flex items-center space-x-2 flex-wrap gap-y-2 w-full sm:w-auto">
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
          </div>
        </div>

        {/* Data Table */}
        {loading ? (
          <div className="py-12 text-center text-xs text-[#7C5A3E]">Loading inward receipts...</div>
        ) : data.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <FileText className="h-10 w-10 text-[#D6C4B0] mx-auto" />
            <p className="text-sm font-bold text-[#2E1A0C]">No Receipts Recorded</p>
            <p className="text-xs text-[#7C5A3E]">Record a goods inward receipt above to begin tracking material arrivals.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#2E1A0C]">
              <thead className="bg-[#EFE6DC] text-[10px] font-black uppercase text-[#5C3B21] border-b border-[#D6C4B0]">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Material</th>
                  <th className="py-3 px-4">Vehicle Type</th>
                  <th className="py-3 px-4 text-center">Trips</th>
                  <th className="py-3 px-4 text-right">Rate / Trip</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE6DC]">
                {data.map(row => (
                  <tr key={row.id} className="hover:bg-[#FAF7F2] transition">
                    <td className="py-3 px-4 font-bold text-[#965E36]">{row.entry_code || row.supply_number}</td>
                    <td className="py-3 px-4 font-medium text-[#7C5A3E]">{row.entry_date || row.date}</td>
                    <td className="py-3 px-4 font-semibold text-[#2E1A0C]">{row.supplier_name}</td>
                    <td className="py-3 px-4 font-medium text-[#5C3B21]">{row.raw_material_name}</td>
                    <td className="py-3 px-4 font-medium text-[#7C5A3E]">{row.vehicle_type_name || 'Custom Vehicle'}</td>
                    <td className="py-3 px-4 text-center font-bold text-blue-700">{row.quantity}</td>
                    <td className="py-3 px-4 text-right font-medium text-[#5C3B21]">₹ {fmt(row.rate_per_unit || row.price)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#965E36]">₹ {fmt(row.total_amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleDelete(row.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition cursor-pointer" title="Delete Receipt">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
