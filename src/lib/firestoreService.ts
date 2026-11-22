import { User as FirebaseUser } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  FIREBASE_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
  handleFirestoreError,
  MASTER_ADMIN_EMAIL,
  OperationType,
} from './firebase.ts';
import {
  AdminAuditLog,
  Deposit,
  InvestmentPlan,
  InvestmentPosition,
  KYCRecord,
  NotificationItem,
  SupportMessage,
  SupportTicket,
  Transaction,
  User,
  WalletBalances,
  Withdrawal,
} from '../types/index.ts';

// ---------------------------------------------------------------------------
// Formatting, Sanitization & Blueprint Synchronicity Helpers
// ---------------------------------------------------------------------------

function clamp(val: string | undefined | null, maxLen: number): string {
  return String(val ?? '').trim().slice(0, maxLen);
}

function toIso(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as any).toDate === 'function') {
    return (ts as any).toDate().toISOString();
  }
  if (typeof ts === 'object' && ts !== null && 'seconds' in ts) {
    return new Date(Number((ts as any).seconds) * 1000).toISOString();
  }
  const d = new Date(String(ts));
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function roundUsd(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function roundCrypto(n: number): number {
  return Math.round((Number(n) || 0) * 100000000) / 100000000;
}

function generateRef(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${ts}${rand}`;
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().trim() === MASTER_ADMIN_EMAIL;
}

export function walletDocToBalances(data: Record<string, any> | undefined): WalletBalances {
  const usdAvail = roundUsd(data?.usdAvailable ?? 0);
  const usdLocked = roundUsd(data?.usdLocked ?? 0);
  const btcAvail = roundCrypto(data?.btcAvailable ?? 0);
  const btcLocked = roundCrypto(data?.btcLocked ?? 0);
  const usdtAvail = roundUsd(data?.usdtAvailable ?? 0);
  const usdtLocked = roundUsd(data?.usdtLocked ?? 0);

  return {
    USD: { available: usdAvail, locked: usdLocked, total: roundUsd(usdAvail + usdLocked) },
    BTC: { available: btcAvail, locked: btcLocked, total: roundCrypto(btcAvail + btcLocked) },
    USDT: { available: usdtAvail, locked: usdtLocked, total: roundUsd(usdtAvail + usdtLocked) },
  };
}

export function userDocToUser(id: string, data: Record<string, any>): User {
  const email = String(data.email || '');
  return {
    id,
    email,
    full_name: String(data.fullName || 'OX Investor'),
    phone: data.phone || '',
    country: data.country || 'United Kingdom',
    role: isSuperAdminEmail(email) ? 'admin' : 'user',
    referral_code: String(data.referralCode || `OX-${id.slice(0, 6).toUpperCase()}`),
    is_verified: data.isVerified ? 1 : 0,
    two_factor_enabled: data.twoFactorEnabled ? 1 : 0,
    status: (data.status as User['status']) || 'active',
    created_at: toIso(data.createdAt),
  };
}

// ---------------------------------------------------------------------------
// Canonical Platform Defaults (Preserves Official Custodial Addresses & Plans)
// ---------------------------------------------------------------------------

export const DEFAULT_PLATFORM_SETTINGS: Record<string, string> = {
  company_name: 'OX TRADERS',
  support_email: 'support@oxtraders.online',
  btc_deposit_address: 'bc1qg2a2gdxtccsxu83xy0jvezenutzyvmv4jl0uz4',
  usdt_deposit_address: 'TB4Uq6VQMFMbDZUq3xK4jM8mqz6rb2TqGf',
  btc_min_deposit: '0.001',
  usdt_min_deposit: '50.0',
  btc_min_withdrawal: '0.002',
  usdt_min_withdrawal: '25.0',
  btc_withdrawal_fee: '0.00035',
  usdt_withdrawal_fee: '1.50',
  referral_commission_percent: '5.0',
  kyc_mandatory_for_withdrawal: 'true',
  maintenance_mode: 'false',
};

export const DEFAULT_PLANS: InvestmentPlan[] = [
  {
    id: 'ox-starter-yield',
    name: 'OX Starter Yield',
    slug: 'ox-starter-yield',
    tagline: 'Entry-level automated delta-neutral BTC & USDT liquidity arbitrage.',
    min_amount: 100,
    max_amount: 4999,
    duration_days: 14,
    daily_roi: 1.2,
    total_roi: 16.8,
    risk_tier: 'Conservative',
    management_fee: 0.5,
    return_method: 'Daily algorithmic accrual with 100% principal unlock at 14-day maturity.',
    description:
      'Designed for systematic crypto accumulation using hedged perpetual funding-rate capture and low-slippage stablecoin pairs.',
    capital_returned: 1,
    is_active: 1,
  },
  {
    id: 'ox-premier-yield',
    name: 'OX Premier Yield',
    slug: 'ox-premier-yield',
    tagline: 'Balanced multi-exchange market-making and momentum capture engine.',
    min_amount: 5000,
    max_amount: 24999,
    duration_days: 30,
    daily_roi: 1.85,
    total_roi: 55.5,
    risk_tier: 'Moderate',
    management_fee: 0.5,
    return_method: 'Daily yield settlement credited directly to available ledger balance.',
    description:
      'Flagship OX TRADERS quantitative strategy combining cross-venue order-book arbitrage with dynamic BTC/USDT volatility hedging.',
    capital_returned: 1,
    is_active: 1,
  },
  {
    id: 'ox-pro-arbitrage',
    name: 'OX Pro Arbitrage',
    slug: 'ox-pro-arbitrage',
    tagline: 'High-frequency execution across institutional liquidity pools.',
    min_amount: 25000,
    max_amount: 99999,
    duration_days: 45,
    daily_roi: 2.35,
    total_roi: 105.75,
    risk_tier: 'Aggressive',
    management_fee: 0.75,
    return_method: 'Real-time execution cycles with daily compounding-ready settlements.',
    description:
      'Deploys proprietary statistical arbitrage and latency-sensitive spread capture across BTC, ETH, SOL, and USDT liquidity venues.',
    capital_returned: 1,
    is_active: 1,
  },
  {
    id: 'ox-institutional-alpha',
    name: 'OX Institutional Alpha',
    slug: 'ox-institutional-alpha',
    tagline: 'Private quantitative mandate with dedicated liquidity desk routing.',
    min_amount: 100000,
    max_amount: 1000000,
    duration_days: 60,
    daily_roi: 2.9,
    total_roi: 174.0,
    risk_tier: 'Institutional',
    management_fee: 1.0,
    return_method: 'Automated daily treasury disbursements with audited custody settlement.',
    description:
      'Flagship institutional strategy desk offering deep multi-venue algorithmic execution and bespoke principal protection guardrails.',
    capital_returned: 1,
    is_active: 1,
  },
];

// ---------------------------------------------------------------------------
// Admin Verification & One-Time Seeding
// ---------------------------------------------------------------------------

let seedingPromise: Promise<void> | null = null;

export async function seedFirestoreDefaultsIfAdmin(firebaseUser: FirebaseUser): Promise<void> {
  if (!firebaseUser.emailVerified || !isSuperAdminEmail(firebaseUser.email)) return;
  if (seedingPromise) return seedingPromise;

  seedingPromise = (async () => {
    try {
      const settingsRef = doc(db, 'platform_settings', 'public');
      const settingsSnap = await getDoc(settingsRef);
      if (!settingsSnap.exists()) {
        await setDoc(settingsRef, {
          ...DEFAULT_PLATFORM_SETTINGS,
          updatedAt: serverTimestamp(),
        });
      }

      const existingPlans = await getDocs(collection(db, 'investment_plans'));
      if (existingPlans.empty) {
        const batch = writeBatch(db);
        for (const plan of DEFAULT_PLANS) {
          const ref = doc(db, 'investment_plans', plan.slug);
          batch.set(ref, {
            name: plan.name,
            slug: plan.slug,
            tagline: plan.tagline || '',
            minAmount: plan.min_amount,
            maxAmount: plan.max_amount,
            durationDays: Math.round(plan.duration_days),
            dailyRoi: plan.daily_roi,
            totalRoi: plan.total_roi,
            riskTier: plan.risk_tier,
            managementFee: plan.management_fee,
            returnMethod: plan.return_method,
            description: plan.description,
            isActive: true,
            updatedAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }
    } catch (err) {
      console.warn('Non-fatal default seed warning:', err);
    } finally {
      seedingPromise = null;
    }
  })();

  return seedingPromise;
}

export async function verifyAdminAccess(firebaseUser: FirebaseUser): Promise<boolean> {
  if (!firebaseUser.emailVerified) return false;
  if (isSuperAdminEmail(firebaseUser.email)) {
    await seedFirestoreDefaultsIfAdmin(firebaseUser);
    return true;
  }
  const path = `admins/${firebaseUser.uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', firebaseUser.uid));
    return snap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

// ---------------------------------------------------------------------------
// Account Provisioning & User Persistence (Permanent Cloud Storage)
// ---------------------------------------------------------------------------

export async function ensureUserAccount(
  firebaseUser: FirebaseUser,
  options?: { country?: string; phone?: string; referralCodeInput?: string }
): Promise<{ user: User; balances: WalletBalances; kycStatus: string }> {
  const uid = firebaseUser.uid;
  const userPath = `users/${uid}`;
  const walletPath = `wallets/${uid}`;

  let userData: Record<string, any> | undefined;
  let kycStatus = 'not_submitted';

  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) {
      const cleanEmail = clamp(firebaseUser.email || `${uid}@oxtraders.online`, 200);
      const displayName = clamp(
        firebaseUser.displayName || cleanEmail.split('@')[0] || 'OX Investor',
        120
      );
      const rawPrefix = uid
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 6)
        .toUpperCase()
        .padEnd(4, 'X');
      const generatedReferralCode = clamp(`OX-${rawPrefix}`, 32);

      // Optional referral code attribution
      let validReferrerCode: string | null = null;
      let referrerUid: string | null = null;
      const candidateCode = clamp(options?.referralCodeInput?.toUpperCase(), 32);
      if (candidateCode && /^[a-zA-Z0-9_\-]+$/.test(candidateCode)) {
        try {
          const refSnap = await getDoc(doc(db, 'referral_codes', candidateCode));
          if (refSnap.exists()) {
            const refUid = String(refSnap.data()?.uid || '');
            if (refUid && refUid !== uid) {
              validReferrerCode = candidateCode;
              referrerUid = refUid;
            }
          }
        } catch {
          // ignore non-critical referral lookup issues
        }
      }

      const newUserDoc = {
        uid,
        email: cleanEmail,
        fullName: displayName,
        phone: clamp(options?.phone || '', 40),
        country: clamp(options?.country || 'United Kingdom', 80),
        referralCode: generatedReferralCode,
        referredBy: validReferrerCode,
        isVerified: false,
        twoFactorEnabled: false,
        kycStatus: 'not_submitted',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'users', uid), newUserDoc);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, userPath);
      }

      // Register minimal referral directory entry (ignore collision)
      try {
        await setDoc(doc(db, 'referral_codes', generatedReferralCode), {
          uid,
          createdAt: serverTimestamp(),
        });
      } catch {
        // already claimed or non-critical
      }

      // Create referral attribution record if referred
      if (referrerUid) {
        try {
          await setDoc(doc(db, 'referrals', uid), {
            referrerId: referrerUid,
            referredId: uid,
            referredName: displayName,
            referredEmail: cleanEmail,
            commissionRate: 5,
            totalCommission: 0,
            createdAt: serverTimestamp(),
          });
        } catch {
          // non-critical
        }
      }

      // Welcome notification
      try {
        await addDoc(collection(db, 'notifications'), {
          userId: uid,
          title: 'Welcome to OX TRADERS',
          message:
            'Your investor account is permanently synced to cloud custody. Deposit BTC or USDT (TRC20) to activate quantitative strategies.',
          type: 'success',
          isRead: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch {
        // non-critical
      }

      const createdSnap = await getDoc(doc(db, 'users', uid));
      userData = createdSnap.data() || newUserDoc;
    } else {
      userData = userSnap.data();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, userPath);
  }

  // Ensure wallet exists
  let walletData: Record<string, any> | undefined;
  try {
    const walletSnap = await getDoc(doc(db, 'wallets', uid));
    if (!walletSnap.exists()) {
      const emptyWallet = {
        userId: uid,
        usdAvailable: 0,
        usdLocked: 0,
        btcAvailable: 0,
        btcLocked: 0,
        usdtAvailable: 0,
        usdtLocked: 0,
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'wallets', uid), emptyWallet);
      walletData = emptyWallet;
    } else {
      walletData = walletSnap.data();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, walletPath);
  }

  // Check KYC record directly so latest pending/verified state reflects cleanly
  kycStatus = String(userData?.kycStatus || 'not_submitted');
  try {
    const kycSnap = await getDoc(doc(db, 'kyc_records', uid));
    if (kycSnap.exists()) {
      kycStatus = String(kycSnap.data()?.status || kycStatus);
    }
  } catch {
    // ignore if uncreated
  }

  // If super admin signs in, auto-seed public settings & plans if missing
  if (isSuperAdminEmail(firebaseUser.email) && firebaseUser.emailVerified) {
    void seedFirestoreDefaultsIfAdmin(firebaseUser);
  }

  return {
    user: userDocToUser(uid, userData || {}),
    balances: walletDocToBalances(walletData),
    kycStatus,
  };
}

