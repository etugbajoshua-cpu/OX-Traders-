import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext.tsx';
import { getUserOverviewData } from '../../lib/firestoreService.ts';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  ChevronRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  PieChart,
  History
} from 'lucide-react';

interface OverviewPageProps {
  onNavigateSection: (section: string) => void;
}

const TRAJECTORY_SERIES = {
  '7D': {
    subtitle: 'Portfolio growth over 7 rolling settlement cycles',
    path: 'M 30 170 Q 110 160, 180 145 T 320 120 T 430 90 T 570 45',
    area: 'M 30 170 Q 110 160, 180 145 T 320 120 T 430 90 T 570 45 L 570 190 L 30 190 Z',
    points: [
      { x: 30, y: 170, label: 'D-6' },
      { x: 120, y: 158, label: 'D-5' },
      { x: 210, y: 142, label: 'D-4' },
      { x: 300, y: 125, label: 'D-3' },
      { x: 390, y: 105, label: 'D-2' },
      { x: 480, y: 78, label: 'D-1' },
      { x: 570, y: 45, label: 'Today' }
    ]
  },
  '30D': {
    subtitle: '30-day cumulative quantitative arbitrage trajectory',
    path: 'M 30 178 Q 100 170, 180 150 T 300 118 T 440 76 T 570 34',
    area: 'M 30 178 Q 100 170, 180 150 T 300 118 T 440 76 T 570 34 L 570 190 L 30 190 Z',
    points: [
      { x: 30, y: 178, label: 'W-4' },
      { x: 120, y: 164, label: 'D-24' },
      { x: 210, y: 142, label: 'W-3' },
      { x: 300, y: 118, label: 'W-2' },
      { x: 390, y: 92, label: 'D-10' },
      { x: 480, y: 62, label: 'W-1' },
      { x: 570, y: 34, label: 'Today' }
    ]
  },
  ALL: {
    subtitle: 'All-time verified double-entry portfolio appreciation',
    path: 'M 30 184 Q 110 174, 185 152 T 315 112 T 445 64 T 570 24',
    area: 'M 30 184 Q 110 174, 185 152 T 315 112 T 445 64 T 570 24 L 570 190 L 30 190 Z',
    points: [
      { x: 30, y: 184, label: 'M-6' },
      { x: 120, y: 168, label: 'M-5' },
      { x: 210, y: 145, label: 'M-4' },
      { x: 300, y: 115, label: 'M-3' },
      { x: 390, y: 84, label: 'M-2' },
      { x: 480, y: 50, label: 'M-1' },
      { x: 570, y: 24, label: 'Now' }
    ]
  }
} as const;

type TrajectoryRange = keyof typeof TRAJECTORY_SERIES;

interface LiveCoinQuote {
  pair: string;
  price: string;
  change: string;
  isUp: boolean;
  vol: string;
}

