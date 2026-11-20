import React from 'react';
import { ArrowRight, ShieldCheck, Lock, Zap, PieChart } from 'lucide-react';

interface ContactSectionProps {
  onNavigate?: (route: string) => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ onNavigate }) => {
  return (
    <section className="py-12 sm:py-20 bg-[#0B0E11] border-b border-[#2B313A] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#F0B90B]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="p-8 sm:p-12 lg:p-16 rounded-3xl bg-gradient-to-b from-[#181A20] to-[#121418] border border-[#2B313A] shadow-2xl text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F0B90B]/10 border border-[#F0B90B]/20 text-[#F0B90B] text-xs font-bold uppercase tracking-wider mb-6">
            <ShieldCheck className="w-4 h-4" />
            <span>Institutional Trading Architecture</span>
          </div>

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
            Start Trading & Investing with <span className="text-[#F0B90B]">OX TRADERS</span>
          </h2>

          <p className="text-sm sm:text-base text-[#848E9C] max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            Gain immediate access to quantitative arbitrage strategies, automated daily yield accrual, and segregated on-chain Bitcoin & USDT TRC20 custody.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10 max-w-md sm:max-w-none mx-auto">
            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate('register')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-extrabold text-sm uppercase tracking-wider transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  <span>Open Investor Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onNavigate('plans')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#1E2329] hover:bg-[#2B313A] text-white font-semibold text-sm border border-[#2B313A] transition-all cursor-pointer"
                >
                  <PieChart className="w-4 h-4 text-[#F0B90B]" />
                  <span>View Strategy Plans</span>
                </button>
              </>
            )}
          </div>

          {/* Trust Metrics / Architecture */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-[#2B313A]/60">
            <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-[#1E2329]/50 border border-[#2B313A]/50">
              <Lock className="w-4 h-4 text-[#F0B90B]" />
              <div className="text-left">
                <div className="text-xs font-bold text-white">Cold Segregation</div>
                <div className="text-[10px] text-[#848E9C]">Hardware multi-sig vault</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-[#1E2329]/50 border border-[#2B313A]/50">
              <Zap className="w-4 h-4 text-[#0ECB81]" />
              <div className="text-left">
                <div className="text-xs font-bold text-white">On-Chain Settlement</div>
                <div className="text-[10px] text-[#848E9C]">BTC & USDT TRC20</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 p-3 rounded-xl bg-[#1E2329]/50 border border-[#2B313A]/50">
              <ShieldCheck className="w-4 h-4 text-[#F0B90B]" />
              <div className="text-left">
                <div className="text-xs font-bold text-white">Double-Entry Ledger</div>
                <div className="text-[10px] text-[#848E9C]">Audited transaction records</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
