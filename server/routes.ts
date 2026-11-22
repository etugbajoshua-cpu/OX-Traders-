import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  dbQueryOne,
  dbQueryAll,
  dbExecute,
  dbWithTransaction,
  getDatabaseDiagnostics,
  getOrCreatePersistentJwtSecret
} from './db.ts';
import { ledgerService } from './ledger.ts';
import { verifyBlockchainTransaction } from './blockchain.ts';

const router = express.Router();
let JWT_SECRET = process.env.JWT_SECRET?.trim() || crypto.randomBytes(32).toString('hex');

export async function initAuthSecret() {
  JWT_SECRET = await getOrCreatePersistentJwtSecret();
}

// Middleware to authenticate investor/user session
export interface AuthUser {
  id: number;
  email: string;
  role: 'user' | 'admin';
  full_name: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token =
    req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

// Middleware to authenticate administrator
export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token =
    req.cookies?.admin_token ||
    req.cookies?.token ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
  if (!token) {
    return res.status(401).json({ error: 'Administrator access required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    (req as any).admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired admin session token' });
  }
}

/* ==========================================================================
   AUTHENTICATION ROUTES
   ========================================================================== */

router.post('/auth/register', async (req, res) => {
  try {
    const { full_name, email, phone, country, password, password_confirmation, referral_code } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }

    if (password !== password_confirmation) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const existing = await dbQueryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists' });
    }

    const userRefCode = 'OX-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    let referrerId: number | null = null;
    if (referral_code) {
      const refUser = await dbQueryOne<{ id: number }>(
        'SELECT id FROM users WHERE referral_code = ?',
        [String(referral_code).trim()]
      );
      if (refUser) {
        referrerId = Number(refUser.id);
      }
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const result = await dbExecute(
      `INSERT INTO users (full_name, email, phone, country, password_hash, referral_code, referred_by, role, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'user', 0)`,
      [String(full_name).trim(), cleanEmail, phone || '', country || '', hash, userRefCode, referral_code || null]
    );

    const userId = result.lastInsertId;

    // Initialize wallets
    await ledgerService.ensureWallets(userId);

    // Register referral attribution
    if (referrerId) {
      await dbExecute(
        `INSERT INTO referrals (referrer_id, referred_id, commission_rate)
         VALUES (?, ?, 5.0)`,
        [referrerId, userId]
      );

      await dbExecute(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, 'New Referral Registered', ?, 'info')`,
        [referrerId, `A new investor has registered using your referral code (${userRefCode}).`]
      );
    }

    await dbExecute(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, 'Welcome to OX TRADERS', 'Your secure crypto trading and investment account is active. Complete KYC verification to unlock higher withdrawal limits.', 'success')`,
      [userId]
    );

    const token = jwt.sign(
      { id: userId, email: cleanEmail, role: 'user', full_name: String(full_name).trim() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 3600 * 1000 });
    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: userId,
        email: cleanEmail,
        full_name: String(full_name).trim(),
        role: 'user',
        referral_code: userRefCode,
        is_verified: 0
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await dbQueryOne<any>('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact OX TRADERS compliance support.' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: Number(user.id), email: user.email, role: user.role, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 7 * 24 * 3600 * 1000 });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: Number(user.id),
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        referral_code: user.referral_code,
        is_verified: user.is_verified,
        status: user.status
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: error.message || 'Login failed' });
  }
});

router.post('/auth/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' });
  res.clearCookie('admin_token', { path: '/' });
  return res.json({ message: 'Logged out successfully' });
});

router.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const user = await dbQueryOne<any>(
      'SELECT id, email, full_name, phone, country, role, is_verified, two_factor_enabled, referral_code, status, created_at FROM users WHERE id = ?',
      [authUser.id]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const balances = await ledgerService.getBalances(Number(user.id));
    const kyc = await dbQueryOne<any>('SELECT status FROM kyc_records WHERE user_id = ?', [user.id]);

    return res.json({
      user,
      balances,
      kyc_status: kyc ? kyc.status : 'not_submitted'
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch user profile' });
  }
});

