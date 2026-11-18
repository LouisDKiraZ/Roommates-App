import * as Crypto from "expo-crypto";

import { getDb } from "@/lib/db/client";
import { AppError } from "@/lib/errors";
import { findApartmentByCode } from "@/lib/repositories/apartments";
import { isUserInAnyApartment } from "@/lib/repositories/users";
import type { IncomingJoinRequest, MyJoinRequest } from "@/types";

interface JoinRequestRow {
  id: string;
  apartment_id: string;
  user_id: string;
  status: string;
}

// Entering a code creates a request rather than joining immediately — the
// apartment's owner has to accept it (see respondToJoinRequest below).
export async function createJoinRequest(code: string, userId: string): Promise<MyJoinRequest> {
  if (await isUserInAnyApartment(userId)) {
    throw new AppError("You're already in an apartment.");
  }

  const apartment = await findApartmentByCode(code);
  if (!apartment) throw new AppError("That invite code doesn't match any apartment.");

  const db = await getDb();
  const existing = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM join_requests WHERE user_id = ? AND status = 'pending'",
    [userId]
  );
  if (existing) throw new AppError("You already have a pending request.");

  const id = Crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO join_requests (id, apartment_id, user_id, status, created_at)
     VALUES (?, ?, ?, 'pending', ?)`,
    [id, apartment.id, userId, createdAt]
  );

  return { id, apartmentId: apartment.id, apartmentName: apartment.name, createdAt };
}

export async function getMyPendingJoinRequest(userId: string): Promise<MyJoinRequest | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    apartment_id: string;
    apartment_name: string;
    created_at: string;
  }>(
    `SELECT jr.id, jr.apartment_id, a.name AS apartment_name, jr.created_at
     FROM join_requests jr
     JOIN apartments a ON a.id = jr.apartment_id
     WHERE jr.user_id = ? AND jr.status = 'pending'`,
    [userId]
  );
  if (!row) return null;
  return {
    id: row.id,
    apartmentId: row.apartment_id,
    apartmentName: row.apartment_name,
    createdAt: row.created_at,
  };
}

export async function cancelJoinRequest(requestId: string, userId: string): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<JoinRequestRow>(
    "SELECT * FROM join_requests WHERE id = ?",
    [requestId]
  );
  if (!row || row.user_id !== userId) throw new AppError("That request is no longer available.");
  await db.runAsync("DELETE FROM join_requests WHERE id = ?", [requestId]);
}

export async function listJoinRequestsForApartment(
  apartmentId: string
): Promise<IncomingJoinRequest[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    requester_id: string;
    requester_name: string;
    requester_username: string;
    created_at: string;
  }>(
    `SELECT jr.id, u.id AS requester_id, u.name AS requester_name,
            u.username AS requester_username, jr.created_at
     FROM join_requests jr
     JOIN users u ON u.id = jr.user_id
     WHERE jr.apartment_id = ? AND jr.status = 'pending'
     ORDER BY jr.created_at DESC`,
    [apartmentId]
  );
  return rows.map((r) => ({
    id: r.id,
    requesterId: r.requester_id,
    requesterName: r.requester_name,
    requesterUsername: r.requester_username,
    createdAt: r.created_at,
  }));
}

export async function respondToJoinRequest(
  requestId: string,
  ownerId: string,
  accept: boolean
): Promise<void> {
  const db = await getDb();
  const request = await db.getFirstAsync<JoinRequestRow>(
    "SELECT * FROM join_requests WHERE id = ?",
    [requestId]
  );
  if (!request || request.status !== "pending") {
    throw new AppError("That request is no longer available.");
  }

  const apartment = await db.getFirstAsync<{ owner_id: string }>(
    "SELECT owner_id FROM apartments WHERE id = ?",
    [request.apartment_id]
  );
  if (!apartment || apartment.owner_id !== ownerId) {
    throw new AppError("Only the apartment owner can respond to requests.");
  }

  const now = new Date().toISOString();

  if (!accept) {
    await db.runAsync(
      "UPDATE join_requests SET status = 'declined', responded_at = ? WHERE id = ?",
      [now, requestId]
    );
    return;
  }

  if (await isUserInAnyApartment(request.user_id)) {
    await db.runAsync(
      "UPDATE join_requests SET status = 'declined', responded_at = ? WHERE id = ?",
      [now, requestId]
    );
    throw new AppError("That person already joined another apartment.");
  }

  await db.runAsync(
    "INSERT INTO apartment_members (apartment_id, user_id, joined_at) VALUES (?, ?, ?)",
    [request.apartment_id, request.user_id, now]
  );
  await db.runAsync(
    "UPDATE join_requests SET status = 'accepted', responded_at = ? WHERE id = ?",
    [now, requestId]
  );
}