export async function updateUserProfile(
  uid: string,
  updates: { fullName?: string; phone?: string; country?: string }
): Promise<void> {
  const path = `users/${uid}`;
  const payload: Record<string, any> = { updatedAt: serverTimestamp() };
  if (updates.fullName !== undefined) payload.fullName = clamp(updates.fullName, 120) || 'OX Investor';
  if (updates.phone !== undefined) payload.phone = clamp(updates.phone, 40);
  if (updates.country !== undefined) payload.country = clamp(updates.country, 80);

  try {
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function toggleUser2FA(uid: string, nextEnabled: boolean): Promise<boolean> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      twoFactorEnabled: nextEnabled,
      updatedAt: serverTimestamp(),
    });
    return nextEnabled;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// ---------------------------------------------------------------------------
// Public & Investor Queries / Mutations
// ---------------------------------------------------------------------------

export async function getActivePlans(): Promise<InvestmentPlan[]> {
  const path = 'investment_plans';
  try {
    const q = query(collection(db, path), where('isActive', '==', true));
    const snap = await getDocs(q);
    if (snap.empty) return DEFAULT_PLANS;

    const list: InvestmentPlan[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: String(data.name || ''),
        slug: String(data.slug || d.id),
        tagline: data.tagline || '',
        min_amount: Number(data.minAmount || 100),
        max_amount: Number(data.maxAmount || 10000),
        duration_days: Number(data.durationDays || 30),
        daily_roi: Number(data.dailyRoi || 1.5),
        total_roi: Number(data.totalRoi || 45),
        risk_tier: (data.riskTier as InvestmentPlan['risk_tier']) || 'Moderate',
        management_fee: Number(data.managementFee || 0),
        return_method: String(data.returnMethod || ''),
        description: String(data.description || ''),
        capital_returned: 1,
        is_active: data.isActive ? 1 : 0,
      };
    });

    return list.sort((a, b) => a.min_amount - b.min_amount);
  } catch (err) {
    console.warn('Using fallback investment plans:', err);
    return DEFAULT_PLANS;
  }
}

export async function getPublicPlatformSettings(): Promise<Record<string, string>> {
  const path = 'platform_settings/public';
  try {
    const snap = await getDoc(doc(db, 'platform_settings', 'public'));
    if (!snap.exists()) return { ...DEFAULT_PLATFORM_SETTINGS };
    const data = snap.data();
    const merged: Record<string, string> = { ...DEFAULT_PLATFORM_SETTINGS };
    for (const k of Object.keys(DEFAULT_PLATFORM_SETTINGS)) {
      if (data[k] !== undefined && data[k] !== null && String(data[k]).trim() !== '') {
        merged[k] = String(data[k]);
      }
    }
    return merged;
  } catch {
    return { ...DEFAULT_PLATFORM_SETTINGS };
  }
}

