/**
 * Local preferences — user-editable display name, bio, and short domain.
 *
 * For authenticated users these preferences are persisted in MySQL via the
 * /api/me endpoint. This module provides a localStorage fallback used during
 * demo mode and as a client-side cache.
 */

const STORAGE_KEY = "relay:preferences"

export type Preferences = {
  displayName?: string
  shortDomain?: string
}

export function getPreferences(): Preferences {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Preferences) : {}
  } catch {
    return {}
  }
}

export function savePreferences(next: Preferences) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function clearPreferences() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}
