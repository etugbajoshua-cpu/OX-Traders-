import React, { useState, useEffect } from 'react';
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

import { LoadingScreen } from './components/common/LoadingScreen.tsx';

function AppContent() {
  const { user, loading: userLoading } = useAuth();
  const { admin, loading: adminLoading } = useAdminAuth();

  // Root Navigation Router
  const [currentView, setCurrentView] = useState<'public' | 'login' | 'register' | 'dashboard' | 'admin'>('public');
  const [publicSection, setPublicSection] = useState<string>('home');
  const [dashboardSection, setDashboardSection] = useState<string>('overview');
  const [adminTab, setAdminTab] = useState<string>('overview');
  const [initialRefCode, setInitialRefCode] = useState<string>('');

  // Handle URL detection on load
  useEffect(() => {
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
    }
  }, []);

  // Sync browser history state
  const navigateTo = (route: string) => {
    if (route === 'home' || route === 'about' || route === 'plans' || route === 'trading' || route === 'markets' || route === 'how-it-works' || route === 'security' || route === 'faq' || route === 'contact') {
      setCurrentView('public');
      setPublicSection(route);
      window.history.pushState({}, '', '/');
      // Smooth scroll if matching element
      const el = document.getElementById(route);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (route === 'login') {
      setCurrentView('login');
      window.history.pushState({}, '', '/login');
    } else if (route === 'register') {
      setCurrentView('register');
      window.history.pushState({}, '', '/register');
    } else if (route === 'dashboard') {
      setCurrentView('dashboard');
      window.history.pushState({}, '', '/dashboard');
    } else if (route === 'admin' || route === 'ox-control-center') {
      setCurrentView('admin');
      window.history.pushState({}, '', '/ox-control-center');
    }
  };

  if (userLoading || adminLoading) {
    return <LoadingScreen message="Initializing OX TRADERS..." subtext="Connecting to secure trading nodes" />;
  }

  // 1. Private Administration Panel (/ox-control-center)
  if (currentView === 'admin') {
    if (!admin) {
      return (
        <AdminLoginPage
          onSuccess={() => setCurrentView('admin')}
          onNavigateHome={() => navigateTo('home')}
        />
      );
    }

    return (
      <AdminLayout
        activeTab={adminTab}
        onNavigateTab={(tab) => setAdminTab(tab)}
        onNavigateHome={() => navigateTo('home')}
      >
        {adminTab === 'overview' && <AdminOverviewPage onNavigateTab={(t) => setAdminTab(t)} />}
        {adminTab === 'users' && <AdminUsersPage />}
        {adminTab === 'deposits' && <AdminDepositsPage />}
        {adminTab === 'withdrawals' && <AdminWithdrawalsPage />}
        {adminTab === 'kyc' && <AdminKYCPage />}
        {adminTab === 'plans' && <AdminPlansPage />}
        {adminTab === 'tickets' && <AdminTicketsPage />}
        {adminTab === 'settings' && <AdminSettingsPage />}
        {adminTab === 'audit-logs' && <AdminAuditLogsPage />}
      </AdminLayout>
    );
  }

  // 2. Investor Dashboard
  if (currentView === 'dashboard') {
    if (!user) {
      return <LoginPage onNavigate={navigateTo} />;
    }

    return (
      <DashboardLayout
        activeSection={dashboardSection}
        onNavigateSection={(sec) => setDashboardSection(sec)}
        onNavigateHome={() => navigateTo('home')}
      >
        {dashboardSection === 'overview' && <OverviewPage onNavigateSection={(s) => setDashboardSection(s)} />}
        {dashboardSection === 'investments' && <InvestmentsPage onNavigateSection={(s) => setDashboardSection(s)} />}
        {dashboardSection === 'plans' && <PlansPage onNavigateSection={(s) => setDashboardSection(s)} />}
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
      </DashboardLayout>
    );
  }

  // 3. User Login
  if (currentView === 'login') {
    return <LoginPage onNavigate={navigateTo} />;
  }

  // 4. User Registration
  if (currentView === 'register') {
    return <RegisterPage onNavigate={navigateTo} initialReferralCode={initialRefCode} />;
  }

  // 5. Public Website
  return <PublicHomePage onNavigate={navigateTo} currentSection={publicSection} />;
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
