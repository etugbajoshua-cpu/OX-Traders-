import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { KeyRound, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';

export const SecurityPage: React.FC = () => {
  const { user, toggle2FA } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [submittingPass, setSubmittingPass] = useState(false);
  const [passNotice, setPassNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [toggling2FA, setToggling2FA] = useState(false);
  const [twoFaNotice, setTwoFaNotice] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setPassNotice({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setPassNotice({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setSubmittingPass(true);
    setPassNotice(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setPassNotice({ type: 'error', text: data.error || 'Password update failed' });
      } else {
        setPassNotice({ type: 'success', text: 'Password updated successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err: any) {
      setPassNotice({ type: 'error', text: err.message || 'Connection error' });
    } finally {
      setSubmittingPass(false);
    }
  };

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
          Manage your credentials, two-factor authentication, and active protections.
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
              Enforce time-based one-time password (TOTP) verification for all logins and withdrawals.
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
          {user?.two_factor_enabled ? 'Disable 2FA' : 'Enable 2FA'}
        </button>
      </div>

      {/* Password Change Form */}
      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#F0B90B]" />
          <span>Update Account Password</span>
        </h3>
        <p className="text-xs text-[#848E9C] mb-6">
          Choose a strong password containing at least 8 characters with numbers and symbols.
        </p>

        {passNotice && (
          <div
            className={`mb-4 p-3.5 rounded-xl text-xs flex items-center gap-2.5 ${
              passNotice.type === 'success'
                ? 'bg-[#0ECB81]/10 border border-[#0ECB81]/30 text-[#0ECB81]'
                : 'bg-[#F6465D]/10 border border-[#F6465D]/30 text-[#F6465D]'
            }`}
          >
            {passNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{passNotice.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-[#848E9C] mb-1">
              Current Password *
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#848E9C] mb-1">
              New Password *
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#848E9C] mb-1">
              Confirm New Password *
            </label>
            <input
              type="password"
              required
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
            />
          </div>

          <button
            type="submit"
            disabled={submittingPass}
            className="px-6 py-2.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md"
          >
            {submittingPass ? 'Updating...' : 'Save Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
