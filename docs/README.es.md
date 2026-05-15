<div align="center">

# relay

**Un acortador de URL rápido, gratuito y de código abierto.**

[![Licencia: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Construido con Astro](https://img.shields.io/badge/Built%20with-Astro-ff5d01.svg)](https://astro.build)
[![Código Abierto](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-green.svg)](https://github.com/cristhobal/relay)

![Vista previa de relay](https://i.postimg.cc/BQjpN6Vy/relay.png)

🔗 **Demo en vivo:** [relay.vercel.app](https://relay.vercel.app) &nbsp;·&nbsp; ⭐ **GitHub:** [cristhobal/relay](https://github.com/cristhobal/relay)

</div>

---

### Idiomas disponibles

[🇺🇸 English](./README.md) · [🇨🇳 中文](./docs/README.zh.md) · [🇮🇳 हिन्दी](./docs/README.hi.md) · [🇪🇸 Español](./docs/README.es.md) · [🇫🇷 Français](./docs/README.fr.md)

---

## Descripción general

**relay** es un acortador de URL minimalista construido con Astro, React, Tailwind v4 y shadcn/ui. Puedes comenzar a acortar enlaces de inmediato, sin necesidad de crear una cuenta. Inicia sesión con Google o GitHub para mantener tus enlaces en todos tus dispositivos; los enlaces anónimos que hayas creado se migran automáticamente a tu cuenta.

Las URL cortas se resuelven desde una **base de datos MySQL** cuando está configurada, por lo que los enlaces que creas funcionan para cualquier persona, en cualquier dispositivo, no solo en tu navegador.

## Funcionalidades

- **Enlaces cortos instantáneos** — con slug personalizado o generado aleatoriamente (7 caracteres)
- **Modo anónimo** — hasta 10 enlaces sin iniciar sesión (almacenados en `localStorage`)
- **Enlaces persistentes** — cuando MySQL está configurado, los enlaces se resuelven entre dispositivos para cualquier usuario
- **Panel de control** — lista completa de tus enlaces con contadores de clics, y acciones de edición, eliminación y copia
- **Edición de enlaces** — cambia la URL de destino, el slug o la descripción en cualquier momento
- **Migración automática** — los enlaces anónimos se transfieren a tu cuenta en el primer inicio de sesión, sin pérdida de datos
- **Modo claro / oscuro** — preferencia persistida, sin parpadeo al cargar
- **Modo demo** — funciona completamente sin OAuth ni base de datos (usa una sesión simulada en `localStorage`)

## Cómo funciona el inicio de sesión

relay utiliza **Auth.js** (`auth-astro`) para OAuth con Google y GitHub:

1. El usuario hace clic en **Continuar con Google** o **Continuar con GitHub**
2. Auth.js redirige al proveedor y obtiene el perfil del usuario (`name`, `email`, `image`)
3. Auth.js crea una sesión firmada usando `AUTH_SECRET` y la almacena en una cookie
4. En cada solicitud, Astro lee la sesión en el servidor para decidir si mostrar `/` o `/dashboard`
5. En el primer inicio de sesión, los enlaces anónimos se migran automáticamente a la cuenta

Sin credenciales OAuth configuradas, la aplicación entra en **modo demo**: los botones crean una sesión simulada en `localStorage` para que puedas explorar el flujo completo. Un banner de "Modo demo" en el diálogo de inicio de sesión indica cuándo estás en este modo.

## Cómo funciona el almacenamiento

relay cuenta con **dos backends** que comparten la misma API asíncrona:

| Modo        | Backend                         | Cuándo se usa                              |
| ----------- | ------------------------------- | ------------------------------------------ |
| Anónimo     | `localStorage`                  | El usuario no ha iniciado sesión           |
| Autenticado | MySQL mediante las rutas de API | El usuario tiene una sesión real o de demo |

Cuando `DATABASE_HOST` está configurado, los enlaces de los usuarios autenticados se persisten en el servidor y la redirección pública (`/[slug]`) realiza una consulta a la base de datos, por lo que cualquier URL corta funciona desde cualquier navegador. Cuando la base de datos **no** está configurada, la aplicación recurre a localStorage para todos.

El esquema es pequeño (`users`, `accounts`, `links`) y se encuentra en [`schema.sql`](./schema.sql).

## Stack tecnológico

| Tecnología                                          | Rol                                              |
| --------------------------------------------------- | ------------------------------------------------ |
| **Astro 6** (`output: server` + adaptador Vercel)   | Framework principal / SSR                        |
| **React 19**                                        | Componentes de cliente interactivos              |
| **Tailwind v4** + **shadcn/ui** (tema `radix-vega`) | Estilos y componentes de interfaz                |
| **Auth.js** mediante `auth-astro`                   | OAuth con Google y GitHub                        |
| **MySQL** (`mysql2`)                                | Almacenamiento persistente de usuarios y enlaces |
| **localStorage**                                    | Modo anónimo + caché de preferencias             |

## Código abierto

Este proyecto es **gratuito y de código abierto** bajo la **licencia MIT**. Puedes:

- Desplegarlo tal como está en tu propio dominio
- Modificarlo y adaptarlo a tus necesidades
- Contribuir con mejoras, correcciones o nuevas funcionalidades
- Bifurcarlo y construir tu propia versión

Sin restricciones de ningún tipo. Si lo usas o adaptas, ¡siempre se agradece una mención! 🙌

---

## Primeros pasos

### Ejecutar localmente

```bash
npm install
cp .env.example .env    # luego completa las variables (ver más abajo)
npm run dev
```

La aplicación se abre en `http://localhost:4321`. Sin las variables de OAuth y base de datos, se ejecuta en **modo demo** — flujo completo, sin configuración adicional.

---

## Configurar OAuth real

### 1. Generar `AUTH_SECRET`

Auth.js usa este secreto para firmar las cookies de sesión.

```bash
openssl rand -base64 32
```

Agrega el resultado a `.env`:

```env
AUTH_SECRET=<resultado-de-openssl>
AUTH_TRUST_HOST=true
```

### 2. OAuth con Google

1. Ve a [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Crea o selecciona un proyecto
3. **APIs y servicios → Credenciales → + CREAR CREDENCIALES → ID de cliente de OAuth**
   - Si se te solicita, configura primero la **pantalla de consentimiento de OAuth**:
     - Tipo de usuario: **Externo** · Nombre de la app: `relay`
     - Alcances: agrega `userinfo.email` y `userinfo.profile`
4. Completa:
   - Tipo de aplicación: **Aplicación web**
   - **URIs de redireccionamiento autorizados:**
     - `http://localhost:4321/api/auth/callback/google`
     - `https://relay.vercel.app/api/auth/callback/google`
5. Agrega a `.env`:

```env
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

### 3. OAuth con GitHub

GitHub solo permite **una URL de callback por OAuth App**, por lo que necesitarás **dos apps**: una para localhost y otra para producción.

Ve a [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps → Nueva OAuth App**

- **Callback de producción:** `https://relay.vercel.app/api/auth/callback/github`
- **Callback local:** `http://localhost:4321/api/auth/callback/github`

---

## Configurar la base de datos (MySQL)

La aplicación recurre a localStorage cuando no hay base de datos configurada, por lo que este paso es opcional para el desarrollo local. En producción es necesario si deseas que las URL cortas funcionen para usuarios distintos al autor.

### 1. Crear el esquema

Ejecuta [`schema.sql`](./schema.sql) en tu servidor MySQL:

```bash
mysql -u root -p < schema.sql
```

Esto crea la base de datos `relay` y tres tablas: `users`, `accounts`, `links`.

### 2. Crear un usuario dedicado para la aplicación

```sql
CREATE USER 'relay_app'@'%' IDENTIFIED BY 'elige-una-contraseña-segura';
GRANT SELECT, INSERT, UPDATE, DELETE ON relay.* TO 'relay_app'@'%';
FLUSH PRIVILEGES;
```

### 3. Agregar la conexión a `.env`

```env
DATABASE_HOST=tu-host-mysql
DATABASE_PORT=3306
DATABASE_USER=relay_app
DATABASE_PASSWORD=<la-contraseña-del-paso-2>
DATABASE_NAME=relay
```

`src/lib/db.ts` expone un único pool de conexiones con un límite bajo (5) adecuado para entornos serverless. Si `DATABASE_HOST` está vacío, las rutas de API retornan de inmediato y la aplicación sigue funcionando en modo solo-localStorage.

> **Seguridad:** **no** expongas el puerto 3306 a internet público. Restringe el acceso mediante firewall a los rangos de IP de Vercel, coloca una pequeña API HTTPS frente a él en tu VPS, o usa un driver administrado (PlanetScale, Vercel Postgres, etc.).

---

## Desplegar en Vercel

El adaptador `@astrojs/vercel` ya está configurado en `astro.config.mjs`.

1. Sube el proyecto a GitHub
2. Ve a [vercel.com/new](https://vercel.com/new) → importa el repositorio (Vercel detecta Astro automáticamente)
3. Agrega las variables de entorno en **Settings → Environment Variables**:

| Variable               | Valor                                   |
| ---------------------- | --------------------------------------- |
| `AUTH_SECRET`          | resultado de `openssl rand -base64 32`  |
| `AUTH_TRUST_HOST`      | `true`                                  |
| `GOOGLE_CLIENT_ID`     | tu ID de cliente de Google              |
| `GOOGLE_CLIENT_SECRET` | tu secreto de cliente de Google         |
| `GITHUB_CLIENT_ID`     | tu ID de cliente de GitHub (producción) |
| `GITHUB_CLIENT_SECRET` | tu secreto de cliente de GitHub         |
| `DATABASE_HOST`        | tu host MySQL                           |
| `DATABASE_PORT`        | `3306`                                  |
| `DATABASE_USER`        | `relay_app`                              |
| `DATABASE_PASSWORD`    | la contraseña del usuario de la app     |
| `DATABASE_NAME`        | `relay`                                  |

4. Después de agregar las variables, vuelve a desplegar desde **Deployments → ⋯ → Redeploy**

Verifica que los URIs de callback en Google y GitHub coincidan exactamente:

- `https://relay.vercel.app/api/auth/callback/google`
- `https://relay.vercel.app/api/auth/callback/github`

---

## Variables de entorno

| Variable               | Requerida | Descripción                                                   |
| ---------------------- | :-------: | ------------------------------------------------------------- |
| `AUTH_SECRET`          |     ✓     | Secreto para firmar cookies. Generar con `openssl`.           |
| `AUTH_TRUST_HOST`      |     ✓     | Establecer en `true` para Vercel.                             |
| `GOOGLE_CLIENT_ID`     |     —     | OAuth de Google. Sin esto, modo demo.                         |
| `GOOGLE_CLIENT_SECRET` |     —     | OAuth de Google.                                              |
| `GITHUB_CLIENT_ID`     |     —     | OAuth de GitHub. Sin esto, modo demo.                         |
| `GITHUB_CLIENT_SECRET` |     —     | OAuth de GitHub.                                              |
| `DATABASE_HOST`        |     —     | Host MySQL. Sin esto, los enlaces viven solo en localStorage. |
| `DATABASE_PORT`        |     —     | Puerto MySQL. Por defecto `3306`.                             |
| `DATABASE_USER`        |     —     | Usuario MySQL con acceso de lectura/escritura en `relay.*`.    |
| `DATABASE_PASSWORD`    |     —     | Contraseña para `DATABASE_USER`.                              |
| `DATABASE_NAME`        |     —     | Nombre de la base de datos MySQL. Por defecto `relay`.         |

Si `GOOGLE_CLIENT_ID` **o** `GITHUB_CLIENT_ID` no están presentes, la aplicación entra en modo demo automáticamente (lógica en `src/pages/index.astro` y `src/pages/dashboard.astro`).

---

## Estructura del proyecto

```
src/
├── components/
│   ├── ui/                   ← shadcn (radix-vega): button, dialog, input, label,
│   │                             textarea, card, separator, avatar, dropdown-menu
│   ├── Wordmark.tsx           ← logo "relay"
│   ├── ThemeToggle.tsx        ← claro/oscuro con persistencia
│   ├── AuthDialog.tsx         ← OAuth de Google + GitHub (real o demo)
│   ├── CreateLinkDialog.tsx
│   ├── Landing.tsx            ← página de inicio minimalista
│   └── Dashboard.tsx          ← pestañas de Links y Configuración
├── lib/
│   ├── auth.ts                ← tipos de sesión + helpers, fallback de demo
│   ├── db.ts                  ← pool MySQL + helpers query/execute
│   ├── repo.ts                ← acceso a datos en el servidor (usuarios + enlaces)
│   ├── links.ts               ← API cliente híbrida: localStorage o HTTP → DB
│   ├── preferences.ts         ← preferencias del usuario
│   └── utils.ts               ← helper cn()
├── layouts/Layout.astro       ← SEO completo: OG, Twitter Card, JSON-LD, canonical
├── pages/
│   ├── index.astro            ← servidor: ¿sesión? → /dashboard
│   ├── dashboard.astro        ← servidor: ¿sin sesión? → /
│   ├── [slug].astro           ← redirección en servidor usando consulta a DB
│   └── api/
│       ├── me.ts              ← perfil + actualizaciones del workspace
│       └── links/             ← listar / crear / actualizar / eliminar / migrar
└── styles/global.css          ← tema radix-vega (sin modificar)

auth.config.ts                 ← configuración de Auth.js (Google + GitHub)
astro.config.mjs               ← output: 'server' + adapter: vercel
schema.sql                     ← esquema MySQL para users / accounts / links
.env.example                   ← variables de entorno requeridas
```

---

## Notas técnicas

- **Los usuarios anónimos** pueden crear hasta **10 enlaces gratuitos** (ver `ANONYMOUS_LINK_LIMIT` en `src/lib/links.ts`). Después de eso deben iniciar sesión. En el primer inicio de sesión, los enlaces anónimos se migran a la base de datos mediante `POST /api/links/migrate`.
- **El enrutamiento de almacenamiento** está en `src/lib/links.ts`. El indicador `isAuthenticated` elige entre `localStorage` (anónimo) y los endpoints HTTP de `/api/links` (que se comunican con MySQL a través de `src/lib/repo.ts`).
- **El pool de conexiones** se gestiona en `src/lib/db.ts` con un único pool compartido (`connectionLimit: 5`). Un pool por instancia del servidor se reutiliza entre solicitudes, lo cual es compatible con los arranques en frío de entornos serverless.
- **Auth.js** gestiona todo el flujo OAuth, incluyendo cookies firmadas y sesiones. La ruta `/api/auth/*` es inyectada por `auth-astro` automáticamente. En cada inicio de sesión, `upsertUserFromOAuth` (en `repo.ts`) busca o crea la fila de usuario correspondiente.
- **El tema claro/oscuro** se aplica antes del pintado mediante un script en línea en `Layout.astro` para evitar el parpadeo blanco.
- **El avatar del usuario** proviene del proveedor de OAuth (`picture` / `avatar_url` → campo `image` en la sesión de Auth.js). En modo demo se usa un fallback determinístico.
- **El SEO** está centralizado en `Layout.astro`: título y descripción por página, Open Graph (`/relay.png`), Twitter Card, URL canónica, JSON-LD y un indicador `noindex` para páginas privadas como el panel de control.

---

## Licencia

[MIT](./LICENSE) — libre para usar, modificar y distribuir.