export async function getUserTransactions(
  uid: string,
  filters?: { type?: string; currency?: string }
): Promise<Transaction[]> {
  const path = 'transactions';
  try {
    const q = query(collection(db, path), where('userId', '==', uid));
    const snap = await getDocs(q);
    let items: Transaction[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        transaction_ref: String(data.transactionRef || d.id),
        type: data.type as Transaction['type'],
        currency: String(data.currency || 'USD'),
        amount: Number(data.amount || 0),
        fee: Number(data.fee || 0),
        status: (data.status as Transaction['status']) || 'completed',
        description: String(data.description || ''),
        related_id: data.relatedId || undefined,
        created_at: toIso(data.createdAt),
      };
    });

    if (filters?.type) {
      items = items.filter((t) => t.type === filters.type);
    }
    if (filters?.currency) {
      items = items.filter((t) => t.currency === filters.currency);
    }

    return items.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function getUserOverviewData(uid: string): Promise<{
  total_portfolio_usd: number;
  balances: WalletBalances;
  recent_transactions: Transaction[];
}> {
  const walletPath = `wallets/${uid}`;
  let balances: WalletBalances = walletDocToBalances(undefined);
  try {
    const wSnap = await getDoc(doc(db, 'wallets', uid));
    balances = walletDocToBalances(wSnap.data());
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, walletPath);
  }

  const transactions = await getUserTransactions(uid);
  const totalPortfolioUsd = roundUsd(
    (balances.USD?.total || 0) +
      (balances.USDT?.total || 0) +
      (balances.BTC?.total || 0) * 91500
  );

  return {
    total_portfolio_usd: totalPortfolioUsd,
    balances,
    recent_transactions: transactions.slice(0, 10),
  };
}

