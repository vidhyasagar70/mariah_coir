import api from './api';

export const getDustReportSummary = async (params) => {
  const response = await api.get('/dust/reports/customer-summary', { params });
  return response.data;
};

export const getDustCustomerLedger = async (customerId) => {
  const response = await api.get(`/dust/reports/customer-ledger/${customerId}`);
  return response.data;
};

export default {
  getDustReportSummary,
  getDustCustomerLedger
};
