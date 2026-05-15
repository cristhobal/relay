/**
 * User — the user entity as returned by the database.
 *
 * This type is the canonical representation of a signed-in person.
 * It drives both server-side queries and the API response shape.
 */

export type DbUser = {
  id: string
  email: string
  name: string | null
  image: string | null
  display_name: string | null
  short_domain: string | null
}

/**
 * A single OAuth account linked to a user.
 * One user can have multiple linked accounts (e.g. Google + Discord).
 */
export type LinkedAccount = {
  id: string
  provider: string
  provider_account_id: string
  created_at: string
}
