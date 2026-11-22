import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, MASTER_ADMIN_EMAIL } from '../lib/firebase.ts';
import { verifyAdminAccess } from '../lib/firestoreService.ts';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin';
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  adminLoginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  adminLogout: () => Promise<void>;
  checkAdminSession: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const evaluateFirebaseAdmin = useCallback(async (fbUser: typeof auth.currentUser): Promise<boolean> => {
    if (!fbUser) {
      setAdmin(null);
      return false;
    }

    try {
      const authorized = await verifyAdminAccess(fbUser);
      if (authorized) {
        setAdmin({
          id: fbUser.uid,
          email: fbUser.email || MASTER_ADMIN_EMAIL,
          full_name: fbUser.displayName || 'OX TRADERS Master Admin',
          role: 'admin',
        });
        return true;
      }
      setAdmin(null);
      return false;
    } catch {
      setAdmin(null);
      return false;
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      await evaluateFirebaseAdmin(fbUser);
      setLoading(false);
    });
    return () => unsub();
  }, [evaluateFirebaseAdmin]);

  const checkAdminSession = async (): Promise<boolean> => {
    return evaluateFirebaseAdmin(auth.currentUser);
  };

  const adminLoginWithGoogle = async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const authorized = await evaluateFirebaseAdmin(cred.user);
      if (!authorized) {
        await signOut(auth);
        return {
          success: false,
          error: `Access denied: ${cred.user.email || 'this Google account'} is not authorized for OX Control Center.`,
        };
      }
      return { success: true };
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'Google verification popup closed before completion.' };
      }
      if (code === 'auth/unauthorized-domain') {
        return {
          success: false,
          error: `Domain "${window.location.hostname}" must be added under Firebase Console -> Authentication -> Settings -> Authorized domains.`,
        };
      }
      return { success: false, error: err?.message || 'Operator verification failed.' };
    }
  };

  const adminLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Admin sign out error:', err);
    } finally {
      setAdmin(null);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        loading,
        adminLoginWithGoogle,
        adminLogout,
        checkAdminSession,
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
