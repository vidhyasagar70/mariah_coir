import api from './api';

export const getSalesDispatches = async (params) => {
  const response = await api.get('/sales/dispatches', { params });
  return response.data;
};

export const getSalesDispatchById = async (id) => {
  const response = await api.get(`/sales/dispatches/${id}`);
  return response.data;
};

export const createSalesDispatch = async (data) => {
  const response = await api.post('/sales/dispatches', data);
  return response.data;
};

export const updateSalesDispatch = async (id, data) => {
  const response = await api.put(`/sales/dispatches/${id}`, data);
  return response.data;
};

export const deleteSalesDispatch = async (id) => {
  const response = await api.delete(`/sales/dispatches/${id}`);
  return response.data;
};

export const getSalesReportSummary = async (params) => {
  const response = await api.get('/sales/reports/summary', { params });
  return response.data;
};

export default {
  getSalesDispatches,
  getSalesDispatchById,
  createSalesDispatch,
  updateSalesDispatch,
  deleteSalesDispatch,
  getSalesReportSummary
};
