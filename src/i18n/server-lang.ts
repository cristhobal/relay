import type { Lang } from "./translations"

const SUPPORTED = ["en", "es", "fr", "zh", "hi"] as const

function pickLang(code: string): Lang | null {
  const c = code.toLowerCase()
  return (SUPPORTED as readonly string[]).includes(c) ? (c as Lang) : null
}

/**
 * Resolves the user's preferred language on the server so SSR renders in
 * the right one. Must mirror the client logic in useLanguage.ts.
 *
 * Source order:
 *   1. `relay-lang` cookie — mirrors localStorage so explicit user choices
 *      survive reloads without a flash.
 *   2. `Accept-Language` header — used on the very first visit before any
 *      cookie exists.
 *   3. Fallback: "en".
 */
export function detectServerLang(request: Request): Lang {
  const cookie = request.headers.get("cookie") ?? ""
  const m = cookie.match(/(?:^|;\s*)relay-lang=([a-z]{2})/i)
  if (m) {
    const pick = pickLang(m[1])
    if (pick) return pick
  }

  const accept = request.headers.get("accept-language") ?? ""
  for (const part of accept.split(",")) {
    const code = (part.split(";")[0] ?? "").trim().split("-")[0]
    const pick = pickLang(code)
    if (pick) return pick
  }
  return "en"
}
