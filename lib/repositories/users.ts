import * as Crypto from "expo-crypto";

import { getDb } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isValidUsername, normalizeUsername } from "@/lib/auth/validators";
import type { AuthUser } from "@/types";

// Palette new accounts are assigned from, picked deterministically by id so
// a given user always gets the same color.
const AVATAR_COLORS = [
  "#6C5CE7",
  "#F2A33C",
  "#3DB2A8",
  "#E0566C",
  "#6C7CE0",
  "#3BB273",
  "#D9822B",
  "#B15EE0",
];

interface UserRow {
  id: string;
  name: string;
  username: string;
  password_hash: string;
  password_salt: string;
  avatar_color: string;
  initials: string;
}

function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    initials: row.initials,
    avatarColor: row.avatar_color,
  };
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorForId(id: string): string {
  const sum = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export async function createUser(params: {
  name: string;
  username: string;
  password: string;
}): Promise<AuthUser> {
  const name = params.name.trim();
  const username = normalizeUsername(params.username);

  if (!name) throw new AppError("Enter your name.");
  if (!isValidUsername(username)) {
    throw new AppError(
      "Username must be 3-20 characters, letters/numbers/underscore only."
    );
  }

  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM users WHERE username = ?",
    [username]
  );
  if (existing) throw new AppError("That username is already taken.");

  const id = Crypto.randomUUID();
  const { hash, salt } = await hashPassword(params.password);
  const initials = initialsFromName(name);
  const avatarColor = colorForId(id);
  const createdAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO users (id, name, username, password_hash, password_salt, avatar_color, initials, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, username, hash, salt, avatarColor, initials, createdAt]
  );

  return { id, name, username, initials, avatarColor };
}

export async function verifyLogin(
  username: string,
  password: string
): Promise<AuthUser> {
  const db = await getDb();
  const row = await db.getFirstAsync<UserRow>(
    "SELECT * FROM users WHERE username = ?",
    [normalizeUsername(username)]
  );
  if (!row) throw new AppError("Invalid username or password.");

  const valid = await verifyPassword(password, row.password_salt, row.password_hash);
  if (!valid) throw new AppError("Invalid username or password.");

  return toAuthUser(row);
}

export async function findAuthUserById(id: string): Promise<AuthUser | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
  return row ? toAuthUser(row) : null;
}

export async function isUserInAnyApartment(userId: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ apartment_id: string }>(
    "SELECT apartment_id FROM apartment_members WHERE user_id = ? LIMIT 1",
    [userId]
  );
  return !!row;
}
