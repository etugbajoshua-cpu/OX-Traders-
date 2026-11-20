import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'ox_traders.db');
export const db = new Database(dbPath);

// Enable WAL mode for high performance concurrency & foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      country TEXT,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      is_verified INTEGER DEFAULT 0,
      two_factor_enabled INTEGER DEFAULT 0,
      two_factor_secret TEXT,
      referral_code TEXT UNIQUE NOT NULL,
      referred_by TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'suspended', 'restricted')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Wallets table (USD, BTC, USDT balances per user)
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      currency TEXT NOT NULL CHECK(currency IN ('USD', 'BTC', 'USDT')),
      balance REAL DEFAULT 0.0,
      locked_balance REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, currency),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Double-entry transactions ledger
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      transaction_ref TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('deposit', 'withdrawal', 'investment_open', 'investment_return', 'investment_principal_return', 'referral_bonus', 'balance_credit', 'balance_debit', 'fee')),
      currency TEXT NOT NULL,
      amount REAL NOT NULL,
      fee REAL DEFAULT 0.0,
      status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
      description TEXT NOT NULL,
      related_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Deposits table
    CREATE TABLE IF NOT EXISTS deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      currency TEXT NOT NULL CHECK(currency IN ('BTC', 'USDT')),
      network TEXT NOT NULL,
      deposit_address TEXT NOT NULL,
      amount REAL NOT NULL,
      tx_hash TEXT,
      proof_note TEXT,
      proof_image TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'verifying', 'confirmed', 'rejected')),
      admin_note TEXT,
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Withdrawals table
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      currency TEXT NOT NULL CHECK(currency IN ('BTC', 'USDT')),
      network TEXT NOT NULL,
      destination_address TEXT NOT NULL,
      amount REAL NOT NULL,
      fee REAL NOT NULL,
      net_amount REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'under_review', 'approved', 'processing', 'completed', 'rejected')),
      admin_note TEXT,
      payout_tx_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Investment plans
    CREATE TABLE IF NOT EXISTS investment_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      tagline TEXT,
      min_amount REAL NOT NULL,
      max_amount REAL NOT NULL,
      duration_days INTEGER NOT NULL,
      daily_roi REAL NOT NULL,
      total_roi REAL NOT NULL,
      risk_tier TEXT NOT NULL CHECK(risk_tier IN ('Conservative', 'Moderate', 'Aggressive', 'Institutional')),
      management_fee REAL DEFAULT 0.0,
      return_method TEXT NOT NULL,
      description TEXT NOT NULL,
      capital_returned INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Active & matured investments
    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      capital_amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      daily_return REAL NOT NULL,
      total_earned REAL DEFAULT 0.0,
      start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      maturity_date DATETIME NOT NULL,
      last_accrual_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES investment_plans(id)
    );

    -- KYC Records
    CREATE TABLE IF NOT EXISTS kyc_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      full_legal_name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      residential_address TEXT NOT NULL,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      id_type TEXT NOT NULL CHECK(id_type IN ('passport', 'national_id', 'drivers_license')),
      id_number TEXT NOT NULL,
      id_expiry TEXT,
      id_front_path TEXT,
      id_back_path TEXT,
      address_proof_path TEXT,
      selfie_path TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('not_submitted', 'pending', 'verified', 'rejected', 'additional_info_required')),
      admin_note TEXT,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Referral Records
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_id INTEGER NOT NULL,
      referred_id INTEGER NOT NULL,
      commission_rate REAL DEFAULT 5.0,
      total_commission REAL DEFAULT 0.0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info' CHECK(type IN ('success', 'warning', 'info', 'security')),
      is_read INTEGER DEFAULT 0,
      link TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Customer Support Tickets
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      ticket_code TEXT UNIQUE NOT NULL,
      subject TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('deposit', 'withdrawal', 'investment', 'kyc', 'security', 'general')),
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Ticket messages thread
    CREATE TABLE IF NOT EXISTS support_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL CHECK(sender_role IN ('user', 'admin')),
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
    );

    -- Admin Audit Logs
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      admin_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Platform Settings
    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  // 1. Seed Platform Settings
  const settingsCount = (db.prepare('SELECT count(*) as count FROM platform_settings').get() as { count: number }).count;
  if (settingsCount === 0) {
    const defaultSettings = [
      ['company_name', 'OX TRADERS', 'branding', 'Company trade name'],
      ['support_email', 'support@oxtraders.com', 'contact', 'Customer support email'],
      ['btc_deposit_address', 'bc1qg2a2gdxtccsxu83xy0jvezenutzyvmv4jl0uz4', 'crypto', 'Official Bitcoin deposit address'],
      ['usdt_deposit_address', 'TB4Uq6VQMFMbDZUq3xK4jM8mqz6rb2TqGf', 'crypto', 'Official USDT TRON TRC20 deposit address'],
      ['btc_min_deposit', '0.001', 'crypto', 'Minimum BTC deposit amount'],
      ['usdt_min_deposit', '50.0', 'crypto', 'Minimum USDT TRC20 deposit amount'],
      ['btc_min_withdrawal', '0.002', 'crypto', 'Minimum BTC withdrawal amount'],
      ['usdt_min_withdrawal', '25.0', 'crypto', 'Minimum USDT withdrawal amount'],
      ['btc_withdrawal_fee', '0.00035', 'crypto', 'Network withdrawal fee for BTC'],
      ['usdt_withdrawal_fee', '1.50', 'crypto', 'Network withdrawal fee for USDT TRC20'],
      ['referral_commission_percent', '5.0', 'referral', 'Referral reward percentage on active investments'],
      ['kyc_mandatory_for_withdrawal', 'true', 'kyc', 'Whether KYC is required before withdrawals'],
      ['maintenance_mode', 'false', 'system', 'Platform maintenance status']
    ];

    const stmt = db.prepare('INSERT INTO platform_settings (key, value, category, description) VALUES (?, ?, ?, ?)');
    for (const [key, value, cat, desc] of defaultSettings) {
      stmt.run(key, value, cat, desc);
    }
  }

  // 2. Seed Default Admin Account
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@oxtraders.com');
  if (!adminExists) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('AdminOxTraders2026!', salt);
    const adminUser = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, phone, country, role, is_verified, referral_code)
      VALUES (?, ?, ?, ?, ?, 'admin', 1, ?)
    `).run('admin@oxtraders.com', hash, 'OX TRADERS Master Admin', '+1 800 698 7233', 'United Kingdom', 'OX-ADMIN-01');

    const adminId = adminUser.lastInsertRowid;
    // Wallets for admin
    db.prepare('INSERT INTO wallets (user_id, currency, balance) VALUES (?, ?, ?)').run(adminId, 'USD', 250000.0);
    db.prepare('INSERT INTO wallets (user_id, currency, balance) VALUES (?, ?, ?)').run(adminId, 'BTC', 5.0);
    db.prepare('INSERT INTO wallets (user_id, currency, balance) VALUES (?, ?, ?)').run(adminId, 'USDT', 50000.0);
  }

  // 3. Seed Demo Investor Account
  const investorExists = db.prepare('SELECT id FROM users WHERE email = ?').get('investor@oxtraders.com');
  let investorId: number | bigint = 0;
  if (!investorExists) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('Investor2026!', salt);
    const investor = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, phone, country, role, is_verified, referral_code)
      VALUES (?, ?, ?, ?, ?, 'user', 1, ?)
    `).run('investor@oxtraders.com', hash, 'Alexander Vance', '+1 415 555 0192', 'Switzerland', 'OX-ALEX-99');

    investorId = investor.lastInsertRowid;
    // Wallets for demo investor
    db.prepare('INSERT INTO wallets (user_id, currency, balance) VALUES (?, ?, ?)').run(investorId, 'USD', 12500.0);
    db.prepare('INSERT INTO wallets (user_id, currency, balance) VALUES (?, ?, ?)').run(investorId, 'BTC', 0.285);
    db.prepare('INSERT INTO wallets (user_id, currency, balance) VALUES (?, ?, ?)').run(investorId, 'USDT', 3450.0);

    // Initial verified KYC for demo investor
    db.prepare(`
      INSERT INTO kyc_records (user_id, full_legal_name, date_of_birth, residential_address, city, country, postal_code, id_type, id_number, status, admin_note, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', 'Identity verified via official passport authentication', datetime('now'))
    `).run(investorId, 'Alexander Vance', '1988-04-12', 'Bahnhofstrasse 42', 'Zurich', 'Switzerland', '8001', 'passport', 'CH89421098X');

    // Initial welcome notification
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES (?, 'Welcome to OX TRADERS', 'Your institutional-grade investor account has been successfully initialized and verified.', 'success')
    `).run(investorId);

    // Initial ledger deposit transaction
    db.prepare(`
      INSERT INTO transactions (user_id, transaction_ref, type, currency, amount, fee, status, description)
      VALUES (?, 'TXN-DEP-INIT-01', 'deposit', 'USDT', 3450.0, 0, 'completed', 'Verified USDT TRC20 Deposit via Blockchain')
    `).run(investorId);
  }

  // 4. Seed Investment Plans
  const plansCount = (db.prepare('SELECT count(*) as count FROM investment_plans').get() as { count: number }).count;
  if (plansCount === 0) {
    const plans = [
      {
        name: 'OX Core Alpha',
        slug: 'ox-core-alpha',
        tagline: 'Systematic crypto index allocation with automated delta-neutral rebalancing',
        min_amount: 250,
        max_amount: 2500,
        duration_days: 14,
        daily_roi: 1.25,
        total_roi: 17.5,
        risk_tier: 'Conservative',
        management_fee: 0.0,
        return_method: 'Daily accrual with full principal return at maturity',
        description: 'Designed for conservative capital growth. Capital is deployed into top-tier liquidity pools and basis trading strategies that mitigate market volatility.',
        capital_returned: 1
      },
      {
        name: 'OX Premier Yield',
        slug: 'ox-premier-yield',
        tagline: 'Multi-strategy algorithmic trading across major cryptocurrency spot and derivative pairs',
        min_amount: 2500,
        max_amount: 15000,
        duration_days: 30,
        daily_roi: 1.85,
        total_roi: 55.5,
        risk_tier: 'Moderate',
        management_fee: 0.5,
        return_method: 'Daily automated compound yield distribution',
        description: 'Utilizes high-frequency statistical arbitrage and cross-exchange spread trading. Engineered for investors seeking superior risk-adjusted alpha.',
        capital_returned: 1
      },
      {
        name: 'OX Quantitative Hedge',
        slug: 'ox-quant-hedge',
        tagline: 'Algorithmic momentum and volatility capture model managed by proprietary AI execution engines',
        min_amount: 15000,
        max_amount: 50000,
        duration_days: 60,
        daily_roi: 2.40,
        total_roi: 144.0,
        risk_tier: 'Aggressive',
        management_fee: 1.0,
        return_method: 'Compound daily accruals with priority withdrawal liquidity',
        description: 'Advanced quantitative modeling targeting market inefficiencies across Bitcoin, Ethereum, and emerging Layer-1 liquidity ecosystems.',
        capital_returned: 1
      },
      {
        name: 'OX Institutional Tier',
        slug: 'ox-institutional-tier',
        tagline: 'Bespoke high-volume market making, institutional OTC arbitrage and private liquidity provision',
        min_amount: 50000,
        max_amount: 500000,
        duration_days: 90,
        daily_roi: 3.10,
        total_roi: 279.0,
        risk_tier: 'Institutional',
        management_fee: 0.75,
        return_method: 'Weekly audited returns with direct institutional desk liaison',
        description: 'Reserved for high-net-worth individuals and corporate treasuries. Backed by segregated custodial architecture, dedicated portfolio management, and multi-sig security.',
        capital_returned: 1
      }
    ];

    const insertPlan = db.prepare(`
      INSERT INTO investment_plans (name, slug, tagline, min_amount, max_amount, duration_days, daily_roi, total_roi, risk_tier, management_fee, return_method, description, capital_returned)
      VALUES (@name, @slug, @tagline, @min_amount, @max_amount, @duration_days, @daily_roi, @total_roi, @risk_tier, @management_fee, @return_method, @description, @capital_returned)
    `);

    for (const p of plans) {
      insertPlan.run(p);
    }
  }

  // Check if demo investor has an investment
  if (investorId) {
    const existingInv = db.prepare('SELECT id FROM investments WHERE user_id = ?').get(investorId);
    if (!existingInv) {
      const plan1 = db.prepare('SELECT id FROM investment_plans WHERE slug = ?').get('ox-premier-yield') as { id: number };
      if (plan1) {
        db.prepare(`
          INSERT INTO investments (user_id, plan_id, capital_amount, currency, daily_return, total_earned, start_date, maturity_date, status)
          VALUES (?, ?, 5000.0, 'USD', 92.5, 370.0, datetime('now', '-4 days'), datetime('now', '+26 days'), 'active')
        `).run(investorId, plan1.id);
      }
    }
  }
}
