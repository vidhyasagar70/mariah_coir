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

// B&W (Brown & White) Minimalist Badge helper classes
export function getCategoryBadgeClass(category) {
  switch (category) {
    case 'Raw Material':
      return 'bg-[#F5ECE3] text-[#5C361E] border-[#E0CEBE]';
    case 'Fuel':
      return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
    case 'Utility':
      return 'bg-[#E0F2FE] text-[#075985] border-[#BAE6FD]';
    default:
      return 'bg-[#F5ECE3] text-[#5C361E] border-[#E0CEBE]';
  }
}

export function getStatusBadgeClass(status) {
  switch (status) {
    case 'Active':
    case 'Settled':
      return 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]';
    case 'Partial':
      return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
    case 'Pending':
    case 'Inactive':
      return 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]';
    default:
      return 'bg-[#F5ECE3] text-[#5C361E] border-[#E0CEBE]';
  }
}
