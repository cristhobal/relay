import type { APIRoute } from "astro"
import { getSession } from "auth-astro/server"
import {
  deleteLinkById,
  slugExists,
  updateLinkById,
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

export const PATCH: APIRoute = async ({ request, params }) => {
  if (!dbConfigured()) return new Response("Database not configured", { status: 503 })
  const userId = await getUserId(request)
  if (!userId) return new Response("Unauthorized", { status: 401 })
  const id = params.id
  if (!id) return new Response("Missing id", { status: 400 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response("Invalid JSON", { status: 400 })
  }

  const patch: { slug?: string; destination?: string; description?: string | null } = {}
  const knownFields = ["destination", "slug", "description"]
  const providedFields = knownFields.filter((f) => body?.[f] !== undefined)

  if (providedFields.length === 0) {
    return Response.json(
      { error: "El cuerpo de la petición debe incluir al menos un campo a actualizar (destination, slug o description)." },
      { status: 400 }
    )
  }

  // --- destination ---
  if (body.destination !== undefined) {
    if (typeof body.destination !== "string" || body.destination.trim() === "") {
      return Response.json({ error: "La URL de destino no puede estar vacía." }, { status: 400 })
    }
    if (body.destination.length > DESTINATION_MAX_LENGTH) {
      return Response.json(
        { error: `La URL de destino no puede superar ${DESTINATION_MAX_LENGTH} caracteres.` },
        { status: 400 }
      )
    }
    if (!isValidUrl(body.destination)) {
      return Response.json(
        { error: "La URL de destino debe comenzar con http:// o https://." },
        { status: 400 }
      )
    }
    patch.destination = body.destination
  }

  // --- slug ---
  if (body.slug !== undefined) {
    if (typeof body.slug !== "string" || body.slug.trim() === "") {
      return Response.json({ error: "El slug no puede estar vacío." }, { status: 400 })
    }
    if (!isValidSlug(body.slug)) {
      return Response.json(
        {
          error: `El slug debe tener entre ${SLUG_MIN_LENGTH} y ${SLUG_MAX_LENGTH} caracteres y solo puede contener letras, números, guiones y guiones bajos.`,
        },
        { status: 400 }
      )
    }
    if (await slugExists(body.slug, id)) {
      return Response.json({ error: "Slug already taken" }, { status: 409 })
    }
    patch.slug = body.slug
  }

  // --- description ---
  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== "string") {
      return Response.json({ error: "La descripción debe ser texto o null." }, { status: 400 })
    }
    if (!isValidDescription(body.description)) {
      return Response.json(
        { error: `La descripción no puede superar ${DESCRIPTION_MAX_LENGTH} caracteres.` },
        { status: 400 }
      )
    }
    patch.description =
      typeof body.description === "string" ? body.description.trim() || null : null
  }

  const updated = await updateLinkById(id, userId, patch)
  if (!updated) {
    return Response.json(
      { error: "No se encontró el enlace o no tienes permiso para modificarlo." },
      { status: 404 }
    )
  }
  return Response.json({ link: toClientShape(updated) })
}

export const DELETE: APIRoute = async ({ request, params }) => {
  if (!dbConfigured()) return new Response("Database not configured", { status: 503 })
  const userId = await getUserId(request)
  if (!userId) return new Response("Unauthorized", { status: 401 })
  const id = params.id
  if (!id) return new Response("Missing id", { status: 400 })
  const ok = await deleteLinkById(id, userId)
  if (!ok) {
    return Response.json(
      { error: "No se encontró el enlace o no tienes permiso para eliminarlo." },
      { status: 404 }
    )
  }
  return new Response(null, { status: 204 })
}
