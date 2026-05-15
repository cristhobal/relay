/**
 * GET  /api/me/accounts          — list OAuth accounts linked to the current user
 * DELETE /api/me/accounts?provider=google  — unlink an OAuth provider
 */
import type { APIRoute } from "astro"
import { getSession } from "auth-astro/server"
import {
  getLinkedAccounts,
  unlinkProvider,
} from "@/users/infrastructure/user-repository"
import { dbConfigured } from "@/shared/database/mysql"

export const prerender = false

export const GET: APIRoute = async ({ request }) => {
  if (!dbConfigured()) return Response.json({ accounts: [] })
  const session = await getSession(request)
  const userId = (session?.user as any)?.id
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const accounts = await getLinkedAccounts(String(userId))
  return Response.json({
    accounts: accounts.map((a) => ({
      provider: a.provider,
      linkedAt: a.created_at,
    })),
  })
}

export const DELETE: APIRoute = async ({ request }) => {
  if (!dbConfigured()) return new Response("Database not configured", { status: 503 })
  const session = await getSession(request)
  const userId = (session?.user as any)?.id
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const url = new URL(request.url)
  const provider = url.searchParams.get("provider")
  if (!provider) return new Response("Missing ?provider=", { status: 400 })

  try {
    await unlinkProvider(String(userId), provider)
    return new Response(null, { status: 204 })
  } catch (err: any) {
    return new Response(err?.message ?? "Unlink failed", { status: 409 })
  }
}
