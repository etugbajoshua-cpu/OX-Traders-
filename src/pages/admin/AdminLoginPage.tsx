import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Logo } from '../../components/common/Logo.tsx';
import { useAdminAuth } from '../../context/AdminAuthContext.tsx';
import { ShieldCheck, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';

interface AdminLoginPageProps {
  onSuccess: () => void;
  onNavigateHome: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onSuccess,
  onNavigateHome,
}) => {
  const { adminLoginWithGoogle } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOperatorVerify = async () => {
    setLoading(true);
    setError('');

    const res = await adminLoginWithGoogle();
    setLoading(false);

    if (res.success) {
      onSuccess();
    } else {
      setError(res.error || 'Access denied: Unauthorized operator identity');
    }
  };

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
          <div className="mb-5 p-3.5 rounded-xl bg-[#F6465D]/10 border border-[#F6465D]/30 flex items-start gap-2.5 text-xs text-[#F6465D]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleOperatorVerify}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-lg"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[#0B0E11] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Operator with Google</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-[11px] text-[#5E6673] text-center leading-relaxed">
            Sign in with your authorized master administrator Google account to access deposits, payouts, KYC compliance, and platform settings.
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
