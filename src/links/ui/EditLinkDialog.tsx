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
    if (!destination) next.destination = "Required";
    else if (!isValidUrl(destination))
      next.destination = "Must start with http:// or https://";
    if (!slug) next.slug = "Required";
    else if (!isValidSlug(slug))
      next.slug = "3–40 chars: letters, numbers, _ or -";
    else if (await slugTaken(isAuthenticated, slug, link.id))
      next.slug = "Already taken";
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
      toast.success("Link updated", {
        description: slugChanged
          ? `Now available at /${slug}`
          : "Your changes have been saved.",
      });
      onUpdated?.(updated);
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.message ?? "Failed to update link";
      setErrors({ submit: msg });
      toast.error("Failed to update link", { description: msg });
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
            <ResponsiveDialogTitle>Edit short link</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Update the destination, slug or description.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="grid gap-5 pt-1">
            <div className="grid gap-2">
              <Label htmlFor="edit-destination" className="text-sm font-medium">
                Destination URL
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
                Short link
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
                    Changing the slug will break links you&rsquo;ve already
                    shared. The old URL will stop working immediately.
                  </p>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description" className="text-sm font-medium">
                Description{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  Optional
                </span>
              </Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                placeholder="What's this link for?"
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
              Cancel
            </Button>
            <Button
              onClick={handleSaveClick}
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? "Saving…" : "Save changes"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Change the short link?"
        description={
          <>
            You&rsquo;re about to rename{" "}
            <span className="font-mono text-foreground">
              {host}/{link.slug}
            </span>{" "}
            to{" "}
            <span className="font-mono text-foreground">
              {host}/{slug}
            </span>
            . The old link will stop working immediately.
          </>
        }
        confirmLabel="Yes, change it"
        variant="destructive"
        onConfirm={doSave}
      />
    </>
  );
}
