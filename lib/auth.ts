import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type KindeRoleLike = { key?: string | null; name?: string | null };

// Canonical P2022 guard per Architecture Standard §3
function isMissingColumn(error: unknown, column: string): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: unknown; meta?: { column?: unknown } };
  return e.code === "P2022" && e.meta?.column === column;
}

function collectRoleKeys(value: unknown): string[] {
  if (!value) return [];

  if (typeof value === "string") {
    return [value.toLowerCase()];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectRoleKeys(item));
  }

  if (typeof value === "object") {
    const role = value as KindeRoleLike & { value?: unknown };
    const direct = [role.key, role.name]
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.toLowerCase());
    const nestedValues = Object.values(value as Record<string, unknown>).flatMap((nested) => collectRoleKeys(nested));
    return [...direct, ...collectRoleKeys(role.value), ...nestedValues];
  }

  return [];
}

export function resolveRoleFromSources(...sources: unknown[]): UserRole {
  const roleKeys = [...new Set(sources.flatMap((source) => collectRoleKeys(source)))];

  if (roleKeys.some((key) => key.includes("owner") || key.includes("admin"))) {
    return "ADMIN";
  }

  if (roleKeys.some((key) => key.includes("manager"))) {
    return "MANAGER";
  }

  if (roleKeys.some((key) => key.includes("evaluator"))) {
    return "EVALUATOR";
  }

  return "VIEWER";
}

export function resolveBootstrapAdminRole(email: string, currentRole: UserRole): UserRole {
  if (currentRole === "ADMIN") {
    return currentRole;
  }

  const configured = [
    process.env.AUTH_FORCE_ADMIN_EMAIL,
    process.env.AUTH_EMERGENCY_ADMIN_EMAILS,
    process.env.BOOTSTRAP_ADMIN_EMAILS
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(",");

  const adminEmails = configured
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    console.warn("[auth][resolveBootstrapAdminRole] No bootstrap admin env vars configured; env-based admin escalation is disabled.");
  }

  if (adminEmails.includes(email.toLowerCase())) {
    return "ADMIN";
  }

  return currentRole;
}

export async function getCurrentUser() {
  const { getUser } = getKindeServerSession();
  const kindeUser = await getUser();
  const kindeId = kindeUser?.id?.trim() ?? "";
  const email = kindeUser?.email?.trim().toLowerCase();

  if (!kindeId && !email) {
    return null;
  }

  if (kindeId) {
    try {
      const userByKindeId = await prisma.user.findUnique({
        where: { kindeId }
      });
      if (userByKindeId) {
        return userByKindeId;
      }
    } catch (error) {
      if (!isMissingColumn(error, "User.kindeId")) {
        throw error;
      }
      console.warn("[auth][getCurrentUser] kindeId column missing (P2022). Falling back to email lookup.");
    }
  }

  if (!email) {
    return null;
  }

  return prisma.user.findUnique({ where: { email } });
}

export async function ensureUserInDb() {
  const { getUser, getRoles, getClaim } = getKindeServerSession();
  const [kindeUser, kindeRoles, rolesClaim] = await Promise.all([
    getUser(),
    getRoles(),
    getClaim("roles", "id_token")
  ]);
  const kindeId = kindeUser?.id?.trim() ?? "";
  const email = kindeUser?.email?.trim().toLowerCase();

  if (!kindeId || !email) {
    return null;
  }

  const firstName = kindeUser?.given_name?.trim() ?? "";
  const lastName = kindeUser?.family_name?.trim() ?? "";
  const mappedRole = resolveRoleFromSources(kindeRoles, rolesClaim?.value);
  const dbRole = resolveBootstrapAdminRole(email, mappedRole);

  if (dbRole === "ADMIN") {
    console.log(`[auth] User ${email} recognized as ADMIN - permissions granted.`);
  }

  const fallbackName = kindeUser?.email?.split("@")[0] ?? "Kinde User";
  const resolvedName = `${firstName} ${lastName}`.trim() || kindeUser?.username || fallbackName;
  const shouldDebugAuth = process.env.AUTH_DEBUG === "1";

  if (shouldDebugAuth) {
    console.log("[auth][ensureUserInDb] Kinde session payload", {
      kindeUser: {
        id: kindeUser?.id ?? null,
        email,
        givenName: kindeUser?.given_name ?? null,
        familyName: kindeUser?.family_name ?? null
      },
      rolesFromGetRoles: kindeRoles ?? null,
      rolesClaimFromIdToken: rolesClaim?.value ?? null,
      mappedRole,
      resolvedDbRole: dbRole
    });
  }

  return prisma.$transaction(async (tx) => {
    let existingByKindeId: { id: string } | null = null;
    let kindeIdColumnAvailable = true;

    try {
      existingByKindeId = await tx.user.findUnique({
        where: { kindeId },
        select: { id: true }
      });
    } catch (error) {
      if (!isMissingColumn(error, "User.kindeId")) {
        throw error;
      }
      kindeIdColumnAvailable = false;
      console.warn("[auth][ensureUserInDb] kindeId column missing (P2022). Using email-only sync path.");
    }

    if (existingByKindeId) {
      return tx.user.update({
        where: { id: existingByKindeId.id },
        data: {
          email,
          name: resolvedName,
          role: dbRole
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });
    }

    const existingByEmail = await tx.user.findUnique({
      where: { email }
    });

    if (existingByEmail) {
      return tx.user.update({
        where: { id: existingByEmail.id },
        data: {
          ...(kindeIdColumnAvailable ? { kindeId } : {}),
          name: resolvedName,
          role: dbRole
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });
    }

    return tx.user.create({
      data: {
        ...(kindeIdColumnAvailable ? { kindeId } : {}),
        email,
        name: resolvedName,
        role: dbRole
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });
  });
}
