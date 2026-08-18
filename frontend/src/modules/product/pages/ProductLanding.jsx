import React, { useState, useEffect } from 'react';
import { Package, Search, Filter, Plus, Edit2, Trash2, Layers, CheckCircle2, XCircle, RotateCcw, IndianRupee, Scale, Tag, Calculator } from 'lucide-react';
import api from '../../../shared/services/api';
import { formatCurrency, formatDate, getStatusBadgeClass } from '../../../shared/utils/formatters';
import ProductForm from './ProductForm';

export default function ProductLanding({ search: globalSearch }) {
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState({
    totalProducts: 0,
    activeProducts: 0,
    inactiveProducts: 0,
    categoriesCount: 0
  });

  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState('list'); // 'list' | 'new' | 'edit'
  const [editingId, setEditingId] = useState(null);

  // Filters
  const [localSearch, setLocalSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      const querySearch = localSearch || globalSearch;
      if (querySearch) params.search = querySearch;
      if (categoryFilter !== 'All') params.category = categoryFilter;
      if (statusFilter !== 'All') params.status = statusFilter;

      const res = await api.get('/products', { params });
      setProducts(res.data.products || []);
      setSummary(res.data.summary || { totalProducts: 0, activeProducts: 0, inactiveProducts: 0, categoriesCount: 0 });
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewState === 'list') {
      fetchProducts();
    }
  }, [globalSearch, localSearch, categoryFilter, statusFilter, viewState]);

  const handleResetFilters = () => {
    setLocalSearch('');
    setCategoryFilter('All');
    setStatusFilter('All');
  };

  const hasActiveFilters = localSearch !== '' || categoryFilter !== 'All' || statusFilter !== 'All';

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete product "${name}" (${id})?`)) return;

    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting product: ' + err.message);
    }
  };

  const handleEdit = (id) => {
    setEditingId(id);
    setViewState('edit');
  };

  const handleAddNew = () => {
    setEditingId(null);
    setViewState('new');
  };

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'Coir Fibre':
        return 'bg-amber-50 text-amber-900 border-amber-200';
      case 'Coir Yarn':
        return 'bg-emerald-50 text-emerald-900 border-emerald-200';
      case 'Curled Coir':
        return 'bg-blue-50 text-blue-900 border-blue-200';
      case 'Coir Rope':
        return 'bg-purple-50 text-purple-900 border-purple-200';
      case 'Others':
      case 'Pith/Dust':
        return 'bg-stone-100 text-stone-900 border-stone-300';
      default:
        return 'bg-[#FAF0E6] text-[#8C532E] border-[#E8D6C5]';
    }
  };

  if (viewState === 'new' || viewState === 'edit') {
    return (
      <ProductForm
        editId={editingId}
        onNavigateBack={() => {
          setViewState('list');
          setEditingId(null);
        }}
        onSuccess={() => {
          setViewState('list');
          setEditingId(null);
          fetchProducts();
        }}
      />
    );
  }

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-130px)]">
      {/* Top Summary KPI Metrics Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        {/* TOTAL PRODUCTS */}
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">TOTAL PRODUCTS</span>
            <div className="p-1 rounded-md bg-[#FAF0E6] text-[#965E36]">
              <Package className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-[#2E1C11]">
            {summary.totalProducts} <span className="text-[11px] font-normal text-[#7A6759]">items</span>
          </div>
        </div>

        {/* ACTIVE PRODUCTS */}
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">ACTIVE TRADE</span>
            <div className="p-1 rounded-md bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-emerald-800">
            {summary.activeProducts} <span className="text-[11px] font-normal text-[#7A6759]">active</span>
          </div>
        </div>

        {/* INACTIVE PRODUCTS */}
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">INACTIVE</span>
            <div className="p-1 rounded-md bg-rose-50 text-rose-700">
              <XCircle className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-rose-800">
            {summary.inactiveProducts} <span className="text-[11px] font-normal text-[#7A6759]">disabled</span>
          </div>
        </div>

        {/* CATEGORIES COUNT */}
        <div className="card-panel px-3.5 py-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E594A]">CATEGORIES</span>
            <div className="p-1 rounded-md bg-blue-50 text-blue-700">
              <Layers className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="text-base font-extrabold font-mono text-[#2E1C11]">
            {summary.categoriesCount} <span className="text-[11px] font-normal text-[#7A6759]">types</span>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Add Button */}
      <div className="card-panel p-3 sm:p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Search Field */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#A8988B]" />
          <input
            type="text"
            placeholder="Search products by name or code..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#D6C4B0] text-xs text-[#2E1C11] placeholder-[#A8988B] focus:outline-none focus:border-[#965E36] font-medium transition-colors"
          />
        </div>

        {/* Filters & Add Action Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
            <Tag className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs text-[#2E1C11] bg-transparent focus:outline-none font-medium cursor-pointer"
            >
              <option value="All">All Categories</option>
              <option value="Coir Fibre">Coir Fibre</option>
              <option value="Coir Yarn">Coir Yarn</option>
              <option value="Curled Coir">Curled Coir</option>
              <option value="Coir Rope">Coir Rope</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 bg-white px-2.5 py-1 rounded-xl border border-[#D6C4B0]">
            <Filter className="h-3.5 w-3.5 text-[#A8988B] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs text-[#2E1C11] bg-transparent focus:outline-none font-medium cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Add Product Button */}
          <button
            onClick={handleAddNew}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#965E36] hover:bg-[#7A4A28] text-white text-xs font-extrabold shadow-sm transition-all duration-150 cursor-pointer ml-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Main Data Table Container */}
      <div className="card-panel rounded-2xl overflow-hidden flex-1 flex flex-col min-h-0 border border-[#E8DCD0]">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-xs text-[#7A6759] space-y-2">
            <div className="w-5 h-5 border-2 border-[#965E36] border-t-transparent rounded-full animate-spin"></div>
            <span>Loading product directory...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <Package className="h-10 w-10 text-[#D4C3B3] mx-auto" />
            <h3 className="text-sm font-bold text-[#2E1C11]">No Products Found</h3>
            <p className="text-xs text-[#7A6759]">Click "+ Add New Product" to create your first coir manufacturing product.</p>
            <button
              onClick={handleAddNew}
              className="px-4 py-2 rounded-xl bg-[#965E36] text-white text-xs font-bold hover:bg-[#7A4A28] transition-colors cursor-pointer"
            >
              + Add Product Now
            </button>
          </div>
        ) : (
          <div className="overflow-auto flex-1 h-full w-full">
            <table className="w-full text-left text-xs min-w-[820px]">
              <thead className="sticky top-0 z-10 bg-[#F5ECE3] border-b border-[#E8DCD0] shadow-2xs">
                <tr className="text-[#6E594A] font-bold uppercase tracking-wider">
                  <th className="p-3.5">PRODUCT ID</th>
                  <th className="p-3.5">PRODUCT NAME</th>
                  <th className="p-3.5">CATEGORY</th>
                  <th className="p-3.5">UNIT</th>
                  <th className="p-3.5">BUNDLE WEIGHT (KG)</th>
                  <th className="p-3.5">SELLING PRICE (₹ / KG)</th>
                  <th className="p-3.5">EST. BUNDLE PRICE (₹)</th>
                  <th className="p-3.5">STATUS</th>
                  <th className="p-3.5">CREATED AT</th>
                  <th className="p-3.5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EDE4] bg-white">
                {products.map((item) => {
                  const weight = parseFloat(item.approx_bundle_weight) || 0;
                  const pricePerKg = parseFloat(item.sell_price_per_kg !== undefined ? item.sell_price_per_kg : item.sell_price) || 0;
                  const estBundlePrice = weight * pricePerKg;

                  return (
                    <tr key={item.id} className="hover:bg-[#FAF7F2]/80 transition-colors">
                      {/* PRODUCT ID */}
                      <td className="p-3.5 font-mono font-bold text-[#2E1C11] whitespace-nowrap">
                        {item.id}
                      </td>

                      {/* PRODUCT NAME */}
                      <td className="p-3.5">
                        <div className="font-bold text-[#2E1C11] text-xs">{item.product_name}</div>
                      </td>

                      {/* CATEGORY */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${getCategoryBadge(item.category)}`}>
                          {item.category}
                        </span>
                      </td>

                      {/* UNIT */}
                      <td className="p-3.5 font-medium text-[#6E594A] whitespace-nowrap">
                        {item.unit || 'Bundle'}
                      </td>

                      {/* BUNDLE WEIGHT */}
                      <td className="p-3.5 font-mono font-bold text-[#2E1C11] whitespace-nowrap">
                        {weight.toFixed(2)} kg
                      </td>

                      {/* SELLING PRICE PER KG */}
                      <td className="p-3.5 font-mono font-bold text-[#965E36] text-sm whitespace-nowrap">
                        {formatCurrency(pricePerKg)} / kg
                      </td>

                      {/* ESTIMATED BUNDLE PRICE */}
                      <td className="p-3.5 font-mono font-bold text-[#2E1C11] text-xs whitespace-nowrap">
                        {formatCurrency(estBundlePrice)}
                      </td>

                      {/* STATUS */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>

                      {/* CREATED AT */}
                      <td className="p-3.5 text-[#6E594A] font-medium whitespace-nowrap text-[11px]">
                        {formatDate(item.created_at)}
                      </td>

                      {/* ACTIONS */}
                      <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => handleEdit(item.id)}
                          className="p-1.5 rounded-lg text-[#6E594A] hover:text-[#965E36] hover:bg-[#FAF0E6] transition-colors cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.product_name)}
                          className="p-1.5 rounded-lg text-[#A8988B] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
