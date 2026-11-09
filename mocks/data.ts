// Static sample data used to render the visual skeleton.
// Replace with real data fetching once each feature is implemented.

import type {
  Apartment,
  CalendarEvent,
  CleaningTask,
  CurrentUser,
  Expense,
  Roommate,
} from "@/types";

export const currentUser: CurrentUser = {
  id: "u1",
  name: "Alex",
  email: "alex@example.com",
  initials: "AL",
  avatarColor: "#6C5CE7",
};

export const roommates: Roommate[] = [
  { id: "u1", name: "Alex", initials: "AL", avatarColor: "#6C5CE7", isYou: true },
  { id: "u2", name: "Jamie", initials: "JA", avatarColor: "#F2A33C" },
  { id: "u3", name: "Sam", initials: "SA", avatarColor: "#3DB2A8" },
  { id: "u4", name: "Priya", initials: "PR", avatarColor: "#E0566C" },
];

export const apartment: Apartment = {
  id: "a1",
  name: "Maple Street Flat",
  address: "12 Maple Street, Apt 4B",
  inviteCode: "MAPLE-7K2Q",
  ownerId: "u1",
  roommates,
};

export const cleaningTasks: CleaningTask[] = [
  {
    id: "t1",
    title: "Kitchen deep clean",
    icon: "restaurant-outline",
    assigneeId: "u1",
    frequency: "weekly",
    dueLabel: "Today",
    done: false,
  },
  {
    id: "t2",
    title: "Take out the trash",
    icon: "trash-outline",
    assigneeId: "u2",
    frequency: "daily",
    dueLabel: "Today",
    done: true,
  },
  {
    id: "t3",
    title: "Vacuum living room",
    icon: "sparkles-outline",
    assigneeId: "u3",
    frequency: "weekly",
    dueLabel: "Tomorrow",
    done: false,
  },
  {
    id: "t4",
    title: "Clean bathroom",
    icon: "water-outline",
    assigneeId: "u4",
    frequency: "weekly",
    dueLabel: "Wed 29 Oct",
    done: false,
  },
  {
    id: "t5",
    title: "Water the plants",
    icon: "leaf-outline",
    assigneeId: "u1",
    frequency: "biweekly",
    dueLabel: "Fri 31 Oct",
    done: false,
  },
];

export const expenses: Expense[] = [
  {
    id: "e1",
    title: "Weekly groceries",
    category: "groceries",
    amount: 86.4,
    paidById: "u2",
    date: "2026-10-25",
    splits: [
      { roommateId: "u1", amount: 21.6, settled: false },
      { roommateId: "u2", amount: 21.6, settled: true },
      { roommateId: "u3", amount: 21.6, settled: false },
      { roommateId: "u4", amount: 21.6, settled: true },
    ],
  },
  {
    id: "e2",
    title: "Electricity bill",
    category: "utilities",
    amount: 142.0,
    paidById: "u1",
    date: "2026-10-20",
    splits: [
      { roommateId: "u1", amount: 35.5, settled: true },
      { roommateId: "u2", amount: 35.5, settled: false },
      { roommateId: "u3", amount: 35.5, settled: false },
      { roommateId: "u4", amount: 35.5, settled: false },
    ],
  },
  {
    id: "e3",
    title: "Cleaning supplies",
    category: "household",
    amount: 24.9,
    paidById: "u3",
    date: "2026-10-18",
    splits: [
      { roommateId: "u1", amount: 6.23, settled: true },
      { roommateId: "u2", amount: 6.23, settled: true },
      { roommateId: "u3", amount: 6.23, settled: true },
      { roommateId: "u4", amount: 6.23, settled: false },
    ],
  },
  {
    id: "e4",
    title: "Internet bill",
    category: "utilities",
    amount: 49.99,
    paidById: "u4",
    date: "2026-10-05",
    splits: [
      { roommateId: "u1", amount: 12.5, settled: true },
      { roommateId: "u2", amount: 12.5, settled: true },
      { roommateId: "u3", amount: 12.5, settled: true },
      { roommateId: "u4", amount: 12.5, settled: true },
    ],
  },
];

export const calendarEvents: CalendarEvent[] = [
  {
    id: "ev1",
    title: "Rent due",
    date: "2026-11-01",
    color: "#E0566C",
    source: "local",
    attendeeIds: ["u1", "u2", "u3", "u4"],
  },
  {
    id: "ev2",
    title: "Flatmate dinner",
    date: "2026-10-29",
    time: "19:30",
    color: "#F2A33C",
    source: "google",
    attendeeIds: ["u1", "u2", "u3", "u4"],
  },
  {
    id: "ev3",
    title: "Plumber visit",
    date: "2026-10-30",
    time: "10:00",
    color: "#6C7CE0",
    source: "local",
    attendeeIds: ["u1"],
  },
  {
    id: "ev4",
    title: "Jamie's birthday",
    date: "2026-11-06",
    color: "#3DB2A8",
    source: "apple",
    attendeeIds: ["u2"],
  },
];

export function getRoommate(id: string): Roommate | undefined {
  return roommates.find((r) => r.id === id);
}

// Fixed reference date for the mock data below, so the demo stays
// consistent regardless of when it's actually run.
export const today = "2026-10-27";
