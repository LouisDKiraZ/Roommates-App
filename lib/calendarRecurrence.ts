// Pure helpers for working out which days a recurring event falls on, and
// whether it's active at a given moment — no DB/context access, so these
// are easy to reuse in both the calendar screen and the home presence card.

import type { EventRecurrence, ScheduleEvent } from "@/types";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

// Parsed as local-time midnight (not UTC) so day math matches what the
// user sees on the grid, the same way lib/calendarGrid.ts builds its ISO
// strings.
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toHHMM(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function eventOccursOnDate(event: ScheduleEvent, iso: string): boolean {
  const diff = daysBetween(parseISODate(event.startDate), parseISODate(iso));
  if (diff < 0) return false;

  switch (event.recurrence) {
    case "none":
      return diff === 0;
    case "daily":
      return true;
    case "weekly":
      return diff % 7 === 0;
    case "biweekly":
      return diff % 14 === 0;
    case "monthly":
      return parseISODate(iso).getDate() === parseISODate(event.startDate).getDate();
  }
}

export function isEventActiveAt(event: ScheduleEvent, when: Date): boolean {
  if (!eventOccursOnDate(event, toISODate(when))) return false;
  const time = toHHMM(when);
  return time >= event.startTime && time < event.endTime;
}

export function eventsOnDate(events: ScheduleEvent[], iso: string): ScheduleEvent[] {
  return events
    .filter((e) => eventOccursOnDate(e, iso))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export const RECURRENCE_LABELS: Record<EventRecurrence, string> = {
  none: "Once",
  daily: "Every day",
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  monthly: "Every month",
};

export const RECURRENCE_OPTIONS: EventRecurrence[] = [
  "none",
  "daily",
  "weekly",
  "biweekly",
  "monthly",
];
