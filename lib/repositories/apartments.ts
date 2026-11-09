import * as Crypto from "expo-crypto";

import { getDb } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { isUserInAnyApartment } from "@/lib/repositories/users";
import type { Apartment } from "@/types";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 — easy to read aloud

function randomCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

async function generateInviteCode(): Promise<string> {
  const db = await getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `${randomCode(4)}-${randomCode(4)}`;
    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM apartments WHERE invite_code = ?",
      [code]
    );
    if (!existing) return code;
  }
  throw new AppError("Couldn't generate an invite code, try again.");
}

interface ApartmentRow {
  id: string;
  name: string;
  address: string;
  invite_code: string;
  owner_id: string;
}

interface MemberRow {
  id: string;
  name: string;
  initials: string;
  avatar_color: string;
}

async function loadApartment(
  db: Awaited<ReturnType<typeof getDb>>,
  apartmentRow: ApartmentRow,
  currentUserId: string
): Promise<Apartment> {
  const members = await db.getAllAsync<MemberRow>(
    `SELECT u.id, u.name, u.initials, u.avatar_color
     FROM apartment_members am
     JOIN users u ON u.id = am.user_id
     WHERE am.apartment_id = ?
     ORDER BY am.joined_at ASC`,
    [apartmentRow.id]
  );

  return {
    id: apartmentRow.id,
    name: apartmentRow.name,
    address: apartmentRow.address,
    inviteCode: apartmentRow.invite_code,
    ownerId: apartmentRow.owner_id,
    roommates: members.map((m) => ({
      id: m.id,
      name: m.name,
      initials: m.initials,
      avatarColor: m.avatar_color,
      isYou: m.id === currentUserId,
    })),
  };
}

export async function getApartmentForUser(userId: string): Promise<Apartment | null> {
  const db = await getDb();
  const membership = await db.getFirstAsync<{ apartment_id: string }>(
    "SELECT apartment_id FROM apartment_members WHERE user_id = ? LIMIT 1",
    [userId]
  );
  if (!membership) return null;

  const apartmentRow = await db.getFirstAsync<ApartmentRow>(
    "SELECT * FROM apartments WHERE id = ?",
    [membership.apartment_id]
  );
  if (!apartmentRow) return null;

  return loadApartment(db, apartmentRow, userId);
}

export async function createApartment(params: {
  name: string;
  address: string;
  ownerId: string;
}): Promise<Apartment> {
  const name = params.name.trim();
  const address = params.address.trim();
  if (!name) throw new AppError("Enter an apartment name.");
  if (!address) throw new AppError("Enter an address.");
  if (await isUserInAnyApartment(params.ownerId)) {
    throw new AppError("You're already in an apartment.");
  }

  const db = await getDb();
  const id = Crypto.randomUUID();
  const inviteCode = await generateInviteCode();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO apartments (id, name, address, invite_code, owner_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, address, inviteCode, params.ownerId, now]
  );
  await db.runAsync(
    "INSERT INTO apartment_members (apartment_id, user_id, joined_at) VALUES (?, ?, ?)",
    [id, params.ownerId, now]
  );

  const apartmentRow = await db.getFirstAsync<ApartmentRow>(
    "SELECT * FROM apartments WHERE id = ?",
    [id]
  );
  return loadApartment(db, apartmentRow!, params.ownerId);
}

// Looked up by a would-be joiner entering a code — does not add them as a
// member. See lib/repositories/joinRequests.ts for the request this feeds.
export async function findApartmentByCode(
  code: string
): Promise<{ id: string; name: string; ownerId: string } | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const db = await getDb();
  const row = await db.getFirstAsync<ApartmentRow>(
    "SELECT * FROM apartments WHERE invite_code = ?",
    [normalized]
  );
  return row ? { id: row.id, name: row.name, ownerId: row.owner_id } : null;
}
