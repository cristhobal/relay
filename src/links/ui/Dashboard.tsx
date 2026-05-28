import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Wordmark } from "@/shared/ui/Wordmark";
import { ThemeToggle } from "@/shared/ui/ThemeToggle";
import { CreateLinkDialog } from "@/links/ui/CreateLinkDialog";
import { LinkCreatedDialog } from "@/links/ui/LinkCreatedDialog";
import { ConfirmDialog } from "@/links/ui/ConfirmDialog";
import { EditLinkDialog } from "@/links/ui/EditLinkDialog";
import { UserMenu } from "@/users/ui/UserMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import {
  Plus,
  Copy,
  Trash2,
  Check,
  LogOut,
  ExternalLink,
  ArrowUpRight,
  Link2,
  Pencil,
  Search,
  ListFilter,
  X,
  Inbox,
  MoreVertical,
  Unlink,
  ShieldCheck,
  User,
  Globe,
  Lock,
} from "lucide-react";
import { type AppSession, initials } from "@/auth/infrastructure/session";
import {
  getDemoSession,
  clearDemoSession,
} from "@/auth/infrastructure/demo-session";
import {
  getPreferences,
  savePreferences,
  type Preferences,
} from "@/users/infrastructure/local-preferences";
import { type ShortLink } from "@/links/domain/short-link";
import {
  listLinks,
  removeLink,
  migrateLocalLinksToAccount,
} from "@/links/application/link-service";
import { listLocalLinks } from "@/links/infrastructure/local-link-storage";
import { shortHost, shortUrl } from "@/shared/utils/short-url";
import { fullDate, timeAgo } from "@/shared/utils/time";
import { useLanguage, LangProvider } from "@/i18n/useLanguage"
import { type Lang } from "@/i18n/translations"
import { cn } from "@/shared/utils/utils";

type Tab = "links" | "configuration";
type SortMode = "newest" | "oldest" | "most-clicks" | "alpha";

type Props = {
  session: AppSession | null;
  oauthConfigured: boolean;
  /**
   * Language resolved on the server (via Accept-Language / cookie). Seeds
   * the LangProvider so SSR and the first client render agree — without
   * it, useLanguage's initial state would diverge from the SSR'd HTML and
   * React would re-render the whole tree, flashing English before settling
   * on the user's language.
   */
  initialLang?: Lang;
};

export default function Dashboard(props: Props) {
  return (
    <LangProvider initialLang={props.initialLang}>
      <DashboardInner {...props} />
    </LangProvider>
  );
}

