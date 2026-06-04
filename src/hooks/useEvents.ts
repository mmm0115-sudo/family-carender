'use client';

import { useState, useEffect } from 'react';
import { getEventsForFamily, createEvent, updateEvent, deleteEvent } from '@/lib/firestore';
import { uploadEventImage, deleteEventImage } from '@/lib/storage';
import { getOccurrencesInRange } from '@/lib/recurrence';
import type { CalendarEvent, EventOccurrence, EventImage } from '@/types';

export function useEvents(familyId: string | null) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    if (!familyId) return;
    setLoading(true);
    try {
      const evts = await getEventsForFamily(familyId);
      setEvents(evts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  const getOccurrences = (rangeStart: Date, rangeEnd: Date): EventOccurrence[] =>
    getOccurrencesInRange(events, rangeStart, rangeEnd);

  const addEvent = async (
    event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>,
    imageFiles: File[]
  ): Promise<string> => {
    // Create event first to get its ID for storage path
    const eventId = await createEvent(event);

    if (imageFiles.length > 0) {
      const uploadedImages: EventImage[] = await Promise.all(
        imageFiles.map((f) => uploadEventImage(f, event.familyId, eventId))
      );
      await updateEvent(eventId, { images: uploadedImages });
      await refresh();
    } else {
      await refresh();
    }
    return eventId;
  };

  const editEvent = async (
    eventId: string,
    updates: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>,
    newImageFiles: File[],
    deletedImagePaths: string[],
    familyId: string
  ) => {
    // Upload new images
    const uploadedImages: EventImage[] = await Promise.all(
      newImageFiles.map((f) => uploadEventImage(f, familyId, eventId))
    );

    // Delete removed images from storage
    await Promise.all(deletedImagePaths.map((p) => deleteEventImage(p)));

    const currentImages = (updates.images ?? []).filter(
      (img) => !deletedImagePaths.includes(img.storagePath)
    );

    await updateEvent(eventId, {
      ...updates,
      images: [...currentImages, ...uploadedImages],
    });
    await refresh();
  };

  const removeEvent = async (eventId: string, images: EventImage[]) => {
    await Promise.all(images.map((img) => deleteEventImage(img.storagePath)));
    await deleteEvent(eventId);
    await refresh();
  };

  return { events, loading, refresh, getOccurrences, addEvent, editEvent, removeEvent };
}
