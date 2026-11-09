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
  cancelJoinRequest as cancelJoinRequestRepo,
  createJoinRequest,
  getMyPendingJoinRequest,
  listJoinRequestsForApartment,
  respondToJoinRequest as respondToJoinRequestRepo,
} from "@/lib/repositories/joinRequests";
import { createUser, findAuthUserById, verifyLogin } from "@/lib/repositories/users";
import type { Apartment, AuthUser, IncomingJoinRequest, MyJoinRequest } from "@/types";

interface AppState {
  isLoading: boolean;
  currentUser: AuthUser | null;
  apartment: Apartment | null;
  myJoinRequest: MyJoinRequest | null;
  incomingJoinRequests: IncomingJoinRequest[];

  signup: (name: string, username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;

  createApartment: (name: string, address: string) => Promise<void>;
  requestToJoinApartment: (code: string) => Promise<void>;
  cancelMyJoinRequest: () => Promise<void>;
  respondToJoinRequest: (requestId: string, accept: boolean) => Promise<void>;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [apartment, setApartment] = useState<Apartment | null>(null);
  const [myJoinRequest, setMyJoinRequest] = useState<MyJoinRequest | null>(null);
  const [incomingJoinRequests, setIncomingJoinRequests] = useState<IncomingJoinRequest[]>([]);

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
    } else {
      setIncomingJoinRequests([]);
      setMyJoinRequest(await getMyPendingJoinRequest(user.id));
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

  const value = useMemo<AppState>(
    () => ({
      isLoading,
      currentUser,
      apartment,
      myJoinRequest,
      incomingJoinRequests,
      signup,
      login,
      logout,
      createApartment,
      requestToJoinApartment,
      cancelMyJoinRequest,
      respondToJoinRequest,
    }),
    [isLoading, currentUser, apartment, myJoinRequest, incomingJoinRequests]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
