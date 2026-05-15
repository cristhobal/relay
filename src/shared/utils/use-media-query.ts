import * as React from "react"

/**
 * Tracks the current match state of a CSS media query.
 *
 * - SSR-safe: returns `false` when `window` is unavailable.
 * - Avoids first-paint flicker on the client by reading
 *   `window.matchMedia(query).matches` synchronously during initial state.
 */
export function useMediaQuery(query: string): boolean {
  const getInitial = React.useCallback(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(query).matches
  }, [query])

  const [matches, setMatches] = React.useState<boolean>(getInitial)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [query])

  return matches
}
