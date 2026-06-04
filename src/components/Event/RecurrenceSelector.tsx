'use client';

import React from 'react';
import type { RecurrenceRule, RecurrenceType } from '@/types';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

interface Props {
  value: RecurrenceRule;
  onChange: (rule: RecurrenceRule) => void;
}

export default function RecurrenceSelector({ value, onChange }: Props) {
  const update = (patch: Partial<RecurrenceRule>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      {/* Type selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">繰り返し</label>
        <select
          value={value.type}
          onChange={(e) => update({ type: e.target.value as RecurrenceType })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        >
          <option value="none">繰り返しなし</option>
          <option value="daily">毎日</option>
          <option value="weekly">毎週</option>
          <option value="monthly">毎月</option>
          <option value="yearly">毎年</option>
        </select>
      </div>

      {value.type !== 'none' && (
        <>
          {/* Interval */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700 whitespace-nowrap">間隔:</label>
            <input
              type="number"
              min={1}
              max={99}
              value={value.interval}
              onChange={(e) => update({ interval: parseInt(e.target.value) || 1 })}
              className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <span className="text-sm text-gray-600">
              {value.type === 'daily' ? '日ごと' :
               value.type === 'weekly' ? '週ごと' :
               value.type === 'monthly' ? 'ヶ月ごと' : '年ごと'}
            </span>
          </div>

          {/* Days of week (weekly only) */}
          {value.type === 'weekly' && (
            <div>
              <label className="block text-sm text-gray-700 mb-1">曜日を選択:</label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      const current = value.daysOfWeek ?? [];
                      const next = current.includes(i)
                        ? current.filter((d) => d !== i)
                        : [...current, i].sort();
                      update({ daysOfWeek: next });
                    }}
                    className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${
                      (value.daysOfWeek ?? []).includes(i)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : ''} ${
                      (value.daysOfWeek ?? []).includes(i) ? '!text-white' : ''
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* End condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">終了条件</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="endCondition"
                  checked={!value.endDate && !value.count}
                  onChange={() => update({ endDate: null, count: null })}
                  className="accent-blue-500"
                />
                <span className="text-sm text-gray-700">ずっと繰り返す</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="endCondition"
                  checked={!!value.endDate}
                  onChange={() => update({ endDate: new Date().toISOString().slice(0, 10), count: null })}
                  className="accent-blue-500"
                />
                <span className="text-sm text-gray-700">終了日:</span>
                {value.endDate && (
                  <input
                    type="date"
                    value={value.endDate}
                    onChange={(e) => update({ endDate: e.target.value })}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                )}
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="endCondition"
                  checked={!!value.count && !value.endDate}
                  onChange={() => update({ count: 10, endDate: null })}
                  className="accent-blue-500"
                />
                <span className="text-sm text-gray-700">回数:</span>
                {value.count && !value.endDate && (
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={value.count}
                    onChange={(e) => update({ count: parseInt(e.target.value) || 1 })}
                    className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                )}
                <span className="text-sm text-gray-600">回で終了</span>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
