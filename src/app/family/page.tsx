'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import FamilySetup from '@/components/Family/FamilySetup';

export default function FamilyPage() {
  const { firebaseUser, userDoc, loading, refreshUserDoc } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) router.replace('/login');
    if (!loading && userDoc?.familyId) router.replace('/calendar');
  }, [firebaseUser, userDoc, loading, router]);

  if (loading || !firebaseUser || !userDoc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <FamilySetup
      currentUser={{
        uid: userDoc.uid,
        displayName: userDoc.displayName,
        color: userDoc.color,
        email: userDoc.email,
      }}
      onComplete={async () => {
        await refreshUserDoc();
        router.replace('/calendar');
      }}
    />
  );
}
