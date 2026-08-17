import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Eye, X, ArrowDownCircle, ArrowUpCircle, Wallet, ChevronLeft } from 'lucide-react';

const API = 'http://localhost:5000/api/supply';

export default function AccountManagement() {
  const [accounts, setAccounts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState('advance');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [ledgerView, setLedgerView] = useState(null);
  const [ledgerData, setLedgerData] = useState({ account: null, ledger: [] });
  const [createForm, setCreateForm] = useState({ supplier_id: '', balance_type: 'Payable', amount: '0' });
  const [txForm, setTxForm] = useState({ amount: '', transaction_date: new Date().toISOString().split('T')[0], description: '' });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/accounts`);
      const json = await res.json();
      setAccounts(json.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API}/suppliers?status=Active`);
      const json = await res.json();
      setSuppliers(json.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchLedger = async (accountId) => {
    try {
      const res = await fetch(`${API}/accounts/${accountId}/ledger`);
      const json = await res.json();
      setLedgerData(json);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAccounts(); fetchSuppliers(); }, []);

  const handleCreateAccount = async () => {
    if (!createForm.supplier_id) return;
    const numAmount = Math.abs(parseFloat(createForm.amount || 0));
    const opening_balance = createForm.balance_type === 'Advance' ? -numAmount : numAmount;

    await fetch(`${API}/accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplier_id: createForm.supplier_id,
        account_type: createForm.balance_type,
        opening_balance
      })
    });
    setShowCreateModal(false);
    setCreateForm({ supplier_id: '', balance_type: 'Payable', amount: '0' });
    fetchAccounts();
  };

  const openTransaction = (account, type) => {
    setSelectedAccount(account);
    setTransactionType(type);
    setTxForm({ amount: '', transaction_date: new Date().toISOString().split('T')[0], description: '', reference_no: '', custom_reference_no: '' });
    setShowTransactionModal(true);
  };

  const handleTransaction = async () => {
    if (!txForm.amount || parseFloat(txForm.amount) <= 0) return;
    const endpoint = transactionType === 'advance' ? 'advance' : 'payment';
    const payload = {
      ...txForm,
      reference_no: txForm.custom_reference_no || txForm.reference_no
    };
    await fetch(`${API}/accounts/${selectedAccount.id}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setShowTransactionModal(false);
    fetchAccounts();
    if (ledgerView) fetchLedger(ledgerView);
  };

  const openLedger = (account) => {
    setLedgerView(account.id);
    fetchLedger(account.id);
  };

  const fmt = (v) => parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalPayable = accounts.reduce((s, a) => s + Math.max(0, parseFloat(a.current_balance || 0)), 0);
  const totalAdvance = accounts.reduce((s, a) => s + Math.max(0, -parseFloat(a.current_balance || 0)), 0);

  // Ledger Detail View
  if (ledgerView) {
    const acct = ledgerData.account;
    return (
      <div className="space-y-4">
        <button onClick={() => setLedgerView(null)} className="flex items-center space-x-1.5 text-xs font-bold text-[#965E36] hover:text-[#7A4A28] transition cursor-pointer">
          <ChevronLeft className="h-4 w-4" /><span>Back to Accounts</span>
        </button>

        {acct && (
          <div className="bg-[#EFE6DC] rounded-2xl border border-[#D6C4B0] p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-[#7C5A3E] tracking-wider">Supplier Account Ledger</p>
                <h2 className="text-lg font-extrabold text-[#2E1A0C]">{acct.supplier_name} <span className="text-sm font-mono text-[#965E36]">{acct.supplier_code}</span></h2>
                <p className="text-xs text-[#7C5A3E] mt-0.5">
                  Current Balance: <span className={`font-bold ${parseFloat(acct.current_balance) > 0 ? 'text-red-600' : parseFloat(acct.current_balance) < 0 ? 'text-emerald-600' : 'text-[#2E1A0C]'}`}>
                    ₹ {fmt(Math.abs(acct.current_balance))} {parseFloat(acct.current_balance) > 0 ? '(Payable)' : parseFloat(acct.current_balance) < 0 ? '(Advance)' : '(Settled)'}
                  </span>
                </p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => openTransaction(acct, 'advance')} className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer">
                  <ArrowUpCircle className="h-3.5 w-3.5" /><span>Advance</span>
                </button>
                <button onClick={() => openTransaction(acct, 'payment')} className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition cursor-pointer">
                  <ArrowDownCircle className="h-3.5 w-3.5" /><span>Payment</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#D6C4B0] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-[#EFE6DC] text-[#5C3B21]">
                <tr>
                  <th className="text-left px-4 py-3 font-bold">Date</th>
                  <th className="text-left px-4 py-3 font-bold">Type</th>
                  <th className="text-left px-4 py-3 font-bold">Description</th>
                  <th className="text-right px-4 py-3 font-bold">Debit (₹)</th>
                  <th className="text-right px-4 py-3 font-bold">Credit (₹)</th>
                  <th className="text-right px-4 py-3 font-bold">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE6DC]">
                {ledgerData.ledger.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-[#8C694E]">No transactions yet.</td></tr>
                ) : ledgerData.ledger.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#FAF7F2] transition">
                    <td className="px-4 py-3 text-[#5C3B21]">{tx.transaction_date?.split('T')[0]}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.transaction_type === 'Supply Receipt' ? 'bg-amber-100 text-amber-700' :
                        tx.transaction_type === 'Advance Payment' ? 'bg-emerald-100 text-emerald-700' :
                        tx.transaction_type === 'Payment' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{tx.transaction_type}</span>
                    </td>
                    <td className="px-4 py-3 text-[#7C5A3E] max-w-[200px] truncate">{tx.description || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">{parseFloat(tx.debit) > 0 ? fmt(tx.debit) : '-'}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">{parseFloat(tx.credit) > 0 ? fmt(tx.credit) : '-'}</td>
                    <td className="px-4 py-3 text-right font-bold font-mono text-[#2E1A0C]">₹ {fmt(tx.running_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Account List View
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-[#E2D2C2]"><CreditCard className="h-5 w-5 text-[#965E36]" /></div>
          <div>
            <h2 className="text-base font-extrabold text-[#2E1A0C]">Supplier Accounts</h2>
            <p className="text-[11px] text-[#7C5A3E]">{accounts.length} account(s) • Track payables & advances</p>
          </div>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-[#965E36] text-white text-xs font-bold hover:bg-[#7A4A28] transition shadow-xs cursor-pointer">
          <Plus className="h-3.5 w-3.5" /><span>Create Account</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-[#D6C4B0] p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#7C5A3E] tracking-wider">Total Accounts</p>
          <p className="text-2xl font-extrabold text-[#2E1A0C] mt-1">{accounts.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#D6C4B0] p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#7C5A3E] tracking-wider">Total Payable</p>
          <p className="text-2xl font-extrabold text-red-600 mt-1">₹ {fmt(totalPayable)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#D6C4B0] p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#7C5A3E] tracking-wider">Total Advance</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">₹ {fmt(totalAdvance)}</p>
        </div>
      </div>

      {/* Account Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full text-center py-8 text-[#8C694E] text-xs">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full text-center py-8 text-[#8C694E] text-xs">No accounts yet. Create one linked to a supplier.</div>
        ) : accounts.map(acct => (
          <div key={acct.id} className="bg-white rounded-2xl border border-[#D6C4B0] p-4 shadow-xs space-y-3 hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-[#2E1A0C] text-sm">{acct.supplier_name}</h3>
                <span className="text-[10px] font-mono text-[#965E36]">{acct.supplier_code}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${acct.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {acct.status}
              </span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-[#7C5A3E]">Current Balance</p>
                <p className={`text-lg font-extrabold ${parseFloat(acct.current_balance) > 0 ? 'text-red-600' : parseFloat(acct.current_balance) < 0 ? 'text-emerald-600' : 'text-[#2E1A0C]'}`}>
                  ₹ {fmt(Math.abs(acct.current_balance))}
                </p>
                <p className="text-[10px] font-bold text-[#7C5A3E]">{parseFloat(acct.current_balance) > 0 ? 'Payable' : parseFloat(acct.current_balance) < 0 ? 'Advance' : 'Settled'}</p>
              </div>
            </div>
            <div className="flex space-x-1.5 pt-1">
              <button onClick={() => openLedger(acct)} className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg bg-[#EFE6DC] text-[#5C3B21] text-[10px] font-bold hover:bg-[#E2D2C2] transition cursor-pointer">
                <Eye className="h-3 w-3" /><span>Ledger</span>
              </button>
              <button onClick={() => openTransaction(acct, 'advance')} className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold hover:bg-emerald-100 transition cursor-pointer">
                <ArrowUpCircle className="h-3 w-3" /><span>Advance</span>
              </button>
              <button onClick={() => openTransaction(acct, 'payment')} className="flex-1 flex items-center justify-center space-x-1 px-2 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-[10px] font-bold hover:bg-blue-100 transition cursor-pointer">
                <ArrowDownCircle className="h-3 w-3" /><span>Pay</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#D6C4B0] w-full max-w-md p-6 shadow-xl space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[#2E1A0C]">Create Supplier Account</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-[#E2D2C2] cursor-pointer"><X className="h-4 w-4 text-[#7C5A3E]" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Supplier *</label>
                <select value={createForm.supplier_id} onChange={e => setCreateForm({...createForm, supplier_id: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none">
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.supplier_code} – {s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Account Balance Type *</label>
                <select
                  value={createForm.balance_type}
                  onChange={e => setCreateForm({...createForm, balance_type: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none"
                >
                  <option value="Payable">Payable (Company owes money to supplier)</option>
                  <option value="Advance">Advance Payment (Company pre-paid advance to supplier)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Opening Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={createForm.amount}
                  onChange={e => setCreateForm({...createForm, amount: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none font-semibold"
                />
                <div className="mt-2 p-2.5 bg-[#EFE6DC] rounded-xl border border-[#D6C4B0] text-[11px]">
                  {createForm.balance_type === 'Advance' ? (
                    <p className="text-emerald-700 font-bold">
                      ✓ <strong>Advance Opening Balance:</strong> Company has pre-paid ₹{parseFloat(createForm.amount || 0).toLocaleString('en-IN')} advance to this supplier.
                    </p>
                  ) : (
                    <p className="text-amber-800 font-bold">
                      ✓ <strong>Payable Opening Balance:</strong> Company owes ₹{parseFloat(createForm.amount || 0).toLocaleString('en-IN')} to this supplier.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-[#5C3B21] hover:bg-[#E2D2C2] transition cursor-pointer">Cancel</button>
              <button onClick={handleCreateAccount} className="px-5 py-2 rounded-xl bg-[#965E36] text-white text-xs font-bold hover:bg-[#7A4A28] transition shadow-xs cursor-pointer">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#D6C4B0] w-full max-w-md p-6 shadow-xl space-y-4 mx-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[#2E1A0C]">
                {transactionType === 'advance' ? 'Record Advance Payment' : 'Record Payment'}
              </h3>
              <button onClick={() => setShowTransactionModal(false)} className="p-1 rounded-lg hover:bg-[#E2D2C2] cursor-pointer"><X className="h-4 w-4 text-[#7C5A3E]" /></button>
            </div>
            <p className="text-xs text-[#7C5A3E]">
              Supplier: <span className="font-bold text-[#2E1A0C]">{selectedAccount?.supplier_name}</span>
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Amount (₹) *</label>
                <input type="number" step="0.01" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} placeholder="Enter amount"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Date</label>
                <input type="date" value={txForm.transaction_date} onChange={e => setTxForm({...txForm, transaction_date: e.target.value})}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Custom Ref No / UPI Transaction ID / Cheque No</label>
                <input value={txForm.custom_reference_no || ''} onChange={e => setTxForm({...txForm, custom_reference_no: e.target.value})} placeholder="e.g. UPI/129381923 / CHQ-88231"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#5C3B21] block mb-1">Description</label>
                <textarea value={txForm.description} onChange={e => setTxForm({...txForm, description: e.target.value})} rows={2} placeholder="Optional notes..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D6C4B0] bg-white text-[#2E1A0C] focus:ring-2 focus:ring-[#965E36] outline-none resize-none" />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button onClick={() => setShowTransactionModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-[#5C3B21] hover:bg-[#E2D2C2] transition cursor-pointer">Cancel</button>
              <button onClick={handleTransaction} className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition shadow-xs cursor-pointer ${transactionType === 'advance' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {transactionType === 'advance' ? 'Record Advance' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
