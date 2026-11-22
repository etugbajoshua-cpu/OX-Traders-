import React, { useCallback, useEffect, useState } from 'react';
import { QRCodeDisplay } from '../../components/common/QRCodeDisplay.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  DEFAULT_PLATFORM_SETTINGS,
  getPublicPlatformSettings,
  getUserDeposits,
  submitDeposit
} from '../../lib/firestoreService.ts';
import {
  Copy,
  Check,
  AlertTriangle,
  ArrowDownToLine,
  ExternalLink,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';
import { Deposit } from '../../types/index.ts';

export const DepositPage: React.FC = () => {
  const { user, firebaseUser, refreshProfile } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState<'BTC' | 'USDT'>('BTC');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<Deposit[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [platformSettings, setPlatformSettings] = useState<Record<string, string>>(DEFAULT_PLATFORM_SETTINGS);

  // Form inputs
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [proofNote, setProofNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Official deposit address specifications synced with Firestore settings
  const depositAddresses = {
    BTC: {
      address: platformSettings.btc_deposit_address || 'bc1qg2a2gdxtccsxu83xy0jvezenutzyvmv4jl0uz4',
      network: 'Bitcoin',
      minDeposit: `${platformSettings.btc_min_deposit || '0.001'} BTC`,
      confirmations: 3,
      warning: 'Send ONLY Bitcoin (BTC) via the native Bitcoin network. Do not send via Binance Smart Chain, Wrapped BTC, or Lightning. Funds sent via unsupported networks cannot be recovered.'
    },
    USDT: {
      address: platformSettings.usdt_deposit_address || 'TB4Uq6VQMFMbDZUq3xK4jM8mqz6rb2TqGf',
      network: 'TRON (TRC20)',
      minDeposit: `${platformSettings.usdt_min_deposit || '50.0'} USDT`,
      confirmations: 19,
      warning: 'Send ONLY Tether (USDT) on the TRON TRC20 network (addresses start with "T"). Do not send ERC20, BEP20, Polygon, or Solana USDT to this address.'
    }
  };

  const currentConfig = depositAddresses[selectedCurrency];

  const fetchHistoryAndSettings = useCallback(async () => {
    try {
      const settingsPromise = getPublicPlatformSettings();
      const depsPromise = firebaseUser ? getUserDeposits(firebaseUser.uid) : Promise.resolve([]);
      const [settings, deps] = await Promise.all([settingsPromise, depsPromise]);
      setPlatformSettings(settings);
      setHistory(deps);
    } catch (err) {
      console.error('Failed to fetch deposit history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    fetchHistoryAndSettings();
  }, [fetchHistoryAndSettings]);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentConfig.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !txHash) {
      setSubmitResult({ type: 'error', message: 'Deposit amount and transaction hash (TxID) are required' });
      return;
    }
    if (!firebaseUser) {
      setSubmitResult({ type: 'error', message: 'Please sign in to submit a deposit.' });
      return;
    }

    setSubmitting(true);
    setSubmitResult(null);

    try {
      await submitDeposit({
        uid: firebaseUser.uid,
        userEmail: user?.email || firebaseUser.email || '',
        userName: user?.full_name || firebaseUser.displayName || 'Investor',
        currency: selectedCurrency,
        network: currentConfig.network,
        depositAddress: currentConfig.address,
        amount: parseFloat(amount),
        txHash: txHash.trim(),
        proofNote: proofNote.trim()
      });

      setSubmitResult({
        type: 'success',
        message: 'Deposit received. Our treasury compliance nodes are verifying your transaction outputs.'
      });
      setAmount('');
      setTxHash('');
      setProofNote('');
      await fetchHistoryAndSettings();
      await refreshProfile();
    } catch (err: any) {
      setSubmitResult({ type: 'error', message: err.message || 'Deposit submission failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Deposit Cryptocurrency
        </h2>
        <p className="text-xs text-[#848E9C] mt-1">
          Direct deposits supported via native Bitcoin (SegWit) and Tether (TRON TRC20).
        </p>
      </div>

      {/* Currency Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl">
        {/* Bitcoin Option */}
        <button
          type="button"
          onClick={() => {
            setSelectedCurrency('BTC');
            setSubmitResult(null);
          }}
          className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
            selectedCurrency === 'BTC'
              ? 'bg-[#1E2329] border-[#F0B90B] shadow-md'
              : 'bg-[#181A20] border-[#2B313A] hover:border-[#363D47]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#F0B90B]/15 border border-[#F0B90B]/30 text-[#F0B90B] font-black text-2xl flex items-center justify-center shrink-0">
              ₿
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Bitcoin (BTC)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#2B313A] text-white">SegWit</span>
              </div>
              <div className="text-xs text-[#848E9C] mt-0.5">
                Network: Bitcoin
              </div>
            </div>
          </div>
          {selectedCurrency === 'BTC' && (
            <div className="w-5 h-5 rounded-full bg-[#F0B90B] text-[#0B0E11] flex items-center justify-center">
              <Check className="w-3.5 h-3.5" />
            </div>
          )}
        </button>

        {/* USDT TRC20 Option */}
        <button
          type="button"
          onClick={() => {
            setSelectedCurrency('USDT');
            setSubmitResult(null);
          }}
          className={`p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
            selectedCurrency === 'USDT'
              ? 'bg-[#1E2329] border-[#F0B90B] shadow-md'
              : 'bg-[#181A20] border-[#2B313A] hover:border-[#363D47]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#0ECB81]/15 border border-[#0ECB81]/30 text-[#0ECB81] font-black text-2xl flex items-center justify-center shrink-0">
              ₮
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>Tether (USDT)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0ECB81]/20 text-[#0ECB81]">TRC20</span>
              </div>
              <div className="text-xs text-[#848E9C] mt-0.5">
                Network: TRON (TRC20)
              </div>
            </div>
          </div>
          {selectedCurrency === 'USDT' && (
            <div className="w-5 h-5 rounded-full bg-[#F0B90B] text-[#0B0E11] flex items-center justify-center">
              <Check className="w-3.5 h-3.5" />
            </div>
          )}
        </button>
      </div>

      {/* Deposit Address & Scannable QR Code Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        {/* Left: QR Code Display */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-[#1E2329] rounded-xl border border-[#2B313A]">
          <QRCodeDisplay
            value={currentConfig.address}
            size={180}
            currency={selectedCurrency}
          />
          <div className="mt-3 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#848E9C]">
              Scan to Pay
            </span>
            <div className="text-[10px] text-white mt-0.5 font-mono">
              Network: {currentConfig.network}
            </div>
          </div>
        </div>

        {/* Right: Address & Instructions */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#848E9C]">
                Official {selectedCurrency} Deposit Address
              </span>
              <span className="text-xs font-mono text-[#F0B90B]">
                Min: {currentConfig.minDeposit}
              </span>
            </div>

            {/* Address Box with copy */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-[#1E2329] border border-[#2B313A]">
              <input
                type="text"
                readOnly
                value={currentConfig.address}
                className="w-full bg-transparent text-white font-mono text-xs sm:text-sm font-semibold tracking-wide focus:outline-none break-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                  copied
                    ? 'bg-[#0ECB81] text-[#0B0E11]'
                    : 'bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11]'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Network Warning Banner */}
            <div className="mt-4 p-4 rounded-xl bg-[#F0B90B]/10 border border-[#F0B90B]/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#F0B90B] shrink-0 mt-0.5" />
              <div className="text-xs text-[#EAECEF] leading-relaxed">
                <span className="font-bold text-[#F0B90B]">IMPORTANT: </span>
                {currentConfig.warning}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-[#848E9C] pt-3 border-t border-[#2B313A]">
            <div>
              <span className="text-[#5E6673] block text-[10px] uppercase">Confirmations</span>
              <span className="text-white font-bold font-mono">{currentConfig.confirmations} Blocks</span>
            </div>
            <div>
              <span className="text-[#5E6673] block text-[10px] uppercase">Deposit Fee</span>
              <span className="text-[#0ECB81] font-bold font-mono">0.00% (Free)</span>
            </div>
            <div>
              <span className="text-[#5E6673] block text-[10px] uppercase">Crediting</span>
              <span className="text-white font-bold">Direct Ledger</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Deposit Notification Form */}
      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        <div className="mb-6">
          <h3 className="text-base sm:text-lg font-bold text-white">
            Submit Deposit Confirmation (TxID)
          </h3>
          <p className="text-xs text-[#848E9C] mt-1">
            Once sent from your external wallet or exchange, enter the transaction hash (TxID) below.
          </p>
        </div>

        {submitResult && (
          <div
            className={`mb-6 p-4 rounded-xl text-xs flex items-start gap-3 ${
              submitResult.type === 'success'
                ? 'bg-[#0ECB81]/10 border border-[#0ECB81]/30 text-[#0ECB81]'
                : 'bg-[#F6465D]/10 border border-[#F6465D]/30 text-[#F6465D]'
            }`}
          >
            {submitResult.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 shrink-0" />
            )}
            <span>{submitResult.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmitDeposit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                Deposit Amount ({selectedCurrency}) *
              </label>
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={selectedCurrency === 'BTC' ? '0.05' : '500.0'}
                className="w-full px-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                Blockchain TxID / Transaction Hash *
              </label>
              <input
                type="text"
                required
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="64-character transaction hash"
                className="w-full px-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#848E9C] mb-1">
              Source Wallet / Provider (Optional)
            </label>
            <input
              type="text"
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              placeholder="e.g. Ledger / Trezor / Binance / Kraken"
              className="w-full px-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-[#0B0E11] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ArrowDownToLine className="w-4 h-4" />
                <span>Verify & Record Deposit</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Deposit History */}
      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        <h3 className="text-base font-bold text-white mb-4">
          Deposit Records
        </h3>

        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-[#1E2329] text-[#848E9C] uppercase text-[10px] tracking-wider border-b border-[#2B313A]">
              <tr>
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">TxID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Ledger Note</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B313A] font-mono">
              {loadingHistory ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#848E9C]">
                    Loading deposit records...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#848E9C] font-sans">
                    No deposits submitted yet. Follow the instructions above to transfer BTC or USDT.
                  </td>
                </tr>
              ) : (
                history.map((dep) => (
                  <tr key={dep.id} className="hover:bg-[#1E2329]/50">
                    <td className="py-3 px-4 font-bold text-white">
                      {dep.currency} ({dep.network})
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0ECB81]">
                      +{dep.amount} {dep.currency}
                    </td>
                    <td className="py-3 px-4 text-[#848E9C]">
                      <a
                        href={dep.currency === 'BTC' ? `https://mempool.space/tx/${dep.tx_hash}` : `https://tronscan.org/#/transaction/${dep.tx_hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#F0B90B] hover:underline flex items-center gap-1"
                      >
                        <span>{dep.tx_hash.substring(0, 8)}...{dep.tx_hash.substring(dep.tx_hash.length - 6)}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-3 px-4 font-sans">
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
                    <td className="py-3 px-4 font-sans text-[#848E9C] text-[11px] max-w-xs truncate">
                      {dep.admin_note || 'Indexing block confirmations'}
                    </td>
                    <td className="py-3 px-4 text-[#5E6673] text-[11px]">
                      {new Date(dep.created_at).toLocaleString()}
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
