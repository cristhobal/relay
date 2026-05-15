/**
 * Local link storage — persists anonymous short links in the browser's
 * localStorage so they survive page refreshes without requiring sign-in.
 *
 * Infrastructure detail: callers should never need to know *how* the data
 * is stored. All knowledge of the storage key lives here.
 */

import { ANONYMOUS_LINK_LIMIT, type ShortLink } from "@/links/domain/short-link"

const STORAGE_KEY = "relay:links"

// ---------------------------------------------------------------------------
// Internal read/write helpers
// ---------------------------------------------------------------------------

export function readLocalLinks(): ShortLink[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ShortLink[]) : []
  } catch {
    return []
  }
}

function writeLocalLinks(links: ShortLink[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(links))
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Return all links stored locally (used by the migration step). */
export function listLocalLinks(): ShortLink[] {
  return readLocalLinks()
}

/** Wipe all locally stored links. */
export function clearLocalLinks() {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY)
}

/** How many anonymous links exist in localStorage. */
export function countAnonymousLinks(): number {
  return readLocalLinks().filter((l) => l.anonymous).length
}

/** Whether the anonymous quota allows one more link to be created. */
export function canCreateAnonymousLink(): boolean {
  return countAnonymousLinks() < ANONYMOUS_LINK_LIMIT
}

/** Prepend a new link to localStorage. Throws if the anonymous quota is exceeded. */
export function saveLocalLink(link: ShortLink) {
  if (!canCreateAnonymousLink()) {
    throw new Error("Has alcanzado el límite de enlaces anónimos.")
  }
  writeLocalLinks([link, ...readLocalLinks()])
}

/** Update a link in localStorage by id. Returns the updated link or null. */
export function updateLocalLink(
  id: string,
  patch: Partial<Pick<ShortLink, "destination" | "slug" | "description">>
): ShortLink | null {
  const all = readLocalLinks()
  const idx = all.findIndex((l) => l.id === id)
  if (idx === -1) return null
  const updated: ShortLink = {
    ...all[idx],
    ...(patch.destination !== undefined ? { destination: patch.destination } : {}),
    ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
    description:
      patch.description !== undefined
        ? patch.description?.trim() || undefined
        : all[idx].description,
  }
  all[idx] = updated
  writeLocalLinks(all)
  return updated
}

/** Remove a link from localStorage by id. Returns true if it existed. */
export function removeLocalLink(id: string): boolean {
  const all = readLocalLinks()
  const next = all.filter((l) => l.id !== id)
  if (next.length === all.length) return false
  writeLocalLinks(next)
  return true
}

/** True if a slug is already in use locally (optionally excluding a given id). */
export function isSlugTakenLocally(slug: string, excludeId?: string): boolean {
  return readLocalLinks().some(
    (l) => l.slug.toLowerCase() === slug.toLowerCase() && l.id !== excludeId
  )
}

/** Increment the click counter for a locally-stored slug. */
export function incrementLocalClicks(slug: string) {
  const all = readLocalLinks()
  const link = all.find(
    (l) => (l.slug || "").toLowerCase() === slug.toLowerCase()
  )
  if (!link) return
  link.clicks = (link.clicks || 0) + 1
  writeLocalLinks(all)
}
