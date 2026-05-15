/**
 * Link repository — all MySQL queries for the `links` table.
 *
 * Infrastructure detail: every function here talks to the database.
 * Nothing in this file should contain business logic; that lives in
 * the application layer or the domain.
 */

import { nanoid } from "nanoid"
import { execute, query } from "@/shared/database/mysql"

export type DbLink = {
  id: string
  user_id: string
  slug: string
  destination: string
  description: string | null
  clicks: number
  created_at: string
}

export async function listLinksForUser(userId: string): Promise<DbLink[]> {
  return query<DbLink>(
    `SELECT id, user_id, slug, destination, description, clicks, created_at
     FROM links WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  )
}

export async function findLinkBySlug(slug: string): Promise<DbLink | null> {
  const rows = await query<DbLink>(
    `SELECT id, user_id, slug, destination, description, clicks, created_at FROM links WHERE slug = ? LIMIT 1`,
    [slug]
  )
  return rows[0] ?? null
}

export async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  if (excludeId) {
    const rows = await query<{ c: number }>(
      `SELECT COUNT(*) AS c FROM links WHERE slug = ? AND id != ?`,
      [slug, excludeId]
    )
    return rows[0].c > 0
  }
  const rows = await query<{ c: number }>(
    `SELECT COUNT(*) AS c FROM links WHERE slug = ?`,
    [slug]
  )
  return rows[0].c > 0
}

export async function createLink(input: {
  userId: string
  slug: string
  destination: string
  description?: string | null
}): Promise<DbLink> {
  const id = nanoid()
  const now = new Date().toISOString().slice(0, 19).replace("T", " ")
  await execute(
    `INSERT INTO links (id, user_id, slug, destination, description) VALUES (?, ?, ?, ?, ?)`,
    [id, input.userId, input.slug, input.destination, input.description ?? null]
  )
  // Return constructed object — avoids a second round-trip to the DB
  return {
    id,
    user_id: input.userId,
    slug: input.slug,
    destination: input.destination,
    description: input.description ?? null,
    clicks: 0,
    created_at: now,
  }
}

export async function updateLinkById(
  id: string,
  userId: string,
  patch: { slug?: string; destination?: string; description?: string | null }
): Promise<DbLink | null> {
  // Fetch current state once — we need it to reconstruct the result without a post-UPDATE SELECT
  const current = await query<DbLink>(
    `SELECT id, user_id, slug, destination, description, clicks, created_at FROM links WHERE id = ? AND user_id = ? LIMIT 1`,
    [id, userId]
  )
  if (!current[0]) return null

  const fields: string[] = []
  const params: unknown[] = []
  if (patch.slug !== undefined) { fields.push("slug = ?"); params.push(patch.slug) }
  if (patch.destination !== undefined) { fields.push("destination = ?"); params.push(patch.destination) }
  if (patch.description !== undefined) { fields.push("description = ?"); params.push(patch.description || null) }

  if (fields.length === 0) return current[0]

  params.push(id, userId)
  await execute(`UPDATE links SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`, params)

  // Reconstruct without a second SELECT
  return {
    ...current[0],
    ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
    ...(patch.destination !== undefined ? { destination: patch.destination } : {}),
    ...(patch.description !== undefined ? { description: patch.description || null } : {}),
  }
}

export async function deleteLinkById(id: string, userId: string): Promise<boolean> {
  const result = await execute(
    `DELETE FROM links WHERE id = ? AND user_id = ?`,
    [id, userId]
  )
  return result.affectedRows > 0
}

export async function incrementClicks(slug: string): Promise<void> {
  await execute(`UPDATE links SET clicks = clicks + 1 WHERE slug = ?`, [slug])
}

/**
 * Bulk-insert anonymous links from localStorage on first sign-in.
 * Uses a single IN-query to check existing slugs instead of N round-trips,
 * then inserts all new rows in one batched statement.
 * Returns the count of rows actually inserted.
 */
export async function migrateLinks(
  userId: string,
  links: Array<{
    slug: string
    destination: string
    description?: string | null
    clicks?: number
  }>
): Promise<number> {
  if (links.length === 0) return 0

  // Single query to find all taken slugs
  const slugs = links.map(l => l.slug)
  const placeholders = slugs.map(() => "?").join(", ")
  const taken = await query<{ slug: string }>(
    `SELECT slug FROM links WHERE slug IN (${placeholders})`,
    slugs
  )
  const takenSet = new Set(taken.map(r => r.slug))

  const toInsert = links.filter(l => !takenSet.has(l.slug))
  if (toInsert.length === 0) return 0

  // Batch insert all eligible rows in one statement
  const rowPlaceholders = toInsert.map(() => "(?, ?, ?, ?, ?, ?)").join(", ")
  const params: unknown[] = []
  for (const l of toInsert) {
    params.push(
      nanoid(),
      userId,
      l.slug,
      l.destination,
      l.description ?? null,
      Math.max(0, Math.floor(l.clicks ?? 0))
    )
  }
  await execute(
    `INSERT INTO links (id, user_id, slug, destination, description, clicks) VALUES ${rowPlaceholders}`,
    params
  )
  return toInsert.length
}
