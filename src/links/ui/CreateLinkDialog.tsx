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
  const [destination, setDestination] = React.useState("");
  const [slug, setSlug] = React.useState(() => randomSlug());
  const [description, setDescription] = React.useState("");
  const [errors, setErrors] = React.useState<{
    destination?: string;
    slug?: string;
    submit?: string;
  }>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [host, setHost] = React.useState("relay.vercel.app");
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
    if (!destination) next.destination = "Required";
    else if (!isValidUrl(destination))
      next.destination = "Must start with http:// or https://";
    if (!slug) next.slug = "Required";
    else if (!isValidSlug(slug))
      next.slug = "3–40 chars: letters, numbers, _ or -";
    else if (await slugTaken(isAuthenticated, slug))
      next.slug = "Already taken — try a different slug";
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
      const msg = err?.message ?? "Failed to create link";
      // Map server error to slug field — the Sonner explains why, the red border shows where
      setErrors({ slug: msg });
      toast.error("Failed to create link", { description: msg });
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
              You&rsquo;ve reached the free limit
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              You&rsquo;ve created {ANONYMOUS_LINK_LIMIT} short links without
              signing in. Sign in to create unlimited links and keep them
              synced.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <ResponsiveDialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                onRequestSignIn?.();
              }}
            >
              Sign in
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
          <ResponsiveDialogTitle>New short link</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Paste a destination URL, pick a slug, and optionally add a
            description.
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
              Destination URL
            </Label>
            <Input
              id="destination"
              type="url"
              placeholder="https://example.com/long/path"
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
                Short link
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setSlug(randomSlug())}
              >
                <Shuffle />
                Randomize
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
              Description{" "}
              <span className="text-xs font-normal text-muted-foreground">
                Optional
              </span>
            </Label>
            <Textarea
              id="description"
              placeholder="What's this link for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              className="resize-none"
              rows={2}
            />
          </div>

          {remaining !== null && (
            <p className="text-xs text-muted-foreground">
              {remaining} of {ANONYMOUS_LINK_LIMIT} free links remaining.{" "}
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onRequestSignIn?.();
                }}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </button>{" "}
              for unlimited.
            </p>
          )}
        </div>

        <ResponsiveDialogFooter className="pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? "Creating…" : "Create link"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
