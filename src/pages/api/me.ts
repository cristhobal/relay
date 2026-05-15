import type { APIRoute } from "astro"
import { getSession } from "auth-astro/server"
import { getUserById, updateUserPreferences } from "@/users/infrastructure/user-repository"
import { dbConfigured } from "@/shared/database/mysql"

export const prerender = false

export const GET: APIRoute = async ({ request }) => {
  if (!dbConfigured()) return Response.json({ user: null })
  const session = await getSession(request)
  const userId = (session?.user as any)?.id
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const u = await getUserById(userId)
  if (!u) {
    // Session references a user ID that doesn't exist in the DB.
    // This can happen if the DB upsert failed at sign-in time (broken session).
    // Return 401 so the client treats it as "not authenticated" rather than
    // showing an opaque 404.
    return new Response(
      "Session user not found — please sign out and sign in again",
      { status: 401 }
    )
  }
  return Response.json({
    user: {
      id: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      displayName: u.display_name,
      shortDomain: u.short_domain,
    },
  })
}

export const PATCH: APIRoute = async ({ request }) => {
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

  const patch: { display_name?: string | null; short_domain?: string | null } = {}
  if (body.displayName !== undefined) patch.display_name = String(body.displayName).slice(0, 120) || null
  if (body.shortDomain !== undefined) patch.short_domain = String(body.shortDomain).slice(0, 255) || null

  await updateUserPreferences(String(userId), patch)
  return new Response(null, { status: 204 })
}
