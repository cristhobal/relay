import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/shared/ui/button"

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light")
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const initial = stored ?? (prefersDark ? "dark" : "light")
    setTheme(initial)
    setMounted(true)
  }, [])

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light"

    const applyTheme = () => {
      setTheme(next)
      localStorage.setItem("theme", next)
      document.documentElement.classList.toggle("dark", next === "dark")
    }

    // View Transitions API — crossfade nativo cuando esté disponible
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      // @ts-expect-error - startViewTransition no está aún en lib.dom de TS
      document.startViewTransition(applyTheme)
    } else {
      // Fallback CSS: transición temporizada vía clase
      document.documentElement.classList.add("theme-transitioning")
      applyTheme()
      window.setTimeout(() => {
        document.documentElement.classList.remove("theme-transitioning")
      }, 400)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label="Toggle theme"
      title={theme === "light" ? "Switch to dark" : "Switch to light"}
    >
      {mounted && (theme === "light" ? <Moon /> : <Sun />)}
    </Button>
  )
}
