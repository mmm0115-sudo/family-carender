'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { createUserDoc, getUserDoc } from '@/lib/firestore';
import type { User } from '@/types';

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#F7AB2A', '#DDA0DD', '#98D8C8', '#FF8C42',
];

function pickColor(uid: string): string {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

// Google ユーザーが初回ログインのときドキュメントを自動作成
async function ensureUserDoc(fbUser: FirebaseUser): Promise<User> {
  let d = await getUserDoc(fbUser.uid);
  if (!d) {
    const color = pickColor(fbUser.uid);
    await createUserDoc(
      fbUser.uid,
      fbUser.email ?? '',
      fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'ユーザー',
      color
    );
    d = await getUserDoc(fbUser.uid);
  }
  return d!;
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userDoc: User | null;
  loading: boolean;
  initError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userDoc, setUserDoc] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const refreshUserDoc = async () => {
    if (!firebaseUser) return;
    const d = await getUserDoc(firebaseUser.uid);
    setUserDoc(d);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), async (fbUser) => {
      setFirebaseUser(fbUser);
      setInitError(null);
      try {
        if (fbUser) {
          const d = await ensureUserDoc(fbUser);
          setUserDoc(d);
        } else {
          setUserDoc(null);
        }
      } catch (err: unknown) {
        const e = err as { code?: string; message?: string };
        // Firestoreが未作成 or ルールエラーの場合に分かりやすいメッセージを出す
        if (e?.code === 'unavailable' || e?.message?.includes('CONFIGURATION_NOT_FOUND') || e?.code?.includes('not-found')) {
          setInitError('Firestoreデータベースが作成されていません。Firebase Consoleで「Firestore Database」を作成してください。');
        } else {
          setInitError(`初期化エラー: ${e?.message ?? String(err)}`);
        }
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const auth = getFirebaseAuth();
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    const color = pickColor(cred.user.uid);
    await createUserDoc(cred.user.uid, email, displayName, color);
    const d = await getUserDoc(cred.user.uid);
    setUserDoc(d);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(getFirebaseAuth(), provider);
    // onAuthStateChanged が自動で ensureUserDoc を呼ぶ
  };

  const logOut = async () => {
    await signOut(getFirebaseAuth());
    setUserDoc(null);
  };

  return (
    <AuthContext.Provider
      value={{ firebaseUser, userDoc, loading, initError, signIn, signUp, signInWithGoogle, logOut, refreshUserDoc }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
