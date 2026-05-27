import * as React from "react";
import { toast } from "sonner";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/shared/ui/responsive-dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { ConfirmDialog } from "@/links/ui/ConfirmDialog";
import {
  type ShortLink,
  isValidSlug,
  isValidUrl,
} from "@/links/domain/short-link";
import { useLanguage } from "@/i18n/useLanguage"
import { slugTaken, updateLink } from "@/links/application/link-service";
import { shortHost } from "@/shared/utils/short-url";
import { AlertTriangle } from "lucide-react";

type Props = {
  link: ShortLink | null;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (link: ShortLink) => void;
  isAuthenticated: boolean;
};

export function EditLinkDialog({
  link,
  onOpenChange,
  onUpdated,
  isAuthenticated,
}: Props) {
  const { t } = useLanguage()
  const [destination, setDestination] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [errors, setErrors] = React.useState<{
    destination?: string;
    slug?: string;
    submit?: string;
  }>({});
  const [host, setHost] = React.useState("withrelay.vercel.app");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const open = Boolean(link);

  React.useEffect(() => {
    if (link) {
      setDestination(link.destination);
      setSlug(link.slug);
      setDescription(link.description ?? "");
      setErrors({});
      setHost(shortHost());
    }
  }, [link]);

  const slugChanged = link ? slug !== link.slug : false;

  const validate = async (): Promise<boolean> => {
    if (!link) return false;
    const next: typeof errors = {};
    if (!destination) next.destination = t("edit.error.required");
    else if (!isValidUrl(destination))
      next.destination = t("edit.error.invalid_url");
    if (!slug) next.slug = t("edit.error.required");
    else if (!isValidSlug(slug))
      next.slug = t("edit.error.invalid_slug");
    else if (await slugTaken(isAuthenticated, slug, link.id))
      next.slug = t("edit.error.taken");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSaveClick = async () => {
    if (!(await validate())) return;
    if (slugChanged) {
      setConfirmOpen(true);
    } else {
      void doSave();
    }
  };

  const doSave = async () => {
    if (!link) return;
    setSubmitting(true);
    try {
      const updated = await updateLink(isAuthenticated, link.id, {
        destination,
        slug,
        description,
      });
      toast.success(t("edit.success"), {
        description: slugChanged
          ? t("edit.success.slug_changed", { slug })
          : t("edit.success.saved"),
      });
      onUpdated?.(updated);
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.message ?? t("edit.error.failed");
      setErrors({ submit: msg });
      toast.error(t("edit.error.failed"), { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (!link) return null;

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t("edit.title")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t("edit.desc")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="grid gap-5 pt-1">
            <div className="grid gap-2">
              <Label htmlFor="edit-destination" className="text-sm font-medium">
                {t("edit.label.destination")}
              </Label>
              <Input
                id="edit-destination"
                type="url"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                aria-invalid={Boolean(errors.destination)}
                className={errors.destination ? "border-destructive" : ""}
              />
              {errors.destination && (
                <p className="text-xs font-medium text-destructive">
                  {errors.destination}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-slug" className="text-sm font-medium">
                {t("edit.label.slug")}
              </Label>
              <div
                className={
                  "flex items-center overflow-hidden rounded-md border bg-background shadow-xs transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 " +
                  (errors.slug ? "border-destructive" : "border-input")
                }
              >
                <span className="flex h-10 items-center border-r border-input bg-muted px-3 text-sm text-muted-foreground select-none">
                  {host}/
                </span>
                <input
                  id="edit-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  aria-invalid={Boolean(errors.slug)}
                  className="h-10 flex-1 bg-transparent px-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none"
                />
              </div>
              {errors.slug && (
                <p className="text-xs font-medium text-destructive">
                  {errors.slug}
                </p>
              )}
              {slugChanged && !errors.slug && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/30">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-500" />
                  <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                    {t("edit.warning.slug_changed")}
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description" className="text-sm font-medium">
                {t("edit.label.description")}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {t("common.optional")}
                </span>
              </Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                placeholder={t("edit.placeholder.description")}
                className="resize-none"
                rows={2}
              />
            </div>

            {errors.submit && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {errors.submit}
              </p>
            )}
          </div>

          <ResponsiveDialogFooter className="pt-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSaveClick}
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? t("edit.saving") : t("edit.submit")}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("edit.confirm.title")}
        description={
          <>
            {t("edit.confirm.desc", { oldSlug: `${host}/${link.slug}`, newSlug: `${host}/${slug}` })}
          </>
        }
        confirmLabel={t("edit.confirm.confirm")}
        variant="destructive"
        onConfirm={doSave}
      />
    </>
  );
}
