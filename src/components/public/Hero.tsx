import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Shield,
  Zap,
  Lock,
  BarChart3,
  CheckCircle2,
  TrendingUp,
  Layers
} from 'lucide-react';

interface HeroProps {
  onNavigate: (route: string) => void;
}

const HERO_STRATEGIES = {
  'BTC/USDT': {
    pair: 'BTC/USDT',
    desk: 'OX Premier Yield',
    rate: '+1.85% / day',
    cycle: '30-Day Cycle',
    roi: '55.5% Cycle ROI',
    spot: '$91,420.50',
    change: '+3.42%',
    curve: 'M 10 92 Q 65 82, 110 74 T 205 52 T 290 34 T 350 14',
    area: 'M 10 92 Q 65 82, 110 74 T 205 52 T 290 34 T 350 14 L 350 105 L 10 105 Z',
    endY: 14
  },
  'ETH/USDT': {
    pair: 'ETH/USDT',
    desk: 'OX Core Alpha',
    rate: '+1.25% / day',
    cycle: '14-Day Cycle',
    roi: '17.5% Cycle ROI',
    spot: '$3,340.20',
    change: '+2.15%',
    curve: 'M 10 86 Q 75 76, 130 68 T 215 48 T 285 38 T 350 22',
    area: 'M 10 86 Q 75 76, 130 68 T 215 48 T 285 38 T 350 22 L 350 105 L 10 105 Z',
    endY: 22
  },
  'SOL/USDT': {
    pair: 'SOL/USDT',
    desk: 'OX Quantitative Hedge',
    rate: '+2.40% / day',
    cycle: '60-Day Cycle',
    roi: '144.0% Cycle ROI',
    spot: '$215.80',
    change: '+5.82%',
    curve: 'M 10 96 Q 60 90, 125 66 T 200 44 T 280 24 T 350 10',
    area: 'M 10 96 Q 60 90, 125 66 T 200 44 T 280 24 T 350 10 L 350 105 L 10 105 Z',
    endY: 10
  }
} as const;

