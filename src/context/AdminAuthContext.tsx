import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider, MASTER_ADMIN_EMAIL } from '../lib/firebase.ts';
import { isSuperAdminEmail, verifyAdminAccess } from '../lib/firestoreService.ts';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin';
  isSuperAdmin: boolean;
}

interface AdminLoginResult {
  success: boolean;
  error?: string;
  pendingUid?: string;
}

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  adminLoginWithGoogle: () => Promise<AdminLoginResult>;
  adminLoginWithCredentials: (email: string, password: string) => Promise<AdminLoginResult>;
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
        const superAdmin = !!fbUser.emailVerified && isSuperAdminEmail(fbUser.email);
        setAdmin({
          id: fbUser.uid,
          email: fbUser.email || MASTER_ADMIN_EMAIL,
          full_name:
            fbUser.displayName ||
            (superAdmin ? 'OX TRADERS Master Admin' : 'OX TRADERS Operator'),
          role: 'admin',
          isSuperAdmin: superAdmin,
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

  const adminLoginWithGoogle = async (): Promise<AdminLoginResult> => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const authorized = await evaluateFirebaseAdmin(cred.user);
      if (!authorized) {
        const uid = cred.user.uid;
        const email = cred.user.email || 'this Google account';
        await signOut(auth);
        return {
          success: false,
          pendingUid: uid,
          error: `Access denied: ${email} is not authorized for OX Control Center yet.`,
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

  const adminLoginWithCredentials = async (
    email: string,
    password: string
  ): Promise<AdminLoginResult> => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Please enter both operator email and password.' };
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const authorized = await evaluateFirebaseAdmin(cred.user);
      if (!authorized) {
        const uid = cred.user.uid;
        await signOut(auth);
        return {
          success: false,
          pendingUid: uid,
          error: `Signed in as ${cleanEmail}, but this operator UID is not yet authorized in Firestore /admins.`,
        };
      }
      return { success: true };
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/operation-not-allowed') {
        return {
          success: false,
          error:
            'Email/Password sign-in is not yet enabled in Firebase Console -> Authentication -> Sign-in method.',
        };
      }
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        return {
          success: false,
          error:
            'Invalid operator email or password (or this operator account has not been created under Firebase Console -> Authentication -> Users yet).',
        };
      }
      if (code === 'auth/invalid-email') {
        return { success: false, error: 'Please enter a valid operator email address.' };
      }
      if (code === 'auth/too-many-requests') {
        return {
          success: false,
          error: 'Too many failed sign-in attempts. Please wait a moment and try again.',
        };
      }
      return { success: false, error: err?.message || 'Operator sign-in failed.' };
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
        adminLoginWithCredentials,
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
