import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, WalletBalances } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  balances: WalletBalances;
  kycStatus: string;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    full_name: string;
    email: string;
    phone: string;
    country: string;
    password: string;
    password_confirmation: string;
    referral_code?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  toggle2FA: () => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [balances, setBalances] = useState<WalletBalances>({
    USD: { available: 0, locked: 0, total: 0 },
    BTC: { available: 0, locked: 0, total: 0 },
    USDT: { available: 0, locked: 0, total: 0 }
  });
  const [kycStatus, setKycStatus] = useState<string>('not_submitted');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.balances) setBalances(data.balances);
        if (data.kyc_status) setKycStatus(data.kyc_status);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to restore auth session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      await fetchCurrentUser();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const register = async (formData: {
    full_name: string;
    email: string;
    phone: string;
    country: string;
    password: string;
    password_confirmation: string;
    referral_code?: string;
  }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      await fetchCurrentUser();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setBalances({
        USD: { available: 0, locked: 0, total: 0 },
        BTC: { available: 0, locked: 0, total: 0 },
        USDT: { available: 0, locked: 0, total: 0 }
      });
      setKycStatus('not_submitted');
    }
  };

  const refreshProfile = async () => {
    await fetchCurrentUser();
  };

  const toggle2FA = async () => {
    try {
      const res = await fetch('/api/auth/toggle-2fa', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        if (user) {
          setUser({ ...user, two_factor_enabled: data.two_factor_enabled });
        }
        return { success: true, enabled: !!data.two_factor_enabled };
      }
      return { success: false, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        balances,
        kycStatus,
        loading,
        login,
        register,
        logout,
        refreshProfile,
        toggle2FA
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
