import React, { useEffect, useState } from 'react';
import { InvestmentPlan } from '../../types/index.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { createInvestment, getActivePlans } from '../../lib/firestoreService.ts';
import {
  Check,
  Clock,
  ArrowRight,
  AlertCircle,
  DollarSign,
  TrendingUp,
  X
} from 'lucide-react';

interface PlansPageProps {
  onNavigateSection: (section: string) => void;
}

export const PlansPage: React.FC<PlansPageProps> = ({ onNavigateSection }) => {
  const { firebaseUser, balances, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal investment state
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const [investAmount, setInvestAmount] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const availableUSD = balances.USD?.available || 0;

  useEffect(() => {
    getActivePlans()
      .then((list) => setPlans(list))
      .catch((err) => console.error('Failed to load plans:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleOpenInvest = (plan: InvestmentPlan) => {
    setSelectedPlan(plan);
    setInvestAmount(String(plan.min_amount));
    setStatusMsg(null);
  };

  const handleExecuteInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !firebaseUser) return;

    const num = parseFloat(investAmount);
    if (isNaN(num) || num < selectedPlan.min_amount || num > selectedPlan.max_amount) {
      setStatusMsg({
        type: 'error',
        text: `Investment amount must be between $${selectedPlan.min_amount.toLocaleString()} and $${selectedPlan.max_amount.toLocaleString()}`
      });
      return;
    }

    if (num > availableUSD) {
      setStatusMsg({
        type: 'error',
        text: `Insufficient available USD balance ($${availableUSD.toLocaleString()}). Please make a deposit or adjust the amount.`
      });
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);

    try {
      await createInvestment({
        uid: firebaseUser.uid,
        plan: selectedPlan,
        amount: num
      });
      setStatusMsg({
        type: 'success',
        text: `Successfully allocated $${num.toLocaleString()} to ${selectedPlan.name}! Daily accruals will begin automatically.`
      });
      await refreshProfile();
      setTimeout(() => {
        setSelectedPlan(null);
        onNavigateSection('investments');
      }, 1500);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to allocate investment' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Investment Plans
          </h2>
          <p className="text-xs text-[#848E9C] mt-1">
            Choose a quantitative crypto strategy based on your target daily yield, risk tolerance, and lock period.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-[#181A20] border border-[#2B313A] text-xs font-mono">
          <span className="text-[#848E9C] mr-2">Available USD:</span>
          <span className="text-[#0ECB81] font-bold">${availableUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-96 rounded-2xl bg-[#181A20] border border-[#2B313A] animate-pulse" />
          ))
        ) : (
          plans.map((plan) => (
            <div
              key={plan.id}
              className="p-5 sm:p-6 rounded-2xl bg-[#181A20] border border-[#2B313A] hover:border-[#F0B90B]/50 transition-all flex flex-col justify-between shadow-md group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#1E2329] text-white">
                    {plan.risk_tier} Risk
                  </span>
                  <span className="text-xs text-[#848E9C] flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-[#F0B90B]" />
                    {plan.duration_days} Days
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white mb-1 group-hover:text-[#F0B90B] transition-colors">
                  {plan.name}
                </h3>
                <p className="text-xs text-[#848E9C] mb-4 min-h-[32px] line-clamp-2">
                  {plan.tagline || plan.description}
                </p>

                <div className="p-3.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-center mb-4">
                  <div className="text-2xl sm:text-3xl font-black text-[#F0B90B] font-mono">
                    {plan.daily_roi}%
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-[#848E9C] mt-0.5">
                    Target Daily Yield ({plan.total_roi}% Total)
                  </div>
                </div>

                <div className="space-y-2 text-xs text-[#848E9C] mb-5 font-mono">
                  <div className="flex justify-between pb-1 border-b border-[#2B313A]">
                    <span className="font-sans">Min Allocation:</span>
                    <span className="font-bold text-white">${plan.min_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-[#2B313A]">
                    <span className="font-sans">Max Allocation:</span>
                    <span className="font-bold text-white">${plan.max_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-[#2B313A]">
                    <span className="font-sans">Management Fee:</span>
                    <span className="font-bold text-white">{plan.management_fee}%</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-[#2B313A]">
                    <span className="font-sans">Principal Return:</span>
                    <span className="font-bold text-[#0ECB81]">100% at End</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleOpenInvest(plan)}
                className="w-full py-3 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98 cursor-pointer"
              >
                <span>Invest in Strategy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Invest Capital Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setSelectedPlan(null)}
              className="absolute top-5 right-5 p-1 text-[#848E9C] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F0B90B] bg-[#F0B90B]/10 px-2 py-0.5 rounded">
                Deploy Strategy
              </span>
              <h3 className="text-xl font-bold text-white mt-1">
                Subscribe to {selectedPlan.name}
              </h3>
              <p className="text-xs text-[#848E9C] mt-0.5">
                {selectedPlan.duration_days} Days Lock • {selectedPlan.daily_roi}% Daily Yield • Principal Guaranteed Return
              </p>
            </div>

            {statusMsg && (
              <div
                className={`mb-4 p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                  statusMsg.type === 'success'
                    ? 'bg-[#0ECB81]/10 border border-[#0ECB81]/30 text-[#0ECB81]'
                    : 'bg-[#F6465D]/10 border border-[#F6465D]/30 text-[#F6465D]'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleExecuteInvest} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="font-semibold text-[#848E9C]">Allocation Amount ($ USD)</span>
                  <span className="text-[#0ECB81] font-mono">
                    Avail: ${availableUSD.toLocaleString()}
                  </span>
                </div>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-[#848E9C] absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="number"
                    step="any"
                    required
                    min={selectedPlan.min_amount}
                    max={selectedPlan.max_amount}
                    value={investAmount}
                    onChange={(e) => setInvestAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B] font-mono"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[#5E6673] mt-1 font-mono">
                  <span>Min: ${selectedPlan.min_amount.toLocaleString()}</span>
                  <span>Max: ${selectedPlan.max_amount.toLocaleString()}</span>
                </div>
              </div>

              {/* Real-time Calculation Breakdown */}
              {parseFloat(investAmount) > 0 && (
                <div className="p-3.5 rounded-xl bg-[#1E2329] border border-[#2B313A] space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-[#848E9C]">
                    <span className="font-sans">Daily Accrual ({selectedPlan.daily_roi}%):</span>
                    <span className="text-[#0ECB81] font-bold">
                      +${((parseFloat(investAmount) * selectedPlan.daily_roi) / 100).toFixed(2)} / day
                    </span>
                  </div>
                  <div className="flex justify-between text-[#848E9C]">
                    <span className="font-sans">Total Profit Expected:</span>
                    <span className="text-[#0ECB81] font-bold">
                      +${(((parseFloat(investAmount) * selectedPlan.daily_roi) / 100) * selectedPlan.duration_days).toFixed(2)}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-[#2B313A] flex justify-between text-white font-bold">
                    <span className="font-sans">Total Maturity Return:</span>
                    <span className="text-[#F0B90B]">
                      ${(parseFloat(investAmount) + (((parseFloat(investAmount) * selectedPlan.daily_roi) / 100) * selectedPlan.duration_days)).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || availableUSD < selectedPlan.min_amount}
                className="w-full py-3.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-[#0B0E11] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>Authorize & Deploy Capital</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
