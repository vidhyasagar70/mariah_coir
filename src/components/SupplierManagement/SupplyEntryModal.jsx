import { useState, useEffect } from 'react';
import { supplierApi } from '../../api/supplierApi';
import { Truck, Box, Calendar, AlertTriangle, CheckCircle2, Calculator } from 'lucide-react';

export default function SupplyEntryModal({ isOpen, onClose, onSuccess }) {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierRawMaterials, setSupplierRawMaterials] = useState([]);
  const [supplierVehicleTypes, setSupplierVehicleTypes] = useState([]);
  const [supplierVehicles, setSupplierVehicles] = useState([]);
  const [availableAdvance, setAvailableAdvance] = useState(0);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedVehicleTypeId, setSelectedVehicleTypeId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState('');
  const [selectedUnitCode, setSelectedUnitCode] = useState('');
  const [quantity, setQuantity] = useState('');

  // Resolved Price state
  const [resolvedPrice, setResolvedPrice] = useState(null);
  const [priceResolving, setPriceResolving] = useState(false);
  const [priceError, setPriceError] = useState('');

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      supplierApi.getSuppliers({ status: 'Active' }).then((res) => {
        setSuppliers(res.data || []);
      });
      // Reset form
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedSupplierId('');
      setSelectedVehicleTypeId('');
      setSelectedVehicleId('');
      setSelectedRawMaterialId('');
      setSelectedUnitCode('');
      setQuantity('');
      setResolvedPrice(null);
      setPriceError('');
      setError('');
    }
  }, [isOpen]);

  // Step 1: When Supplier is selected, load supplier raw materials, vehicle types, vehicles, and balance
  const handleSupplierChange = async (supplierId) => {
    setSelectedSupplierId(supplierId);
    setSelectedVehicleTypeId('');
    setSelectedVehicleId('');
    setSelectedRawMaterialId('');
    setSelectedUnitCode('');
    setResolvedPrice(null);
    setPriceError('');

    if (!supplierId) {
      setSupplierRawMaterials([]);
      setSupplierVehicleTypes([]);
      setSupplierVehicles([]);
      setAvailableAdvance(0);
      return;
    }

    try {
      const [rmRes, vtRes, vRes, balRes] = await Promise.all([
        supplierApi.getSupplierRawMaterials(supplierId),
        supplierApi.getSupplierVehicleTypes(supplierId),
        supplierApi.getSupplierVehicles(supplierId),
        supplierApi.getSupplierBalance(supplierId)
      ]);
      setSupplierRawMaterials(rmRes.data || []);
      setSupplierVehicleTypes(vtRes.data || []);
      setSupplierVehicles(vRes.data || []);
      setAvailableAdvance(balRes.available_advance || 0);
    } catch (err) {
      console.error('Error fetching supplier specific data:', err);
    }
  };

  // Filter vehicles when vehicle type changes
  const filteredVehicles = selectedVehicleTypeId
    ? supplierVehicles.filter((v) => v.vehicle_type_id === selectedVehicleTypeId)
    : supplierVehicles;

  const handleVehicleTypeChange = (vtId) => {
    setSelectedVehicleTypeId(vtId);
    setSelectedVehicleId('');
    setResolvedPrice(null);
    setPriceError('');
  };

  const handleVehicleChange = (vId) => {
    setSelectedVehicleId(vId);
    const vehicle = supplierVehicles.find((v) => v.id === vId);
    if (vehicle && vehicle.vehicle_type_id) {
      setSelectedVehicleTypeId(vehicle.vehicle_type_id);
    }
  };

  const handleRawMaterialChange = (rmId) => {
    setSelectedRawMaterialId(rmId);
    const rm = supplierRawMaterials.find((item) => item.id === rmId);
    if (rm) {
      setSelectedUnitCode(rm.unit_code || rm.unit);
    } else {
      setSelectedUnitCode('');
    }
    setResolvedPrice(null);
    setPriceError('');
  };

  // Step 5: Auto Price Resolution
  useEffect(() => {
    if (selectedRawMaterialId && selectedVehicleTypeId && date) {
      setPriceResolving(true);
      setPriceError('');
      supplierApi
        .resolvePrice(selectedRawMaterialId, selectedVehicleTypeId, date)
        .then((res) => {
          if (res.resolved) {
            setResolvedPrice(res.price);
            if (res.unit_code) setSelectedUnitCode(res.unit_code);
          } else {
            setResolvedPrice(null);
            setPriceError('Pricing is not configured for selected Raw Material + Vehicle Type on this date.');
          }
        })
        .catch((err) => {
          setResolvedPrice(null);
          setPriceError(err.response?.data?.error || 'No active pricing rule found for selected Raw Material + Vehicle Type on this date.');
        })
        .finally(() => {
          setPriceResolving(false);
        });
    }
  }, [selectedRawMaterialId, selectedVehicleTypeId, date]);

  // Financial Calculations Preview
  const qtyNum = parseFloat(quantity) || 0;
  const priceNum = resolvedPrice !== null ? resolvedPrice : 0;
  const totalAmount = qtyNum * priceNum;
  const amountAdjusted = Math.min(totalAmount, Math.max(0, availableAdvance));
  const remainingAdvance = Math.max(0, availableAdvance - amountAdjusted);
  const remainingDue = Math.max(0, totalAmount - amountAdjusted);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedSupplierId) return setError('Please select a Supplier.');
    if (!selectedVehicleTypeId) return setError('Please select a Vehicle Type.');
    if (!selectedVehicleId) return setError('Please select a Vehicle Number.');
    if (!selectedRawMaterialId) return setError('Please select a Raw Material.');
    if (qtyNum <= 0) return setError('Quantity must be greater than zero.');
    if (resolvedPrice === null) return setError('Valid pricing must exist for the selected Raw Material + Vehicle Type + Supply Date.');

    setSubmitting(true);
    try {
      await supplierApi.createSupplyEntry({
        date,
        supplier_id: selectedSupplierId,
        vehicle_type_id: selectedVehicleTypeId,
        vehicle_id: selectedVehicleId,
        raw_material_id: selectedRawMaterialId,
        quantity: qtyNum,
        notes
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to save supply entry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Truck className="h-5 w-5 text-emerald-400" />
              New Daily Raw Material Supply Entry
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Record raw material received from supplier and apply amount against advance balance.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section 1: Supply Details */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Section 1: Supply & Vehicle Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Supply Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Supplier <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50 font-semibold"
                >
                  <option value="">-- Select Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.supplier_name} ({s.supplier_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Vehicle Type <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  disabled={!selectedSupplierId}
                  value={selectedVehicleTypeId}
                  onChange={(e) => handleVehicleTypeChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50 disabled:opacity-40"
                >
                  <option value="">-- Select Supplier Vehicle Type --</option>
                  {supplierVehicleTypes.map((vt) => (
                    <option key={vt.id} value={vt.id}>{vt.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Vehicle Registration Number <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  disabled={!selectedSupplierId}
                  value={selectedVehicleId}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-sm font-mono focus:outline-none focus:border-emerald-500/50 disabled:opacity-40"
                >
                  <option value="">-- Select Registered Vehicle --</option>
                  {filteredVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicle_number} ({v.vehicle_type_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Raw Material <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  disabled={!selectedSupplierId}
                  value={selectedRawMaterialId}
                  onChange={(e) => handleRawMaterialChange(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50 disabled:opacity-40"
                >
                  <option value="">-- Select Supplied Raw Material --</option>
                  {supplierRawMaterials.map((rm) => (
                    <option key={rm.id} value={rm.id}>
                      {rm.name} ({rm.unit_code || rm.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Unit (Read-only)</label>
                <input
                  type="text"
                  readOnly
                  value={selectedUnitCode ? `Configured Unit: ${selectedUnitCode}` : 'Populated automatically'}
                  className="w-full px-3.5 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-emerald-400 font-bold text-sm cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Quantity & Automatic Price Resolution */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Section 2: Quantity & Automatic Price Resolution</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Quantity ({selectedUnitCode || 'Units'}) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  placeholder="e.g. 1000"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-base font-bold focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Auto Resolved Price (₹)</label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={
                      priceResolving
                        ? 'Resolving...'
                        : resolvedPrice !== null
                        ? `₹${resolvedPrice.toFixed(2)}`
                        : 'Not Resolved'
                    }
                    className={`w-full px-3.5 py-2 border rounded-xl text-sm font-bold cursor-not-allowed ${
                      resolvedPrice !== null
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Total Supply Amount (₹)</label>
                <input
                  type="text"
                  readOnly
                  value={`₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-500/40 rounded-xl text-emerald-400 text-base font-extrabold cursor-not-allowed"
                />
              </div>
            </div>

            {priceError && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
                {priceError}
              </div>
            )}
          </div>

          {/* Section 3: Supplier Account Adjustment Preview */}
          <div className="space-y-3 bg-slate-950/90 p-4 rounded-xl border border-emerald-500/30 shadow-inner">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Section 3: Supplier Account Adjustment Preview
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Available Advance</span>
                <span className="text-slate-200 font-bold text-sm">
                  ₹{availableAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                <span className="text-emerald-400 block text-[10px] uppercase font-bold">Amount Adjusted</span>
                <span className="text-emerald-300 font-bold text-sm">
                  ₹{amountAdjusted.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Remaining Advance</span>
                <span className="text-teal-300 font-bold text-sm">
                  ₹{remainingAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Remaining Due</span>
                <span className="text-amber-400 font-bold text-sm">
                  ₹{remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Notes / Remarks</label>
            <textarea
              rows="2"
              placeholder="Optional notes or moisture/quality comments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || resolvedPrice === null}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/50 transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving Supply Entry...' : 'Save Supply Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
