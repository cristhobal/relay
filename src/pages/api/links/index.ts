import type { APIRoute } from "astro"
import { getSession } from "auth-astro/server"
import {
  createLink,
  listLinksForUser,
  slugExists,
  type DbLink,
} from "@/links/infrastructure/link-repository"
import { dbConfigured } from "@/shared/database/mysql"
import {
  isValidUrl,
  isValidSlug,
  isValidDescription,
  DESCRIPTION_MAX_LENGTH,
  DESTINATION_MAX_LENGTH,
  SLUG_MIN_LENGTH,
  SLUG_MAX_LENGTH,
} from "@/links/domain/short-link"

export const prerender = false

function toClientShape(l: DbLink) {
  return {
    id: l.id,
    slug: l.slug,
    destination: l.destination,
    description: l.description ?? undefined,
    clicks: Number(l.clicks),
    createdAt: new Date(l.created_at).getTime(),
  }
}

async function getUserId(request: Request): Promise<string | null> {
  const session = await getSession(request)
  const id = (session?.user as any)?.id
  return id ? String(id) : null
}

export const GET: APIRoute = async ({ request }) => {
  if (!dbConfigured()) return Response.json({ links: [] })
  const userId = await getUserId(request)
  if (!userId) return new Response("Unauthorized", { status: 401 })
  const rows = await listLinksForUser(userId)
  return Response.json(
    { links: rows.map(toClientShape) },
    { headers: { "Cache-Control": "private, no-cache" } }
  )
}

export const POST: APIRoute = async ({ request }) => {
  if (!dbConfigured()) {
    return new Response("Database not configured", { status: 503 })
  }
  const userId = await getUserId(request)
  if (!userId) return new Response("Unauthorized", { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const { destination, slug, description } = body ?? {}

  // --- destination ---
  if (!destination || typeof destination !== "string" || destination.trim() === "") {
    return Response.json({ error: "La URL de destino es obligatoria." }, { status: 400 })
  }
  if (destination.length > DESTINATION_MAX_LENGTH) {
    return Response.json(
      { error: `La URL de destino no puede superar ${DESTINATION_MAX_LENGTH} caracteres.` },
      { status: 400 }
    )
  }
  if (!isValidUrl(destination)) {
    return Response.json(
      { error: "La URL de destino debe comenzar con http:// o https://." },
      { status: 400 }
    )
  }

  // --- slug ---
  if (!slug || typeof slug !== "string" || slug.trim() === "") {
    return Response.json({ error: "El slug es obligatorio." }, { status: 400 })
  }
  if (!isValidSlug(slug)) {
    return Response.json(
      {
        error: `El slug debe tener entre ${SLUG_MIN_LENGTH} y ${SLUG_MAX_LENGTH} caracteres y solo puede contener letras, números, guiones y guiones bajos.`,
      },
      { status: 400 }
    )
  }
  if (await slugExists(slug)) {
    return Response.json({ error: "Slug already taken" }, { status: 409 })
  }

  // --- description (optional) ---
  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      return Response.json({ error: "La descripción debe ser texto." }, { status: 400 })
    }
    if (!isValidDescription(description)) {
      return Response.json(
        { error: `La descripción no puede superar ${DESCRIPTION_MAX_LENGTH} caracteres.` },
        { status: 400 }
      )
    }
  }

  const link = await createLink({
    userId,
    slug,
    destination,
    description: typeof description === "string" ? description.trim() || null : null,
  })
  return Response.json({ link: toClientShape(link) }, { status: 201 })
}