function DashboardInner({
  session: initialSession,
  oauthConfigured,
}: Props) {
  const { t } = useLanguage()
  const [session, setSession] = React.useState<AppSession | null>(
    initialSession,
  );
  const [prefs, setPrefs] = React.useState<Preferences>({});
  const [tab, setTab] = React.useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tab") === "configuration") return "configuration";
    }
    return "links";
  });
  const [links, setLinks] = React.useState<ShortLink[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createdLink, setCreatedLink] = React.useState<ShortLink | null>(null);
  const [editingLink, setEditingLink] = React.useState<ShortLink | null>(null);
  const [deletingLink, setDeletingLink] = React.useState<ShortLink | null>(
    null,
  );
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const isAuthenticated = oauthConfigured && Boolean(initialSession);

  // Listen for the global ⌘, shortcut dispatched by ShortcutsIsland.
  // This way, pressing ⌘, while already on /dashboard switches to the
  // Configuration tab without a full page reload.
  React.useEffect(() => {
    const open = () => setTab("configuration");
    window.addEventListener("relay:open-configuration", open);
    return () => window.removeEventListener("relay:open-configuration", open);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      if (!oauthConfigured && !initialSession) {
        const demo = getDemoSession();
        if (!demo) {
          window.location.href = "/";
          return;
        }
        setSession(demo);
      }
      setPrefs(getPreferences());

      if (isAuthenticated && listLocalLinks().length > 0) {
        try {
          const result = await migrateLocalLinksToAccount();
          if (result.inserted > 0 && !cancelled) {
            toast.info(
              t("dashboard.migrated", { count: result.inserted.toString() }),
              {
                description: t("dashboard.migrated.desc"),
              },
            );
          }
        } catch (err) {
          console.error("[relay] migration failed:", err);
        }
      }

      try {
        const list = await listLinks(isAuthenticated);
        if (!cancelled) setLinks(list);
      } catch (err) {
        console.error("[relay] failed to load links:", err);
        toast.error(t("dashboard.load_error"), {
          description: t("dashboard.load_error.desc"),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, [oauthConfigured, initialSession, isAuthenticated]);

  const refresh = React.useCallback(async () => {
    try {
      setLinks(await listLinks(isAuthenticated));
    } catch (err) {
      console.error("[relay] refresh failed:", err);
    }
  }, [isAuthenticated]);

  const handleCopy = async (link: ShortLink) => {
    try {
      await navigator.clipboard.writeText(shortUrl(link.slug));
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 1400);
      toast.success(t("dashboard.copied"), {
        description: shortUrl(link.slug),
      });
    } catch {
      toast.error(t("common.failed"), {
        description: t("dashboard.clipboard_blocked"),
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingLink) return;
    const linkToDelete = deletingLink;
    setDeletingLink(null);
    // Optimistic: remove immediately from UI
    setLinks((prev) => prev.filter((l) => l.id !== linkToDelete.id));
    try {
      await removeLink(isAuthenticated, linkToDelete.id);
      toast.success(t("dashboard.link_deleted"), {
        description: t("dashboard.link_deleted.desc", { slug: linkToDelete.slug }),
      });
    } catch (err: any) {
      // Revert on failure
      setLinks((prev) =>
        [linkToDelete, ...prev].sort((a, b) => b.createdAt - a.createdAt),
      );
      toast.error(t("dashboard.delete_error"), {
        description: err?.message ?? t("common.something_wrong"),
      });
    }
  };

  const handleSignOut = async () => {
    if (oauthConfigured) {
      const { signOut } = await import("auth-astro/client");
      void signOut({ callbackUrl: "/" });
    } else {
      clearDemoSession();
      window.location.href = "/";
    }
  };

  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        <span className="size-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  }

  const displayName = prefs.displayName || session.user.name;

  return (
    <div className="flex min-h-screen w-full flex-col pt-14">
      <DashboardHeader
        session={session}
        displayName={displayName}
        onConfiguration={() => setTab("configuration")}
        onSignOut={handleSignOut}
      />

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="mx-auto flex max-w-6xl gap-6 px-5" role="tablist">
          <TabButton active={tab === "links"} onClick={() => setTab("links")}>
            <span>{t("dashboard.tab.links")}</span>
          </TabButton>
          <TabButton
            active={tab === "configuration"}
            onClick={() => setTab("configuration")}
          >
            <span>{t("dashboard.tab.config")}</span>
          </TabButton>
        </nav>
      </div>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl">
          {tab === "links" ? (
            <LinksTab
              loading={loading}
              links={links}
              onCreate={() => setCreateOpen(true)}
              onCopy={handleCopy}
              onEdit={(l) => setEditingLink(l)}
              onDelete={(l) => setDeletingLink(l)}
              copiedId={copiedId}
            />
          ) : (
            <ConfigurationSection
              session={session}
              prefs={prefs}
              onSave={(next) => {
                savePreferences(next);
                setPrefs(next);
              }}
              onSignOut={handleSignOut}
            />
          )}
        </div>
      </main>

      <CreateLinkDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isAuthenticated={true}
        onCreated={(link) => {
          // Prepend optimistically — no refresh() needed
          setLinks((prev) => [link, ...prev]);
          setCreatedLink(link);
        }}
      />

      <LinkCreatedDialog
        link={createdLink}
        onOpenChange={(open) => !open && setCreatedLink(null)}
        onCreateAnother={() => {
          setCreatedLink(null);
          setCreateOpen(true);
        }}
      />

      <EditLinkDialog
        link={editingLink}
        isAuthenticated={isAuthenticated}
        onOpenChange={(open) => !open && setEditingLink(null)}
        onUpdated={(updatedLink) => {
          // Update in-place — no refresh() needed
          setLinks((prev) =>
            prev.map((l) => (l.id === updatedLink.id ? updatedLink : l)),
          );
          setEditingLink(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingLink)}
        onOpenChange={(open) => !open && setDeletingLink(null)}
        title={t("dashboard.delete.title")}
        description={
          deletingLink ? (
            <>
              {t("dashboard.delete.desc", { slug: `${shortHost()}/${deletingLink.slug}` })}
            </>
          ) : null
        }
        confirmLabel={t("dashboard.delete.label")}
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

function DashboardHeader({
  session,
  displayName,
  onConfiguration,
  onSignOut,
}: {
  session: AppSession;
  displayName: string;
  onConfiguration: () => void;
  onSignOut: () => void;
}) {
  const { t } = useLanguage()
  const [scrolled, setScrolled] = React.useState(false)
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  return (
    <header className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-lg" : "bg-transparent"
      }`}>
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Wordmark />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          <UserMenu
            session={session}
            displayName={displayName}
            onConfiguration={onConfiguration}
            onSignOut={onSignOut}
          />
        </div>
      </nav>
    </header>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "border-b-2 px-1 pt-1 pb-3 text-sm font-medium transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
      )}
    >
      {children}
    </button>
  );
}

const LinksTab = React.memo(function LinksTab({
  loading,
  links,
  onCreate,
  onCopy,
  onEdit,
  onDelete,
  copiedId,
}: {
  loading: boolean;
  links: ShortLink[];
  onCreate: () => void;
  onCopy: (l: ShortLink) => void;
  onEdit: (l: ShortLink) => void;
  onDelete: (l: ShortLink) => void;
  copiedId: string | null;
}) {
  const { t } = useLanguage()
  const [query, setQuery] = React.useState("");
  const [sort, setSort] = React.useState<SortMode>("newest");
  const [host, setHost] = React.useState("withrelay.vercel.app");
  React.useEffect(() => {
    setHost(shortHost());
  }, []);

  const totalClicks = React.useMemo(
    () => links.reduce((s, l) => s + l.clicks, 0),
    [links],
  );
  const topLink = React.useMemo(
    () =>
      links.reduce<ShortLink | null>(
        (top, l) => (!top || l.clicks > top.clicks ? l : top),
        null,
      ),
    [links],
  );

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q
      ? links.filter(
          (l) =>
            l.slug.toLowerCase().includes(q) ||
            l.destination.toLowerCase().includes(q) ||
            (l.description ?? "").toLowerCase().includes(q),
        )
      : links;
    const sorted = [...out];
    if (sort === "newest") sorted.sort((a, b) => b.createdAt - a.createdAt);
    else if (sort === "oldest")
      sorted.sort((a, b) => a.createdAt - b.createdAt);
    else if (sort === "most-clicks") sorted.sort((a, b) => b.clicks - a.clicks);
    else sorted.sort((a, b) => a.slug.localeCompare(b.slug));
    return sorted;
  }, [links, query, sort]);

  if (loading)
    return (
      <div className="grid min-h-[420px] place-items-center text-muted-foreground">
        <span className="size-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
      </div>
    );
  if (links.length === 0) return <EmptyLinks onCreate={onCreate} />;

  return (
    <div>
      <StatsBar
        total={links.length}
        totalClicks={totalClicks}
        topLink={topLink}
      />

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="relative order-first w-full min-w-0 flex-1 sm:order-none sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("dashboard.search.placeholder")}
            className="h-9 pl-9 text-sm"
            aria-label={t("dashboard.search.placeholder")}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label={t("dashboard.search.clear")}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <SortDropdown value={sort} onChange={setSort} />
        <div className="ml-auto">
          <Button onClick={onCreate} size="sm">
            <Plus />
            {t("dashboard.links.new")}
          </Button>
        </div>
      </div>

      {query && (
        <p className="px-4 pb-2 text-xs text-muted-foreground sm:px-6 lg:px-8">
          {t("dashboard.match_count", { count: visible.length.toString(), total: links.length.toString(), query })}
        </p>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center text-muted-foreground sm:px-6">
          <p className="text-sm">{t("dashboard.search.empty")}</p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-2 text-xs text-foreground underline-offset-4 hover:underline"
          >
            {t("dashboard.search.clear")}
          </button>
        </div>
      ) : (
        <ul className="border-t border-border">
          {visible.map((link) => (
            <LinkRow
              key={link.id}
              link={link}
              host={host}
              copied={copiedId === link.id}
              onCopy={() => onCopy(link)}
              onEdit={() => onEdit(link)}
              onDelete={() => onDelete(link)}
            />
          ))}
        </ul>
      )}
    </div>
  );
});

function StatsBar({
  total,
  totalClicks,
  topLink,
}: {
  total: number;
  totalClicks: number;
  topLink: ShortLink | null;
}) {
  const { t } = useLanguage()
  return (
    <div className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <Stat label={t("dashboard.stats.links")} value={total.toLocaleString()} />
      <Stat label={t("dashboard.stats.clicks")} value={totalClicks.toLocaleString()} />
      <Stat
        label={t("dashboard.stats.top")}
        value={topLink ? `/${topLink.slug}` : "—"}
        sublabel={
          topLink
            ? `${topLink.clicks.toLocaleString()} ${topLink.clicks === 1 ? t("dashboard.click") : t("dashboard.clicks")}`
            : undefined
        }
        mono
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sublabel,
  mono,
}: {
  label: string | React.ReactNode;
  value: string;
  sublabel?: string;
  mono?: boolean;
}) {
  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 truncate text-3xl font-bold tabular-nums tracking-tight",
          mono && "font-mono text-2xl",
        )}
      >
        {value}
      </p>
      {sublabel && (
        <p className="mt-1 text-xs font-medium text-muted-foreground tabular-nums">
          {sublabel}
        </p>
      )}
    </div>
  );
}

const SORT_LABELS: Record<SortMode, string> = {
  newest: "Newest",
  oldest: "Oldest",
  "most-clicks": "Most clicks",
  alpha: "A → Z",
};

function SortDropdown({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (v: SortMode) => void;
}) {
  const { t } = useLanguage()
  const SORT_LABELS_T: Record<SortMode, string> = {
    newest: t("dashboard.sort.newest"),
    oldest: t("dashboard.sort.oldest"),
    "most-clicks": t("dashboard.sort.most_clicks"),
    alpha: t("dashboard.sort.alpha"),
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="font-normal">
          <ListFilter />
          {SORT_LABELS_T[value]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {(Object.keys(SORT_LABELS_T) as SortMode[]).map((opt) => (
          <DropdownMenuItem
            key={opt}
            onClick={() => onChange(opt)}
            className={cn(value === opt && "font-medium")}
          >
            {SORT_LABELS_T[opt]}
            {value === opt && <Check className="ml-auto size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const LinkRow = React.memo(function LinkRow({
  link,
  host,
  copied,
  onCopy,
  onEdit,
  onDelete,
}: {
  link: ShortLink;
  host: string;
  copied: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage()
  return (
    <li className="group border-b border-border transition-colors hover:bg-muted/30">
      <div className="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-6 lg:px-8">
        <div
          className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-background"
          aria-hidden
        >
          <Link2 className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-1.5 truncate font-mono text-sm leading-snug">
            <span className="text-[11px] text-muted-foreground/60">
              {host}/
            </span>
            <span className="truncate font-semibold text-foreground">
              {link.slug}
            </span>
          </p>
          <a
            href={link.destination}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="truncate">{link.destination}</span>
            <ExternalLink className="size-3 shrink-0 opacity-60" />
          </a>
          {link.description && (
            <p className="mt-0.5 truncate text-xs italic text-muted-foreground/70">
              {link.description}
            </p>
          )}
          <p className="mt-1.5 flex items-center gap-2 text-[11px] font-medium text-muted-foreground tabular-nums sm:hidden">
            <span>
              <span className="text-foreground">
                {link.clicks.toLocaleString()}
              </span>{" "}
              {link.clicks === 1 ? t("dashboard.click") : t("dashboard.clicks")}
            </span>
            <span aria-hidden className="opacity-40">
              ·
            </span>
            <span title={fullDate(link.createdAt)}>
              {timeAgo(link.createdAt)}
            </span>
          </p>
        </div>
        <div className="hidden flex-col items-end text-right sm:flex">
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {link.clicks.toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {link.clicks === 1 ? t("dashboard.click") : t("dashboard.clicks")}
            </span>
          </span>
          <span
            className="mt-0.5 text-xs text-muted-foreground/70 tabular-nums"
            title={fullDate(link.createdAt)}
          >
            {timeAgo(link.createdAt)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onCopy}
            aria-label={t("dashboard.row.copy")}
            title={copied ? t("dashboard.row.copied") : t("dashboard.row.copy_btn")}
          >
            {copied ? <Check /> : <Copy />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            aria-label={t("dashboard.row.edit")}
            title={t("dashboard.row.edit")}
            className="hidden sm:inline-flex"
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDelete}
            aria-label={t("dashboard.row.delete")}
            title={t("dashboard.row.delete")}
            className="hidden text-muted-foreground hover:text-destructive sm:inline-flex"
          >
            <Trash2 />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("dashboard.row.more")}
                className="sm:hidden"
              >
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil />
                {t("dashboard.row.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={onDelete}>
                <Trash2 />
                {t("dashboard.row.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
});

function EmptyLinks({ onCreate }: { onCreate: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center sm:px-6">
      <div
        className="mb-5 grid size-14 place-items-center rounded-2xl border border-border bg-muted/40"
        aria-hidden
      >
        <Inbox className="size-6 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">{t("dashboard.empty.title")}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{t("dashboard.empty.desc")}</p>
      <Button onClick={onCreate} className="mt-7">
        <Plus />
        {t("dashboard.empty.cta")}
      </Button>
    </div>
  );
}

function ConfigurationSection({
  session,
  prefs,
  onSave,
  onSignOut,
}: {
  session: AppSession;
  prefs: Preferences;
  onSave: (p: Preferences) => void;
  onSignOut: () => void;
}) {
  const { t } = useLanguage()
  return (
    <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.config.title")}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("dashboard.config.desc")}
          </p>
        </div>
        <div className="space-y-10">
          <ProfileForm session={session} prefs={prefs} onSave={onSave} />
          <WorkspaceForm prefs={prefs} />
          <LinkedAccountsSection session={session} />
          <SessionSection onSignOut={onSignOut} />
        </div>
      </div>
    </div>
  );
}

function ProfileForm({
  session,
  prefs,
  onSave,
}: {
  session: AppSession;
  prefs: Preferences;
  onSave: (p: Preferences) => void;
}) {
  const { t } = useLanguage()
  const [displayName, setDisplayName] = React.useState(
    prefs.displayName ?? session.user.name,
  );
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setDisplayName(prefs.displayName ?? session.user.name);
  }, [prefs, session.user.name]);

  const dirty = displayName !== (prefs.displayName ?? session.user.name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error(t("dashboard.config.profile.validation_error"), {
        description: t("dashboard.config.profile.empty_error"),
      });
      return;
    }
    if (displayName.trim().length < 2) {
      toast.error(t("dashboard.config.profile.validation_error"), {
        description: t("dashboard.config.profile.minlength_error"),
      });
      return;
    }

    setSaving(true);
    const next = { ...prefs, displayName: displayName.trim() };
    onSave(next);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ displayName: next.displayName }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(t("dashboard.config.profile.saved"), {
        description: t("dashboard.config.profile.saved.desc"),
      });
    } catch {
      toast.error(t("dashboard.config.profile.sync_error"), {
        description: t("dashboard.config.profile.sync_error.desc"),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDisplayName(session.user.name);
    onSave({ ...prefs, displayName: undefined });
    toast.success(t("dashboard.config.profile.reset"), {
      description: t("dashboard.config.profile.reset.desc"),
    });
  };

  return (
    <FormSection
      icon={User}
      title={t("dashboard.config.profile.title")}
      subtitle={t("dashboard.config.profile.desc")}
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-4 border-b border-border pb-6">
        {session.user.image ? (
          <img
            src={session.user.image}
            alt=""
            referrerPolicy="no-referrer"
            className="size-14 shrink-0 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-base font-semibold text-foreground ring-1 ring-border">
            {initials(displayName || session.user.name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {displayName || session.user.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {session.user.email}
          </p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
            <ShieldCheck className="size-3" />
            {session.provider}
          </span>
        </div>
      </div>
      <FormRow
        label={t("dashboard.config.profile.displayName")}
        hint={t("dashboard.config.profile.displayNameHint", { provider: session.provider })}
      >
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={80}
          placeholder={t("dashboard.config.profile.displayNamePlaceholder")}
        />
      </FormRow>
      <FormRow
        label={t("dashboard.config.profile.email")}
        hint={t("dashboard.config.profile.emailHint", { provider: session.provider })}
      >
        <div className="relative">
          <Input
            id="email"
            value={session.user.email}
            disabled
            className="cursor-not-allowed pr-9 opacity-70"
          />
          <Lock className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
        </div>
      </FormRow>
      <FormFooter
        saving={saving}
        dirty={dirty}
        onReset={handleReset}
        canReset={Boolean(prefs.displayName)}
      />
    </FormSection>
  );
}

function WorkspaceForm({ prefs }: { prefs: Preferences }) {
  const { t } = useLanguage()
  return (
    <FormSection
      icon={Globe}
      title={t("dashboard.config.workspace.title")}
      subtitle={t("dashboard.config.workspace.desc")}
      onSubmit={(e) => e.preventDefault()}
    >
      <FormRow
        label={t("dashboard.config.workspace.shortDomain")}
        hint={t("dashboard.config.workspace.shortDomainHint")}
      >
        <div className="relative">
          <Input
            id="shortDomain"
            value="withrelay.vercel.app"
            disabled
            className="cursor-not-allowed pr-9 font-mono text-sm opacity-70"
          />
          <Lock className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
        </div>
      </FormRow>
    </FormSection>
  );
}

type LinkedAccount = { provider: string; linkedAt: string };

const PROVIDER_LINKS: Record<string, string> = {
  google: "https://myaccount.google.com/permissions",
  github: "https://github.com/settings/applications",
  discord: "https://discord.com/settings/authorized-apps",
};

function providerLabel(p: string) {
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function LinkedAccountsSection({ session }: { session: AppSession }) {
  const { t } = useLanguage()
  const [accounts, setAccounts] = React.useState<LinkedAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [unlinking, setUnlinking] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/me/accounts", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { accounts: [] }))
      .then((d) => setAccounts(d.accounts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUnlink = async (provider: string) => {
    if (
      !confirm(t("dashboard.config.accounts.unlink_confirm", { provider: providerLabel(provider) }))
    )
      return;
    setUnlinking(provider);
    try {
      const res = await fetch(`/api/me/accounts?provider=${provider}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const msg = await res.text();
        toast.error(t("dashboard.config.accounts.unlink_error"), { description: msg });
        return;
      }
      setAccounts((prev) => prev.filter((a) => a.provider !== provider));
      toast.success(t("dashboard.config.accounts.disconnected", { provider: providerLabel(provider) }), {
        description: t("dashboard.config.accounts.disconnected.desc"),
      });
    } catch {
      toast.error(t("dashboard.config.accounts.network_error"), { description: t("common.try_again") });
    } finally {
      setUnlinking(null);
    }
  };

  return (
    <div>
      <SectionHeader
        icon={ShieldCheck}
        title={t("dashboard.config.accounts.title")}
        subtitle={t("dashboard.config.accounts.desc")}
      />

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <span className="size-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          /* Demo mode or DB not configured — show current session provider */
          <div className="flex items-center gap-4 px-4 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <ShieldCheck className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold capitalize">
                {session.provider}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {session.user.email}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              {t("dashboard.config.accounts.active")}
            </span>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {accounts.map((account) => {
              const isActive = account.provider === session.provider;
              const manageHref = PROVIDER_LINKS[account.provider];
              return (
                <li
                  key={account.provider}
                  className="flex items-center gap-4 px-4 py-4"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <ShieldCheck className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold capitalize">
                        {account.provider}
                      </p>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          {t("dashboard.config.accounts.current_session")}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t("dashboard.config.accounts.linked")}{" "}
                      {new Date(account.linkedAt).toLocaleDateString(
                        undefined,
                        { year: "numeric", month: "short", day: "numeric" },
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {manageHref && (
                      <a
                        href={manageHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {t("dashboard.config.accounts.manage")}
                        <ArrowUpRight className="size-3" />
                      </a>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      disabled={unlinking === account.provider || isActive}
                      title={
                        isActive
                          ? t("dashboard.config.accounts.cannot_unlink")
                          : t("dashboard.config.accounts.disconnect_title", { provider: providerLabel(account.provider) })
                      }
                      onClick={() => handleUnlink(account.provider)}
                    >
                      <Unlink className="size-3" />
                      {unlinking === account.provider
                        ? t("dashboard.config.accounts.disconnecting")
                        : t("dashboard.config.accounts.disconnect")}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Link new provider — informational footer */}
          {accounts.length > 0 && (
          <div className="border-t border-border bg-muted/30 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              {t("dashboard.config.accounts.link_hint")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionSection({ onSignOut }: { onSignOut: () => void }) {
  const { t } = useLanguage()
  return (
    <div>
      <SectionHeader
        icon={LogOut}
        title={t("dashboard.config.session.title")}
        subtitle={t("dashboard.config.session.desc")}
      />
      <div className="flex flex-col gap-4 rounded-lg border border-destructive/20 bg-destructive/[0.03] px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-muted-foreground">
          {t("dashboard.config.session.desc")}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onSignOut}
          className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut />
          {t("dashboard.config.signout")}
        </Button>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="space-y-0.5">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function FormSection({
  icon,
  title,
  subtitle,
  onSubmit,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <SectionHeader icon={icon} title={title} subtitle={subtitle} />
      <div className="space-y-6 rounded-lg border border-border bg-card px-4 py-6 sm:px-6">
        {children}
      </div>
    </form>
  );
}

function FormRow({
  label,
  hint,
  children,
}: {
  label: string | React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[240px_1fr] md:gap-10">
      <div className="space-y-1 pt-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function FormFooter({
  saving,
  dirty,
  onReset,
  canReset,
}: {
  saving: boolean;
  dirty: boolean;
  onReset: () => void;
  canReset: boolean;
}) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5 sm:gap-3">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onReset}
        disabled={!canReset || saving}
      >
        {t("common.reset_defaults")}
      </Button>
      <Button
        type="submit"
        size="sm"
        disabled={!dirty || saving}
        aria-busy={saving}
      >
        {saving ? t("common.saving") : t("common.save_changes")}
      </Button>
    </div>
  );
}
