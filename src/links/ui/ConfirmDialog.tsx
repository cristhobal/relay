import * as React from "react"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/shared/ui/responsive-dialog"
import { Button } from "@/shared/ui/button"
import { useLanguage } from "@/i18n/useLanguage"
import { AlertTriangle, Info } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  /** Slot for additional content between description and footer (e.g. preview of what's being deleted). */
  children?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: "destructive" | "default"
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  variant = "default",
  onConfirm,
}: Props) {
  const { t } = useLanguage()
  const [pending, setPending] = React.useState(false)

  const handleConfirm = async () => {
    setPending(true)
    try {
      await onConfirm()
    } finally {
      setPending(false)
      onOpenChange(false)
    }
  }

  const Icon = variant === "destructive" ? AlertTriangle : Info

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <div
            className={
              "mb-2 grid size-10 place-items-center rounded-full " +
              (variant === "destructive"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-foreground")
            }
          >
            <Icon className="size-4" />
          </div>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          {description && (
            <ResponsiveDialogDescription>
              {description}
            </ResponsiveDialogDescription>
          )}
        </ResponsiveDialogHeader>

        {children}

        <ResponsiveDialogFooter className="pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelLabel ?? t("common.cancel")}
          </Button>
          <Button
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? t("common.working") : (confirmLabel ?? t("common.confirm"))}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
