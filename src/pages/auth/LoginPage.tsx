import React, { useState } from 'react';
import { Logo } from '../../components/common/Logo.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (route: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide your email address and password');
      return;
    }

    setLoading(true);
    setError('');

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      onNavigate('dashboard');
    } else {
      setError(res.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Brand Header */}
      <div className="mb-6 sm:mb-8 text-center cursor-pointer select-none" onClick={() => onNavigate('home')}>
        <Logo variant="default" size="lg" />
      </div>

      <div className="w-full max-w-md bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Log In
          </h2>
          <p className="text-xs text-[#848E9C] mt-1.5">
            Access your OX TRADERS investment portfolio and live trading assets.
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
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#848E9C] absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white placeholder-[#5E6673] text-sm focus:outline-none focus:border-[#F0B90B] transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-[#848E9C]">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-[#F0B90B] hover:underline font-medium"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#848E9C] absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
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
                <span>Log In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#2B313A] text-center text-xs text-[#848E9C]">
          <span>Don't have an account? </span>
          <button
            onClick={() => onNavigate('register')}
            className="text-[#F0B90B] font-bold hover:underline ml-1"
          >
            Register Now
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => onNavigate('home')}
            className="text-xs text-[#848E9C] hover:text-white transition-colors"
          >
            &larr; Back to Homepage
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Reset Password</h3>
            <p className="text-xs text-[#848E9C] mb-4">
              Enter your registered email address to receive password reset instructions.
            </p>

            {forgotSent ? (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-[#0ECB81]/15 text-[#0ECB81] flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-white">Reset instructions sent</div>
                <div className="text-[11px] text-[#848E9C] mt-1">If an account exists for {forgotEmail}, a reset email has been dispatched.</div>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="mt-4 w-full py-2.5 rounded-xl bg-[#2B313A] hover:bg-[#363D47] text-xs font-semibold text-white"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setForgotSent(true); }} className="space-y-3">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-[#2B313A] hover:bg-[#363D47] text-[#848E9C] text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] text-xs font-bold"
                  >
                    Send Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
