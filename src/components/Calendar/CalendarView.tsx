'use client';

import React, { useMemo, useState } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  parseISO,
  addMonths,
  subMonths,
  startOfDay,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import type { EventOccurrence } from '@/types';

const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

interface Props {
  events: EventOccurrence[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: EventOccurrence) => void;
}

export default function CalendarView({ events, onDayClick, onEventClick }: Props) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventOccurrence[]>();
    for (const evt of events) {
      const key = evt.occurrenceDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(evt);
    }
    return map;
  }, [events]);

  return (
    <div className="flex flex-col h-full">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <button
          onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => setCurrentMonth(new Date())}
          className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"
        >
          {format(currentMonth, 'yyyy年 M月', { locale: ja })}
        </button>
        <button
          onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {DAY_NAMES.map((name, i) => (
          <div
            key={name}
            className={`text-center text-xs font-semibold py-2 ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayEvents = eventsByDay.get(dateKey) ?? [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);
          const dayOfWeek = day.getDay();

          return (
            <div
              key={dateKey}
              onClick={() => onDayClick(day)}
              className={`
                min-h-[80px] p-1 border-b border-r border-gray-100 cursor-pointer transition-colors
                ${isCurrentMonth ? 'bg-white hover:bg-blue-50' : 'bg-gray-50/60 hover:bg-gray-100'}
                ${idx % 7 === 0 ? 'border-l' : ''}
              `}
            >
              {/* Date number */}
              <div className="flex justify-end mb-1">
                <span
                  className={`
                    text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                    ${isCurrentDay
                      ? 'bg-blue-500 text-white font-bold'
                      : isCurrentMonth
                        ? dayOfWeek === 0
                          ? 'text-red-500'
                          : dayOfWeek === 6
                            ? 'text-blue-500'
                            : 'text-gray-700'
                        : 'text-gray-300'
                    }
                  `}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((evt) => (
                  <button
                    key={evt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(evt);
                    }}
                    className="w-full text-left px-1.5 py-0.5 rounded text-xs truncate text-white font-medium flex items-center gap-1 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: evt.createdBy.color }}
                  >
                    {evt.isRecurring && (
                      <svg className="w-2.5 h-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                    )}
                    {evt.images && evt.images.length > 0 && (
                      <svg className="w-2.5 h-2.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="truncate">{evt.title}</span>
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-400 px-1">
                    +{dayEvents.length - 3}件
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
