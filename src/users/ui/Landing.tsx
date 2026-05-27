import * as React from "react";
import { Button } from "@/shared/ui/button";
import { Wordmark } from "@/shared/ui/Wordmark";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";
import { AuthDialog } from "@/auth/ui/AuthDialog";
import { CreateLinkDialog } from "@/links/ui/CreateLinkDialog";
import { LinkCreatedDialog } from "@/links/ui/LinkCreatedDialog";
import { MyLinksDialog } from "@/links/ui/MyLinksDialog";
import { UserMenu } from "@/users/ui/UserMenu";
import { Star, Link2, ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/useLanguage";

const BugReportButton = () => (
  <a
    href="https://github.com/cristhobal/relay/issues/new"
    target="_blank"
    rel="noreferrer"
    aria-label="Report a bug"
    title="Report a bug"
    className="inline-flex size-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <g fill="none" fillRule="evenodd">
        <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"/>
        <path fill="currentColor" d="M7.67 5.5A5 5 0 0 1 12 3a5 5 0 0 1 4.33 2.5L17.2 7H6.8zm-4.117.606a1 1 0 0 1 1.341.447c.147.293.5.674.973.99C6.353 7.867 6.781 8 7 8h10c.219 0 .647-.133 1.133-.457c.474-.316.826-.697.973-.99a1 1 0 1 1 1.788.894c-.353.707-1 1.326-1.652 1.76a5.5 5.5 0 0 1-.966.516A9.8 9.8 0 0 1 18.892 12H21a1 1 0 1 1 0 2h-2.012a10 10 0 0 1-.74 3.327c.572.33.963.86 1.209 1.35A5.5 5.5 0 0 1 20 21a1 1 0 1 1-2 0c0-.374-.101-.966-.332-1.428c-.13-.26-.26-.409-.385-.49c-1.056 1.486-2.539 2.54-4.283 2.835V13a1 1 0 1 0-2 0v8.917c-1.744-.295-3.227-1.35-4.283-2.834c-.126.08-.255.23-.385.49A3.5 3.5 0 0 0 6 21a1 1 0 1 1-2 0a5.5 5.5 0 0 1 .543-2.322c.246-.492.637-1.02 1.209-1.35A10 10 0 0 1 5.012 14H3a1 1 0 1 1 0-2h2.108a9.8 9.8 0 0 1 .616-2.277a5.5 5.5 0 0 1-.966-.516c-.651-.434-1.3-1.053-1.652-1.76a1 1 0 0 1 .447-1.341"/>
      </g>
    </svg>
  </a>
);
import { type AppSession } from "@/auth/infrastructure/session";
import {
  getDemoSession,
  clearDemoSession,
} from "@/auth/infrastructure/demo-session";
import { getPreferences } from "@/users/infrastructure/local-preferences";
import {
  ANONYMOUS_LINK_LIMIT,
  type ShortLink,
} from "@/links/domain/short-link";
import { countAnonymousLinks } from "@/links/infrastructure/local-link-storage";

type Props = {
  oauthConfigured?: boolean;
  /** Server-resolved OAuth session (when oauthConfigured is true). */
  session?: AppSession | null;
};

export default function Landing({
  oauthConfigured = false,
  session: initialSession = null,
}: Props) {
  const { t } = useLanguage();
  const [authOpen, setAuthOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createdLink, setCreatedLink] = React.useState<ShortLink | null>(null);
  const [myLinksOpen, setMyLinksOpen] = React.useState(false);
  const [session, setSession] = React.useState<AppSession | null>(
    initialSession,
  );
  const [displayName, setDisplayName] = React.useState<string | null>(null);
  const [anonymousCount, setAnonymousCount] = React.useState(0);

  React.useEffect(() => {
    // In demo mode, the OAuth-side session prop is null; pick up the demo
    // session from localStorage instead.
    if (!oauthConfigured && !initialSession) {
      const demo = getDemoSession();
      if (demo) setSession(demo);
    }
    // Pick up display-name override from prefs (mirrors Dashboard behaviour).
    const prefs = getPreferences();
    if (prefs.displayName) setDisplayName(prefs.displayName);
    setAnonymousCount(countAnonymousLinks());
  }, [oauthConfigured, initialSession]);

  const isLoggedIn = Boolean(session);

  const handleCreate = () => {
    if (isLoggedIn) {
      // Logged-in users manage links from the dashboard.
      window.location.href = "/dashboard";
    } else {
      setCreateOpen(true);
    }
  };

  const handleSignIn = () => setAuthOpen(true);

  const handleSignOut = async () => {
    if (oauthConfigured) {
      const { signOut } = await import("auth-astro/client");
      await signOut({ callbackUrl: "/" });
    } else {
      clearDemoSession();
      setSession(null);
    }
  };

  const handleLinkCreated = async (link: ShortLink) => {
    setCreatedLink(link);
    setAnonymousCount(countAnonymousLinks());
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-foreground text-background">
              <Link2 className="size-4" strokeWidth={2.5} />
            </span>
            <Wordmark />
            <span className="hidden rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:inline-block" data-i18n="landing.badge">
              beta
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {!isLoggedIn && (
              <Button variant="ghost" size="sm" onClick={handleSignIn}>
                {t("nav.signin")}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              asChild
              className="hidden sm:inline-flex"
            >
              <a
                href="https://github.com/cristhobal/relay"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="size-4"
                  aria-hidden
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12c0 4.65 3 8.59 7.18 9.98.53.1.72-.23.72-.5l-.01-1.96c-2.92.63-3.54-1.24-3.54-1.24-.48-1.22-1.17-1.55-1.17-1.55-.96-.65.07-.64.07-.64 1.05.07 1.61 1.08 1.61 1.08.94 1.6 2.46 1.14 3.06.87.1-.68.37-1.14.67-1.4-2.33-.27-4.78-1.16-4.78-5.18 0-1.14.41-2.08 1.08-2.81-.11-.27-.47-1.34.1-2.79 0 0 .88-.28 2.88 1.07a10.05 10.05 0 0 1 5.24 0c2-1.35 2.88-1.07 2.88-1.07.57 1.45.21 2.52.1 2.79.67.73 1.08 1.67 1.08 2.81 0 4.03-2.46 4.91-4.8 5.17.38.32.72.97.72 1.95 0 1.41-.01 2.55-.01 2.9 0 .28.19.61.73.5A10.5 10.5 0 0 0 22.5 12C22.5 6.2 17.8 1.5 12 1.5Z" />
                </svg>
              </a>
            </Button>
            <ThemeToggle />
            {!isLoggedIn && <BugReportButton />}
            {isLoggedIn && session && (
              <UserMenu
                session={session}
                displayName={displayName ?? session.user.name}
                onSignOut={handleSignOut}
              />
            )}
          </div>
        </div>
      </header>

      {/* Hero — centered */}
      <main className="flex flex-1 items-center justify-center px-4 sm:px-6">
        <div className="flex max-w-2xl flex-col items-center gap-5 text-center sm:gap-6">
          <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            {t("landing.hero.title")}
          </h1>
          <p className="text-balance text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
            {t("landing.hero.subtitle")}
          </p>

          <div className="mt-2 flex flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap">
            <Button onClick={handleCreate} size="lg">
              <Link2 />
              {isLoggedIn ? t("landing.cta.dashboard") : t("landing.cta.create")}
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a
                href="https://github.com/cristhobal/relay"
                target="_blank"
                rel="noreferrer"
                aria-label="Star relay on GitHub"
              >
                <Star />
                {t("landing.cta.star")}
              </a>
            </Button>
          </div>

          {!isLoggedIn && anonymousCount > 0 && (
            <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
              <p className="text-balance" data-i18n="landing.anonymous.used" data-i18n-vars={JSON.stringify({count: anonymousCount, limit: ANONYMOUS_LINK_LIMIT})}>
                {anonymousCount} of {ANONYMOUS_LINK_LIMIT} free links used.{" "}
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  {t("nav.signin")}
                </button>{" "}
                <span>{t("landing.anonymous.unlimited")}</span>
              </p>
              <button
                type="button"
                onClick={() => setMyLinksOpen(true)}
                className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
                data-i18n="landing.anonymous.links"
              >
                Click here to see all your links
                <ArrowRight className="size-3" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        className="mt-12 sm:mt-16 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-4 pb-6 sm:pb-8"
        role="contentinfo"
      >
        <div className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-xs sm:text-sm text-muted-foreground">
            <p className="tracking-tight font-medium">
              {t("landing.footer.tagline")}
            </p>
            <a
              href="https://www.cristhobal.cl/"
              target="_blank"
              className="opacity-60"
            >
              <span>{t("landing.footer.copyright", { year: new Date().getFullYear() })}</span>
            </a>
          </div>
        </div>
      </footer>

      <CreateLinkDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleLinkCreated}
        isAuthenticated={isLoggedIn}
        onRequestSignIn={handleSignIn}
      />

      <LinkCreatedDialog
        link={createdLink}
        onOpenChange={(open) => !open && setCreatedLink(null)}
        onCreateAnother={() => {
          setCreatedLink(null);
          setCreateOpen(true);
        }}
      />

      <MyLinksDialog
        open={myLinksOpen}
        onOpenChange={(open) => {
          setMyLinksOpen(open);
          // Refresh counter when dialog closes (user may have deleted links)
          if (!open) setAnonymousCount(countAnonymousLinks());
        }}
        onCreateNew={() => setCreateOpen(true)}
        onSignIn={handleSignIn}
      />

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        oauthConfigured={oauthConfigured}
      />
    </div>
  );
}
