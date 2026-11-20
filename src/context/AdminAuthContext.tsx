import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  role: 'admin';
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  adminLogout: () => Promise<void>;
  checkAdminSession: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAdminSession = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        // Active admin session verified
        const storedAdmin = localStorage.getItem('ox_admin_user');
        if (storedAdmin) {
          setAdmin(JSON.parse(storedAdmin));
        } else {
          setAdmin({ id: 1, email: 'admin@oxtraders.com', full_name: 'OX TRADERS Master Admin', role: 'admin' });
        }
        return true;
      } else {
        setAdmin(null);
        localStorage.removeItem('ox_admin_user');
        return false;
      }
    } catch {
      setAdmin(null);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminSession();
  }, []);

  const adminLogin = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid administrator credentials' };
      }

      setAdmin(data.admin);
      localStorage.setItem('ox_admin_user', JSON.stringify(data.admin));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const adminLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Admin logout error:', err);
    } finally {
      setAdmin(null);
      localStorage.removeItem('ox_admin_user');
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        loading,
        adminLogin,
        adminLogout,
        checkAdminSession
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
