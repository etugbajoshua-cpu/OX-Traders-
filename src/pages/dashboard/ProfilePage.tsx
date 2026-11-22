import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Mail, Phone, Globe, Calendar, Edit3, CheckCircle2, Save } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, kycStatus, updateProfileDetails } = useAuth();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [country, setCountry] = useState(user?.country || 'United Kingdom');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setCountry(user.country || 'United Kingdom');
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateProfileDetails({
      fullName: fullName.trim(),
      phone: phone.trim(),
      country: country.trim(),
    });
    setSaving(false);
    if (res.success) {
      setEditing(false);
      setNotice('Profile saved permanently to your investor account.');
      setTimeout(() => setNotice(null), 3500);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Investor Profile
          </h2>
          <p className="text-xs text-[#848E9C] mt-1">
            Review and maintain your cloud-synced identity details, contact details, and verification tier.
          </p>
        </div>

        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1E2329] hover:bg-[#2B313A] border border-[#2B313A] text-xs font-semibold text-white cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-[#F0B90B]" />
            <span>Edit Details</span>
          </button>
        )}
      </div>

      {notice && (
        <div className="p-4 rounded-xl bg-[#0ECB81]/15 border border-[#0ECB81]/30 text-[#0ECB81] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

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
                Investor ID: {String(user?.id || '').slice(0, 12)} • Referral Code: {user?.referral_code}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#1E2329] border border-[#2B313A] text-xs font-mono">
            <span className="text-[#848E9C] block text-[10px] uppercase">Account Status</span>
            <span className="text-[#0ECB81] font-bold uppercase tracking-wider">{user?.status || 'active'}</span>
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="pt-6 space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-semibold text-[#848E9C] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+44 7700 900077"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#848E9C] mb-1">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-white text-sm focus:outline-none focus:border-[#F0B90B]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-5 py-2.5 rounded-xl bg-[#1E2329] border border-[#2B313A] text-[#848E9C] hover:text-white text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        ) : (
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
        )}
      </div>
    </div>
  );
};
