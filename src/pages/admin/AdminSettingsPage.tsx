import React, { useEffect, useState } from 'react';
import { Save, CheckCircle2, Key, Shield, Settings } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || []);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleValueChange = (key: string, value: string) => {
    setSettings(settings.map(s => s.key === key ? { ...s, value } : s));
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(null);

    try {
      const payload = settings.map(s => ({ key: s.key, value: s.value }));
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: payload })
      });

      if (res.ok) {
        setSavedNotice('Platform settings and deposit addresses successfully updated and recorded in audit log.');
        setTimeout(() => setSavedNotice(null), 3500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const settingMap = settings.reduce((acc, cur) => ({ ...acc, [cur.key]: cur.value }), {});

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Platform Configuration & System Settings
        </h2>
        <p className="text-xs text-[#848E9C] mt-1">
          Configure blockchain deposit addresses, minimums, withdrawal fees, referral rates, and compliance enforcement.
        </p>
      </div>

      {savedNotice && (
        <div className="p-4 rounded-xl bg-[#0ECB81]/15 border border-[#0ECB81]/30 text-[#0ECB81] text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{savedNotice}</span>
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
            <span>Limits, Thresholds & Network Fees</span>
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
            <span>Brand, Compliance & System Status</span>
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
                value={settingMap.support_email || 'support@oxtraders.com'}
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

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Recording in Audit Log...' : 'Commit Platform Configuration'}</span>
        </button>
      </form>
    </div>
  );
};
