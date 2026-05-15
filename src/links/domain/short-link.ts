/**
 * ShortLink — the central entity of the URL-shortening domain.
 *
 * This file contains:
 *   - The ShortLink type (shared by client and server)
 *   - Pure domain constants and validation rules
 *   - The slug generator (crypto-safe, alphabet-filtered)
 *
 * No framework, no DB, no HTTP — just business logic.
 */

export type ShortLink = {
  id: string
  destination: string
  slug: string
  description?: string
  createdAt: number
  clicks: number
  /** Only set for anonymous links stored in localStorage. */
  anonymous?: boolean
}

/** Maximum number of links an anonymous (non-signed-in) user may create. */
export const ANONYMOUS_LINK_LIMIT = 10

// ---------------------------------------------------------------------------
// Field constraints — single source of truth for both client and server
// ---------------------------------------------------------------------------

export const SLUG_MIN_LENGTH = 3
export const SLUG_MAX_LENGTH = 40
export const DESCRIPTION_MAX_LENGTH = 500
export const DESTINATION_MAX_LENGTH = 2048

/**
 * Alphabet for generated slugs.
 * Visually ambiguous characters (0/O, 1/I/l) are intentionally excluded.
 */
const SLUG_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

/** Generate a cryptographically-random slug of the given length (default 7). */
export function randomSlug(length = 7): string {
  let out = ""
  const arr = new Uint32Array(length)
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(arr)
  } else {
    for (let i = 0; i < length; i++) arr[i] = Math.floor(Math.random() * 1e9)
  }
  for (let i = 0; i < length; i++) {
    out += SLUG_ALPHABET[arr[i] % SLUG_ALPHABET.length]
  }
  return out
}

/** True if the string is a valid http/https URL within the allowed length. */
export function isValidUrl(value: string): boolean {
  if (!value || value.length > DESTINATION_MAX_LENGTH) return false
  try {
    const u = new URL(value)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

/** True if the slug satisfies the allowed character set and length constraints. */
export function isValidSlug(slug: string): boolean {
  return new RegExp(`^[a-zA-Z0-9_-]{${SLUG_MIN_LENGTH},${SLUG_MAX_LENGTH}}$`).test(slug)
}

/** True if the description is within the allowed length (empty string is allowed). */
export function isValidDescription(value: string | undefined | null): boolean {
  if (value == null || value === "") return true
  return value.trim().length <= DESCRIPTION_MAX_LENGTH
}

// ---------------------------------------------------------------------------
// Composite validator — returns a map of field → error message or empty object
// ---------------------------------------------------------------------------

export type LinkValidationErrors = Partial<Record<"destination" | "slug" | "description", string>>

export function validateLinkInput(input: {
  destination?: string
  slug?: string
  description?: string | null
}): LinkValidationErrors {
  const errors: LinkValidationErrors = {}

  if (input.destination !== undefined) {
    if (!input.destination || input.destination.trim() === "") {
      errors.destination = "La URL de destino es obligatoria."
    } else if (input.destination.length > DESTINATION_MAX_LENGTH) {
      errors.destination = `La URL de destino no puede superar ${DESTINATION_MAX_LENGTH} caracteres.`
    } else if (!isValidUrl(input.destination)) {
      errors.destination = "La URL de destino debe comenzar con http:// o https://."
    }
  }

  if (input.slug !== undefined) {
    if (!input.slug || input.slug.trim() === "") {
      errors.slug = "El slug es obligatorio."
    } else if (!isValidSlug(input.slug)) {
      errors.slug = `El slug debe tener entre ${SLUG_MIN_LENGTH} y ${SLUG_MAX_LENGTH} caracteres y solo puede contener letras, números, guiones y guiones bajos.`
    }
  }

  if (input.description !== undefined && !isValidDescription(input.description)) {
    errors.description = `La descripción no puede superar ${DESCRIPTION_MAX_LENGTH} caracteres.`
  }

  return errors
}