router.post('/auth/verify-email', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    await dbExecute('UPDATE users SET is_verified = 1 WHERE id = ?', [authUser.id]);
    return res.json({ success: true, message: 'Email address verified successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/auth/toggle-2fa', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const current = await dbQueryOne<any>('SELECT two_factor_enabled FROM users WHERE id = ?', [authUser.id]);
    const newStatus = current?.two_factor_enabled ? 0 : 1;
    await dbExecute('UPDATE users SET two_factor_enabled = ? WHERE id = ?', [newStatus, authUser.id]);
    return res.json({ success: true, two_factor_enabled: newStatus });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const { current_password, new_password } = req.body;

    const user = await dbQueryOne<any>('SELECT password_hash FROM users WHERE id = ?', [authUser.id]);
    if (!user || !bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    if (!new_password || String(new_password).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(new_password, salt);
    await dbExecute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, authUser.id]);

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   INVESTOR DASHBOARD & FINANCIALS
   ========================================================================== */

router.get('/user/summary', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const userId = authUser.id;

    const balances = await ledgerService.getBalances(userId);

    const activeInvestments = await dbQueryOne<any>(
      `SELECT COALESCE(SUM(capital_amount), 0) as total_invested,
              COALESCE(SUM(total_earned), 0) as total_profit,
              COUNT(*) as active_count
       FROM investments
       WHERE user_id = ? AND status = 'active'`,
      [userId]
    );

    const depositsTotal = await dbQueryOne<any>(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM deposits
       WHERE user_id = ? AND status = 'confirmed'`,
      [userId]
    );

    const pendingDeposits = await dbQueryOne<any>(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM deposits
       WHERE user_id = ? AND status IN ('pending', 'verifying')`,
      [userId]
    );

    const withdrawalsTotal = await dbQueryOne<any>(
      `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
       FROM withdrawals
       WHERE user_id = ? AND status = 'completed'`,
      [userId]
    );

    const pendingWithdrawals = await dbQueryOne<any>(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM withdrawals
       WHERE user_id = ? AND status IN ('pending', 'under_review', 'approved', 'processing')`,
      [userId]
    );

    const recentTx = await dbQueryAll(
      `SELECT * FROM transactions
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 10`,
      [userId]
    );

    const usdVal = balances.USD?.available || 0;
    const btcVal = (balances.BTC?.total || 0) * 91500;
    const usdtVal = balances.USDT?.total || 0;
    const investedVal = Number(activeInvestments?.total_invested || 0);
    const totalPortfolioUSD = Number((usdVal + btcVal + usdtVal + investedVal).toFixed(2));

    const chartHistory = [
      { date: 'Day -6', balance: totalPortfolioUSD * 0.94 },
      { date: 'Day -5', balance: totalPortfolioUSD * 0.955 },
      { date: 'Day -4', balance: totalPortfolioUSD * 0.968 },
      { date: 'Day -3', balance: totalPortfolioUSD * 0.975 },
      { date: 'Day -2', balance: totalPortfolioUSD * 0.988 },
      { date: 'Yesterday', balance: totalPortfolioUSD * 0.994 },
      { date: 'Today', balance: totalPortfolioUSD }
    ];

    return res.json({
      balances,
      total_portfolio_usd: totalPortfolioUSD,
      active_investments: {
        total_invested: Number(activeInvestments?.total_invested || 0),
        total_profit: Number(activeInvestments?.total_profit || 0),
        count: Number(activeInvestments?.active_count || 0)
      },
      deposits: {
        total_completed: Number(depositsTotal?.total || 0),
        completed_count: Number(depositsTotal?.count || 0),
        pending_total: Number(pendingDeposits?.total || 0),
        pending_count: Number(pendingDeposits?.count || 0)
      },
      withdrawals: {
        total_completed: Number(withdrawalsTotal?.total || 0),
        completed_count: Number(withdrawalsTotal?.count || 0),
        pending_total: Number(pendingWithdrawals?.total || 0),
        pending_count: Number(pendingWithdrawals?.count || 0)
      },
      recent_transactions: recentTx,
      performance_chart: chartHistory
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/user/transactions', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const { type, currency, limit = 50 } = req.query;

    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    const params: any[] = [authUser.id];

    if (type) {
      query += ' AND type = ?';
      params.push(String(type));
    }
    if (currency) {
      query += ' AND currency = ?';
      params.push(String(currency));
    }

    query += ' ORDER BY id DESC LIMIT ?';
    params.push(Math.min(Number(limit) || 50, 250));

    const transactions = await dbQueryAll(query, params);
    return res.json({ transactions });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   DEPOSITS SYSTEM
   ========================================================================== */

router.get('/deposits/config', async (_req, res) => {
  try {
    const settings = await dbQueryAll<any>('SELECT key, value FROM platform_settings');
    const map: Record<string, string> = {};
    for (const cur of settings) {
      map[cur.key] = cur.value;
    }

    return res.json({
      supported_currencies: [
        {
          symbol: 'BTC',
          name: 'Bitcoin',
          network: 'Bitcoin',
          deposit_address: map.btc_deposit_address || 'bc1qg2a2gdxtccsxu83xy0jvezenutzyvmv4jl0uz4',
          min_deposit: parseFloat(map.btc_min_deposit || '0.001'),
          confirmations_required: 3,
          warning: 'Send ONLY Bitcoin (BTC) via the native Bitcoin network to this address. Sending any other asset or using wrong networks will cause irreversible loss.'
        },
        {
          symbol: 'USDT',
          name: 'Tether USD',
          network: 'TRON TRC20',
          deposit_address: map.usdt_deposit_address || 'TB4Uq6VQMFMbDZUq3xK4jM8mqz6rb2TqGf',
          min_deposit: parseFloat(map.usdt_min_deposit || '50.0'),
          confirmations_required: 19,
          warning: 'Send ONLY Tether (USDT) on the TRON (TRC20) network to this address. Do not send ERC20, BEP20, or Solana USDT.'
        }
      ]
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/deposits/submit', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const { currency, amount, tx_hash, proof_note, proof_image } = req.body;

    if (!['BTC', 'USDT'].includes(currency)) {
      return res.status(400).json({ error: 'Deposit currency must be BTC or USDT' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid deposit amount is required' });
    }

    if (!tx_hash || String(tx_hash).trim().length < 10) {
      return res.status(400).json({ error: 'Valid blockchain transaction hash (TxID) is required' });
    }

    const cleanTx = String(tx_hash).trim();

    const existing = await dbQueryOne<any>('SELECT id, status FROM deposits WHERE tx_hash = ?', [cleanTx]);
    if (existing) {
      if (existing.status === 'confirmed') {
        return res.status(400).json({ error: 'This transaction hash has already been credited to an account.' });
      }
      return res.status(400).json({ error: 'This transaction hash is already registered and undergoing verification.' });
    }

    const settingKey = currency === 'BTC' ? 'btc_deposit_address' : 'usdt_deposit_address';
    const addressSetting = await dbQueryOne<any>('SELECT value FROM platform_settings WHERE key = ?', [settingKey]);
    const depositAddress =
      addressSetting?.value ||
      (currency === 'BTC' ? 'bc1qg2a2gdxtccsxu83xy0jvezenutzyvmv4jl0uz4' : 'TB4Uq6VQMFMbDZUq3xK4jM8mqz6rb2TqGf');
    const network = currency === 'BTC' ? 'Bitcoin' : 'TRON TRC20';

    const verification = await verifyBlockchainTransaction(currency, cleanTx, numAmount);
    const finalStatus: 'confirmed' | 'verifying' | 'pending' | 'rejected' = verification.status;

    const depInsert = await dbExecute(
      `INSERT INTO deposits (user_id, currency, network, deposit_address, amount, tx_hash, proof_note, proof_image, status, admin_note, verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        authUser.id,
        currency,
        network,
        depositAddress,
        numAmount,
        cleanTx,
        proof_note || null,
        proof_image || null,
        finalStatus,
        verification.networkMessage,
        finalStatus === 'confirmed' ? new Date().toISOString() : null
      ]
    );

    const depositId = depInsert.lastInsertId;

    if (finalStatus === 'confirmed') {
      await ledgerService.creditWallet({
        userId: authUser.id,
        currency,
        amount: numAmount,
        type: 'deposit',
        description: `Verified ${currency} deposit via blockchain [TX: ${cleanTx.substring(0, 10)}...]`,
        relatedId: String(depositId)
      });

      await dbExecute(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, 'Deposit Confirmed & Credited', ?, 'success')`,
        [authUser.id, `Your deposit of ${numAmount} ${currency} has been verified on the blockchain and credited to your wallet.`]
      );
    } else {
      await dbExecute(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, 'Deposit Submitted For Verification', ?, 'info')`,
        [authUser.id, `Deposit of ${numAmount} ${currency} received. Blockchain status: ${verification.networkMessage}`]
      );
    }

    return res.status(201).json({
      message:
        finalStatus === 'confirmed'
          ? 'Deposit verified and credited immediately!'
          : 'Deposit submitted for blockchain verification and administrative sign-off.',
      deposit_id: depositId,
      status: finalStatus,
      verification
    });
  } catch (error: any) {
    console.error('Deposit error:', error);
    return res.status(500).json({ error: error.message || 'Deposit submission failed' });
  }
});

