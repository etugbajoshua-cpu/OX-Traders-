import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { InvestmentPlan } from '../../types/index.ts';
import { getActivePlans } from '../../lib/firestoreService.ts';
import { Clock, ArrowRight, Calculator, AlertCircle } from 'lucide-react';

interface InvestmentPlansSectionProps {
  onNavigate: (route: string) => void;
}

export const InvestmentPlansSection: React.FC<InvestmentPlansSectionProps> = ({ onNavigate }) => {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | number | null>(null);
  const [calcAmount, setCalcAmount] = useState<number>(5000);

  useEffect(() => {
    getActivePlans()
      .then((list) => {
        if (list.length > 0) {
          setPlans(list);
          setSelectedPlanId(list[1]?.id || list[0]?.id);
        }
      })
      .catch((err) => console.error('Failed to load plans:', err))
      .finally(() => setLoading(false));
  }, []);

  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const calcDailyReturn = activePlan ? (calcAmount * activePlan.daily_roi) / 100 : 0;
  const calcTotalProfit = activePlan ? calcDailyReturn * activePlan.duration_days : 0;
  const calcTotalPayout = activePlan ? calcAmount + calcTotalProfit : 0;

  return (
    <section id="plans" className="py-12 sm:py-20 bg-[#0B0E11] border-b border-[#2B313A] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-10 sm:mb-14"
        >
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#F0B90B] mb-2">
            Algorithmic Strategies
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3 sm:mb-4">
            Cryptocurrency Investment Plans
          </h2>
          <p className="text-[#848E9C] text-xs sm:text-base leading-relaxed">
            Transparent quantitative strategies with mathematical risk budgets and real-time ledger accounting.
          </p>
        </motion.div>

        {/* Investment Plans Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-96 rounded-2xl bg-[#181A20] border border-[#2B313A] animate-pulse" />
            ))
          ) : (
            plans.map((plan, idx) => {
              const isSelected = activePlan?.id === plan.id;
              const isPopular = plan.slug === 'ox-premier-yield';

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.12 }}
                  transition={{ duration: 0.38, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  onClick={() => {
                    setSelectedPlanId(plan.id);
                    setCalcAmount(Math.max(plan.min_amount, Math.min(calcAmount, plan.max_amount)));
                  }}
                  className={`relative cursor-pointer rounded-2xl p-5 sm:p-6 transition-[transform,border-color] duration-200 hover:-translate-y-1 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#181A20] border-2 border-[#F0B90B] shadow-xl'
                      : 'bg-[#181A20] border border-[#2B313A] hover:border-[#F0B90B]/50'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#F0B90B] text-[#0B0E11] font-extrabold text-[10px] uppercase tracking-wider shadow-md whitespace-nowrap">
                      Most Popular
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#1E2329] text-[#EAECEF]">
                        {plan.risk_tier} Risk
                      </span>
                      <span className="text-xs text-[#848E9C] flex items-center gap-1 font-mono tabular-nums">
                        <Clock className="w-3.5 h-3.5 text-[#F0B90B]" />
                        {plan.duration_days} Days
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-[#848E9C] mb-4 min-h-[32px] line-clamp-2">
                      {plan.tagline || plan.description}
                    </p>

                    <div className="p-3.5 rounded-xl bg-[#1E2329] border border-[#2B313A] mb-4 text-center">
                      <div className="text-2xl sm:text-3xl font-black text-[#F0B90B] font-mono tabular-nums">
                        {plan.daily_roi}%
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-[#848E9C] font-semibold mt-0.5 tabular-nums">
                        Daily ROI ({plan.total_roi}% Total)
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-[#848E9C] mb-5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#2B313A]">
                        <span>Min Allocation:</span>
                        <span className="font-semibold font-mono tabular-nums text-white">${plan.min_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#2B313A]">
                        <span>Max Allocation:</span>
                        <span className="font-semibold font-mono tabular-nums text-white">${plan.max_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#2B313A]">
                        <span>Management Fee:</span>
                        <span className="font-semibold font-mono tabular-nums text-white">{plan.management_fee}%</span>
                      </div>
                      <div className="flex items-center justify-between pb-1.5 border-b border-[#2B313A]">
                        <span>Principal Return:</span>
                        <span className="font-semibold text-[#0ECB81]">100% at Maturity</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('register');
                    }}
                    className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] ${
                      isSelected
                        ? 'bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] shadow-md'
                        : 'bg-[#1E2329] hover:bg-[#2B313A] text-white'
                    }`}
                  >
                    <span>Allocate Capital</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Interactive Strategy Yield Calculator */}
        {activePlan && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="p-6 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-2xl relative overflow-hidden"
          >
            <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6 sm:gap-8">
              <div className="lg:w-1/2">
                <div className="flex items-center gap-2 text-[#F0B90B] font-bold text-xs uppercase tracking-wider mb-2">
                  <Calculator className="w-4 h-4" />
                  <span>Interactive Yield Calculator</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                  Simulate Returns: {activePlan.name}
                </h3>
                <p className="text-xs text-[#848E9C] mb-6">
                  Estimate daily and maturity returns based on {activePlan.daily_roi}% daily accrual.
                </p>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-[#EAECEF] font-semibold mb-2">
                      <span>Investment Capital:</span>
                      <span className="text-[#F0B90B] font-mono tabular-nums font-bold text-base">
                        ${calcAmount.toLocaleString()} USD
                      </span>
                    </div>

                    <input
                      type="range"
                      min={activePlan.min_amount}
                      max={activePlan.max_amount}
                      step={activePlan.min_amount >= 1000 ? 500 : 50}
                      value={calcAmount}
                      onChange={(e) => setCalcAmount(parseFloat(e.target.value))}
                      className="w-full h-2 bg-[#2B313A] rounded-lg appearance-none cursor-pointer accent-[#F0B90B]"
                    />

                    <div className="flex justify-between text-[11px] text-[#848E9C] mt-1 font-mono tabular-nums">
                      <span>Min: ${activePlan.min_amount.toLocaleString()}</span>
                      <span>Max: ${activePlan.max_amount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-xs text-[#848E9C]">
                    <span className="font-semibold text-white">Calculation Method: </span>
                    {activePlan.return_method}
                  </div>
                </div>
              </div>

              <div className="lg:w-1/2 bg-[#1E2329] border border-[#2B313A] rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
                  <div className="p-3.5 rounded-xl bg-[#181A20] border border-[#2B313A]">
                    <div className="text-[10px] text-[#848E9C] uppercase tracking-wider mb-1">
                      Daily Yield ({activePlan.daily_roi}%)
                    </div>
                    <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#0ECB81]">
                      +${calcDailyReturn.toFixed(2)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#181A20] border border-[#2B313A]">
                    <div className="text-[10px] text-[#848E9C] uppercase tracking-wider mb-1">
                      Total Strategy Profit
                    </div>
                    <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#0ECB81]">
                      +${calcTotalProfit.toFixed(2)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#181A20] border border-[#2B313A]">
                    <div className="text-[10px] text-[#848E9C] uppercase tracking-wider mb-1">
                      Duration
                    </div>
                    <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white">
                      {activePlan.duration_days} Days
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#181A20] border border-[#2B313A]">
                    <div className="text-[10px] text-[#848E9C] uppercase tracking-wider mb-1">
                      Maturity Payout
                    </div>
                    <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-[#F0B90B]">
                      ${calcTotalPayout.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => onNavigate('register')}
                    className="w-full sm:w-auto flex-1 py-3.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider transition-colors text-center cursor-pointer shadow-md min-h-[44px]"
                  >
                    Start Strategy with ${calcAmount.toLocaleString()}
                  </button>
                  <button
                    onClick={() => onNavigate('login')}
                    className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-[#2B313A] hover:bg-[#363D47] text-white text-xs font-semibold cursor-pointer min-h-[44px]"
                  >
                    Log In
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#2B313A] flex items-start gap-2 text-[11px] text-[#848E9C] leading-normal">
              <AlertCircle className="w-4 h-4 text-[#F0B90B] shrink-0 mt-0.5" />
              <span>
                <strong>Risk Disclosure:</strong> Cryptocurrency assets and trading strategies are subject to market volatility. Past performance does not guarantee future results. Returns are calculated according to designated algorithmic strategy execution rules.
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};
