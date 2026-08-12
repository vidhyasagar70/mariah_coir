// Format currency in INR (₹)
export function formatCurrency(amount) {
  const num = parseFloat(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(num);
}

// Format date YYYY-MM-DD to DD MMM YYYY
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

// Badge color maps for Material Types
export function getMaterialBadgeClass(materialType) {
  switch (materialType) {
    case 'Green Husk':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'Brown Husk':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'Water':
      return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    case 'Diesel':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    default:
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
}

// Badge color maps for Supplier Category
export function getCategoryBadgeClass(category) {
  switch (category) {
    case 'Raw Material':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'Fuel':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'Utility':
      return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    default:
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
}

// Badge color maps for Status
export function getStatusBadgeClass(status) {
  switch (status) {
    case 'Active':
    case 'Settled':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'Partial':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'Pending':
    case 'Inactive':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    default:
      return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  }
}
