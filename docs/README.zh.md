<div align="center">

# relay

**一款快速、免费且开源的短链接服务。**

[![许可证: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![基于 Astro 构建](https://img.shields.io/badge/Built%20with-Astro-ff5d01.svg)](https://astro.build)
[![开源](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-green.svg)](https://github.com/cristhobal/relay)

![relay 预览](https://i.postimg.cc/BQjpN6Vy/relay.png)

🔗 **在线演示：** [relay.vercel.app](https://relay.vercel.app) &nbsp;·&nbsp; ⭐ **GitHub：** [cristhobal/relay](https://github.com/cristhobal/relay)

</div>

---

### 可用语言

[🇺🇸 English](./README.md) · [🇨🇳 中文](./docs/README.zh.md) · [🇮🇳 हिन्दी](./docs/README.hi.md) · [🇪🇸 Español](./docs/README.es.md) · [🇫🇷 Français](./docs/README.fr.md)

---

## 概述

**relay** 是一款基于 Astro、React、Tailwind v4 和 shadcn/ui 构建的极简短链接服务。无需注册账户即可立即开始缩短链接。使用 Google 或 GitHub 登录，可跨设备保存您的链接，以匿名方式创建的链接将自动迁移到您的账户。

配置 **MySQL 数据库** 后，短链接将从数据库中解析，因此您创建的链接可在任何设备上、任何人都能正常使用，而不仅限于您自己的浏览器。

## 功能特性

- **即时短链接** — 自定义 slug 或随机生成（7 个字符）
- **匿名模式** — 无需登录，最多创建 10 个链接（存储在 `localStorage` 中）
- **持久链接** — 配置 MySQL 后，链接可跨设备为所有人解析
- **控制台** — 完整的链接列表，包含点击计数、编辑、删除和复制操作
- **链接编辑** — 随时更改目标 URL、slug 或描述
- **自动迁移** — 首次登录时，匿名链接自动转移到账户中，不会丢失任何内容
- **浅色 / 深色模式** — 持久化偏好设置，加载时无闪烁
- **演示模式** — 无需 OAuth 或数据库即可完整运行（使用 `localStorage` 中的模拟会话）

## 登录工作原理

relay 使用 **Auth.js**（`auth-astro`）通过 Google 和 GitHub 进行 OAuth 认证：

1. 用户点击**使用 Google 继续**或**使用 GitHub 继续**
2. Auth.js 重定向至提供商并获取用户资料（`name`、`email`、`image`）
3. Auth.js 使用 `AUTH_SECRET` 创建已签名会话并将其存储在 Cookie 中
4. 每次请求时，Astro 在服务端读取会话，以决定显示 `/` 还是 `/dashboard`
5. 首次登录时，匿名链接自动迁移至账户

未配置 OAuth 凭据时，应用将进入**演示模式**：按钮会在 `localStorage` 中创建模拟会话，便于您探索完整流程。登录对话框中的"演示模式"横幅会提示您当前处于此模式。

## 存储工作原理

relay 拥有**两个后端**，共享同一套异步 API：

| 模式   | 后端                    | 使用场景               |
| ------ | ----------------------- | ---------------------- |
| 匿名   | `localStorage`          | 用户未登录             |
| 已认证 | 通过 API 路由访问 MySQL | 用户拥有真实或演示会话 |

设置 `DATABASE_HOST` 后，已登录用户的链接将持久化至服务端，公开重定向（`/[slug]`）通过数据库查询解析，使任何短链接均可从任意浏览器正常访问。未配置数据库时，应用对所有人回退至 localStorage。

数据库模式简洁（`users`、`accounts`、`links`），位于 [`schema.sql`](./schema.sql)。

## 技术栈

| 技术                                                 | 作用                   |
| ---------------------------------------------------- | ---------------------- |
| **Astro 6**（`output: server` + Vercel 适配器）      | 核心框架 / SSR         |
| **React 19**                                         | 交互式客户端组件       |
| **Tailwind v4** + **shadcn/ui**（`radix-vega` 主题） | 样式与 UI 组件         |
| **Auth.js** 通过 `auth-astro`                        | Google 和 GitHub OAuth |
| **MySQL**（`mysql2`）                                | 用户和链接的持久化存储 |
| **localStorage**                                     | 匿名模式 + 偏好缓存    |

## 开源

本项目在 **MIT 许可证** 下**免费且开源**。您可以：

- 按原样部署到您自己的域名
- 根据需求修改和定制
- 贡献改进、修复或新功能
- Fork 并构建您自己的版本

没有任何限制。如果您使用或改编了本项目，欢迎注明出处！🙌

---

## 快速开始

### 本地运行

```bash
npm install
cp .env.example .env    # 然后填写变量（见下文）
npm run dev
```

应用将在 `http://localhost:4321` 打开。未配置 OAuth 和数据库变量时，以**演示模式**运行 — 完整流程，无需任何配置。

---

## 配置真实 OAuth

### 1. 生成 `AUTH_SECRET`

Auth.js 使用此密钥对会话 Cookie 进行签名。

```bash
openssl rand -base64 32
```

将结果添加至 `.env`：

```env
AUTH_SECRET=<openssl 的输出>
AUTH_TRUST_HOST=true
```

### 2. Google OAuth

1. 前往 [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. 创建或选择一个项目
3. **API 和服务 → 凭据 → + 创建凭据 → OAuth 客户端 ID**
   - 如有提示，请先配置 **OAuth 同意屏幕**：
     - 用户类型：**外部** · 应用名称：`relay`
     - 范围：添加 `userinfo.email` 和 `userinfo.profile`
4. 填写：
   - 应用类型：**Web 应用**
   - **已授权的重定向 URI：**
     - `http://localhost:4321/api/auth/callback/google`
     - `https://relay.vercel.app/api/auth/callback/google`
5. 添加至 `.env`：

```env
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

### 3. GitHub OAuth

GitHub 每个 OAuth App 只允许**一个回调 URL**，因此您需要**两个应用**：一个用于本地，一个用于生产环境。

前往 [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps → 新建 OAuth App**

- **生产环境回调：** `https://relay.vercel.app/api/auth/callback/github`
- **本地回调：** `http://localhost:4321/api/auth/callback/github`

---

## 配置数据库（MySQL）

未配置数据库时，应用回退至 localStorage，因此本地开发时此步骤为可选。若希望短链接对非作者用户也可用，生产环境中则为必须。

### 1. 创建数据库结构

在 MySQL 服务器上运行 [`schema.sql`](./schema.sql)：

```bash
mysql -u root -p < schema.sql
```

这将创建 `relay` 数据库和三张表：`users`、`accounts`、`links`。

### 2. 创建专用应用用户

```sql
CREATE USER 'relay_app'@'%' IDENTIFIED BY '选择一个强密码';
GRANT SELECT, INSERT, UPDATE, DELETE ON relay.* TO 'relay_app'@'%';
FLUSH PRIVILEGES;
```

### 3. 将连接信息添加至 `.env`

```env
DATABASE_HOST=您的-mysql-主机
DATABASE_PORT=3306
DATABASE_USER=relay_app
DATABASE_PASSWORD=<第 2 步的密码>
DATABASE_NAME=relay
```

`src/lib/db.ts` 提供了一个连接限制较低（5）的单一连接池，适合 Serverless 环境。若 `DATABASE_HOST` 为空，API 路由将提前返回，应用继续以纯 localStorage 模式运行。

> **安全提示：** 请**勿**将 3306 端口暴露至公网。通过防火墙将访问限制在 Vercel 的 IP 范围内，在 VPS 上前置一个小型 HTTPS API，或使用托管驱动（PlanetScale、Vercel Postgres 等）。

---

## 部署至 Vercel

`@astrojs/vercel` 适配器已在 `astro.config.mjs` 中配置完毕。

1. 将项目推送至 GitHub
2. 前往 [vercel.com/new](https://vercel.com/new) → 导入仓库（Vercel 自动检测 Astro）
3. 在 **Settings → Environment Variables** 中添加环境变量：

| 变量                   | 值                                |
| ---------------------- | --------------------------------- |
| `AUTH_SECRET`          | `openssl rand -base64 32` 的输出  |
| `AUTH_TRUST_HOST`      | `true`                            |
| `GOOGLE_CLIENT_ID`     | 您的 Google 客户端 ID             |
| `GOOGLE_CLIENT_SECRET` | 您的 Google 客户端密钥            |
| `GITHUB_CLIENT_ID`     | 您的 GitHub 客户端 ID（生产环境） |
| `GITHUB_CLIENT_SECRET` | 您的 GitHub 客户端密钥            |
| `DATABASE_HOST`        | 您的 MySQL 主机                   |
| `DATABASE_PORT`        | `3306`                            |
| `DATABASE_USER`        | `relay_app`                        |
| `DATABASE_PASSWORD`    | 应用用户密码                      |
| `DATABASE_NAME`        | `relay`                            |

4. 添加变量后，从 **Deployments → ⋯ → Redeploy** 重新部署

确认 Google 和 GitHub 中的回调 URI 完全匹配：

- `https://relay.vercel.app/api/auth/callback/google`
- `https://relay.vercel.app/api/auth/callback/github`

---

## 环境变量

| 变量                   | 必填 | 描述                                             |
| ---------------------- | :--: | ------------------------------------------------ |
| `AUTH_SECRET`          |  ✓   | Cookie 签名密钥，使用 `openssl` 生成。           |
| `AUTH_TRUST_HOST`      |  ✓   | Vercel 环境设置为 `true`。                       |
| `GOOGLE_CLIENT_ID`     |  —   | Google OAuth。缺少时进入演示模式。               |
| `GOOGLE_CLIENT_SECRET` |  —   | Google OAuth。                                   |
| `GITHUB_CLIENT_ID`     |  —   | GitHub OAuth。缺少时进入演示模式。               |
| `GITHUB_CLIENT_SECRET` |  —   | GitHub OAuth。                                   |
| `DATABASE_HOST`        |  —   | MySQL 主机。缺少时链接仅存储在 localStorage 中。 |
| `DATABASE_PORT`        |  —   | MySQL 端口，默认 `3306`。                        |
| `DATABASE_USER`        |  —   | 拥有 `relay.*` 读写权限的 MySQL 用户。            |
| `DATABASE_PASSWORD`    |  —   | `DATABASE_USER` 的密码。                         |
| `DATABASE_NAME`        |  —   | MySQL 数据库名，默认 `relay`。                    |

若 `GOOGLE_CLIENT_ID` **或** `GITHUB_CLIENT_ID` 缺失，应用将自动进入演示模式（逻辑位于 `src/pages/index.astro` 和 `src/pages/dashboard.astro`）。

---

## 项目结构

```
src/
├── components/
│   ├── ui/                   ← shadcn (radix-vega)：button, dialog, input, label,
│   │                             textarea, card, separator, avatar, dropdown-menu
│   ├── Wordmark.tsx           ← "relay" 标志
│   ├── ThemeToggle.tsx        ← 浅色/深色切换（持久化）
│   ├── AuthDialog.tsx         ← Google + GitHub OAuth（真实或演示）
│   ├── CreateLinkDialog.tsx
│   ├── Landing.tsx            ← 极简首页
│   └── Dashboard.tsx          ← 链接与配置标签页
├── lib/
│   ├── auth.ts                ← 会话类型 + 辅助函数，演示回退
│   ├── db.ts                  ← MySQL 连接池 + query/execute 辅助函数
│   ├── repo.ts                ← 服务端数据访问（用户 + 链接）
│   ├── links.ts               ← 混合客户端 API：localStorage 或 HTTP → DB
│   ├── preferences.ts         ← 用户偏好设置
│   └── utils.ts               ← cn() 辅助函数
├── layouts/Layout.astro       ← 完整 SEO：OG、Twitter Card、JSON-LD、canonical
├── pages/
│   ├── index.astro            ← 服务端：有会话？→ /dashboard
│   ├── dashboard.astro        ← 服务端：无会话？→ /
│   ├── [slug].astro           ← 通过数据库查询的服务端重定向
│   └── api/
│       ├── me.ts              ← 个人资料 + 工作区更新
│       └── links/             ← 列表 / 创建 / 更新 / 删除 / 迁移
└── styles/global.css          ← radix-vega 主题（未修改）

auth.config.ts                 ← Auth.js 配置（Google + GitHub）
astro.config.mjs               ← output: 'server' + adapter: vercel
schema.sql                     ← users / accounts / links 的 MySQL 结构
.env.example                   ← 所需环境变量
```

---

## 技术说明

- **匿名用户**最多可创建 **10 个免费链接**（参见 `src/lib/links.ts` 中的 `ANONYMOUS_LINK_LIMIT`）。超出后需要登录。首次登录时，匿名链接通过 `POST /api/links/migrate` 迁移至数据库。
- **存储路由**位于 `src/lib/links.ts`。`isAuthenticated` 标志在 `localStorage`（匿名）和 `/api/links` HTTP 端点（通过 `src/lib/repo.ts` 与 MySQL 通信）之间进行选择。
- **连接池**在 `src/lib/db.ts` 中通过单一共享连接池（`connectionLimit: 5`）管理。每个服务端实例的连接池可跨请求复用，适合 Serverless 冷启动场景。
- **Auth.js** 处理整个 OAuth 流程，包括已签名 Cookie 和会话。`/api/auth/*` 路由由 `auth-astro` 自动注入。每次登录时，`upsertUserFromOAuth`（位于 `repo.ts`）查找或创建对应的用户行。
- **浅色/深色主题**通过 `Layout.astro` 中的内联脚本在绘制前应用，以避免白色闪烁。
- **用户头像**来自 OAuth 提供商（`picture` / `avatar_url` → Auth.js 会话中的 `image` 字段）。演示模式下使用确定性回退头像。
- **SEO** 集中在 `Layout.astro` 中：每页标题和描述、Open Graph（`/relay.png`）、Twitter Card、规范 URL、JSON-LD，以及用于仪表板等私有页面的 `noindex` 标志。

---

## 许可证

[MIT](./LICENSE) — 可自由使用、修改和分发。
