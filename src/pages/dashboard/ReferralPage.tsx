import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Copy, Check, Gift, Award } from 'lucide-react';

export const ReferralPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const fetchReferralStats = async () => {
    try {
      const res = await fetch('/api/referrals/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load referral stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralStats();
  }, []);

  const referralCode = stats?.referral_code || user?.referral_code || 'OX-INVESTOR';
  const referralLink = `${window.location.origin}?ref=${referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Referral Program
        </h2>
        <p className="text-xs text-[#848E9C] mt-1">
          Share your dedicated referral invitation link to earn an instant {stats?.commission_rate_percent || 5.0}% reward on your downline's active strategy allocations.
        </p>
      </div>

      {/* Referral Link & Code Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="p-5 sm:p-6 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F0B90B] mb-2">
              <Gift className="w-4 h-4" />
              <span>Unique Referral Link</span>
            </div>
            <p className="text-xs text-[#848E9C] mb-4">
              Share this link with partner investors to automatically attribute registrations to your account.
            </p>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] mb-3">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="w-full bg-transparent text-xs text-[#EAECEF] font-mono focus:outline-none"
              />
              <button
                onClick={copyLink}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                  copiedLink
                    ? 'bg-[#0ECB81] text-[#0B0E11]'
                    : 'bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11]'
                }`}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
          <div className="text-[11px] text-[#5E6673]">
            Commission credited in cash upon downline strategy activation.
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#F0B90B] mb-2">
              <Award className="w-4 h-4" />
              <span>Referral Code</span>
            </div>
            <p className="text-xs text-[#848E9C] mb-4">
              Investors can also manually enter this code during the registration onboarding workflow.
            </p>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] mb-3">
              <input
                type="text"
                readOnly
                value={referralCode}
                className="w-full bg-transparent text-sm text-[#F0B90B] font-mono font-bold tracking-widest focus:outline-none"
              />
              <button
                onClick={copyCode}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                  copiedCode
                    ? 'bg-[#0ECB81] text-[#0B0E11]'
                    : 'bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11]'
                }`}
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
          <div className="text-[11px] text-[#5E6673]">
            Active Commission Rate: <strong className="text-[#0ECB81]">{stats?.commission_rate_percent || 5.0}%</strong>
          </div>
        </div>
      </div>

      {/* Referral KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#181A20] border border-[#2B313A]">
          <div className="text-xs text-[#848E9C] font-semibold uppercase tracking-wider mb-1">
            Total Referred
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-white">
            {stats?.total_referred || 0}
          </div>
          <div className="text-[11px] text-[#5E6673] mt-1">Directly attributed accounts</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#181A20] border border-[#2B313A]">
          <div className="text-xs text-[#848E9C] font-semibold uppercase tracking-wider mb-1">
            Active Investors
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#0ECB81]">
            {stats?.active_referred || 0}
          </div>
          <div className="text-[11px] text-[#5E6673] mt-1">With active investment strategies</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#181A20] border border-[#2B313A]">
          <div className="text-xs text-[#848E9C] font-semibold uppercase tracking-wider mb-1">
            Total Commission Earned
          </div>
          <div className="text-2xl sm:text-3xl font-black font-mono text-[#0ECB81]">
            ${(stats?.total_commission_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#0ECB81] mt-1">Credited as cash balance</div>
        </div>
      </div>

      {/* Referred Investors Table */}
      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        <h3 className="text-base font-bold text-white mb-4">
          Referral Downline
        </h3>

        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-[#1E2329] text-[#848E9C] uppercase text-[10px] tracking-wider border-b border-[#2B313A]">
              <tr>
                <th className="py-3 px-4">Investor Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Active Positions</th>
                <th className="py-3 px-4">Commission</th>
                <th className="py-3 px-4">Joined At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2B313A] font-mono">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#848E9C] font-sans">
                    Loading referral downline...
                  </td>
                </tr>
              ) : !stats?.referral_list || stats.referral_list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#848E9C] font-sans">
                    No referred investors yet. Copy your referral link above and share it with potential investors.
                  </td>
                </tr>
              ) : (
                stats.referral_list.map((ref: any, i: number) => (
                  <tr key={i} className="hover:bg-[#1E2329]/50">
                    <td className="py-3.5 px-4 font-sans font-bold text-white">
                      {ref.full_name}
                    </td>
                    <td className="py-3.5 px-4 text-[#848E9C]">
                      {ref.email.substring(0, 3)}***@{ref.email.split('@')[1]}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span className="px-2 py-0.5 rounded bg-[#1E2329] text-white text-[10px] font-bold">
                        {ref.active_investments} Active
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#0ECB81]">
                      +${(ref.total_commission || 0).toFixed(2)} USD
                    </td>
                    <td className="py-3.5 px-4 text-[#5E6673] text-[11px]">
                      {new Date(ref.joined_at).toLocaleDateString()}
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
