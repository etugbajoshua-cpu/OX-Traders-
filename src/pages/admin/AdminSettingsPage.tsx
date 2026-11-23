import React, { useEffect, useState } from 'react';
import {
  AdminOperatorRecord,
  DEFAULT_PLATFORM_SETTINGS,
  exportFirestoreSnapshot,
  getAdminSettingsAndStats,
  getAuthorizedOperators,
  grantAdminOperator,
  revokeAdminOperator,
  saveAdminSettings,
  syncVerifiedWithdrawalsToPublicFeed,
} from '../../lib/firestoreService.ts';
import {
  generateRandomDemoNotification,
  SETTINGS_UPDATED_EVENT,
  triggerWithdrawalNotificationPreview,
  WithdrawalNotificationCard,
  WithdrawalToastItem,
} from '../../components/common/FloatingWithdrawalNotifications.tsx';
import { useAdminAuth } from '../../context/AdminAuthContext.tsx';
import {
  Save,
  CheckCircle2,
  Key,
  Shield,
  Settings,
  Database,
  Download,
  AlertTriangle,
  Copy,
  Check,
  Globe,
  UserPlus,
  Trash2,
  BellRing,
  Eye,
  RefreshCw,
  Shuffle
} from 'lucide-react';

interface DbStatus {
  engine: string;
  persistent: boolean;
  label: string;
  projectId?: string;
  databaseId?: string;
  counts?: {
    users: number;
    deposits: number;
    withdrawals: number;
    investments: number;
  };
}

