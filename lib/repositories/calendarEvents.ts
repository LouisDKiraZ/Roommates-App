import * as Crypto from "expo-crypto";

import { getDb } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import type { EventRecurrence, EventSource, ScheduleEvent } from "@/types";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface EventRow {
  id: string;
  apartment_id: string;
  user_id: string;
  title: string;
  description: string;
  start_date: string;
  start_time: string;
  end_time: string;
  recurrence: string;
  source: string;
}

function toEvent(row: EventRow): ScheduleEvent {
  return {
    id: row.id,
    apartmentId: row.apartment_id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    startDate: row.start_date,
    startTime: row.start_time,
    endTime: row.end_time,
    recurrence: row.recurrence as EventRecurrence,
    source: row.source as EventSource,
  };
}

export async function listEventsForApartment(apartmentId: string): Promise<ScheduleEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EventRow>(
    "SELECT * FROM calendar_events WHERE apartment_id = ? ORDER BY start_date ASC, start_time ASC",
    [apartmentId]
  );
  return rows.map(toEvent);
}

export async function createEvent(params: {
  apartmentId: string;
  userId: string;
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endTime: string;
  recurrence: EventRecurrence;
  source?: EventSource;
}): Promise<ScheduleEvent> {
  const title = params.title.trim();
  const description = params.description.trim();
  if (!title) throw new AppError("Give the event a title.");
  if (!DATE_RE.test(params.startDate)) throw new AppError("Pick a valid date.");
  if (!TIME_RE.test(params.startTime) || !TIME_RE.test(params.endTime)) {
    throw new AppError("Times must be in HH:MM format.");
  }
  if (params.endTime <= params.startTime) {
    throw new AppError("End time must be after the start time.");
  }

  const db = await getDb();
  const id = Crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const source = params.source ?? "local";

  await db.runAsync(
    `INSERT INTO calendar_events
      (id, apartment_id, user_id, title, description, start_date, start_time, end_time, recurrence, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      params.apartmentId,
      params.userId,
      title,
      description,
      params.startDate,
      params.startTime,
      params.endTime,
      params.recurrence,
      source,
      createdAt,
    ]
  );

  return {
    id,
    apartmentId: params.apartmentId,
    userId: params.userId,
    title,
    description,
    startDate: params.startDate,
    startTime: params.startTime,
    endTime: params.endTime,
    recurrence: params.recurrence,
    source,
  };
}

export async function deleteEvent(eventId: string, userId: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ user_id: string }>(
    "SELECT user_id FROM calendar_events WHERE id = ?",
    [eventId]
  );
  if (!row || row.user_id !== userId) throw new AppError("That event is no longer available.");
  await db.runAsync("DELETE FROM calendar_events WHERE id = ?", [eventId]);
}

// Used when disconnecting a synced provider — clears the events it seeded.
export async function deleteEventsBySource(userId: string, source: EventSource): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM calendar_events WHERE user_id = ? AND source = ?", [
    userId,
    source,
  ]);
}
