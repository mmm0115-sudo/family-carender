import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  Timestamp,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import type { User, Family, FamilyMember, CalendarEvent } from '@/types';

const db = () => getFirebaseDb();

// ──────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────

export async function createUserDoc(
  uid: string,
  email: string,
  displayName: string,
  color: string
) {
  await setDoc(doc(db(), 'users', uid), {
    uid,
    email,
    displayName,
    familyId: null,
    color,
    createdAt: serverTimestamp(),
  });
}

export async function getUserDoc(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db(), 'users', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    ...d,
    createdAt: d.createdAt?.toDate?.() ?? new Date(),
  } as User;
}

export async function updateUserFamily(uid: string, familyId: string) {
  await updateDoc(doc(db(), 'users', uid), { familyId });
}

// ──────────────────────────────────────────────
// Families
// ──────────────────────────────────────────────

function generateFamilyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

export async function createFamily(
  familyName: string,
  creator: FamilyMember
): Promise<string> {
  let code = generateFamilyCode();
  let existing = await getFamilyByCode(code);
  while (existing) {
    code = generateFamilyCode();
    existing = await getFamilyByCode(code);
  }

  const ref = await addDoc(collection(db(), 'families'), {
    name: familyName,
    code,
    members: [creator],
    createdAt: serverTimestamp(),
    createdBy: creator.userId,
  });
  return ref.id;
}

export async function getFamilyByCode(code: string): Promise<Family | null> {
  const q = query(collection(db(), 'families'), where('code', '==', code.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return {
    id: d.id,
    ...d.data(),
    createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
  } as Family;
}

export async function getFamily(familyId: string): Promise<Family | null> {
  const snap = await getDoc(doc(db(), 'families', familyId));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    id: snap.id,
    ...d,
    createdAt: d.createdAt?.toDate?.() ?? new Date(),
  } as Family;
}

export async function joinFamily(
  familyId: string,
  member: FamilyMember
): Promise<void> {
  await updateDoc(doc(db(), 'families', familyId), {
    members: arrayUnion(member),
  });
}

// ──────────────────────────────────────────────
// Events
// ──────────────────────────────────────────────

function toTimestamp(isoString: string): Timestamp {
  return Timestamp.fromDate(new Date(isoString));
}

function fromTimestamp(ts: Timestamp | string | undefined): string {
  if (!ts) return new Date().toISOString();
  if (typeof ts === 'string') return ts;
  return ts.toDate().toISOString();
}

export async function createEvent(
  event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db(), 'events'), {
    ...event,
    startDate: toTimestamp(event.startDate),
    endDate: toTimestamp(event.endDate),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEvent(
  eventId: string,
  event: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>
): Promise<void> {
  const data: Record<string, unknown> = { ...event, updatedAt: serverTimestamp() };
  if (event.startDate) data.startDate = toTimestamp(event.startDate);
  if (event.endDate) data.endDate = toTimestamp(event.endDate);
  await updateDoc(doc(db(), 'events', eventId), data);
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db(), 'events', eventId));
}

export async function getEventsForFamily(familyId: string): Promise<CalendarEvent[]> {
  const q = query(collection(db(), 'events'), where('familyId', '==', familyId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      startDate: fromTimestamp(data.startDate),
      endDate: fromTimestamp(data.endDate),
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    } as CalendarEvent;
  });
}
