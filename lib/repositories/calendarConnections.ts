import * as Crypto from "expo-crypto";

import { getDb } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { createEvent, deleteEventsBySource } from "@/lib/repositories/calendarEvents";
import type { CalendarConnection, CalendarProvider, EventRecurrence } from "@/types";

// There's no backend here — connecting Google/Apple/Outlook/Samsung for
// real would mean running OAuth and talking to each provider's calendar
// API from a server this app doesn't have. "Connecting" instead simulates
// the result locally: it stores a connection record and seeds a handful of
// believable recurring events tagged with that provider, the same spirit
// as the rest of this app being real-but-local (see CLAUDE.md). Screens
// should make clear to the user that this is a simulated demo connection.

interface ConnectionRow {
  id: string;
  provider: string;
  account_label: string;
  connected_at: string;
}

function toConnection(row: ConnectionRow): CalendarConnection {
  return {
    id: row.id,
    provider: row.provider as CalendarProvider,
    accountLabel: row.account_label,
    connectedAt: row.connected_at,
  };
}

export async function listConnectionsForUser(userId: string): Promise<CalendarConnection[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ConnectionRow>(
    "SELECT * FROM calendar_connections WHERE user_id = ?",
    [userId]
  );
  return rows.map(toConnection);
}

const SIMULATED_EVENTS: Record<
  CalendarProvider,
  { title: string; startTime: string; endTime: string; recurrence: EventRecurrence }[]
> = {
  google: [
    { title: "Work", startTime: "09:00", endTime: "17:30", recurrence: "daily" },
    { title: "Gym", startTime: "18:30", endTime: "20:00", recurrence: "weekly" },
  ],
  apple: [{ title: "Class", startTime: "08:30", endTime: "12:30", recurrence: "weekly" }],
  outlook: [{ title: "Team meeting", startTime: "10:00", endTime: "11:00", recurrence: "weekly" }],
  samsung: [{ title: "Commute", startTime: "07:30", endTime: "08:30", recurrence: "daily" }],
};

export async function connectProvider(params: {
  apartmentId: string;
  userId: string;
  provider: CalendarProvider;
  accountLabel: string;
}): Promise<CalendarConnection> {
  const accountLabel = params.accountLabel.trim();
  if (!accountLabel) throw new AppError("Enter the account to simulate connecting.");

  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM calendar_connections WHERE user_id = ? AND provider = ?",
    [params.userId, params.provider]
  );
  if (existing) throw new AppError("That calendar is already connected.");

  const id = Crypto.randomUUID();
  const connectedAt = new Date().toISOString();
  await db.runAsync(
    "INSERT INTO calendar_connections (id, user_id, provider, account_label, connected_at) VALUES (?, ?, ?, ?, ?)",
    [id, params.userId, params.provider, accountLabel, connectedAt]
  );

  const today = new Date();
  const startDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate()
  ).padStart(2, "0")}`;

  for (const seed of SIMULATED_EVENTS[params.provider]) {
    await createEvent({
      apartmentId: params.apartmentId,
      userId: params.userId,
      title: seed.title,
      description: `Synced from ${accountLabel} (simulated — no real account was contacted).`,
      startDate,
      startTime: seed.startTime,
      endTime: seed.endTime,
      recurrence: seed.recurrence,
      source: params.provider,
    });
  }

  return { id, provider: params.provider, accountLabel, connectedAt };
}

export async function disconnectProvider(userId: string, provider: CalendarProvider): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM calendar_connections WHERE user_id = ? AND provider = ?", [
    userId,
    provider,
  ]);
  await deleteEventsBySource(userId, provider);
}
