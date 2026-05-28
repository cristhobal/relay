<div align="center">

<br />

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/relay-URL%20Shortener-FAFAFA?style=for-the-badge&logoColor=080808&labelColor=FAFAFA">
  <img alt="relay" src="https://img.shields.io/badge/relay-URL%20Shortener-080808?style=for-the-badge&logoColor=FAFAFA&labelColor=080808">
</picture>

<br />
<br />

**A fast, free, and open-source URL shortener.**  
No account required. Short links that work for everyone, on any device.

<br />

[![License: MIT](https://img.shields.io/badge/license-MIT-080808?style=flat-square&labelColor=080808)](./LICENSE)
[![Built with Astro](https://img.shields.io/badge/built%20with-Astro-080808?style=flat-square&labelColor=080808&logoColor=FAFAFA&logo=astro)](https://astro.build)
[![Open Source](https://img.shields.io/badge/open%20source-%E2%9D%A4-080808?style=flat-square&labelColor=080808)](https://github.com/cristhobal/relay)

<br />

![relay preview](https://invault.vercel.app/sFY1ybZi.png)

<br />

🔗 **Live demo:** [relay.vercel.app](https://relay.vercel.app) &nbsp;·&nbsp; ⭐ **GitHub:** [cristhobal/relay](https://github.com/cristhobal/relay)

<br />

[🇺🇸 English](./README.md) · [🇨🇳 中文](./docs/README.zh.md) · [🇮🇳 हिन्दी](./docs/README.hi.md) · [🇪🇸 Español](./docs/README.es.md) · [🇫🇷 Français](./docs/README.fr.md)

<br />

</div>

---

## Overview

**relay** is a minimalist URL shortener built with Astro, React, Tailwind v4, and shadcn/ui. Start shortening links immediately — no account needed. Sign in with Google or GitHub to keep your links across devices, and any anonymous links you created are migrated to your account automatically.

Short URLs resolve from a **MySQL database** when configured, so every link you create works for anyone, on any device.

---

## Features

- **Instant short links** — custom slug or randomly generated (7 characters)
- **Anonymous mode** — create up to 10 links without signing in (stored in `localStorage`)
- **Persistent links** — when MySQL is configured, links resolve cross-device for everyone
- **Dashboard** — full list of your links with click counters, edit, delete, and copy actions
- **Link editing** — change the destination URL, slug, or description at any time
- **Auto-migration** — anonymous links move to your account on first sign-in, nothing lost
- **Light / dark mode** — persisted preference, no flash on load
- **Demo mode** — works fully without OAuth or database (uses a fake session in `localStorage`)

---

## How it works

### Authentication

relay uses **Auth.js** (`auth-astro`) for OAuth with Google and GitHub:

1. User clicks **Continue with Google** or **Continue with GitHub**
2. Auth.js redirects to the provider and retrieves the user profile (`name`, `email`, `image`)
3. Auth.js creates a signed session using `AUTH_SECRET` and stores it in a cookie
4. On every request, Astro reads the session server-side to decide whether to show `/` or `/dashboard`
5. On first sign-in, anonymous links are automatically migrated to the account

Without OAuth credentials configured, the app enters **demo mode**: the login buttons create a fake session in `localStorage` so you can explore the full flow. A banner in the login dialog signals when demo mode is active.

### Storage

relay has two backends that share the same async API:

| Mode | Backend | Used when |
|---|---|---|
| Anonymous | `localStorage` | The user has not signed in |
| Authenticated | MySQL via the API routes | The user has a real or demo session |

When `DATABASE_HOST` is set, signed-in users' links are persisted server-side and the public redirect (`/[slug]`) performs a database lookup so any short URL works from any browser. When the database is not configured, the app falls back to localStorage for everyone.

The schema is small — `users`, `accounts`, `links` — and lives in [`schema.sql`](./schema.sql).

---

## Tech stack

| Technology | Role |
|---|---|
| **Astro 6** (`output: server` + Vercel adapter) | Core framework / SSR |
| **React 19** | Interactive client components |
| **Tailwind v4** + **shadcn/ui** (`radix-vega` theme) | Styling and UI components |
| **Auth.js** via `auth-astro` | OAuth with Google and GitHub |
| **MySQL** (`mysql2`) | Persistent storage for users and links |
| **localStorage** | Anonymous mode + theme/preference cache |

---

## Getting started

```bash
npm install
cp .env.example .env   # fill in the variables (see below)
npm run dev
```

The app opens at `http://localhost:4321`. Without OAuth and database variables, it runs in **demo mode** — full flow, no configuration needed.

---

## Configuration

### Auth secret

Auth.js uses this secret to sign session cookies.

```bash
openssl rand -base64 32
```

```env
AUTH_SECRET=<output-from-openssl>
AUTH_TRUST_HOST=true
```

### Google OAuth

1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Create or select a project
3. Go to **APIs & Services → Credentials → + CREATE CREDENTIALS → OAuth client ID**
   - Configure the **OAuth consent screen** first if prompted: User type **External**, scopes `userinfo.email` and `userinfo.profile`
4. Application type: **Web application**. Add authorized redirect URIs:
   - `http://localhost:4321/api/auth/callback/google`
   - `https://your-domain.com/api/auth/callback/google`

```env
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

### GitHub OAuth

GitHub allows only one callback URL per OAuth App, so you'll need **two apps**: one for localhost, one for production.

Go to [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps → New OAuth App**.

- Production callback: `https://your-domain.com/api/auth/callback/github`
- Localhost callback: `http://localhost:4321/api/auth/callback/github`

### MySQL database

The app falls back to localStorage when no database is configured — this step is optional for local development, but required in production if you want short URLs to resolve for all users.

**1. Create the schema**

```bash
mysql -u root -p < schema.sql
```

This creates the `relay` database and three tables: `users`, `accounts`, `links`.

**2. Create a dedicated app user**

```sql
CREATE USER 'relay_app'@'%' IDENTIFIED BY 'choose-a-strong-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON relay.* TO 'relay_app'@'%';
FLUSH PRIVILEGES;
```

**3. Add connection details to `.env`**

```env
DATABASE_HOST=your-mysql-host
DATABASE_PORT=3306
DATABASE_USER=relay_app
DATABASE_PASSWORD=<the-password-from-step-2>
DATABASE_NAME=relay
```

> **Security:** do not expose port 3306 to the public internet. Restrict it via firewall to your hosting provider's IP ranges, or use a managed driver (PlanetScale, Vercel Postgres, etc.).

---

## Deploy to Vercel

The `@astrojs/vercel` adapter is already configured in `astro.config.mjs`.

1. Push the project to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo (Vercel auto-detects Astro)
3. Add environment variables under **Settings → Environment Variables**:

| Variable | Description |
|---|---|
| `AUTH_SECRET` | Output of `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | `true` |
| `GOOGLE_CLIENT_ID` | Your Google client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google client secret |
| `GITHUB_CLIENT_ID` | Your GitHub client ID (production app) |
| `GITHUB_CLIENT_SECRET` | Your GitHub client secret |
| `DATABASE_HOST` | Your MySQL host |
| `DATABASE_PORT` | `3306` |
| `DATABASE_USER` | `relay_app` |
| `DATABASE_PASSWORD` | The app user password |
| `DATABASE_NAME` | `relay` |

4. After adding variables, redeploy from **Deployments → ⋯ → Redeploy**

Make sure the callback URIs in Google and GitHub match exactly:

- `https://your-domain.com/api/auth/callback/google`
- `https://your-domain.com/api/auth/callback/github`

---

## Environment variables

| Variable | Required | Description |
|---|:---:|---|
| `AUTH_SECRET` | ✓ | Cookie signing secret. Generate with `openssl`. |
| `AUTH_TRUST_HOST` | ✓ | Set to `true` for Vercel. |
| `GOOGLE_CLIENT_ID` | — | Google OAuth. Without this, demo mode is used. |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth. |
| `GITHUB_CLIENT_ID` | — | GitHub OAuth. Without this, demo mode is used. |
| `GITHUB_CLIENT_SECRET` | — | GitHub OAuth. |
| `DATABASE_HOST` | — | MySQL host. Without this, links live only in localStorage. |
| `DATABASE_PORT` | — | MySQL port. Defaults to `3306`. |
| `DATABASE_USER` | — | MySQL user with read/write access on `relay.*`. |
| `DATABASE_PASSWORD` | — | Password for `DATABASE_USER`. |
| `DATABASE_NAME` | — | MySQL database name. Defaults to `relay`. |

If `GOOGLE_CLIENT_ID` or `GITHUB_CLIENT_ID` is missing, the app enters demo mode automatically.

---

## Project structure

```
src/
├── components/
│   ├── ui/                    ← shadcn (radix-vega): button, dialog, input, label,
│   │                              textarea, card, separator, avatar, dropdown-menu
│   ├── Wordmark.tsx            ← "relay" logotype
│   ├── ThemeToggle.tsx         ← light/dark with persistence
│   ├── AuthDialog.tsx          ← Google + GitHub OAuth (real or demo)
│   ├── CreateLinkDialog.tsx
│   ├── Landing.tsx             ← minimalist home page
│   └── Dashboard.tsx           ← Links + Configuration tabs
├── lib/
│   ├── auth.ts                 ← session types + helpers, demo fallback
│   ├── db.ts                   ← MySQL pool + query/execute helpers
│   ├── repo.ts                 ← server-side data access (users + links)
│   ├── links.ts                ← hybrid client API: localStorage or HTTP → DB
│   ├── preferences.ts          ← user preferences
│   └── utils.ts                ← cn() helper
├── layouts/Layout.astro        ← SEO: OG, Twitter Card, JSON-LD, canonical
├── pages/
│   ├── index.astro             ← server-side: session? → /dashboard
│   ├── dashboard.astro         ← server-side: no session? → /
│   ├── [slug].astro            ← server-side redirect via DB lookup
│   └── api/
│       ├── me.ts               ← profile + workspace updates
│       └── links/              ← list / create / update / delete / migrate

auth.config.ts                  ← Auth.js config (Google + GitHub)
astro.config.mjs                ← output: 'server' + adapter: vercel
schema.sql                      ← MySQL schema for users / accounts / links
.env.example                    ← required environment variables
```

---

## Technical notes

- **Anonymous limit** — users can create up to 10 free links (see `ANONYMOUS_LINK_LIMIT` in `src/lib/links.ts`). On first sign-in, those links are migrated to the database via `POST /api/links/migrate`.
- **Storage routing** — lives in `src/lib/links.ts`. The `isAuthenticated` flag picks between `localStorage` (anonymous) and the `/api/links` HTTP endpoints (which talk to MySQL through `src/lib/repo.ts`).
- **Connection pooling** — handled in `src/lib/db.ts` with a single shared pool (`connectionLimit: 5`). One pool per server instance is reused across requests, which is friendly to serverless cold starts.
- **Theme** — applied before paint via an inline script in `Layout.astro` to prevent the white flash on load.
- **SEO** — centralised in `Layout.astro`: per-page title and description, Open Graph, Twitter Card, canonical URL, JSON-LD, and a `noindex` flag for private pages like the dashboard.

---

## Open source

This project is free and open source under the **MIT license**. Deploy it as-is, modify it, contribute back, or fork it and build something new. No restrictions. If you use or adapt it, a mention is always appreciated.

---

## License

[MIT](./LICENSE) © relay contributors
