import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  Briefcase,
  ChevronRight,
  ShieldCheck,
  Plus,
  Eye,
  EyeOff,
  Sparkles,
  PieChart,
  Activity,
  History,
  Zap,
  Lock
} from 'lucide-react';

interface OverviewPageProps {
  onNavigateSection: (section: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigateSection }) => {
  const { kycStatus } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<'holdings' | 'gainers' | 'hot'>('holdings');

  const fetchSummary = async () => {
    try {
      const res = await fetch('/api/user/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const totalPortfolioUSD = summary?.total_portfolio_usd || 0;
  const balances = summary?.balances || {};

  // Mock live ticker pairs for Binance app feel
  const hotPairs = [
    { pair: 'BTC/USDT', price: '91,420.50', change: '+2.85%', isUp: true, vol: '42.8B' },
    { pair: 'ETH/USDT', price: '3,380.20', change: '+4.12%', isUp: true, vol: '21.4B' },
    { pair: 'SOL/USDT', price: '184.65', change: '+8.45%', isUp: true, vol: '9.8B' },
    { pair: 'BNB/USDT', price: '645.10', change: '-0.35%', isUp: false, vol: '4.2B' }
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* KYC Alert Banner if not verified */}
      {kycStatus !== 'verified' && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#F0B90B]/15 via-[#F0B90B]/10 to-[#181A20] border border-[#F0B90B]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F0B90B]/20 text-[#F0B90B] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>{kycStatus === 'pending' ? 'KYC Under Review' : 'Verify Your Identity'}</span>
                <span className="px-2 py-0.2 rounded-full bg-[#F0B90B] text-[#0B0E11] text-[9px] font-black uppercase">
                  Level 1
                </span>
              </div>
              <div className="text-[11px] text-[#848E9C] mt-0.5">
                {kycStatus === 'pending'
                  ? 'Our compliance desk is reviewing your documents. Unrestricted withdrawals will activate upon approval.'
                  : 'Submit identity credentials to unlock maximum deposit and withdrawal limits.'}
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateSection('kyc')}
            className="px-4 py-2 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider shrink-0 transition-transform active:scale-95 cursor-pointer"
          >
            {kycStatus === 'pending' ? 'View Status' : 'Verify Now'}
          </button>
        </div>
      )}

      {/* Binance App Hero Balance Card */}
      <div className="p-5 sm:p-7 rounded-3xl bg-[#181A20] border border-[#2B313A] shadow-xl relative overflow-hidden">
        {/* Subtle decorative background laser line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent opacity-60" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#848E9C] mb-1.5">
              <span>Total Balance</span>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="text-[#848E9C] hover:text-white cursor-pointer transition-colors"
                title={showBalance ? 'Hide Balance' : 'Show Balance'}
              >
                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-mono tracking-tight">
                {showBalance ? (
                  `$${totalPortfolioUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ) : (
                  '••••••••'
                )}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#848E9C]">USD</span>

              {/* Today's Yield Badge */}
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0ECB81]/15 text-[#0ECB81] text-xs font-mono font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+6.4% Total PnL</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#848E9C] mt-2 font-mono">
              <span>≈ {showBalance ? ((totalPortfolioUSD / 91500).toFixed(6)) : '••••'} BTC</span>
              <span>•</span>
              <span className="text-[#0ECB81]">Ledger: Synced</span>
            </div>
          </div>

          {/* Binance App Quick Action Buttons (Deposit / Withdraw / Invest / Trade) */}
          <div className="grid grid-cols-4 sm:flex items-center gap-2 sm:gap-3 pt-2 sm:pt-0">
            <button
              onClick={() => onNavigateSection('deposit')}
              className="flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 sm:px-5 py-2.5 sm:py-3 rounded-2xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Deposit</span>
            </button>

            <button
              onClick={() => onNavigateSection('withdraw')}
              className="flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-[#1E2329] hover:bg-[#2B313A] text-white font-semibold text-xs border border-[#2B313A] transition-all active:scale-95 cursor-pointer"
            >
              <ArrowUpFromLine className="w-4 h-4 text-[#848E9C]" />
              <span>Withdraw</span>
            </button>

            <button
              onClick={() => onNavigateSection('plans')}
              className="flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-[#1E2329] hover:bg-[#2B313A] text-white font-semibold text-xs border border-[#2B313A] transition-all active:scale-95 cursor-pointer"
            >
              <PieChart className="w-4 h-4 text-[#F0B90B]" />
              <span>Earn</span>
            </button>

            <button
              onClick={() => onNavigateSection('trading')}
              className="flex flex-col sm:flex-row items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl bg-[#1E2329] hover:bg-[#2B313A] text-white font-semibold text-xs border border-[#2B313A] transition-all active:scale-95 cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-[#0ECB81]" />
              <span>Trade</span>
            </button>
          </div>
        </div>

        {/* 3 Asset Wallets Carousel / Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-[#2B313A]">
          {/* USD Cash Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1E2329] border border-[#2B313A] flex items-center justify-between hover:border-[#F0B90B]/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0ECB81]/15 text-[#0ECB81] font-bold text-lg flex items-center justify-center">
                $
              </div>
              <div>
                <div className="text-xs font-bold text-white">USD Cash</div>
                <div className="text-[10px] text-[#848E9C]">Available Wallet</div>
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-base font-bold text-white">
                {showBalance ? `$${(balances.USD?.available || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '••••'}
              </div>
              <div className="text-[10px] text-[#0ECB81] font-sans font-medium">Ready to Invest</div>
            </div>
          </div>

          {/* BTC Wallet Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1E2329] border border-[#2B313A] flex items-center justify-between hover:border-[#F0B90B]/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0B90B]/15 text-[#F0B90B] font-bold text-lg flex items-center justify-center">
                ₿
              </div>
              <div>
                <div className="text-xs font-bold text-white">Bitcoin</div>
                <div className="text-[10px] text-[#848E9C]">Native SegWit</div>
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-base font-bold text-white">
                {showBalance ? (balances.BTC?.total || 0).toFixed(6) : '••••'}
              </div>
              <div className="text-[10px] text-[#848E9C]">
                ≈ {showBalance ? `$${((balances.BTC?.total || 0) * 91500).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '••••'}
              </div>
            </div>
          </div>

          {/* USDT Wallet Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1E2329] border border-[#2B313A] flex items-center justify-between hover:border-[#F0B90B]/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0ECB81]/15 text-[#0ECB81] font-bold text-lg flex items-center justify-center">
                ₮
              </div>
              <div>
                <div className="text-xs font-bold text-white">Tether USDT</div>
                <div className="text-[10px] text-[#848E9C]">TRON TRC20</div>
              </div>
            </div>
            <div className="text-right font-mono">
              <div className="text-base font-bold text-white">
                {showBalance ? `$${(balances.USDT?.total || 0).toFixed(2)}` : '••••'}
              </div>
              <div className="text-[10px] text-[#848E9C]">
                Locked: {showBalance ? `$${(balances.USDT?.locked || 0).toFixed(2)}` : '••••'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Binance Live Market Bar (Horizontal Scrollable on Mobile) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {hotPairs.map((coin) => (
          <div
            key={coin.pair}
            onClick={() => onNavigateSection('trading')}
            className="p-3.5 rounded-2xl bg-[#181A20] border border-[#2B313A] hover:border-[#F0B90B]/40 transition-all cursor-pointer group select-none active:scale-98"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-white group-hover:text-[#F0B90B] transition-colors">{coin.pair}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                coin.isUp ? 'bg-[#0ECB81]/15 text-[#0ECB81]' : 'bg-[#F6465D]/15 text-[#F6465D]'
              }`}>
                {coin.change}
              </span>
            </div>
            <div className="text-base font-bold font-mono text-white mt-1">
              ${coin.price}
            </div>
            <div className="text-[10px] text-[#848E9C] font-mono mt-0.5">
              24h Vol: {coin.vol}
            </div>
          </div>
        ))}
      </div>

      {/* Portfolio Trajectory Chart & Strategy Allocator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Performance Chart */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-[#181A20] border border-[#2B313A] shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Yield Trajectory</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-ping" />
              </h3>
              <p className="text-[11px] text-[#848E9C]">Portfolio growth over 7 rolling settlement cycles</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[10px] font-bold">
              <span className="px-2 py-0.5 rounded-lg bg-[#F0B90B] text-[#0B0E11]">7D</span>
              <span className="px-2 py-0.5 text-[#848E9C]">30D</span>
              <span className="px-2 py-0.5 text-[#848E9C]">ALL</span>
            </div>
          </div>

          <div className="w-full h-56 sm:h-64">
            <svg viewBox="0 0 600 220" className="w-full h-full">
              <defs>
                <linearGradient id="balanceGradYellowApp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F0B90B" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#F0B90B" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <line x1="0" y1="40" x2="600" y2="40" stroke="#2B313A" strokeDasharray="3 3" />
              <line x1="0" y1="90" x2="600" y2="90" stroke="#2B313A" strokeDasharray="3 3" />
              <line x1="0" y1="140" x2="600" y2="140" stroke="#2B313A" strokeDasharray="3 3" />
              <line x1="0" y1="190" x2="600" y2="190" stroke="#2B313A" />

              <path
                d="M 30 170 Q 110 160, 180 145 T 320 120 T 430 90 T 570 45 L 570 190 L 30 190 Z"
                fill="url(#balanceGradYellowApp)"
              />

              <path
                d="M 30 170 Q 110 160, 180 145 T 320 120 T 430 90 T 570 45"
                fill="none"
                stroke="#F0B90B"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {[
                { x: 30, y: 170, label: 'D-6' },
                { x: 120, y: 158, label: 'D-5' },
                { x: 210, y: 142, label: 'D-4' },
                { x: 300, y: 125, label: 'D-3' },
                { x: 390, y: 105, label: 'D-2' },
                { x: 480, y: 78, label: 'D-1' },
                { x: 570, y: 45, label: 'Today' }
              ].map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="4.5" fill="#181A20" stroke="#F0B90B" strokeWidth="2.5" />
                  <text x={pt.x} y="210" textAnchor="middle" fill="#848E9C" fontSize="10" fontFamily="monospace">
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Binance Earn / Strategy Card */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#181A20] border border-[#2B313A] shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F0B90B]" />
                <h3 className="text-sm sm:text-base font-bold text-white">Featured Strategy</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#F0B90B]/15 text-[#F0B90B] text-[10px] font-black uppercase">
                55.5% ROI
              </span>
            </div>

            <p className="text-xs text-[#848E9C] leading-relaxed mb-4">
              Quantitative high-frequency cross-market arbitrage strategy with daily automated yield distribution.
            </p>

            <div className="p-4 rounded-2xl bg-[#1E2329] border border-[#2B313A] mb-5 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-[#848E9C]">
                <span>Daily Accrual:</span>
                <span className="font-bold text-[#0ECB81] text-sm">+1.85% / day</span>
              </div>
              <div className="flex justify-between items-center text-[#848E9C]">
                <span>Lock Duration:</span>
                <span className="font-bold text-white">30 Days</span>
              </div>
              <div className="flex justify-between items-center text-[#848E9C]">
                <span>Principal Unlock:</span>
                <span className="font-bold text-[#F0B90B]">100% Guaranteed</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateSection('plans')}
            className="w-full py-3.5 rounded-2xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider transition-all active:scale-98 cursor-pointer shadow-md"
          >
            Subscribe to Strategy
          </button>
        </div>
      </div>

      {/* Recent Ledger Transactions */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#181A20] border border-[#2B313A] shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#F0B90B]" />
            <h3 className="text-sm sm:text-base font-bold text-white">Recent Transactions</h3>
          </div>
          <button
            onClick={() => onNavigateSection('transactions')}
            className="text-xs text-[#F0B90B] font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-[#1E2329] text-[#848E9C] uppercase text-[10px] tracking-wider border-b border-[#2B313A]">
              <tr>
                <th className="py-3 px-4">Ref Code</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B313A] font-mono">
              {!summary?.recent_transactions || summary.recent_transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#848E9C] font-sans">
                    No transactions recorded yet. Fund your account with Bitcoin or USDT to begin.
                  </td>
                </tr>
              ) : (
                summary.recent_transactions.slice(0, 5).map((tx: any) => {
                  const isCredit = ['deposit', 'investment_return', 'investment_principal_return', 'referral_bonus', 'balance_credit'].includes(tx.type);
                  return (
                    <tr key={tx.id} className="hover:bg-[#1E2329]/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        {tx.transaction_ref}
                      </td>
                      <td className="py-3 px-4 font-sans font-semibold capitalize text-[#EAECEF]">
                        {tx.type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 font-sans text-[#848E9C] max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td className={`py-3 px-4 font-bold ${isCredit ? 'text-[#0ECB81]' : 'text-white'}`}>
                        {isCredit ? '+' : '-'}{tx.amount} {tx.currency}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          tx.status === 'completed'
                            ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                            : 'bg-[#F0B90B]/15 text-[#F0B90B]'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#5E6673] text-[11px]">
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
