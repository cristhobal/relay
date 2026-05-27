import * as React from "react";
import { toast } from "sonner";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/shared/ui/responsive-dialog";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/links/ui/ConfirmDialog";
import { EditLinkDialog } from "@/links/ui/EditLinkDialog";
import {
  type ShortLink,
  ANONYMOUS_LINK_LIMIT,
} from "@/links/domain/short-link";
import { useLanguage } from "@/i18n/useLanguage"
import { listLinks, removeLink } from "@/links/application/link-service";
import { shortHost, shortUrl } from "@/shared/utils/short-url";
import {
  Check,
  Copy,
  ExternalLink,
  Plus,
  Trash2,
  ArrowRight,
  Link2,
  Pencil,
} from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreateNew?: () => void;
  onSignIn?: () => void;
};

export function MyLinksDialog({
  open,
  onOpenChange,
  onCreateNew,
  onSignIn,
}: Props) {
  const { t } = useLanguage()
  const [links, setLinks] = React.useState<ShortLink[]>([]);
  const [host, setHost] = React.useState("withrelay.vercel.app");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [editingLink, setEditingLink] = React.useState<ShortLink | null>(null);
  const [deletingLink, setDeletingLink] = React.useState<ShortLink | null>(
    null,
  );

  const refresh = async () => {
    try {
      setLinks(await listLinks(false));
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    if (open) {
      void refresh();
      setHost(shortHost());
    }
  }, [open]);

  const handleCopy = async (link: ShortLink) => {
    try {
      await navigator.clipboard.writeText(shortUrl(link.slug));
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 1400);
      toast.success(t("mylinks.copied"), {
        description: shortUrl(link.slug),
      });
    } catch {
      toast.error(t("common.failed"), {
        description: t("mylinks.clipboard_blocked"),
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingLink) return;
    try {
      await removeLink(false, deletingLink.id);
      await refresh();
      toast.success(t("mylinks.deleted"), {
        description: t("mylinks.deleted.desc", { slug: deletingLink.slug }),
      });
    } catch (err: any) {
      toast.error(t("mylinks.delete_failed"), {
        description: err?.message ?? t("common.something_wrong"),
      });
    } finally {
      setDeletingLink(null);
    }
  };

  const used = links.length;
  const remaining = ANONYMOUS_LINK_LIMIT - used;

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent className="sm:max-w-lg">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t("mylinks.title")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t("mylinks.desc", { used: used.toString(), limit: ANONYMOUS_LINK_LIMIT.toString() })}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          {links.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 grid size-11 place-items-center rounded-full bg-muted">
                <Link2 className="size-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold">{t("mylinks.empty.title")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("mylinks.empty.desc")}
              </p>
            </div>
          ) : (
            <ul className="-mx-1 max-h-80 divide-y divide-border overflow-y-auto border-y border-border">
              {links.map((link) => (
                <li
                  key={link.id}
                  className="flex items-start gap-2 px-1 py-3 sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm font-semibold">
                      <span className="text-xs font-normal text-muted-foreground">
                        {host}/
                      </span>
                      {link.slug}
                    </p>
                    <a
                      href={link.destination}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground"
                    >
                      <span className="truncate">{link.destination}</span>
                      <ExternalLink className="size-3 shrink-0" />
                    </a>
                    {link.description && (
                      <p className="mt-0.5 truncate text-xs italic text-muted-foreground/70">
                        {link.description}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleCopy(link)}
                      aria-label={t("mylinks.copy")}
                      title={copiedId === link.id ? t("mylinks.copied") : t("mylinks.copy_btn")}
                    >
                      {copiedId === link.id ? <Check /> : <Copy />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditingLink(link)}
                      aria-label={t("mylinks.edit")}
                      title={t("mylinks.edit")}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeletingLink(link)}
                      aria-label={t("mylinks.delete")}
                      title={t("mylinks.delete")}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {remaining > 0 ? (
                <>{t("mylinks.remaining", { remaining: remaining.toString(), count: remaining })}</>
              ) : (
                <>{t("mylinks.limit_reached")}</>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {onSignIn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onSignIn();
                  }}
                >
                  {t("mylinks.signin")}
                  <ArrowRight />
                </Button>
              )}
              {onCreateNew && remaining > 0 && (
                <Button
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onCreateNew();
                  }}
                >
                  <Plus />
                  {t("mylinks.new")}
                </Button>
              )}
            </div>
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <EditLinkDialog
        link={editingLink}
        isAuthenticated={false}
        onOpenChange={(open) => !open && setEditingLink(null)}
        onUpdated={async () => {
          await refresh();
          setEditingLink(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingLink)}
        onOpenChange={(open) => !open && setDeletingLink(null)}
        title={t("mylinks.delete.title")}
        description={
          deletingLink ? (
            <>
              {t("mylinks.delete.desc", { slug: `${host}/${deletingLink.slug}` })}
            </>
          ) : null
        }
        confirmLabel={t("mylinks.delete.label")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  );
}
