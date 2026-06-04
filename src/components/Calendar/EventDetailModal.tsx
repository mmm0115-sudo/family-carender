'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { EventOccurrence, CalendarEvent } from '@/types';

interface Props {
  event: EventOccurrence | CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  currentUserId: string;
}

const RECURRENCE_LABELS: Record<string, string> = {
  daily: '毎日',
  weekly: '毎週',
  monthly: '毎月',
  yearly: '毎年',
};

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export default function EventDetailModal({ event, isOpen, onClose, onEdit, currentUserId }: Props) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  const start = parseISO(event.startDate);
  const end = parseISO(event.endDate);
  const isOwner = event.createdBy.userId === currentUserId;

  const formatDate = (d: Date) =>
    event.allDay
      ? format(d, 'M月d日(E)', { locale: ja })
      : format(d, 'M月d日(E) HH:mm', { locale: ja });

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col">
          {/* Color bar */}
          <div className="h-1.5 rounded-t-2xl" style={{ backgroundColor: event.createdBy.color }} />

          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 break-words">{event.title}</h2>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {isOwner && (
                <button
                  onClick={onEdit}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="編集"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
            {/* Date */}
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">{formatDate(start)}</p>
                {(end.getTime() - start.getTime() > 60000 || !event.allDay) && (
                  <p className="text-sm text-gray-500">〜 {formatDate(end)}</p>
                )}
                {event.allDay && <p className="text-xs text-gray-400 mt-0.5">終日</p>}
              </div>
            </div>

            {/* Recurrence */}
            {event.recurrence?.type !== 'none' && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <p className="text-sm text-gray-700">
                  {RECURRENCE_LABELS[event.recurrence.type]}
                  {event.recurrence.interval > 1 && `（${event.recurrence.interval}${
                    event.recurrence.type === 'daily' ? '日' :
                    event.recurrence.type === 'weekly' ? '週' :
                    event.recurrence.type === 'monthly' ? 'ヶ月' : '年'
                  }ごと）`}
                  {event.recurrence.type === 'weekly' && event.recurrence.daysOfWeek?.length && (
                    <span className="ml-1">
                      [{event.recurrence.daysOfWeek.map((d) => DAY_LABELS[d]).join('・')}]
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h7"
                  />
                </svg>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.description}</p>
              </div>
            )}

            {/* Creator */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: event.createdBy.color }}
              >
                {event.createdBy.displayName[0]}
              </div>
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">{event.createdBy.displayName}</span> が作成
              </p>
            </div>

            {/* Images */}
            {event.images && event.images.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">写真・画像</p>
                <div className="grid grid-cols-2 gap-2">
                  {event.images.map((img) => (
                    <button
                      key={img.storagePath}
                      onClick={() => setLightboxSrc(img.url)}
                      className="relative aspect-video rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
                    >
                      <Image
                        src={img.url}
                        alt={img.name}
                        fill
                        className="object-cover"
                        sizes="250px"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="拡大表示"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
