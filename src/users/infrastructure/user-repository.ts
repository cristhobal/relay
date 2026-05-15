/**
 * User repository — all MySQL queries for the `users` and `accounts` tables.
 *
 * Infrastructure detail: every function talks directly to the database.
 * Business logic belongs in the application layer, not here.
 */

import { nanoid } from "nanoid"
import { execute, query } from "@/shared/database/mysql"
import type { DbUser, LinkedAccount } from "@/users/domain/user"

export type { DbUser, LinkedAccount }

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Find or create a user record on every OAuth sign-in (upsert).
 * Handles account linking when the same e-mail signs in via different providers.
 */
/**
 * Find or create a user record on every OAuth sign-in.
 *
 * IMPORTANT: Each (provider, providerAccountId) pair is treated as an
 * independent identity. Two different providers sharing the same e-mail
 * are NOT auto-merged — the user must explicitly link accounts via the
 * profile settings. This prevents data leakage between unrelated accounts.
 */
export async function upsertUserFromOAuth(input: {
  email: string
  name?: string | null
  image?: string | null
  provider: string
  providerAccountId: string
}): Promise<DbUser> {
  // 1. Look for an existing linked account by (provider, providerAccountId).
  //    This is the only key we trust — email is not a reliable identity signal
  //    across providers.
  const existing = await query<DbUser>(
    `SELECT u.* FROM users u
     INNER JOIN accounts a ON a.user_id = u.id
     WHERE a.provider = ? AND a.provider_account_id = ?
     LIMIT 1`,
    [input.provider, input.providerAccountId]
  )
  if (existing[0]) {
    await execute(
      `UPDATE users SET name = ?, image = ? WHERE id = ?`,
      [input.name ?? null, input.image ?? null, existing[0].id]
    )
    return { ...existing[0], name: input.name ?? null, image: input.image ?? null }
  }

  // 2. Brand-new identity — check if this email already belongs to a different
  //    provider account. If so, link the new provider to that existing user
  //    (same email → same person, different OAuth provider).
  //    If not, create a dedicated user row + account link.
  const existingByEmail = await query<DbUser>(
    `SELECT * FROM users WHERE email = ? LIMIT 1`,
    [input.email]
  )

  if (existingByEmail[0]) {
    // Email already in the DB — link this provider to the existing user
    // so both providers resolve to the same account.
    const existingUser = existingByEmail[0]
    await execute(
      `INSERT IGNORE INTO accounts (id, user_id, provider, provider_account_id) VALUES (?, ?, ?, ?)`,
      [nanoid(), existingUser.id, input.provider, input.providerAccountId]
    )
    // Keep name/image up-to-date from the new provider.
    await execute(
      `UPDATE users SET name = COALESCE(?, name), image = COALESCE(?, image) WHERE id = ?`,
      [input.name ?? null, input.image ?? null, existingUser.id]
    )
    return {
      ...existingUser,
      name: input.name ?? existingUser.name,
      image: input.image ?? existingUser.image,
    }
  }
  const userId = nanoid()
  await execute(
    `INSERT INTO users (id, email, name, image) VALUES (?, ?, ?, ?)`,
    [userId, input.email, input.name ?? null, input.image ?? null]
  )

  await execute(
    `INSERT INTO accounts (id, user_id, provider, provider_account_id) VALUES (?, ?, ?, ?)`,
    [nanoid(), userId, input.provider, input.providerAccountId]
  )

  const result = await query<DbUser>(
    `SELECT * FROM users WHERE id = ? LIMIT 1`,
    [userId]
  )
  return result[0]
}

export async function getUserById(id: string): Promise<DbUser | null> {
  const rows = await query<DbUser>(
    `SELECT * FROM users WHERE id = ? LIMIT 1`,
    [id]
  )
  return rows[0] ?? null
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const rows = await query<DbUser>(
    `SELECT * FROM users WHERE email = ? LIMIT 1`,
    [email]
  )
  return rows[0] ?? null
}

export async function updateUserPreferences(
  userId: string,
  patch: {
    display_name?: string | null
    short_domain?: string | null
  }
): Promise<void> {
  const fields: string[] = []
  const params: unknown[] = []
  if (patch.display_name !== undefined) {
    fields.push("display_name = ?")
    params.push(patch.display_name || null)
  }
  if (patch.short_domain !== undefined) {
    fields.push("short_domain = ?")
    params.push(patch.short_domain || null)
  }
  if (fields.length === 0) return
  params.push(userId)
  await execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, params)
}

// ---------------------------------------------------------------------------
// Linked-accounts management
// ---------------------------------------------------------------------------

/** Return all OAuth accounts linked to a given user. */
export async function getLinkedAccounts(userId: string): Promise<LinkedAccount[]> {
  return query<LinkedAccount>(
    `SELECT id, provider, provider_account_id, created_at
     FROM accounts WHERE user_id = ? ORDER BY created_at ASC`,
    [userId]
  )
}

/**
 * Link an additional OAuth provider to an existing user.
 * Fails silently if the (provider, providerAccountId) pair is already linked
 * to this user (idempotent). Throws if it belongs to a different user.
 */
export async function linkProviderToUser(
  userId: string,
  provider: string,
  providerAccountId: string
): Promise<void> {
  // Check if the account already exists for any user
  const existing = await query<{ user_id: string }>(
    `SELECT user_id FROM accounts WHERE provider = ? AND provider_account_id = ? LIMIT 1`,
    [provider, providerAccountId]
  )
  if (existing[0]) {
    if (existing[0].user_id !== userId) {
      throw new Error(
        `This ${provider} account is already linked to a different user.`
      )
    }
    return // already linked to this user — nothing to do
  }
  await execute(
    `INSERT INTO accounts (id, user_id, provider, provider_account_id) VALUES (?, ?, ?, ?)`,
    [nanoid(), userId, provider, providerAccountId]
  )
}

/**
 * Remove an OAuth provider link from a user.
 * The user must retain at least one linked account — unlinking the last one
 * is rejected to prevent lockout.
 */
export async function unlinkProvider(
  userId: string,
  provider: string
): Promise<void> {
  const accounts = await getLinkedAccounts(userId)
  if (accounts.length <= 1) {
    throw new Error(
      "Cannot unlink the only connected provider — you would be locked out."
    )
  }
  await execute(
    `DELETE FROM accounts WHERE user_id = ? AND provider = ?`,
    [userId, provider]
  )
}
