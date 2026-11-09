// Domain types for the Roomly app.
// These model the 5 core features. No persistence/backend is wired up yet —
// see /mocks for sample data that satisfies these shapes.

export interface Roommate {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
  isYou?: boolean;
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

export type CalendarEventSource = "local" | "google" | "apple";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date (day precision)
  time?: string; // e.g. "19:00"
  color: string;
  source: CalendarEventSource;
  attendeeIds: string[];
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
