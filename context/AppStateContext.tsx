// Real local auth + apartment membership state, backed by an on-device
// SQLite database (see lib/db, lib/repositories) and a persisted session
// (see lib/auth/session). This is the only place screens should reach for
// that data or mutate it — repositories do the actual SQL.
//
// Cleaning/expenses/calendar stay mocked (see mocks/data.ts) — out of scope
// for this context.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { AppError } from "@/lib/errors";
import { clearSession, getSession, setSession } from "@/lib/auth/session";
import { createApartment as createApartmentRepo, getApartmentForUser } from "@/lib/repositories/apartments";
import {
  connectProvider as connectProviderRepo,
  disconnectProvider as disconnectProviderRepo,
  listConnectionsForUser,
} from "@/lib/repositories/calendarConnections";
import {
  createEvent as createEventRepo,
  deleteEvent as deleteEventRepo,
  listEventsForApartment,
} from "@/lib/repositories/calendarEvents";
import {
  cancelJoinRequest as cancelJoinRequestRepo,
  createJoinRequest,
  getMyPendingJoinRequest,
  listJoinRequestsForApartment,
  respondToJoinRequest as respondToJoinRequestRepo,
} from "@/lib/repositories/joinRequests";
import {
  createUser,
  findAuthUserById,
  setCalendarPrivacy as setCalendarPrivacyRepo,
  verifyLogin,
} from "@/lib/repositories/users";
import type {
  Apartment,
  AuthUser,
  CalendarConnection,
  CalendarProvider,
  EventRecurrence,
  IncomingJoinRequest,
  MyJoinRequest,
  ScheduleEvent,
} from "@/types";

interface AppState {
  isLoading: boolean;
  currentUser: AuthUser | null;
  apartment: Apartment | null;
  myJoinRequest: MyJoinRequest | null;
  incomingJoinRequests: IncomingJoinRequest[];
  calendarEvents: ScheduleEvent[];
  calendarConnections: CalendarConnection[];

