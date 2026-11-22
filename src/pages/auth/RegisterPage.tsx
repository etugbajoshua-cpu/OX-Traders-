import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Logo } from '../../components/common/Logo.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Phone, Globe, ShieldCheck, ArrowRight, AlertCircle, Gift } from 'lucide-react';

interface RegisterPageProps {
  onNavigate: (route: string) => void;
  initialReferralCode?: string;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigate,
  initialReferralCode = '',
}) => {
  const { user, loginWithGoogle } = useAuth();
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('United Kingdom');
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      onNavigate('dashboard');
    }
  }, [user, onNavigate]);

  const countries = [
    'United Kingdom',
    'Switzerland',
    'United States',
    'Germany',
    'France',
    'Canada',
    'Australia',
    'Singapore',
    'United Arab Emirates',
    'Japan',
    'South Korea',
    'Netherlands',
    'Sweden',
    'Norway',
    'Austria',
    'Other',
  ];

  const handleGoogleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setError('Please accept the Terms of Service & AML Guidelines to proceed.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await loginWithGoogle({
      country,
      phone: phone.trim(),
      referral_code: referralCode.trim().toUpperCase(),
    });

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
        className="w-full max-w-lg bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent opacity-70" />

        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F0B90B]/10 border border-[#F0B90B]/25 text-[#F0B90B] text-[10px] font-bold uppercase tracking-wider mb-2">
            Instant Cloud Onboarding
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Create Personal Account
          </h2>
          <p className="text-xs text-[#848E9C] mt-1.5">
            Verify with Google to provision your permanent multi-currency wallet and quantitative yield access.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-[#F6465D]/10 border border-[#F6465D]/30 flex items-start gap-2.5 text-xs text-[#F6465D]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleGoogleRegister} autoComplete="off" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                Country of Residence *
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-[#848E9C] absolute left-3.5 top-3.5 pointer-events-none" />
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B] transition-colors"
                >
                  {countries.map((c) => (
                    <option key={c} value={c} className="bg-[#181A20]">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#848E9C] absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="tel"
                  autoComplete="off"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+44 20 7946 0991"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B] transition-colors"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#848E9C] mb-1">
              Referral Code (Optional)
            </label>
            <div className="relative">
              <Gift className="w-4 h-4 text-[#848E9C] absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="text"
                autoComplete="off"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="OX-8942"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B] font-mono transition-colors"
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5 pt-2">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-0.5 rounded border-[#2B313A] bg-[#1E2329] text-[#F0B90B] focus:ring-[#F0B90B]"
            />
            <label htmlFor="terms" className="text-xs text-[#848E9C] leading-normal">
              I agree to the OX TRADERS Terms of Service, Privacy Policy, and AML/KYC Customer Compliance Protocol.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-4 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2.5 active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-lg"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[#0B0E11] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Create Account with Google</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#2B313A] text-center text-xs text-[#848E9C]">
          <span>Already registered? </span>
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="text-[#F0B90B] font-bold hover:underline ml-1 cursor-pointer"
          >
            Log In
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