router.get('/deposits/history', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const deposits = await dbQueryAll('SELECT * FROM deposits WHERE user_id = ? ORDER BY id DESC', [authUser.id]);
    return res.json({ deposits });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   WITHDRAWAL SYSTEM
   ========================================================================== */

router.post('/withdrawals/submit', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const { currency, destination_address, amount } = req.body;

    if (!['BTC', 'USDT'].includes(currency)) {
      return res.status(400).json({ error: 'Withdrawal currency must be BTC or USDT' });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid withdrawal amount is required' });
    }

    if (!destination_address || String(destination_address).trim().length < 15) {
      return res.status(400).json({ error: 'Please enter a valid destination wallet address' });
    }

    const cleanDest = String(destination_address).trim();

    if (currency === 'USDT' && !cleanDest.startsWith('T')) {
      return res.status(400).json({ error: 'Invalid TRON address. USDT (TRC20) addresses must start with "T".' });
    }

    const minKey = currency === 'BTC' ? 'btc_min_withdrawal' : 'usdt_min_withdrawal';
    const feeKey = currency === 'BTC' ? 'btc_withdrawal_fee' : 'usdt_withdrawal_fee';

    const minSetting = await dbQueryOne<any>('SELECT value FROM platform_settings WHERE key = ?', [minKey]);
    const feeSetting = await dbQueryOne<any>('SELECT value FROM platform_settings WHERE key = ?', [feeKey]);

    const minAmount = parseFloat(minSetting?.value || (currency === 'BTC' ? '0.002' : '25.0'));
    const fee = parseFloat(feeSetting?.value || (currency === 'BTC' ? '0.00035' : '1.50'));

    if (numAmount < minAmount) {
      return res.status(400).json({ error: `Minimum withdrawal amount for ${currency} is ${minAmount} ${currency}` });
    }

    const kycSetting = await dbQueryOne<any>('SELECT value FROM platform_settings WHERE key = ?', ['kyc_mandatory_for_withdrawal']);
    if (kycSetting?.value === 'true') {
      const kyc = await dbQueryOne<any>('SELECT status FROM kyc_records WHERE user_id = ?', [authUser.id]);
      if (!kyc || kyc.status !== 'verified') {
        return res.status(403).json({
          error: 'KYC identity verification is required before requesting withdrawals. Please complete KYC in your dashboard.'
        });
      }
    }

    const result = await ledgerService.requestWithdrawal({
      userId: authUser.id,
      currency,
      network: currency === 'BTC' ? 'Bitcoin' : 'TRON TRC20',
      destinationAddress: cleanDest,
      amount: numAmount,
      fee
    });

    await dbExecute(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, 'Withdrawal Request Submitted', ?, 'info')`,
      [authUser.id, `Withdrawal of ${numAmount} ${currency} to ${cleanDest.substring(0, 8)}... has been submitted and is under compliance review.`]
    );

    return res.status(201).json({
      message: 'Withdrawal request created successfully and awaiting approval',
      withdrawal_id: result.withdrawalId,
      tx_ref: result.txRef,
      net_amount: result.netAmount,
      fee
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/withdrawals/history', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const withdrawals = await dbQueryAll('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY id DESC', [authUser.id]);
    return res.json({ withdrawals });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   INVESTMENT MANAGEMENT
   ========================================================================== */

router.get('/investments/plans', async (_req, res) => {
  try {
    const plans = await dbQueryAll('SELECT * FROM investment_plans WHERE is_active = 1 ORDER BY min_amount ASC');
    return res.json({ plans });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/investments/create', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const { plan_id, amount, currency = 'USD' } = req.body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Valid investment amount is required' });
    }

    const numericPlanId = Number(plan_id);
    if (!Number.isFinite(numericPlanId)) {
      return res.status(400).json({ error: 'Valid investment plan is required' });
    }

    const plan = await dbQueryOne<any>('SELECT * FROM investment_plans WHERE id = ? AND is_active = 1', [numericPlanId]);
    if (!plan) {
      return res.status(404).json({ error: 'Investment plan not found or currently inactive' });
    }

    if (numAmount < Number(plan.min_amount)) {
      return res.status(400).json({ error: `Minimum allocation for ${plan.name} is $${Number(plan.min_amount).toLocaleString()}` });
    }

    if (numAmount > Number(plan.max_amount)) {
      return res.status(400).json({ error: `Maximum allocation for ${plan.name} is $${Number(plan.max_amount).toLocaleString()}` });
    }

    await ledgerService.debitWallet({
      userId: authUser.id,
      currency,
      amount: numAmount,
      type: 'investment_open',
      description: `Allocated $${numAmount.toLocaleString()} to ${plan.name} (${plan.duration_days} Days @ ${plan.daily_roi}% Daily)`
    });

    const dailyPayout = Number(((numAmount * Number(plan.daily_roi)) / 100).toFixed(2));
    const totalExpectedReturn = Number((dailyPayout * Number(plan.duration_days)).toFixed(2));

    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + Number(plan.duration_days));

    const result = await dbExecute(
      `INSERT INTO investments (user_id, plan_id, capital_amount, currency, daily_return, total_earned, maturity_date, status)
       VALUES (?, ?, ?, ?, ?, 0.0, ?, 'active')`,
      [authUser.id, plan.id, numAmount, currency, dailyPayout, maturityDate.toISOString()]
    );

    const investmentId = result.lastInsertId;

    const user = await dbQueryOne<any>('SELECT referred_by FROM users WHERE id = ?', [authUser.id]);
    if (user && user.referred_by) {
      const referrer = await dbQueryOne<any>('SELECT id FROM users WHERE referral_code = ?', [user.referred_by]);
      if (referrer) {
        const refSetting = await dbQueryOne<any>('SELECT value FROM platform_settings WHERE key = ?', ['referral_commission_percent']);
        const refRate = parseFloat(refSetting?.value || '5.0');
        const bonusAmount = Number(((numAmount * refRate) / 100).toFixed(2));

        if (bonusAmount > 0) {
          await ledgerService.creditWallet({
            userId: Number(referrer.id),
            currency: 'USD',
            amount: bonusAmount,
            type: 'referral_bonus',
            description: `Referral commission (${refRate}%) on ${plan.name} allocation from downline`,
            relatedId: String(investmentId)
          });

          await dbExecute(
            `UPDATE referrals
             SET total_commission = total_commission + ?
             WHERE referrer_id = ? AND referred_id = ?`,
            [bonusAmount, referrer.id, authUser.id]
          );

          await dbExecute(
            `INSERT INTO notifications (user_id, title, message, type)
             VALUES (?, 'Referral Commission Earned', ?, 'success')`,
            [referrer.id, `You earned a $${bonusAmount} referral commission on an investment made by your referral.`]
          );
        }
      }
    }

    await dbExecute(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, 'Investment Position Opened', ?, 'success')`,
      [authUser.id, `Successfully subscribed to ${plan.name} with $${numAmount.toLocaleString()} capital. Daily accrual: $${dailyPayout}.`]
    );

    return res.status(201).json({
      message: 'Investment strategy successfully initialized',
      investment_id: investmentId,
      plan_name: plan.name,
      capital: numAmount,
      daily_return: dailyPayout,
      total_expected_return: totalExpectedReturn,
      maturity_date: maturityDate.toISOString()
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/investments/my-positions', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const positions = await dbQueryAll(
      `SELECT i.*, p.name as plan_name, p.duration_days, p.risk_tier, p.daily_roi
       FROM investments i
       JOIN investment_plans p ON i.plan_id = p.id
       WHERE i.user_id = ?
       ORDER BY i.id DESC`,
      [authUser.id]
    );

    return res.json({ positions });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   KYC VERIFICATION
   ========================================================================== */

router.get('/kyc/status', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const kyc = await dbQueryOne(
      'SELECT id, full_legal_name, date_of_birth, residential_address, city, country, postal_code, id_type, id_number, status, admin_note, reviewed_at, created_at FROM kyc_records WHERE user_id = ?',
      [authUser.id]
    );

    return res.json({ kyc: kyc || { status: 'not_submitted' } });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/kyc/submit', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const {
      full_legal_name,
      date_of_birth,
      residential_address,
      city,
      country,
      postal_code,
      id_type,
      id_number,
      id_expiry,
      id_front_path,
      id_back_path,
      address_proof_path,
      selfie_path
    } = req.body;

    if (!full_legal_name || !date_of_birth || !residential_address || !id_type || !id_number) {
      return res.status(400).json({ error: 'Please complete all required identity fields' });
    }

    const existing = await dbQueryOne<any>('SELECT id, status FROM kyc_records WHERE user_id = ?', [authUser.id]);

    if (existing) {
      if (existing.status === 'verified') {
        return res.status(400).json({ error: 'Your account is already verified' });
      }

      await dbExecute(
        `UPDATE kyc_records
         SET full_legal_name = ?, date_of_birth = ?, residential_address = ?, city = ?, country = ?, postal_code = ?,
             id_type = ?, id_number = ?, id_expiry = ?, id_front_path = COALESCE(?, id_front_path),
             id_back_path = COALESCE(?, id_back_path), address_proof_path = COALESCE(?, address_proof_path),
             selfie_path = COALESCE(?, selfie_path), status = 'pending', updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [
          full_legal_name,
          date_of_birth,
          residential_address,
          city || '',
          country,
          postal_code || '',
          id_type,
          id_number,
          id_expiry || null,
          id_front_path || null,
          id_back_path || null,
          address_proof_path || null,
          selfie_path || null,
          authUser.id
        ]
      );
    } else {
      await dbExecute(
        `INSERT INTO kyc_records (
           user_id, full_legal_name, date_of_birth, residential_address, city, country, postal_code,
           id_type, id_number, id_expiry, id_front_path, id_back_path, address_proof_path, selfie_path, status
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          authUser.id,
          full_legal_name,
          date_of_birth,
          residential_address,
          city || '',
          country,
          postal_code || '',
          id_type,
          id_number,
          id_expiry || null,
          id_front_path || null,
          id_back_path || null,
          address_proof_path || null,
          selfie_path || null
        ]
      );
    }

    await dbExecute(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, 'KYC Application Submitted', 'Your identity documents have been submitted to the compliance desk for review.', 'info')`,
      [authUser.id]
    );

    return res.status(200).json({ success: true, message: 'KYC documents submitted successfully. Verification takes 1–12 hours.' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   REFERRAL SYSTEM
   ========================================================================== */

router.get('/referrals/stats', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const user = await dbQueryOne<any>('SELECT referral_code FROM users WHERE id = ?', [authUser.id]);

    const referrals = await dbQueryAll<any>(
      `SELECT r.created_at, r.total_commission, u.full_name, u.email, u.created_at as joined_at,
              (SELECT COUNT(*) FROM investments WHERE user_id = u.id AND status = 'active') as active_investments
       FROM referrals r
       JOIN users u ON r.referred_id = u.id
       WHERE r.referrer_id = ?
       ORDER BY r.id DESC`,
      [authUser.id]
    );

    const normalizedReferrals = referrals.map((r) => ({
      ...r,
      total_commission: Number(r.total_commission || 0),
      active_investments: Number(r.active_investments || 0)
    }));

    const totalCommissions = normalizedReferrals.reduce((sum, r) => sum + r.total_commission, 0);
    const activeReferred = normalizedReferrals.filter((r) => r.active_investments > 0).length;

    const refSetting = await dbQueryOne<any>('SELECT value FROM platform_settings WHERE key = ?', ['referral_commission_percent']);

    return res.json({
      referral_code: user?.referral_code || '',
      commission_rate_percent: parseFloat(refSetting?.value || '5.0'),
      total_referred: normalizedReferrals.length,
      active_referred: activeReferred,
      total_commission_usd: totalCommissions,
      referral_list: normalizedReferrals
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   CUSTOMER SUPPORT
   ========================================================================== */

router.get('/support/tickets', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const tickets = await dbQueryAll(
      `SELECT t.*,
              (SELECT count(*) FROM support_messages WHERE ticket_id = t.id) as message_count,
              (SELECT created_at FROM support_messages WHERE ticket_id = t.id ORDER BY id DESC LIMIT 1) as last_reply_at
       FROM support_tickets t
       WHERE t.user_id = ?
       ORDER BY t.id DESC`,
      [authUser.id]
    );

    return res.json({ tickets });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/support/tickets', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const { subject, category, priority = 'normal', message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and initial message are required' });
    }

    const ticketCode = 'TICK-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const insertTicket = await dbExecute(
      `INSERT INTO support_tickets (user_id, ticket_code, subject, category, priority, status)
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [authUser.id, ticketCode, String(subject).trim(), category || 'general', priority]
    );

    const ticketId = insertTicket.lastInsertId;

    await dbExecute(
      `INSERT INTO support_messages (ticket_id, sender_role, sender_name, message)
       VALUES (?, 'user', ?, ?)`,
      [ticketId, authUser.full_name, String(message).trim()]
    );

    return res.status(201).json({
      message: 'Support ticket opened successfully',
      ticket_code: ticketCode,
      ticket_id: ticketId
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/support/tickets/:id', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const ticketId = Number(req.params.id);
    if (!Number.isFinite(ticketId)) return res.status(400).json({ error: 'Invalid ticket ID' });

    const ticket = await dbQueryOne('SELECT * FROM support_tickets WHERE id = ? AND user_id = ?', [ticketId, authUser.id]);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const messages = await dbQueryAll('SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY id ASC', [ticketId]);

    return res.json({ ticket, messages });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/support/tickets/:id/reply', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const ticketId = Number(req.params.id);
    if (!Number.isFinite(ticketId)) return res.status(400).json({ error: 'Invalid ticket ID' });
    const { message } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const ticket = await dbQueryOne('SELECT id FROM support_tickets WHERE id = ? AND user_id = ?', [ticketId, authUser.id]);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    await dbExecute(
      `INSERT INTO support_messages (ticket_id, sender_role, sender_name, message)
       VALUES (?, 'user', ?, ?)`,
      [ticketId, authUser.full_name, String(message).trim()]
    );

    await dbExecute(`UPDATE support_tickets SET status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [ticketId]);

    return res.json({ success: true, message: 'Message sent to support agents' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   NOTIFICATIONS
   ========================================================================== */

router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const notifications = await dbQueryAll(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
      [authUser.id]
    );

    const unreadRow = await dbQueryOne<{ count: string | number }>(
      `SELECT count(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [authUser.id]
    );

    return res.json({ notifications, unread_count: Number(unreadRow?.count || 0) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    const notifId = Number(req.params.id);
    if (!Number.isFinite(notifId)) return res.status(400).json({ error: 'Invalid notification ID' });

    await dbExecute('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [notifId, authUser.id]);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    const authUser = (req as any).user as AuthUser;
    await dbExecute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [authUser.id]);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   LIVE CRYPTOCURRENCY MARKET DATA
   ========================================================================== */

let cachedMarkets: any = null;
let lastMarketFetch = 0;

router.get('/markets/live', async (_req, res) => {
  try {
    const now = Date.now();
    if (cachedMarkets && now - lastMarketFetch < 30000) {
      return res.json(cachedMarkets);
    }

    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,tether,solana,binancecoin,ripple,cardano,avalanche-2,dogecoin,chainlink&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h',
        { headers: { Accept: 'application/json' } }
      );

      if (response.ok) {
        const data = await response.json();
        cachedMarkets = {
          source: 'coingecko_live',
          updated_at: new Date().toISOString(),
          coins: data.map((c: any) => ({
            id: c.id,
            symbol: c.symbol.toUpperCase(),
            name: c.name,
            current_price: c.current_price,
            price_change_percentage_24h: c.price_change_percentage_24h,
            high_24h: c.high_24h,
            low_24h: c.low_24h,
            total_volume: c.total_volume,
            market_cap: c.market_cap,
            sparkline_in_7d: c.sparkline_in_7d?.price || []
          }))
        };
        lastMarketFetch = now;
        return res.json(cachedMarkets);
      }
    } catch {
      // Fall through to fallback
    }

    const fallback = {
      source: 'ox_liquidity_aggregator',
      updated_at: new Date().toISOString(),
      coins: [
        { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', current_price: 91420.5, price_change_percentage_24h: 3.42, high_24h: 92100.0, low_24h: 88750.0, total_volume: 38400000000, market_cap: 1805000000000, sparkline_in_7d: [88000, 89200, 88700, 90100, 91200, 90800, 91420] },
        { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', current_price: 3340.2, price_change_percentage_24h: 2.15, high_24h: 3390.0, low_24h: 3220.0, total_volume: 18200000000, market_cap: 402000000000, sparkline_in_7d: [3180, 3240, 3210, 3290, 3310, 3330, 3340] },
        { id: 'tether', symbol: 'USDT', name: 'Tether', current_price: 1.0002, price_change_percentage_24h: 0.01, high_24h: 1.001, low_24h: 0.9998, total_volume: 45000000000, market_cap: 128000000000, sparkline_in_7d: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0] },
        { id: 'solana', symbol: 'SOL', name: 'Solana', current_price: 215.8, price_change_percentage_24h: 5.82, high_24h: 221.0, low_24h: 201.5, total_volume: 9100000000, market_cap: 102000000000, sparkline_in_7d: [195, 202, 199, 208, 212, 210, 215] },
        { id: 'binancecoin', symbol: 'BNB', name: 'BNB', current_price: 642.1, price_change_percentage_24h: 1.45, high_24h: 648.0, low_24h: 630.0, total_volume: 2100000000, market_cap: 93000000000, sparkline_in_7d: [628, 632, 630, 635, 639, 640, 642] },
        { id: 'ripple', symbol: 'XRP', name: 'XRP', current_price: 1.12, price_change_percentage_24h: -0.65, high_24h: 1.18, low_24h: 1.09, total_volume: 3800000000, market_cap: 64000000000, sparkline_in_7d: [1.05, 1.08, 1.1, 1.15, 1.14, 1.13, 1.12] },
        { id: 'cardano', symbol: 'ADA', name: 'Cardano', current_price: 0.84, price_change_percentage_24h: 4.12, high_24h: 0.88, low_24h: 0.79, total_volume: 1400000000, market_cap: 29000000000, sparkline_in_7d: [0.77, 0.79, 0.81, 0.8, 0.82, 0.83, 0.84] },
        { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', current_price: 36.4, price_change_percentage_24h: 3.2, high_24h: 37.5, low_24h: 34.8, total_volume: 850000000, market_cap: 14800000000, sparkline_in_7d: [33, 34.2, 33.8, 35.1, 35.8, 36.0, 36.4] }
      ]
    };

    return res.json(fallback);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   ADMINISTRATION PANEL ROUTES (/api/admin/*)
   ========================================================================== */

router.post('/admin/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await dbQueryOne<any>(
      `SELECT * FROM users WHERE email = ? AND role = 'admin'`,
      [String(email).toLowerCase().trim()]
    );
    if (!user) {
      return res.status(401).json({ error: 'Invalid administrative credentials' });
    }

    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid administrative credentials' });
    }

    const token = jwt.sign(
      { id: Number(user.id), email: user.email, role: 'admin', full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await dbExecute(
      `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, details)
       VALUES (?, ?, 'admin_login', 'auth', 'Successful administrative portal sign in')`,
      [user.id, user.email]
    );

    res.cookie('admin_token', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 24 * 3600 * 1000 });

    return res.json({
      message: 'Administrative authentication successful',
      token,
      admin: {
        id: Number(user.id),
        email: user.email,
        full_name: user.full_name,
        role: 'admin'
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/admin/metrics', adminAuthMiddleware, async (_req, res) => {
  try {
    const totalUsersRow = await dbQueryOne<any>(`SELECT count(*) as c FROM users WHERE role = 'user'`);
    const verifiedUsersRow = await dbQueryOne<any>(`SELECT count(*) as c FROM kyc_records WHERE status = 'verified'`);
    const pendingKycRow = await dbQueryOne<any>(`SELECT count(*) as c FROM kyc_records WHERE status = 'pending'`);

    const totalDeposits = await dbQueryOne<any>(`SELECT COALESCE(SUM(amount), 0) as s, count(*) as c FROM deposits WHERE status = 'confirmed'`);
    const pendingDeposits = await dbQueryOne<any>(`SELECT COALESCE(SUM(amount), 0) as s, count(*) as c FROM deposits WHERE status IN ('pending', 'verifying')`);

    const totalWithdrawals = await dbQueryOne<any>(`SELECT COALESCE(SUM(amount), 0) as s, count(*) as c FROM withdrawals WHERE status = 'completed'`);
    const pendingWithdrawals = await dbQueryOne<any>(`SELECT COALESCE(SUM(amount), 0) as s, count(*) as c FROM withdrawals WHERE status IN ('pending', 'under_review', 'approved', 'processing')`);

    const activeInvestments = await dbQueryOne<any>(`SELECT COALESCE(SUM(capital_amount), 0) as s, count(*) as c FROM investments WHERE status = 'active'`);

    const recentRegistrations = await dbQueryAll(`SELECT id, full_name, email, country, created_at, status FROM users WHERE role = 'user' ORDER BY id DESC LIMIT 5`);
    const recentAudit = await dbQueryAll(`SELECT * FROM admin_audit_logs ORDER BY id DESC LIMIT 10`);

    return res.json({
      users: {
        total: Number(totalUsersRow?.c || 0),
        verified: Number(verifiedUsersRow?.c || 0),
        pending_kyc: Number(pendingKycRow?.c || 0)
      },
      deposits: {
        total_amount: Number(totalDeposits?.s || 0),
        confirmed_count: Number(totalDeposits?.c || 0),
        pending_amount: Number(pendingDeposits?.s || 0),
        pending_count: Number(pendingDeposits?.c || 0)
      },
      withdrawals: {
        total_amount: Number(totalWithdrawals?.s || 0),
        completed_count: Number(totalWithdrawals?.c || 0),
        pending_amount: Number(pendingWithdrawals?.s || 0),
        pending_count: Number(pendingWithdrawals?.c || 0)
      },
      investments: {
        active_capital: Number(activeInvestments?.s || 0),
        active_count: Number(activeInvestments?.c || 0)
      },
      recent_registrations: recentRegistrations,
      recent_audit_logs: recentAudit
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/admin/users', adminAuthMiddleware, async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = `
      SELECT u.id, u.email, u.full_name, u.phone, u.country, u.role, u.is_verified, u.status, u.created_at,
             COALESCE(k.status, 'not_submitted') as kyc_status,
             (SELECT balance FROM wallets WHERE user_id = u.id AND currency = 'USD') as usd_balance,
             (SELECT balance FROM wallets WHERE user_id = u.id AND currency = 'BTC') as btc_balance,
             (SELECT balance FROM wallets WHERE user_id = u.id AND currency = 'USDT') as usdt_balance
      FROM users u
      LEFT JOIN kyc_records k ON u.id = k.user_id
      WHERE u.role = 'user'
    `;
    const params: any[] = [];

    if (search) {
      const searchStr = String(search).trim();
      if (/^\d+$/.test(searchStr)) {
        query += ` AND (LOWER(u.full_name) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?) OR u.id = ?)`;
        params.push(`%${searchStr}%`, `%${searchStr}%`, Number(searchStr));
      } else {
        query += ` AND (LOWER(u.full_name) LIKE LOWER(?) OR LOWER(u.email) LIKE LOWER(?))`;
        params.push(`%${searchStr}%`, `%${searchStr}%`);
      }
    }

    if (status) {
      query += ` AND u.status = ?`;
      params.push(String(status));
    }

    query += ' ORDER BY u.id DESC';
    const users = await dbQueryAll(query, params);

    return res.json({ users });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/admin/users/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user ID' });

    const user = await dbQueryOne('SELECT id, email, full_name, phone, country, role, is_verified, two_factor_enabled, referral_code, referred_by, status, created_at FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const balances = await ledgerService.getBalances(userId);
    const kyc = await dbQueryOne('SELECT * FROM kyc_records WHERE user_id = ?', [userId]);
    const deposits = await dbQueryAll('SELECT * FROM deposits WHERE user_id = ? ORDER BY id DESC', [userId]);
    const withdrawals = await dbQueryAll('SELECT * FROM withdrawals WHERE user_id = ? ORDER BY id DESC', [userId]);
    const investments = await dbQueryAll(
      'SELECT i.*, p.name as plan_name FROM investments i JOIN investment_plans p ON i.plan_id = p.id WHERE i.user_id = ? ORDER BY i.id DESC',
      [userId]
    );
    const transactions = await dbQueryAll('SELECT * FROM transactions WHERE user_id = ? ORDER BY id DESC LIMIT 20', [userId]);

    return res.json({
      user,
      balances,
      kyc,
      deposits,
      withdrawals,
      investments,
      transactions
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/admin/users/:id/status', adminAuthMiddleware, async (req, res) => {
  try {
    const admin = (req as any).admin as AuthUser;
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user ID' });

    const { status, reason } = req.body;
    if (!['active', 'suspended', 'restricted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await dbExecute('UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, userId]);

    await dbExecute(
      `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
       VALUES (?, ?, 'update_user_status', 'user', ?, ?)`,
      [admin.id, admin.email, String(userId), `Status changed to ${status}. Reason: ${reason || 'Administrative action'}`]
    );

    await dbExecute(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, 'Account Status Update', ?, 'warning')`,
      [userId, `Your account status was updated to ${String(status).toUpperCase()}. Reason: ${reason || 'Compliance review'}`]
    );

    return res.json({ success: true, status });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/admin/users/:id/balance-adjust', adminAuthMiddleware, async (req, res) => {
  try {
    const admin = (req as any).admin as AuthUser;
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user ID' });

    const { currency, type, amount, reason } = req.body;

    if (!['USD', 'BTC', 'USDT'].includes(currency)) {
      return res.status(400).json({ error: 'Currency must be USD, BTC, or USDT' });
    }
    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ error: 'Type must be credit or debit' });
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero' });
    }
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ error: 'A justified reason is required for administrative balance adjustments' });
    }

    const result = await ledgerService.adminAdjustBalance({
      adminId: admin.id,
      adminEmail: admin.email,
      userId,
      currency,
      type,
      amount: numAmount,
      reason: String(reason).trim()
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/admin/users/:id/notify', adminAuthMiddleware, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid user ID' });

    const { title, message, type = 'info' } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message required' });

    await dbExecute(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, ?)`,
      [userId, title, message, type]
    );

    return res.json({ success: true, message: 'Notification delivered' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin Deposits Management
router.get('/admin/deposits', adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT d.*, u.full_name as user_name, u.email as user_email
      FROM deposits d
      JOIN users u ON d.user_id = u.id
    `;
    const params: any[] = [];
    if (status) {
      query += ' WHERE d.status = ?';
      params.push(String(status));
    }
    query += ' ORDER BY d.id DESC';

    const deposits = await dbQueryAll(query, params);
    return res.json({ deposits });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/admin/deposits/:id/approve', adminAuthMiddleware, async (req, res) => {
  try {
    const admin = (req as any).admin as AuthUser;
    const depositId = Number(req.params.id);
    if (!Number.isFinite(depositId)) return res.status(400).json({ error: 'Invalid deposit ID' });

    const deposit = await dbQueryOne<any>('SELECT * FROM deposits WHERE id = ?', [depositId]);
    if (!deposit) return res.status(404).json({ error: 'Deposit record not found' });
    if (deposit.status === 'confirmed') return res.status(400).json({ error: 'Deposit is already confirmed' });

    await ledgerService.creditWallet({
      userId: Number(deposit.user_id),
      currency: deposit.currency,
      amount: Number(deposit.amount),
      type: 'deposit',
      description: `Admin approved ${deposit.currency} deposit [Ref: ${deposit.tx_hash ? deposit.tx_hash.substring(0, 10) : 'MANUAL'}]`,
      relatedId: String(depositId)
    });

    await dbExecute(
      `UPDATE deposits
       SET status = 'confirmed', verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, admin_note = 'Approved by administrator'
       WHERE id = ?`,
      [depositId]
    );

    await dbExecute(
      `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
       VALUES (?, ?, 'approve_deposit', 'deposit', ?, ?)`,
      [admin.id, admin.email, String(depositId), `Approved deposit of ${deposit.amount} ${deposit.currency} for User #${deposit.user_id}`]
    );

    await dbExecute(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, 'Deposit Approved and Credited', ?, 'success')`,
      [deposit.user_id, `Your deposit of ${deposit.amount} ${deposit.currency} was verified and credited to your wallet balance.`]
    );

    return res.json({ success: true, message: 'Deposit confirmed and credited successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/admin/deposits/:id/reject', adminAuthMiddleware, async (req, res) => {
  try {
    const admin = (req as any).admin as AuthUser;
    const depositId = Number(req.params.id);
    if (!Number.isFinite(depositId)) return res.status(400).json({ error: 'Invalid deposit ID' });

    const { reason } = req.body;

    const deposit = await dbQueryOne<any>('SELECT * FROM deposits WHERE id = ?', [depositId]);
    if (!deposit) return res.status(404).json({ error: 'Deposit record not found' });
    if (deposit.status === 'confirmed') return res.status(400).json({ error: 'Cannot reject an already confirmed deposit' });

    await dbExecute(
      `UPDATE deposits
       SET status = 'rejected', admin_note = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [reason || 'Transaction could not be verified on the blockchain', depositId]
    );

    await dbExecute(
      `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
       VALUES (?, ?, 'reject_deposit', 'deposit', ?, ?)`,
      [admin.id, admin.email, String(depositId), `Rejected deposit #${depositId}: ${reason || 'N/A'}`]
    );

    await dbExecute(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, 'Deposit Verification Rejected', ?, 'warning')`,
      [deposit.user_id, `Your deposit of ${deposit.amount} ${deposit.currency} was not verified. Reason: ${reason || 'Invalid transaction hash'}`]
    );

    return res.json({ success: true, message: 'Deposit rejected' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin Withdrawal Management
router.get('/admin/withdrawals', adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT w.*, u.full_name as user_name, u.email as user_email
      FROM withdrawals w
      JOIN users u ON w.user_id = u.id
    `;
    const params: any[] = [];
    if (status) {
      query += ' WHERE w.status = ?';
      params.push(String(status));
    }
    query += ' ORDER BY w.id DESC';

    const withdrawals = await dbQueryAll(query, params);
    return res.json({ withdrawals });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/admin/withdrawals/:id/approve', adminAuthMiddleware, async (req, res) => {
  try {
    const admin = (req as any).admin as AuthUser;
    const withdrawalId = Number(req.params.id);
    if (!Number.isFinite(withdrawalId)) return res.status(400).json({ error: 'Invalid withdrawal ID' });

    await dbExecute(`UPDATE withdrawals SET status = 'processing', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [withdrawalId]);

    await dbExecute(
      `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
       VALUES (?, ?, 'approve_withdrawal', 'withdrawal', ?, 'Marked withdrawal as approved and processing')`,
      [admin.id, admin.email, String(withdrawalId)]
    );

    return res.json({ success: true, message: 'Withdrawal marked as processing' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/admin/withdrawals/:id/complete', adminAuthMiddleware, async (req, res) => {
  try {
    const admin = (req as any).admin as AuthUser;
    const withdrawalId = Number(req.params.id);
    if (!Number.isFinite(withdrawalId)) return res.status(400).json({ error: 'Invalid withdrawal ID' });

    const { payout_tx_hash } = req.body;
    if (!payout_tx_hash || !String(payout_tx_hash).trim()) {
      return res.status(400).json({ error: 'Blockchain payout transaction hash is required' });
    }

    await ledgerService.completeWithdrawal(withdrawalId, String(payout_tx_hash).trim(), admin.id);

    await dbExecute(
      `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
       VALUES (?, ?, 'complete_withdrawal', 'withdrawal', ?, ?)`,
      [admin.id, admin.email, String(withdrawalId), `Completed withdrawal with payout TX: ${payout_tx_hash}`]
    );

    return res.json({ success: true, message: 'Withdrawal completed and ledger updated' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/admin/withdrawals/:id/reject', adminAuthMiddleware, async (req, res) => {
  try {
    const admin = (req as any).admin as AuthUser;
    const withdrawalId = Number(req.params.id);
    if (!Number.isFinite(withdrawalId)) return res.status(400).json({ error: 'Invalid withdrawal ID' });

    const { reason } = req.body;

    await ledgerService.rejectWithdrawal(withdrawalId, reason || 'Withdrawal rejected by compliance team', admin.id);

    await dbExecute(
      `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
       VALUES (?, ?, 'reject_withdrawal', 'withdrawal', ?, ?)`,
      [admin.id, admin.email, String(withdrawalId), `Rejected withdrawal #${withdrawalId}: ${reason || 'N/A'}`]
    );

    return res.json({ success: true, message: 'Withdrawal rejected and funds refunded to user wallet' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
});

// Admin KYC Management
router.get('/admin/kyc', adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT k.*, u.full_name as user_name, u.email as user_email, u.created_at as user_created_at
      FROM kyc_records k
      JOIN users u ON k.user_id = u.id
    `;
    const params: any[] = [];
    if (status) {
      query += ' WHERE k.status = ?';
      params.push(String(status));
    }
    query += ' ORDER BY k.id DESC';

    const kyc = await dbQueryAll(query, params);
    return res.json({ kyc });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/admin/kyc/:id/review', adminAuthMiddleware, async (req, res) => {
  try {
    const admin = (req as any).admin as AuthUser;
    const kycId = Number(req.params.id);
    if (!Number.isFinite(kycId)) return res.status(400).json({ error: 'Invalid KYC ID' });

    const { status, admin_note } = req.body;
    if (!['verified', 'rejected', 'additional_info_required'].includes(status)) {
      return res.status(400).json({ error: 'Status must be verified, rejected, or additional_info_required' });
    }

    const kyc = await dbQueryOne<any>('SELECT user_id FROM kyc_records WHERE id = ?', [kycId]);
    if (!kyc) return res.status(404).json({ error: 'KYC record not found' });

    await dbExecute(
      `UPDATE kyc_records
       SET status = ?, admin_note = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [status, admin_note || '', kycId]
    );

    if (status === 'verified') {
      await dbExecute('UPDATE users SET is_verified = 1 WHERE id = ?', [kyc.user_id]);
      await dbExecute(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, 'KYC Verification Approved', 'Congratulations! Your identity has been verified. High-volume deposits and withdrawals are now unlocked.', 'success')`,
        [kyc.user_id]
      );
    } else {
      await dbExecute(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES (?, 'KYC Verification Update', ?, 'warning')`,
        [kyc.user_id, `Your KYC verification was ${status === 'rejected' ? 'rejected' : 'flagged for additional information'}. Note: ${admin_note || 'Please review requirements.'}`]
      );
    }

    await dbExecute(
      `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
       VALUES (?, ?, 'review_kyc', 'kyc', ?, ?)`,
      [admin.id, admin.email, String(kycId), `KYC set to ${status}. Note: ${admin_note || ''}`]
    );

    return res.json({ success: true, message: `KYC status updated to ${status}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin Investment Plans
router.get('/admin/plans', adminAuthMiddleware, async (_req, res) => {
  try {
    const plans = await dbQueryAll('SELECT * FROM investment_plans ORDER BY id ASC');
    return res.json({ plans });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/admin/plans', adminAuthMiddleware, async (req, res) => {
  try {
    const admin = (req as any).admin as AuthUser;
    const { id, name, slug, tagline, min_amount, max_amount, duration_days, daily_roi, total_roi, risk_tier, management_fee, return_method, description, is_active } = req.body;

    if (!name || !min_amount || !max_amount || !daily_roi) {
      return res.status(400).json({ error: 'Name, min/max amounts, and daily ROI are required' });
    }

    if (id) {
      await dbExecute(
        `UPDATE investment_plans
         SET name = ?, tagline = ?, min_amount = ?, max_amount = ?, duration_days = ?, daily_roi = ?, total_roi = ?,
             risk_tier = ?, management_fee = ?, return_method = ?, description = ?, is_active = ?
         WHERE id = ?`,
        [name, tagline || '', Number(min_amount), Number(max_amount), Number(duration_days), Number(daily_roi), Number(total_roi), risk_tier, Number(management_fee || 0), return_method, description, is_active ? 1 : 0, Number(id)]
      );

      await dbExecute(
        `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, target_id, details)
         VALUES (?, ?, 'update_plan', 'investment_plan', ?, ?)`,
        [admin.id, admin.email, String(id), `Updated plan: ${name}`]
      );

      return res.json({ success: true, message: 'Investment plan updated' });
    } else {
      const generatedSlug = slug || String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await dbExecute(
        `INSERT INTO investment_plans (name, slug, tagline, min_amount, max_amount, duration_days, daily_roi, total_roi, risk_tier, management_fee, return_method, description, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, generatedSlug, tagline || '', Number(min_amount), Number(max_amount), Number(duration_days), Number(daily_roi), Number(total_roi), risk_tier, Number(management_fee || 0), return_method, description, is_active !== false ? 1 : 0]
      );

      await dbExecute(
        `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, details)
         VALUES (?, ?, 'create_plan', 'investment_plan', ?)`,
        [admin.id, admin.email, `Created new plan: ${name}`]
      );

      return res.json({ success: true, message: 'Investment plan created successfully' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin Platform Settings
router.get('/admin/settings', adminAuthMiddleware, async (_req, res) => {
  try {
    const settings = await dbQueryAll('SELECT * FROM platform_settings');
    return res.json({ settings });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/admin/settings', adminAuthMiddleware, async (req, res) => {
  try {
    const admin = (req as any).admin as AuthUser;
    const { settings } = req.body;

    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings array required' });
    }

    for (const item of settings) {
      await dbExecute(
        'UPDATE platform_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
        [String(item.value), item.key]
      );
    }

    await dbExecute(
      `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, details)
       VALUES (?, ?, 'update_settings', 'platform_settings', ?)`,
      [admin.id, admin.email, `Updated ${settings.length} platform configuration settings`]
    );

    return res.json({ success: true, message: 'Platform settings updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin Audit Logs
router.get('/admin/audit-logs', adminAuthMiddleware, async (_req, res) => {
  try {
    const logs = await dbQueryAll('SELECT * FROM admin_audit_logs ORDER BY id DESC LIMIT 100');
    return res.json({ logs });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Admin Support Tickets
router.get('/admin/tickets', adminAuthMiddleware, async (_req, res) => {
  try {
    const tickets = await dbQueryAll(
      `SELECT t.*, u.full_name as user_name, u.email as user_email,
              (SELECT count(*) FROM support_messages WHERE ticket_id = t.id) as message_count
       FROM support_tickets t
       JOIN users u ON t.user_id = u.id
       ORDER BY t.id DESC`
    );
    return res.json({ tickets });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/admin/tickets/:id/reply', adminAuthMiddleware, async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    if (!Number.isFinite(ticketId)) return res.status(400).json({ error: 'Invalid ticket ID' });

    const { message, status } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Reply message cannot be empty' });
    }

    const ticket = await dbQueryOne<any>('SELECT * FROM support_tickets WHERE id = ?', [ticketId]);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await dbExecute(
      `INSERT INTO support_messages (ticket_id, sender_role, sender_name, message)
       VALUES (?, 'admin', ?, ?)`,
      [ticketId, 'OX TRADERS Support Team', String(message).trim()]
    );

    const newStatus = status || 'in_progress';
    await dbExecute(`UPDATE support_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newStatus, ticketId]);

    await dbExecute(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, 'New Support Reply', ?, 'info')`,
      [ticket.user_id, `Support has replied to your ticket #${ticket.ticket_code}: "${ticket.subject}"`]
    );

    return res.json({ success: true, message: 'Reply sent to user' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   ADMIN DATABASE DIAGNOSTICS, BACKUP & RESTORE
   ========================================================================== */

router.get('/admin/database/status', adminAuthMiddleware, async (_req, res) => {
  try {
    const diag = getDatabaseDiagnostics();
    const usersRow = await dbQueryOne<any>('SELECT count(*) as c FROM users');
    const depositsRow = await dbQueryOne<any>('SELECT count(*) as c FROM deposits');
    const withdrawalsRow = await dbQueryOne<any>('SELECT count(*) as c FROM withdrawals');
    const investmentsRow = await dbQueryOne<any>('SELECT count(*) as c FROM investments');

    return res.json({
      ...diag,
      counts: {
        users: Number(usersRow?.c || 0),
        deposits: Number(depositsRow?.c || 0),
        withdrawals: Number(withdrawalsRow?.c || 0),
        investments: Number(investmentsRow?.c || 0)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/admin/database/export', adminAuthMiddleware, async (req, res) => {
  try {
    const admin = (req as any).admin as AuthUser;
    const [
      users,
      wallets,
      transactions,
      deposits,
      withdrawals,
      investment_plans,
      investments,
      kyc_records,
      referrals,
      notifications,
      support_tickets,
      support_messages,
      platform_settings
    ] = await Promise.all([
      dbQueryAll('SELECT * FROM users ORDER BY id ASC'),
      dbQueryAll('SELECT * FROM wallets ORDER BY id ASC'),
      dbQueryAll('SELECT * FROM transactions ORDER BY id ASC'),
      dbQueryAll('SELECT * FROM deposits ORDER BY id ASC'),
      dbQueryAll('SELECT * FROM withdrawals ORDER BY id ASC'),
      dbQueryAll('SELECT * FROM investment_plans ORDER BY id ASC'),
      dbQueryAll('SELECT * FROM investments ORDER BY id ASC'),
      dbQueryAll('SELECT * FROM kyc_records ORDER BY id ASC'),
      dbQueryAll('SELECT * FROM referrals ORDER BY id ASC'),
      dbQueryAll('SELECT * FROM notifications ORDER BY id ASC'),
      dbQueryAll('SELECT * FROM support_tickets ORDER BY id ASC'),
      dbQueryAll('SELECT * FROM support_messages ORDER BY id ASC'),
      dbQueryAll('SELECT * FROM platform_settings')
    ]);

    await dbExecute(
      `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, details)
       VALUES (?, ?, 'export_database', 'system', ?)`,
      [admin.id, admin.email, `Exported database snapshot (${users.length} users)`]
    );

    return res.json({
      platform: 'OX TRADERS',
      domain: 'oxtraders.online',
      exported_at: new Date().toISOString(),
      tables: {
        users,
        wallets,
        transactions,
        deposits,
        withdrawals,
        investment_plans,
        investments,
        kyc_records,
        referrals,
        notifications,
        support_tickets,
        support_messages,
        platform_settings
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/admin/database/restore', adminAuthMiddleware, async (req, res) => {
  try {
    const admin = (req as any).admin as AuthUser;
    const snapshot = req.body?.tables ? req.body : req.body;
    const tables = snapshot?.tables;

    if (!tables || !Array.isArray(tables.users)) {
      return res.status(400).json({ error: 'Invalid snapshot file format (missing tables.users array)' });
    }

    let restoredUsers = 0;

    await dbWithTransaction(async (tx) => {
      const userIdMap = new Map<number, number>();

      for (const u of tables.users || []) {
        if (!u.email || !u.password_hash || !u.referral_code) continue;
        const cleanEmail = String(u.email).toLowerCase().trim();
        const existing = await tx.queryOne<{ id: number }>('SELECT id FROM users WHERE email = ?', [cleanEmail]);

        if (existing) {
          userIdMap.set(Number(u.id), Number(existing.id));
          await tx.execute(
            `UPDATE users SET full_name = ?, phone = ?, country = ?, is_verified = ?, two_factor_enabled = ?, status = ?
             WHERE id = ?`,
            [
              u.full_name || 'Investor',
              u.phone || '',
              u.country || '',
              Number(u.is_verified || 0),
              Number(u.two_factor_enabled || 0),
              u.status || 'active',
              existing.id
            ]
          );
        } else {
          const safeRefCode = String(u.referral_code || ('OX-' + Math.random().toString(36).substring(2, 7).toUpperCase()));
          const resInsert = await tx.execute(
            `INSERT INTO users (email, password_hash, full_name, phone, country, role, is_verified, two_factor_enabled, referral_code, referred_by, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cleanEmail,
              u.password_hash,
              u.full_name || 'Investor',
              u.phone || '',
              u.country || '',
              u.role === 'admin' ? 'admin' : 'user',
              Number(u.is_verified || 0),
              Number(u.two_factor_enabled || 0),
              safeRefCode,
              u.referred_by || null,
              u.status || 'active'
            ]
          );
          if (resInsert.lastInsertId) {
            userIdMap.set(Number(u.id), resInsert.lastInsertId);
            restoredUsers++;
          }
        }
      }

      for (const w of tables.wallets || []) {
        const mappedUid = userIdMap.get(Number(w.user_id));
        if (!mappedUid || !['USD', 'BTC', 'USDT'].includes(w.currency)) continue;
        await tx.execute(
          `INSERT INTO wallets (user_id, currency, balance, locked_balance)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (user_id, currency) DO UPDATE SET balance = excluded.balance, locked_balance = excluded.locked_balance`,
          [mappedUid, w.currency, Number(w.balance || 0), Number(w.locked_balance || 0)]
        );
      }

      for (const s of tables.platform_settings || []) {
        if (!s.key) continue;
        await tx.execute(
          `INSERT INTO platform_settings (key, value, category, description)
           VALUES (?, ?, ?, ?)
           ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
          [s.key, String(s.value ?? ''), s.category || 'general', s.description || null]
        );
      }
    });

    await dbExecute(
      `INSERT INTO admin_audit_logs (admin_id, admin_email, action, target_type, details)
       VALUES (?, ?, 'restore_database', 'system', ?)`,
      [admin.id, admin.email, `Restored snapshot (${restoredUsers} new accounts added, wallets & settings synchronized)`]
    );

    return res.json({
      success: true,
      restored_users: restoredUsers,
      message: `Database synchronized cleanly (${restoredUsers} new accounts restored, balances & settings updated).`
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Restore failed' });
  }
});

export default router;
