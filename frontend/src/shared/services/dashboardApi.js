import api from './api';

export const getDashboardAnalytics = async (params) => {
  const response = await api.get('/dashboard/analytics', { params });
  return response.data;
};

export const getExpenses = async (params) => {
  const response = await api.get('/dashboard/expenses', { params });
  return response.data;
};

export const createExpense = async (data) => {
  const response = await api.post('/dashboard/expenses', data);
  return response.data;
};

export const deleteExpense = async (id) => {
  const response = await api.delete(`/dashboard/expenses/${id}`);
  return response.data;
};

export default {
  getDashboardAnalytics,
  getExpenses,
  createExpense,
  deleteExpense
};
