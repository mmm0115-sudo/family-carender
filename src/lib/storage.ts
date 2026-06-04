import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirebaseStorage } from './firebase';
import type { EventImage } from '@/types';

export async function uploadEventImage(
  file: File,
  familyId: string,
  eventId: string
): Promise<EventImage> {
  const ext = file.name.split('.').pop();
  const path = `events/${familyId}/${eventId}/${Date.now()}.${ext}`;
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return { url, storagePath: path, name: file.name };
}

export async function deleteEventImage(storagePath: string): Promise<void> {
  const storageRef = ref(getFirebaseStorage(), storagePath);
  await deleteObject(storageRef);
}
