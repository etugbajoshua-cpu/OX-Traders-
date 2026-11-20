import React, { useEffect, useState } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected User Full Profile Drawer/Modal
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Balance Adjustment Modal State
  const [adjustModalUser, setAdjustModalUser] = useState<any | null>(null);
  const [adjustCurrency, setAdjustCurrency] = useState<'USD' | 'BTC' | 'USDT'>('USD');
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);
  const [adjustMsg, setAdjustMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Send Notification Modal State
  const [notifyModalUser, setNotifyModalUser] = useState<any | null>(null);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyBody, setNotifyBody] = useState('');
  const [sendingNotify, setSendingNotify] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, statusFilter]);

  const viewUserProfile = async (userId: number) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data);
      }
    } catch (err) {
      console.error('Failed to load user profile detail:', err);
    }
  };

  const handleUpdateStatus = async (userId: number, newStatus: string) => {
    try {
      const reason = prompt(`Enter compliance reason for setting account to ${newStatus.toUpperCase()}:`, 'Administrative policy compliance');
      if (reason === null) return;

      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason })
      });

      if (res.ok) {
        await fetchUsers();
        if (selectedUser?.user?.id === userId) {
          await viewUserProfile(userId);
        }
      }
    } catch (err) {
      console.error('Failed to update user status:', err);
    }
  };

  const handleExecuteAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalUser || !adjustAmount || !adjustReason) return;

    setSubmittingAdjust(true);
    setAdjustMsg(null);

    try {
      const res = await fetch(`/api/admin/users/${adjustModalUser.id}/balance-adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: adjustCurrency,
          type: adjustType,
          amount: parseFloat(adjustAmount),
          reason: adjustReason.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAdjustMsg({ type: 'error', text: data.error || 'Adjustment failed' });
      } else {
        setAdjustMsg({
          type: 'success',
          text: `Adjustment executed successfully. Transaction Ref: ${data.ref}`
        });
        setAdjustAmount('');
        setAdjustReason('');
        await fetchUsers();
        if (selectedUser?.user?.id === adjustModalUser.id) {
          await viewUserProfile(adjustModalUser.id);
        }
        setTimeout(() => setAdjustModalUser(null), 1800);
      }
    } catch (err: any) {
      setAdjustMsg({ type: 'error', text: err.message || 'Error occurred' });
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyModalUser || !notifyTitle || !notifyBody) return;

    setSendingNotify(true);
    try {
      const res = await fetch(`/api/admin/users/${notifyModalUser.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notifyTitle.trim(),
          message: notifyBody.trim(),
          type: 'info'
        })
      });

      if (res.ok) {
        setNotifyModalUser(null);
        setNotifyTitle('');
        setNotifyBody('');
      }
    } catch (err) {
      console.error('Failed to send notification:', err);
    } finally {
      setSendingNotify(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            User Accounts & Balance Control
          </h2>
          <p className="text-xs text-[#848E9C] mt-1">
            Search investor profiles, view balances, execute double-entry ledger adjustments, and manage access privileges.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#848E9C] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search user or email..."
              className="pl-9 pr-4 py-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-xs text-white focus:outline-none focus:border-[#F0B90B] w-48 sm:w-60"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-xs text-white focus:outline-none focus:border-[#F0B90B]"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="restricted">Restricted</option>
            <option value="suspended">Suspended</option>
          </select>

          <button
            onClick={fetchUsers}
            className="p-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white cursor-pointer"
            title="Refresh Users"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-[#1E2329] text-[#848E9C] uppercase text-[10px] tracking-wider border-b border-[#2B313A]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Balances (USD / BTC / USDT)</th>
                <th className="py-3 px-4">KYC Status</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B313A] font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#848E9C] font-sans">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#848E9C] font-sans">
                    No users matching search filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#1E2329]/50">
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{u.full_name}</span>
                        <span className="text-[10px] text-[#848E9C] font-mono">#{u.id}</span>
                      </div>
                      <div className="text-[#848E9C] text-[11px] font-mono">{u.email}</div>
                      <div className="text-[#5E6673] text-[10px]">{u.country}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-[#0ECB81] font-bold">${(u.usd_balance || 0).toLocaleString()} USD</div>
                      <div className="text-[#848E9C] text-[10px]">₿ {(u.btc_balance || 0).toFixed(4)} • ₮ {(u.usdt_balance || 0).toFixed(2)}</div>
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        u.kyc_status === 'verified'
                          ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                          : u.kyc_status === 'pending'
                          ? 'bg-[#F0B90B]/15 text-[#F0B90B]'
                          : 'bg-[#1E2329] text-[#848E9C]'
                      }`}>
                        {u.kyc_status?.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        u.status === 'active'
                          ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                          : u.status === 'restricted'
                          ? 'bg-[#F0B90B]/15 text-[#F0B90B]'
                          : 'bg-[#F6465D]/15 text-[#F6465D]'
                      }`}>
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[#848E9C] text-[11px]">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right font-sans space-x-1.5">
                      <button
                        onClick={() => viewUserProfile(u.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#1E2329] hover:bg-[#2B313A] text-white text-xs font-semibold cursor-pointer"
                        title="View Full Profile"
                      >
                        Inspect
                      </button>

                      <button
                        onClick={() => {
                          setAdjustModalUser(u);
                          setAdjustMsg(null);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#F0B90B] hover:bg-[#FCD535] text-black text-xs font-bold cursor-pointer"
                        title="Balance Adjustment"
                      >
                        Adjust
                      </button>

                      <button
                        onClick={() => setNotifyModalUser(u)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#1E2329] hover:bg-[#2B313A] text-[#848E9C] hover:text-white border border-[#2B313A] text-xs font-semibold cursor-pointer"
                        title="Send Notification"
                      >
                        Notify
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect User Full Profile Drawer / Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 p-1 text-[#848E9C] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-[#2B313A]">
              <div className="w-12 h-12 rounded-xl bg-[#F0B90B]/15 text-[#F0B90B] font-black text-xl flex items-center justify-center">
                {selectedUser.user.full_name?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>{selectedUser.user.full_name}</span>
                  <span className="text-xs font-mono text-[#848E9C]">#{selectedUser.user.id}</span>
                </h3>
                <div className="text-xs text-[#848E9C] font-mono">
                  {selectedUser.user.email} • {selectedUser.user.phone || 'No phone'} • Country: {selectedUser.user.country}
                </div>
              </div>
            </div>

            {/* Balances Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 p-4 rounded-xl bg-[#0B0E11] border border-[#2B313A] font-mono text-xs">
              <div>
                <span className="text-[#848E9C] block text-[10px] uppercase">USD Balance</span>
                <span className="text-[#0ECB81] font-bold text-base">${selectedUser.balances.USD?.available.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[#848E9C] block text-[10px] uppercase">BTC Balance</span>
                <span className="text-white font-bold text-base">{selectedUser.balances.BTC?.total} BTC</span>
              </div>
              <div>
                <span className="text-[#848E9C] block text-[10px] uppercase">USDT Balance</span>
                <span className="text-white font-bold text-base">{selectedUser.balances.USDT?.total} USDT</span>
              </div>
            </div>

            {/* Account Status Control */}
            <div className="p-4 rounded-xl bg-[#1E2329] border border-[#2B313A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div className="text-xs">
                <span className="text-[#848E9C]">Current Status: </span>
                <span className="font-bold text-white uppercase">{selectedUser.user.status}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedUser.user.status !== 'active' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedUser.user.id, 'active')}
                    className="px-3 py-1.5 rounded-lg bg-[#0ECB81] hover:bg-[#0ECB81]/90 text-black font-bold text-xs uppercase cursor-pointer"
                  >
                    Activate
                  </button>
                )}
                {selectedUser.user.status !== 'restricted' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedUser.user.id, 'restricted')}
                    className="px-3 py-1.5 rounded-lg bg-[#F0B90B]/15 text-[#F0B90B] border border-[#F0B90B]/30 text-xs font-semibold cursor-pointer"
                  >
                    Restrict
                  </button>
                )}
                {selectedUser.user.status !== 'suspended' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedUser.user.id, 'suspended')}
                    className="px-3 py-1.5 rounded-lg bg-[#F6465D]/15 text-[#F6465D] border border-[#F6465D]/30 text-xs font-semibold cursor-pointer"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </div>

            {/* Investments List */}
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#848E9C] mb-2">Active Investments</h4>
              {selectedUser.investments.length === 0 ? (
                <div className="text-xs text-[#848E9C]">No investment positions</div>
              ) : (
                <div className="space-y-1.5 font-mono text-xs">
                  {selectedUser.investments.map((inv: any) => (
                    <div key={inv.id} className="p-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] flex justify-between">
                      <span className="font-sans font-bold text-white">{inv.plan_name}</span>
                      <span className="text-[#0ECB81]">${inv.capital_amount} (Earned: ${inv.total_earned})</span>
                      <span className="text-[#848E9C] text-[11px]">{inv.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#848E9C] mb-2">Recent Transactions</h4>
              <div className="space-y-1.5 font-mono text-xs max-h-48 overflow-y-auto">
                {selectedUser.transactions.slice(0, 8).map((tx: any) => (
                  <div key={tx.id} className="p-2 rounded-lg bg-[#0B0E11] border border-[#2B313A] flex justify-between">
                    <span className="text-white font-bold">{tx.transaction_ref}</span>
                    <span className="font-sans text-[#848E9C]">{tx.type}</span>
                    <span className="text-[#0ECB81]">{tx.amount} {tx.currency}</span>
                    <span className="text-[#848E9C]">{tx.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Balance Adjustment Modal */}
      {adjustModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setAdjustModalUser(null)}
              className="absolute top-5 right-5 p-1 text-[#848E9C] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F0B90B] bg-[#F0B90B]/10 px-2 py-0.5 rounded">
                Double-Entry Ledger Action
              </span>
              <h3 className="text-xl font-bold text-white mt-2">
                Adjust Balance for {adjustModalUser.full_name}
              </h3>
              <p className="text-xs text-[#848E9C] mt-0.5">
                All balance adjustments are recorded in the immutable transaction ledger and admin audit logs.
              </p>
            </div>

            {adjustMsg && (
              <div
                className={`mb-4 p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                  adjustMsg.type === 'success'
                    ? 'bg-[#0ECB81]/15 border border-[#0ECB81]/30 text-[#0ECB81]'
                    : 'bg-[#F6465D]/15 border border-[#F6465D]/30 text-[#F6465D]'
                }`}
              >
                {adjustMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{adjustMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleExecuteAdjustment} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1">Action Type *</label>
                  <select
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B]"
                  >
                    <option value="credit">Credit User (Deposit / Bonus)</option>
                    <option value="debit">Debit User (Clawback)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1">Currency *</label>
                  <select
                    value={adjustCurrency}
                    onChange={(e) => setAdjustCurrency(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B]"
                  >
                    <option value="USD">USD</option>
                    <option value="BTC">Bitcoin (BTC)</option>
                    <option value="USDT">Tether (USDT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">Adjustment Amount *</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="e.g. 500.00"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                  Mandatory Audit Reason / Justification *
                </label>
                <textarea
                  rows={3}
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Manual bank wire deposit verification #WIRE-8942 / Ledger reconciliation"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B] resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustModalUser(null)}
                  className="flex-1 py-3 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="flex-1 py-3 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                >
                  {submittingAdjust ? 'Executing...' : 'Post to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Notification Modal */}
      {notifyModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setNotifyModalUser(null)}
              className="absolute top-5 right-5 p-1 text-[#848E9C] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">Notify {notifyModalUser.full_name}</h3>
            <p className="text-xs text-[#848E9C] mb-4">Deliver an official in-dashboard notification to this investor.</p>

            <form onSubmit={handleSendNotification} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">Notification Title *</label>
                <input
                  type="text"
                  required
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  placeholder="e.g. Deposit Credited / Security Advisory"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">Message Body *</label>
                <textarea
                  rows={4}
                  required
                  value={notifyBody}
                  onChange={(e) => setNotifyBody(e.target.value)}
                  placeholder="Write clear instructions or information for the user..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B] resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setNotifyModalUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingNotify}
                  className="flex-1 py-2.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  {sendingNotify ? 'Sending...' : 'Deliver Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
