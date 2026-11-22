import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { ShieldCheck, CheckCircle2, Smartphone, Lock, KeyRound } from 'lucide-react';

export const SecurityPage: React.FC = () => {
  const { user, firebaseUser, toggle2FA } = useAuth();
  const [toggling2FA, setToggling2FA] = useState(false);
  const [twoFaNotice, setTwoFaNotice] = useState<string | null>(null);

  const handleToggle2FA = async () => {
    setToggling2FA(true);
    const res = await toggle2FA();
    setToggling2FA(false);
    if (res.success) {
      setTwoFaNotice(`Two-factor authentication has been ${res.enabled ? 'activated' : 'deactivated'}.`);
      setTimeout(() => setTwoFaNotice(null), 3000);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Security Settings
        </h2>
        <p className="text-xs text-[#848E9C] mt-1">
          Manage your cryptographic identity protection, two-factor authentication, and session safeguards.
        </p>
      </div>

      {/* Two-Factor Authentication Toggle Card */}
      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F0B90B]/15 text-[#F0B90B] flex items-center justify-center shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Two-Factor Authentication (2FA)</h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                user?.two_factor_enabled
                  ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                  : 'bg-[#2B313A] text-[#848E9C]'
              }`}>
                {user?.two_factor_enabled ? 'Active' : 'Disabled'}
              </span>
            </div>
            <p className="text-xs text-[#848E9C] mt-1 max-w-md">
              Require an additional compliance confirmation step for account withdrawals and custody changes.
            </p>
            {twoFaNotice && (
              <div className="text-xs font-semibold text-[#0ECB81] mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{twoFaNotice}</span>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleToggle2FA}
          disabled={toggling2FA}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
            user?.two_factor_enabled
              ? 'bg-[#F6465D]/10 hover:bg-[#F6465D]/20 text-[#F6465D] border border-[#F6465D]/30'
              : 'bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] shadow-md'
          }`}
        >
          {toggling2FA ? 'Updating...' : user?.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
        </button>
      </div>

      {/* Google Cryptographic Identity & Session Security */}
      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl space-y-5">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#2B313A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0ECB81]/15 text-[#0ECB81] flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Google Cryptographic Identity Protection</h3>
              <p className="text-xs text-[#848E9C]">
                Your investor vault is secured directly through Google OAuth 2.0 &amp; Firebase hardware-backed tokens.
              </p>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-md bg-[#0ECB81]/15 text-[#0ECB81] text-[11px] font-bold uppercase tracking-wider shrink-0">
            Verified Session
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#1E2329] border border-[#2B313A]">
            <div className="text-[#848E9C] uppercase text-[10px] font-semibold tracking-wider mb-1">
              Linked Identity Email
            </div>
            <div className="text-white font-mono font-bold truncate">{user?.email || firebaseUser?.email}</div>
          </div>

          <div className="p-4 rounded-xl bg-[#1E2329] border border-[#2B313A]">
            <div className="text-[#848E9C] uppercase text-[10px] font-semibold tracking-wider mb-1">
              Authentication Provider
            </div>
            <div className="text-[#0ECB81] font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Google Identity (Phishing-Resistant OAuth)</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0E11] border border-[#2B313A] flex items-start gap-3 text-xs text-[#848E9C]">
          <Lock className="w-4 h-4 text-[#F0B90B] shrink-0 mt-0.5" />
          <p>
            Because OX TRADERS delegates credential authentication directly to Google Identity Services, password resets, recovery keys, and passkey security are managed centrally in your Google Account Security settings.
          </p>
        </div>
      </div>
    </div>
  );
};
