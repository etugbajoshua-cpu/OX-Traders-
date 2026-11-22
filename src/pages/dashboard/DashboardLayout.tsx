import React, { useState } from 'react';
import { Logo } from '../../components/common/Logo.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  LayoutDashboard,
  Briefcase,
  PieChart,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  TrendingUp,
  Activity,
  Users,
  Bell,
  ShieldCheck,
  User,
  KeyRound,
  HelpCircle,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface DashboardLayoutProps {
  activeSection: string;
  onNavigateSection: (section: string) => void;
  onNavigateHome: () => void;
  unreadNotifications?: number;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  activeSection,
  onNavigateSection,
  onNavigateHome,
  unreadNotifications: propUnread,
  children
}) => {
  const { user, balances, unreadNotifications: authUnread, logout } = useAuth();
  const unreadNotifications = propUnread ?? authUnread;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'investments', label: 'My Investments', icon: Briefcase },
    { id: 'plans', label: 'Investment Plans', icon: PieChart },
    { id: 'deposit', label: 'Deposit', icon: ArrowDownToLine, badge: 'BTC/USDT' },
    { id: 'withdraw', label: 'Withdraw', icon: ArrowUpFromLine },
    { id: 'transactions', label: 'Transaction History', icon: History },
    { id: 'trading', label: 'Trading', icon: TrendingUp },
    { id: 'markets', label: 'Crypto Markets', icon: Activity },
    { id: 'referrals', label: 'Referral Program', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell, count: unreadNotifications },
    { id: 'kyc', label: 'KYC Verification', icon: ShieldCheck },
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'security', label: 'Security Settings', icon: KeyRound },
    { id: 'support', label: 'Help and Support', icon: HelpCircle }
  ];

  const handleSelect = (id: string) => {
    onNavigateSection(id);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    onNavigateHome();
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#181A20] border-r border-[#2B313A] shrink-0 select-none">
        {/* Brand header */}
        <div className="p-5 border-b border-[#2B313A]">
          <button onClick={onNavigateHome} className="text-left focus:outline-none hover:opacity-90 cursor-pointer">
            <Logo variant="default" size="sm" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-3.5 mx-3 my-3 rounded-xl bg-[#1E2329] border border-[#2B313A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F0B90B] text-[#0B0E11] font-black text-sm flex items-center justify-center shrink-0">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">
                {user?.full_name || 'Verified Investor'}
              </div>
              <div className="text-[10px] text-[#F0B90B] font-mono truncate">
                Ref: {user?.referral_code || 'OX-8942'}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#F0B90B]/12 text-[#F0B90B] border border-[#F0B90B]/30'
                    : 'text-[#848E9C] border border-transparent hover:text-white hover:bg-[#1E2329]/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#F0B90B]' : 'text-[#848E9C]'}`} />
                  <span>{item.label}</span>
                </div>

                {item.count ? (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#F0B90B] text-[#0B0E11] text-[10px] font-bold">
                    {item.count}
                  </span>
                ) : item.badge ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#2B313A] text-[#848E9C]">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#2B313A] space-y-1">
          <button
            onClick={onNavigateHome}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#848E9C] hover:text-white rounded-lg hover:bg-[#1E2329] transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Public Website</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#F6465D] hover:text-rose-300 rounded-lg hover:bg-[#F6465D]/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 h-16 bg-[#181A20] border-b border-[#2B313A] px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#848E9C] hover:text-white hover:bg-[#1E2329]"
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-[#848E9C]">
              <span>Investor Desk</span>
              <ChevronRight className="w-3.5 h-3.5 text-[#5E6673]" />
              <span className="text-white font-semibold capitalize">
                {activeSection.replace('-', ' ')}
              </span>
            </div>
          </div>

          {/* Balance Pills & User Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Balance Summary */}
            <div className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-[#1E2329] border border-[#2B313A] text-xs font-mono tabular-nums">
              <div className="px-2 py-0.5 rounded-lg text-white flex items-center gap-1">
                <span className="text-[#0ECB81] font-bold">$</span>
                <span>{(balances.USD?.available || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="px-2 py-0.5 text-[#848E9C] flex items-center gap-1">
                <span className="text-[#F0B90B] font-bold">₿</span>
                <span>{(balances.BTC?.total || 0).toFixed(4)}</span>
              </div>
              <div className="px-2 py-0.5 text-[#848E9C] flex items-center gap-1">
                <span className="text-[#0ECB81] font-bold">₮</span>
                <span>{(balances.USDT?.total || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Deposit Button */}
            <button
              onClick={() => onNavigateSection('deposit')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </button>

            {/* Notifications Button */}
            <button
              onClick={() => onNavigateSection('notifications')}
              className="relative p-2 rounded-xl text-[#848E9C] hover:text-white hover:bg-[#1E2329] transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F0B90B]" />
              )}
            </button>

            {/* Profile Dropdown */}
            <button
              onClick={() => onNavigateSection('profile')}
              className="flex items-center gap-2 p-1 pl-2 rounded-xl bg-[#1E2329] border border-[#2B313A] hover:border-[#F0B90B]/50 text-xs cursor-pointer"
            >
              <span className="hidden sm:inline font-semibold text-white max-w-[100px] truncate">
                {user?.full_name?.split(' ')[0]}
              </span>
              <div className="w-7 h-7 rounded-lg bg-[#F0B90B] text-[#0B0E11] font-bold flex items-center justify-center">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
            </button>
          </div>
        </header>

        {/* Dashboard Main Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Binance Mobile App Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#181A20]/95 backdrop-blur-md border-t border-[#2B313A] px-2 py-1.5 pb-safe flex items-center justify-around select-none">
        <button
          onClick={() => handleSelect('overview')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeSection === 'overview' ? 'text-[#F0B90B]' : 'text-[#848E9C] hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold tracking-tight">Home</span>
        </button>

        <button
          onClick={() => handleSelect('markets')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeSection === 'markets' ? 'text-[#F0B90B]' : 'text-[#848E9C] hover:text-white'
          }`}
        >
          <Activity className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold tracking-tight">Markets</span>
        </button>

        <button
          onClick={() => handleSelect('trading')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeSection === 'trading' ? 'text-[#F0B90B]' : 'text-[#848E9C] hover:text-white'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold tracking-tight">Trade</span>
        </button>

        <button
          onClick={() => handleSelect('plans')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeSection === 'plans' ? 'text-[#F0B90B]' : 'text-[#848E9C] hover:text-white'
          }`}
        >
          <PieChart className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold tracking-tight">Earn</span>
        </button>

        <button
          onClick={() => handleSelect('deposit')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors cursor-pointer ${
            activeSection === 'deposit' || activeSection === 'withdraw' || activeSection === 'investments'
              ? 'text-[#F0B90B]'
              : 'text-[#848E9C] hover:text-white'
          }`}
        >
          <Briefcase className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-semibold tracking-tight">Wallets</span>
        </button>
      </nav>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-72 max-w-[85vw] bg-[#181A20] border-r border-[#2B313A] flex flex-col h-full animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-[#2B313A] flex items-center justify-between">
              <Logo variant="default" size="sm" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-[#848E9C] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold min-h-[44px] ${
                      isActive
                        ? 'bg-[#F0B90B]/12 text-[#F0B90B] font-bold border border-[#F0B90B]/30'
                        : 'text-[#848E9C] border border-transparent hover:text-white hover:bg-[#1E2329]/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.count ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-[#F0B90B] text-[#0B0E11] text-[10px] font-bold">
                        {item.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-[#2B313A]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#F6465D]/10 text-[#F6465D] text-xs font-semibold min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
