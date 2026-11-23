import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext.tsx';
import { PublicHomePage } from './pages/PublicHomePage.tsx';
import { LoginPage } from './pages/auth/LoginPage.tsx';
import { RegisterPage } from './pages/auth/RegisterPage.tsx';

// Investor Dashboard
import { DashboardLayout } from './pages/dashboard/DashboardLayout.tsx';
import { OverviewPage } from './pages/dashboard/OverviewPage.tsx';
import { InvestmentsPage } from './pages/dashboard/InvestmentsPage.tsx';
import { PlansPage } from './pages/dashboard/PlansPage.tsx';
import { DepositPage } from './pages/dashboard/DepositPage.tsx';
import { WithdrawPage } from './pages/dashboard/WithdrawPage.tsx';
import { TransactionsPage } from './pages/dashboard/TransactionsPage.tsx';
import { TradingPage } from './pages/dashboard/TradingPage.tsx';
import { MarketsPage } from './pages/dashboard/MarketsPage.tsx';
import { ReferralPage } from './pages/dashboard/ReferralPage.tsx';
import { KYCPage } from './pages/dashboard/KYCPage.tsx';
import { ProfilePage } from './pages/dashboard/ProfilePage.tsx';
import { SecurityPage } from './pages/dashboard/SecurityPage.tsx';
import { SupportPage } from './pages/dashboard/SupportPage.tsx';
import { NotificationsPage } from './pages/dashboard/NotificationsPage.tsx';

// Admin Panel
import { AdminLoginPage } from './pages/admin/AdminLoginPage.tsx';
import { AdminLayout } from './pages/admin/AdminLayout.tsx';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage.tsx';
import { AdminUsersPage } from './pages/admin/AdminUsersPage.tsx';
import { AdminDepositsPage } from './pages/admin/AdminDepositsPage.tsx';
import { AdminWithdrawalsPage } from './pages/admin/AdminWithdrawalsPage.tsx';
import { AdminKYCPage } from './pages/admin/AdminKYCPage.tsx';
import { AdminPlansPage } from './pages/admin/AdminPlansPage.tsx';
import { AdminTicketsPage } from './pages/admin/AdminTicketsPage.tsx';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage.tsx';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage.tsx';

import { LoadingScreen, PageTransitionLoader } from './components/common/LoadingScreen.tsx';
import { FloatingWithdrawalNotifications } from './components/common/FloatingWithdrawalNotifications.tsx';

const ROUTE_LABELS: Record<string, { title: string; subtitle: string }> = {
  home: { title: 'OX TRADERS Home', subtitle: 'oxtraders.online' },
  about: { title: 'Platform Architecture', subtitle: 'oxtraders.online' },
  plans: { title: 'Investment Strategies', subtitle: 'Yield & Allocation' },
  trading: { title: 'Trading Terminal', subtitle: 'Execution Matrix' },
  markets: { title: 'Live Crypto Markets', subtitle: 'Order Book Feeds' },
  'how-it-works': { title: 'How It Works', subtitle: 'Onboarding Flow' },
  security: { title: 'Custody & Security', subtitle: 'Cold Storage Audit' },
  faq: { title: 'Investor FAQ', subtitle: 'Platform Guide' },
  login: { title: 'Account Sign In', subtitle: 'Encrypted Gateway' },
  register: { title: 'Create Investor Account', subtitle: 'Instant Onboarding' },
  dashboard: { title: 'Investor Dashboard', subtitle: 'Portfolio Desk' },
  admin: { title: 'Control Center', subtitle: 'Restricted Desk' },
  'ox-control-center': { title: 'Control Center', subtitle: 'Restricted Desk' },
  overview: { title: 'Portfolio Overview', subtitle: 'Investor Desk' },
  investments: { title: 'Active Investments', subtitle: 'Strategy Ledger' },
  deposit: { title: 'Crypto Deposit', subtitle: 'BTC & USDT TRC20' },
  withdraw: { title: 'Withdraw Funds', subtitle: 'Custody Settlement' },
  transactions: { title: 'Transaction Ledger', subtitle: 'Double-Entry Log' },
  referrals: { title: 'Referral Program', subtitle: 'Partner Rewards' },
  notifications: { title: 'Notifications', subtitle: 'Account Alerts' },
  kyc: { title: 'KYC Verification', subtitle: 'Compliance Desk' },
  profile: { title: 'Profile Settings', subtitle: 'Account Details' },
  support: { title: 'Help & Support', subtitle: 'Ticket Desk' },
  users: { title: 'User & Balance Desk', subtitle: 'Admin Console' },
  deposits: { title: 'Deposit Verifications', subtitle: 'Admin Console' },
  withdrawals: { title: 'Withdrawal Queue', subtitle: 'Admin Console' },
  tickets: { title: 'Support Tickets', subtitle: 'Admin Console' },
  settings: { title: 'Platform Settings', subtitle: 'Admin Console' },
  'audit-logs': { title: 'Immutable Audit Logs', subtitle: 'Admin Console' }
};

