import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Logo } from '../../components/common/Logo.tsx';
import { useAdminAuth } from '../../context/AdminAuthContext.tsx';
import {
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
} from 'lucide-react';

interface AdminLoginPageProps {
  onSuccess: () => void;
  onNavigateHome: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onSuccess,
  onNavigateHome,
}) => {
  const { adminLoginWithGoogle, adminLoginWithCredentials } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [credentialLoading, setCredentialLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingUid, setPendingUid] = useState<string | null>(null);
  const [copiedUid, setCopiedUid] = useState(false);

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredentialLoading(true);
    setError('');
    setPendingUid(null);

    const res = await adminLoginWithCredentials(email, password);
    setCredentialLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Access denied: Unauthorized operator credentials');
      if (res.pendingUid) {
        setPendingUid(res.pendingUid);
      }
    }
  };

  const handleOperatorVerify = async () => {
    setGoogleLoading(true);
    setError('');
    setPendingUid(null);

    const res = await adminLoginWithGoogle();
    setGoogleLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Access denied: Unauthorized operator identity');
      if (res.pendingUid) {
        setPendingUid(res.pendingUid);
      }
    }
  };

  const copyPendingUid = () => {
    if (!pendingUid) return;
    navigator.clipboard.writeText(pendingUid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const isBusy = credentialLoading || googleLoading;

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden">
      <div
        className="mb-6 sm:mb-8 text-center cursor-pointer select-none"
        onClick={onNavigateHome}
      >
        <Logo variant="default" size="lg" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent opacity-70" />

        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F0B90B]/10 border border-[#F0B90B]/25 text-[#F0B90B] text-[10px] font-bold uppercase tracking-wider mb-2">
            <KeyRound className="w-3 h-3" />
            <span>OX TRADERS Control Center</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Administrator Gateway
          </h2>
          <p className="text-xs text-[#848E9C] mt-1.5 leading-relaxed">
            Restricted access portal for verified platform operators of oxtraders.online.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-[#F6465D]/10 border border-[#F6465D]/30 space-y-2 text-xs text-[#F6465D]">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {pendingUid && (
              <div className="pt-1.5 border-t border-[#F6465D]/20 flex items-center justify-between gap-2 text-[11px] text-[#EAECEF]">
                <span className="font-mono truncate">UID: {pendingUid}</span>
                <button
                  type="button"
                  onClick={copyPendingUid}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0B0E11] border border-[#2B313A] text-[#F0B90B] shrink-0 cursor-pointer"
                >
                  {copiedUid ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUid ? 'Copied' : 'Copy UID'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Standard Operator Email & Password Login */}
        <form onSubmit={handleCredentialLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
              Operator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#5E6673] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                autoComplete="username"
                placeholder="admin@oxtraders.onliine"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isBusy}
                className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-sm placeholder:text-[#5E6673] focus:outline-none focus:border-[#F0B90B] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
              Operator Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#5E6673] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="Enter operator password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isBusy}
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-sm placeholder:text-[#5E6673] focus:outline-none focus:border-[#F0B90B] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#848E9C] hover:text-white cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="w-full py-3.5 px-4 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-lg"
          >
            {credentialLoading ? (
              <div className="w-4 h-4 border-2 border-[#0B0E11] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Sign In as Operator</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#2B313A]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#5E6673]">
            OR
          </span>
          <div className="h-px flex-1 bg-[#2B313A]" />
        </div>

        {/* Google Master Operator Login */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleOperatorVerify}
            disabled={isBusy}
            className="w-full py-3 px-4 rounded-xl bg-[#1E2329] hover:bg-[#2B313A] border border-[#2B313A] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {googleLoading ? (
              <div className="w-4 h-4 border-2 border-[#F0B90B] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-[#F0B90B]" />
                <span>Verify Master Operator with Google</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-[#5E6673] text-center leading-relaxed">
            Authorized operators can sign in with operator credentials or Master Admin Google SSO to manage deposits, payouts, KYC compliance, and platform settings.
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-[#2B313A] text-center">
          <button
            type="button"
            onClick={onNavigateHome}
            className="text-xs text-[#848E9C] hover:text-white transition-colors cursor-pointer"
          >
            &larr; Return to Public Platform
          </button>
        </div>
      </motion.div>
    </div>
  );
};
