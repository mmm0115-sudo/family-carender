'use client';

import React, { useState } from 'react';
import type { Family } from '@/types';

interface Props {
  family: Family;
  onClose: () => void;
}

export default function FamilyPanel({ family, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(family.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">ファミリー情報</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Family name */}
        <div className="mb-5">
          <p className="text-xs text-gray-500 mb-1">ファミリー名</p>
          <p className="text-lg font-bold text-gray-900">{family.name}</p>
        </div>

        {/* Invite code */}
        <div className="mb-5">
          <p className="text-xs text-gray-500 mb-2">招待コード（他のメンバーに共有しましょう）</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-center">
              <span className="text-2xl font-mono font-bold tracking-widest text-gray-900">
                {family.code}
              </span>
            </div>
            <button
              onClick={copyCode}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {copied ? 'コピー済み ✓' : 'コピー'}
            </button>
          </div>
        </div>

        {/* Members */}
        <div>
          <p className="text-xs text-gray-500 mb-2">メンバー ({family.members.length}人)</p>
          <div className="space-y-2">
            {family.members.map((member) => (
              <div key={member.userId} className="flex items-center gap-3 py-1">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: member.color }}
                >
                  {member.displayName[0]}
                </div>
                <span className="text-sm font-medium text-gray-900">{member.displayName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
