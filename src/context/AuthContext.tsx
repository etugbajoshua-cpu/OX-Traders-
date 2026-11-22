import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import {
  ensureUserAccount,
  toggleUser2FA,
  updateUserProfile,
  userDocToUser,
  walletDocToBalances,
} from '../lib/firestoreService.ts';
import { User, WalletBalances } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  balances: WalletBalances;
  kycStatus: string;
  unreadNotifications: number;
  loading: boolean;
  loginWithGoogle: (options?: {
    country?: string;
    phone?: string;
    referral_code?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileDetails: (data: {
    fullName?: string;
    phone?: string;
    country?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  toggle2FA: () => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const EMPTY_BALANCES: WalletBalances = {
  USD: { available: 0, locked: 0, total: 0 },
  BTC: { available: 0, locked: 0, total: 0 },
  USDT: { available: 0, locked: 0, total: 0 },
};

function formatAuthError(err: any): string {
  const code = String(err?.code || '');
  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in popup was closed before completing authentication.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Popup blocked by your browser. Please allow popups for this site and try again.';
  }
  if (code === 'auth/unauthorized-domain') {
    return `Domain "${window.location.hostname}" must be added under Firebase Console -> Authentication -> Settings -> Authorized domains.`;
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection interrupted. Please check your internet connection.';
  }
  return err?.message || 'Google authentication failed.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [balances, setBalances] = useState<WalletBalances>(EMPTY_BALANCES);
  const [kycStatus, setKycStatus] = useState<string>('not_submitted');
  const [unreadNotifications, setUnreadNotifications] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [authReady, setAuthReady] = useState<boolean>(false);

  const pendingOnboardingRef = useRef<{
    country?: string;
    phone?: string;
    referral_code?: string;
  } | null>(null);

  const hydrateUser = useCallback(async (fbUser: FirebaseUser) => {
    const onboarding = pendingOnboardingRef.current || undefined;
    pendingOnboardingRef.current = null;
    const result = await ensureUserAccount(fbUser, {
      country: onboarding?.country,
      phone: onboarding?.phone,
      referralCodeInput: onboarding?.referral_code,
    });
    setUser(result.user);
    setBalances(result.balances);
    setKycStatus(result.kycStatus);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      setAuthReady(true);

      if (!fbUser) {
        setUser(null);
        setBalances(EMPTY_BALANCES);
        setKycStatus('not_submitted');
        setUnreadNotifications(0);
        setLoading(false);
        return;
      }

      try {
        await hydrateUser(fbUser);
      } catch (err) {
        console.error('Failed to hydrate Firebase investor account:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [hydrateUser]);

  // Attach real-time Firestore listeners ONLY after auth is ready and user signed in
  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const uid = firebaseUser.uid;

    const unsubUser = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setUser(userDocToUser(uid, data));
          if (data.kycStatus) setKycStatus(String(data.kycStatus));
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      }
    );

    const unsubWallet = onSnapshot(
      doc(db, 'wallets', uid),
      (snap) => {
        if (snap.exists()) {
          setBalances(walletDocToBalances(snap.data()));
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `wallets/${uid}`);
      }
    );

    const unsubKyc = onSnapshot(
      doc(db, 'kyc_records', uid),
      (snap) => {
        if (snap.exists() && snap.data()?.status) {
          setKycStatus(String(snap.data().status));
        }
      },
      () => {
        // ignore if doc does not exist yet
      }
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', uid)),
      (snap) => {
        const unread = snap.docs.filter((d) => !d.data().isRead).length;
        setUnreadNotifications(unread);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'notifications');
      }
    );

    return () => {
      unsubUser();
      unsubWallet();
      unsubKyc();
      unsubNotifs();
    };
  }, [authReady, firebaseUser]);

  const loginWithGoogle = async (options?: {
    country?: string;
    phone?: string;
    referral_code?: string;
  }) => {
    try {
      if (options) {
        pendingOnboardingRef.current = options;
      }
      const cred = await signInWithPopup(auth, googleProvider);
      await hydrateUser(cred.user);
      return { success: true };
    } catch (err: any) {
      pendingOnboardingRef.current = null;
      return { success: false, error: formatAuthError(err) };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setUser(null);
      setFirebaseUser(null);
      setBalances(EMPTY_BALANCES);
      setKycStatus('not_submitted');
      setUnreadNotifications(0);
    }
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await hydrateUser(auth.currentUser);
    }
  };

  const updateProfileDetails = async (data: {
    fullName?: string;
    phone?: string;
    country?: string;
  }) => {
    if (!firebaseUser) return { success: false, error: 'Not signed in' };
    try {
      await updateUserProfile(firebaseUser.uid, data);
      await hydrateUser(firebaseUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Profile update failed' };
    }
  };

  const toggle2FA = async () => {
    if (!firebaseUser || !user) {
      return { success: false, error: 'Authentication required' };
    }
    try {
      const next = !user.two_factor_enabled;
      const enabled = await toggleUser2FA(firebaseUser.uid, next);
      setUser({ ...user, two_factor_enabled: enabled ? 1 : 0 });
      return { success: true, enabled };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update 2FA setting' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        balances,
        kycStatus,
        unreadNotifications,
        loading,
        loginWithGoogle,
        logout,
        refreshProfile,
        updateProfileDetails,
        toggle2FA,
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