export async function getUserInvestments(uid: string): Promise<InvestmentPosition[]> {
  const path = 'investments';
  try {
    const q = query(collection(db, path), where('userId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          user_id: String(data.userId),
          plan_id: String(data.planId),
          plan_name: String(data.planName),
          duration_days: Number(data.durationDays || 30),
          risk_tier: String(data.riskTier || 'Moderate'),
          daily_roi: Number(data.dailyRoi || 1.5),
          capital_amount: Number(data.capitalAmount || 0),
          currency: String(data.currency || 'USD'),
          daily_return: Number(data.dailyReturn || 0),
          total_earned: Number(data.totalEarned || 0),
          start_date: String(data.startDate || toIso(data.createdAt)),
          maturity_date: String(data.maturityDate || toIso(data.createdAt)),
          status: (data.status as InvestmentPosition['status']) || 'active',
          created_at: toIso(data.createdAt),
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createInvestment(params: {
  uid: string;
  plan: InvestmentPlan;
  amount: number;
}): Promise<{ id: string }> {
  const { uid, plan, amount } = params;
  const cleanAmount = roundUsd(amount);
  const planId = String(plan.slug || plan.id);
  const invRef = doc(collection(db, 'investments'));
  const txRef = doc(collection(db, 'transactions'));
  const notifRef = doc(collection(db, 'notifications'));
  const walletRef = doc(db, 'wallets', uid);

  const now = new Date();
  const maturity = new Date(now.getTime() + Math.round(plan.duration_days) * 86400000);
  const dailyReturn = roundUsd((cleanAmount * plan.daily_roi) / 100);

  try {
    await runTransaction(db, async (tx) => {
      const wSnap = await tx.get(walletRef);
      if (!wSnap.exists()) {
        throw new Error('Wallet record not found.');
      }
      const w = wSnap.data();
      const usdAvail = roundUsd(w.usdAvailable || 0);
      if (usdAvail < cleanAmount) {
        throw new Error(`Insufficient USD balance ($${usdAvail.toFixed(2)} available).`);
      }

      tx.update(walletRef, {
        usdAvailable: roundUsd(usdAvail - cleanAmount),
        updatedAt: serverTimestamp(),
      });

      tx.set(invRef, {
        userId: uid,
        planId,
        planName: clamp(plan.name, 120),
        riskTier: clamp(plan.risk_tier, 40),
        durationDays: Math.round(plan.duration_days),
        dailyRoi: Number(plan.daily_roi),
        capitalAmount: cleanAmount,
        currency: 'USD',
        dailyReturn,
        totalEarned: 0,
        startDate: now.toISOString(),
        maturityDate: maturity.toISOString(),
        status: 'active',
        createdAt: serverTimestamp(),
      });

      tx.set(txRef, {
        userId: uid,
        transactionRef: generateRef('INV'),
        type: 'investment_open',
        currency: 'USD',
        amount: cleanAmount,
        fee: 0,
        status: 'completed',
        description: clamp(`Allocated capital into ${plan.name}`, 300),
        relatedId: invRef.id,
        createdAt: serverTimestamp(),
      });

      tx.set(notifRef, {
        userId: uid,
        title: 'Strategy Activated',
        message: clamp(
          `Your $${cleanAmount.toLocaleString()} allocation in ${plan.name} is active (${plan.daily_roi}% daily ROI).`,
          600
        ),
        type: 'success',
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    return { id: invRef.id };
  } catch (err) {
    if (err instanceof Error && (err.message.includes('Insufficient') || err.message.includes('Wallet'))) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `investments/${invRef.id}`);
  }
}

export async function getUserDeposits(uid: string): Promise<Deposit[]> {
  const path = 'deposits';
  try {
    const q = query(collection(db, path), where('userId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          user_id: String(data.userId),
          currency: (data.currency as 'BTC' | 'USDT') || 'BTC',
          network: String(data.network || ''),
          deposit_address: String(data.depositAddress || ''),
          amount: Number(data.amount || 0),
          tx_hash: String(data.txHash || ''),
          proof_note: data.proofNote || undefined,
          status: (data.status as Deposit['status']) || 'pending',
          admin_note: data.adminNote || undefined,
          created_at: toIso(data.createdAt),
          user_name: data.userName || undefined,
          user_email: data.userEmail || undefined,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function submitDeposit(params: {
  uid: string;
  userEmail: string;
  userName: string;
  currency: 'BTC' | 'USDT';
  network: string;
  depositAddress: string;
  amount: number;
  txHash: string;
  proofNote?: string;
}): Promise<{ id: string; status: 'pending' }> {
  const depRef = doc(collection(db, 'deposits'));
  const cleanHash = clamp(params.txHash, 140);
  const cleanAmount = params.currency === 'BTC' ? roundCrypto(params.amount) : roundUsd(params.amount);

  if (cleanHash.length < 10) {
    throw new Error('Transaction hash (TxID) must be at least 10 characters.');
  }
  if (!(cleanAmount > 0)) {
    throw new Error('Deposit amount must be greater than zero.');
  }

  try {
    await setDoc(depRef, {
      userId: params.uid,
      userEmail: clamp(params.userEmail, 200),
      userName: clamp(params.userName, 120),
      currency: params.currency,
      network: clamp(params.network, 40),
      depositAddress: clamp(params.depositAddress, 128),
      amount: cleanAmount,
      txHash: cleanHash,
      proofNote: params.proofNote ? clamp(params.proofNote, 300) : null,
      status: 'pending',
      adminNote: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'notifications'), {
      userId: params.uid,
      title: 'Deposit Submission Logged',
      message: clamp(
        `Your ${cleanAmount} ${params.currency} deposit (${cleanHash.slice(0, 12)}...) is queued for verification.`,
        600
      ),
      type: 'info',
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { id: depRef.id, status: 'pending' };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `deposits/${depRef.id}`);
  }
}

export async function getUserWithdrawals(uid: string): Promise<Withdrawal[]> {
  const path = 'withdrawals';
  try {
    const q = query(collection(db, path), where('userId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          user_id: String(data.userId),
          currency: (data.currency as 'BTC' | 'USDT') || 'USDT',
          network: String(data.network || ''),
          destination_address: String(data.destinationAddress || ''),
          amount: Number(data.amount || 0),
          fee: Number(data.fee || 0),
          net_amount: Number(data.netAmount || 0),
          status: (data.status as Withdrawal['status']) || 'pending',
          admin_note: data.adminNote || undefined,
          payout_tx_hash: data.payoutTxHash || undefined,
          created_at: toIso(data.createdAt),
          updated_at: toIso(data.updatedAt),
          user_name: data.userName || undefined,
          user_email: data.userEmail || undefined,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function submitWithdrawal(params: {
  uid: string;
  userEmail: string;
  userName: string;
  currency: 'BTC' | 'USDT';
  destinationAddress: string;
  amount: number;
  fee: number;
}): Promise<{ id: string }> {
  const { uid, currency, destinationAddress, amount, fee } = params;
  const cleanAddr = clamp(destinationAddress, 128);
  const round = currency === 'BTC' ? roundCrypto : roundUsd;
  const cleanAmount = round(amount);
  const cleanFee = round(fee);
  const netAmount = round(cleanAmount - cleanFee);

  if (cleanAddr.length < 10) {
    throw new Error('Destination wallet address is invalid.');
  }
  if (!(netAmount > 0)) {
    throw new Error('Net withdrawal amount after fee must be positive.');
  }

  const walletRef = doc(db, 'wallets', uid);
  const wthRef = doc(collection(db, 'withdrawals'));
  const txRef = doc(collection(db, 'transactions'));
  const notifRef = doc(collection(db, 'notifications'));
  const network = currency === 'BTC' ? 'Bitcoin' : 'TRON (TRC20)';

  try {
    await runTransaction(db, async (tx) => {
      const wSnap = await tx.get(walletRef);
      if (!wSnap.exists()) throw new Error('Wallet record not found.');
      const w = wSnap.data();

      if (currency === 'BTC') {
        const avail = roundCrypto(w.btcAvailable || 0);
        const locked = roundCrypto(w.btcLocked || 0);
        if (avail < cleanAmount) {
          throw new Error(`Insufficient BTC balance (${avail} BTC available).`);
        }
        tx.update(walletRef, {
          btcAvailable: roundCrypto(avail - cleanAmount),
          btcLocked: roundCrypto(locked + cleanAmount),
          updatedAt: serverTimestamp(),
        });
      } else {
        const avail = roundUsd(w.usdtAvailable || 0);
        const locked = roundUsd(w.usdtLocked || 0);
        if (avail < cleanAmount) {
          throw new Error(`Insufficient USDT balance (${avail} USDT available).`);
        }
        tx.update(walletRef, {
          usdtAvailable: roundUsd(avail - cleanAmount),
          usdtLocked: roundUsd(locked + cleanAmount),
          updatedAt: serverTimestamp(),
        });
      }

      tx.set(wthRef, {
        userId: uid,
        userEmail: clamp(params.userEmail, 200),
        userName: clamp(params.userName, 120),
        currency,
        network,
        destinationAddress: cleanAddr,
        amount: cleanAmount,
        fee: cleanFee,
        netAmount,
        status: 'pending',
        adminNote: null,
        payoutTxHash: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tx.set(txRef, {
        userId: uid,
        transactionRef: generateRef('WTH'),
        type: 'withdrawal',
        currency,
        amount: cleanAmount,
        fee: cleanFee,
        status: 'pending',
        description: clamp(`Withdrawal request to ${cleanAddr.slice(0, 10)}...`, 300),
        relatedId: wthRef.id,
        createdAt: serverTimestamp(),
      });

      tx.set(notifRef, {
        userId: uid,
        title: 'Withdrawal Queued',
        message: clamp(
          `Your ${cleanAmount} ${currency} payout request is locked and pending desk review.`,
          600
        ),
        type: 'info',
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    return { id: wthRef.id };
  } catch (err) {
    if (err instanceof Error && (err.message.includes('Insufficient') || err.message.includes('Wallet'))) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `withdrawals/${wthRef.id}`);
  }
}

export async function getUserKyc(uid: string): Promise<KYCRecord | null> {
  const path = `kyc_records/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'kyc_records', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      user_id: String(data.userId),
      full_legal_name: String(data.fullLegalName || ''),
      date_of_birth: String(data.dateOfBirth || ''),
      residential_address: String(data.residentialAddress || ''),
      city: String(data.city || ''),
      country: String(data.country || ''),
      postal_code: String(data.postalCode || ''),
      id_type: (data.idType as KYCRecord['id_type']) || 'passport',
      id_number: String(data.idNumber || ''),
      id_expiry: data.idExpiry || undefined,
      status: (data.status as KYCRecord['status']) || 'not_submitted',
      admin_note: data.adminNote || undefined,
      created_at: toIso(data.createdAt),
      user_name: data.userName || undefined,
      user_email: data.userEmail || undefined,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function submitKyc(params: {
  uid: string;
  userEmail: string;
  userName: string;
  fullLegalName: string;
  dateOfBirth: string;
  residentialAddress: string;
  city: string;
  country: string;
  postalCode: string;
  idType: 'passport' | 'national_id' | 'drivers_license';
  idNumber: string;
  idExpiry?: string;
}): Promise<void> {
  const path = `kyc_records/${params.uid}`;
  const ref = doc(db, 'kyc_records', params.uid);

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      if (existingSnap.data()?.status === 'verified') {
        throw new Error('Your KYC verification is already approved.');
      }
      await updateDoc(ref, {
        fullLegalName: clamp(params.fullLegalName, 120),
        dateOfBirth: clamp(params.dateOfBirth, 24),
        residentialAddress: clamp(params.residentialAddress, 240),
        city: clamp(params.city, 80),
        country: clamp(params.country, 80),
        postalCode: clamp(params.postalCode, 32),
        idType: params.idType,
        idNumber: clamp(params.idNumber, 80),
        idExpiry: params.idExpiry ? clamp(params.idExpiry, 24) : null,
        status: 'pending',
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        userId: params.uid,
        userEmail: clamp(params.userEmail, 200),
        userName: clamp(params.userName, 120),
        fullLegalName: clamp(params.fullLegalName, 120),
        dateOfBirth: clamp(params.dateOfBirth, 24),
        residentialAddress: clamp(params.residentialAddress, 240),
        city: clamp(params.city, 80),
        country: clamp(params.country, 80),
        postalCode: clamp(params.postalCode, 32),
        idType: params.idType,
        idNumber: clamp(params.idNumber, 80),
        idExpiry: params.idExpiry ? clamp(params.idExpiry, 24) : null,
        status: 'pending',
        adminNote: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('already approved')) throw err;
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserReferrals(uid: string, referralCode: string) {
  const path = 'referrals';
  try {
    const settings = await getPublicPlatformSettings();
    const rate = Number(settings.referral_commission_percent || 5);
    const q = query(collection(db, path), where('referrerId', '==', uid));
    const snap = await getDocs(q);
    const list = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          full_name: String(data.referredName || 'Partner Investor'),
          email: String(data.referredEmail || 'investor@oxtraders.online'),
          active_investments: 0,
          total_commission: Number(data.totalCommission || 0),
          joined_at: toIso(data.createdAt),
        };
      })
      .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime());

    const totalCommission = roundUsd(
      list.reduce((sum, item) => sum + item.total_commission, 0)
    );

    return {
      referral_code: referralCode,
      commission_rate_percent: rate,
      total_referred: list.length,
      active_referred: list.filter((i) => i.total_commission > 0).length,
      total_commission_usd: totalCommission,
      referral_list: list,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function getUserNotifications(uid: string): Promise<NotificationItem[]> {
  const path = 'notifications';
  try {
    const q = query(collection(db, path), where('userId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: String(data.title || ''),
          message: String(data.message || ''),
          type: (data.type as NotificationItem['type']) || 'info',
          is_read: data.isRead ? 1 : 0,
          created_at: toIso(data.createdAt),
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  const path = `notifications/${id}`;
  try {
    await updateDoc(doc(db, 'notifications', id), {
      isRead: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const path = 'notifications';
  try {
    const q = query(collection(db, path), where('userId', '==', uid));
    const snap = await getDocs(q);
    const unread = snap.docs.filter((d) => !d.data().isRead);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    for (const d of unread) {
      batch.update(d.ref, { isRead: true, updatedAt: serverTimestamp() });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function getUserTickets(uid: string): Promise<SupportTicket[]> {
  const path = 'support_tickets';
  try {
    const q = query(collection(db, path), where('userId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ticketDocToModel(d.id, d.data()))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

function ticketDocToModel(id: string, data: Record<string, any>): SupportTicket {
  return {
    id,
    user_id: String(data.userId || ''),
    ticket_code: String(data.ticketCode || id.slice(0, 8).toUpperCase()),
    subject: String(data.subject || ''),
    category: String(data.category || 'general'),
    priority: String(data.priority || 'normal'),
    status: (data.status as SupportTicket['status']) || 'open',
    created_at: toIso(data.createdAt),
    updated_at: toIso(data.updatedAt),
    message_count: Number(data.messageCount || 1),
    user_name: data.userName || undefined,
    user_email: data.userEmail || undefined,
  };
}

export async function getTicketMessages(ticketId: string): Promise<SupportMessage[]> {
  const path = `support_tickets/${ticketId}/messages`;
  try {
    const snap = await getDocs(collection(db, 'support_tickets', ticketId, 'messages'));
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          ticket_id: ticketId,
          sender_role: (data.senderRole as 'user' | 'admin') || 'user',
          sender_name: String(data.senderName || 'Investor'),
          message: String(data.message || ''),
          created_at: toIso(data.createdAt),
        };
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createSupportTicket(params: {
  uid: string;
  userEmail: string;
  userName: string;
  subject: string;
  category: 'deposit' | 'withdrawal' | 'investment' | 'kyc' | 'security' | 'general';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  message: string;
}): Promise<string> {
  const ticketRef = doc(collection(db, 'support_tickets'));
  const msgRef = doc(collection(db, 'support_tickets', ticketRef.id, 'messages'));
  const code = generateRef('TKT').slice(0, 12);

  try {
    await setDoc(ticketRef, {
      userId: params.uid,
      userEmail: clamp(params.userEmail, 200),
      userName: clamp(params.userName, 120),
      ticketCode: code,
      subject: clamp(params.subject, 180),
      category: params.category,
      priority: params.priority,
      status: 'open',
      messageCount: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(msgRef, {
      ticketId: ticketRef.id,
      senderRole: 'user',
      senderName: clamp(params.userName, 120),
      message: clamp(params.message, 2000),
      createdAt: serverTimestamp(),
    });

    return ticketRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `support_tickets/${ticketRef.id}`);
  }
}

export async function replyToSupportTicket(params: {
  ticketId: string;
  senderName: string;
  message: string;
  currentMessageCount: number;
}): Promise<void> {
  const path = `support_tickets/${params.ticketId}/messages`;
  try {
    await addDoc(collection(db, 'support_tickets', params.ticketId, 'messages'), {
      ticketId: params.ticketId,
      senderRole: 'user',
      senderName: clamp(params.senderName, 120),
      message: clamp(params.message, 2000),
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'support_tickets', params.ticketId), {
      status: 'open',
      messageCount: Math.max(1, Math.round(params.currentMessageCount + 1)),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// ---------------------------------------------------------------------------
// Admin Control Center Operations
// ---------------------------------------------------------------------------

async function writeAuditLog(params: {
  action: string;
  targetType: string;
  targetId?: string;
  details: string;
}): Promise<void> {
  const adminUser = auth.currentUser;
  if (!adminUser) return;
  try {
    await addDoc(collection(db, 'admin_audit_logs'), {
      adminId: adminUser.uid,
      adminEmail: clamp(adminUser.email || MASTER_ADMIN_EMAIL, 200),
      action: clamp(params.action, 80),
      targetType: clamp(params.targetType, 60),
      targetId: params.targetId ? clamp(params.targetId, 128) : null,
      details: clamp(params.details, 1200),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Audit log write issue:', err);
  }
}

export async function getAdminMetrics() {
  try {
    const [usersSnap, depositsSnap, withdrawalsSnap, invSnap, logsSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'deposits')),
      getDocs(collection(db, 'withdrawals')),
      getDocs(collection(db, 'investments')),
      getDocs(collection(db, 'admin_audit_logs')),
    ]);

    const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, any>));
    const deposits = depositsSnap.docs.map((d) => d.data());
    const withdrawals = withdrawalsSnap.docs.map((d) => d.data());
    const investments = invSnap.docs.map((d) => d.data());
    const logs = logsSnap.docs
      .map((d) => ({
        id: d.id,
        action: String(d.data().action || ''),
        details: String(d.data().details || ''),
        created_at: toIso(d.data().createdAt),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const recentRegistrations = users
      .map((u) => ({
        id: u.id,
        full_name: String(u.fullName || ''),
        email: String(u.email || ''),
        status: String(u.status || 'active'),
        created_at: toIso(u.createdAt),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);

    return {
      users: {
        total: users.length,
        verified: users.filter((u) => u.kycStatus === 'verified').length,
        pending_kyc: users.filter((u) => u.kycStatus === 'pending').length,
      },
      deposits: {
        pending_count: deposits.filter((d) => d.status === 'pending' || d.status === 'verifying').length,
        confirmed_count: deposits.filter((d) => d.status === 'confirmed').length,
        total_amount: roundUsd(
          deposits
            .filter((d) => d.status === 'confirmed')
            .reduce((s, d) => s + Number(d.amount || 0) * (d.currency === 'BTC' ? 91500 : 1), 0)
        ),
      },
      withdrawals: {
        pending_count: withdrawals.filter((w) =>
          ['pending', 'under_review', 'approved', 'processing'].includes(String(w.status))
        ).length,
        completed_count: withdrawals.filter((w) => w.status === 'completed').length,
        total_amount: roundUsd(
          withdrawals
            .filter((w) => w.status === 'completed')
            .reduce((s, w) => s + Number(w.amount || 0) * (w.currency === 'BTC' ? 91500 : 1), 0)
        ),
      },
      investments: {
        active_count: investments.filter((i) => i.status === 'active').length,
        active_capital: roundUsd(
          investments
            .filter((i) => i.status === 'active')
            .reduce((s, i) => s + Number(i.capitalAmount || 0), 0)
        ),
      },
      recent_registrations: recentRegistrations,
      recent_audit_logs: logs.slice(0, 8),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'admin_metrics');
  }
}

export async function getAdminUsers(filters?: { search?: string; status?: string }) {
  const path = 'users';
  try {
    const [usersSnap, walletsSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'wallets')),
    ]);

    const walletMap = new Map<string, Record<string, any>>();
    for (const w of walletsSnap.docs) {
      walletMap.set(w.id, w.data());
    }

    let list = usersSnap.docs.map((d) => {
      const data = d.data();
      const w = walletMap.get(d.id);
      return {
        id: d.id,
        full_name: String(data.fullName || ''),
        email: String(data.email || ''),
        phone: String(data.phone || ''),
        country: String(data.country || ''),
        kyc_status: String(data.kycStatus || 'not_submitted'),
        status: String(data.status || 'active'),
        usd_balance: roundUsd((w?.usdAvailable || 0) + (w?.usdLocked || 0)),
        btc_balance: roundCrypto((w?.btcAvailable || 0) + (w?.btcLocked || 0)),
        usdt_balance: roundUsd((w?.usdtAvailable || 0) + (w?.usdtLocked || 0)),
        created_at: toIso(data.createdAt),
      };
    });

    if (filters?.status) {
      list = list.filter((u) => u.status === filters.status);
    }
    if (filters?.search) {
      const term = filters.search.toLowerCase();
      list = list.filter(
        (u) =>
          u.full_name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.id.toLowerCase().includes(term)
      );
    }

    return list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function getAdminUserDetail(uid: string) {
  const path = `users/${uid}`;
  try {
    const [userSnap, walletSnap, invList, txList] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDoc(doc(db, 'wallets', uid)),
      getUserInvestments(uid),
      getUserTransactions(uid),
    ]);

    if (!userSnap.exists()) throw new Error('User not found.');
    return {
      user: userDocToUser(uid, userSnap.data()),
      balances: walletDocToBalances(walletSnap.data()),
      investments: invList,
      transactions: txList,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function updateAdminUserStatus(
  uid: string,
  status: 'active' | 'suspended' | 'restricted',
  reason: string
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      status,
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog({
      action: 'USER_STATUS_UPDATED',
      targetType: 'user',
      targetId: uid,
      details: `Set account status to ${status.toUpperCase()}. Reason: ${reason}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function adjustUserBalance(params: {
  uid: string;
  currency: 'USD' | 'BTC' | 'USDT';
  type: 'credit' | 'debit';
  amount: number;
  reason: string;
}): Promise<{ ref: string }> {
  const { uid, currency, type, amount, reason } = params;
  const round = currency === 'BTC' ? roundCrypto : roundUsd;
  const cleanAmount = round(amount);
  if (!(cleanAmount > 0)) throw new Error('Adjustment amount must be positive.');

  const walletRef = doc(db, 'wallets', uid);
  const txRef = doc(collection(db, 'transactions'));
  const notifRef = doc(collection(db, 'notifications'));
  const refCode = generateRef('ADJ');

  try {
    await runTransaction(db, async (tx) => {
      const wSnap = await tx.get(walletRef);
      const w = wSnap.exists()
        ? wSnap.data()
        : {
            userId: uid,
            usdAvailable: 0,
            usdLocked: 0,
            btcAvailable: 0,
            btcLocked: 0,
            usdtAvailable: 0,
            usdtLocked: 0,
          };

      const field =
        currency === 'USD'
          ? 'usdAvailable'
          : currency === 'BTC'
          ? 'btcAvailable'
          : 'usdtAvailable';
      const currentAvail = round(w[field] || 0);

      let nextAvail: number;
      if (type === 'credit') {
        nextAvail = round(currentAvail + cleanAmount);
      } else {
        if (currentAvail < cleanAmount) {
          throw new Error(`Insufficient ${currency} available balance (${currentAvail}).`);
        }
        nextAvail = round(currentAvail - cleanAmount);
      }

      if (wSnap.exists()) {
        tx.update(walletRef, {
          [field]: nextAvail,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(walletRef, {
          ...w,
          [field]: nextAvail,
          updatedAt: serverTimestamp(),
        });
      }

      tx.set(txRef, {
        userId: uid,
        transactionRef: refCode,
        type: type === 'credit' ? 'balance_credit' : 'balance_debit',
        currency,
        amount: cleanAmount,
        fee: 0,
        status: 'completed',
        description: clamp(reason, 300),
        relatedId: refCode,
        createdAt: serverTimestamp(),
      });

      tx.set(notifRef, {
        userId: uid,
        title: type === 'credit' ? 'Account Balance Credited' : 'Account Balance Adjusted',
        message: clamp(
          `${type === 'credit' ? '+' : '-'}${cleanAmount} ${currency}: ${reason}`,
          600
        ),
        type: type === 'credit' ? 'success' : 'warning',
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await writeAuditLog({
      action: `BALANCE_${type.toUpperCase()}`,
      targetType: 'wallet',
      targetId: uid,
      details: `${type.toUpperCase()} ${cleanAmount} ${currency}. Reason: ${reason} (${refCode})`,
    });

    return { ref: refCode };
  } catch (err) {
    if (err instanceof Error && err.message.includes('Insufficient')) throw err;
    handleFirestoreError(err, OperationType.WRITE, `wallets/${uid}`);
  }
}

export async function sendUserNotification(params: {
  uid: string;
  title: string;
  message: string;
  type?: 'success' | 'warning' | 'info' | 'security';
}): Promise<void> {
  const path = 'notifications';
  try {
    await addDoc(collection(db, path), {
      userId: params.uid,
      title: clamp(params.title, 160),
      message: clamp(params.message, 600),
      type: params.type || 'info',
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog({
      action: 'NOTIFICATION_SENT',
      targetType: 'user',
      targetId: params.uid,
      details: `Delivered notification: ${params.title}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function getAdminDeposits(statusFilter?: string): Promise<Deposit[]> {
  const path = 'deposits';
  try {
    const snap = await getDocs(collection(db, path));
    let items: Deposit[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        user_id: String(data.userId),
        currency: (data.currency as 'BTC' | 'USDT') || 'BTC',
        network: String(data.network || ''),
        deposit_address: String(data.depositAddress || ''),
        amount: Number(data.amount || 0),
        tx_hash: String(data.txHash || ''),
        proof_note: data.proofNote || undefined,
        status: (data.status as Deposit['status']) || 'pending',
        admin_note: data.adminNote || undefined,
        created_at: toIso(data.createdAt),
        user_name: data.userName || undefined,
        user_email: data.userEmail || undefined,
      };
    });

    if (statusFilter) items = items.filter((d) => d.status === statusFilter);
    return items.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function approveDeposit(depositId: string): Promise<void> {
  const depRef = doc(db, 'deposits', depositId);
  const txRef = doc(collection(db, 'transactions'));
  const notifRef = doc(collection(db, 'notifications'));

  let logDetails = '';
  try {
    await runTransaction(db, async (tx) => {
      const depSnap = await tx.get(depRef);
      if (!depSnap.exists()) throw new Error('Deposit not found.');
      const dep = depSnap.data();
      if (!['pending', 'verifying'].includes(String(dep.status))) {
        throw new Error('Deposit already resolved.');
      }

      const uid = String(dep.userId);
      const currency = dep.currency as 'BTC' | 'USDT';
      const round = currency === 'BTC' ? roundCrypto : roundUsd;
      const amount = round(dep.amount);
      const walletRef = doc(db, 'wallets', uid);
      const wSnap = await tx.get(walletRef);
      const w = wSnap.exists()
        ? wSnap.data()
        : {
            userId: uid,
            usdAvailable: 0,
            usdLocked: 0,
            btcAvailable: 0,
            btcLocked: 0,
            usdtAvailable: 0,
            usdtLocked: 0,
          };

      const field = currency === 'BTC' ? 'btcAvailable' : 'usdtAvailable';
      const nextBal = round((w[field] || 0) + amount);

      tx.update(depRef, {
        status: 'confirmed',
        adminNote: 'Confirmed on blockchain and credited to wallet balance.',
        updatedAt: serverTimestamp(),
      });

      if (wSnap.exists()) {
        tx.update(walletRef, { [field]: nextBal, updatedAt: serverTimestamp() });
      } else {
        tx.set(walletRef, { ...w, [field]: nextBal, updatedAt: serverTimestamp() });
      }

      tx.set(txRef, {
        userId: uid,
        transactionRef: generateRef('DEP'),
        type: 'deposit',
        currency,
        amount,
        fee: 0,
        status: 'completed',
        description: clamp(`Confirmed ${currency} deposit (${String(dep.txHash).slice(0, 12)}...)`, 300),
        relatedId: depositId,
        createdAt: serverTimestamp(),
      });

      tx.set(notifRef, {
        userId: uid,
        title: `${currency} Deposit Confirmed`,
        message: clamp(
          `Your deposit of ${amount} ${currency} has been verified and credited to your wallet.`,
          600
        ),
        type: 'success',
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      logDetails = `Approved ${amount} ${currency} deposit for ${dep.userEmail || uid}`;
    });

    await writeAuditLog({
      action: 'DEPOSIT_APPROVED',
      targetType: 'deposit',
      targetId: depositId,
      details: logDetails,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `deposits/${depositId}`);
  }
}

export async function rejectDeposit(depositId: string, reason: string): Promise<void> {
  const depRef = doc(db, 'deposits', depositId);
  try {
    const depSnap = await getDoc(depRef);
    if (!depSnap.exists()) throw new Error('Deposit not found.');
    const dep = depSnap.data();

    await updateDoc(depRef, {
      status: 'rejected',
      adminNote: clamp(reason, 400),
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'notifications'), {
      userId: String(dep.userId),
      title: 'Deposit Rejected',
      message: clamp(`Your ${dep.currency} deposit could not be verified: ${reason}`, 600),
      type: 'warning',
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await writeAuditLog({
      action: 'DEPOSIT_REJECTED',
      targetType: 'deposit',
      targetId: depositId,
      details: `Rejected ${dep.amount} ${dep.currency} deposit. Reason: ${reason}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `deposits/${depositId}`);
  }
}

export async function getAdminWithdrawals(statusFilter?: string): Promise<Withdrawal[]> {
  const path = 'withdrawals';
  try {
    const snap = await getDocs(collection(db, path));
    let items: Withdrawal[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        user_id: String(data.userId),
        currency: (data.currency as 'BTC' | 'USDT') || 'USDT',
        network: String(data.network || ''),
        destination_address: String(data.destinationAddress || ''),
        amount: Number(data.amount || 0),
        fee: Number(data.fee || 0),
        net_amount: Number(data.netAmount || 0),
        status: (data.status as Withdrawal['status']) || 'pending',
        admin_note: data.adminNote || undefined,
        payout_tx_hash: data.payoutTxHash || undefined,
        created_at: toIso(data.createdAt),
        updated_at: toIso(data.updatedAt),
        user_name: data.userName || undefined,
        user_email: data.userEmail || undefined,
      };
    });

    if (statusFilter) items = items.filter((w) => w.status === statusFilter);
    return items.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function approveWithdrawal(withdrawalId: string): Promise<void> {
  const path = `withdrawals/${withdrawalId}`;
  try {
    await updateDoc(doc(db, 'withdrawals', withdrawalId), {
      status: 'processing',
      adminNote: 'Approved for blockchain payout broadcasting.',
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog({
      action: 'WITHDRAWAL_APPROVED',
      targetType: 'withdrawal',
      targetId: withdrawalId,
      details: `Moved withdrawal ${withdrawalId} to processing queue`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function completeWithdrawal(
  withdrawalId: string,
  payoutTxHash: string
): Promise<void> {
  const wthRef = doc(db, 'withdrawals', withdrawalId);
  const notifRef = doc(collection(db, 'notifications'));
  const cleanHash = clamp(payoutTxHash, 140);
  let logDetails = '';

  try {
    await runTransaction(db, async (tx) => {
      const wthSnap = await tx.get(wthRef);
      if (!wthSnap.exists()) throw new Error('Withdrawal not found.');
      const wth = wthSnap.data();

      const uid = String(wth.userId);
      const currency = wth.currency as 'BTC' | 'USDT';
      const round = currency === 'BTC' ? roundCrypto : roundUsd;
      const amount = round(wth.amount);

      const walletRef = doc(db, 'wallets', uid);
      const wSnap = await tx.get(walletRef);
      if (wSnap.exists()) {
        const w = wSnap.data();
        const lockField = currency === 'BTC' ? 'btcLocked' : 'usdtLocked';
        const nextLocked = Math.max(0, round((w[lockField] || 0) - amount));
        tx.update(walletRef, {
          [lockField]: nextLocked,
          updatedAt: serverTimestamp(),
        });
      }

      tx.update(wthRef, {
        status: 'completed',
        payoutTxHash: cleanHash,
        adminNote: 'Broadcasted to network and settled.',
        updatedAt: serverTimestamp(),
      });

      tx.set(notifRef, {
        userId: uid,
        title: `${currency} Withdrawal Completed`,
        message: clamp(
          `Your withdrawal of ${wth.netAmount} ${currency} has been broadcasted (TxID: ${cleanHash.slice(0, 12)}...).`,
          600
        ),
        type: 'success',
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      logDetails = `Completed ${wth.netAmount} ${currency} withdrawal (${cleanHash})`;
    });

    await writeAuditLog({
      action: 'WITHDRAWAL_COMPLETED',
      targetType: 'withdrawal',
      targetId: withdrawalId,
      details: logDetails,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `withdrawals/${withdrawalId}`);
  }
}

export async function rejectWithdrawal(withdrawalId: string, reason: string): Promise<void> {
  const wthRef = doc(db, 'withdrawals', withdrawalId);
  const txRef = doc(collection(db, 'transactions'));
  const notifRef = doc(collection(db, 'notifications'));
  let logDetails = '';

  try {
    await runTransaction(db, async (tx) => {
      const wthSnap = await tx.get(wthRef);
      if (!wthSnap.exists()) throw new Error('Withdrawal not found.');
      const wth = wthSnap.data();

      const uid = String(wth.userId);
      const currency = wth.currency as 'BTC' | 'USDT';
      const round = currency === 'BTC' ? roundCrypto : roundUsd;
      const amount = round(wth.amount);

      const walletRef = doc(db, 'wallets', uid);
      const wSnap = await tx.get(walletRef);
      if (wSnap.exists()) {
        const w = wSnap.data();
        const availField = currency === 'BTC' ? 'btcAvailable' : 'usdtAvailable';
        const lockField = currency === 'BTC' ? 'btcLocked' : 'usdtLocked';
        const refunded = Math.min(amount, round(w[lockField] || 0));
        tx.update(walletRef, {
          [availField]: round((w[availField] || 0) + refunded),
          [lockField]: Math.max(0, round((w[lockField] || 0) - refunded)),
          updatedAt: serverTimestamp(),
        });
      }

      tx.update(wthRef, {
        status: 'rejected',
        adminNote: clamp(reason, 400),
        updatedAt: serverTimestamp(),
      });

      tx.set(txRef, {
        userId: uid,
        transactionRef: generateRef('RFD'),
        type: 'balance_credit',
        currency,
        amount,
        fee: 0,
        status: 'completed',
        description: clamp(`Withdrawal rejected & refunded: ${reason}`, 300),
        relatedId: withdrawalId,
        createdAt: serverTimestamp(),
      });

      tx.set(notifRef, {
        userId: uid,
        title: `${currency} Withdrawal Refunded`,
        message: clamp(
          `Your ${amount} ${currency} withdrawal was rejected and returned to available balance: ${reason}`,
          600
        ),
        type: 'warning',
        isRead: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      logDetails = `Rejected withdrawal ${withdrawalId} (${amount} ${currency}). Refunded. Reason: ${reason}`;
    });

    await writeAuditLog({
      action: 'WITHDRAWAL_REJECTED',
      targetType: 'withdrawal',
      targetId: withdrawalId,
      details: logDetails,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `withdrawals/${withdrawalId}`);
  }
}

export async function getAdminKycList(statusFilter?: string): Promise<KYCRecord[]> {
  const path = 'kyc_records';
  try {
    const snap = await getDocs(collection(db, path));
    let items: KYCRecord[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        user_id: String(data.userId),
        full_legal_name: String(data.fullLegalName || ''),
        date_of_birth: String(data.dateOfBirth || ''),
        residential_address: String(data.residentialAddress || ''),
        city: String(data.city || ''),
        country: String(data.country || ''),
        postal_code: String(data.postalCode || ''),
        id_type: (data.idType as KYCRecord['id_type']) || 'passport',
        id_number: String(data.idNumber || ''),
        id_expiry: data.idExpiry || undefined,
        status: (data.status as KYCRecord['status']) || 'pending',
        admin_note: data.adminNote || undefined,
        created_at: toIso(data.createdAt),
        user_name: data.userName || undefined,
        user_email: data.userEmail || undefined,
      };
    });

    if (statusFilter) items = items.filter((k) => k.status === statusFilter);
    return items.sort(
      (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function reviewKyc(params: {
  uid: string;
  status: 'verified' | 'rejected' | 'additional_info_required';
  adminNote: string;
}): Promise<void> {
  const kycRef = doc(db, 'kyc_records', params.uid);
  const userRef = doc(db, 'users', params.uid);

  try {
    await updateDoc(kycRef, {
      status: params.status,
      adminNote: clamp(params.adminNote, 400),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(userRef, {
      kycStatus: params.status,
      isVerified: params.status === 'verified',
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, 'notifications'), {
      userId: params.uid,
      title: `KYC Verification: ${params.status.replace(/_/g, ' ').toUpperCase()}`,
      message: clamp(params.adminNote, 600),
      type: params.status === 'verified' ? 'success' : 'warning',
      isRead: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await writeAuditLog({
      action: `KYC_${params.status.toUpperCase()}`,
      targetType: 'kyc',
      targetId: params.uid,
      details: `Set KYC status to ${params.status}. Note: ${params.adminNote}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `kyc_records/${params.uid}`);
  }
}

export async function getAdminPlans(): Promise<InvestmentPlan[]> {
  const path = 'investment_plans';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) return DEFAULT_PLANS;
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name || ''),
          slug: String(data.slug || d.id),
          tagline: data.tagline || '',
          min_amount: Number(data.minAmount || 100),
          max_amount: Number(data.maxAmount || 10000),
          duration_days: Number(data.durationDays || 30),
          daily_roi: Number(data.dailyRoi || 1.5),
          total_roi: Number(data.totalRoi || 45),
          risk_tier: (data.riskTier as InvestmentPlan['risk_tier']) || 'Moderate',
          management_fee: Number(data.managementFee || 0),
          return_method: String(data.returnMethod || ''),
          description: String(data.description || ''),
          capital_returned: 1,
          is_active: data.isActive ? 1 : 0,
        };
      })
      .sort((a, b) => a.min_amount - b.min_amount);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveAdminPlan(plan: Partial<InvestmentPlan>): Promise<void> {
  const rawSlug =
    plan.slug ||
    String(plan.name || 'ox-plan')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const slug = clamp(rawSlug || `ox-plan-${Date.now()}`, 120);
  const path = `investment_plans/${slug}`;

  const payload = {
    name: clamp(plan.name || 'OX Strategy', 120),
    slug,
    tagline: clamp(plan.tagline || '', 240),
    minAmount: Math.max(1, Number(plan.min_amount || 100)),
    maxAmount: Math.max(Number(plan.min_amount || 100), Number(plan.max_amount || 25000)),
    durationDays: Math.max(1, Math.round(Number(plan.duration_days || 30))),
    dailyRoi: Math.max(0.01, Number(plan.daily_roi || 1.5)),
    totalRoi: Math.max(0.01, Number(plan.total_roi || 45)),
    riskTier: plan.risk_tier || 'Moderate',
    managementFee: Math.max(0, Number(plan.management_fee || 0)),
    returnMethod: clamp(plan.return_method || 'Daily yield accrual', 200),
    description: clamp(plan.description || 'Quantitative strategy.', 1000),
    isActive: plan.is_active === 1 || plan.is_active === undefined,
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'investment_plans', slug), payload, { merge: true });
    await writeAuditLog({
      action: 'PLAN_SAVED',
      targetType: 'investment_plan',
      targetId: slug,
      details: `Saved strategy plan "${payload.name}" (${payload.dailyRoi}% daily / ${payload.durationDays}d)`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getAdminTickets(): Promise<SupportTicket[]> {
  const path = 'support_tickets';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs
      .map((d) => ticketDocToModel(d.id, d.data()))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function replyAdminTicket(params: {
  ticketId: string;
  message: string;
  status: string;
  currentMessageCount: number;
}): Promise<void> {
  const path = `support_tickets/${params.ticketId}/messages`;
  try {
    await addDoc(collection(db, 'support_tickets', params.ticketId, 'messages'), {
      ticketId: params.ticketId,
      senderRole: 'admin',
      senderName: 'OX TRADERS Compliance Desk',
      message: clamp(params.message, 2000),
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'support_tickets', params.ticketId), {
      status: params.status || 'in_progress',
      messageCount: Math.max(1, Math.round(params.currentMessageCount + 1)),
      updatedAt: serverTimestamp(),
    });

    await writeAuditLog({
      action: 'TICKET_REPLIED',
      targetType: 'support_ticket',
      targetId: params.ticketId,
      details: `Admin replied and set ticket status to ${params.status}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function getAdminSettingsAndStats() {
  try {
    const [settingsMap, usersSnap, depositsSnap, withdrawalsSnap, invSnap] = await Promise.all([
      getPublicPlatformSettings(),
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'deposits')),
      getDocs(collection(db, 'withdrawals')),
      getDocs(collection(db, 'investments')),
    ]);

    const settingsList = Object.entries(settingsMap).map(([key, value]) => ({ key, value }));
    return {
      settings: settingsList,
      dbStatus: {
        engine: 'Firebase Cloud Firestore',
        persistent: true,
        label: `Cloud Firestore Permanent • Project ${FIREBASE_PROJECT_ID}`,
        projectId: FIREBASE_PROJECT_ID,
        databaseId: FIRESTORE_DATABASE_ID,
        counts: {
          users: usersSnap.size,
          deposits: depositsSnap.size,
          withdrawals: withdrawalsSnap.size,
          investments: invSnap.size,
        },
      },
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, 'platform_settings/public');
  }
}

export async function saveAdminSettings(settingsMap: Record<string, string>): Promise<void> {
  const path = 'platform_settings/public';
  const payload = {
    company_name: clamp(settingsMap.company_name || 'OX TRADERS', 80),
    support_email: clamp(settingsMap.support_email || 'support@oxtraders.online', 120),
    btc_deposit_address: clamp(
      settingsMap.btc_deposit_address || DEFAULT_PLATFORM_SETTINGS.btc_deposit_address,
      128
    ),
    usdt_deposit_address: clamp(
      settingsMap.usdt_deposit_address || DEFAULT_PLATFORM_SETTINGS.usdt_deposit_address,
      128
    ),
    btc_min_deposit: clamp(settingsMap.btc_min_deposit || '0.001', 32),
    usdt_min_deposit: clamp(settingsMap.usdt_min_deposit || '50.0', 32),
    btc_min_withdrawal: clamp(settingsMap.btc_min_withdrawal || '0.002', 32),
    usdt_min_withdrawal: clamp(settingsMap.usdt_min_withdrawal || '25.0', 32),
    btc_withdrawal_fee: clamp(settingsMap.btc_withdrawal_fee || '0.00035', 32),
    usdt_withdrawal_fee: clamp(settingsMap.usdt_withdrawal_fee || '1.50', 32),
    referral_commission_percent: clamp(settingsMap.referral_commission_percent || '5.0', 16),
    kyc_mandatory_for_withdrawal:
      settingsMap.kyc_mandatory_for_withdrawal === 'false' ? 'false' : 'true',
    maintenance_mode: settingsMap.maintenance_mode === 'true' ? 'true' : 'false',
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'platform_settings', 'public'), payload, { merge: true });
    await writeAuditLog({
      action: 'PLATFORM_SETTINGS_UPDATED',
      targetType: 'platform_settings',
      targetId: 'public',
      details: 'Updated custodial deposit addresses, minimums, fees, and compliance settings.',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function exportFirestoreSnapshot() {
  try {
    const [users, wallets, deposits, withdrawals, investments, transactions, plans, kyc, tickets] =
      await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'wallets')),
        getDocs(collection(db, 'deposits')),
        getDocs(collection(db, 'withdrawals')),
        getDocs(collection(db, 'investments')),
        getDocs(collection(db, 'transactions')),
        getDocs(collection(db, 'investment_plans')),
        getDocs(collection(db, 'kyc_records')),
        getDocs(collection(db, 'support_tickets')),
      ]);

    const serialize = (snap: any) =>
      snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    return {
      exportedAt: new Date().toISOString(),
      projectId: FIREBASE_PROJECT_ID,
      databaseId: FIRESTORE_DATABASE_ID,
      collections: {
        users: serialize(users),
        wallets: serialize(wallets),
        deposits: serialize(deposits),
        withdrawals: serialize(withdrawals),
        investments: serialize(investments),
        transactions: serialize(transactions),
        investment_plans: serialize(plans),
        kyc_records: serialize(kyc),
        support_tickets: serialize(tickets),
      },
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'firestore_export');
  }
}

export async function getAdminAuditLogs(): Promise<AdminAuditLog[]> {
  const path = 'admin_audit_logs';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs
      .map((d) => {
        const data = d.data();
        return {
          id: d.id,
          admin_id: String(data.adminId || ''),
          admin_email: String(data.adminEmail || MASTER_ADMIN_EMAIL),
          action: String(data.action || ''),
          target_type: String(data.targetType || ''),
          target_id: data.targetId || undefined,
          details: data.details || undefined,
          created_at: toIso(data.createdAt),
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}
