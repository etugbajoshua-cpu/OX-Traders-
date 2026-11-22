import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext.tsx';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const TradingPage: React.FC = () => {
  const { balances } = useAuth();
  const [selectedPair, setSelectedPair] = useState<'BTC/USDT' | 'ETH/USDT' | 'SOL/USDT'>('BTC/USDT');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [orderAmount, setOrderAmount] = useState<string>('0.05');
  const [orderPrice, setOrderPrice] = useState<string>('91420.50');
  const [orderNotice, setOrderNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [livePrices, setLivePrices] = useState<Record<'BTC/USDT' | 'ETH/USDT' | 'SOL/USDT', number>>({
    'BTC/USDT': 91420.5,
    'ETH/USDT': 3340.2,
    'SOL/USDT': 215.8
  });

  useEffect(() => {
    fetch('/api/markets/live')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.coins) return;
        const next = { ...livePrices };
        for (const c of data.coins) {
          if (c.symbol === 'BTC') next['BTC/USDT'] = Number(c.current_price || next['BTC/USDT']);
          if (c.symbol === 'ETH') next['ETH/USDT'] = Number(c.current_price || next['ETH/USDT']);
          if (c.symbol === 'SOL') next['SOL/USDT'] = Number(c.current_price || next['SOL/USDT']);
        }
        setLivePrices(next);
      })
      .catch(() => {});
  }, []);

  const currentPrice = livePrices[selectedPair];
  const totalValue =
    (parseFloat(orderAmount) || 0) * (orderType === 'market' ? currentPrice : parseFloat(orderPrice) || currentPrice);

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(orderAmount);
    if (!num || num <= 0) {
      setOrderNotice({ type: 'error', text: 'Please enter a valid order size' });
      return;
    }

    setOrderNotice({
      type: 'success',
      text: `${side.toUpperCase()} order for ${num} ${selectedPair.split('/')[0]} submitted to execution desk.`
    });
    setTimeout(() => setOrderNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Trading Terminal</h2>
          <p className="text-xs text-[#848E9C] mt-1">
            Low-latency order routing and aggregated market liquidity on oxtraders.online.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#181A20] p-1 rounded-xl border border-[#2B313A] self-start sm:self-auto">
          {(['BTC/USDT', 'ETH/USDT', 'SOL/USDT'] as const).map((pair) => (
            <button
              key={pair}
              onClick={() => {
                setSelectedPair(pair);
                setOrderPrice(String(livePrices[pair]));
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer ${
                selectedPair === pair
                  ? 'bg-[#F0B90B] text-[#0B0E11] shadow-sm'
                  : 'text-[#848E9C] hover:text-white'
              }`}
            >
              {pair}
            </button>
          ))}
        </div>
      </div>

      {orderNotice && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ox-reveal-in ${
            orderNotice.type === 'success'
              ? 'bg-[#0ECB81]/10 border border-[#0ECB81]/30 text-[#0ECB81]'
              : 'bg-[#F6465D]/10 border border-[#F6465D]/30 text-[#F6465D]'
          }`}
        >
          {orderNotice.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{orderNotice.text}</span>
        </div>
      )}

      {/* Terminal Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Vector Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32 }}
          className="lg:col-span-8 p-5 sm:p-6 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#2B313A]">
              <div className="flex items-center gap-3 tabular-nums">
                <span className="text-lg sm:text-xl font-black font-mono text-white">{selectedPair}</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-[#0ECB81]">
                  ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-[#0ECB81] bg-[#0ECB81]/15 px-2 py-0.5 rounded font-mono">
                  +3.42%
                </span>
              </div>
              <div className="text-xs text-[#848E9C] font-mono tabular-nums hidden sm:block">
                Avail USD: ${(balances.USD?.available || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="w-full h-72 relative flex items-end">
              <svg viewBox="0 0 700 240" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="tradeGradYellow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F0B90B" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#F0B90B" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <path
                  d="M 20 180 Q 90 160, 160 170 T 280 135 T 390 150 T 500 90 T 600 110 T 680 50 L 680 240 L 20 240 Z"
                  fill="url(#tradeGradYellow)"
                />

                <path
                  d="M 20 180 Q 90 160, 160 170 T 280 135 T 390 150 T 500 90 T 600 110 T 680 50"
                  fill="none"
                  stroke="#F0B90B"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {[
                  { x: 60, o: 185, c: 172, h: 165, l: 195, g: true },
                  { x: 120, o: 172, c: 165, h: 158, l: 180, g: true },
                  { x: 180, o: 165, c: 175, h: 160, l: 182, g: false },
                  { x: 240, o: 175, c: 150, h: 142, l: 180, g: true },
                  { x: 300, o: 150, c: 138, h: 130, l: 155, g: true },
                  { x: 360, o: 138, c: 148, h: 132, l: 156, g: false },
                  { x: 420, o: 148, c: 120, h: 112, l: 152, g: true },
                  { x: 480, o: 120, c: 102, h: 95, l: 126, g: true },
                  { x: 540, o: 102, c: 112, h: 98, l: 118, g: false },
                  { x: 600, o: 112, c: 80, h: 72, l: 115, g: true },
                  { x: 660, o: 80, c: 52, h: 45, l: 85, g: true }
                ].map((c, i) => (
                  <g key={i}>
                    <line x1={c.x} y1={c.h} x2={c.x} y2={c.l} stroke={c.g ? '#0ECB81' : '#F6465D'} strokeWidth="1.5" />
                    <rect
                      x={c.x - 7}
                      y={Math.min(c.o, c.c)}
                      width="14"
                      height={Math.max(4, Math.abs(c.c - c.o))}
                      fill={c.g ? '#0ECB81' : '#F6465D'}
                      rx="1"
                    />
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#2B313A] text-xs text-[#848E9C] flex justify-between font-mono tabular-nums">
            <span>RSI(14): 63.8 • EMA(20): ${(currentPrice * 0.98).toFixed(2)}</span>
            <span className="text-[#0ECB81]">Trading Online</span>
          </div>
        </motion.div>

        {/* Right Column: Order Placement Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.06 }}
          className="lg:col-span-4 p-5 sm:p-6 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl flex flex-col justify-between"
        >
          <div>
            {/* Buy / Sell Tabs */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-xl bg-[#1E2329] border border-[#2B313A]">
              <button
                type="button"
                onClick={() => setSide('buy')}
                className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  side === 'buy'
                    ? 'bg-[#0ECB81] text-[#0B0E11] shadow-sm'
                    : 'text-[#848E9C] hover:text-white'
                }`}
              >
                Buy {selectedPair.split('/')[0]}
              </button>
              <button
                type="button"
                onClick={() => setSide('sell')}
                className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  side === 'sell'
                    ? 'bg-[#F6465D] text-white shadow-sm'
                    : 'text-[#848E9C] hover:text-white'
                }`}
              >
                Sell {selectedPair.split('/')[0]}
              </button>
            </div>

            {/* Order Type Tabs */}
            <div className="flex gap-2 mb-4 text-xs">
              <button
                type="button"
                onClick={() => setOrderType('market')}
                className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                  orderType === 'market' ? 'bg-[#2B313A] text-white' : 'text-[#848E9C] hover:text-white'
                }`}
              >
                Market
              </button>
              <button
                type="button"
                onClick={() => setOrderType('limit')}
                className={`px-3 py-1 rounded-lg font-semibold cursor-pointer ${
                  orderType === 'limit' ? 'bg-[#2B313A] text-white' : 'text-[#848E9C] hover:text-white'
                }`}
              >
                Limit
              </button>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              {orderType === 'limit' && (
                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1">Price (USDT)</label>
                  <input
                    type="number"
                    step="any"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm font-mono focus:outline-none focus:border-[#F0B90B]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                  Amount ({selectedPair.split('/')[0]})
                </label>
                <input
                  type="number"
                  step="any"
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm font-mono focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              {/* Order summary */}
              <div className="p-3.5 rounded-xl bg-[#1E2329] border border-[#2B313A] space-y-1.5 text-xs font-mono tabular-nums">
                <div className="flex justify-between text-[#848E9C]">
                  <span>Price:</span>
                  <span className="text-white">${currentPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#848E9C]">
                  <span>Fee (0.05%):</span>
                  <span className="text-white">${(totalValue * 0.0005).toFixed(2)}</span>
                </div>
                <div className="pt-1 border-t border-[#2B313A] flex justify-between text-white font-bold">
                  <span>Total:</span>
                  <span className="text-[#0ECB81]">${totalValue.toFixed(2)} USD</span>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-transform shadow-md active:scale-98 cursor-pointer ${
                  side === 'buy' ? 'bg-[#0ECB81] text-[#0B0E11]' : 'bg-[#F6465D] text-white'
                }`}
              >
                Place {side.toUpperCase()} Order
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-[#2B313A] text-[11px] text-[#848E9C] text-center">
            Slippage tolerance: 0.1% • Instant settlement
          </div>
        </motion.div>
      </div>
    </div>
  );
};
