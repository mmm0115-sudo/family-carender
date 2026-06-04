'use client';

import React, { useState } from 'react';
import { createFamily, getFamilyByCode, joinFamily, updateUserFamily, getUserDoc } from '@/lib/firestore';
import type { FamilyMember } from '@/types';

interface Props {
  currentUser: { uid: string; displayName: string; color: string; email: string };
  onComplete: () => void;
}

export default function FamilySetup({ currentUser, onComplete }: Props) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [familyName, setFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const member: FamilyMember = {
    userId: currentUser.uid,
    displayName: currentUser.displayName,
    color: currentUser.color,
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const familyId = await createFamily(familyName.trim(), member);
      await updateUserFamily(currentUser.uid, familyId);
      onComplete();
    } catch {
      setError('ファミリーの作成に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      const family = await getFamilyByCode(code);
      if (!family) {
        setError('そのコードのファミリーが見つかりません。');
        return;
      }
      const alreadyMember = family.members.some((m) => m.userId === currentUser.uid);
      if (!alreadyMember) {
        await joinFamily(family.id, member);
      }
      await updateUserFamily(currentUser.uid, family.id);
      onComplete();
    } catch {
      setError('参加に失敗しました。コードを確認してください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">👨‍👩‍👧‍👦</div>
          <h1 className="text-2xl font-bold text-gray-900">ファミリーを設定</h1>
          <p className="text-gray-500 mt-1 text-sm">新しくファミリーを作るか、既存のファミリーに参加しましょう</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === 'create' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            新しく作る
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === 'join' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            コードで参加
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ファミリー名</label>
              <input
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="例: 鈴木家"
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !familyName.trim()}
              className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '作成中...' : 'ファミリーを作成'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">招待コード</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="例: ABC123"
                maxLength={6}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-center tracking-widest font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
              />
              <p className="text-xs text-gray-500 mt-1">ファミリーメンバーから6文字のコードを教えてもらってください</p>
            </div>
            <button
              type="submit"
              disabled={loading || joinCode.length < 6}
              className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '参加中...' : 'ファミリーに参加'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
