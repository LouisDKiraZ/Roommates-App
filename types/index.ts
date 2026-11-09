// Domain types for the Roomly app.
// These model the 5 core features. No persistence/backend is wired up yet —
// see /mocks for sample data that satisfies these shapes.

export interface Roommate {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
  isYou?: boolean;
  // Real apartment members (see lib/repositories/apartments.ts) carry this;
  // the mock roommates used by the still-mock cleaning/expenses screens
  // don't bother setting it, hence optional.
  calendarPrivate?: boolean;
}

export interface Apartment {
  id: string;
  name: string;
  address: string;
  inviteCode: string;
  ownerId: string;
  roommates: Roommate[];
}

export type TaskFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export interface CleaningTask {
  id: string;
  title: string;
  icon: string; // Ionicons name
  assigneeId: string;
  frequency: TaskFrequency;
  dueLabel: string; // e.g. "Today", "Tomorrow", "Mon 3 Nov"
  done: boolean;
}

export type ExpenseCategory =
  | "groceries"
  | "utilities"
  | "household"
  | "rent"
  | "other";

export interface ExpenseSplit {
  roommateId: string;
  amount: number;
  settled: boolean;
}

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paidById: string;
  date: string; // ISO date
  splits: ExpenseSplit[];
}

// Real, locally-persisted calendar (see lib/repositories/calendarEvents.ts,
// lib/calendarRecurrence.ts). Every event represents a window of time its
// owner will be away from the apartment — that's what lets roommates tell
// whether they're alone. "none" means a one-off, non-repeating event.
export type EventRecurrence = "none" | "daily" | "weekly" | "biweekly" | "monthly";

export type CalendarProvider = "google" | "apple" | "outlook" | "samsung";

export type EventSource = "local" | CalendarProvider;

export interface ScheduleEvent {
  id: string;
  apartmentId: string;
  userId: string;
  title: string;
  description: string;
  startDate: string; // ISO date of the first/only occurrence, YYYY-MM-DD
  startTime: string; // "HH:MM", 24h
  endTime: string; // "HH:MM", 24h — same day as startDate, after startTime
  recurrence: EventRecurrence;
  source: EventSource;
}

// A personal calendar linked via lib/repositories/calendarConnections.ts.
// There's no backend to run a real OAuth/CalDAV sync against (see that
// file's comment), so this records a simulated connection.
export interface CalendarConnection {
  id: string;
  provider: CalendarProvider;
  accountLabel: string;
  connectedAt: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  avatarColor: string;
}

// Real, locally-persisted account (see lib/repositories, lib/db) — used by
// the auth + apartment-invitation features. Distinct from the mock
// `CurrentUser`/`Roommate` types above, which still back the untouched
// cleaning/expenses/calendar skeleton screens.
export interface AuthUser {
  id: string;
  name: string;
  username: string;
  initials: string;
  avatarColor: string;
  calendarPrivate: boolean;
}

// A join request the current user submitted (by entering an invite code)
// and is waiting on the apartment owner to accept or decline.
export interface MyJoinRequest {
  id: string;
  apartmentId: string;
  apartmentName: string;
  createdAt: string;
}

// A pending request to join, as seen by the apartment's owner.
export interface IncomingJoinRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterUsername: string;
  createdAt: string;
}
