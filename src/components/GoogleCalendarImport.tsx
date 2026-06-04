'use client';

import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, getAuth } from 'firebase/auth';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getFirebaseAuth } from '@/lib/firebase';
import type { CalendarEvent, FamilyMember } from '@/types';

interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  recurrence?: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  currentUser: FamilyMember;
  onImport: (events: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>[], imageFiles: File[][]) => Promise<void>;
}

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

async function fetchGoogleEvents(accessToken: string): Promise<GoogleEvent[]> {
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const oneYearLater = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  const params = new URLSearchParams({
    timeMin: oneYearAgo.toISOString(),
    timeMax: oneYearLater.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '500',
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error('Googleカレンダーの取得に失敗しました');
  const data = await res.json();
  return data.items ?? [];
}

function convertToCalendarEvent(
  gEvent: GoogleEvent,
  familyId: string,
  currentUser: FamilyMember
): Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> {
  const allDay = !gEvent.start.dateTime;
  const startRaw = gEvent.start.dateTime ?? gEvent.start.date ?? new Date().toISOString();
  const endRaw = gEvent.end.dateTime ?? gEvent.end.date ?? startRaw;

  const startDate = allDay
    ? new Date(`${startRaw}T00:00:00`).toISOString()
    : new Date(startRaw).toISOString();
  const endDate = allDay
    ? new Date(`${endRaw}T00:00:00`).toISOString()
    : new Date(endRaw).toISOString();

  return {
    title: gEvent.summary ?? '(タイトルなし)',
    description: gEvent.description ?? '',
    startDate,
    endDate,
    allDay,
    familyId,
    createdBy: currentUser,
    images: [],
    recurrence: { type: 'none', interval: 1, daysOfWeek: [], endDate: null, count: null },
  };
}

function formatEventDate(gEvent: GoogleEvent): string {
  const raw = gEvent.start.dateTime ?? gEvent.start.date;
  if (!raw) return '';
  try {
    const d = gEvent.start.dateTime ? new Date(raw) : new Date(`${raw}T00:00:00`);
    return format(d, 'M/d(E)', { locale: ja });
  } catch {
    return raw;
  }
}

export default function GoogleCalendarImport({ isOpen, onClose, familyId, currentUser, onImport }: Props) {
  const [step, setStep] = useState<'idle' | 'loading' | 'select' | 'importing' | 'done'>('idle');
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const handleConnect = async () => {
    setError('');
    setStep('loading');
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope(CALENDAR_SCOPE);
      // force account selection even if already signed in
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(getFirebaseAuth(), provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      if (!accessToken) throw new Error('アクセストークンの取得に失敗しました');

      const gEvents = await fetchGoogleEvents(accessToken);
      setEvents(gEvents);
      setSelected(new Set(gEvents.map((e) => e.id)));
      setStep('select');
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'auth/popup-closed-by-user') {
        setStep('idle');
      } else {
        setError(e.message ?? 'エラーが発生しました');
        setStep('idle');
      }
    }
  };

  const toggleAll = () => {
    if (selected.size === events.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(events.map((e) => e.id)));
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    setStep('importing');
    try {
      const toImport = events
        .filter((e) => selected.has(e.id))
        .map((e) => convertToCalendarEvent(e, familyId, currentUser));
      await onImport(toImport, toImport.map(() => []));
      setStep('done');
    } catch {
      setError('インポートに失敗しました。');
      setStep('select');
    }
  };

  const handleClose = () => {
    setStep('idle');
    setEvents([]);
    setSelected(new Set());
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <h2 className="text-lg font-bold text-gray-900">Googleカレンダーからインポート</h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {error && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {step === 'idle' && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📆</div>
              <p className="text-gray-600 text-sm mb-6">
                Googleカレンダーの予定をまとめてインポートできます。<br />
                過去1年〜今後1年分の予定を取得します。
              </p>
              <button
                onClick={handleConnect}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Googleアカウントに接続
              </button>
            </div>
          )}

          {step === 'loading' && (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Googleカレンダーを取得中...</p>
            </div>
          )}

          {step === 'select' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{events.length}件</span>の予定が見つかりました
                </p>
                <button
                  onClick={toggleAll}
                  className="text-sm text-blue-500 hover:text-blue-700 font-medium"
                >
                  {selected.size === events.length ? 'すべて解除' : 'すべて選択'}
                </button>
              </div>
              <div className="space-y-1.5">
                {events.map((evt) => (
                  <label
                    key={evt.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(evt.id)}
                      onChange={() => toggle(evt.id)}
                      className="mt-0.5 accent-blue-500 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {evt.summary ?? '(タイトルなし)'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatEventDate(evt)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}

          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                {selected.size}件をインポート中...
              </p>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">✅</div>
              <p className="text-gray-900 font-medium mb-1">{selected.size}件をインポートしました</p>
              <p className="text-sm text-gray-500">カレンダーに反映されました</p>
              <button
                onClick={handleClose}
                className="mt-6 px-6 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
              >
                閉じる
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'select' && (
          <div className="px-5 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {selected.size}件をインポート
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
