import { defineConfig } from "prisma/config";

process.env.DATABASE_URL ||= "postgresql://postgres:postgres@localhost:5432/stalltalk?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
