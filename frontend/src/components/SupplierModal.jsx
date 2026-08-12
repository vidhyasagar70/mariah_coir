import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, User, Building2, Phone, Tag } from 'lucide-react';
import api from '../services/api';
import VehicleRepeater from './VehicleRepeater';

export default function SupplierModal({ supplier, isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'Raw Material',
    company_name: '',
    contact_person: '',
    contact_number: '',
    status: 'Active'
  });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        category: supplier.category || 'Raw Material',
        company_name: supplier.company_name || '',
        contact_person: supplier.contact_person || '',
        contact_number: supplier.contact_number || '',
        status: supplier.status || 'Active'
      });
      setVehicles(supplier.vehicles || []);
    } else {
      setFormData({
        name: '',
        category: 'Raw Material',
        company_name: '',
        contact_person: '',
        contact_number: '',
        status: 'Active'
      });
      setVehicles([
        { vehicle_type: '6-Wheeler', rate_per_trip: '4500' }
      ]);
    }
    setError('');
  }, [supplier, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.contact_number) {
      setError('Supplier Name and Contact Number are required.');
      return;
    }

    try {
      setLoading(true);
      if (supplier) {
        await api.put(`/suppliers/${supplier.id}`, { ...formData, vehicles });
      } else {
        await api.post('/suppliers', { ...formData, vehicles });
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 border border-slate-200 shadow-xl space-y-5 relative max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-900">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {supplier ? `Edit Supplier (${supplier.id})` : 'Add New Supplier Entry'}
              </h3>
              <p className="text-xs text-slate-500">Configure supplier details and vehicle trip rate matrix</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Supplier Name */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Supplier Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder="e.g. Kavitha Green Husk Yard"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-600"
              />
            </div>
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Category *</label>
              <div className="relative">
                <Tag className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-slate-600 font-medium"
                >
                  <option value="Raw Material">Raw Material</option>
                  <option value="Fuel">Fuel</option>
                  <option value="Utility">Utility</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-slate-600 font-medium"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Company / Firm Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="e.g. Kavitha Agri Traders Ltd"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-600"
              />
            </div>
          </div>

          {/* Contact Person & Contact Number */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Contact Person</label>
              <input
                type="text"
                placeholder="e.g. R. Kavitha"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-600"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Contact Number *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Form Repeater Component */}
          <VehicleRepeater vehicles={vehicles} setVehicles={setVehicles} />

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold shadow-sm cursor-pointer disabled:opacity-50 transition-all"
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : supplier ? 'Update Supplier' : 'Save Supplier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
