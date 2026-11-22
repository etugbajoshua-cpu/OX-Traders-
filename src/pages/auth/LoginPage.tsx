import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Logo } from '../../components/common/Logo.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { ShieldCheck, AlertCircle, ArrowRight, Lock } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (route: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { user, loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      onNavigate('dashboard');
    }
  }, [user, onNavigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    const res = await loginWithGoogle();
    setLoading(false);

    if (res.success) {
      onNavigate('dashboard');
    } else if (res.error) {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden">
      <div
        className="mb-6 sm:mb-8 text-center cursor-pointer select-none"
        onClick={() => onNavigate('home')}
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
            <Lock className="w-3 h-3" />
            <span>Encrypted Investor Access</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Sign In to OX TRADERS
          </h2>
          <p className="text-xs text-[#848E9C] mt-1.5 leading-relaxed">
            Access your permanent oxtraders.online portfolio, wallet custody balances, and algorithmic strategies.
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
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-3 active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-lg"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[#0B0E11] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#0B0E11"
                    d="M21.35 11.1H12v3.2h5.35c-.45 2.3-2.45 3.85-5.35 3.85a6.15 6.15 0 1 1 0-12.3c1.6 0 3.05.6 4.15 1.6l2.45-2.45A9.6 9.6 0 1 0 12 21.6c5.55 0 9.6-3.9 9.6-9.4 0-.35-.05-.75-.25-1.1Z"
                  />
                </svg>
                <span>Continue with Google</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="p-3.5 rounded-xl bg-[#1E2329] border border-[#2B313A] flex items-start gap-2.5 text-[11px] text-[#848E9C] leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-[#0ECB81] shrink-0 mt-0.5" />
            <span>
              Your investor profile, wallet balances, and transaction history are stored permanently in cloud custody and tied securely to your verified Google account.
            </span>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-[#2B313A] text-center text-xs text-[#848E9C]">
          <span>New to OX TRADERS? </span>
          <button
            type="button"
            onClick={() => onNavigate('register')}
            className="text-[#F0B90B] font-bold hover:underline ml-1 cursor-pointer"
          >
            Create Personal Account
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="text-xs text-[#848E9C] hover:text-white transition-colors cursor-pointer"
          >
            &larr; Back to Homepage
          </button>
        </div>
      </motion.div>
    </div>
  );
};
