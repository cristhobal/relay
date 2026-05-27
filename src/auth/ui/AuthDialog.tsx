import * as React from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/shared/ui/responsive-dialog";
import { Button } from "@/shared/ui/button";
import { type AuthProvider } from "@/auth/infrastructure/session";
import { setDemoSession } from "@/auth/infrastructure/demo-session";
import { useLanguage } from "@/i18n/useLanguage";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Where to redirect after successful sign-in. Defaults to /dashboard */
  redirectTo?: string;
  /** True when GOOGLE_/GITHUB_/DISCORD_ env vars are set on the server.
   * If false, falls back to a localStorage-backed demo sign-in. */
  oauthConfigured?: boolean;
};

/* -------------------------------------------------------------------------- */
/* Popup OAuth helper                                                          */
/* -------------------------------------------------------------------------- */

const POPUP_CALLBACK_PATH = "/auth/popup-callback";
const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 650;
const SUCCESS_MESSAGE_TYPE = "relay:auth-success";

/**
 * Auth.js exposes /api/auth/csrf which returns `{ csrfToken: string }`.
 * The token must be POSTed to /api/auth/signin/{provider} along with
 * callbackUrl to start the OAuth flow.
 */
async function fetchCsrfToken(): Promise<string> {
  const res = await fetch("/api/auth/csrf", { credentials: "same-origin" });
  if (!res.ok) throw new Error(`csrf fetch failed: ${res.status}`);
  const data = (await res.json()) as { csrfToken?: string };
  if (!data.csrfToken) throw new Error("csrf token missing in response");
  return data.csrfToken;
}

/** Center a popup window relative to the screen. */
function popupFeatures(): string {
  const screenLeft = window.screenLeft ?? window.screenX ?? 0;
  const screenTop = window.screenTop ?? window.screenY ?? 0;
  const screenW =
    window.innerWidth || document.documentElement.clientWidth || screen.width;
  const screenH =
    window.innerHeight ||
    document.documentElement.clientHeight ||
    screen.height;

  const left = Math.max(0, screenLeft + (screenW - POPUP_WIDTH) / 2);
  const top = Math.max(0, screenTop + (screenH - POPUP_HEIGHT) / 2);

  return [
    "popup=yes",
    "noopener=no", // keep window.opener available for postMessage
    `width=${POPUP_WIDTH}`,
    `height=${POPUP_HEIGHT}`,
    `left=${Math.round(left)}`,
    `top=${Math.round(top)}`,
  ].join(",");
}

class PopupBlockedError extends Error {
  constructor() {
    super("popup_blocked");
    this.name = "PopupBlockedError";
  }
}
class PopupCancelledError extends Error {
  constructor() {
    super("popup_cancelled");
    this.name = "PopupCancelledError";
  }
}

/**
 * Open an OAuth flow inside a popup window.
 *
 * Resolves on success (the popup posts a `relay:auth-success` message, then
 * closes itself). Rejects with PopupBlockedError if the browser refused to
 * open the popup, or PopupCancelledError if the user closed it manually.
 */
