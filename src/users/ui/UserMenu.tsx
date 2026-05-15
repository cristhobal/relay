import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { ArrowUpRight, HelpCircle, LogOut, Settings, User } from "lucide-react";

const BugIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <g fill="none" fillRule="evenodd">
      <path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"/>
      <path fill="currentColor" d="M7.67 5.5A5 5 0 0 1 12 3a5 5 0 0 1 4.33 2.5L17.2 7H6.8zm-4.117.606a1 1 0 0 1 1.341.447c.147.293.5.674.973.99C6.353 7.867 6.781 8 7 8h10c.219 0 .647-.133 1.133-.457c.474-.316.826-.697.973-.99a1 1 0 1 1 1.788.894c-.353.707-1 1.326-1.652 1.76a5.5 5.5 0 0 1-.966.516A9.8 9.8 0 0 1 18.892 12H21a1 1 0 1 1 0 2h-2.012a10 10 0 0 1-.74 3.327c.572.33.963.86 1.209 1.35A5.5 5.5 0 0 1 20 21a1 1 0 1 1-2 0c0-.374-.101-.966-.332-1.428c-.13-.26-.26-.409-.385-.49c-1.056 1.486-2.539 2.54-4.283 2.835V13a1 1 0 1 0-2 0v8.917c-1.744-.295-3.227-1.35-4.283-2.834c-.126.08-.255.23-.385.49A3.5 3.5 0 0 0 6 21a1 1 0 1 1-2 0a5.5 5.5 0 0 1 .543-2.322c.246-.492.637-1.02 1.209-1.35A10 10 0 0 1 5.012 14H3a1 1 0 1 1 0-2h2.108a9.8 9.8 0 0 1 .616-2.277a5.5 5.5 0 0 1-.966-.516c-.651-.434-1.3-1.053-1.652-1.76a1 1 0 0 1 .447-1.341"/>
    </g>
  </svg>
);
import { type AppSession, initials } from "@/auth/infrastructure/session";

type Props = {
  session: AppSession;
  /** Display name shown in the menu. Falls back to session.user.name. */
  displayName?: string;
  /** Where the "Dashboard" entry should link to. Defaults to /dashboard. */
  dashboardHref?: string;
  /**
   * Called when the user picks "Configuration".
   *
   * If omitted, the menu item renders as a link to
   * `${dashboardHref}?tab=configuration` — useful when this menu is shown
   * outside the dashboard (e.g. on the homepage).
   */
  onConfiguration?: () => void;
  /** Sign-out handler. Required. */
  onSignOut: () => void;
};

/**
 * The avatar + dropdown shown on the dashboard header.
 *
 * Shared between Dashboard and Landing so both surfaces show the same menu
 * when the user is signed in.
 *
 * The keyboard shortcuts shown next to "Dashboard" and "Configuration" are
 * wired up globally by `ShortcutsIsland` in the Layout, so they fire from any
 * page on the site even when this menu is closed.
 */
export function UserMenu({
  session,
  displayName,
  dashboardHref = "/dashboard",
  onConfiguration,
  onSignOut,
}: Props) {
  const name = displayName ?? session.user.name;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="ml-1 rounded-full ring-offset-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Account menu"
        >
          <Avatar className="size-8">
            {session.user.image && (
              <AvatarImage
                src={session.user.image}
                alt={name}
                referrerPolicy="no-referrer"
              />
            )}
            <AvatarFallback className="bg-foreground text-[11px] font-medium text-background">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-0">
        <div className="flex items-center gap-3 p-3">
          <Avatar className="size-10">
            {session.user.image && (
              <AvatarImage
                src={session.user.image}
                alt={name}
                referrerPolicy="no-referrer"
              />
            )}
            <AvatarFallback className="bg-foreground text-[12px] font-medium text-background">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {session.user.email}
            </p>
          </div>
        </div>
        <DropdownMenuSeparator className="my-0" />

        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem asChild>
            <a href={dashboardHref}>
              <User />
              Dashboard
              <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </a>
          </DropdownMenuItem>
          {onConfiguration ? (
            <DropdownMenuItem onClick={onConfiguration}>
              <Settings />
              Configuration
              <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild>
              <a href={`${dashboardHref}?tab=configuration`}>
                <Settings />
                Configuration
                <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
              </a>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-0" />

        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem asChild>
            <a
              href="https://github.com/cristhobal/relay"
              target="_blank"
              rel="noreferrer"
            >
              <HelpCircle />
              Help &amp; docs
              <ArrowUpRight className="ml-auto size-3 opacity-60" />
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href="https://github.com/cristhobal/relay/issues/new"
              target="_blank"
              rel="noreferrer"
            >
              <BugIcon />
              Report a Bug
              <ArrowUpRight className="ml-auto size-3 opacity-60" />
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-0" />

        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem variant="destructive" onClick={onSignOut}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
