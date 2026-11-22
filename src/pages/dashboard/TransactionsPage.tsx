import React, { useEffect, useState } from 'react';
import { Transaction } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { getUserTransactions } from '../../lib/firestoreService.ts';
import { RefreshCw } from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { firebaseUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('');
  const [filterCurrency, setFilterCurrency] = useState<string>('');

  const fetchTransactions = async () => {
    if (!firebaseUser) return;
    try {
      setLoading(true);
      const list = await getUserTransactions(firebaseUser.uid, {
        type: filterType || undefined,
        currency: filterCurrency || undefined,
      });
      setTransactions(list);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [firebaseUser, filterType, filterCurrency]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Transaction Ledger
          </h2>
          <p className="text-xs text-[#848E9C] mt-1">
            Auditable, immutable ledger records for all deposits, withdrawals, strategy yields, and commissions.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-xs text-white focus:outline-none focus:border-[#F0B90B]"
          >
            <option value="">All Types</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="investment_open">Investment Open</option>
            <option value="investment_return">Daily Yield Accruals</option>
            <option value="referral_bonus">Referral Commissions</option>
            <option value="balance_credit">Credits</option>
            <option value="balance_debit">Debits</option>
          </select>

          <select
            value={filterCurrency}
            onChange={(e) => setFilterCurrency(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-xs text-white focus:outline-none focus:border-[#F0B90B]"
          >
            <option value="">All Currencies</option>
            <option value="USD">USD</option>
            <option value="BTC">Bitcoin (BTC)</option>
            <option value="USDT">Tether (USDT)</option>
          </select>

          <button
            onClick={fetchTransactions}
            className="p-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-[#1E2329] text-[#848E9C] uppercase text-[10px] tracking-wider border-b border-[#2B313A]">
              <tr>
                <th className="py-3 px-4">Ref Code</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Fee</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B313A] font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#848E9C] font-sans">
                    Loading ledger records...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#848E9C] font-sans">
                    No transactions matching filter criteria.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isCredit = ['deposit', 'investment_return', 'investment_principal_return', 'referral_bonus', 'balance_credit'].includes(tx.type);
                  return (
                    <tr key={tx.id} className="hover:bg-[#1E2329]/50">
                      <td className="py-3.5 px-4 font-bold text-white">
                        {tx.transaction_ref}
                      </td>
                      <td className="py-3.5 px-4 font-sans font-semibold capitalize text-[#EAECEF]">
                        {tx.type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3.5 px-4 font-sans text-[#848E9C] max-w-sm truncate">
                        {tx.description}
                      </td>
                      <td className={`py-3.5 px-4 font-bold ${isCredit ? 'text-[#0ECB81]' : 'text-white'}`}>
                        {isCredit ? '+' : '-'}{tx.amount} {tx.currency}
                      </td>
                      <td className="py-3.5 px-4 text-[#5E6673]">
                        {tx.fee > 0 ? `${tx.fee} ${tx.currency}` : '0.00'}
                      </td>
                      <td className="py-3.5 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          tx.status === 'completed'
                            ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                            : 'bg-[#F0B90B]/15 text-[#F0B90B]'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#5E6673] text-[11px]">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
