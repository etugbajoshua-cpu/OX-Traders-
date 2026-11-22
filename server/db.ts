import Database from 'better-sqlite3';
import pg from 'pg';
import { createClient, Client as LibsqlClient, Transaction as LibsqlTransaction } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

// Detect external PostgreSQL from any common environment variable name
const databaseUrl = (
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRESQL_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  ''
).trim();

// Detect Turso / libSQL Cloud SQLite (serverless SQLite - zero PostgreSQL required)
const tursoUrl = (process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || '').trim();
const tursoAuthToken = (process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN || '').trim();

export const isPostgres = databaseUrl.length > 0 && tursoUrl.length === 0;
export const isTurso = tursoUrl.length > 0;

function resolveSqliteDirectory(): { dir: string; hasPersistentMount: boolean } {
  if (process.env.DATA_DIR?.trim()) {
    return { dir: path.resolve(process.env.DATA_DIR.trim()), hasPersistentMount: true };
  }

  // Auto-detect common Render / Railway / Fly persistent disk mount paths
  for (const candidate of ['/var/data', '/data', '/mnt/data']) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        fs.accessSync(candidate, fs.constants.W_OK);
        return { dir: candidate, hasPersistentMount: true };
      }
    } catch {
      // ignore non-writable system directories
    }
  }

  return { dir: path.resolve(process.cwd(), 'data'), hasPersistentMount: false };
}

const sqliteStorageInfo = resolveSqliteDirectory();

export type DatabaseEngineType = 'turso' | 'postgresql' | 'sqlite-disk' | 'sqlite-ephemeral';

export const databaseEngine: DatabaseEngineType = isTurso
  ? 'turso'
  : isPostgres
    ? 'postgresql'
    : sqliteStorageInfo.hasPersistentMount
      ? 'sqlite-disk'
      : 'sqlite-ephemeral';

export const isPersistentDatabase = databaseEngine !== 'sqlite-ephemeral';

export function getDatabaseDiagnostics() {
  const labels: Record<DatabaseEngineType, string> = {
    turso: 'Turso Cloud SQLite (Permanent)',
    postgresql: 'External PostgreSQL (Permanent)',
    'sqlite-disk': 'Persistent Disk SQLite (Permanent)',
    'sqlite-ephemeral': 'Local Container SQLite (Temporary on Free Ephemeral Hosts)'
  };
  return {
    engine: databaseEngine,
    persistent: isPersistentDatabase,
    label: labels[databaseEngine]
  };
}

let sqliteDb: Database.Database | null = null;
let pgPool: pg.Pool | null = null;
let tursoClient: LibsqlClient | null = null;
let sqliteTxChain: Promise<void> = Promise.resolve();

if (isTurso) {
  tursoClient = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken || undefined
  });
} else if (isPostgres) {
  const isLocalPg = /localhost|127\.0\.0\.1/.test(databaseUrl);
  const disableSsl = process.env.PGSSLMODE === 'disable' || (isLocalPg && process.env.PGSSLMODE !== 'require');
  pgPool = new Pool({
    connectionString: databaseUrl,
    ssl: disableSsl ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000
  });
} else {
  const dbPath = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(sqliteStorageInfo.dir, 'ox_traders.db');

  const dbParentDir = path.dirname(dbPath);
  if (!fs.existsSync(dbParentDir)) {
    fs.mkdirSync(dbParentDir, { recursive: true });
  }

  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('synchronous = NORMAL');
  sqliteDb.pragma('busy_timeout = 5000');
  sqliteDb.pragma('foreign_keys = ON');
}

export interface DbRunner {
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  queryAll<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<{ lastInsertId: number; changes: number }>;
}

// Convert SQLite-style '?' placeholders (outside string literals) to PostgreSQL '$1, $2, ...'
function toPostgresParams(sql: string): string {
  let idx = 0;
  let inSingleQuote = false;
  let out = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      if (inSingleQuote && sql[i + 1] === "'") {
        out += "''";
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      out += ch;
    } else if (ch === '?' && !inSingleQuote) {
      idx++;
      out += `$${idx}`;
    } else {
      out += ch;
    }
  }
  return out;
}

function shouldAppendReturningId(sql: string): boolean {
  const normalized = sql.trim().toLowerCase();
  if (!normalized.startsWith('insert')) return false;
  if (normalized.includes('returning ')) return false;
  if (normalized.includes('into platform_settings')) return false;
  if (normalized.includes('into internal_system_config')) return false;
  if (normalized.includes('on conflict')) return false;
  return true;
}

