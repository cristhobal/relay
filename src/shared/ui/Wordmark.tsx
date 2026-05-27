import { cn } from "@/shared/utils/utils"

export function Wordmark({ className }: { className?: string }) {
  return (
    <a
      href="/"
      className={cn(
        "text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-70",
        className
      )}
      aria-label="Relay"
    >
      Relay
    </a>
  )
}
