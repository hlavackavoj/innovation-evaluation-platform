import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl || databaseUrl.trim().length === 0) {
  console.error(
    "[Prisma] DATABASE_URL is missing or empty. Set an unprefixed DATABASE_URL for this environment."
  );
}

// Use globalThis so the instance survives both Next.js HMR (dev) and
// Lambda container reuse (prod/Vercel), preventing connection exhaustion.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

globalForPrisma.prisma = prisma;