function makePgRunner(client: pg.Pool | pg.PoolClient): DbRunner {
  return {
    async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
      const res = await client.query(toPostgresParams(sql), params);
      return res.rows[0] as T | undefined;
    },
    async queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      const res = await client.query(toPostgresParams(sql), params);
      return res.rows as T[];
    },
    async execute(sql: string, params: any[] = []): Promise<{ lastInsertId: number; changes: number }> {
      let pgSql = toPostgresParams(sql);
      const returning = shouldAppendReturningId(sql);
      if (returning) {
        pgSql = `${pgSql.replace(/;\s*$/, '')} RETURNING id`;
      }
      const res = await client.query(pgSql, params);
      const lastInsertId = returning && res.rows[0]?.id !== undefined ? Number(res.rows[0].id) : 0;
      return { lastInsertId, changes: res.rowCount ?? 0 };
    }
  };
}

function normalizeLibsqlParams(params: any[] = []): any[] {
  return params.map((val) => {
    if (val === undefined) return null;
    if (typeof val === 'boolean') return val ? 1 : 0;
    return val;
  });
}

function makeTursoRunner(client: LibsqlClient | LibsqlTransaction): DbRunner {
  return {
    async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
      const res = await client.execute({ sql, args: normalizeLibsqlParams(params) });
      return (res.rows[0] as unknown as T) ?? undefined;
    },
    async queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      const res = await client.execute({ sql, args: normalizeLibsqlParams(params) });
      return res.rows as unknown as T[];
    },
    async execute(sql: string, params: any[] = []): Promise<{ lastInsertId: number; changes: number }> {
      const res = await client.execute({ sql, args: normalizeLibsqlParams(params) });
      return {
        lastInsertId: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : 0,
        changes: res.rowsAffected ?? 0
      };
    }
  };
}

function makeSqliteRunner(dbInstance: Database.Database): DbRunner {
  return {
    async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
      return dbInstance.prepare(sql).get(...params) as T | undefined;
    },
    async queryAll<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      return dbInstance.prepare(sql).all(...params) as T[];
    },
    async execute(sql: string, params: any[] = []): Promise<{ lastInsertId: number; changes: number }> {
      const info = dbInstance.prepare(sql).run(...params);
      return {
        lastInsertId: Number(info.lastInsertRowid || 0),
        changes: info.changes
      };
    }
  };
}

const rootRunner: DbRunner = isTurso
  ? makeTursoRunner(tursoClient!)
  : isPostgres
    ? makePgRunner(pgPool!)
    : makeSqliteRunner(sqliteDb!);

export const dbQueryOne = <T = any>(sql: string, params: any[] = []): Promise<T | undefined> =>
  rootRunner.queryOne<T>(sql, params);

export const dbQueryAll = <T = any>(sql: string, params: any[] = []): Promise<T[]> =>
  rootRunner.queryAll<T>(sql, params);

export const dbExecute = (sql: string, params: any[] = []): Promise<{ lastInsertId: number; changes: number }> =>
  rootRunner.execute(sql, params);

