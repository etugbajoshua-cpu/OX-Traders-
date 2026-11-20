import React from 'react';
import { UserPlus, Wallet, LineChart, ArrowDownToLine, ArrowRight } from 'lucide-react';

interface HowItWorksSectionProps {
  onNavigate: (route: string) => void;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ onNavigate }) => {
  const steps = [
    {
      step: '01',
      title: 'Create Account & Verify',
      description: 'Register in seconds with encrypted credentials. Complete verification to comply with institutional standards.',
      icon: UserPlus,
      highlight: 'Instant Setup'
    },
    {
      step: '02',
      title: 'Deposit Bitcoin or USDT',
      description: 'Fund your custodial wallet using native Bitcoin (BTC) or Tether (USDT TRC20). Verified via direct blockchain nodes.',
      icon: Wallet,
      highlight: '0% Deposit Fee'
    },
    {
      step: '03',
      title: 'Select Yield Strategy',
      description: 'Allocate your capital to quantitative strategies tailored to your target risk profile and duration.',
      icon: LineChart,
      highlight: 'Daily Accruals'
    },
    {
      step: '04',
      title: 'Track & Withdraw',
      description: 'Monitor daily accruals in real time. Request fast withdrawals back to your personal private wallet.',
      icon: ArrowDownToLine,
      highlight: 'Fast Processing'
    }
  ];

  return (
    <section id="how-it-works" className="py-12 sm:py-20 bg-[#0B0E11] border-b border-[#2B313A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0B90B]/10 border border-[#F0B90B]/20 text-[#F0B90B] text-xs font-semibold uppercase tracking-wider mb-3">
            Simple 4-Step Process
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3 sm:mb-4">
            How OX TRADERS Operates
          </h2>
          <p className="text-[#848E9C] text-xs sm:text-base leading-relaxed">
            Our end-to-end investment infrastructure is designed for frictionless onboarding, transparent ledger auditing, and dependable digital asset payouts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="relative p-6 rounded-2xl bg-[#181A20] border border-[#2B313A] hover:border-[#F0B90B]/40 transition-all shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-[#1E2329] border border-[#2B313A] flex items-center justify-center text-[#F0B90B]">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-3xl font-black font-mono text-[#2B313A]">
                      {item.step}
                    </span>
                  </div>

                  <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-[#F0B90B] bg-[#F0B90B]/10 border border-[#F0B90B]/20 mb-2">
                    {item.highlight}
                  </div>

                  <h3 className="text-base font-bold text-white mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs text-[#848E9C] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 sm:mt-12 text-center">
          <button
            onClick={() => onNavigate('register')}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider shadow-md active:scale-98 cursor-pointer"
          >
            <span>Open Your Investor Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};
