import { PrismaClient } from "@prisma/client";

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
