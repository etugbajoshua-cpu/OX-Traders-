import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Mail, Phone, Globe, Calendar } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, kycStatus } = useAuth();

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Investor Profile
        </h2>
        <p className="text-xs text-[#848E9C] mt-1">
          Review your registered identity details, contact configurations, and account tier.
        </p>
      </div>

      <div className="p-5 sm:p-8 rounded-2xl bg-[#181A20] border border-[#2B313A] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#2B313A]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#F0B90B] text-[#0B0E11] font-black text-2xl flex items-center justify-center shrink-0">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white">{user?.full_name}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  kycStatus === 'verified'
                    ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                    : 'bg-[#F0B90B]/15 text-[#F0B90B]'
                }`}>
                  {kycStatus === 'verified' ? 'Verified Investor' : 'Standard Tier'}
                </span>
              </div>
              <div className="text-xs text-[#848E9C] font-mono mt-0.5">
                Investor ID: #{user?.id || 1} • Referral Code: {user?.referral_code}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#1E2329] border border-[#2B313A] text-xs font-mono">
            <span className="text-[#848E9C] block text-[10px] uppercase">Account Status</span>
            <span className="text-[#0ECB81] font-bold uppercase tracking-wider">{user?.status || 'active'}</span>
          </div>
        </div>

        {/* Profile Details List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-6">
          <div className="space-y-1">
            <div className="text-xs text-[#848E9C] uppercase tracking-wider font-semibold">Email Address</div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#F0B90B]" />
              <span>{user?.email}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-[#848E9C] uppercase tracking-wider font-semibold">Phone Number</div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#F0B90B]" />
              <span>{user?.phone || 'Not configured'}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-[#848E9C] uppercase tracking-wider font-semibold">Country of Residence</div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#F0B90B]" />
              <span>{user?.country || 'United Kingdom'}</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-[#848E9C] uppercase tracking-wider font-semibold">Registered Since</div>
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#848E9C]" />
              <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active Member'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