export const AdminSettingsPage: React.FC = () => {
  const { admin } = useAdminAuth();
  const [settings, setSettings] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [operators, setOperators] = useState<AdminOperatorRecord[]>([]);
  const [newOpUid, setNewOpUid] = useState('');
  const [newOpEmail, setNewOpEmail] = useState('');
  const [opSaving, setOpSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [syncingFeed, setSyncingFeed] = useState(false);
  const [previewMode, setPreviewMode] = useState<'demo' | 'live'>('demo');
  const [previewSample, setPreviewSample] = useState<WithdrawalToastItem>(() =>
    generateRandomDemoNotification(['completed', 'processing'])
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const fetchSettingsAndDb = async () => {
    try {
      setLoading(true);
      const [data, ops] = await Promise.all([
        getAdminSettingsAndStats(),
        getAuthorizedOperators().catch(() => [] as AdminOperatorRecord[]),
      ]);
      setSettings(data.settings || []);
      setDbStatus(data.dbStatus);
      setOperators(ops);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndDb();
  }, []);

  const handleGrantOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    setOpSaving(true);
    setErrorNotice(null);
    setSavedNotice(null);
    try {
      await grantAdminOperator({ uid: newOpUid, email: newOpEmail });
      setNewOpUid('');
      setNewOpEmail('');
      const ops = await getAuthorizedOperators();
      setOperators(ops);
      setSavedNotice('Operator access granted and recorded in immutable audit log.');
      setTimeout(() => setSavedNotice(null), 4000);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to grant operator access');
    } finally {
      setOpSaving(false);
    }
  };

  const handleRevokeOperator = async (uid: string) => {
    setErrorNotice(null);
    setSavedNotice(null);
    try {
      await revokeAdminOperator(uid);
      const ops = await getAuthorizedOperators();
      setOperators(ops);
      setSavedNotice('Operator access revoked.');
      setTimeout(() => setSavedNotice(null), 4000);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to revoke operator access');
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setSettings((prev) => {
      const exists = prev.some((s) => s.key === key);
      if (exists) {
        return prev.map((s) => (s.key === key ? { ...s, value } : s));
      }
      return [...prev, { key, value }];
    });
  };

  const settingMap: Record<string, string> = {};
  for (const cur of settings) {
    settingMap[cur.key] = cur.value;
  }

  const selectedToastStatuses = String(
    settingMap.withdrawal_toast_statuses ?? DEFAULT_PLATFORM_SETTINGS.withdrawal_toast_statuses
  )
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is 'approved' | 'processing' | 'completed' =>
      s === 'approved' || s === 'processing' || s === 'completed'
    );

  const handleToggleToastStatus = (status: 'approved' | 'processing' | 'completed') => {
    const current = new Set(
      selectedToastStatuses.length > 0 ? selectedToastStatuses : ['completed', 'processing']
    );
    if (current.has(status)) {
      if (current.size === 1) {
        setErrorNotice('Select at least one verified withdrawal status to display.');
        setTimeout(() => setErrorNotice(null), 3000);
        return;
      }
      current.delete(status);
    } else {
      current.add(status);
    }
    handleValueChange('withdrawal_toast_statuses', Array.from(current).join(','));
  };

  const handleRandomizePreview = (mode: 'demo' | 'live' = previewMode, forcedStatus?: 'approved' | 'processing' | 'completed') => {
    const statuses =
      forcedStatus
        ? [forcedStatus]
        : selectedToastStatuses.length > 0
          ? selectedToastStatuses
          : (['completed', 'processing'] as Array<'approved' | 'processing' | 'completed'>);
    const sample = generateRandomDemoNotification(statuses, previewSample.maskedIdentifier);
    setPreviewMode(mode);
    setPreviewSample({
      ...sample,
      isDemo: mode === 'demo',
    });
  };

  const handleSyncPublicFeed = async () => {
    setSyncingFeed(true);
    setSavedNotice(null);
    setErrorNotice(null);
    try {
      const count = await syncVerifiedWithdrawalsToPublicFeed();
      setSavedNotice(
        count > 0
          ? `Synchronized ${count} verified withdrawal payout${count === 1 ? '' : 's'} into the masked public feed.`
          : 'No approved, processing, or completed withdrawals found yet to synchronize.'
      );
      setTimeout(() => setSavedNotice(null), 4000);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to sync verified withdrawals');
    } finally {
      setSyncingFeed(false);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(null);
    setErrorNotice(null);

    try {
      await saveAdminSettings(settingMap);
      window.dispatchEvent(new Event(SETTINGS_UPDATED_EVENT));
      setSavedNotice('Platform settings, withdrawal notification controls, and deposit addresses saved to Cloud Firestore.');
      setTimeout(() => setSavedNotice(null), 4000);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportSnapshot = async () => {
    try {
      setExporting(true);
      setErrorNotice(null);
      const snapshot = await exportFirestoreSnapshot();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oxtraders-firestore-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSavedNotice('Full Cloud Firestore JSON backup downloaded cleanly.');
      setTimeout(() => setSavedNotice(null), 3500);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const copyDomain = () => {
    navigator.clipboard.writeText('oxtraders.online');
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Platform Configuration &amp; Persistence
        </h2>
        <p className="text-xs text-[#848E9C] mt-1">
          Configure deposit addresses, network fees, compliance rules, and permanent Cloud Firestore custody for oxtraders.online.
        </p>
      </div>

      {savedNotice && (
        <div className="p-4 rounded-xl bg-[#0ECB81]/15 border border-[#0ECB81]/30 text-[#0ECB81] text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="p-4 rounded-xl bg-[#F6465D]/15 border border-[#F6465D]/30 text-[#F6465D] text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Database Persistence & Snapshot Console */}
      {!loading && dbStatus && (
        <div className="p-5 sm:p-7 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2B313A]">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F0B90B]">
              <Database className="w-4 h-4" />
              <span>Database Engine &amp; Permanent User Custody</span>
            </div>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold border bg-[#0ECB81]/15 text-[#0ECB81] border-[#0ECB81]/30">
              {dbStatus.label}
            </span>
          </div>

          {dbStatus.counts && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums text-xs">
              <div className="p-3 rounded-xl bg-[#1E2329] border border-[#2B313A]">
                <div className="text-[10px] font-sans uppercase text-[#848E9C]">Total Accounts</div>
                <div className="text-lg font-extrabold text-white mt-0.5">{dbStatus.counts.users}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#1E2329] border border-[#2B313A]">
                <div className="text-[10px] font-sans uppercase text-[#848E9C]">Deposits</div>
                <div className="text-lg font-extrabold text-white mt-0.5">{dbStatus.counts.deposits}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#1E2329] border border-[#2B313A]">
                <div className="text-[10px] font-sans uppercase text-[#848E9C]">Withdrawals</div>
                <div className="text-lg font-extrabold text-white mt-0.5">{dbStatus.counts.withdrawals}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#1E2329] border border-[#2B313A]">
                <div className="text-[10px] font-sans uppercase text-[#848E9C]">Investments</div>
                <div className="text-lg font-extrabold text-white mt-0.5">{dbStatus.counts.investments}</div>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-[#0ECB81]/10 border border-[#0ECB81]/25 text-xs text-[#EAECEF] space-y-2 leading-relaxed">
            <div className="font-bold text-[#0ECB81] flex items-center gap-2">
              <Globe className="w-4 h-4 shrink-0" />
              <span>Custom Domain Checklist for oxtraders.online (Firebase Google Sign-In)</span>
            </div>
            <p className="text-[#848E9C]">
              All investor accounts, balances, deposits, and tickets are permanently persisted in Cloud Firestore (independent of Render restarts). When serving on your custom domain, verify <strong className="text-white">oxtraders.online</strong> (and your Render URL) are listed under <strong className="text-white">Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized domains</strong>.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={copyDomain}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B0E11] border border-[#2B313A] hover:border-[#0ECB81]/50 text-[#0ECB81] font-mono text-[11px] cursor-pointer"
              >
                <span>oxtraders.online</span>
                {copiedDomain ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleExportSnapshot}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E2329] hover:bg-[#2B313A] border border-[#2B313A] text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-[#F0B90B]" />
              <span>{exporting ? 'Exporting Snapshot...' : 'Download Full Cloud Backup (.json)'}</span>
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Blockchain Deposit Addresses */}
        <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F0B90B] pb-2 border-b border-[#2B313A]">
            <Key className="w-4 h-4" />
            <span>Cryptocurrency Custodial Deposit Addresses</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#848E9C] mb-1">
              Official Bitcoin (BTC) Native SegWit Deposit Address *
            </label>
            <input
              type="text"
              required
              value={settingMap.btc_deposit_address || 'bc1qg2a2gdxtccsxu83xy0jvezenutzyvmv4jl0uz4'}
              onChange={(e) => handleValueChange('btc_deposit_address', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
            />
            <span className="text-[10px] text-[#5E6673] mt-1 block">
              Default: bc1qg2a2gdxtccsxu83xy0jvezenutzyvmv4jl0uz4
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#848E9C] mb-1">
              Official Tether (USDT TRC20) Deposit Address *
            </label>
            <input
              type="text"
              required
              value={settingMap.usdt_deposit_address || 'TB4Uq6VQMFMbDZUq3xK4jM8mqz6rb2TqGf'}
              onChange={(e) => handleValueChange('usdt_deposit_address', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
            />
            <span className="text-[10px] text-[#5E6673] mt-1 block">
              Default: TB4Uq6VQMFMbDZUq3xK4jM8mqz6rb2TqGf
            </span>
          </div>
        </div>

        {/* Deposit & Withdrawal Limits & Fees */}
        <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white pb-2 border-b border-[#2B313A]">
            <Shield className="w-4 h-4 text-[#F0B90B]" />
            <span>Limits, Thresholds &amp; Network Fees</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">Minimum BTC Deposit</label>
              <input
                type="text"
                value={settingMap.btc_min_deposit || '0.001'}
                onChange={(e) => handleValueChange('btc_min_deposit', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">Minimum USDT Deposit</label>
              <input
                type="text"
                value={settingMap.usdt_min_deposit || '50.0'}
                onChange={(e) => handleValueChange('usdt_min_deposit', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">Minimum BTC Withdrawal</label>
              <input
                type="text"
                value={settingMap.btc_min_withdrawal || '0.002'}
                onChange={(e) => handleValueChange('btc_min_withdrawal', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">Minimum USDT Withdrawal</label>
              <input
                type="text"
                value={settingMap.usdt_min_withdrawal || '25.0'}
                onChange={(e) => handleValueChange('usdt_min_withdrawal', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">BTC Withdrawal Network Fee</label>
              <input
                type="text"
                value={settingMap.btc_withdrawal_fee || '0.00035'}
                onChange={(e) => handleValueChange('btc_withdrawal_fee', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">USDT TRC20 Withdrawal Network Fee</label>
              <input
                type="text"
                value={settingMap.usdt_withdrawal_fee || '1.50'}
                onChange={(e) => handleValueChange('usdt_withdrawal_fee', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
              />
            </div>
          </div>
        </div>

        {/* Company & Compliance Rules */}
        <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white pb-2 border-b border-[#2B313A]">
            <Settings className="w-4 h-4 text-[#F0B90B]" />
            <span>Brand, Compliance &amp; System Status</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">Company Trade Name</label>
              <input
                type="text"
                value={settingMap.company_name || 'OX TRADERS'}
                onChange={(e) => handleValueChange('company_name', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">Official Support Email</label>
              <input
                type="email"
                value={settingMap.support_email || 'support@oxtraders.online'}
                onChange={(e) => handleValueChange('support_email', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">Referral Commission Rate (%)</label>
              <input
                type="text"
                value={settingMap.referral_commission_percent || '5.0'}
                onChange={(e) => handleValueChange('referral_commission_percent', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">KYC Enforcement for Withdrawals</label>
              <select
                value={settingMap.kyc_mandatory_for_withdrawal || 'true'}
                onChange={(e) => handleValueChange('kyc_mandatory_for_withdrawal', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B]"
              >
                <option value="true">Strict (KYC verification mandatory before withdrawal)</option>
                <option value="false">Relaxed (Withdrawals allowed without KYC)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Floating Withdrawal Activity Notifications */}
        <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2B313A]">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F0B90B]">
              <BellRing className="w-4 h-4" />
              <span>Floating Withdrawal Activity Notifications</span>
            </div>
            <button
              type="button"
              onClick={handleSyncPublicFeed}
              disabled={syncingFeed}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E2329] hover:bg-[#2B313A] border border-[#2B313A] text-white text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#F0B90B] ${syncingFeed ? 'animate-spin' : ''}`} />
              <span>{syncingFeed ? 'Syncing Verified Feed...' : 'Sync Verified Withdrawals'}</span>
            </button>
          </div>

          <p className="text-xs text-[#848E9C] leading-relaxed">
            Display animated, zero-PII withdrawal pop-up cards near the top-left corner across OX TRADERS. Live production popups only surface masked verified payouts from <span className="font-mono text-white">/public_withdrawal_feed</span> and never expose full emails or wallet addresses.
          </p>

          {/* Master & Demo Mode Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-start justify-between gap-3 p-4 rounded-xl bg-[#0B0E11] border border-[#2B313A] cursor-pointer hover:border-[#F0B90B]/40 transition-colors">
              <div>
                <div className="text-xs font-bold text-white">Enable Withdrawal Notifications</div>
                <div className="text-[11px] text-[#848E9C] mt-0.5">
                  Show floating payout notifications on public &amp; investor pages.
                </div>
              </div>
              <input
                type="checkbox"
                checked={(settingMap.withdrawal_toast_enabled ?? DEFAULT_PLATFORM_SETTINGS.withdrawal_toast_enabled) !== 'false'}
                onChange={(e) => handleValueChange('withdrawal_toast_enabled', e.target.checked ? 'true' : 'false')}
                className="mt-0.5 h-4 w-4 accent-[#F0B90B] cursor-pointer shrink-0"
              />
            </label>

            <label className="flex items-start justify-between gap-3 p-4 rounded-xl bg-[#0B0E11] border border-[#2B313A] cursor-pointer hover:border-[#F0B90B]/40 transition-colors">
              <div>
                <div className="text-xs font-bold text-white">Enable Simulated Activity Fallback</div>
                <div className="text-[11px] text-[#848E9C] mt-0.5">
                  When no live payouts are synced yet, show randomized sample withdrawal popups automatically.
                </div>
              </div>
              <input
                type="checkbox"
                checked={(settingMap.withdrawal_toast_demo_enabled ?? DEFAULT_PLATFORM_SETTINGS.withdrawal_toast_demo_enabled) === 'true'}
                onChange={(e) => handleValueChange('withdrawal_toast_demo_enabled', e.target.checked ? 'true' : 'false')}
                className="mt-0.5 h-4 w-4 accent-[#F0B90B] cursor-pointer shrink-0"
              />
            </label>
          </div>

          {/* Verified Status Selection */}
          <div>
            <label className="block text-xs font-semibold text-[#848E9C] mb-2">
              Verified Withdrawal Statuses Eligible for Display
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'completed' as const, label: 'Completed', hint: '"Withdrawal Successful"' },
                { id: 'processing' as const, label: 'Processing', hint: '"Withdrawal Processed"' },
                { id: 'approved' as const, label: 'Approved', hint: '"Withdrawal Processed"' },
              ].map((st) => {
                const checked = selectedToastStatuses.includes(st.id);
                return (
                  <label
                    key={st.id}
                    className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'bg-[#F0B90B]/10 border-[#F0B90B]/45 text-white'
                        : 'bg-[#0B0E11] border-[#2B313A] text-[#848E9C]'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{st.label}</div>
                      <div className="text-[10px] text-[#848E9C]">{st.hint}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleToggleToastStatus(st.id)}
                      className="h-4 w-4 accent-[#F0B90B] cursor-pointer shrink-0"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Timing Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                Display Duration (Seconds)
              </label>
              <input
                type="number"
                min={3}
                max={20}
                value={settingMap.withdrawal_toast_duration_sec ?? DEFAULT_PLATFORM_SETTINGS.withdrawal_toast_duration_sec}
                onChange={(e) => handleValueChange('withdrawal_toast_duration_sec', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
              />
              <span className="text-[10px] text-[#5E6673] mt-1 block">Recommended: 5–8 seconds</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                Minimum Interval (Seconds)
              </label>
              <input
                type="number"
                min={3}
                max={180}
                value={settingMap.withdrawal_toast_min_interval_sec ?? DEFAULT_PLATFORM_SETTINGS.withdrawal_toast_min_interval_sec}
                onChange={(e) => handleValueChange('withdrawal_toast_min_interval_sec', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
              />
              <span className="text-[10px] text-[#5E6673] mt-1 block">Default: 5 seconds</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                Maximum Interval (Seconds)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={settingMap.withdrawal_toast_max_interval_sec ?? DEFAULT_PLATFORM_SETTINGS.withdrawal_toast_max_interval_sec}
                onChange={(e) => handleValueChange('withdrawal_toast_max_interval_sec', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
              />
              <span className="text-[10px] text-[#5E6673] mt-1 block">Default: 40 seconds</span>
            </div>
          </div>

          {/* Interactive Design & Live Floating Preview */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#0B0E11] border border-[#2B313A] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-white">Notification Card Preview</div>
                <div className="text-[11px] text-[#848E9C]">
                  Inspect live OX TRADERS styling or trigger an animated popup at the top-left corner.
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRandomizePreview('live', 'completed')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                    previewMode === 'live' && previewSample.status === 'completed'
                      ? 'bg-[#F0B90B] text-[#0B0E11] border-[#F0B90B]'
                      : 'bg-[#181A20] text-[#EAECEF] border-[#2B313A] hover:border-[#F0B90B]/50'
                  }`}
                >
                  Successful
                </button>
                <button
                  type="button"
                  onClick={() => handleRandomizePreview('live', 'processing')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                    previewMode === 'live' && previewSample.status !== 'completed'
                      ? 'bg-[#F0B90B] text-[#0B0E11] border-[#F0B90B]'
                      : 'bg-[#181A20] text-[#EAECEF] border-[#2B313A] hover:border-[#F0B90B]/50'
                  }`}
                >
                  Processed
                </button>
                <button
                  type="button"
                  onClick={() => handleRandomizePreview('demo')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                    previewMode === 'demo'
                      ? 'bg-[#F0B90B] text-[#0B0E11] border-[#F0B90B]'
                      : 'bg-[#181A20] text-[#EAECEF] border-[#2B313A] hover:border-[#F0B90B]/50'
                  }`}
                >
                  Demo Activity
                </button>
                <button
                  type="button"
                  onClick={() => handleRandomizePreview(previewMode)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#181A20] hover:bg-[#1E2329] border border-[#2B313A] text-white text-[11px] font-semibold cursor-pointer"
                >
                  <Shuffle className="w-3 h-3 text-[#F0B90B]" />
                  <span>Randomize</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    triggerWithdrawalNotificationPreview(
                      previewSample,
                      Number(settingMap.withdrawal_toast_duration_sec || 6)
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0B90B]/15 hover:bg-[#F0B90B]/25 border border-[#F0B90B]/50 text-[#F0B90B] text-[11px] font-bold cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Launch Floating Preview</span>
                </button>
              </div>
            </div>

            <div className="pt-1 flex justify-start">
              <WithdrawalNotificationCard
                item={previewSample}
                durationSec={Number(settingMap.withdrawal_toast_duration_sec || 6)}
                animateProgress={false}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Recording in Audit Log...' : 'Commit Platform Configuration'}</span>
        </button>
      </form>

      {/* Authorized Control Center Operators */}
      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2B313A]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F0B90B]">
            <UserPlus className="w-4 h-4" />
            <span>Authorized Control Center Operators</span>
          </div>
          <span className="text-[11px] text-[#848E9C]">
            Master Admin (veronikapistyur@gmail.com) + /admins UIDs
          </span>
        </div>

        <p className="text-xs text-[#848E9C] leading-relaxed">
          Operators authorized here can sign in via Email &amp; Password at <span className="font-mono text-white">/ox-control-center</span> and perform all Control Center operations (deposits, withdrawals, KYC, plans, tickets, and settings).
        </p>

        {operators.length > 0 ? (
          <div className="space-y-2">
            {operators.map((op) => (
              <div
                key={op.uid}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0B0E11] border border-[#2B313A]"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{op.email}</div>
                  <div className="text-[11px] font-mono text-[#848E9C] truncate">UID: {op.uid}</div>
                </div>
                {admin?.isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => handleRevokeOperator(op.uid)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F6465D]/10 hover:bg-[#F6465D]/20 border border-[#F6465D]/30 text-[#F6465D] text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-xs text-[#848E9C]">
            No secondary operator UIDs added yet.
          </div>
        )}

        {admin?.isSuperAdmin ? (
          <form onSubmit={handleGrantOperator} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <input
              type="text"
              required
              placeholder="Firebase Auth User UID"
              value={newOpUid}
              onChange={(e) => setNewOpUid(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
            />
            <input
              type="email"
              required
              placeholder="admin@oxtraders.onliine"
              value={newOpEmail}
              onChange={(e) => setNewOpEmail(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B]"
            />
            <button
              type="submit"
              disabled={opSaving}
              className="px-4 py-2.5 rounded-xl bg-[#1E2329] hover:bg-[#2B313A] border border-[#F0B90B]/40 text-[#F0B90B] font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{opSaving ? 'Granting...' : 'Authorize Operator'}</span>
            </button>
          </form>
        ) : (
          <p className="text-[11px] text-[#5E6673]">
            Only Master Admin (Google SSO) can grant or revoke operator UIDs.
          </p>
        )}
      </div>
    </div>
  );
};