const DEFAULT_PAIRS: LiveCoinQuote[] = [
  { pair: 'BTC/USDT', price: '91,420.50', change: '+2.85%', isUp: true, vol: '42.8B' },
  { pair: 'ETH/USDT', price: '3,380.20', change: '+4.12%', isUp: true, vol: '21.4B' },
  { pair: 'SOL/USDT', price: '215.80', change: '+5.82%', isUp: true, vol: '9.1B' },
  { pair: 'BNB/USDT', price: '642.10', change: '+1.45%', isUp: true, vol: '2.1B' }
];

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigateSection }) => {
  const { firebaseUser, balances: authBalances, kycStatus } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [range, setRange] = useState<TrajectoryRange>('7D');
  const [hotPairs, setHotPairs] = useState<LiveCoinQuote[]>(DEFAULT_PAIRS);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!firebaseUser) return;
      try {
        const data = await getUserOverviewData(firebaseUser.uid);
        setSummary(data);
      } catch (err) {
        console.error('Failed to fetch summary:', err);
      }
    };

    const fetchMarkets = async () => {
      try {
        const res = await fetch('/api/markets/live');
        if (res.ok) {
          const data = await res.json();
          const wanted = ['BTC', 'ETH', 'SOL', 'BNB'];
          const mapped: LiveCoinQuote[] = wanted
            .map((sym) => {
              const found = (data.coins || []).find((c: any) => c.symbol === sym);
              if (!found) return null;
              const pct = Number(found.price_change_percentage_24h || 0);
              const volB = (Number(found.total_volume || 0) / 1e9).toFixed(1) + 'B';
              return {
                pair: `${sym}/USDT`,
                price: Number(found.current_price || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                }),
                change: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
                isUp: pct >= 0,
                vol: volB
              };
            })
            .filter(Boolean) as LiveCoinQuote[];
          if (mapped.length === 4) {
            setHotPairs(mapped);
          }
        }
      } catch {
        // retain defaults cleanly
      }
    };

    fetchSummary();
    fetchMarkets();
  }, [firebaseUser]);

  const balances = authBalances || summary?.balances || {};
  const totalPortfolioUSD =
    (balances.USD?.total || 0) +
    (balances.USDT?.total || 0) +
    (balances.BTC?.total || 0) * 91500;
  const activeSeries = TRAJECTORY_SERIES[range];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* KYC Alert Banner if not verified */}
      {kycStatus !== 'verified' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#F0B90B]/15 via-[#F0B90B]/8 to-[#181A20] border border-[#F0B90B]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F0B90B]/20 text-[#F0B90B] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>{kycStatus === 'pending' ? 'KYC Under Review' : 'Verify Your Identity'}</span>
                <span className="px-2 py-0.5 rounded-md bg-[#F0B90B] text-[#0B0E11] text-[9px] font-black uppercase tracking-wider">
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
        </motion.div>
      )}

      {/* Binance App Hero Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
        className="p-5 sm:p-7 rounded-3xl bg-[#181A20] border border-[#2B313A] shadow-xl relative overflow-hidden"
      >
        {/* Top gold hairline */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent opacity-70" />

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

            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-mono tabular-nums tracking-tight">
                {showBalance
                  ? `$${totalPortfolioUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '••••••••'}
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#848E9C]">USD</span>

              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0ECB81]/15 border border-[#0ECB81]/30 text-[#0ECB81] text-xs font-mono font-bold tabular-nums">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+6.4% Total PnL</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#848E9C] mt-2 font-mono tabular-nums">
              <span>≈ {showBalance ? (totalPortfolioUSD / 91500).toFixed(6) : '••••'} BTC</span>
              <span>•</span>
              <span className="text-[#0ECB81]">Ledger: Synced</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
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

        {/* 3 Asset Wallets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-[#2B313A]">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1E2329] border border-[#2B313A] flex items-center justify-between ox-card-hover">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0ECB81]/15 text-[#0ECB81] font-bold text-lg flex items-center justify-center">
                $
              </div>
              <div>
                <div className="text-xs font-bold text-white">USD Cash</div>
                <div className="text-[10px] text-[#848E9C]">Available Wallet</div>
              </div>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-base font-bold text-white">
                {showBalance ? `$${(balances.USD?.available || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '••••'}
              </div>
              <div className="text-[10px] text-[#0ECB81] font-sans font-medium">Ready to Invest</div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1E2329] border border-[#2B313A] flex items-center justify-between ox-card-hover">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0B90B]/15 text-[#F0B90B] font-bold text-lg flex items-center justify-center">
                ₿
              </div>
              <div>
                <div className="text-xs font-bold text-white">Bitcoin</div>
                <div className="text-[10px] text-[#848E9C]">Native SegWit</div>
              </div>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-base font-bold text-white">
                {showBalance ? (balances.BTC?.total || 0).toFixed(6) : '••••'}
              </div>
              <div className="text-[10px] text-[#848E9C]">
                ≈ {showBalance ? `$${((balances.BTC?.total || 0) * 91500).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '••••'}
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1E2329] border border-[#2B313A] flex items-center justify-between ox-card-hover">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0ECB81]/15 text-[#0ECB81] font-bold text-lg flex items-center justify-center">
                ₮
              </div>
              <div>
                <div className="text-xs font-bold text-white">Tether USDT</div>
                <div className="text-[10px] text-[#848E9C]">TRON TRC20</div>
              </div>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-base font-bold text-white">
                {showBalance ? `$${(balances.USDT?.total || 0).toFixed(2)}` : '••••'}
              </div>
              <div className="text-[10px] text-[#848E9C]">
                Locked: {showBalance ? `$${(balances.USDT?.locked || 0).toFixed(2)}` : '••••'}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Binance Live Market Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {hotPairs.map((coin, i) => (
          <motion.div
            key={coin.pair}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.04 * i }}
            onClick={() => onNavigateSection('trading')}
            className="p-3.5 rounded-2xl bg-[#181A20] border border-[#2B313A] ox-card-hover cursor-pointer group select-none"
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-white group-hover:text-[#F0B90B] transition-colors">{coin.pair}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tabular-nums ${
                  coin.isUp ? 'bg-[#0ECB81]/15 text-[#0ECB81]' : 'bg-[#F6465D]/15 text-[#F6465D]'
                }`}
              >
                {coin.change}
              </span>
            </div>
            <div className="text-base font-bold font-mono tabular-nums text-white mt-1">${coin.price}</div>
            <div className="text-[10px] text-[#848E9C] font-mono tabular-nums mt-0.5">24h Vol: ${coin.vol}</div>
          </motion.div>
        ))}
      </div>

      {/* Portfolio Trajectory Chart & Strategy Allocator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
        {/* Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-[#181A20] border border-[#2B313A] shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Yield Trajectory</h3>
              <p className="text-[11px] text-[#848E9C]">{activeSeries.subtitle}</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[10px] font-bold">
              {(['7D', '30D', 'ALL'] as TrajectoryRange[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRange(key)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    range === key ? 'bg-[#F0B90B] text-[#0B0E11]' : 'text-[#848E9C] hover:text-white'
                  }`}
                >
                  {key}
                </button>
              ))}
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

              <path d={activeSeries.area} fill="url(#balanceGradYellowApp)" />
              <path
                d={activeSeries.path}
                fill="none"
                stroke="#F0B90B"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {activeSeries.points.map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="4.5" fill="#181A20" stroke="#F0B90B" strokeWidth="2.5" />
                  <text x={pt.x} y="210" textAnchor="middle" fill="#848E9C" fontSize="10" fontFamily="monospace">
                    {pt.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </motion.div>

        {/* Binance Earn / Strategy Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="p-5 sm:p-6 rounded-3xl bg-[#181A20] border border-[#2B313A] shadow-lg flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F0B90B]" />
                <h3 className="text-sm sm:text-base font-bold text-white">Featured Strategy</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-[#F0B90B]/15 border border-[#F0B90B]/30 text-[#F0B90B] text-[10px] font-black uppercase tabular-nums">
                55.5% ROI
              </span>
            </div>

            <p className="text-xs text-[#848E9C] leading-relaxed mb-4">
              Quantitative high-frequency cross-market arbitrage strategy with daily automated yield distribution.
            </p>

            <div className="p-4 rounded-2xl bg-[#1E2329] border border-[#2B313A] mb-5 space-y-2.5 text-xs font-mono tabular-nums">
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
        </motion.div>
      </div>

      {/* Recent Ledger Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.16 }}
        className="p-5 sm:p-6 rounded-3xl bg-[#181A20] border border-[#2B313A] shadow-lg"
      >
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
            <tbody className="divide-y divide-[#2B313A] font-mono tabular-nums">
              {!summary?.recent_transactions || summary.recent_transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#848E9C] font-sans">
                    No transactions recorded yet. Fund your account with Bitcoin or USDT to begin.
                  </td>
                </tr>
              ) : (
                summary.recent_transactions.slice(0, 5).map((tx: any) => {
                  const isCredit = [
                    'deposit',
                    'investment_return',
                    'investment_principal_return',
                    'referral_bonus',
                    'balance_credit'
                  ].includes(tx.type);
                  return (
                    <tr key={tx.id} className="hover:bg-[#1E2329]/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">{tx.transaction_ref}</td>
                      <td className="py-3 px-4 font-sans font-semibold capitalize text-[#EAECEF]">
                        {tx.type.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 font-sans text-[#848E9C] max-w-xs truncate">{tx.description}</td>
                      <td className={`py-3 px-4 font-bold ${isCredit ? 'text-[#0ECB81]' : 'text-white'}`}>
                        {isCredit ? '+' : '-'}
                        {tx.amount} {tx.currency}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            tx.status === 'completed'
                              ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                              : 'bg-[#F0B90B]/15 text-[#F0B90B]'
                          }`}
                        >
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
      </motion.div>
    </div>
  );
};
