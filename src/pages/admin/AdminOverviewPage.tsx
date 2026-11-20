import React, { useEffect, useState } from 'react';
import {
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  PieChart,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface AdminOverviewPageProps {
  onNavigateTab: (tab: string) => void;
}

export const AdminOverviewPage: React.FC<AdminOverviewPageProps> = ({ onNavigateTab }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Executive Operations Overview
        </h2>
        <p className="text-xs text-[#848E9C] mt-1">
          Real-time platform metrics, pending compliance queues, and transactional throughput.
        </p>
      </div>

      {/* Critical Action Banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div
          onClick={() => onNavigateTab('deposits')}
          className="p-5 rounded-2xl bg-[#181A20] border border-[#2B313A] hover:border-[#F0B90B]/50 cursor-pointer transition-all flex items-center justify-between group shadow-md"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#F0B90B]/15 text-[#F0B90B] flex items-center justify-center font-bold">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#848E9C] font-semibold uppercase">Pending Deposits</div>
              <div className="text-2xl font-black font-mono text-white mt-0.5">
                {metrics?.deposits?.pending_count || 0}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#5E6673] group-hover:text-[#F0B90B] transition-colors" />
        </div>

        <div
          onClick={() => onNavigateTab('withdrawals')}
          className="p-5 rounded-2xl bg-[#181A20] border border-[#2B313A] hover:border-[#F0B90B]/50 cursor-pointer transition-all flex items-center justify-between group shadow-md"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#F0B90B]/15 text-[#F0B90B] flex items-center justify-center font-bold">
              <ArrowUpFromLine className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#848E9C] font-semibold uppercase">Pending Withdrawals</div>
              <div className="text-2xl font-black font-mono text-white mt-0.5">
                {metrics?.withdrawals?.pending_count || 0}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#5E6673] group-hover:text-[#F0B90B] transition-colors" />
        </div>

        <div
          onClick={() => onNavigateTab('kyc')}
          className="p-5 rounded-2xl bg-[#181A20] border border-[#2B313A] hover:border-[#F0B90B]/50 cursor-pointer transition-all flex items-center justify-between group shadow-md"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#0ECB81]/15 text-[#0ECB81] flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#848E9C] font-semibold uppercase">Pending KYC Reviews</div>
              <div className="text-2xl font-black font-mono text-white mt-0.5">
                {metrics?.users?.pending_kyc || 0}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#5E6673] group-hover:text-[#0ECB81] transition-colors" />
        </div>
      </div>

      {/* Aggregate Platform KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#181A20] border border-[#2B313A]">
          <div className="flex justify-between items-center text-xs text-[#848E9C] font-semibold uppercase mb-1">
            <span>Registered</span>
            <Users className="w-4 h-4 text-[#F0B90B]" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            {metrics?.users?.total || 0}
          </div>
          <div className="text-[11px] text-[#5E6673] mt-1">
            {metrics?.users?.verified || 0} KYC Verified
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#181A20] border border-[#2B313A]">
          <div className="flex justify-between items-center text-xs text-[#848E9C] font-semibold uppercase mb-1">
            <span>Deposits</span>
            <ArrowDownToLine className="w-4 h-4 text-[#0ECB81]" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#0ECB81]">
            ${(metrics?.deposits?.total_amount || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-[#5E6673] mt-1">
            {metrics?.deposits?.confirmed_count || 0} confirmed
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#181A20] border border-[#2B313A]">
          <div className="flex justify-between items-center text-xs text-[#848E9C] font-semibold uppercase mb-1">
            <span>Payouts</span>
            <ArrowUpFromLine className="w-4 h-4 text-[#F0B90B]" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            ${(metrics?.withdrawals?.total_amount || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-[#5E6673] mt-1">
            {metrics?.withdrawals?.completed_count || 0} broadcast
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#181A20] border border-[#2B313A]">
          <div className="flex justify-between items-center text-xs text-[#848E9C] font-semibold uppercase mb-1">
            <span>Active Capital</span>
            <PieChart className="w-4 h-4 text-[#0ECB81]" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            ${(metrics?.investments?.active_capital || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-[#5E6673] mt-1">
            {metrics?.investments?.active_count || 0} positions
          </div>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Registrations */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">Recent Registrations</h3>
            <button
              onClick={() => onNavigateTab('users')}
              className="text-xs text-[#F0B90B] font-bold hover:underline cursor-pointer"
            >
              All Users
            </button>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {!metrics?.recent_registrations || metrics.recent_registrations.length === 0 ? (
              <div className="text-center py-6 text-[#848E9C] font-sans">No recent registrations</div>
            ) : (
              metrics.recent_registrations.map((u: any) => (
                <div
                  key={u.id}
                  className="p-3 rounded-xl bg-[#1E2329] border border-[#2B313A] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 font-sans">
                    <div className="w-8 h-8 rounded-lg bg-[#F0B90B]/15 text-[#F0B90B] font-bold flex items-center justify-center text-xs">
                      {u.full_name?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">{u.full_name}</div>
                      <div className="text-[11px] text-[#848E9C] font-mono">{u.email}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-[#2B313A] text-white">
                      {u.status}
                    </span>
                    <div className="text-[10px] text-[#5E6673] mt-0.5">
                      {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Admin Audit Activity */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">Audit Trail</h3>
            <button
              onClick={() => onNavigateTab('audit-logs')}
              className="text-xs text-[#F0B90B] font-bold hover:underline cursor-pointer"
            >
              Full Log
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            {!metrics?.recent_audit_logs || metrics.recent_audit_logs.length === 0 ? (
              <div className="text-center py-6 text-[#848E9C] font-sans">No audit events recorded</div>
            ) : (
              metrics.recent_audit_logs.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#1E2329] border border-[#2B313A] flex items-start gap-2.5"
                >
                  <div className="w-2 h-2 rounded-full bg-[#F0B90B] mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white font-mono uppercase text-[11px]">{log.action}</span>
                      <span className="text-[10px] text-[#5E6673] font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[11px] text-[#848E9C] truncate mt-0.5">{log.details}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
