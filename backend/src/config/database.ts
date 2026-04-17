import { PrismaClient } from "@prisma/client";
import { isDev } from "./env.js";

// Re-use a single Prisma client across the process.
// In development tsx-watch triggers re-imports; a global cache prevents
// "too many clients" warnings on hot reload.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev ? ["query", "error", "warn"] : ["error"],
  });

if (isDev) {
  globalForPrisma.prisma = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
