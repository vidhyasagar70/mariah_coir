import React from 'react';
import { X, Calendar, CreditCard, DollarSign, FileText, Building, Hash, CheckCircle, Clock, XCircle, User, Info } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';

// Helper function to mask account numbers (showing only last 4 digits)
export function maskAccountNumber(accNumber) {
  if (!accNumber) return '-';
  const str = String(accNumber).trim();
  if (str.length <= 4) return str;
  const last4 = str.slice(-4);
  return `•••• ${last4}`;
}

export default function MiscellaneousViewDrawer({ record, onClose, onEdit }) {
  if (!record) return null;

  const isOnline = (record.payment_mode || '').toUpperCase() === 'ONLINE';

  const getStatusBadge = (status) => {
    const st = (status || 'PAID').toUpperCase();
    switch (st) {
      case 'PAID':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>PAID</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="h-3.5 w-3.5" />
            <span>PENDING</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="h-3.5 w-3.5" />
            <span>CANCELLED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-50 text-stone-700 border border-stone-200">
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1C120C]/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Slide Drawer Panel */}
      <div className="relative z-50 w-full max-w-lg bg-[#FAF7F2] text-[#2E1C11] h-full shadow-2xl flex flex-col border-l border-[#D6C4B0] animate-slide-in">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#EFE6DC] border-b border-[#D6C4B0] flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-xl bg-[#965E36] text-white shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-[#2E1A0C] truncate">Miscellaneous Record Details</h2>
              <p className="text-xs text-[#7C5A3E] font-mono truncate">{record.id}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#7C5A3E] hover:text-[#2E1A0C] hover:bg-[#E2D2C2] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Top Amount & Status Summary */}
          <div className="card-panel p-4 rounded-2xl bg-white border border-[#E8DCD0] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#6E594A]">EXPENSE AMOUNT</span>
              {getStatusBadge(record.status)}
            </div>
            <div className="text-2xl font-black font-mono text-[#2E1C11]">
              {formatCurrency(record.amount)}
            </div>
          </div>

          {/* Core Expense Information */}
          <div className="card-panel p-4 rounded-2xl bg-white border border-[#E8DCD0] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7C5A3E] pb-2 border-b border-[#F0E6DD] flex items-center space-x-1.5">
              <Info className="h-4 w-4 text-[#965E36]" />
              <span>Expense Information</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#7A6759] font-medium block">Description</span>
                <p className="font-semibold text-[#2E1C11] text-sm mt-0.5 whitespace-pre-wrap">{record.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[#7A6759] font-medium block">Expense Date</span>
                  <div className="font-semibold text-[#2E1C11] flex items-center space-x-1 mt-0.5">
                    <Calendar className="h-3.5 w-3.5 text-[#965E36]" />
                    <span>{formatDate(record.expense_date)}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[#7A6759] font-medium block">Payment Mode</span>
                  <div className="font-semibold text-[#2E1C11] flex items-center space-x-1 mt-0.5">
                    <CreditCard className="h-3.5 w-3.5 text-[#965E36]" />
                    <span className="capitalize">{record.payment_mode}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Specific Details Section */}
          <div className="card-panel p-4 rounded-2xl bg-white border border-[#E8DCD0] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#7C5A3E] pb-2 border-b border-[#F0E6DD] flex items-center space-x-1.5">
              <CreditCard className="h-4 w-4 text-[#965E36]" />
              <span>{isOnline ? 'Online Payment Details' : 'Offline Payment Details'}</span>
            </h3>

            <div className="space-y-3 text-xs">
              {isOnline ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[#7A6759] font-medium block">Masked Account Number</span>
                      <p className="font-mono font-bold text-[#2E1C11] mt-0.5">{maskAccountNumber(record.account_number)}</p>
                    </div>

                    <div>
                      <span className="text-[#7A6759] font-medium block">Bank / Account Name</span>
                      <p className="font-semibold text-[#2E1C11] mt-0.5">{record.bank_name || '-'}</p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[#7A6759] font-medium block">Transaction Reference</span>
                    <p className="font-mono font-semibold text-[#2E1C11] mt-0.5">{record.transaction_reference || '-'}</p>
                  </div>
                </>
              ) : (
                <div>
                  <span className="text-[#7A6759] font-medium block">Payment Reference</span>
                  <p className="font-mono font-semibold text-[#2E1C11] mt-0.5">{record.payment_reference || '-'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes Section (if present) */}
          {record.notes && (
            <div className="card-panel p-4 rounded-2xl bg-white border border-[#E8DCD0] space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#7C5A3E] block">Notes / Additional Info</span>
              <p className="text-xs text-[#2E1C11] whitespace-pre-wrap leading-relaxed">{record.notes}</p>
            </div>
          )}

          {/* Audit Metadata */}
          <div className="card-panel p-4 rounded-2xl bg-[#F5ECE3] border border-[#E8DCD0] space-y-2 text-[11px] text-[#7A6759]">
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1">
                <User className="h-3 w-3 text-[#965E36]" />
                <span>Created By:</span>
              </span>
              <span className="font-mono font-semibold text-[#2E1C11]">{record.created_by || 'System User'}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#E2D2C2]">
              <span>Created At:</span>
              <span className="font-mono">{formatDate(record.created_at)}</span>
            </div>

            {record.updated_at && (
              <div className="flex items-center justify-between pt-1 border-t border-[#E2D2C2]">
                <span>Last Updated:</span>
                <span className="font-mono">{formatDate(record.updated_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#EFE6DC] border-t border-[#D6C4B0] flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white text-[#5C3B21] border border-[#D6C4B0] text-xs font-bold hover:bg-[#FAF7F2] transition-colors cursor-pointer"
          >
            Close
          </button>
          {onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit(record);
              }}
              className="px-4 py-2 rounded-xl bg-[#965E36] text-white text-xs font-bold hover:bg-[#7A4A28] transition-colors shadow-xs cursor-pointer"
            >
              Edit Record
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
