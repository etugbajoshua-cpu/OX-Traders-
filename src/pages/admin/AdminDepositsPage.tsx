import React, { useEffect, useState } from 'react';
import { Deposit } from '../../types/index.ts';
import {
  approveDeposit,
  getAdminDeposits,
  rejectDeposit,
} from '../../lib/firestoreService.ts';
import { ExternalLink, RefreshCw, X } from 'lucide-react';

export const AdminDepositsPage: React.FC = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionProcessing, setActionProcessing] = useState<string | number | null>(null);
  const [confirmApproveDep, setConfirmApproveDep] = useState<Deposit | null>(null);
  const [rejectModalDep, setRejectModalDep] = useState<Deposit | null>(null);
  const [rejectReason, setRejectReason] = useState(
    'Transaction hash could not be verified on the blockchain explorer'
  );

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const list = await getAdminDeposits(statusFilter || undefined);
      setDeposits(list);
    } catch (err) {
      console.error('Failed to load admin deposits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, [statusFilter]);

  const handleConfirmApprove = async () => {
    if (!confirmApproveDep) return;
    const id = confirmApproveDep.id;
    setActionProcessing(id);
    try {
      await approveDeposit(String(id));
      setConfirmApproveDep(null);
      await fetchDeposits();
    } catch (err) {
      console.error(err);
    } finally {
      setActionProcessing(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalDep) return;
    const id = rejectModalDep.id;
    setActionProcessing(id);
    try {
      await rejectDeposit(
        String(id),
        rejectReason.trim() || 'Transaction verification unsuccessful'
      );
      setRejectModalDep(null);
      await fetchDeposits();
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
            Deposit Verifications
          </h2>
          <p className="text-xs text-[#848E9C] mt-1">
            Review incoming Bitcoin (BTC) and Tether (USDT TRC20) transaction hashes and authorize ledger credits.
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
            <option value="verifying">Verifying</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={fetchDeposits}
            className="p-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white cursor-pointer"
            title="Refresh Deposits"
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
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">TxID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B313A] font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#848E9C] font-sans">
                    Loading deposits...
                  </td>
                </tr>
              ) : deposits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#848E9C] font-sans">
                    No deposits matching the filter criteria.
                  </td>
                </tr>
              ) : (
                deposits.map((dep) => {
                  const isPending = dep.status === 'pending' || dep.status === 'verifying';
                  const explorerLink = dep.currency === 'BTC'
                    ? `https://mempool.space/tx/${dep.tx_hash}`
                    : `https://tronscan.org/#/transaction/${dep.tx_hash}`;

                  return (
                    <tr key={dep.id} className="hover:bg-[#1E2329]/50">
                      <td className="py-3.5 px-4 font-sans">
                        <div className="font-bold text-white">{dep.user_name || `User #${dep.user_id}`}</div>
                        <div className="text-[11px] text-[#848E9C] font-mono">{dep.user_email}</div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-white">
                        {dep.currency} ({dep.network})
                      </td>

                      <td className="py-3.5 px-4 font-bold text-[#0ECB81] text-sm">
                        +{dep.amount} {dep.currency}
                      </td>

                      <td className="py-3.5 px-4 text-[#848E9C]">
                        <a
                          href={explorerLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#F0B90B] hover:underline flex items-center gap-1 font-mono text-[11px]"
                        >
                          <span>{dep.tx_hash ? `${dep.tx_hash.substring(0, 8)}...${dep.tx_hash.substring(dep.tx_hash.length - 6)}` : 'Manual'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {dep.proof_note && (
                          <div className="text-[10px] text-[#5E6673] font-sans mt-0.5">{dep.proof_note}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          dep.status === 'confirmed'
                            ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                            : dep.status === 'rejected'
                            ? 'bg-[#F6465D]/15 text-[#F6465D]'
                            : 'bg-[#F0B90B]/15 text-[#F0B90B]'
                        }`}>
                          {dep.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#5E6673] text-[11px]">
                        {new Date(dep.created_at).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 text-right font-sans space-x-2">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => setConfirmApproveDep(dep)}
                              disabled={actionProcessing === dep.id}
                              className="px-3 py-1.5 rounded-lg bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              {actionProcessing === dep.id ? 'Processing...' : 'Approve'}
                            </button>

                            <button
                              onClick={() => {
                                setRejectReason('Transaction hash could not be verified on the blockchain explorer');
                                setRejectModalDep(dep);
                              }}
                              disabled={actionProcessing === dep.id}
                              className="px-3 py-1.5 rounded-lg bg-[#F6465D]/10 hover:bg-[#F6465D]/20 text-[#F6465D] border border-[#F6465D]/30 font-semibold text-xs disabled:opacity-50 cursor-pointer"
                            >
                              Reject
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

      {/* Approve Confirmation Modal */}
      {confirmApproveDep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setConfirmApproveDep(null)}
              className="absolute top-4 right-4 p-1 text-[#848E9C] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">Confirm Deposit Credit</h3>
            <p className="text-xs text-[#848E9C] mb-5 leading-relaxed">
              Credit <strong className="text-[#0ECB81]">{confirmApproveDep.amount} {confirmApproveDep.currency}</strong> to <strong className="text-white">{confirmApproveDep.user_name || confirmApproveDep.user_email}</strong> immediately in the custodial wallet?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmApproveDep(null)}
                className="flex-1 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={actionProcessing === confirmApproveDep.id}
                className="flex-1 py-2.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                {actionProcessing === confirmApproveDep.id ? 'Crediting...' : 'Approve & Credit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Deposit Modal */}
      {rejectModalDep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setRejectModalDep(null)}
              className="absolute top-4 right-4 p-1 text-[#848E9C] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">Reject Deposit Submission</h3>
            <p className="text-xs text-[#848E9C] mb-4">
              Specify rejection reason for {rejectModalDep.amount} {rejectModalDep.currency}.
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
                  onClick={() => setRejectModalDep(null)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionProcessing === rejectModalDep.id}
                  className="flex-1 py-2.5 rounded-xl bg-[#F6465D] hover:bg-[#F6465D]/90 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  {actionProcessing === rejectModalDep.id ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
