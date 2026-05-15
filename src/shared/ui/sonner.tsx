import * as React from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Reads the current theme from `document.documentElement.classList`
 * and re-renders when it changes (e.g. when ThemeToggle adds/removes .dark).
 * Drop-in replacement for next-themes' useTheme() in Astro projects.
 */
function useDocumentTheme(): "light" | "dark" {
  const [theme, setTheme] = React.useState<"light" | "dark">("light")

  React.useEffect(() => {
    const root = document.documentElement
    const getTheme = (): "light" | "dark" =>
      root.classList.contains("dark") ? "dark" : "light"

    setTheme(getTheme())

    const observer = new MutationObserver(() => setTheme(getTheme()))
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  return theme
}

function Toaster({ ...props }: ToasterProps) {
  const theme = useDocumentTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="bottom-right"
      expand={true}
      toastOptions={{
        style: { borderRadius: "5px" },
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
