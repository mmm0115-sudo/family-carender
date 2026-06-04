import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  isAfter,
  startOfDay,
  parseISO,
  getDay,
  differenceInDays,
  differenceInMonths,
  differenceInYears,
  format,
} from 'date-fns';
import type { CalendarEvent, EventOccurrence, RecurrenceRule } from '@/types';

function occurrenceFromBase(
  event: CalendarEvent,
  occStart: Date,
  durationMs: number
): EventOccurrence {
  return {
    ...event,
    id: `${event.id}_${occStart.toISOString()}`,
    startDate: occStart.toISOString(),
    endDate: new Date(occStart.getTime() + durationMs).toISOString(),
    occurrenceDate: format(startOfDay(occStart), 'yyyy-MM-dd'),
    isRecurring: true,
  };
}

function expandDaily(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
  rule: RecurrenceRule
): EventOccurrence[] {
  const results: EventOccurrence[] = [];
  const eventStart = parseISO(event.startDate);
  const durationMs = parseISO(event.endDate).getTime() - eventStart.getTime();
  const interval = rule.interval || 1;
  const ruleEnd = rule.endDate ? parseISO(rule.endDate) : null;
  const maxCount = rule.count ?? 3650;

  // Jump directly to the first candidate >= rangeStart
  const daysDiff = Math.max(0, differenceInDays(rangeStart, eventStart));
  const jumpDays = Math.floor(daysDiff / interval) * interval;
  let current = addDays(eventStart, jumpDays);
  let count = Math.floor(jumpDays / interval); // occurrences before rangeStart

  while (count < maxCount) {
    if (ruleEnd && isAfter(current, ruleEnd)) break;
    if (isAfter(current, rangeEnd)) break;

    if (!isBefore(current, eventStart)) {
      const occEnd = new Date(current.getTime() + durationMs);
      if (!isBefore(occEnd, rangeStart)) {
        results.push(occurrenceFromBase(event, current, durationMs));
      }
    }

    current = addDays(current, interval);
    count++;
  }
  return results;
}

function expandWeekly(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
  rule: RecurrenceRule
): EventOccurrence[] {
  const results: EventOccurrence[] = [];
  const eventStart = parseISO(event.startDate);
  const durationMs = parseISO(event.endDate).getTime() - eventStart.getTime();
  const interval = rule.interval || 1;
  const daysOfWeek = rule.daysOfWeek?.length ? rule.daysOfWeek : [getDay(eventStart)];
  const ruleEnd = rule.endDate ? parseISO(rule.endDate) : null;
  const maxCount = rule.count ?? 3650;

  // Jump to week containing rangeStart
  const weeksDiff = Math.max(0, Math.floor(differenceInDays(rangeStart, startOfDay(eventStart)) / 7 / interval) * interval);
  let weekAnchor = addWeeks(startOfDay(eventStart), weeksDiff);
  if (isBefore(weekAnchor, startOfDay(eventStart))) weekAnchor = startOfDay(eventStart);

  // Go back one week to make sure we don't miss anything at boundary
  weekAnchor = addWeeks(weekAnchor, -interval);
  if (isBefore(weekAnchor, startOfDay(eventStart))) weekAnchor = startOfDay(eventStart);

  let count = 0;

  while (count < maxCount) {
    if (ruleEnd && isAfter(weekAnchor, ruleEnd)) break;
    if (isAfter(weekAnchor, rangeEnd)) break;

    for (let d = 0; d < 7; d++) {
      const candidate = addDays(weekAnchor, d);
      if (isBefore(candidate, startOfDay(eventStart))) continue;
      if (!daysOfWeek.includes(getDay(candidate))) continue;
      if (ruleEnd && isAfter(candidate, ruleEnd)) continue;
      if (isAfter(candidate, rangeEnd)) continue;

      const occStart = new Date(candidate);
      occStart.setHours(eventStart.getHours(), eventStart.getMinutes(), 0, 0);
      const occEnd = new Date(occStart.getTime() + durationMs);

      if (!isBefore(occEnd, rangeStart)) {
        results.push(occurrenceFromBase(event, occStart, durationMs));
        count++;
        if (count >= maxCount) return results;
      }
    }

    weekAnchor = addWeeks(weekAnchor, interval);
  }

  return results;
}

