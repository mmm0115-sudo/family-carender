export interface User {
  uid: string;
  email: string;
  displayName: string;
  familyId: string | null;
  color: string;
  createdAt: Date;
}

export interface FamilyMember {
  userId: string;
  displayName: string;
  color: string;
}

export interface Family {
  id: string;
  name: string;
  code: string;
  members: FamilyMember[];
  createdAt: Date;
  createdBy: string;
}

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceRule {
  type: RecurrenceType;
  interval: number;
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat (for weekly)
  endDate?: string | null; // ISO date string
  count?: number | null;
}

export interface EventImage {
  url: string;
  storagePath: string;
  name: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startDate: string; // ISO datetime string
  endDate: string;
  allDay: boolean;
  familyId: string;
  createdBy: FamilyMember;
  images: EventImage[];
  recurrence: RecurrenceRule;
  createdAt: Date;
  updatedAt: Date;
}

// A virtual occurrence of a recurring event for display
export interface EventOccurrence extends CalendarEvent {
  occurrenceDate: string; // ISO date string for this specific occurrence
  isRecurring: boolean;
}
