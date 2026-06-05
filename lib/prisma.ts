import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  return new PrismaClient().$extends({
    name: "guarded-prisma-queries",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          try {
            return await query(args);
          } catch (error) {
            console.error(`Prisma query failed: ${model}.${operation}`, error);
            throw error;
          }
        }
      }
    }
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
