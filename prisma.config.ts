import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 moved the datasource connection out of schema.prisma into this file.
// process.env (not env()) is used so `prisma generate` works even when no
// connection URL is set yet — the URL is only needed for migrate/seed/studio.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // DIRECT_URL (port 5432) for CLI migrations; falls back to DATABASE_URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