type HeroPairKey = keyof typeof HERO_STRATEGIES;

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const [activePair, setActivePair] = useState<HeroPairKey>('BTC/USDT');
  const strat = HERO_STRATEGIES[activePair];

  return (
    <section id="about" className="relative overflow-hidden pt-10 pb-14 sm:pt-16 sm:pb-24 border-b border-[#2B313A]/60">
      {/* Crisp ambient Binance gold radial backlight */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-[#F0B90B]/8 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Narrative & Primary Action Column */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 text-center lg:text-left"
          >
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#F0B90B] mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F0B90B]" />
              <span>oxtraders.online • Institutional Crypto Architecture</span>
            </div>

            <h1 className="text-[clamp(2.25rem,4.5vw,3.75rem)] font-black text-white tracking-tight leading-[1.08] mb-5">
              Trade &amp; Invest in Crypto with{' '}
              <span className="text-[#F0B90B]">Total Confidence</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-[#848E9C] font-normal leading-relaxed max-w-2xl mx-auto lg:mx-0 mb-8">
              OX TRADERS delivers algorithmic crypto liquidity strategies, double-entry financial ledger accounting, and direct on-chain Bitcoin &amp; USDT TRC20 custody.
            </p>

            {/* Primary & Secondary Action Row */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 sm:gap-4 mb-10 max-w-md sm:max-w-none mx-auto lg:mx-0">
              <button
                onClick={() => onNavigate('register')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-extrabold text-xs sm:text-sm uppercase tracking-wider transition-transform duration-150 shadow-lg active:scale-[0.98] cursor-pointer min-h-[48px]"
              >
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('plans')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#181A20] hover:bg-[#1E2329] text-white font-semibold text-xs sm:text-sm border border-[#2B313A] hover:border-[#F0B90B]/40 transition-colors cursor-pointer min-h-[48px]"
              >
                <BarChart3 className="w-4 h-4 text-[#F0B90B]" />
                <span>Explore Yield Plans</span>
              </button>

              <button
                onClick={() => onNavigate('login')}
                className="w-full sm:w-auto px-5 py-3.5 rounded-xl text-[#EAECEF] hover:text-[#F0B90B] text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[48px]"
              >
                Log In
              </button>
            </div>

            {/* Clean Architectural Trust Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl bg-[#181A20] border border-[#2B313A] divide-y sm:divide-y-0 sm:divide-x divide-[#2B313A]">
              <div className="p-3.5 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-1.5 text-[#0ECB81] font-bold text-xs mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Audited Ledger</span>
                </div>
                <div className="text-[11px] text-[#848E9C]">Double-entry engine</div>
              </div>

              <div className="p-3.5 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-1.5 text-[#F0B90B] font-bold text-xs mb-1">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>Cold Custody</span>
                </div>
                <div className="text-[11px] text-[#848E9C]">Multi-sig protection</div>
              </div>

              <div className="p-3.5 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-1.5 text-[#0ECB81] font-bold text-xs mb-1">
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>BTC &amp; USDT</span>
                </div>
                <div className="text-[11px] text-[#848E9C]">Direct on-chain rails</div>
              </div>

              <div className="p-3.5 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-1.5 text-[#F0B90B] font-bold text-xs mb-1">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Encrypted KYC</span>
                </div>
                <div className="text-[11px] text-[#848E9C]">Private compliance</div>
              </div>
            </div>
          </motion.div>

          {/* Right Live Execution & Interactive Yield Preview Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5"
          >
            <div className="rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-2xl overflow-hidden relative">
              {/* Top Gold Accent Hairline */}
              <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent" />

              <div className="p-5 sm:p-6 space-y-4">
                {/* Interactive Strategy Pair Switcher */}
                <div className="flex items-center justify-between gap-2 bg-[#12151A] p-1 rounded-xl border border-[#2B313A]">
                  {(Object.keys(HERO_STRATEGIES) as HeroPairKey[]).map((key) => {
                    const isSelected = activePair === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setActivePair(key)}
                        className={`flex-1 py-1.5 px-2.5 rounded-lg text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#F0B90B] text-[#0B0E11] shadow-sm'
                            : 'text-[#848E9C] hover:text-white'
                        }`}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePair}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Terminal Header */}
                    <div className="flex items-center justify-between border-b border-[#2B313A] pb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#F0B90B]/15 border border-[#F0B90B]/30 flex items-center justify-center text-[#F0B90B]">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-white tracking-tight">
                            {strat.desk}
                          </div>
                          <div className="text-[11px] font-mono text-[#848E9C] tabular-nums">
                            {strat.pair} • {strat.spot}{' '}
                            <span className="text-[#0ECB81]">{strat.change}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono tabular-nums">
                        <div className="text-xs font-bold text-[#0ECB81]">{strat.rate}</div>
                        <div className="text-[10px] text-[#848E9C]">{strat.cycle}</div>
                      </div>
                    </div>

                    {/* Yield Growth Spark Curve */}
                    <div className="rounded-xl bg-[#12151A] border border-[#2B313A] p-4">
                      <div className="flex items-center justify-between text-xs mb-3">
                        <span className="text-[#848E9C] font-medium">Execution Depth Trajectory</span>
                        <span className="font-mono font-bold text-[#0ECB81] tabular-nums flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {strat.roi}
                        </span>
                      </div>
                      <svg viewBox="0 0 360 110" className="w-full h-24">
                        <defs>
                          <linearGradient id="heroCurveGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F0B90B" stopOpacity="0.34" />
                            <stop offset="100%" stopColor="#F0B90B" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <line x1="0" y1="30" x2="360" y2="30" stroke="#2B313A" strokeDasharray="3 3" />
                        <line x1="0" y1="70" x2="360" y2="70" stroke="#2B313A" strokeDasharray="3 3" />
                        <path d={strat.area} fill="url(#heroCurveGrad)" />
                        <path
                          d={strat.curve}
                          fill="none"
                          stroke="#F0B90B"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <circle cx="350" cy={strat.endY} r="4.5" fill="#F0B90B" />
                      </svg>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Custody & Settlement Summary Rows */}
                <div className="grid grid-cols-2 gap-3 font-mono tabular-nums">
                  <div className="p-3.5 rounded-xl bg-[#1E2329] border border-[#2B313A]">
                    <div className="text-[10px] font-sans uppercase tracking-wider text-[#848E9C] mb-1">
                      Supported Rails
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-white">BTC &amp; TRC20</div>
                    <div className="text-[10px] text-[#0ECB81] mt-0.5">0% Deposit Fee</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[#1E2329] border border-[#2B313A]">
                    <div className="text-[10px] font-sans uppercase tracking-wider text-[#848E9C] mb-1">
                      Capital Unlock
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-[#F0B90B]">100% Principal</div>
                    <div className="text-[10px] text-[#848E9C] mt-0.5">Returned at maturity</div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('register')}
                  className="w-full py-3 rounded-xl bg-[#1E2329] hover:bg-[#2B313A] border border-[#F0B90B]/30 text-[#F0B90B] font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Open Live Portfolio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