  signup: (name: string, username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  createApartment: (name: string, address: string) => Promise<void>;
  requestToJoinApartment: (code: string) => Promise<void>;
  cancelMyJoinRequest: () => Promise<void>;
  respondToJoinRequest: (requestId: string, accept: boolean) => Promise<void>;

  addCalendarEvent: (input: {
    title: string;
    description: string;
    startDate: string;
    startTime: string;
    endTime: string;
    recurrence: EventRecurrence;
  }) => Promise<void>;
  removeCalendarEvent: (eventId: string) => Promise<void>;
  setCalendarPrivacy: (isPrivate: boolean) => Promise<void>;
  connectCalendarProvider: (provider: CalendarProvider, accountLabel: string) => Promise<void>;
  disconnectCalendarProvider: (provider: CalendarProvider) => Promise<void>;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [myJoinRequest, setMyJoinRequest] = useState<MyJoinRequest | null>(null);
  const [incomingJoinRequests, setIncomingJoinRequests] = useState<IncomingJoinRequest[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<ScheduleEvent[]>([]);
  const [calendarConnections, setCalendarConnections] = useState<CalendarConnection[]>([]);

  // Loads everything that depends on who's logged in and whether they have
  // an apartment yet — called after login/signup and on cold start.
  async function loadForUser(user: AuthUser) {
    const apt = await getApartmentForUser(user.id);
    setApartment(apt);
    if (apt) {
      setMyJoinRequest(null);
      setIncomingJoinRequests(
        apt.ownerId === user.id ? await listJoinRequestsForApartment(apt.id) : []
      );
      setCalendarEvents(await listEventsForApartment(apt.id));
      setCalendarConnections(await listConnectionsForUser(user.id));
    } else {
      setIncomingJoinRequests([]);
      setMyJoinRequest(await getMyPendingJoinRequest(user.id));
      setCalendarEvents([]);
      setCalendarConnections([]);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const userId = await getSession();
        if (userId) {
          const user = await findAuthUserById(userId);
          if (user) {
            setCurrentUser(user);
            await loadForUser(user);
          } else {
            await clearSession();
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function signup(name: string, username: string, password: string) {
    const user = await createUser({ name, username, password });
    await setSession(user.id);
    setCurrentUser(user);
    await loadForUser(user);
  }

  async function login(username: string, password: string) {
    const user = await verifyLogin(username, password);
    await setSession(user.id);
    setCurrentUser(user);
    await loadForUser(user);
  }

  async function logout() {
    await clearSession();
    setCurrentUser(null);
    setApartment(null);
    setMyJoinRequest(null);
    setIncomingJoinRequests([]);
    setCalendarEvents([]);
    setCalendarConnections([]);
  }

  function requireUser(): AuthUser {
    if (!currentUser) throw new AppError("You're not logged in.");
    return currentUser;
  }

  async function createApartment(name: string, address: string) {
    const user = requireUser();
    const apt = await createApartmentRepo({ name, address, ownerId: user.id });
    setApartment(apt);
    setMyJoinRequest(null);
    setIncomingJoinRequests([]);
  }

  async function requestToJoinApartment(code: string) {
    const user = requireUser();
    const request = await createJoinRequest(code, user.id);
    setMyJoinRequest(request);
  }

  async function cancelMyJoinRequest() {
    const user = requireUser();
    if (!myJoinRequest) return;
    await cancelJoinRequestRepo(myJoinRequest.id, user.id);
    setMyJoinRequest(null);
  }

  async function respondToJoinRequest(requestId: string, accept: boolean) {
    const user = requireUser();
    await respondToJoinRequestRepo(requestId, user.id, accept);
    await loadForUser(user);
  }

  function requireApartment(): Apartment {
    if (!apartment) throw new AppError("Join an apartment first.");
    return apartment;
  }

  async function addCalendarEvent(input: {
    title: string;
    description: string;
    startDate: string;
    startTime: string;
    endTime: string;
    recurrence: EventRecurrence;
  }) {
    const user = requireUser();
    const apt = requireApartment();
    const event = await createEventRepo({ apartmentId: apt.id, userId: user.id, ...input });
    setCalendarEvents((prev) => [...prev, event]);
  }

  async function removeCalendarEvent(eventId: string) {
    const user = requireUser();
    await deleteEventRepo(eventId, user.id);
    setCalendarEvents((prev) => prev.filter((e) => e.id !== eventId));
  }

  async function setCalendarPrivacy(isPrivate: boolean) {
    const user = requireUser();
    await setCalendarPrivacyRepo(user.id, isPrivate);
    setApartment((prev) =>
      prev
        ? {
            ...prev,
            roommates: prev.roommates.map((r) =>
              r.id === user.id ? { ...r, calendarPrivate: isPrivate } : r
            ),
          }
        : prev
    );
  }

  async function connectCalendarProvider(provider: CalendarProvider, accountLabel: string) {
    const user = requireUser();
    const apt = requireApartment();
    const connection = await connectProviderRepo({
      apartmentId: apt.id,
      userId: user.id,
      provider,
      accountLabel,
    });
    setCalendarConnections((prev) => [...prev, connection]);
    setCalendarEvents(await listEventsForApartment(apt.id));
  }

  async function disconnectCalendarProvider(provider: CalendarProvider) {
    const user = requireUser();
    const apt = requireApartment();
    await disconnectProviderRepo(user.id, provider);
    setCalendarConnections((prev) => prev.filter((c) => c.provider !== provider));
    setCalendarEvents(await listEventsForApartment(apt.id));
  }

  const value = useMemo<AppState>(
    () => ({
      isLoading,
      currentUser,
      apartment,
      myJoinRequest,
      incomingJoinRequests,
      calendarEvents,
      calendarConnections,
      signup,
      login,
      logout,
      createApartment,
      requestToJoinApartment,
      cancelMyJoinRequest,
      respondToJoinRequest,
      addCalendarEvent,
      removeCalendarEvent,
      setCalendarPrivacy,
      connectCalendarProvider,
      disconnectCalendarProvider,
    }),
    [
      isLoading,
      currentUser,
      apartment,
      myJoinRequest,
      incomingJoinRequests,
      calendarEvents,
      calendarConnections,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
