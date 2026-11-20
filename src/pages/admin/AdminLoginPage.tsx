import React, { useState } from 'react';
import { Logo } from '../../components/common/Logo.tsx';
import { useAdminAuth } from '../../context/AdminAuthContext.tsx';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';

interface AdminLoginPageProps {
  onSuccess: () => void;
  onNavigateHome: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onSuccess, onNavigateHome }) => {
  const { adminLogin } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide administrative credentials');
      return;
    }

    setLoading(true);
    setError('');

    const res = await adminLogin(email, password);
    setLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Access denied: Invalid administrator credentials');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Brand Header */}
      <div className="mb-6 sm:mb-8 text-center cursor-pointer select-none" onClick={onNavigateHome}>
        <Logo variant="default" size="lg" />
      </div>

      <div className="w-full max-w-md bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F0B90B]/10 border border-[#F0B90B]/20 text-[#F0B90B] text-[10px] font-bold uppercase tracking-wider mb-2">
            <KeyRound className="w-3 h-3" />
            <span>OX TRADERS Control Center</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Administrator Gateway
          </h2>
          <p className="text-xs text-[#848E9C] mt-1.5">
            Restricted access portal for authorized platform operators.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#F6465D]/10 border border-[#F6465D]/30 flex items-start gap-2.5 text-xs text-[#F6465D]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
              Operator Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#848E9C] absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@domain.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white placeholder-[#5E6673] text-sm focus:outline-none focus:border-[#F0B90B] font-mono transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#848E9C] mb-1.5">
              Administrator Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#848E9C] absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter administrator password"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white placeholder-[#5E6673] text-sm focus:outline-none focus:border-[#F0B90B] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-md"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[#0B0E11] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Authorization</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#2B313A] text-center">
          <button
            onClick={onNavigateHome}
            className="text-xs text-[#848E9C] hover:text-white transition-colors"
          >
            &larr; Return to Public Platform
          </button>
        </div>
      </div>
    </div>
  );
};
