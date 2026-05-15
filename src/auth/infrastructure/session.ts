/**
 * Session — shared types and normalization helpers for Auth.js sessions.
 *
 * The `AppSession` type is our internal, framework-agnostic representation
 * of who is signed in. Components and server routes use `AppSession` — they
 * never import from `@auth/core` directly.
 */

import type { Session as AuthSession } from "@auth/core/types"

export type AuthProvider = "google" | "github" | "discord"

/** Normalised session — works for both real Auth.js and demo modes. */
export type AppSession = {
  user: {
    name: string
    email: string
    image?: string | null
    id?: string
  }
  provider: AuthProvider | "demo"
}

/** Convert an Auth.js session into our internal `AppSession`. */
export function normaliseSession(s: AuthSession | null): AppSession | null {
  if (!s?.user) return null
  return {
    user: {
      name: s.user.name ?? "Anonymous",
      email: s.user.email ?? "",
      image: s.user.image ?? null,
      id: (s.user as any).id,
    },
    provider: ((s as any).provider as AuthProvider) ?? "google",
  }
}

/** Extract up to two initials from a display name. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
