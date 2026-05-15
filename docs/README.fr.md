<div align="center">

# relay

**Un raccourcisseur d'URL rapide, gratuit et open source.**

[![Licence: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Construit avec Astro](https://img.shields.io/badge/Built%20with-Astro-ff5d01.svg)](https://astro.build)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-green.svg)](https://github.com/cristhobal/relay)

![Aperçu de relay](https://i.postimg.cc/BQjpN6Vy/relay.png)

🔗 **Démo en ligne :** [relay.vercel.app](https://relay.vercel.app) &nbsp;·&nbsp; ⭐ **GitHub :** [cristhobal/relay](https://github.com/cristhobal/relay)

</div>

---

### Langues disponibles

[🇺🇸 English](./README.md) · [🇨🇳 中文](./docs/README.zh.md) · [🇮🇳 हिन्दी](./docs/README.hi.md) · [🇪🇸 Español](./docs/README.es.md) · [🇫🇷 Français](./docs/README.fr.md)

---

## Présentation

**relay** est un raccourcisseur d'URL minimaliste construit avec Astro, React, Tailwind v4 et shadcn/ui. Vous pouvez commencer à raccourcir des liens immédiatement, sans créer de compte. Connectez-vous avec Google ou GitHub pour conserver vos liens sur tous vos appareils ; les liens anonymes que vous avez créés sont migrés automatiquement vers votre compte.

Les URL courtes sont résolues depuis une **base de données MySQL** lorsqu'elle est configurée, de sorte que les liens que vous créez fonctionnent pour tout le monde, sur n'importe quel appareil, pas seulement dans votre navigateur.

## Fonctionnalités

- **Liens courts instantanés** — slug personnalisé ou généré aléatoirement (7 caractères)
- **Mode anonyme** — jusqu'à 10 liens sans connexion (stockés dans `localStorage`)
- **Liens persistants** — lorsque MySQL est configuré, les liens se résolvent entre appareils pour tout utilisateur
- **Tableau de bord** — liste complète de vos liens avec compteurs de clics, et actions de modification, suppression et copie
- **Modification de liens** — changez l'URL de destination, le slug ou la description à tout moment
- **Migration automatique** — les liens anonymes sont transférés vers votre compte à la première connexion, sans perte de données
- **Mode clair / sombre** — préférence persistée, sans clignotement au chargement
- **Mode démo** — fonctionne entièrement sans OAuth ni base de données (utilise une session simulée dans `localStorage`)

## Fonctionnement de la connexion

relay utilise **Auth.js** (`auth-astro`) pour OAuth avec Google et GitHub :

1. L'utilisateur clique sur **Continuer avec Google** ou **Continuer avec GitHub**
2. Auth.js redirige vers le fournisseur et récupère le profil utilisateur (`name`, `email`, `image`)
3. Auth.js crée une session signée à l'aide de `AUTH_SECRET` et la stocke dans un cookie
4. À chaque requête, Astro lit la session côté serveur pour décider d'afficher `/` ou `/dashboard`
5. À la première connexion, les liens anonymes sont automatiquement migrés vers le compte

Sans identifiants OAuth configurés, l'application entre en **mode démo** : les boutons créent une session simulée dans `localStorage` pour que vous puissiez explorer le flux complet. Une bannière « Mode démo » dans la boîte de dialogue de connexion indique lorsque vous êtes dans ce mode.

## Fonctionnement du stockage

relay dispose de **deux backends** qui partagent la même API asynchrone :

| Mode        | Backend                  | Utilisé quand                                 |
| ----------- | ------------------------ | --------------------------------------------- |
| Anonyme     | `localStorage`           | L'utilisateur n'est pas connecté              |
| Authentifié | MySQL via les routes API | L'utilisateur a une session réelle ou de démo |

Lorsque `DATABASE_HOST` est défini, les liens des utilisateurs connectés sont persistés côté serveur et la redirection publique (`/[slug]`) effectue une requête en base de données, de sorte que toute URL courte fonctionne depuis n'importe quel navigateur. Lorsque la base de données **n'est pas** configurée, l'application se replie sur localStorage pour tous.

Le schéma est compact (`users`, `accounts`, `links`) et se trouve dans [`schema.sql`](./schema.sql).

## Stack technique

| Technologie                                          | Rôle                                          |
| ---------------------------------------------------- | --------------------------------------------- |
| **Astro 6** (`output: server` + adaptateur Vercel)   | Framework principal / SSR                     |
| **React 19**                                         | Composants client interactifs                 |
| **Tailwind v4** + **shadcn/ui** (thème `radix-vega`) | Styles et composants d'interface              |
| **Auth.js** via `auth-astro`                         | OAuth avec Google et GitHub                   |
| **MySQL** (`mysql2`)                                 | Stockage persistant des utilisateurs et liens |
| **localStorage**                                     | Mode anonyme + cache de préférences           |

## Open source

Ce projet est **gratuit et open source** sous la **licence MIT**. Vous pouvez :

- Le déployer tel quel sur votre propre domaine
- Le modifier et l'adapter à vos besoins
- Contribuer avec des améliorations, corrections ou nouvelles fonctionnalités
- Le forker pour construire votre propre version

Aucune restriction. Si vous l'utilisez ou l'adaptez, une mention est toujours appréciée ! 🙌

---

## Démarrage rapide

### Exécuter en local

```bash
npm install
cp .env.example .env    # puis remplissez les variables (voir ci-dessous)
npm run dev
```

L'application s'ouvre sur `http://localhost:4321`. Sans les variables OAuth et base de données, elle s'exécute en **mode démo** — flux complet, sans configuration supplémentaire.

---

## Configurer OAuth réel

### 1. Générer `AUTH_SECRET`

Auth.js utilise ce secret pour signer les cookies de session.

```bash
openssl rand -base64 32
```

Ajoutez le résultat dans `.env` :

```env
AUTH_SECRET=<résultat-de-openssl>
AUTH_TRUST_HOST=true
```

### 2. OAuth Google

1. Rendez-vous sur [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Créez ou sélectionnez un projet
3. **API et services → Identifiants → + CRÉER DES IDENTIFIANTS → ID client OAuth**
   - Si demandé, configurez d'abord l'**écran de consentement OAuth** :
     - Type d'utilisateur : **Externe** · Nom de l'application : `relay`
     - Portées : ajoutez `userinfo.email` et `userinfo.profile`
4. Complétez :
   - Type d'application : **Application Web**
   - **URI de redirection autorisés :**
     - `http://localhost:4321/api/auth/callback/google`
     - `https://relay.vercel.app/api/auth/callback/google`
5. Ajoutez dans `.env` :

```env
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

### 3. OAuth GitHub

GitHub n'autorise qu'**une seule URL de callback par OAuth App**, vous aurez donc besoin de **deux applications** : une pour localhost, une pour la production.

Rendez-vous sur [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps → Nouvelle OAuth App**

- **Callback de production :** `https://relay.vercel.app/api/auth/callback/github`
- **Callback local :** `http://localhost:4321/api/auth/callback/github`

---

## Configurer la base de données (MySQL)

L'application se replie sur localStorage lorsqu'aucune base de données n'est configurée, ce qui rend cette étape optionnelle pour le développement local. En production, elle est nécessaire si vous souhaitez que les URL courtes fonctionnent pour des utilisateurs autres que l'auteur.

### 1. Créer le schéma

Exécutez [`schema.sql`](./schema.sql) sur votre serveur MySQL :

```bash
mysql -u root -p < schema.sql
```

Cela crée la base de données `relay` et trois tables : `users`, `accounts`, `links`.

### 2. Créer un utilisateur dédié à l'application

```sql
CREATE USER 'relay_app'@'%' IDENTIFIED BY 'choisissez-un-mot-de-passe-fort';
GRANT SELECT, INSERT, UPDATE, DELETE ON relay.* TO 'relay_app'@'%';
FLUSH PRIVILEGES;
```

### 3. Ajouter la connexion dans `.env`

```env
DATABASE_HOST=votre-host-mysql
DATABASE_PORT=3306
DATABASE_USER=relay_app
DATABASE_PASSWORD=<le-mot-de-passe-de-létape-2>
DATABASE_NAME=relay
```

`src/lib/db.ts` expose un unique pool de connexions avec une limite basse (5) adaptée au serverless. Si `DATABASE_HOST` est vide, les routes API retournent immédiatement et l'application continue de fonctionner en mode localStorage uniquement.

> **Sécurité :** n'exposez **pas** le port 3306 à Internet. Restreignez l'accès via pare-feu aux plages d'IP de Vercel, placez une petite API HTTPS devant lui sur votre VPS, ou utilisez un driver géré (PlanetScale, Vercel Postgres, etc.).

---

## Déployer sur Vercel

L'adaptateur `@astrojs/vercel` est déjà configuré dans `astro.config.mjs`.

1. Poussez le projet sur GitHub
2. Rendez-vous sur [vercel.com/new](https://vercel.com/new) → importez le dépôt (Vercel détecte Astro automatiquement)
3. Ajoutez les variables d'environnement dans **Settings → Environment Variables** :

| Variable               | Valeur                                    |
| ---------------------- | ----------------------------------------- |
| `AUTH_SECRET`          | résultat de `openssl rand -base64 32`     |
| `AUTH_TRUST_HOST`      | `true`                                    |
| `GOOGLE_CLIENT_ID`     | votre ID client Google                    |
| `GOOGLE_CLIENT_SECRET` | votre secret client Google                |
| `GITHUB_CLIENT_ID`     | votre ID client GitHub (production)       |
| `GITHUB_CLIENT_SECRET` | votre secret client GitHub                |
| `DATABASE_HOST`        | votre host MySQL                          |
| `DATABASE_PORT`        | `3306`                                    |
| `DATABASE_USER`        | `relay_app`                                |
| `DATABASE_PASSWORD`    | le mot de passe de l'utilisateur de l'app |
| `DATABASE_NAME`        | `relay`                                    |

4. Après avoir ajouté les variables, redéployez depuis **Deployments → ⋯ → Redeploy**

Vérifiez que les URI de callback dans Google et GitHub correspondent exactement :

- `https://relay.vercel.app/api/auth/callback/google`
- `https://relay.vercel.app/api/auth/callback/github`

---

## Variables d'environnement

| Variable               | Requise | Description                                                        |
| ---------------------- | :-----: | ------------------------------------------------------------------ |
| `AUTH_SECRET`          |    ✓    | Secret de signature des cookies. Générer avec `openssl`.           |
| `AUTH_TRUST_HOST`      |    ✓    | Définir à `true` pour Vercel.                                      |
| `GOOGLE_CLIENT_ID`     |    —    | OAuth Google. Sans cela, mode démo.                                |
| `GOOGLE_CLIENT_SECRET` |    —    | OAuth Google.                                                      |
| `GITHUB_CLIENT_ID`     |    —    | OAuth GitHub. Sans cela, mode démo.                                |
| `GITHUB_CLIENT_SECRET` |    —    | OAuth GitHub.                                                      |
| `DATABASE_HOST`        |    —    | Host MySQL. Sans cela, les liens n'existent que dans localStorage. |
| `DATABASE_PORT`        |    —    | Port MySQL. Par défaut `3306`.                                     |
| `DATABASE_USER`        |    —    | Utilisateur MySQL avec accès lecture/écriture sur `relay.*`.        |
| `DATABASE_PASSWORD`    |    —    | Mot de passe pour `DATABASE_USER`.                                 |
| `DATABASE_NAME`        |    —    | Nom de la base de données MySQL. Par défaut `relay`.                |

Si `GOOGLE_CLIENT_ID` **ou** `GITHUB_CLIENT_ID` est absent, l'application entre automatiquement en mode démo (logique dans `src/pages/index.astro` et `src/pages/dashboard.astro`).

---

## Structure du projet

```
src/
├── components/
│   ├── ui/                   ← shadcn (radix-vega) : button, dialog, input, label,
│   │                             textarea, card, separator, avatar, dropdown-menu
│   ├── Wordmark.tsx           ← logo « relay »
│   ├── ThemeToggle.tsx        ← clair/sombre avec persistance
│   ├── AuthDialog.tsx         ← OAuth Google + GitHub (réel ou démo)
│   ├── CreateLinkDialog.tsx
│   ├── Landing.tsx            ← page d'accueil minimaliste
│   └── Dashboard.tsx          ← onglets Links et Configuration
├── lib/
│   ├── auth.ts                ← types de session + helpers, fallback démo
│   ├── db.ts                  ← pool MySQL + helpers query/execute
│   ├── repo.ts                ← accès aux données côté serveur (utilisateurs + liens)
│   ├── links.ts               ← API client hybride : localStorage ou HTTP → DB
│   ├── preferences.ts         ← préférences utilisateur
│   └── utils.ts               ← helper cn()
├── layouts/Layout.astro       ← SEO complet : OG, Twitter Card, JSON-LD, canonical
├── pages/
│   ├── index.astro            ← serveur : session ? → /dashboard
│   ├── dashboard.astro        ← serveur : pas de session ? → /
│   ├── [slug].astro           ← redirection serveur avec requête DB
│   └── api/
│       ├── me.ts              ← profil + mises à jour du workspace
│       └── links/             ← lister / créer / mettre à jour / supprimer / migrer
└── styles/global.css          ← thème radix-vega (non modifié)

auth.config.ts                 ← configuration Auth.js (Google + GitHub)
astro.config.mjs               ← output: 'server' + adapter: vercel
schema.sql                     ← schéma MySQL pour users / accounts / links
.env.example                   ← variables d'environnement requises
```

---

## Notes techniques

- **Les utilisateurs anonymes** peuvent créer jusqu'à **10 liens gratuits** (voir `ANONYMOUS_LINK_LIMIT` dans `src/lib/links.ts`). Au-delà, ils doivent se connecter. À la première connexion, les liens anonymes sont migrés vers la base de données via `POST /api/links/migrate`.
- **Le routage de stockage** se trouve dans `src/lib/links.ts`. L'indicateur `isAuthenticated` choisit entre `localStorage` (anonyme) et les endpoints HTTP `/api/links` (qui communiquent avec MySQL via `src/lib/repo.ts`).
- **Le pool de connexions** est géré dans `src/lib/db.ts` avec un unique pool partagé (`connectionLimit: 5`). Un pool par instance serveur est réutilisé entre les requêtes, ce qui est adapté aux démarrages à froid en environnement serverless.
- **Auth.js** gère l'intégralité du flux OAuth, y compris les cookies signés et les sessions. La route `/api/auth/*` est injectée automatiquement par `auth-astro`. À chaque connexion, `upsertUserFromOAuth` (dans `repo.ts`) trouve ou crée la ligne utilisateur correspondante.
- **Le thème clair/sombre** est appliqué avant le rendu grâce à un script inline dans `Layout.astro` pour éviter le flash blanc.
- **L'avatar utilisateur** provient du fournisseur OAuth (`picture` / `avatar_url` → champ `image` dans la session Auth.js). En mode démo, un fallback déterministe est utilisé.
- **Le SEO** est centralisé dans `Layout.astro` : titre et description par page, Open Graph (`/relay.png`), Twitter Card, URL canonique, JSON-LD et un indicateur `noindex` pour les pages privées comme le tableau de bord.

---

## Licence

[MIT](./LICENSE) — libre d'utilisation, de modification et de distribution.
