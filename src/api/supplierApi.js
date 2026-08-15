import axios from 'axios';

const API_BASE = '/api/supplier-management';

export const supplierApi = {
  // Units
  getUnits: (params) => axios.get(`${API_BASE}/units`, { params }).then(r => r.data),
  createUnit: (data) => axios.post(`${API_BASE}/units`, data).then(r => r.data),
  updateUnit: (id, data) => axios.put(`${API_BASE}/units/${id}`, data).then(r => r.data),
  deleteUnit: (id) => axios.delete(`${API_BASE}/units/${id}`).then(r => r.data),

  // Raw Materials
  getRawMaterials: (params) => axios.get(`${API_BASE}/raw-materials`, { params }).then(r => r.data),
  createRawMaterial: (data) => axios.post(`${API_BASE}/raw-materials`, data).then(r => r.data),
  updateRawMaterial: (id, data) => axios.put(`${API_BASE}/raw-materials/${id}`, data).then(r => r.data),
  deleteRawMaterial: (id) => axios.delete(`${API_BASE}/raw-materials/${id}`).then(r => r.data),

  // Vehicle Types
  getVehicleTypes: (params) => axios.get(`${API_BASE}/vehicle-types`, { params }).then(r => r.data),
  createVehicleType: (data) => axios.post(`${API_BASE}/vehicle-types`, data).then(r => r.data),
  updateVehicleType: (id, data) => axios.put(`${API_BASE}/vehicle-types/${id}`, data).then(r => r.data),
  deleteVehicleType: (id) => axios.delete(`${API_BASE}/vehicle-types/${id}`).then(r => r.data),

  // Vehicles
  getVehicles: (params) => axios.get(`${API_BASE}/vehicles`, { params }).then(r => r.data),
  createVehicle: (data) => axios.post(`${API_BASE}/vehicles`, data).then(r => r.data),
  updateVehicle: (id, data) => axios.put(`${API_BASE}/vehicles/${id}`, data).then(r => r.data),
  deleteVehicle: (id) => axios.delete(`${API_BASE}/vehicles/${id}`).then(r => r.data),

  // Pricing Matrix
  getPricing: (params) => axios.get(`${API_BASE}/pricing`, { params }).then(r => r.data),
  resolvePrice: (raw_material_id, vehicle_type_id, date) =>
    axios.get(`${API_BASE}/pricing/resolve`, { params: { raw_material_id, vehicle_type_id, date } }).then(r => r.data),
  createPricing: (data) => axios.post(`${API_BASE}/pricing`, data).then(r => r.data),
  updatePricing: (id, data) => axios.put(`${API_BASE}/pricing/${id}`, data).then(r => r.data),
  deletePricing: (id) => axios.delete(`${API_BASE}/pricing/${id}`).then(r => r.data),

  // Suppliers
  getSuppliers: (params) => axios.get(`${API_BASE}/suppliers`, { params }).then(r => r.data),
  getSupplierById: (id) => axios.get(`${API_BASE}/suppliers/${id}`).then(r => r.data),
  createSupplier: (data) => axios.post(`${API_BASE}/suppliers`, data).then(r => r.data),
  updateSupplier: (id, data) => axios.put(`${API_BASE}/suppliers/${id}`, data).then(r => r.data),
  deleteSupplier: (id) => axios.delete(`${API_BASE}/suppliers/${id}`).then(r => r.data),

  // Supplier Relationships
  getSupplierRawMaterials: (supplierId) => axios.get(`${API_BASE}/suppliers/${supplierId}/raw-materials`).then(r => r.data),
  getSupplierVehicleTypes: (supplierId) => axios.get(`${API_BASE}/suppliers/${supplierId}/vehicle-types`).then(r => r.data),
  getSupplierVehicles: (supplierId, params) => axios.get(`${API_BASE}/suppliers/${supplierId}/vehicles`, { params }).then(r => r.data),

  // Accounts & Ledger
  recordTransaction: (data) => axios.post(`${API_BASE}/accounts/transaction`, data).then(r => r.data),
  getSupplierBalance: (supplierId) => axios.get(`${API_BASE}/accounts/${supplierId}/balance`).then(r => r.data),
  getSupplierLedger: (supplierId, params) => axios.get(`${API_BASE}/accounts/${supplierId}/ledger`, { params }).then(r => r.data),

  // Supply Entries
  getSupplyEntries: (params) => axios.get(`${API_BASE}/supply-entries`, { params }).then(r => r.data),
  getSupplyEntryById: (id) => axios.get(`${API_BASE}/supply-entries/${id}`).then(r => r.data),
  createSupplyEntry: (data) => axios.post(`${API_BASE}/supply-entries`, data).then(r => r.data),
  cancelSupplyEntry: (id) => axios.post(`${API_BASE}/supply-entries/${id}/cancel`).then(r => r.data)
};
