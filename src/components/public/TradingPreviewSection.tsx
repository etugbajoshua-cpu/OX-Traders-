import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, BarChart2 } from 'lucide-react';

interface TradingPreviewSectionProps {
  onNavigate: (route: string) => void;
}

export const TradingPreviewSection: React.FC<TradingPreviewSectionProps> = ({ onNavigate }) => {
  const [selectedPair, setSelectedPair] = useState<'BTC/USDT' | 'ETH/USDT' | 'SOL/USDT'>('BTC/USDT');

  const pairData = {
    'BTC/USDT': { price: 91420.5, change: 3.42, high: 92100.0, low: 88750.0, vol: '38.4B' },
    'ETH/USDT': { price: 3340.2, change: 2.15, high: 3390.0, low: 3220.0, vol: '18.2B' },
    'SOL/USDT': { price: 215.8, change: 5.82, high: 221.0, low: 201.5, vol: '9.1B' }
  };

  const current = pairData[selectedPair];

  const asks = [
    { price: current.price + 14.5, amount: 0.842, total: 0.842 },
    { price: current.price + 10.2, amount: 1.45, total: 2.292 },
    { price: current.price + 6.8, amount: 0.52, total: 2.812 },
    { price: current.price + 2.5, amount: 2.11, total: 4.922 }
  ];

  const bids = [
    { price: current.price - 1.8, amount: 1.95, total: 1.95 },
    { price: current.price - 5.4, amount: 0.78, total: 2.73 },
    { price: current.price - 9.1, amount: 3.24, total: 5.97 },
    { price: current.price - 13.6, amount: 1.15, total: 7.12 }
  ];

  return (
    <section id="trading" className="py-12 sm:py-20 bg-[#0B0E11] border-b border-[#2B313A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-4"
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#F0B90B] mb-2">
              Execution Architecture
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Cryptocurrency Trading Terminal
            </h2>
            <p className="text-[#848E9C] text-xs sm:text-sm mt-2 max-w-xl">
              High-throughput matching engine integrated with global liquidity aggregation, deep market depth, and ultra-low slippage execution.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#181A20] p-1 rounded-xl border border-[#2B313A] self-start md:self-auto">
            {(['BTC/USDT', 'ETH/USDT', 'SOL/USDT'] as const).map((pair) => (
              <button
                key={pair}
                onClick={() => setSelectedPair(pair)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer whitespace-nowrap ${
                  selectedPair === pair
                    ? 'bg-[#F0B90B] text-[#0B0E11] shadow-sm'
                    : 'text-[#848E9C] hover:text-white'
                }`}
              >
                {pair}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-2xl overflow-hidden"
        >
          <div className="p-4 bg-[#1E2329] border-b border-[#2B313A] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-base font-extrabold font-mono text-white">
                {selectedPair}
              </span>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="text-lg font-bold font-mono text-[#0ECB81]">
                  ${current.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold font-mono text-[#0ECB81] bg-[#0ECB81]/15 px-2 py-0.5 rounded">
                  +{current.change}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 text-xs text-[#848E9C] font-mono tabular-nums">
              <div>
                <span className="text-[#5E6673] mr-1.5">24h High:</span>
                <span className="text-white">${current.high.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[#5E6673] mr-1.5">24h Low:</span>
                <span className="text-white">${current.low.toLocaleString()}</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-[#5E6673] mr-1.5">24h Vol:</span>
                <span className="text-white">{current.vol}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[380px]">
            <div className="lg:col-span-2 p-5 sm:p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#2B313A]">
              <div className="flex items-center justify-between mb-4 text-xs text-[#848E9C]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white flex items-center gap-1">
                    <BarChart2 className="w-3.5 h-3.5 text-[#F0B90B]" />
                    Candlestick Matrix
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#1E2329] text-[#848E9C] font-mono">1H</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#1E2329] text-[#848E9C] font-mono">4H</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#F0B90B]/20 text-[#F0B90B] font-mono font-bold">1D</span>
                </div>
                <div className="text-[11px] text-[#5E6673]">Low Latency Feed</div>
              </div>

              <div className="w-full h-56 relative flex items-end">
                <svg viewBox="0 0 700 200" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradYellow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F0B90B" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#F0B90B" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  <path
                    d="M 20 160 Q 90 140, 150 150 T 260 120 T 360 135 T 480 80 T 580 95 T 680 40 L 680 200 L 20 200 Z"
                    fill="url(#chartGradYellow)"
                  />

                  <path
                    d="M 20 160 Q 90 140, 150 150 T 260 120 T 360 135 T 480 80 T 580 95 T 680 40"
                    fill="none"
                    stroke="#F0B90B"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {[
                    { x: 50, open: 165, close: 155, high: 145, low: 175, green: true },
                    { x: 100, open: 155, close: 148, high: 140, low: 160, green: true },
                    { x: 150, open: 148, close: 152, high: 142, low: 158, green: false },
                    { x: 200, open: 152, close: 135, high: 130, low: 155, green: true },
                    { x: 250, open: 135, close: 122, high: 115, low: 140, green: true },
                    { x: 300, open: 122, close: 132, high: 118, low: 138, green: false },
                    { x: 350, open: 132, close: 128, high: 120, low: 135, green: true },
                    { x: 400, open: 128, close: 110, high: 100, low: 130, green: true },
                    { x: 450, open: 110, close: 92, high: 85, low: 115, green: true },
                    { x: 500, open: 92, close: 96, high: 88, low: 102, green: false },
                    { x: 550, open: 96, close: 82, high: 75, low: 98, green: true },
                    { x: 600, open: 82, close: 68, high: 60, low: 85, green: true },
                    { x: 650, open: 68, close: 45, high: 38, low: 72, green: true }
                  ].map((c, i) => {
                    const color = c.green ? '#0ECB81' : '#F6465D';
                    return (
                      <g key={i}>
                        <line x1={c.x} y1={c.high} x2={c.x} y2={c.low} stroke={color} strokeWidth="1.5" />
                        <rect
                          x={c.x - 6}
                          y={Math.min(c.open, c.close)}
                          width="12"
                          height={Math.max(4, Math.abs(c.close - c.open))}
                          fill={color}
                          rx="1"
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="mt-4 pt-3 border-t border-[#2B313A] flex items-center justify-between text-xs text-[#848E9C]">
                <span className="font-mono tabular-nums">MA(25): $90,140 | RSI(14): 64.2</span>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="text-[#F0B90B] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Launch Full Terminal <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6 bg-[#181A20] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3 text-xs text-[#848E9C] font-semibold uppercase tracking-wider">
                  <span>Price (USD)</span>
                  <span>Size ({selectedPair.split('/')[0]})</span>
                  <span>Total</span>
                </div>

                <div className="space-y-1.5 mb-3 font-mono tabular-nums text-xs">
                  {asks.map((a, i) => (
                    <div key={i} className="flex justify-between items-center text-[#F6465D] py-0.5 px-1 rounded hover:bg-[#F6465D]/10 transition-colors">
                      <span className="font-bold">${a.price.toFixed(1)}</span>
                      <span className="text-[#EAECEF]">{a.amount.toFixed(3)}</span>
                      <span className="text-[#5E6673]">{a.total.toFixed(3)}</span>
                    </div>
                  ))}
                </div>

                <div className="py-2 px-3 rounded-xl bg-[#1E2329] border border-[#2B313A] text-center my-3 tabular-nums">
                  <span className="text-xs text-[#848E9C] font-mono">Market Spread: </span>
                  <span className="text-xs font-bold font-mono text-[#0ECB81]">$4.30 (0.004%)</span>
                </div>

                <div className="space-y-1.5 font-mono tabular-nums text-xs">
                  {bids.map((b, i) => (
                    <div key={i} className="flex justify-between items-center text-[#0ECB81] py-0.5 px-1 rounded hover:bg-[#0ECB81]/10 transition-colors">
                      <span className="font-bold">${b.price.toFixed(1)}</span>
                      <span className="text-[#EAECEF]">{b.amount.toFixed(3)}</span>
                      <span className="text-[#5E6673]">{b.total.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#2B313A]">
                <button
                  onClick={() => onNavigate('register')}
                  className="w-full py-2.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md min-h-[44px]"
                >
                  Trade with OX TRADERS
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
