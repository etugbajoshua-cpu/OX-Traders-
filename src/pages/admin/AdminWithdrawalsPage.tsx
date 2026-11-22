import React, { useEffect, useState } from 'react';
import { Withdrawal } from '../../types/index.ts';
import {
  approveWithdrawal,
  completeWithdrawal,
  getAdminWithdrawals,
  rejectWithdrawal,
} from '../../lib/firestoreService.ts';
import {
  ExternalLink,
  RefreshCw,
  X
} from 'lucide-react';

export const AdminWithdrawalsPage: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionProcessing, setActionProcessing] = useState<string | number | null>(null);

  // Modal to complete withdrawal with blockchain payout TxID
  const [completeModalWth, setCompleteModalWth] = useState<Withdrawal | null>(null);
  const [payoutTxHash, setPayoutTxHash] = useState('');

  // Modal to reject withdrawal & refund balance
  const [rejectModalWth, setRejectModalWth] = useState<Withdrawal | null>(null);
  const [rejectReason, setRejectReason] = useState('Address format mismatch or compliance flag');

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const list = await getAdminWithdrawals(statusFilter || undefined);
      setWithdrawals(list);
    } catch (err) {
      console.error('Failed to load withdrawals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [statusFilter]);

  const handleApprove = async (id: string | number) => {
    setActionProcessing(id);
    try {
      await approveWithdrawal(String(id));
      await fetchWithdrawals();
    } catch (err) {
      console.error(err);
    } finally {
      setActionProcessing(null);
    }
  };

  const handleExecuteComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModalWth || !payoutTxHash.trim()) return;

    setActionProcessing(completeModalWth.id);
    try {
      await completeWithdrawal(String(completeModalWth.id), payoutTxHash.trim());
      setCompleteModalWth(null);
      setPayoutTxHash('');
      await fetchWithdrawals();
    } catch (err) {
      console.error(err);
    } finally {
      setActionProcessing(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalWth) return;

    setActionProcessing(rejectModalWth.id);
    try {
      await rejectWithdrawal(
        String(rejectModalWth.id),
        rejectReason.trim() || 'Compliance hold - funds returned to available balance'
      );
      setRejectModalWth(null);
      await fetchWithdrawals();
    } catch (err) {
      console.error(err);
    } finally {
      setActionProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Withdrawal Requests & Payouts
          </h2>
          <p className="text-xs text-[#848E9C] mt-1">
            Authorize investor payout requests, burn locked ledger balances, and record blockchain broadcast transaction IDs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-xs text-white focus:outline-none focus:border-[#F0B90B]"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={fetchWithdrawals}
            className="p-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white cursor-pointer"
            title="Refresh Withdrawals"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-[#1E2329] text-[#848E9C] uppercase text-[10px] tracking-wider border-b border-[#2B313A]">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Net Amount</th>
                <th className="py-3 px-4">Asset & Network</th>
                <th className="py-3 px-4">Destination Wallet Address</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Payout TxID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B313A] font-mono">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#848E9C] font-sans">
                    Loading withdrawals...
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#848E9C] font-sans">
                    No withdrawal requests matching the selected filter.
                  </td>
                </tr>
              ) : (
                withdrawals.map((wth) => {
                  const isPending = wth.status === 'pending' || wth.status === 'under_review' || wth.status === 'approved' || wth.status === 'processing';
                  return (
                    <tr key={wth.id} className="hover:bg-[#1E2329]/50">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-white">{wth.user_name || `User #${wth.user_id}`}</div>
                        <div className="text-[11px] text-[#848E9C] font-mono">{wth.user_email}</div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-white text-sm">
                        {wth.net_amount} {wth.currency}
                        <div className="text-[10px] text-[#848E9C] font-mono">Fee: {wth.fee}</div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#EAECEF]">
                        {wth.currency} ({wth.network})
                      </td>

                      <td className="py-3.5 px-4 text-[#848E9C] font-mono text-[11px]">
                        {wth.destination_address}
                      </td>

                      <td className="py-3.5 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          wth.status === 'completed'
                            ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                            : wth.status === 'rejected'
                            ? 'bg-[#F6465D]/15 text-[#F6465D]'
                            : 'bg-[#F0B90B]/15 text-[#F0B90B]'
                        }`}>
                          {wth.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#848E9C] text-[11px]">
                        {wth.payout_tx_hash ? (
                          <a
                            href={wth.currency === 'BTC' ? `https://mempool.space/tx/${wth.payout_tx_hash}` : `https://tronscan.org/#/transaction/${wth.payout_tx_hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#F0B90B] hover:underline flex items-center gap-1 font-mono"
                          >
                            <span>{wth.payout_tx_hash.substring(0, 8)}...</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[#5E6673] italic font-sans">Awaiting broadcast</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#5E6673] text-[11px]">
                        {new Date(wth.created_at).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-sans space-x-1.5">
                        {isPending ? (
                          <>
                            {wth.status === 'pending' && (
                              <button
                                onClick={() => handleApprove(wth.id)}
                                disabled={actionProcessing === wth.id}
                                className="px-2.5 py-1.5 rounded-lg bg-[#1E2329] hover:bg-[#2B313A] text-white border border-[#2B313A] font-bold text-xs uppercase cursor-pointer"
                              >
                                Approve
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setCompleteModalWth(wth);
                                setPayoutTxHash('');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold text-xs uppercase shadow-sm cursor-pointer"
                            >
                              Complete & Record TxID
                            </button>

                            <button
                              onClick={() => {
                                setRejectReason('Address format mismatch or compliance flag');
                                setRejectModalWth(wth);
                              }}
                              disabled={actionProcessing === wth.id}
                              className="px-2.5 py-1.5 rounded-lg bg-[#F6465D]/10 hover:bg-[#F6465D]/20 text-[#F6465D] border border-[#F6465D]/30 font-semibold text-xs cursor-pointer"
                            >
                              Reject & Refund
                            </button>
                          </>
                        ) : (
                          <span className="text-[#5E6673] text-[11px] italic">Resolved</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Withdrawal Modal */}
      {completeModalWth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setCompleteModalWth(null)}
              className="absolute top-5 right-5 p-1 text-[#848E9C] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">
              Broadcast Confirmation & Payout TxID
            </h3>
            <p className="text-xs text-[#848E9C] mb-4">
              Payout {completeModalWth.net_amount} {completeModalWth.currency} to {completeModalWth.destination_address}. Enter the blockchain transaction hash returned by your signing node or hardware wallet.
            </p>

            <form onSubmit={handleExecuteComplete} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                  Blockchain Broadcast Transaction Hash (TxID) *
                </label>
                <input
                  type="text"
                  required
                  value={payoutTxHash}
                  onChange={(e) => setPayoutTxHash(e.target.value)}
                  placeholder="64-character hexadecimal transaction ID"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCompleteModalWth(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing === completeModalWth.id}
                  className="flex-1 py-2.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  {actionProcessing === completeModalWth.id ? 'Processing...' : 'Mark Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject & Refund Modal */}
      {rejectModalWth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setRejectModalWth(null)}
              className="absolute top-4 right-4 p-1 text-[#848E9C] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">Reject Withdrawal &amp; Refund Balance</h3>
            <p className="text-xs text-[#848E9C] mb-4">
              Locked balance ({rejectModalWth.amount} {rejectModalWth.currency}) will be returned to the investor&apos;s available wallet.
            </p>
            <form onSubmit={handleConfirmReject} className="space-y-4">
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B] resize-none"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRejectModalWth(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing === rejectModalWth.id}
                  className="flex-1 py-2.5 rounded-xl bg-[#F6465D] hover:bg-[#F6465D]/90 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  {actionProcessing === rejectModalWth.id ? 'Refunding...' : 'Reject & Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
