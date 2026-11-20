import React, { useEffect, useState } from 'react';
import { InvestmentPosition } from '../../types/index.ts';
import { Plus } from 'lucide-react';

interface InvestmentsPageProps {
  onNavigateSection: (section: string) => void;
}

export const InvestmentsPage: React.FC<InvestmentsPageProps> = ({ onNavigateSection }) => {
  const [positions, setPositions] = useState<InvestmentPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = async () => {
    try {
      const res = await fetch('/api/investments/my-positions');
      if (res.ok) {
        const data = await res.json();
        setPositions(data.positions || []);
      }
    } catch (err) {
      console.error('Failed to load investment positions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  const totalAllocated = positions.reduce((sum, p) => p.status === 'active' ? sum + p.capital_amount : sum, 0);
  const totalEarned = positions.reduce((sum, p) => sum + p.total_earned, 0);
  const dailyYieldRate = positions.reduce((sum, p) => p.status === 'active' ? sum + p.daily_return : sum, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            My Investments
          </h2>
          <p className="text-xs text-[#848E9C] mt-1">
            Track active quantitative allocations, daily accrued returns, and capital maturity schedules.
          </p>
        </div>

        <button
          onClick={() => onNavigateSection('plans')}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider shrink-0 shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Investment</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#181A20] border border-[#2B313A]">
          <div className="text-xs text-[#848E9C] font-semibold uppercase tracking-wider mb-1">
            Active Strategy Capital
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            ${totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#5E6673] mt-1">
            {positions.filter(p => p.status === 'active').length} Active Position(s)
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#181A20] border border-[#2B313A]">
          <div className="text-xs text-[#848E9C] font-semibold uppercase tracking-wider mb-1">
            Daily Yield Accrual
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#0ECB81]">
            +${dailyYieldRate.toFixed(2)} / day
          </div>
          <div className="text-[11px] text-[#0ECB81] mt-1">
            Auto-credited daily to balance
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#181A20] border border-[#2B313A]">
          <div className="text-xs text-[#848E9C] font-semibold uppercase tracking-wider mb-1">
            Total Yield Earned
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#0ECB81]">
            +${totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#5E6673] mt-1">
            Cumulative across all lifecycles
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        <h3 className="text-base font-bold text-white mb-4">
          Positions Overview
        </h3>

        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-[#1E2329] text-[#848E9C] uppercase text-[10px] tracking-wider border-b border-[#2B313A]">
              <tr>
                <th className="py-3 px-4">Strategy Plan</th>
                <th className="py-3 px-4">Allocated</th>
                <th className="py-3 px-4">Daily Yield</th>
                <th className="py-3 px-4">Total Earned</th>
                <th className="py-3 px-4">Maturity Date</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B313A] font-mono">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#848E9C] font-sans">
                    Loading investment positions...
                  </td>
                </tr>
              ) : positions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#848E9C] font-sans">
                    No active positions. Choose an investment plan to deploy capital.
                  </td>
                </tr>
              ) : (
                positions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-[#1E2329]/50">
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-bold text-white">{pos.plan_name}</div>
                      <div className="text-[10px] text-[#848E9C]">{pos.duration_days} Days Lock ({pos.risk_tier} Risk)</div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      ${pos.capital_amount.toLocaleString()} {pos.currency}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#0ECB81]">
                      +${pos.daily_return.toFixed(2)} / day
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#0ECB81]">
                      +${pos.total_earned.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-[#848E9C] text-[11px]">
                      {new Date(pos.maturity_date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        pos.status === 'active'
                          ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                          : 'bg-[#2B313A] text-[#848E9C]'
                      }`}>
                        {pos.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