async function signInWithPopup(provider: AuthProvider, t: (key: string, vars?: Record<string, string | number>) => string): Promise<void> {
  // 1. Open the popup synchronously from the user-gesture handler — browsers
  //    only allow `window.open` from a direct user action, so opening before
  //    we await anything is critical.
  const popupName = `relay-oauth-${Date.now()}`;
  const popup = window.open("about:blank", popupName, popupFeatures());
  if (!popup) throw new PopupBlockedError();

  // Show a tiny "loading" placeholder while we fetch CSRF + submit.
  try {
    popup.document.title = t("auth.popup.signingin");
    popup.document.body.style.cssText =
      "margin:0;display:grid;place-items:center;height:100vh;font-family:system-ui;color:#888;background:#fff";
    popup.document.body.innerHTML = "<p>" + t("auth.popup.signingin") + "</p>";
  } catch {
    // about:blank in some browsers won't allow scripting until navigation;
    // ignore failures — they're cosmetic.
  }

  // 2. Get CSRF token, then submit a form into the popup window.
  let csrfToken: string;
  try {
    csrfToken = await fetchCsrfToken();
  } catch (err) {
    try {
      popup.close();
    } catch {
      /* noop */
    }
    throw err;
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = `/api/auth/signin/${provider}`;
  form.target = popupName;
  form.style.display = "none";

  const addInput = (name: string, value: string) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  };
  addInput("csrfToken", csrfToken);
  addInput("callbackUrl", POPUP_CALLBACK_PATH);

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);

  // 3. Wait for either the success message from popup-callback.astro,
  //    or for the popup to be closed by the user (cancellation).
  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      settled = true;
      window.removeEventListener("message", onMessage);
      window.clearInterval(closedInterval);
    };

    const onMessage = (event: MessageEvent) => {
      // Only trust messages from our own origin.
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string } | null;
      if (!data || data.type !== SUCCESS_MESSAGE_TYPE) return;

      cleanup();
      try {
        popup.close();
      } catch {
        /* noop */
      }
      resolve();
    };

    const closedInterval = window.setInterval(() => {
      if (settled) return;
      if (popup.closed) {
        cleanup();
        reject(new PopupCancelledError());
      }
    }, 400);

    window.addEventListener("message", onMessage);
  });
}

/* -------------------------------------------------------------------------- */
/* Provider glyphs                                                             */
/* -------------------------------------------------------------------------- */

function GoogleGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.83Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function GithubGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 fill-current"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12c0 4.65 3 8.59 7.18 9.98.53.1.72-.23.72-.5l-.01-1.96c-2.92.63-3.54-1.24-3.54-1.24-.48-1.22-1.17-1.55-1.17-1.55-.96-.65.07-.64.07-.64 1.05.07 1.61 1.08 1.61 1.08.94 1.6 2.46 1.14 3.06.87.1-.68.37-1.14.67-1.4-2.33-.27-4.78-1.16-4.78-5.18 0-1.14.41-2.08 1.08-2.81-.11-.27-.47-1.34.1-2.79 0 0 .88-.28 2.88 1.07a10.05 10.05 0 0 1 5.24 0c2-1.35 2.88-1.07 2.88-1.07.57 1.45.21 2.52.1 2.79.67.73 1.08 1.67 1.08 2.81 0 4.03-2.46 4.91-4.8 5.17.38.32.72.97.72 1.95 0 1.41-.01 2.55-.01 2.9 0 .28.19.61.73.5A10.5 10.5 0 0 0 22.5 12C22.5 6.2 17.8 1.5 12 1.5Z" />
    </svg>
  );
}

