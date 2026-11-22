import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  DEFAULT_PLATFORM_SETTINGS,
  getPublicPlatformSettings,
  getUserWithdrawals,
  submitWithdrawal
} from '../../lib/firestoreService.ts';
import {
  ArrowUpFromLine,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Info
} from 'lucide-react';
import { Withdrawal } from '../../types/index.ts';

export const WithdrawPage: React.FC = () => {
  const { user, firebaseUser, balances, kycStatus, refreshProfile } = useAuth();
  const [currency, setCurrency] = useState<'BTC' | 'USDT'>('USDT');
  const [amount, setAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [platformSettings, setPlatformSettings] = useState<Record<string, string>>(DEFAULT_PLATFORM_SETTINGS);

  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fee =
    currency === 'BTC'
      ? Number(platformSettings.btc_withdrawal_fee || 0.00035)
      : Number(platformSettings.usdt_withdrawal_fee || 1.5);
  const minWithdrawal =
    currency === 'BTC'
      ? Number(platformSettings.btc_min_withdrawal || 0.002)
      : Number(platformSettings.usdt_min_withdrawal || 25.0);
  const availableBal = balances[currency]?.available || 0;

  const numAmount = parseFloat(amount) || 0;
  const netAmount = Math.max(0, numAmount - fee);

  const fetchHistoryAndSettings = useCallback(async () => {
    try {
      const settingsPromise = getPublicPlatformSettings();
      const wthPromise = firebaseUser ? getUserWithdrawals(firebaseUser.uid) : Promise.resolve([]);
      const [settings, wths] = await Promise.all([settingsPromise, wthPromise]);
      setPlatformSettings(settings);
      setHistory(wths);
    } catch (err) {
      console.error('Failed to load withdrawal history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    fetchHistoryAndSettings();
  }, [fetchHistoryAndSettings]);

  const handleMaxAmount = () => {
    setAmount(String(availableBal));
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;

    if (numAmount < minWithdrawal) {
      setResult({ type: 'error', message: `Minimum withdrawal for ${currency} is ${minWithdrawal} ${currency}` });
      return;
    }

    if (numAmount > availableBal) {
      setResult({ type: 'error', message: `Insufficient available funds. Current balance: ${availableBal} ${currency}` });
      return;
    }

    if (!destinationAddress || destinationAddress.trim().length < 15) {
      setResult({ type: 'error', message: 'Please enter a valid destination wallet address' });
      return;
    }

    if (currency === 'USDT' && !destinationAddress.trim().startsWith('T')) {
      setResult({ type: 'error', message: 'Invalid TRON TRC20 address. TRON addresses must start with "T".' });
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      await submitWithdrawal({
        uid: firebaseUser.uid,
        userEmail: user?.email || firebaseUser.email || '',
        userName: user?.full_name || firebaseUser.displayName || 'Investor',
        currency,
        destinationAddress: destinationAddress.trim(),
        amount: numAmount,
        fee
      });

      setResult({
        type: 'success',
        message: `Withdrawal of ${numAmount} ${currency} submitted successfully. Funds have been locked and queued for broadcasting.`
      });
      setAmount('');
      setDestinationAddress('');
      await fetchHistoryAndSettings();
      await refreshProfile();
    } catch (err: any) {
      setResult({ type: 'error', message: err.message || 'Withdrawal submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Withdraw Funds
        </h2>
        <p className="text-xs text-[#848E9C] mt-1">
          Request digital asset payouts directly to your verified private personal wallet address.
        </p>
      </div>

      {/* KYC Warning notice if required */}
      {kycStatus !== 'verified' && (
        <div className="p-4 rounded-xl bg-[#F0B90B]/10 border border-[#F0B90B]/30 flex items-start gap-3 text-xs text-[#EAECEF]">
          <Info className="w-5 h-5 text-[#F0B90B] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#F0B90B]">Compliance Status: </span>
            Your account is currently {kycStatus === 'pending' ? 'under compliance review' : 'unverified'}. While withdrawal requests can be submitted, payouts require verified KYC status according to institutional security standards.
          </div>
        </div>
      )}

      {/* Main Withdrawal Form Card */}
      <div className="max-w-3xl p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        {result && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs flex items-start gap-3 ${
              result.type === 'success'
                ? 'bg-[#0ECB81]/10 border border-[#0ECB81]/30 text-[#0ECB81]'
                : 'bg-[#F6465D]/10 border border-[#F6465D]/30 text-[#F6465D]'
            }`}
          >
            {result.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{result.message}</span>
          </div>
        )}

        <form onSubmit={handleWithdraw} className="space-y-5">
          {/* Currency Switcher */}
          <div>
            <label className="block text-xs font-semibold text-[#848E9C] mb-2">
              Select Withdrawal Currency
            </label>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setCurrency('BTC')}
                className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  currency === 'BTC'
                    ? 'bg-[#1E2329] border-[#F0B90B] shadow-sm'
                    : 'bg-[#181A20] border-[#2B313A]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F0B90B]/15 text-[#F0B90B] font-bold text-lg flex items-center justify-center">
                    ₿
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Bitcoin (BTC)</div>
                    <div className="text-[10px] text-[#848E9C] font-mono">Avail: {(balances.BTC?.available || 0).toFixed(6)}</div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCurrency('USDT')}
                className={`p-3.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  currency === 'USDT'
                    ? 'bg-[#1E2329] border-[#F0B90B] shadow-sm'
                    : 'bg-[#181A20] border-[#2B313A]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0ECB81]/15 text-[#0ECB81] font-bold text-lg flex items-center justify-center">
                    ₮
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Tether (USDT TRC20)</div>
                    <div className="text-[10px] text-[#848E9C] font-mono">Avail: ${(balances.USDT?.available || 0).toFixed(2)}</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Destination Address */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-[#848E9C]">
                Destination {currency} Wallet Address *
              </label>
              <span className="text-[10px] text-[#5E6673] font-mono">
                Network: {currency === 'BTC' ? 'Bitcoin Native' : 'TRON (TRC20)'}
              </span>
            </div>
            <input
              type="text"
              required
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder={currency === 'BTC' ? 'bc1q...' : 'TB4U...'}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B] font-mono"
            />
          </div>

          {/* Amount Input with Max Button */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-[#848E9C]">
                Withdrawal Amount *
              </label>
              <button
                type="button"
                onClick={handleMaxAmount}
                className="text-[11px] font-bold text-[#F0B90B] hover:underline cursor-pointer"
              >
                Use Max Available ({availableBal} {currency})
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min ${minWithdrawal}`}
                className="w-full pl-4 pr-16 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B] font-mono"
              />
              <span className="absolute right-4 top-3 text-xs text-[#848E9C] font-bold font-mono">
                {currency}
              </span>
            </div>
          </div>

          {/* Summary Calculation Box */}
          <div className="p-4 rounded-xl bg-[#1E2329] border border-[#2B313A] space-y-2 text-xs">
            <div className="flex justify-between text-[#848E9C]">
              <span>Gross Amount:</span>
              <span className="font-mono text-white font-semibold">{numAmount} {currency}</span>
            </div>
            <div className="flex justify-between text-[#848E9C]">
              <span>Network Fee:</span>
              <span className="font-mono text-[#EAECEF]">{fee} {currency}</span>
            </div>
            <div className="pt-2 border-t border-[#2B313A] flex justify-between text-white font-bold">
              <span>Net Payout to Your Wallet:</span>
              <span className="font-mono text-[#0ECB81] text-sm">{netAmount.toFixed(currency === 'BTC' ? 6 : 2)} {currency}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || availableBal <= 0}
            className="w-full py-3.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-[#0B0E11] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ArrowUpFromLine className="w-4 h-4" />
                <span>Confirm Withdrawal Request</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Withdrawal Tracking History */}
      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        <h3 className="text-base font-bold text-white mb-4">
          Withdrawal History
        </h3>

        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-[#1E2329] text-[#848E9C] uppercase text-[10px] tracking-wider border-b border-[#2B313A]">
              <tr>
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">Net Amount</th>
                <th className="py-3 px-4">Destination Address</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Payout TxID</th>
                <th className="py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B313A] font-mono">
              {loadingHistory ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#848E9C] font-sans">
                    Loading records...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#848E9C] font-sans">
                    No withdrawals requested yet.
                  </td>
                </tr>
              ) : (
                history.map((wth) => (
                  <tr key={wth.id} className="hover:bg-[#1E2329]/50">
                    <td className="py-3 px-4 font-bold text-white">
                      {wth.currency}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {wth.net_amount} {wth.currency}
                    </td>
                    <td className="py-3 px-4 text-[#848E9C]">
                      {wth.destination_address.substring(0, 10)}...{wth.destination_address.substring(wth.destination_address.length - 8)}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        wth.status === 'completed'
                          ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                          : wth.status === 'rejected'
                          ? 'bg-[#F6465D]/15 text-[#F6465D]'
                          : 'bg-[#F0B90B]/15 text-[#F0B90B]'
                      }`}>
                        {wth.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#848E9C]">
                      {wth.payout_tx_hash ? (
                        <a
                          href={wth.currency === 'BTC' ? `https://mempool.space/tx/${wth.payout_tx_hash}` : `https://tronscan.org/#/transaction/${wth.payout_tx_hash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#F0B90B] hover:underline flex items-center gap-1"
                        >
                          <span>{wth.payout_tx_hash.substring(0, 8)}...</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[#5E6673] font-sans text-[11px]">Processing in node</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#5E6673] text-[11px]">
                      {new Date(wth.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
