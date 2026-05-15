/**
 * Link service — application-level use cases for link management.
 *
 * This is the "port" that UI components talk to. It provides a uniform
 * async API regardless of whether the caller is authenticated:
 *
 *   - Anonymous users  → localStorage (browser-side, no network)
 *   - Authenticated    → REST API → MySQL on the server
 *
 * Components pass `isAuthenticated` and never need to know which backend
 * they're talking to.
 */

import {
  type ShortLink,
  randomSlug,
  isValidUrl,
  isValidSlug,
  isValidDescription,
  validateLinkInput,
  DESCRIPTION_MAX_LENGTH,
} from "@/links/domain/short-link"
import {
  readLocalLinks,
  saveLocalLink,
  updateLocalLink,
  removeLocalLink,
  isSlugTakenLocally,
  listLocalLinks,
  clearLocalLinks,
  canCreateAnonymousLink,
} from "@/links/infrastructure/local-link-storage"

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export async function listLinks(isAuthenticated: boolean): Promise<ShortLink[]> {
  if (!isAuthenticated) return readLocalLinks()
  const res = await fetch("/api/links", { credentials: "same-origin" })
  if (!res.ok) throw new Error(`Failed to load links (${res.status})`)
  const data = await res.json()
  return (data.links ?? []) as ShortLink[]
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createLink(
  isAuthenticated: boolean,
  input: { destination: string; slug: string; description?: string }
): Promise<ShortLink> {
  // Validate inputs before hitting any backend
  const errors = validateLinkInput({
    destination: input.destination,
    slug: input.slug,
    description: input.description,
  })
  if (Object.keys(errors).length > 0) {
    const firstError = Object.values(errors)[0]!
    throw new Error(firstError)
  }

  if (!isAuthenticated) {
    if (!canCreateAnonymousLink()) {
      throw new Error("Has alcanzado el límite de enlaces anónimos.")
    }
    if (isSlugTakenLocally(input.slug)) throw new Error("Slug already taken")
    const link: ShortLink = {
      id: randomSlug(10),
      destination: input.destination,
      slug: input.slug,
      description: input.description?.trim() || undefined,
      createdAt: Date.now(),
      clicks: 0,
      anonymous: true,
    }
    saveLocalLink(link)
    return link
  }
  const res = await fetch("/api/links", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Failed to create link (${res.status})`)
  }
  const data = await res.json()
  return data.link as ShortLink
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export async function updateLink(
  isAuthenticated: boolean,
  id: string,
  patch: { destination?: string; slug?: string; description?: string | null }
): Promise<ShortLink> {
  if (!id || id.trim() === "") throw new Error("El ID del enlace es obligatorio.")

  // Only validate fields that are actually being changed
  const errors = validateLinkInput({
    ...(patch.destination !== undefined ? { destination: patch.destination } : {}),
    ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
  })
  if (Object.keys(errors).length > 0) {
    throw new Error(Object.values(errors)[0]!)
  }

  if (!isAuthenticated) {
    if (patch.slug && isSlugTakenLocally(patch.slug, id)) {
      throw new Error("Slug already taken")
    }
    const updated = updateLocalLink(id, patch)
    if (!updated) throw new Error("Link not found")
    return updated
  }
  const res = await fetch(`/api/links/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `Failed to update link (${res.status})`)
  }
  const data = await res.json()
  return data.link as ShortLink
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function removeLink(
  isAuthenticated: boolean,
  id: string
): Promise<void> {
  if (!id || id.trim() === "") throw new Error("El ID del enlace es obligatorio.")

  if (!isAuthenticated) {
    const removed = removeLocalLink(id)
    if (!removed) throw new Error("Link not found")
    return
  }
  const res = await fetch(`/api/links/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
  })
  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete link (${res.status})`)
  }
}

// ---------------------------------------------------------------------------
// Slug availability
// ---------------------------------------------------------------------------

/**
 * Returns true if the slug is already in use.
 * For authenticated users the server is the authority (returns 409 on conflict);
 * this function only checks localStorage for anonymous users.
 */
export async function slugTaken(
  isAuthenticated: boolean,
  slug: string,
  excludeId?: string
): Promise<boolean> {
  if (!isAuthenticated) return isSlugTakenLocally(slug, excludeId)
  // For authenticated users, let the server validate — it returns 409 if taken.
  return false
}

// ---------------------------------------------------------------------------
// Migration: localStorage → authenticated account
// ---------------------------------------------------------------------------

export async function migrateLocalLinksToAccount(): Promise<{
  inserted: number
  skipped: number
}> {
  const links = listLocalLinks()
  if (links.length === 0) return { inserted: 0, skipped: 0 }
  const res = await fetch("/api/links/migrate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      links: links.map((l) => ({
        slug: l.slug,
        destination: l.destination,
        description: l.description ?? null,
        clicks: l.clicks ?? 0,
      })),
    }),
  })
  if (!res.ok) throw new Error(`Migration failed (${res.status})`)
  const data = await res.json()
  clearLocalLinks()
  return data
}
