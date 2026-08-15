import { useState, useEffect } from 'react';
import { supplierApi } from '../../api/supplierApi';
import { ArrowLeft, User, Phone, Building2, Truck, Box, DollarSign, Calendar } from 'lucide-react';

export default function SupplierDetailPage({ supplierId, onBack, onViewAccount }) {
  const [supplier, setSupplier] = useState(null);
  const [supplyEntries, setSupplyEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supplierId) return;
    const loadDetails = async () => {
      setLoading(true);
      try {
        const [supDetails, entriesRes] = await Promise.all([
          supplierApi.getSupplierById(supplierId),
          supplierApi.getSupplyEntries({ supplier_id: supplierId })
        ]);
        setSupplier(supDetails);
        setSupplyEntries(entriesRes.data || []);
      } catch (err) {
        console.error('Error loading supplier details:', err);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [supplierId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        Loading supplier detail view...
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-8 text-center text-slate-400 space-y-4">
        <p>Supplier record not found.</p>
        <button onClick={onBack} className="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs">
          Back to Suppliers List
        </button>
      </div>
    );
  }

  const acc = supplier.account_summary || {};

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 rounded-xl text-xs font-semibold transition"
        >
          <ArrowLeft className="h-4 w-4 text-emerald-400" />
          Back to Supplier Directory
        </button>
        <button
          onClick={() => onViewAccount && onViewAccount(supplier.id)}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
        >
          Open Account Ledger
        </button>
      </div>

      {/* Supplier Profile Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
            <User className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700">
                {supplier.supplier_number}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {supplier.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-100 mt-1">{supplier.supplier_name}</h1>
            <p className="text-xs text-slate-400 flex items-center gap-3 mt-1">
              {supplier.company_name && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-slate-500" /> {supplier.company_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-slate-500" /> {supplier.phone_number} ({supplier.contact_person})
              </span>
            </p>
          </div>
        </div>

        {/* Account Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Available Advance</p>
            <p className="text-base font-bold text-emerald-400 mt-0.5">
              ₹{(acc.available_advance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Total Supply</p>
            <p className="text-base font-bold text-slate-200 mt-0.5">
              ₹{(acc.total_supply_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-500">Outstanding Due</p>
            <p className="text-base font-bold text-amber-400 mt-0.5">
              ₹{(acc.outstanding_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Layout for Relationships */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Assigned Raw Materials */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Box className="h-4 w-4 text-emerald-400" />
            Assigned Raw Materials ({supplier.raw_materials ? supplier.raw_materials.length : 0})
          </h3>
          <div className="space-y-2">
            {!supplier.raw_materials || supplier.raw_materials.length === 0 ? (
              <p className="text-xs text-slate-500">No raw materials assigned.</p>
            ) : (
              supplier.raw_materials.map((rm) => (
                <div key={rm.id} className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">{rm.name}</span>
                  <span className="text-[10px] font-mono font-bold bg-slate-800 text-emerald-400 px-2 py-0.5 rounded border border-slate-700">
                    {rm.unit_code || rm.unit}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 2: Assigned Vehicle Types */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Truck className="h-4 w-4 text-emerald-400" />
            Operated Vehicle Types ({supplier.vehicle_types ? supplier.vehicle_types.length : 0})
          </h3>
          <div className="space-y-2">
            {!supplier.vehicle_types || supplier.vehicle_types.length === 0 ? (
              <p className="text-xs text-slate-500">No vehicle types assigned.</p>
            ) : (
              supplier.vehicle_types.map((vt) => (
                <div key={vt.id} className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                  <span className="text-xs font-semibold text-slate-200">{vt.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 3: Registered Vehicle Numbers */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <Truck className="h-4 w-4 text-emerald-400" />
            Registered Vehicles ({supplier.vehicles ? supplier.vehicles.length : 0})
          </h3>
          <div className="space-y-2">
            {!supplier.vehicles || supplier.vehicles.length === 0 ? (
              <p className="text-xs text-slate-500">No vehicles registered.</p>
            ) : (
              supplier.vehicles.map((v) => (
                <div key={v.id} className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-100 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {v.vehicle_number}
                  </span>
                  <span className="text-[10px] text-slate-400">{v.vehicle_type_name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Supply Entry History */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-emerald-400" />
          Raw Material Supply History ({supplyEntries.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Supply No</th>
                <th className="px-4 py-3">Raw Material</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Total Amount</th>
                <th className="px-4 py-3">Advance Adjusted</th>
                <th className="px-4 py-3">Remaining Due</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {supplyEntries.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-6 text-slate-500">
                    No supply entries recorded for this supplier.
                  </td>
                </tr>
              ) : (
                supplyEntries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3">{item.date}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-200">{item.supply_number}</td>
                    <td className="px-4 py-3 font-medium text-slate-100">{item.raw_material_name}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{item.vehicle_number}</td>
                    <td className="px-4 py-3 font-bold text-slate-100">{item.quantity} {item.unit_code}</td>
                    <td className="px-4 py-3">₹{parseFloat(item.price).toFixed(2)}</td>
                    <td className="px-4 py-3 font-bold text-emerald-400">₹{parseFloat(item.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-emerald-300">₹{parseFloat(item.amount_adjusted).toFixed(2)}</td>
                    <td className="px-4 py-3 text-amber-400">₹{parseFloat(item.remaining_due).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        item.status === 'Confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
