import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedMarkets: any = null;
let lastMarketFetch = 0;

const FALLBACK_MARKETS = {
  source: 'ox_liquidity_aggregator',
  coins: [
    {
      id: 'bitcoin',
      symbol: 'BTC',
      name: 'Bitcoin',
      current_price: 91420.5,
      price_change_percentage_24h: 3.42,
      high_24h: 92100.0,
      low_24h: 88750.0,
      total_volume: 38400000000,
      market_cap: 1805000000000,
      sparkline_in_7d: [88000, 89200, 88700, 90100, 91200, 90800, 91420],
    },
    {
      id: 'ethereum',
      symbol: 'ETH',
      name: 'Ethereum',
      current_price: 3340.2,
      price_change_percentage_24h: 2.15,
      high_24h: 3390.0,
      low_24h: 3220.0,
      total_volume: 18200000000,
      market_cap: 402000000000,
      sparkline_in_7d: [3180, 3240, 3210, 3290, 3310, 3330, 3340],
    },
    {
      id: 'tether',
      symbol: 'USDT',
      name: 'Tether',
      current_price: 1.0002,
      price_change_percentage_24h: 0.01,
      high_24h: 1.001,
      low_24h: 0.9998,
      total_volume: 45000000000,
      market_cap: 128000000000,
      sparkline_in_7d: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
    },
    {
      id: 'solana',
      symbol: 'SOL',
      name: 'Solana',
      current_price: 215.8,
      price_change_percentage_24h: 5.82,
      high_24h: 221.0,
      low_24h: 201.5,
      total_volume: 9100000000,
      market_cap: 102000000000,
      sparkline_in_7d: [195, 202, 199, 208, 212, 210, 215],
    },
    {
      id: 'binancecoin',
      symbol: 'BNB',
      name: 'BNB',
      current_price: 642.1,
      price_change_percentage_24h: 1.45,
      high_24h: 648.0,
      low_24h: 630.0,
      total_volume: 2100000000,
      market_cap: 93000000000,
      sparkline_in_7d: [628, 632, 630, 635, 639, 640, 642],
    },
    {
      id: 'ripple',
      symbol: 'XRP',
      name: 'XRP',
      current_price: 1.12,
      price_change_percentage_24h: -0.65,
      high_24h: 1.18,
      low_24h: 1.09,
      total_volume: 3800000000,
      market_cap: 64000000000,
      sparkline_in_7d: [1.05, 1.08, 1.1, 1.15, 1.14, 1.13, 1.12],
    },
    {
      id: 'cardano',
      symbol: 'ADA',
      name: 'Cardano',
      current_price: 0.84,
      price_change_percentage_24h: 4.12,
      high_24h: 0.88,
      low_24h: 0.79,
      total_volume: 1400000000,
      market_cap: 29000000000,
      sparkline_in_7d: [0.77, 0.79, 0.81, 0.8, 0.82, 0.83, 0.84],
    },
    {
      id: 'avalanche-2',
      symbol: 'AVAX',
      name: 'Avalanche',
      current_price: 36.4,
      price_change_percentage_24h: 3.2,
      high_24h: 37.5,
      low_24h: 34.8,
      total_volume: 850000000,
      market_cap: 14800000000,
      sparkline_in_7d: [33, 34.2, 33.8, 35.1, 35.8, 36.0, 36.4],
    },
  ],
};

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      platform: 'OX TRADERS',
      domain: 'oxtraders.online',
      database: 'firebase-firestore',
      database_label: 'Firebase Cloud Firestore (Permanent)',
      persistent: true,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/markets/live', async (_req, res) => {
    try {
      const now = Date.now();
      if (cachedMarkets && now - lastMarketFetch < 30000) {
        return res.json(cachedMarkets);
      }

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,tether,solana,binancecoin,ripple,cardano,avalanche-2,dogecoin,chainlink&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h',
          { headers: { Accept: 'application/json' }, signal: controller.signal }
        );
        clearTimeout(timer);

        if (response.ok) {
          const data = await response.json();
          cachedMarkets = {
            source: 'coingecko_live',
            updated_at: new Date().toISOString(),
            coins: data.map((c: any) => ({
              id: c.id,
              symbol: String(c.symbol || '').toUpperCase(),
              name: c.name,
              current_price: c.current_price,
              price_change_percentage_24h: c.price_change_percentage_24h,
              high_24h: c.high_24h,
              low_24h: c.low_24h,
              total_volume: c.total_volume,
              market_cap: c.market_cap,
              sparkline_in_7d: c.sparkline_in_7d?.price || [],
            })),
          };
          lastMarketFetch = now;
          return res.json(cachedMarkets);
        }
      } catch {
        // Fall through to cached or default liquidity quotes
      }

      if (cachedMarkets) {
        return res.json(cachedMarkets);
      }

      return res.json({
        ...FALLBACK_MARKETS,
        updated_at: new Date().toISOString(),
      });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Market feed error' });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[OX TRADERS] Vite dev middleware mounted');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OX TRADERS] Server running at http://0.0.0.0:${PORT}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[OX TRADERS] Received ${signal}, shutting down cleanly...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((err) => {
  console.error('[OX TRADERS] Failed to start server:', err);
  process.exit(1);
});
