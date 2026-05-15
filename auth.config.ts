import Google from "@auth/core/providers/google";
import GitHub from "@auth/core/providers/github";
import Discord from "@auth/core/providers/discord";
import { defineConfig } from "auth-astro";
import { dbConfigured } from "@/shared/database/mysql";
import { upsertUserFromOAuth } from "@/users/infrastructure/user-repository";

export default defineConfig({
  providers: [
    Google({
      clientId: import.meta.env.GOOGLE_CLIENT_ID,
      clientSecret: import.meta.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: import.meta.env.GITHUB_CLIENT_ID,
      clientSecret: import.meta.env.GITHUB_CLIENT_SECRET,
    }),
    Discord({
      clientId: import.meta.env.DISCORD_CLIENT_ID,
      clientSecret: import.meta.env.DISCORD_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Persist the user in MySQL on every sign-in (upsert).
      // If the DB isn't configured, skip silently — sessions still work.
      if (!dbConfigured()) return true;
      if (!account || !user.email) return true;
      try {
        const dbUser = await upsertUserFromOAuth({
          email: user.email,
          name: user.name,
          image: user.image,
          provider: account.provider,
          providerAccountId: String(account.providerAccountId),
        });
        // Stash internal user ID on the user object for the jwt callback below
        (user as any).dbId = dbUser.id;
      } catch (err) {
        console.error("[auth] upsertUserFromOAuth failed:", err);
        // Block sign-in when the DB is configured but the upsert fails.
        // Failing open would issue a session whose user.id is token.sub
        // (the OAuth provider's raw subject ID), which never matches any row
        // in the users table (stored with nanoid IDs) — causing silent 404s
        // on every subsequent API call (GET /api/me, PATCH/DELETE /api/links).
        return false;
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // First sign-in this session: stash internal id + provider on the token
        (token as any).dbId = (user as any).dbId;
      }
      if (account) {
        (token as any).provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).dbId ?? token.sub;
      }
      (session as any).provider = (token as any).provider;
      return session;
    },
  },
});
