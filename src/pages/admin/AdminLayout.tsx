import React, { useState } from 'react';
import { Logo } from '../../components/common/Logo.tsx';
import { useAdminAuth } from '../../context/AdminAuthContext.tsx';
import {
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileCheck,
  PieChart,
  Settings,
  History,
  LifeBuoy,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  Shield,
  Activity
} from 'lucide-react';

interface AdminLayoutProps {
  activeTab: string;
  onNavigateTab: (tab: string) => void;
  onNavigateHome: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onNavigateTab,
  onNavigateHome,
  children
}) => {
  const { admin, adminLogout } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Admin Overview', icon: Activity },
    { id: 'users', label: 'User & Balance Management', icon: Users },
    { id: 'deposits', label: 'Deposit Verifications', icon: ArrowDownToLine },
    { id: 'withdrawals', label: 'Withdrawal Processing', icon: ArrowUpFromLine },
    { id: 'kyc', label: 'KYC Document Review', icon: FileCheck },
    { id: 'plans', label: 'Investment Plans', icon: PieChart },
    { id: 'tickets', label: 'Support Desk Tickets', icon: LifeBuoy },
    { id: 'settings', label: 'Platform & Wallet Settings', icon: Settings },
    { id: 'audit-logs', label: 'Immutable Audit Logs', icon: History }
  ];

  const handleSelect = (tab: string) => {
    onNavigateTab(tab);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await adminLogout();
    onNavigateHome();
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] flex flex-col lg:flex-row">
      {/* Desktop Admin Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#181A20] border-r border-[#2B313A] shrink-0 select-none">
        {/* Admin Brand Header */}
        <div className="p-5 border-b border-[#2B313A]">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#F0B90B]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#F0B90B]">
              OX Control Center
            </span>
          </div>
          <Logo variant="default" size="sm" showSubtitle={false} />
        </div>

        {/* Admin Badge */}
        <div className="p-3.5 mx-3 my-3 rounded-xl bg-[#1E2329] border border-[#2B313A] flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#F0B90B]/15 text-[#F0B90B] flex items-center justify-center font-bold text-xs shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-white truncate">{admin?.full_name || 'Master Admin'}</div>
            <div className="text-[10px] text-[#848E9C] truncate font-mono">{admin?.email}</div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#F0B90B]/12 text-[#F0B90B] border border-[#F0B90B]/30'
                    : 'text-[#848E9C] border border-transparent hover:text-white hover:bg-[#1E2329]/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#F0B90B]' : 'text-[#848E9C]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#2B313A] space-y-1">
          <button
            onClick={onNavigateHome}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#848E9C] hover:text-white rounded-lg hover:bg-[#1E2329] cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Public Site</span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#F6465D] hover:text-rose-300 rounded-lg hover:bg-[#F6465D]/10 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Admin Mode</span>
          </button>
        </div>
      </aside>

      {/* Main Admin Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-[#181A20] border-b border-[#2B313A] px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#848E9C] hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-xs text-[#848E9C]">
              <span className="text-[#F0B90B] font-bold uppercase text-[10px]">Restricted Desk</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#5E6673]" />
              <span className="text-white font-semibold capitalize">
                {activeTab.replace('-', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0ECB81]/15 border border-[#0ECB81]/30 text-[#0ECB81] text-xs font-mono font-bold">
              <span>LEDGER: ONLINE</span>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E2329] border border-[#2B313A] hover:border-[#F6465D]/30 text-[#F6465D] text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Admin Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-72 max-w-[85vw] bg-[#181A20] border-r border-[#2B313A] flex flex-col h-full animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-[#2B313A] flex items-center justify-between">
              <Logo variant="default" size="sm" showSubtitle={false} />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-[#848E9C] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold min-h-[44px] ${
                      isActive
                        ? 'bg-[#F0B90B]/12 text-[#F0B90B] font-bold border border-[#F0B90B]/30'
                        : 'text-[#848E9C] border border-transparent hover:text-white hover:bg-[#1E2329]/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-[#2B313A]">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F6465D]/10 text-[#F6465D] text-xs font-semibold min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Exit Admin Mode</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
