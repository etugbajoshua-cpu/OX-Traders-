import React, { useEffect, useState } from 'react';
import { CryptoMarketCoin } from '../../types/index.ts';
import { Search, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

export const MarketsPage: React.FC = () => {
  const [coins, setCoins] = useState<CryptoMarketCoin[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/markets/live');
      if (res.ok) {
        const data = await res.json();
        setCoins(data.coins || []);
      }
    } catch (err) {
      console.error('Failed to load market data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  const filteredCoins = coins.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Cryptocurrency Markets
          </h2>
          <p className="text-xs text-[#848E9C] mt-1">
            Real-time digital asset liquidity, 24-hour highs and lows, and market capitalization feeds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#848E9C] absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search coin or symbol..."
              className="pl-9 pr-4 py-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-xs text-white focus:outline-none focus:border-[#F0B90B] w-48 sm:w-64"
            />
          </div>

          <button
            onClick={fetchMarkets}
            className="p-2 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white cursor-pointer"
            title="Refresh Quotes"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-[#1E2329] text-[#848E9C] uppercase text-[10px] tracking-wider border-b border-[#2B313A]">
              <tr>
                <th className="py-3 px-4">Asset</th>
                <th className="py-3 px-4">Price (USD)</th>
                <th className="py-3 px-4">24h Change</th>
                <th className="py-3 px-4">24h High</th>
                <th className="py-3 px-4">24h Low</th>
                <th className="py-3 px-4">24h Volume</th>
                <th className="py-3 px-4">Market Cap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B313A] font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#848E9C] font-sans">
                    Loading live market quotes...
                  </td>
                </tr>
              ) : filteredCoins.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#848E9C] font-sans">
                    No cryptocurrency found matching "{searchTerm}".
                  </td>
                </tr>
              ) : (
                filteredCoins.map((coin) => {
                  const isPositive = coin.price_change_percentage_24h >= 0;
                  return (
                    <tr key={coin.id} className="hover:bg-[#1E2329]/50">
                      <td className="py-3.5 px-4 font-sans font-bold text-white flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-[#1E2329] flex items-center justify-center text-xs font-mono font-bold text-[#F0B90B]">
                          {coin.symbol.charAt(0)}
                        </span>
                        <div>
                          <div>{coin.name}</div>
                          <div className="text-[10px] text-[#848E9C] font-mono">{coin.symbol}</div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        ${coin.current_price >= 1 ? coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : coin.current_price.toFixed(4)}
                      </td>
                      <td className="py-3.5 px-4 font-sans font-bold">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                          isPositive
                            ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                            : 'bg-[#F6465D]/15 text-[#F6465D]'
                        }`}>
                          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isPositive ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[#EAECEF]">
                        ${coin.high_24h.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-[#EAECEF]">
                        ${coin.low_24h.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-[#848E9C]">
                        ${(coin.total_volume / 1e9).toFixed(2)}B
                      </td>
                      <td className="py-3.5 px-4 text-[#848E9C]">
                        ${(coin.market_cap / 1e9).toFixed(2)}B
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
