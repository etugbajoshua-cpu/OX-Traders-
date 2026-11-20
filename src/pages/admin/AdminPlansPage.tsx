import React, { useEffect, useState } from 'react';
import { InvestmentPlan } from '../../types/index.ts';
import { Plus, X } from 'lucide-react';

export const AdminPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Partial<InvestmentPlan> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPlan)
      });

      if (res.ok) {
        setEditingPlan(null);
        await fetchPlans();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Investment Strategy Plans
          </h2>
          <p className="text-xs text-[#848E9C] mt-1">
            Create and edit quantitative strategies, adjust daily yield distributions, set capital limits and durations.
          </p>
        </div>

        <button
          onClick={() =>
            setEditingPlan({
              name: '',
              tagline: '',
              min_amount: 1000,
              max_amount: 25000,
              duration_days: 30,
              daily_roi: 1.5,
              total_roi: 45.0,
              risk_tier: 'Moderate',
              management_fee: 0.5,
              return_method: 'Daily automated yield accrual with principal unlock at maturity',
              description: 'Quantitative arbitrage and liquidity strategy.',
              is_active: 1
            })
          }
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold text-xs uppercase tracking-wider shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Strategy Plan</span>
        </button>
      </div>

      {/* Plans List Table */}
      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-[#1E2329] text-[#848E9C] uppercase text-[10px] tracking-wider border-b border-[#2B313A]">
              <tr>
                <th className="py-3 px-4">Plan Name</th>
                <th className="py-3 px-4">Daily ROI (%)</th>
                <th className="py-3 px-4">Total ROI (%)</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Min / Max Capital</th>
                <th className="py-3 px-4">Risk Tier</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B313A] font-mono">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#848E9C] font-sans">
                    Loading plans...
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.id} className="hover:bg-[#1E2329]/50">
                    <td className="py-3.5 px-4 font-sans font-bold text-white">
                      {p.name}
                      <div className="text-[10px] text-[#848E9C] font-mono">{p.slug}</div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-[#0ECB81] text-sm">
                      {p.daily_roi}% / day
                    </td>

                    <td className="py-3.5 px-4 font-bold text-[#F0B90B]">
                      {p.total_roi}%
                    </td>

                    <td className="py-3.5 px-4 text-white">
                      {p.duration_days} Days
                    </td>

                    <td className="py-3.5 px-4 text-[#848E9C]">
                      ${p.min_amount.toLocaleString()} - ${p.max_amount.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#1E2329] text-[#848E9C]">
                        {p.risk_tier}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        p.is_active
                          ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                          : 'bg-[#1E2329] text-[#5E6673]'
                      }`}>
                        {p.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-sans">
                      <button
                        onClick={() => setEditingPlan({ ...p })}
                        className="px-3 py-1.5 rounded-lg bg-[#1E2329] hover:bg-[#2B313A] text-white border border-[#2B313A] text-xs font-semibold cursor-pointer"
                      >
                        Edit Plan
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Create Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setEditingPlan(null)}
              className="absolute top-5 right-5 p-1 text-[#848E9C] hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-1">
              {editingPlan.id ? `Edit Strategy: ${editingPlan.name}` : 'Configure New Strategy Plan'}
            </h3>
            <p className="text-xs text-[#848E9C] mb-6">
              Configure parameters, disclosed return methodology, duration and tier limits.
            </p>

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1">Strategy Name *</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.name || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    placeholder="e.g. OX Quantum Arbitrage"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1">Risk Tier *</label>
                  <select
                    value={editingPlan.risk_tier || 'Moderate'}
                    onChange={(e) => setEditingPlan({ ...editingPlan, risk_tier: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B]"
                  >
                    <option value="Conservative">Conservative</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Aggressive">Aggressive</option>
                    <option value="Institutional">Institutional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">Tagline</label>
                <input
                  type="text"
                  value={editingPlan.tagline || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, tagline: e.target.value })}
                  placeholder="Short one-line description"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1">Duration (Days) *</label>
                  <input
                    type="number"
                    required
                    value={editingPlan.duration_days || 30}
                    onChange={(e) => {
                      const days = parseInt(e.target.value) || 30;
                      const daily = editingPlan.daily_roi || 1.5;
                      setEditingPlan({ ...editingPlan, duration_days: days, total_roi: Number((days * daily).toFixed(2)) });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1">Daily ROI (%) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingPlan.daily_roi || 1.5}
                    onChange={(e) => {
                      const daily = parseFloat(e.target.value) || 0;
                      const days = editingPlan.duration_days || 30;
                      setEditingPlan({ ...editingPlan, daily_roi: daily, total_roi: Number((days * daily).toFixed(2)) });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1">Total ROI (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingPlan.total_roi || 45.0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, total_roi: parseFloat(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1">Min Capital ($) *</label>
                  <input
                    type="number"
                    required
                    value={editingPlan.min_amount || 1000}
                    onChange={(e) => setEditingPlan({ ...editingPlan, min_amount: parseFloat(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1">Max Capital ($) *</label>
                  <input
                    type="number"
                    required
                    value={editingPlan.max_amount || 50000}
                    onChange={(e) => setEditingPlan({ ...editingPlan, max_amount: parseFloat(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#848E9C] mb-1">Fee (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingPlan.management_fee || 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, management_fee: parseFloat(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs font-mono focus:outline-none focus:border-[#F0B90B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">Disclosed Return Calculation Method *</label>
                <input
                  type="text"
                  required
                  value={editingPlan.return_method || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, return_method: e.target.value })}
                  placeholder="e.g. Daily algorithmic accrual with principal unlock upon strategy maturity"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">Strategy Description *</label>
                <textarea
                  rows={3}
                  required
                  value={editingPlan.description || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0E11] border border-[#2B313A] text-white text-xs focus:outline-none focus:border-[#F0B90B] resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="planActive"
                  checked={editingPlan.is_active === 1 || editingPlan.is_active === undefined}
                  onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked ? 1 : 0 })}
                  className="rounded border-[#2B313A] bg-[#0B0E11] text-[#F0B90B] focus:ring-[#F0B90B]"
                />
                <label htmlFor="planActive" className="text-xs text-[#EAECEF] cursor-pointer">
                  Plan is Active and Open to Investor Subscriptions
                </label>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="flex-1 py-3 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-black font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Strategy Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
