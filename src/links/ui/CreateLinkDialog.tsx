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
import {
  type ShortLink,
  ANONYMOUS_LINK_LIMIT,
  randomSlug,
  isValidUrl,
  isValidSlug,
} from "@/links/domain/short-link";
import {
  canCreateAnonymousLink,
  countAnonymousLinks,
} from "@/links/infrastructure/local-link-storage";
import { createLink, slugTaken } from "@/links/application/link-service";
import { useLanguage } from "@/i18n/useLanguage"
import { shortHost } from "@/shared/utils/short-url";
import { Shuffle, Lock, ArrowRight } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (link: ShortLink) => void;
  isAuthenticated: boolean;
  onRequestSignIn?: () => void;
};

export function CreateLinkDialog({
  open,
  onOpenChange,
  onCreated,
  isAuthenticated,
  onRequestSignIn,
}: Props) {
  const { t } = useLanguage()
  const [destination, setDestination] = React.useState("");
  const [slug, setSlug] = React.useState(() => randomSlug());
  const [description, setDescription] = React.useState("");
  const [errors, setErrors] = React.useState<{
    destination?: string;
    slug?: string;
    submit?: string;
  }>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [host, setHost] = React.useState("withrelay.vercel.app");
  const [anonymousCount, setAnonymousCount] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setDestination("");
      setSlug(randomSlug());
      setDescription("");
      setErrors({});
      setHost(shortHost());
      setAnonymousCount(countAnonymousLinks());
    }
  }, [open]);

  const limitReached = !isAuthenticated && !canCreateAnonymousLink();

  const validate = async (): Promise<boolean> => {
    const next: typeof errors = {};
    if (!destination) next.destination = t("create.error.required");
    else if (!isValidUrl(destination))
      next.destination = t("create.error.invalid_url");
    if (!slug) next.slug = t("create.error.required");
    else if (!isValidSlug(slug))
      next.slug = t("create.error.invalid_slug");
    else if (await slugTaken(isAuthenticated, slug))
      next.slug = t("create.error.taken");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!(await validate())) return;
    setSubmitting(true);
    try {
      const link = await createLink(isAuthenticated, {
        destination,
        slug,
        description,
      });
      onCreated?.(link);
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.message ?? t("create.error.failed");
      // Map server error to slug field — the Sonner explains why, the red border shows where
      setErrors({ slug: msg });
      toast.error(t("create.error.failed"), { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (limitReached) {
    return (
      <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <div className="mb-3 grid size-11 place-items-center rounded-full bg-muted">
              <Lock className="size-4" />
            </div>
            <ResponsiveDialogTitle>
              {t("create.limit.title")}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {t("create.limit.desc", { limit: ANONYMOUS_LINK_LIMIT })}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                onRequestSignIn?.();
              }}
            >
              {t("create.limit.signin")}
              <ArrowRight />
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    );
  }

  const remaining = isAuthenticated
    ? null
    : ANONYMOUS_LINK_LIMIT - anonymousCount;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("create.title")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("create.desc")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="grid gap-5 pt-1">
          <div className="grid gap-2">
              <Label
                htmlFor="destination"
                className={
                  errors.destination
                    ? "text-sm font-medium text-destructive"
                    : "text-sm font-medium"
                }
              >
                {t("create.label.destination")}
              </Label>
              <Input
                id="destination"
                type="url"
                placeholder={t("create.placeholder.destination")}
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setErrors((prev) => ({ ...prev, destination: undefined }));
              }}
              aria-invalid={Boolean(errors.destination)}
              className={
                errors.destination
                  ? "border-destructive focus-visible:ring-destructive/30"
                  : ""
              }
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="slug"
                className={
                  errors.slug
                    ? "text-sm font-medium text-destructive"
                    : "text-sm font-medium"
                }
              >
                {t("create.label.slug")}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setSlug(randomSlug())}
              >
                <Shuffle />
                {t("create.slug.randomize")}
              </Button>
            </div>
            <div
              className={
                "flex items-center overflow-hidden rounded-md border bg-background shadow-xs transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30 " +
                (errors.slug
                  ? "border-destructive focus-within:ring-destructive/30"
                  : "border-input")
              }
            >
              <span className="flex h-10 items-center border-r border-input bg-muted px-3 text-sm text-muted-foreground select-none">
                {host}/
              </span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setErrors((prev) => ({ ...prev, slug: undefined }));
                }}
                placeholder="my-link"
                aria-invalid={Boolean(errors.slug)}
                className="h-10 flex-1 bg-transparent px-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description" className="text-sm font-medium">
              {t("create.label.description")}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {t("common.optional")}
              </span>
            </Label>
            <Textarea
              id="description"
              placeholder={t("create.placeholder.description")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              className="resize-none"
              rows={2}
            />
          </div>

          {remaining !== null && (
            <p className="text-xs text-muted-foreground">
              {t("create.remaining", { remaining: remaining.toString(), limit: ANONYMOUS_LINK_LIMIT.toString() })}{" "}
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onRequestSignIn?.();
                }}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {t("create.remaining.signin")}
              </button>{" "}
              {t("create.remaining.unlimited")}
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
            onClick={handleSubmit}
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? t("create.creating") : t("create.submit")}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
