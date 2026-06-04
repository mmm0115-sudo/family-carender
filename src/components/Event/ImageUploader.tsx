'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import type { EventImage } from '@/types';

interface Props {
  existingImages: EventImage[];
  onNewFiles: (files: File[]) => void;
  onDeleteExisting: (storagePath: string) => void;
}

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export default function ImageUploader({ existingImages, onNewFiles, onDeleteExisting }: Props) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const newPreviews = accepted.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      }));
      setPreviews((prev) => [...prev, ...newPreviews]);
      onNewFiles(accepted);
    },
    [onNewFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxSize: MAX_SIZE,
  });

  const removePreview = (index: number) => {
    setPreviews((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].url);
      next.splice(index, 1);
      return next;
    });
    // Notify parent about updated file list
    const updated = previews
      .filter((_, i) => i !== index)
      .map((p) => p.file);
    onNewFiles(updated);
  };

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors
          ${isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-gray-600">
            {isDragActive ? '画像をドロップ！' : '画像をドラッグ&ドロップ、またはクリックして選択'}
          </p>
          <p className="text-xs text-gray-400">PNG, JPG, GIF, WEBP (最大 10MB)</p>
        </div>
      </div>

      {/* Image grid */}
      {(existingImages.length > 0 || previews.length > 0) && (
        <div className="grid grid-cols-3 gap-2">
          {existingImages.map((img) => (
            <div key={img.storagePath} className="relative group aspect-square rounded-lg overflow-hidden">
              <Image
                src={img.url}
                alt={img.name}
                fill
                className="object-cover"
                sizes="150px"
              />
              <button
                type="button"
                onClick={() => onDeleteExisting(img.storagePath)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
          {previews.map((p, i) => (
            <div key={p.url} className="relative group aspect-square rounded-lg overflow-hidden">
              <Image src={p.url} alt="preview" fill className="object-cover" sizes="150px" />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <span className="text-white text-xs font-medium">新規</span>
              </div>
              <button
                type="button"
                onClick={() => removePreview(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
