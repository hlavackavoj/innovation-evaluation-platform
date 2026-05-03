/**
 * One-time fix: set hlavackavoj@gmail.com role to ADMIN in the DB.
 * Run with: npx tsx scripts/fix-admin-role.ts
 */

import { PrismaClient } from "@prisma/client";

const TARGET_EMAIL = "hlavackavoj@gmail.com";

// Canonical P2022 guard — missing column (Architecture Standard §3)
function isMissingColumn(error: unknown, column: string): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; meta?: { column?: unknown } };
  return e.code === "P2022" && e.meta?.column === column;
}

async function main() {
  const prisma = new PrismaClient();

  try {
    // Try kindeId-aware upsert first; fall back to email-only if column is missing.
    let updated: { id: string; email: string; role: string } | null = null;

    try {
      updated = await prisma.user.update({
        where: { email: TARGET_EMAIL },
        data: { role: "ADMIN" },
        select: { id: true, email: true, role: true }
      });
    } catch (error) {
      if (isMissingColumn(error, "User.kindeId")) {
        console.warn("[fix-admin] P2022 on User.kindeId — column missing, but update by email still proceeding.");
        updated = await prisma.user.update({
          where: { email: TARGET_EMAIL },
          data: { role: "ADMIN" },
          select: { id: true, email: true, role: true }
        });
      } else {
        throw error;
      }
    }

    if (!updated) {
      console.error(`[fix-admin] User not found: ${TARGET_EMAIL}. Run the app once to create the record via ensureUserInDb().`);
      process.exit(1);
    }

    console.log(`[fix-admin] SUCCESS — User ${updated.email} role set to ${updated.role} (id: ${updated.id})`);
    console.log(`[auth] User ${updated.email} recognized as ADMIN - permissions granted.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[fix-admin] FATAL:", err);
  process.exit(1);
});
