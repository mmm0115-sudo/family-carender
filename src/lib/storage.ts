import imageCompression from 'browser-image-compression';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { getFirebaseStorage } from './firebase';
import type { EventImage } from '@/types';

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,        // 最大500KB
  maxWidthOrHeight: 1280, // 最大1280px
  useWebWorker: true,
  fileType: 'image/webp', // WebPで出力（さらに小さくなる）
};

async function compressImage(file: File): Promise<File> {
  try {
    return await imageCompression(file, COMPRESSION_OPTIONS);
  } catch {
    // 圧縮失敗時はそのまま使う
    return file;
  }
}

export async function uploadEventImage(
  file: File,
  familyId: string,
  eventId: string
): Promise<EventImage> {
  const compressed = await compressImage(file);
  const ext = 'webp';
  const path = `events/${familyId}/${eventId}/${Date.now()}.${ext}`;
  const storageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(storageRef, compressed);
  const url = await getDownloadURL(storageRef);
  return { url, storagePath: path, name: file.name };
}

export async function deleteEventImage(storagePath: string): Promise<void> {
  const storageRef = ref(getFirebaseStorage(), storagePath);
  await deleteObject(storageRef);
}
