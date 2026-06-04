'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import { useEvents } from '@/hooks/useEvents';
import { getFamily } from '@/lib/firestore';
import CalendarView from '@/components/Calendar/CalendarView';
import EventModal from '@/components/Event/EventModal';
import EventDetailModal from '@/components/Calendar/EventDetailModal';
import FamilyPanel from '@/components/Family/FamilyPanel';
import type { CalendarEvent, EventOccurrence, Family, FamilyMember } from '@/types';

export default function CalendarPage() {
  const { firebaseUser, userDoc, loading, logOut } = useAuth();
  const router = useRouter();

  const [family, setFamily] = useState<Family | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFamilyPanel, setShowFamilyPanel] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | EventOccurrence | null>(null);
  const [viewingEvent, setViewingEvent] = useState<EventOccurrence | null>(null);
  const [currentMonth] = useState(new Date());

  const { events, loading: eventsLoading, getOccurrences, addEvent, editEvent, removeEvent } =
    useEvents(userDoc?.familyId ?? null);

  // Fetch family info
  useEffect(() => {
    if (userDoc?.familyId) {
      getFamily(userDoc.familyId).then(setFamily);
    }
  }, [userDoc?.familyId]);

  // Auth guard
  useEffect(() => {
    if (!loading && !firebaseUser) router.replace('/login');
    if (!loading && firebaseUser && !userDoc?.familyId) router.replace('/family');
  }, [firebaseUser, userDoc, loading, router]);

  // Get occurrences for a wide range so navigating months works
  const occurrences = useMemo(() => {
    const start = new Date(currentMonth.getFullYear() - 1, 0, 1);
    const end = new Date(currentMonth.getFullYear() + 1, 11, 31);
    return getOccurrences(start, end);
  }, [events, currentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !userDoc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentMember: FamilyMember = {
    userId: userDoc.uid,
    displayName: userDoc.displayName,
    color: userDoc.color,
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event: EventOccurrence) => {
    setViewingEvent(event);
    setShowDetailModal(true);
  };

  const handleEdit = () => {
    if (!viewingEvent) return;
    setEditingEvent(viewingEvent);
    setShowDetailModal(false);
    setShowEventModal(true);
  };

  const handleSave = async (
    eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>,
    imageFiles: File[]
  ): Promise<string> => {
    const id = await addEvent(eventData, imageFiles);
    setShowEventModal(false);
    return id;
  };

  const handleUpdate = async (
    eventId: string,
    updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>,
    newFiles: File[],
    deletedPaths: string[],
    famId: string
  ) => {
    await editEvent(eventId, updates, newFiles, deletedPaths, famId);
    setShowEventModal(false);
  };

  const handleDelete = async (eventId: string, images: CalendarEvent['images']) => {
    await removeEvent(eventId, images);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📅</span>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none">
              {family?.name ?? 'ファミリーカレンダー'}
            </h1>
            {family && (
              <p className="text-xs text-gray-500 mt-0.5">
                {family.members.length}人のメンバー
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Member avatars */}
          {family && (
            <div className="flex -space-x-1.5 mr-1">
              {family.members.slice(0, 4).map((m) => (
                <div
                  key={m.userId}
                  title={m.displayName}
                  className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: m.color }}
                >
                  {m.displayName[0]}
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => setShowFamilyPanel(true)}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
            title="ファミリー情報"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
          <button
            onClick={logOut}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
            title="ログアウト"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Calendar */}
      <main className="flex-1 overflow-hidden">
        {eventsLoading ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <CalendarView
            events={occurrences}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
          />
        )}
      </main>

      {/* FAB: Add event */}
      <button
        onClick={() => {
          setSelectedDate(new Date());
          setEditingEvent(null);
          setShowEventModal(true);
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 active:scale-95 transition-all flex items-center justify-center z-40"
        title="予定を追加"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Modals */}
      <EventModal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        selectedDate={selectedDate ?? undefined}
        editingEvent={editingEvent}
        currentUser={currentMember}
        familyId={userDoc.familyId!}
        onSave={handleSave}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      <EventDetailModal
        event={viewingEvent}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={handleEdit}
        currentUserId={userDoc.uid}
      />

      {family && showFamilyPanel && (
        <FamilyPanel family={family} onClose={() => setShowFamilyPanel(false)} />
      )}
    </div>
  );
}
