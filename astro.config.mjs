// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import auth from "auth-astro";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  site: "https://withrelay.vercel.app",
  output: "server",
  adapter: vercel(),
  integrations: [react(), auth()],
  vite: {
    plugins: [tailwindcss()],
  },
});
