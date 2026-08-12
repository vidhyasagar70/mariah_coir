// Currency formatter in INR (₹)
export function formatCurrency(amount) {
  const num = parseFloat(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(num);
}

// Date Formatter: YYYY-MM-DD to DD MMM YYYY
export function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

// B&W Minimalist Badge helper classes
export function getCategoryBadgeClass(category) {
  switch (category) {
    case 'Raw Material':
      return 'bg-slate-100 text-slate-800 border-slate-200';
    case 'Fuel':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'Utility':
      return 'bg-sky-50 text-sky-800 border-sky-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getStatusBadgeClass(status) {
  switch (status) {
    case 'Active':
    case 'Settled':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Partial':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Pending':
    case 'Inactive':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}
