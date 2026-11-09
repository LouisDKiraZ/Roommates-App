import AsyncStorage from "@react-native-async-storage/async-storage";

// Persists only *which* user id is logged in — never a password — so the
// app can stay signed in across reloads.
const SESSION_KEY = "roomly:session:userId";

export function getSession(): Promise<string | null> {
  return AsyncStorage.getItem(SESSION_KEY);
}

export function setSession(userId: string): Promise<void> {
  return AsyncStorage.setItem(SESSION_KEY, userId);
}

export function clearSession(): Promise<void> {
  return AsyncStorage.removeItem(SESSION_KEY);
}