function DiscordGlyph() {
  return (
    <svg
      viewBox="0 0 256 199"
      preserveAspectRatio="xMidYMid"
      className="size-4"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M216.856 16.597A208.502 208.502 0 0 0 164.042 0c-2.275 4.113-4.933 9.645-6.766 14.046-19.692-2.961-39.203-2.961-58.533 0-1.832-4.4-4.55-9.933-6.846-14.046a207.809 207.809 0 0 0-52.855 16.638C5.618 67.147-3.443 116.4 1.087 164.956c22.169 16.555 43.653 26.612 64.775 33.193A161.094 161.094 0 0 0 79.735 175.3a136.413 136.413 0 0 1-21.846-10.632 108.636 108.636 0 0 0 5.356-4.237c42.122 19.702 87.89 19.702 129.51 0a131.66 131.66 0 0 0 5.355 4.237 136.07 136.07 0 0 1-21.886 10.653c4.006 8.02 8.638 15.67 13.873 22.848 21.142-6.58 42.646-16.637 64.815-33.213 5.316-56.288-9.08-105.09-38.056-148.36ZM85.474 135.095c-12.645 0-23.015-11.805-23.015-26.18s10.149-26.2 23.015-26.2c12.867 0 23.236 11.804 23.015 26.2.02 14.375-10.148 26.18-23.015 26.18Zm85.051 0c-12.645 0-23.014-11.805-23.014-26.18s10.148-26.2 23.014-26.2c12.867 0 23.236 11.804 23.015 26.2 0 14.375-10.148 26.18-23.015 26.18Z"
        fill="#5865F2"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                   */
/* -------------------------------------------------------------------------- */

export function AuthDialog({
  open,
  onOpenChange,
  redirectTo = "/dashboard",
  oauthConfigured = false,
}: Props) {
  const { t } = useLanguage();
  const [pending, setPending] = React.useState<AuthProvider | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Reset transient state when the dialog closes.
  React.useEffect(() => {
    if (!open) {
      setPending(null);
      setError(null);
    }
  }, [open]);

  const handleSignIn = async (provider: AuthProvider) => {
    setPending(provider);
    setError(null);

    // Demo flow: no provider involved, no popup needed.
    if (!oauthConfigured) {
      await new Promise((r) => setTimeout(r, 400));
      setDemoSession(provider);
      window.location.href = redirectTo;
      return;
    }

    // Mobile: popups behave like new tabs and disrupt the flow. Use the
    // standard full-page redirect instead — same behavior as before.
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    if (isMobile) {
      const { signIn } = await import("auth-astro/client");
      // @ts-expect-error — auth-astro types don't list callbackUrl but the
      // underlying signIn does forward it.
      await signIn(provider, { callbackUrl: redirectTo });
      return;
    }

    // Desktop: try the popup flow. Fall back to a full redirect if blocked.
    try {
      await signInWithPopup(provider, t);
      // Cookie is now set on our origin. Navigate to the post-auth target —
      // a hard navigation makes sure the server-rendered page picks up the
      // new session.
      window.location.href = redirectTo;
    } catch (err) {
      if (err instanceof PopupCancelledError) {
        // User closed the popup. Just reset the UI.
        setPending(null);
        return;
      }

      console.error("[relay] popup sign-in failed, falling back:", err);

      if (err instanceof PopupBlockedError) {
        // Browser blocked the popup. Inform the user and offer a retry that
        // uses the full-page redirect.
        setPending(null);
        setError(t("auth.signin.popup_blocked"));
      }

      const { signIn } = await import("auth-astro/client");
      // @ts-expect-error — see note above.
      await signIn(provider, { callbackUrl: redirectTo });
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t("auth.signin.title")}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t("auth.signin.desc")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="grid gap-2 pt-1">
          <Button
            variant="outline"
            onClick={() => handleSignIn("google")}
            disabled={pending !== null}
            aria-busy={pending === "google"}
            className="relative"
          >
            <span className={pending === "google" ? "invisible" : undefined}>
              <GoogleGlyph />
            </span>
            <span className={pending === "google" ? "invisible" : undefined}>
              {t("auth.signin.google")}
            </span>
            {pending === "google" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="size-3.5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => handleSignIn("github")}
            disabled={pending !== null}
            aria-busy={pending === "github"}
            className="relative"
          >
            <span className={pending === "github" ? "invisible" : undefined}>
              <GithubGlyph />
            </span>
            <span className={pending === "github" ? "invisible" : undefined}>
              {t("auth.signin.github")}
            </span>
            {pending === "github" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="size-3.5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => handleSignIn("discord")}
            disabled={pending !== null}
            aria-busy={pending === "discord"}
            className="relative"
          >
            <span className={pending === "discord" ? "invisible" : undefined}>
              <DiscordGlyph />
            </span>
            <span className={pending === "discord" ? "invisible" : undefined}>
              {t("auth.signin.discord")}
            </span>
            {pending === "discord" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="size-3.5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
              </span>
            )}
          </Button>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        {!oauthConfigured && (
          <p className="text-xs text-muted-foreground">
            {t("auth.signin.demo")}
          </p>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
