/**
 * Short URL helpers — build the public-facing URL for a slug.
 *
 * Shared by client components and server-side pages.
 */

const PRODUCTION_HOST = "relay.vercel.app";

/** Returns the host (e.g. "relay.vercel.app"), without protocol. */
export function shortHost(): string {
  if (typeof window === "undefined") return PRODUCTION_HOST;
  return window.location.host || PRODUCTION_HOST;
}

/** Returns the full short URL for a slug (e.g. "https://relay.vercel.app/abc123"). */
export function shortUrl(slug: string): string {
  if (typeof window === "undefined")
    return `https://${PRODUCTION_HOST}/${slug}`;
  return `${window.location.origin}/${slug}`;
}