function expandMonthly(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
  rule: RecurrenceRule
): EventOccurrence[] {
  const results: EventOccurrence[] = [];
  const eventStart = parseISO(event.startDate);
  const durationMs = parseISO(event.endDate).getTime() - eventStart.getTime();
  const interval = rule.interval || 1;
  const ruleEnd = rule.endDate ? parseISO(rule.endDate) : null;
  const maxCount = rule.count ?? 1200;

  const monthsDiff = Math.max(0, differenceInMonths(rangeStart, eventStart));
  const jumpMonths = Math.floor(monthsDiff / interval) * interval;
  let current = addMonths(eventStart, Math.max(0, jumpMonths - interval));
  let count = Math.max(0, Math.floor(jumpMonths / interval) - 1);

  while (count < maxCount) {
    if (ruleEnd && isAfter(current, ruleEnd)) break;
    if (isAfter(current, rangeEnd)) break;

    if (!isBefore(current, eventStart)) {
      const occEnd = new Date(current.getTime() + durationMs);
      if (!isBefore(occEnd, rangeStart)) {
        results.push(occurrenceFromBase(event, current, durationMs));
      }
    }

    current = addMonths(current, interval);
    count++;
  }
  return results;
}

function expandYearly(
  event: CalendarEvent,
  rangeStart: Date,
  rangeEnd: Date,
  rule: RecurrenceRule
): EventOccurrence[] {
  const results: EventOccurrence[] = [];
  const eventStart = parseISO(event.startDate);
  const durationMs = parseISO(event.endDate).getTime() - eventStart.getTime();
  const interval = rule.interval || 1;
  const ruleEnd = rule.endDate ? parseISO(rule.endDate) : null;
  const maxCount = rule.count ?? 100;

  const yearsDiff = Math.max(0, differenceInYears(rangeStart, eventStart));
  const jumpYears = Math.max(0, Math.floor(yearsDiff / interval) * interval - interval);
  let current = addYears(eventStart, jumpYears);
  let count = Math.floor(jumpYears / interval);

  while (count < maxCount) {
    if (ruleEnd && isAfter(current, ruleEnd)) break;
    if (isAfter(current, rangeEnd)) break;

    if (!isBefore(current, eventStart)) {
      const occEnd = new Date(current.getTime() + durationMs);
      if (!isBefore(occEnd, rangeStart)) {
        results.push(occurrenceFromBase(event, current, durationMs));
      }
    }

    current = addYears(current, interval);
    count++;
  }
  return results;
}

export function getOccurrencesInRange(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date
): EventOccurrence[] {
  const results: EventOccurrence[] = [];

  for (const event of events) {
    const rule = event.recurrence;

    if (!rule || rule.type === 'none') {
      const start = parseISO(event.startDate);
      const end = parseISO(event.endDate);
      if (!isAfter(start, rangeEnd) && !isBefore(end, rangeStart)) {
        results.push({
          ...event,
          occurrenceDate: format(startOfDay(start), 'yyyy-MM-dd'),
          isRecurring: false,
        });
      }
      continue;
    }

    switch (rule.type) {
      case 'daily':
        results.push(...expandDaily(event, rangeStart, rangeEnd, rule));
        break;
      case 'weekly':
        results.push(...expandWeekly(event, rangeStart, rangeEnd, rule));
        break;
      case 'monthly':
        results.push(...expandMonthly(event, rangeStart, rangeEnd, rule));
        break;
      case 'yearly':
        results.push(...expandYearly(event, rangeStart, rangeEnd, rule));
        break;
    }
  }

  return results;
}