function AppContent() {
  const { user, loading: userLoading } = useAuth();
  const { admin, loading: adminLoading } = useAdminAuth();

  // Root Navigation Router
  const [currentView, setCurrentView] = useState<'public' | 'login' | 'register' | 'dashboard' | 'admin'>('public');
  const [publicSection, setPublicSection] = useState<string>('home');
  const [dashboardSection, setDashboardSection] = useState<string>('overview');
  const [adminTab, setAdminTab] = useState<string>('overview');
  const [initialRefCode, setInitialRefCode] = useState<string>('');

  // Unique Page-Transition Loading State
  const [transition, setTransition] = useState<{
    visible: boolean;
    title: string;
    subtitle: string;
    key: number;
  }>({
    visible: false,
    title: '',
    subtitle: 'oxtraders.online',
    key: 0
  });
  const swapTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  const clearTransitionTimers = () => {
    if (swapTimerRef.current) {
      window.clearTimeout(swapTimerRef.current);
      swapTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTransitionTimers();
  }, []);

  const triggerPageTransition = useCallback((key: string, applyNavigation: () => void) => {
    const meta = ROUTE_LABELS[key] || { title: 'OX TRADERS', subtitle: 'oxtraders.online' };
    clearTransitionTimers();

    setTransition((prev) => ({
      visible: true,
      title: meta.title,
      subtitle: meta.subtitle,
      key: prev.key + 1
    }));

    swapTimerRef.current = window.setTimeout(() => {
      applyNavigation();
    }, 180);

    hideTimerRef.current = window.setTimeout(() => {
      setTransition((prev) => ({ ...prev, visible: false }));
    }, 460);
  }, []);

  // Handle URL detection on initial load and browser back/forward navigation
  useEffect(() => {
    const syncFromPath = () => {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const ref = searchParams.get('ref');
      if (ref) {
        setInitialRefCode(ref);
      }

      if (path === '/ox-control-center' || path.startsWith('/ox-control-center')) {
        setCurrentView('admin');
      } else if (path === '/dashboard') {
        setCurrentView('dashboard');
      } else if (path === '/login') {
        setCurrentView('login');
      } else if (path === '/register') {
        setCurrentView('register');
      } else {
        setCurrentView('public');
      }
    };

    syncFromPath();
    window.addEventListener('popstate', syncFromPath);
    return () => window.removeEventListener('popstate', syncFromPath);
  }, []);

  // Sync browser history state with page-click transition
  const navigateTo = useCallback(
    (route: string) => {
      const publicSections = ['home', 'about', 'plans', 'trading', 'markets', 'how-it-works', 'security', 'faq', 'contact'];
      const isPublicScroll = publicSections.includes(route) && currentView === 'public';

      if (isPublicScroll && route === 'home') {
        triggerPageTransition('home', () => {
          setPublicSection('home');
          window.history.pushState({}, '', '/');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        return;
      }

      if (isPublicScroll) {
        triggerPageTransition(route, () => {
          setPublicSection(route);
          window.history.pushState({}, '', '/');
          const el = document.getElementById(route);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        });
        return;
      }

      triggerPageTransition(route, () => {
        if (publicSections.includes(route)) {
          setCurrentView('public');
          setPublicSection(route);
          window.history.pushState({}, '', '/');
          window.setTimeout(() => {
            if (route === 'home') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              const el = document.getElementById(route);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }
          }, 60);
        } else if (route === 'login') {
          setCurrentView('login');
          window.history.pushState({}, '', '/login');
          window.scrollTo({ top: 0 });
        } else if (route === 'register') {
          setCurrentView('register');
          window.history.pushState({}, '', '/register');
          window.scrollTo({ top: 0 });
        } else if (route === 'dashboard') {
          setCurrentView('dashboard');
          window.history.pushState({}, '', '/dashboard');
          window.scrollTo({ top: 0 });
        } else if (route === 'admin' || route === 'ox-control-center') {
          setCurrentView('admin');
          window.history.pushState({}, '', '/ox-control-center');
          window.scrollTo({ top: 0 });
        }
      });
    },
    [currentView, triggerPageTransition]
  );

  const navigateDashboardSection = useCallback(
    (sec: string) => {
      if (sec === dashboardSection) return;
      triggerPageTransition(sec, () => {
        setDashboardSection(sec);
        window.scrollTo({ top: 0 });
      });
    },
    [dashboardSection, triggerPageTransition]
  );

  const navigateAdminTab = useCallback(
    (tab: string) => {
      if (tab === adminTab) return;
      triggerPageTransition(tab, () => {
        setAdminTab(tab);
        window.scrollTo({ top: 0 });
      });
    },
    [adminTab, triggerPageTransition]
  );

  if (userLoading || adminLoading) {
    return <LoadingScreen message="Initializing OX TRADERS..." subtext="Connecting to oxtraders.online trading nodes" />;
  }

  let viewNode: React.ReactNode = null;

  // 1. Private Administration Panel (/ox-control-center)
  if (currentView === 'admin') {
    if (!admin) {
      viewNode = (
        <div key="admin-login" className="ox-page-enter">
          <AdminLoginPage
            onSuccess={() => triggerPageTransition('admin', () => setCurrentView('admin'))}
            onNavigateHome={() => navigateTo('home')}
          />
        </div>
      );
    } else {
      viewNode = (
        <div key="admin-panel" className="ox-page-enter">
          <AdminLayout
            activeTab={adminTab}
            onNavigateTab={navigateAdminTab}
            onNavigateHome={() => navigateTo('home')}
          >
            <div key={adminTab} className="ox-page-enter">
              {adminTab === 'overview' && <AdminOverviewPage onNavigateTab={navigateAdminTab} />}
              {adminTab === 'users' && <AdminUsersPage />}
              {adminTab === 'deposits' && <AdminDepositsPage />}
              {adminTab === 'withdrawals' && <AdminWithdrawalsPage />}
              {adminTab === 'kyc' && <AdminKYCPage />}
              {adminTab === 'plans' && <AdminPlansPage />}
              {adminTab === 'tickets' && <AdminTicketsPage />}
              {adminTab === 'settings' && <AdminSettingsPage />}
              {adminTab === 'audit-logs' && <AdminAuditLogsPage />}
            </div>
          </AdminLayout>
        </div>
      );
    }
  } else if (currentView === 'dashboard') {
    // 2. Investor Dashboard
    if (!user) {
      viewNode = (
        <div key="login-gate" className="ox-page-enter">
          <LoginPage onNavigate={navigateTo} />
        </div>
      );
    } else {
      viewNode = (
        <div key="dashboard" className="ox-page-enter">
          <DashboardLayout
            activeSection={dashboardSection}
            onNavigateSection={navigateDashboardSection}
            onNavigateHome={() => navigateTo('home')}
          >
            <div key={dashboardSection} className="ox-page-enter">
              {dashboardSection === 'overview' && <OverviewPage onNavigateSection={navigateDashboardSection} />}
              {dashboardSection === 'investments' && <InvestmentsPage onNavigateSection={navigateDashboardSection} />}
              {dashboardSection === 'plans' && <PlansPage onNavigateSection={navigateDashboardSection} />}
              {dashboardSection === 'deposit' && <DepositPage />}
              {dashboardSection === 'withdraw' && <WithdrawPage />}
              {dashboardSection === 'transactions' && <TransactionsPage />}
              {dashboardSection === 'trading' && <TradingPage />}
              {dashboardSection === 'markets' && <MarketsPage />}
              {dashboardSection === 'referrals' && <ReferralPage />}
              {dashboardSection === 'notifications' && <NotificationsPage />}
              {dashboardSection === 'kyc' && <KYCPage />}
              {dashboardSection === 'profile' && <ProfilePage />}
              {dashboardSection === 'security' && <SecurityPage />}
              {dashboardSection === 'support' && <SupportPage />}
            </div>
          </DashboardLayout>
        </div>
      );
    }
  } else if (currentView === 'login') {
    viewNode = (
      <div key="login" className="ox-page-enter">
        <LoginPage onNavigate={navigateTo} />
      </div>
    );
  } else if (currentView === 'register') {
    viewNode = (
      <div key="register" className="ox-page-enter">
        <RegisterPage onNavigate={navigateTo} initialReferralCode={initialRefCode} />
      </div>
    );
  } else {
    viewNode = (
      <div key="public" className="ox-page-enter">
        <PublicHomePage onNavigate={navigateTo} currentSection={publicSection} />
      </div>
    );
  }

  return (
    <>
      <PageTransitionLoader
        visible={transition.visible}
        title={transition.title}
        subtitle={transition.subtitle}
        transitionKey={transition.key}
      />
      <FloatingWithdrawalNotifications currentView={currentView} />
      {viewNode}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <AppContent />
      </AdminAuthProvider>
    </AuthProvider>
  );
}
