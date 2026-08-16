import React, { useState, useEffect } from 'react';
import { Package, Save, ArrowLeft, CheckCircle2, AlertCircle, Scale, Tag, IndianRupee, Layers, Calculator } from 'lucide-react';
import api from '../../../shared/services/api';
import { formatCurrency } from '../../../shared/utils/formatters';

const DEFAULT_CATEGORIES = ['Coir Fibre', 'Coir Yarn', 'Curled Coir', 'Coir Rope', 'Others'];
const DEFAULT_UNITS = ['Bundle', 'Bale', 'Piece', 'Kg', 'Ton'];

export default function ProductForm({ editId, onNavigateBack, onSuccess }) {
  const [formData, setFormData] = useState({
    product_name: '',
    category: 'Coir Fibre',
    custom_category: '',
    unit: 'Bundle',
    custom_unit: '',
    approx_bundle_weight: '',
    sell_price_per_kg: '',
    status: 'Active'
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isEdit = Boolean(editId);

  useEffect(() => {
    if (isEdit) {
      const fetchProduct = async () => {
        try {
          setFetching(true);
          setError('');
          const res = await api.get(`/products/${editId}`);
          const p = res.data;

          const isCustomCat = !DEFAULT_CATEGORIES.includes(p.category);
          const isCustomUnit = !DEFAULT_UNITS.includes(p.unit);

          const priceVal = p.sell_price_per_kg !== undefined ? p.sell_price_per_kg : (p.sell_price || '');

          setFormData({
            product_name: p.product_name || '',
            category: isCustomCat ? 'Other' : p.category,
            custom_category: isCustomCat ? p.category : '',
            unit: isCustomUnit ? 'Other' : p.unit,
            custom_unit: isCustomUnit ? p.unit : '',
            approx_bundle_weight: p.approx_bundle_weight !== undefined ? String(p.approx_bundle_weight) : '',
            sell_price_per_kg: priceVal !== undefined ? String(priceVal) : '',
            status: p.status || 'Active'
          });
        } catch (err) {
          console.error('Error fetching product for edit:', err);
          setError(err.response?.data?.error || 'Failed to load product details.');
        } finally {
          setFetching(false);
        }
      };
      fetchProduct();
    }
  }, [editId, isEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Form validations
    if (!formData.product_name.trim()) {
      setError('Please enter a valid product name.');
      return;
    }

    const finalCategory = formData.category === 'Other' ? formData.custom_category.trim() : formData.category;
    if (!finalCategory) {
      setError('Please select or specify a category.');
      return;
    }

    const finalUnit = formData.unit === 'Other' ? formData.custom_unit.trim() : formData.unit;
    if (!finalUnit) {
      setError('Please select or specify a unit of measurement.');
      return;
    }

    const weightNum = parseFloat(formData.approx_bundle_weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      setError('Approximate bundle weight must be a positive number (in kg).');
      return;
    }

    const pricePerKgNum = parseFloat(formData.sell_price_per_kg);
    if (isNaN(pricePerKgNum) || pricePerKgNum < 0) {
      setError('Selling price per kg must be a valid non-negative number.');
      return;
    }

    const payload = {
      product_name: formData.product_name.trim(),
      category: finalCategory,
      unit: finalUnit,
      approx_bundle_weight: weightNum,
      sell_price_per_kg: pricePerKgNum,
      status: formData.status
    };

    try {
      setLoading(true);
      if (isEdit) {
        await api.put(`/products/${editId}`, payload);
        setSuccessMsg('Product updated successfully!');
      } else {
        await api.post('/products', payload);
        setSuccessMsg('Product added successfully!');
      }

      setTimeout(() => {
        if (onSuccess) onSuccess();
        else if (onNavigateBack) onNavigateBack();
      }, 700);
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err.response?.data?.error || 'Failed to save product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calcWeight = parseFloat(formData.approx_bundle_weight) || 0;
  const calcPricePerKg = parseFloat(formData.sell_price_per_kg) || 0;
  const estBundlePrice = calcWeight * calcPricePerKg;

  if (fetching) {
    return (
      <div className="card-panel p-8 rounded-2xl flex flex-col items-center justify-center space-y-3 min-h-[300px]">
        <div className="w-6 h-6 border-2 border-[#965E36] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs text-[#7A6759] font-medium">Loading product information...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Action Header Bar */}
      <div className="card-panel p-3.5 rounded-xl flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onNavigateBack}
            className="p-2 rounded-xl bg-white border border-[#D6C4B0] text-[#5C3B21] hover:bg-[#EFE6DC] transition-colors cursor-pointer"
            title="Back to Product Directory"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-base font-extrabold text-[#2E1C11]">
              {isEdit ? `Edit Product (${editId})` : 'Add New Coir Product'}
            </h2>
            <p className="text-xs text-[#7A6759]">
              Define product parameters, unit weight in kg, category, and selling price per kg.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onNavigateBack}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-[#6E594A] bg-[#F5ECE3] hover:bg-[#E8DCD0] border border-[#D6C4B0] transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Main Form Container */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error / Success Notifications */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left Columns (2 cols): Input Fields */}
          <div className="md:col-span-2 card-panel p-4 sm:p-5 rounded-2xl space-y-4 border border-[#E8DCD0]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#6E594A] pb-2 border-b border-[#F4EDE4] flex items-center space-x-2">
              <Package className="h-4 w-4 text-[#965E36]" />
              <span>Product Specifications</span>
            </h3>

            {/* PRODUCT NAME */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-[#2E1C11]">
                Product Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                name="product_name"
                value={formData.product_name}
                onChange={handleChange}
                placeholder="e.g. Golden Coir Fibre Bales, 2-Ply Coir Yarn"
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#965E36] font-medium transition-colors"
                required
              />
            </div>

            {/* CATEGORY & UNIT ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* CATEGORY */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11] flex items-center justify-between">
                  <span>Category <span className="text-rose-600">*</span></span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36] cursor-pointer"
                >
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Other">+ Custom Category</option>
                </select>
                {formData.category === 'Other' && (
                  <input
                    type="text"
                    name="custom_category"
                    value={formData.custom_category}
                    onChange={handleChange}
                    placeholder="Enter custom category"
                    className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                  />
                )}
              </div>

              {/* UNIT */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11]">
                  Unit of Measurement <span className="text-rose-600">*</span>
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36] cursor-pointer"
                >
                  {DEFAULT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                  <option value="Other">+ Custom Unit</option>
                </select>
                {formData.unit === 'Other' && (
                  <input
                    type="text"
                    name="custom_unit"
                    value={formData.custom_unit}
                    onChange={handleChange}
                    placeholder="Enter custom unit (e.g. Roll)"
                    className="w-full mt-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-medium focus:outline-none focus:border-[#965E36]"
                  />
                )}
              </div>
            </div>

            {/* BUNDLE WEIGHT & SELL PRICE PER KG ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* APPROX BUNDLE WEIGHT */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11]">
                  Approx. Bundle/Unit Weight (kg) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    name="approx_bundle_weight"
                    value={formData.approx_bundle_weight}
                    onChange={handleChange}
                    placeholder="e.g. 35.00"
                    className="w-full pl-3 pr-10 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-mono font-bold focus:outline-none focus:border-[#965E36]"
                    required
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-[#8C694E] pointer-events-none">
                    kg
                  </span>
                </div>
              </div>

              {/* SELL PRICE PER KG */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#2E1C11]">
                  Selling Price (₹ / kg) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-[#965E36] pointer-events-none">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="sell_price_per_kg"
                    value={formData.sell_price_per_kg}
                    onChange={handleChange}
                    placeholder="e.g. 28.50"
                    className="w-full pl-8 pr-12 py-2 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] font-mono font-bold focus:outline-none focus:border-[#965E36]"
                    required
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-[#8C694E] pointer-events-none">
                    / kg
                  </span>
                </div>
              </div>
            </div>

            {/* DYNAMIC ESTIMATED BUNDLE PRICE DISPLAY IN FORM */}
            <div className="p-3 rounded-xl bg-[#FAF0E6] border border-[#E8D6C5] flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-[#6E594A]">
                <Calculator className="h-4 w-4 text-[#965E36]" />
                <span className="font-semibold">Est. Bundle Price (Weight × Price/kg):</span>
              </div>
              <div className="font-mono font-extrabold text-[#2E1C11] text-sm">
                {estBundlePrice > 0 ? formatCurrency(estBundlePrice) : '₹ 0.00'}
              </div>
            </div>

            {/* STATUS TOGGLE */}
            <div className="space-y-1 pt-2 border-t border-[#F4EDE4]">
              <label className="block text-xs font-bold text-[#2E1C11]">
                Product Availability Status
              </label>
              <div className="flex items-center space-x-4 pt-1">
                <label className="flex items-center space-x-2 text-xs text-[#2E1C11] font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="Active"
                    checked={formData.status === 'Active'}
                    onChange={handleChange}
                    className="text-[#965E36] focus:ring-[#965E36] cursor-pointer"
                  />
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                    Active (Available for Sales)
                  </span>
                </label>
                <label className="flex items-center space-x-2 text-xs text-[#2E1C11] font-semibold cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="Inactive"
                    checked={formData.status === 'Inactive'}
                    onChange={handleChange}
                    className="text-[#965E36] focus:ring-[#965E36] cursor-pointer"
                  />
                  <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-[11px]">
                    Inactive (Discontinued)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column (1 col): Live Valuation Card */}
          <div className="space-y-4">
            <div className="card-panel p-4 rounded-2xl space-y-3 bg-[#FAF0E6] border border-[#E8D6C5]">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C532E] flex items-center space-x-1.5">
                <Scale className="h-4 w-4 text-[#965E36]" />
                <span>Live Valuation Summary</span>
              </h4>

              <div className="space-y-2 pt-1 border-t border-[#E2CEBC]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#7A6759]">Category:</span>
                  <span className="font-semibold text-[#2E1C11]">
                    {formData.category === 'Other' ? (formData.custom_category || 'Custom') : formData.category}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#7A6759]">Unit Type:</span>
                  <span className="font-semibold text-[#2E1C11]">
                    {formData.unit === 'Other' ? (formData.custom_unit || 'Custom') : formData.unit}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#7A6759]">Bundle Weight:</span>
                  <span className="font-mono font-bold text-[#2E1C11]">
                    {calcWeight > 0 ? `${calcWeight.toFixed(2)} kg` : '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#7A6759]">Selling Rate:</span>
                  <span className="font-mono font-bold text-[#965E36]">
                    {calcPricePerKg > 0 ? `${formatCurrency(calcPricePerKg)} / kg` : '₹ 0.00 / kg'}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#E2CEBC] flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#6E594A] uppercase">Est. Bundle Price:</span>
                  <span className="text-sm font-extrabold font-mono text-[#2E1C11]">
                    {estBundlePrice > 0 ? formatCurrency(estBundlePrice) : '₹ 0.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button Card */}
            <div className="card-panel p-4 rounded-2xl space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-extrabold shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>{isEdit ? 'Update Product Record' : 'Save & Publish Product'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
