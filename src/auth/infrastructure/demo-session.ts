/**
 * Demo session — a localStorage-backed fake session used when OAuth env vars
 * are not configured (e.g. local development without credentials).
 *
 * This is a purely technical detail and should never be imported by
 * business-logic or domain code.
 */

import type { AuthProvider, AppSession } from "@/auth/infrastructure/session"

const DEMO_STORAGE_KEY = "relay:demo-session"

/** Generate a deterministic avatar URL from a seed string. */
function demoAvatar(seed: string) {
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed)}`
}

export function getDemoSession(): AppSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AppSession) : null
  } catch {
    return null
  }
}

export function setDemoSession(provider: AuthProvider): AppSession {
  const data = {
    google: { name: "Alex Reyes", email: "alex.reyes@gmail.com" },
    github: { name: "Alex Reyes", email: "alex@users.noreply.github.com" },
  }[provider]

  const session: AppSession = {
    user: {
      name: data.name,
      email: data.email,
      image: demoAvatar(data.email),
    },
    provider,
  }
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(session))
  return session
}

export function clearDemoSession() {
  if (typeof window !== "undefined")
    window.localStorage.removeItem(DEMO_STORAGE_KEY)
}
