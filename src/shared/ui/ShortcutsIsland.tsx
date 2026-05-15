import * as React from "react"

const DEMO_STORAGE_KEY = "relay:demo-session"

type Props = {
  /**
   * Whether the user has an active server-side (OAuth) session. The Layout
   * checks this on the server with `getSession(Astro.request)` and passes
   * the boolean down — JS can't read HttpOnly auth cookies directly.
   */
  hasServerSession: boolean
}

/**
 * Returns true when a keyboard event originated from a control where the user
 * is actively typing — we don't want global shortcuts to hijack those.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (target.isContentEditable) return true
  return false
}

function readDemoSession(): boolean {
  if (typeof window === "undefined") return false
  try {
    return Boolean(window.localStorage.getItem(DEMO_STORAGE_KEY))
  } catch {
    return false
  }
}

/**
 * React island — registers the app's global keyboard shortcuts on `window`
 * so they fire from any page, regardless of which components are mounted:
 *
 *   ⌘D / Ctrl+D → /dashboard
 *   ⌘, / Ctrl+, → /dashboard?tab=configuration
 *
 * The listener is added in the capture phase so `preventDefault()` runs
 * before the browser's default action (e.g. "Add bookmark" for ⌘D).
 *
 * Shortcuts only register when there is an active session (server-side
 * OAuth OR demo session in localStorage). For anonymous visitors the
 * listener is never attached, so the browser's native ⌘D behaviour is
 * preserved.
 */
export default function ShortcutsIsland({ hasServerSession }: Props) {
  const [hasDemoSession, setHasDemoSession] = React.useState<boolean>(() =>
    readDemoSession(),
  )

  // Keep the demo-session flag in sync with localStorage changes from other
  // tabs. (Same-tab demo sign-in/out always navigates, which remounts this
  // island, so a state initializer re-read covers that case.)
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== DEMO_STORAGE_KEY && e.key !== null) return
      setHasDemoSession(readDemoSession())
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const enabled = hasServerSession || hasDemoSession

  React.useEffect(() => {
    if (!enabled) return

    const dashboardHref = "/dashboard"

    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod || e.altKey || e.shiftKey) return
      if (isTypingTarget(e.target)) return

      // ⌘D → Dashboard
      if (e.key === "d" || e.key === "D") {
        e.preventDefault()
        if (window.location.pathname !== dashboardHref) {
          window.location.href = dashboardHref
        }
        return
      }

      // ⌘, → Configuration tab inside the dashboard
      if (e.key === ",") {
        e.preventDefault()
        if (window.location.pathname === dashboardHref) {
          // Already on the dashboard — let the mounted Dashboard component
          // switch tabs without a full page reload.
          window.dispatchEvent(new CustomEvent("relay:open-configuration"))
        } else {
          window.location.href = `${dashboardHref}?tab=configuration`
        }
      }
    }

    window.addEventListener("keydown", handler, { capture: true })
    return () =>
      window.removeEventListener("keydown", handler, { capture: true })
  }, [enabled])

  return null
}
