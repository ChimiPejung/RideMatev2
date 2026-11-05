import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ALLOWED_EMAIL_DOMAINS } from '../config';
import { auth, db } from './firebase';
import { initialsOf, type Student } from './types';

export type AuthPhase = 'loading' | 'signedOut' | 'awaitingVerification' | 'ready';

type AuthValue = {
  phase: AuthPhase;
  me: Student | null;
  pendingEmail: string | null;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkVerified: () => Promise<boolean>;
  resendVerification: () => Promise<void>;
  switchAddress: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function isCollegeEmail(email: string) {
  const domain = email.trim().toLowerCase().split('@')[1] ?? '';
  return ALLOWED_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
}

function toStudent(u: User): Student {
  const name = u.displayName?.trim() || (u.email ?? 'Student').split('@')[0];
  return { uid: u.uid, name, email: u.email ?? '', initials: initialsOf(name) };
}

/**
 * Firestore reads `email_verified` from the ID token, not from the user record.
 * After the student clicks the link, user.reload() updates the user but the old
 * token still says "not verified", so every read is denied. Forcing a token
 * refresh fixes it. (This was the PERMISSION_DENIED bug found in Project 1.)
 */
async function ensureVerifiedToken(u: User) {
  const result = await u.getIdTokenResult();
  if (result.claims.email_verified !== true) {
    await u.getIdToken(true);
  }
}

async function ensureProfileDoc(u: User) {
  const ref = doc(db, 'users', u.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const s = toStudent(u);
    await setDoc(ref, { name: s.name, email: s.email, initials: s.initials, createdAt: serverTimestamp() });
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<AuthPhase>('loading');
  const [me, setMe] = useState<Student | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const enterReady = useCallback(async (u: User) => {
    await ensureVerifiedToken(u);
    try {
      await ensureProfileDoc(u);
    } catch (e) {
      console.warn('Could not create profile document', e);
    }
    setMe(toStudent(u));
    setPendingEmail(null);
    setPhase('ready');
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u) {
        setMe(null);
        setPendingEmail(null);
        setPhase('signedOut');
      } else if (!u.emailVerified) {
        setMe(toStudent(u));
        setPendingEmail(u.email);
        setPhase('awaitingVerification');
      } else {
        enterReady(u).catch((e) => {
          console.warn(e);
          setPhase('signedOut');
        });
      }
    });
  }, [enterReady]);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: name.trim() });
    const s = toStudent(cred.user);
    setMe(s);
    setPendingEmail(cred.user.email);
    setPhase('awaitingVerification');
    await sendEmailVerification(cred.user);
    try {
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: s.name,
        email: s.email,
        initials: s.initials,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      // Created again on first verified sign-in.
      console.warn('Profile doc deferred', e);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signOut = useCallback(async () => {
    await fbSignOut(auth);
  }, []);

  const checkVerified = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return false;
    await u.reload();
    if (!u.emailVerified) return false;
    await enterReady(u);
    return true;
  }, [enterReady]);

  const resendVerification = useCallback(async () => {
    if (auth.currentUser) await sendEmailVerification(auth.currentUser);
  }, []);

  const switchAddress = useCallback(async () => {
    const u = auth.currentUser;
    if (!u) return;
    try {
      await u.delete(); // unverified account, just created
    } catch {
      await fbSignOut(auth);
    }
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ phase, me, pendingEmail, signUp, signIn, signOut, checkVerified, resendVerification, switchAddress }),
    [phase, me, pendingEmail, signUp, signIn, signOut, checkVerified, resendVerification, switchAddress],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

/** For screens that only render once signed in. */
export function useMe(): Student {
  const { me } = useAuth();
  if (!me) throw new Error('Not signed in');
  return me;
}

export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email already has an account. Log in instead.';
    case 'auth/invalid-email':
      return 'That email address doesn’t look right.';
    case 'auth/weak-password':
      return 'Use at least 8 characters for your password.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.';
    case 'auth/network-request-failed':
      return 'No connection. Check your internet and try again.';
    default:
      return (e as Error)?.message ?? 'Something went wrong. Try again.';
  }
}