export async function dbWithTransaction<T>(fn: (tx: DbRunner) => Promise<T>): Promise<T> {
  if (isTurso && tursoClient) {
    const tx = await tursoClient.transaction('write');
    try {
      const result = await fn(makeTursoRunner(tx));
      await tx.commit();
      return result;
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }
  }

  if (isPostgres && pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(makePgRunner(client));
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  // Serialize async SQLite transactions via promise chain
  const run = async () => {
    const dbInstance = sqliteDb!;
    dbInstance.exec('BEGIN IMMEDIATE');
    try {
      const result = await fn(makeSqliteRunner(dbInstance));
      dbInstance.exec('COMMIT');
      return result;
    } catch (err) {
      try {
        dbInstance.exec('ROLLBACK');
      } catch {
        // ignore rollback error if not active
      }
      throw err;
    }
  };

  const resultPromise = sqliteTxChain.then(run, run);
  sqliteTxChain = resultPromise.then(
    () => undefined,
    () => undefined
  );
  return resultPromise;
}

export async function closeDatabase() {
  try {
    if (isTurso && tursoClient) {
      tursoClient.close();
      console.log('[OX TRADERS] Turso libSQL client closed cleanly');
    } else if (isPostgres && pgPool) {
      await pgPool.end();
      console.log('[OX TRADERS] PostgreSQL pool closed cleanly');
    } else if (sqliteDb) {
      sqliteDb.pragma('wal_checkpoint(TRUNCATE)');
      sqliteDb.close();
      console.log('[OX TRADERS] SQLite database WAL checkpointed and closed cleanly');
    }
  } catch (err) {
    console.error('[OX TRADERS] Error closing database:', err);
  }
}

function getSchemaStatements(): string[] {
  const idType = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const floatType = isPostgres ? 'DOUBLE PRECISION' : 'REAL';
  const dateType = isPostgres ? 'TIMESTAMP' : 'DATETIME';

  return [
    `CREATE TABLE IF NOT EXISTS users (
      id ${idType},
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
      created_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      updated_at ${dateType} DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS wallets (
      id ${idType},
      user_id INTEGER NOT NULL,
      currency TEXT NOT NULL CHECK(currency IN ('USD', 'BTC', 'USDT')),
      balance ${floatType} DEFAULT 0.0,
      locked_balance ${floatType} DEFAULT 0.0,
      created_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      updated_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, currency),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id ${idType},
      user_id INTEGER NOT NULL,
      transaction_ref TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('deposit', 'withdrawal', 'investment_open', 'investment_return', 'investment_principal_return', 'referral_bonus', 'balance_credit', 'balance_debit', 'fee')),
      currency TEXT NOT NULL,
      amount ${floatType} NOT NULL,
      fee ${floatType} DEFAULT 0.0,
      status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
      description TEXT NOT NULL,
      related_id TEXT,
      created_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS deposits (
      id ${idType},
      user_id INTEGER NOT NULL,
      currency TEXT NOT NULL CHECK(currency IN ('BTC', 'USDT')),
      network TEXT NOT NULL,
      deposit_address TEXT NOT NULL,
      amount ${floatType} NOT NULL,
      tx_hash TEXT,
      proof_note TEXT,
      proof_image TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'verifying', 'confirmed', 'rejected')),
      admin_note TEXT,
      verified_at ${dateType},
      created_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      updated_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS withdrawals (
      id ${idType},
      user_id INTEGER NOT NULL,
      currency TEXT NOT NULL CHECK(currency IN ('BTC', 'USDT')),
      network TEXT NOT NULL,
      destination_address TEXT NOT NULL,
      amount ${floatType} NOT NULL,
      fee ${floatType} NOT NULL,
      net_amount ${floatType} NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'under_review', 'approved', 'processing', 'completed', 'rejected')),
      admin_note TEXT,
      payout_tx_hash TEXT,
      created_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      updated_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS investment_plans (
      id ${idType},
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      tagline TEXT,
      min_amount ${floatType} NOT NULL,
      max_amount ${floatType} NOT NULL,
      duration_days INTEGER NOT NULL,
      daily_roi ${floatType} NOT NULL,
      total_roi ${floatType} NOT NULL,
      risk_tier TEXT NOT NULL CHECK(risk_tier IN ('Conservative', 'Moderate', 'Aggressive', 'Institutional')),
      management_fee ${floatType} DEFAULT 0.0,
      return_method TEXT NOT NULL,
      description TEXT NOT NULL,
      capital_returned INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at ${dateType} DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS investments (
      id ${idType},
      user_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      capital_amount ${floatType} NOT NULL,
      currency TEXT DEFAULT 'USD',
      daily_return ${floatType} NOT NULL,
      total_earned ${floatType} DEFAULT 0.0,
      start_date ${dateType} DEFAULT CURRENT_TIMESTAMP,
      maturity_date ${dateType} NOT NULL,
      last_accrual_date ${dateType} DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
      created_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES investment_plans(id)
    )`,
    `CREATE TABLE IF NOT EXISTS kyc_records (
      id ${idType},
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
      reviewed_at ${dateType},
      created_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      updated_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS referrals (
      id ${idType},
      referrer_id INTEGER NOT NULL,
      referred_id INTEGER NOT NULL,
      commission_rate ${floatType} DEFAULT 5.0,
      total_commission ${floatType} DEFAULT 0.0,
      created_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id ${idType},
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info' CHECK(type IN ('success', 'warning', 'info', 'security')),
      is_read INTEGER DEFAULT 0,
      link TEXT,
      created_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS support_tickets (
      id ${idType},
      user_id INTEGER NOT NULL,
      ticket_code TEXT UNIQUE NOT NULL,
      subject TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('deposit', 'withdrawal', 'investment', 'kyc', 'security', 'general')),
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
      created_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      updated_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS support_messages (
      id ${idType},
      ticket_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL CHECK(sender_role IN ('user', 'admin')),
      sender_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at ${dateType} DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id ${idType},
      admin_id INTEGER NOT NULL,
      admin_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      created_at ${dateType} DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      description TEXT,
      updated_at ${dateType} DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS internal_system_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at ${dateType} DEFAULT CURRENT_TIMESTAMP
    )`
  ];
}

export async function getOrCreatePersistentJwtSecret(): Promise<string> {
  if (process.env.JWT_SECRET?.trim()) {
    return process.env.JWT_SECRET.trim();
  }

  try {
    const existing = await dbQueryOne<{ value: string }>(
      'SELECT value FROM internal_system_config WHERE key = ?',
      ['jwt_signing_secret']
    );
    if (existing?.value) {
      return existing.value;
    }

    const generated = crypto.randomBytes(32).toString('hex');
    await dbExecute(
      'INSERT INTO internal_system_config (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING',
      ['jwt_signing_secret', generated]
    );
    const stored = await dbQueryOne<{ value: string }>(
      'SELECT value FROM internal_system_config WHERE key = ?',
      ['jwt_signing_secret']
    );
    return stored?.value || generated;
  } catch {
    return crypto.randomBytes(32).toString('hex');
  }
}

export async function initDatabase() {
  const statements = getSchemaStatements();
  for (const stmt of statements) {
    if (isTurso && tursoClient) {
      await tursoClient.execute(stmt);
    } else if (isPostgres && pgPool) {
      await pgPool.query(stmt);
    } else if (sqliteDb) {
      sqliteDb.exec(stmt);
    }
  }

  // Safe additive migration for deposits.updated_at on older SQLite/Turso tables
  if (isTurso && tursoClient) {
    try {
      const info = await tursoClient.execute('PRAGMA table_info(deposits)');
      const hasUpdatedAt = info.rows.some((r: any) => String(r.name) === 'updated_at');
      if (!hasUpdatedAt) {
        await tursoClient.execute('ALTER TABLE deposits ADD COLUMN updated_at DATETIME');
      }
    } catch {
      // ignore if already present
    }
  } else if (!isPostgres && sqliteDb) {
    try {
      const cols = sqliteDb.prepare('PRAGMA table_info(deposits)').all() as Array<{ name: string }>;
      if (!cols.some((c) => c.name === 'updated_at')) {
        sqliteDb.exec('ALTER TABLE deposits ADD COLUMN updated_at DATETIME');
      }
    } catch {
      // ignore if already present
    }
  } else if (isPostgres && pgPool) {
    await pgPool.query('ALTER TABLE deposits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP').catch(() => {});
  }

  await seedInitialData();
  const diag = getDatabaseDiagnostics();
  console.log(`[OX TRADERS] Database engine initialized (${diag.label})`);
}

async function seedInitialData() {
  // 1. Seed Platform Settings
  const settingsCountRow = await dbQueryOne<{ count: string | number }>('SELECT count(*) as count FROM platform_settings');
  if (Number(settingsCountRow?.count || 0) === 0) {
    const defaultSettings = [
      ['company_name', 'OX TRADERS', 'branding', 'Company trade name'],
      ['support_email', 'support@oxtraders.online', 'contact', 'Customer support email'],
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

    for (const [key, value, cat, desc] of defaultSettings) {
      await dbExecute(
        'INSERT INTO platform_settings (key, value, category, description) VALUES (?, ?, ?, ?) ON CONFLICT (key) DO NOTHING',
        [key, value, cat, desc]
      );
    }
  }

  // 2. Seed Default Admin Account
  const adminExists = await dbQueryOne('SELECT id FROM users WHERE email = ?', ['admin@oxtraders.com']);
  if (!adminExists) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('AdminOxTraders2026!', salt);
    const adminRes = await dbExecute(
      `INSERT INTO users (email, password_hash, full_name, phone, country, role, is_verified, referral_code)
       VALUES (?, ?, ?, ?, ?, 'admin', 1, ?)`,
      ['admin@oxtraders.com', hash, 'OX TRADERS Master Admin', '+1 800 698 7233', 'United Kingdom', 'OX-ADMIN-01']
    );

    const adminId = adminRes.lastInsertId;
    if (adminId) {
      await dbExecute('INSERT INTO wallets (user_id, currency, balance) VALUES (?, ?, ?) ON CONFLICT (user_id, currency) DO NOTHING', [adminId, 'USD', 250000.0]);
      await dbExecute('INSERT INTO wallets (user_id, currency, balance) VALUES (?, ?, ?) ON CONFLICT (user_id, currency) DO NOTHING', [adminId, 'BTC', 5.0]);
      await dbExecute('INSERT INTO wallets (user_id, currency, balance) VALUES (?, ?, ?) ON CONFLICT (user_id, currency) DO NOTHING', [adminId, 'USDT', 50000.0]);
    }
  }

  // 3. Seed Demo Investor Account
  const investorExists = await dbQueryOne<{ id: number }>('SELECT id FROM users WHERE email = ?', ['investor@oxtraders.com']);
  let investorId = 0;
  if (!investorExists) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('Investor2026!', salt);
    const investorRes = await dbExecute(
      `INSERT INTO users (email, password_hash, full_name, phone, country, role, is_verified, referral_code)
       VALUES (?, ?, ?, ?, ?, 'user', 1, ?)`,
      ['investor@oxtraders.com', hash, 'Alexander Vance', '+1 415 555 0192', 'Switzerland', 'OX-ALEX-99']
    );

    investorId = investorRes.lastInsertId;
    if (investorId) {
      await dbExecute('INSERT INTO wallets (user_id, currency, balance) VALUES (?, ?, ?) ON CONFLICT (user_id, currency) DO NOTHING', [investorId, 'USD', 12500.0]);
      await dbExecute('INSERT INTO wallets (user_id, currency, balance) VALUES (?, ?, ?) ON CONFLICT (user_id, currency) DO NOTHING', [investorId, 'BTC', 0.285]);
      await dbExecute('INSERT INTO wallets (user_id, currency, balance) VALUES (?, ?, ?) ON CONFLICT (user_id, currency) DO NOTHING', [investorId, 'USDT', 3450.0]);

      const nowIso = new Date().toISOString();
      await dbExecute(
        `INSERT INTO kyc_records (user_id, full_legal_name, date_of_birth, residential_address, city, country, postal_code, id_type, id_number, status, admin_note, reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', 'Identity verified via official passport authentication', ?)`,
        [investorId, 'Alexander Vance', '1988-04-12', 'Bahnhofstrasse 42', 'Zurich', 'Switzerland', '8001', 'passport', 'CH89421098X', nowIso]
      );

      await dbExecute(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, 'Welcome to OX TRADERS', 'Your institutional-grade investor account has been successfully initialized and verified.', 'success')`,
        [investorId]
      );

      await dbExecute(
        `INSERT INTO transactions (user_id, transaction_ref, type, currency, amount, fee, status, description)
         VALUES (?, 'TXN-DEP-INIT-01', 'deposit', 'USDT', 3450.0, 0, 'completed', 'Verified USDT TRC20 Deposit via Blockchain')`,
        [investorId]
      );
    }
  }

  // 4. Seed Investment Plans
  const plansCountRow = await dbQueryOne<{ count: string | number }>('SELECT count(*) as count FROM investment_plans');
  if (Number(plansCountRow?.count || 0) === 0) {
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

    for (const p of plans) {
      await dbExecute(
        `INSERT INTO investment_plans (name, slug, tagline, min_amount, max_amount, duration_days, daily_roi, total_roi, risk_tier, management_fee, return_method, description, capital_returned)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (slug) DO NOTHING`,
        [
          p.name,
          p.slug,
          p.tagline,
          p.min_amount,
          p.max_amount,
          p.duration_days,
          p.daily_roi,
          p.total_roi,
          p.risk_tier,
          p.management_fee,
          p.return_method,
          p.description,
          p.capital_returned
        ]
      );
    }
  }

  if (investorId) {
    const existingInv = await dbQueryOne('SELECT id FROM investments WHERE user_id = ?', [investorId]);
    if (!existingInv) {
      const plan1 = await dbQueryOne<{ id: number }>('SELECT id FROM investment_plans WHERE slug = ?', ['ox-premier-yield']);
      if (plan1) {
        const startIso = new Date(Date.now() - 4 * 86400000).toISOString();
        const maturityIso = new Date(Date.now() + 26 * 86400000).toISOString();
        await dbExecute(
          `INSERT INTO investments (user_id, plan_id, capital_amount, currency, daily_return, total_earned, start_date, maturity_date, status)
           VALUES (?, ?, 5000.0, 'USD', 92.5, 370.0, ?, ?, 'active')`,
          [investorId, plan1.id, startIso, maturityIso]
        );
      }
    }
  }
}
