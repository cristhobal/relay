import * as React from "react"
import { cn } from "@/shared/utils/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors",
        "placeholder:text-muted-foreground/70",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        "dark:bg-input/30 resize-none",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
