import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CryptoMarketCoin } from '../../types/index.ts';
import { TrendingUp, TrendingDown, Activity, RefreshCw } from 'lucide-react';

export const LiveCryptoTicker: React.FC = () => {
  const [coins, setCoins] = useState<CryptoMarketCoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchMarkets = async () => {
    try {
      const res = await fetch('/api/markets/live');
      if (res.ok) {
        const data = await res.json();
        if (data.coins) {
          setCoins(data.coins);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.error('Failed to load market ticker:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (val: number) => {
    if (val >= 1) {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${val.toFixed(4)}`;
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}M`;
    return `$${vol.toLocaleString()}`;
  };

  return (
    <section id="markets" className="w-full py-8 sm:py-10 border-b border-[#2B313A] bg-[#0B0E11]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-5 sm:mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#F0B90B]" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
              Live Cryptocurrency Markets
            </h3>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#848E9C]">
            <span className="hidden sm:inline">Direct Order Book Feeds</span>
            {lastUpdated && (
              <span className="text-[11px] text-[#848E9C] font-mono tabular-nums flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 text-[#F0B90B]" />
                Updated {lastUpdated}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-[#181A20] border border-[#2B313A] animate-pulse p-4" />
            ))
          ) : (
            coins.slice(0, 8).map((coin, index) => {
              const isPositive = coin.price_change_percentage_24h >= 0;
              return (
                <motion.div
                  key={coin.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className="p-4 rounded-xl bg-[#181A20] border border-[#2B313A] hover:border-[#F0B90B]/50 hover:-translate-y-0.5 transition-[transform,border-color] duration-200 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-white tracking-wide">
                          {coin.symbol}
                        </span>
                        <span className="text-xs text-[#848E9C] truncate max-w-[88px]">
                          {coin.name}
                        </span>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-white font-mono tabular-nums mt-1">
                        {formatCurrency(coin.current_price)}
                      </div>
                    </div>

                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono tabular-nums ${
                        isPositive
                          ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                          : 'bg-[#F6465D]/15 text-[#F6465D]'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isPositive ? '+' : ''}
                        {coin.price_change_percentage_24h?.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#2B313A] flex items-center justify-between text-[11px] text-[#848E9C] tabular-nums">
                    <div>
                      <span className="text-[#5E6673] mr-1">24h Vol:</span>
                      <span className="text-[#EAECEF] font-mono">
                        {formatVolume(coin.total_volume)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#5E6673] mr-1">High:</span>
                      <span className="text-[#EAECEF] font-mono">
                        {formatCurrency(coin.high_24h)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};
