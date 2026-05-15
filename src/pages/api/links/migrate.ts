import type { APIRoute } from "astro"
import { getSession } from "auth-astro/server"
import { migrateLinks } from "@/links/infrastructure/link-repository"
import { dbConfigured } from "@/shared/database/mysql"
import {
  isValidUrl,
  isValidSlug,
  isValidDescription,
  DESCRIPTION_MAX_LENGTH,
  DESTINATION_MAX_LENGTH,
} from "@/links/domain/short-link"

export const prerender = false

/** Maximum number of links accepted in a single migration batch. */
const MIGRATE_BATCH_LIMIT = 100

export const POST: APIRoute = async ({ request }) => {
  if (!dbConfigured()) return new Response("Database not configured", { status: 503 })
  const session = await getSession(request)
  const userId = (session?.user as any)?.id
  if (!userId) return new Response("Unauthorized", { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const links = Array.isArray(body?.links) ? body.links : []

  // Sanitise & validate; silently drop malformed entries
  const valid = links
    .filter(
      (l: any) =>
        l &&
        typeof l.slug === "string" &&
        isValidSlug(l.slug) &&
        typeof l.destination === "string" &&
        l.destination.length <= DESTINATION_MAX_LENGTH &&
        isValidUrl(l.destination) &&
        isValidDescription(l.description)
    )
    .slice(0, MIGRATE_BATCH_LIMIT)
    .map((l: any) => ({
      slug: l.slug,
      destination: l.destination,
      description:
        typeof l.description === "string"
          ? l.description.trim().slice(0, DESCRIPTION_MAX_LENGTH) || null
          : null,
      clicks: typeof l.clicks === "number" && l.clicks >= 0 ? Math.floor(l.clicks) : 0,
    }))

  const inserted = await migrateLinks(String(userId), valid)
  return Response.json({ inserted, skipped: valid.length - inserted })
}
