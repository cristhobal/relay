<div align="center">

# relay

**A fast, free, and open-source URL shortener.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Built with Astro](https://img.shields.io/badge/Built%20with-Astro-ff5d01.svg)](https://astro.build)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-green.svg)](https://github.com/cristhobal/relay)

![relay preview](https://i.postimg.cc/BQjpN6Vy/relay.png)

🔗 **Live demo:** [relay.vercel.app](https://relay.vercel.app) &nbsp;·&nbsp; ⭐ **GitHub:** [cristhobal/relay](https://github.com/cristhobal/relay)

</div>

---

### Available languages

[🇺🇸 English](./README.md) · [🇨🇳 中文](./docs/README.zh.md) · [🇮🇳 हिन्दी](./docs/README.hi.md) · [🇪🇸 Español](./docs/README.es.md) · [🇫🇷 Français](./docs/README.fr.md)

---

## Overview

**relay** is a minimalist URL shortener built with Astro, React, Tailwind v4 and shadcn/ui. You can start shortening links immediately — no account needed. Sign in with Google or GitHub to keep your links across devices, and any anonymous links you created are migrated automatically to your account.

Short URLs resolve from a **MySQL database** when configured, so the links you create work for everyone, on any device — not just in your own browser.

## Features

- **Instant short links** — custom slug or randomly generated (7 characters)
- **Anonymous mode** — up to 10 links without signing in (stored in `localStorage`)
- **Persistent links** — when MySQL is configured, links resolve cross-device for everyone
- **Dashboard** — full list of your links with click counters, edit, delete and copy actions
- **Link editing** — change the destination URL, slug or description at any time
- **Auto-migration** — anonymous links move to your account on first sign-in, nothing lost
- **Light / dark mode** — persisted preference, no flash on load
- **Demo mode** — works fully without OAuth or database (uses a fake session in `localStorage`)

## How login works

relay uses **Auth.js** (`auth-astro`) for OAuth with Google and GitHub:

1. User clicks **Continue with Google** or **Continue with GitHub**
2. Auth.js redirects to the provider and retrieves the user profile (`name`, `email`, `image`)
3. Auth.js creates a signed session using `AUTH_SECRET` and stores it in a cookie
4. On every request, Astro reads the session server-side to decide whether to show `/` or `/dashboard`
5. On first sign-in, anonymous links are automatically migrated to the account

Without OAuth credentials configured, the app enters **demo mode**: the buttons create a fake session in `localStorage` so you can explore the full flow. A "Demo mode" banner in the login dialog signals when you're in this mode.

## How storage works

relay has **two backends** that share the same async API:

| Mode          | Backend                  | Used when                           |
| ------------- | ------------------------ | ----------------------------------- |
| Anonymous     | `localStorage`           | The user has not signed in          |
| Authenticated | MySQL via the API routes | The user has a real or demo session |

When `DATABASE_HOST` is set, signed-in users' links are persisted server-side and the public redirect (`/[slug]`) does a database lookup so any short URL works from any browser. When the database is **not** configured, the app falls back to localStorage for everyone.

The schema is small (`users`, `accounts`, `links`) and lives in [`schema.sql`](./schema.sql).

## Tech stack

| Technology                                           | Role                                    |
| ---------------------------------------------------- | --------------------------------------- |
| **Astro 6** (`output: server` + Vercel adapter)      | Core framework / SSR                    |
| **React 19**                                         | Interactive client components           |
| **Tailwind v4** + **shadcn/ui** (`radix-vega` theme) | Styling and UI components               |
| **Auth.js** via `auth-astro`                         | OAuth with Google and GitHub            |
| **MySQL** (`mysql2`)                                 | Persistent storage for users and links  |
| **localStorage**                                     | Anonymous mode + theme/preference cache |

## Open source

This project is **free and open source** under the **MIT license**. You can:

- Deploy it as-is on your own domain
- Modify and adapt it to your needs
- Contribute improvements, fixes or new features
- Fork it and build your own version

No restrictions whatsoever. If you use or adapt it, a mention is always appreciated! 🙌

---

## Getting started

### Run locally

```bash
npm install
cp .env.example .env    # then fill in the variables (see below)
npm run dev
```

The app opens at `http://localhost:4321`. Without OAuth and database variables it runs in **demo mode** — full flow, no configuration needed.

---

## Configure real OAuth

### 1. Generate `AUTH_SECRET`

Auth.js uses this secret to sign session cookies.

```bash
openssl rand -base64 32
```

Add the result to `.env`:

```env
AUTH_SECRET=<output-from-openssl>
AUTH_TRUST_HOST=true
```

### 2. Google OAuth

1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Create or select a project
3. **APIs & Services → Credentials → + CREATE CREDENTIALS → OAuth client ID**
   - If prompted, configure the **OAuth consent screen** first:
     - User type: **External** · App name: `relay`
     - Scopes: add `userinfo.email` and `userinfo.profile`
4. Complete:
   - Application type: **Web application**
   - **Authorized redirect URIs:**
     - `http://localhost:4321/api/auth/callback/google`
     - `https://relay.vercel.app/api/auth/callback/google`
5. Add to `.env`:

```env
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

### 3. GitHub OAuth

GitHub allows only **one callback URL per OAuth App**, so you'll need **two apps**: one for localhost, one for production.

Go to [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps → New OAuth App**

- **Production callback:** `https://relay.vercel.app/api/auth/callback/github`
- **Localhost callback:** `http://localhost:4321/api/auth/callback/github`

---

## Configure the database (MySQL)

The app falls back to localStorage when no database is configured, so this step is optional for local development. For production it's required if you want short URLs to work for users other than the author.

### 1. Create the schema

Run [`schema.sql`](./schema.sql) on your MySQL server:

```bash
mysql -u root -p < schema.sql
```

This creates the `relay` database and three tables: `users`, `accounts`, `links`.

### 2. Create a dedicated app user

```sql
CREATE USER 'relay_app'@'%' IDENTIFIED BY 'choose-a-strong-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON relay.* TO 'relay_app'@'%';
FLUSH PRIVILEGES;
```

### 3. Add the connection to `.env`

```env
DATABASE_HOST=your-mysql-host
DATABASE_PORT=3306
DATABASE_USER=relay_app
DATABASE_PASSWORD=<the-password-from-step-2>
DATABASE_NAME=relay
```

`src/lib/db.ts` exposes a single connection pool with a low connection limit (5) suited for serverless. If `DATABASE_HOST` is empty the API routes return early and the app keeps running in localStorage-only mode.

> **Security:** do **not** expose port 3306 to the public internet. Restrict it via firewall to Vercel's IP ranges, put a small HTTPS API in front of it on your VPS, or use a managed driver (PlanetScale, Vercel Postgres, etc.).

---

## Deploy to Vercel

The `@astrojs/vercel` adapter is already configured in `astro.config.mjs`.

1. Push the project to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) → import the repo (Vercel auto-detects Astro)
3. Add environment variables under **Settings → Environment Variables**:

| Variable               | Value                               |
| ---------------------- | ----------------------------------- |
| `AUTH_SECRET`          | output of `openssl rand -base64 32` |
| `AUTH_TRUST_HOST`      | `true`                              |
| `GOOGLE_CLIENT_ID`     | your Google client ID               |
| `GOOGLE_CLIENT_SECRET` | your Google client secret           |
| `GITHUB_CLIENT_ID`     | your GitHub client ID (production)  |
| `GITHUB_CLIENT_SECRET` | your GitHub client secret           |
| `DATABASE_HOST`        | your MySQL host                     |
| `DATABASE_PORT`        | `3306`                              |
| `DATABASE_USER`        | `relay_app`                          |
| `DATABASE_PASSWORD`    | the app user password               |
| `DATABASE_NAME`        | `relay`                              |

4. After adding variables, redeploy from **Deployments → ⋯ → Redeploy**

Verify that callback URIs in Google and GitHub match exactly:

- `https://relay.vercel.app/api/auth/callback/google`
- `https://relay.vercel.app/api/auth/callback/github`

---

## Environment variables

| Variable               | Required | Description                                                |
| ---------------------- | :------: | ---------------------------------------------------------- |
| `AUTH_SECRET`          |    ✓     | Cookie signing secret. Generate with `openssl`.            |
| `AUTH_TRUST_HOST`      |    ✓     | Set to `true` for Vercel.                                  |
| `GOOGLE_CLIENT_ID`     |    —     | Google OAuth. Without this, demo mode.                     |
| `GOOGLE_CLIENT_SECRET` |    —     | Google OAuth.                                              |
| `GITHUB_CLIENT_ID`     |    —     | GitHub OAuth. Without this, demo mode.                     |
| `GITHUB_CLIENT_SECRET` |    —     | GitHub OAuth.                                              |
| `DATABASE_HOST`        |    —     | MySQL host. Without this, links live only in localStorage. |
| `DATABASE_PORT`        |    —     | MySQL port. Defaults to `3306`.                            |
| `DATABASE_USER`        |    —     | MySQL user with read/write access on `relay.*`.             |
| `DATABASE_PASSWORD`    |    —     | Password for `DATABASE_USER`.                              |
| `DATABASE_NAME`        |    —     | MySQL database name. Defaults to `relay`.                   |

If `GOOGLE_CLIENT_ID` **or** `GITHUB_CLIENT_ID` is missing, the app enters demo mode automatically (logic in `src/pages/index.astro` and `src/pages/dashboard.astro`).

---

## Project structure

```
src/
├── components/
│   ├── ui/                   ← shadcn (radix-vega): button, dialog, input, label,
│   │                             textarea, card, separator, avatar, dropdown-menu
│   ├── Wordmark.tsx           ← "relay" logo
│   ├── ThemeToggle.tsx        ← light/dark with persistence
│   ├── AuthDialog.tsx         ← Google + GitHub OAuth (real or demo)
│   ├── CreateLinkDialog.tsx
│   ├── Landing.tsx            ← minimalist home page
│   └── Dashboard.tsx          ← Links + Configuration tabs
├── lib/
│   ├── auth.ts                ← session types + helpers, demo fallback
│   ├── db.ts                  ← MySQL pool + query/execute helpers
│   ├── repo.ts                ← server-side data access (users + links)
│   ├── links.ts               ← hybrid client API: localStorage or HTTP → DB
│   ├── preferences.ts         ← user preferences
│   └── utils.ts               ← cn() helper
├── layouts/Layout.astro       ← full SEO: OG, Twitter Card, JSON-LD, canonical
├── pages/
│   ├── index.astro            ← server-side: session? → /dashboard
│   ├── dashboard.astro        ← server-side: no session? → /
│   ├── [slug].astro           ← server-side redirect using DB lookup
│   └── api/
│       ├── me.ts              ← profile + workspace updates
│       └── links/             ← list / create / update / delete / migrate
└── styles/global.css          ← radix-vega theme (unmodified)

auth.config.ts                 ← Auth.js config (Google + GitHub)
astro.config.mjs               ← output: 'server' + adapter: vercel
schema.sql                     ← MySQL schema for users / accounts / links
.env.example                   ← required environment variables
```

---

## Technical notes

- **Anonymous users** can create up to **10 free links** (see `ANONYMOUS_LINK_LIMIT` in `src/lib/links.ts`). After that they need to sign in. On first sign-in, anonymous links are migrated to the database via `POST /api/links/migrate`.
- **Storage routing** lives in `src/lib/links.ts`. The `isAuthenticated` flag picks between `localStorage` (anonymous) and the `/api/links` HTTP endpoints (which talk to MySQL through `src/lib/repo.ts`).
- **Connection pooling** is handled in `src/lib/db.ts` with a single shared pool (`connectionLimit: 5`). One pool per server instance is reused across requests, which is friendly to serverless cold starts.
- **Auth.js** handles the entire OAuth flow including signed cookies and sessions. The `/api/auth/*` route is injected by `auth-astro` automatically. On every sign-in, `upsertUserFromOAuth` (in `repo.ts`) finds or creates the matching user row.
- **Light/dark theme** is applied before paint via an inline script in `Layout.astro` to prevent the white flash.
- **User avatar** comes from the OAuth provider (`picture` / `avatar_url` → `image` field in the Auth.js session). In demo mode, a deterministic fallback is used.
- **SEO** is centralised in `Layout.astro`: per-page title and description, Open Graph (`/relay.png`), Twitter Card, canonical URL, JSON-LD and a `noindex` flag for private pages like the dashboard.

---

## License

[MIT](./LICENSE) — free to use, modify and distribute.
