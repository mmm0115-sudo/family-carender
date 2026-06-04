'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import ImageUploader from './ImageUploader';
import RecurrenceSelector from './RecurrenceSelector';
import type { CalendarEvent, EventOccurrence, RecurrenceRule, EventImage, FamilyMember } from '@/types';

const DEFAULT_RECURRENCE: RecurrenceRule = {
  type: 'none',
  interval: 1,
  daysOfWeek: [],
  endDate: null,
  count: null,
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  editingEvent?: CalendarEvent | EventOccurrence | null;
  currentUser: FamilyMember;
  familyId: string;
  onSave: (
    event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>,
    imageFiles: File[]
  ) => Promise<string>;
  onUpdate?: (
    eventId: string,
    updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>,
    newFiles: File[],
    deletedPaths: string[],
    familyId: string
  ) => Promise<void>;
  onDelete?: (eventId: string, images: EventImage[]) => Promise<void>;
}

export default function EventModal({
  isOpen,
  onClose,
  selectedDate,
  editingEvent,
  currentUser,
  familyId,
  onSave,
  onUpdate,
  onDelete,
}: Props) {
  const isEditing = !!editingEvent;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(DEFAULT_RECURRENCE);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<EventImage[]>([]);
  const [deletedImagePaths, setDeletedImagePaths] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tab, setTab] = useState<'basic' | 'recurrence' | 'images'>('basic');

  useEffect(() => {
    if (!isOpen) return;

    if (editingEvent) {
      const start = parseISO(editingEvent.startDate);
      const end = parseISO(editingEvent.endDate);
      setTitle(editingEvent.title);
      setDescription(editingEvent.description || '');
      setStartDate(format(start, 'yyyy-MM-dd'));
      setStartTime(format(start, 'HH:mm'));
      setEndDate(format(end, 'yyyy-MM-dd'));
      setEndTime(format(end, 'HH:mm'));
      setAllDay(editingEvent.allDay);
      setRecurrence(editingEvent.recurrence ?? DEFAULT_RECURRENCE);
      setExistingImages(editingEvent.images ?? []);
      setImageFiles([]);
      setDeletedImagePaths([]);
    } else if (selectedDate) {
      setTitle('');
      setDescription('');
      setStartDate(format(selectedDate, 'yyyy-MM-dd'));
      setStartTime('09:00');
      setEndDate(format(selectedDate, 'yyyy-MM-dd'));
      setEndTime('10:00');
      setAllDay(false);
      setRecurrence(DEFAULT_RECURRENCE);
      setExistingImages([]);
      setImageFiles([]);
      setDeletedImagePaths([]);
    }
    setTab('basic');
    setShowDeleteConfirm(false);
  }, [isOpen, editingEvent, selectedDate]);

  const handleNewFiles = useCallback((files: File[]) => {
    setImageFiles(files);
  }, []);

  const handleDeleteExisting = useCallback((path: string) => {
    setDeletedImagePaths((prev) => [...prev, path]);
    setExistingImages((prev) => prev.filter((img) => img.storagePath !== path));
  }, []);

  const buildDatetime = (date: string, time: string) =>
    allDay ? `${date}T00:00:00.000Z` : new Date(`${date}T${time}`).toISOString();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const eventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
        title: title.trim(),
        description: description.trim(),
        startDate: buildDatetime(startDate, startTime),
        endDate: buildDatetime(endDate || startDate, endTime),
        allDay,
        familyId,
        createdBy: currentUser,
        images: existingImages,
        recurrence,
      };

      if (isEditing && editingEvent && onUpdate) {
        await onUpdate(
          editingEvent.id.split('_')[0], // Get original event ID (strip occurrence suffix)
          eventData,
          imageFiles,
          deletedImagePaths,
          familyId
        );
      } else {
        await onSave(eventData, imageFiles);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent || !onDelete) return;
    setSaving(true);
    try {
      await onDelete(editingEvent.id.split('_')[0], editingEvent.images ?? []);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditing ? '予定を編集' : '予定を追加'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-5">
          {(['basic', 'recurrence', 'images'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2 px-1 mr-4 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'basic' ? '基本情報' : t === 'recurrence' ? '繰り返し' : '画像'}
              {t === 'images' && (existingImages.length + imageFiles.length) > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-600 text-xs rounded-full px-1.5 py-0.5">
                  {existingImages.length + imageFiles.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {tab === 'basic' && (
              <>
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">タイトル *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="何の予定？"
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="詳細・メモを入力"
                    rows={2}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  />
                </div>

                {/* All day toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={allDay}
                      onChange={(e) => setAllDay(e.target.checked)}
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${allDay ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${allDay ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">終日</span>
                </label>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    {!allDay && (
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="w-full mt-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
                    <input
                      type="date"
                      value={endDate || startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    {!allDay && (
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="w-full mt-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    )}
                  </div>
                </div>

                {/* Author */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: currentUser.color }}
                  >
                    {currentUser.displayName[0]}
                  </div>
                  <span className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">{currentUser.displayName}</span> が作成
                  </span>
                </div>
              </>
            )}

            {tab === 'recurrence' && (
              <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
            )}

            {tab === 'images' && (
              <ImageUploader
                existingImages={existingImages}
                onNewFiles={handleNewFiles}
                onDeleteExisting={handleDeleteExisting}
              />
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
            {isEditing && onDelete && (
              <div className="mr-auto">
                {showDeleteConfirm ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={saving}
                      className="px-3 py-2 bg-red-500 text-white text-sm rounded-xl hover:bg-red-600 transition-colors"
                    >
                      削除する
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-2 text-gray-500 text-sm"
                    >
                      キャンセル
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-2 text-red-500 text-sm hover:text-red-700 transition-colors"
                  >
                    削除
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 text-gray-700 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? '保存中...' : isEditing ? '更新' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
