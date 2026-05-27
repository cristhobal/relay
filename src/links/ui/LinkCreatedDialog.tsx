import * as React from "react"
import { toast } from "sonner"
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
} from "@/shared/ui/responsive-dialog"
import { Button } from "@/shared/ui/button"
import { Check, Copy, ExternalLink, Plus, Link2 } from "lucide-react"
import { shortUrl } from "@/shared/utils/short-url"
import { useLanguage } from "@/i18n/useLanguage"
import type { ShortLink } from "@/links/domain/short-link"

type Props = {
  link: ShortLink | null
  onOpenChange: (open: boolean) => void
  onCreateAnother?: () => void
}

export function LinkCreatedDialog({ link, onOpenChange, onCreateAnother }: Props) {
  const { t } = useLanguage()
  const [copied, setCopied] = React.useState(false)
  const url = link ? shortUrl(link.slug) : ""

  React.useEffect(() => {
    if (link) setCopied(false)
  }, [link])

  const handleCopy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      toast.success(t("created.copied"), { description: url })
    } catch {
      toast.error(t("common.failed"), { description: t("created.clipboard_blocked") })
    }
  }

  return (
    <ResponsiveDialog open={Boolean(link)} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="gap-0 p-0 overflow-hidden sm:max-w-sm">

        {/* ── Header band ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 border-b border-border px-6 py-6">
          {/* Icon + title row */}
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-md bg-foreground text-background">
              <Link2 className="size-4" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t("created.title")}
              </p>
              <h2 className="text-base font-semibold leading-tight tracking-tight">
                {t("created.desc")}
              </h2>
            </div>
          </div>
        </div>

        {/* ── URL copy block ───────────────────────────────────────── */}
        <div className="px-6 py-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("created.shorturl")}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? t("created.copied_aria") : t("created.copy_aria")}
            className="group flex w-full items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-4 py-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="truncate font-mono text-sm font-semibold tracking-tight text-foreground">
              {url}
            </span>
            <span
              className="shrink-0 grid size-7 place-items-center rounded-sm bg-background text-muted-foreground shadow-xs transition-colors group-hover:text-foreground"
              aria-hidden
            >
              {copied
                ? <Check className="size-3.5 text-foreground" strokeWidth={2.5} />
                : <Copy className="size-3.5" />
              }
            </span>
          </button>
          {copied && (
            <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
              {t("created.copied")}
            </p>
          )}
        </div>

        {/* ── Destination / description ────────────────────────────── */}
        <div className="border-t border-border px-6 py-4">
          {link?.description && (
            <p className="mb-2 text-xs text-muted-foreground italic">
              {link.description}
            </p>
          )}
          <a
            href={link?.destination}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="truncate">{link?.destination}</span>
            <ExternalLink className="size-3 shrink-0 opacity-60" />
          </a>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <ResponsiveDialogFooter className="border-t border-border px-6 py-4">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t("created.done")}
          </Button>
          {onCreateAnother && (
            <Button size="sm" onClick={onCreateAnother}>
              <Plus />
              {t("created.create_another")}
            </Button>
          )}
        </ResponsiveDialogFooter>

      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
