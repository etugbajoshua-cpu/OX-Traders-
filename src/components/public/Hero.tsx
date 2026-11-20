import React from 'react';
import { ArrowRight, Shield, Zap, Lock, ChevronRight, BarChart3, CheckCircle2 } from 'lucide-react';

interface HeroProps {
  onNavigate: (route: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:pt-16 sm:pb-24">
      {/* Subtle background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[#F0B90B]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Announcement badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#181A20] border border-[#2B313A] mb-6 sm:mb-8 text-xs max-w-full overflow-hidden">
            <span className="h-2 w-2 rounded-full bg-[#F0B90B] shrink-0" />
            <span className="font-semibold text-[#848E9C] truncate">
              Institutional Cryptocurrency Asset Platform
            </span>
            <span className="text-[#2B313A] hidden sm:inline">|</span>
            <span
              className="text-[#F0B90B] font-semibold flex items-center gap-1 hover:underline cursor-pointer shrink-0"
              onClick={() => onNavigate('plans')}
            >
              <span>Explore Plans</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.15] mb-5">
            Trade & Invest in Crypto with{' '}
            <span className="text-[#F0B90B]">
              Total Confidence
            </span>
          </h1>

          {/* Short company description */}
          <p className="text-sm sm:text-base md:text-lg text-[#848E9C] font-normal leading-relaxed max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
            OX TRADERS provides institutional algorithmic liquidity strategies, double-entry financial ledger accounting, and direct on-chain Bitcoin & USDT TRC20 custody.
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12 max-w-md sm:max-w-none mx-auto">
            <button
              onClick={() => onNavigate('register')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-extrabold text-sm uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('plans')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#181A20] hover:bg-[#1E2329] text-white font-semibold text-sm border border-[#2B313A] transition-all cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-[#F0B90B]" />
              <span>Investment Plans</span>
            </button>

            <button
              onClick={() => onNavigate('login')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl text-[#848E9C] hover:text-white text-sm font-medium transition-colors cursor-pointer"
            >
              Log In
            </button>
          </div>

          {/* Platform Trust Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-[#181A20] border border-[#2B313A] max-w-3xl mx-auto">
            <div className="flex flex-col items-center text-center p-2">
              <div className="flex items-center gap-1.5 text-[#0ECB81] font-bold text-xs sm:text-sm mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Audited Ledger</span>
              </div>
              <span className="text-[11px] text-[#848E9C]">Double-entry accounting</span>
            </div>

            <div className="flex flex-col items-center text-center p-2 border-l border-[#2B313A]">
              <div className="flex items-center gap-1.5 text-[#F0B90B] font-bold text-xs sm:text-sm mb-1">
                <Shield className="w-4 h-4" />
                <span>Cold Custody</span>
              </div>
              <span className="text-[11px] text-[#848E9C]">Multi-sig protection</span>
            </div>

            <div className="flex flex-col items-center text-center p-2 border-l border-[#2B313A]">
              <div className="flex items-center gap-1.5 text-[#0ECB81] font-bold text-xs sm:text-sm mb-1">
                <Zap className="w-4 h-4" />
                <span>BTC & USDT</span>
              </div>
              <span className="text-[11px] text-[#848E9C]">Direct on-chain deposit</span>
            </div>

            <div className="flex flex-col items-center text-center p-2 border-l border-[#2B313A]">
              <div className="flex items-center gap-1.5 text-[#F0B90B] font-bold text-xs sm:text-sm mb-1">
                <Lock className="w-4 h-4" />
                <span>Encrypted KYC</span>
              </div>
              <span className="text-[11px] text-[#848E9C]">Zero-knowledge storage</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
