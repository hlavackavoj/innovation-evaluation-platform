import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type KindeRoleLike = { key?: string | null; name?: string | null };

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
    return [...direct, ...collectRoleKeys(role.value)];
  }

  return [];
}

function resolveRoleFromSources(...sources: unknown[]): UserRole {
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

function roleRank(role: UserRole): number {
  switch (role) {
    case "ADMIN":
      return 5;
    case "MANAGER":
      return 4;
    case "EVALUATOR":
      return 3;
    case "USER":
      return 2;
    case "VIEWER":
    default:
      return 1;
  }
}

function resolveHighestRole(...roles: UserRole[]): UserRole {
  return roles.reduce((best, current) => (roleRank(current) > roleRank(best) ? current : best), "VIEWER");
}

function resolveBootstrapAdminRole(email: string, currentRole: UserRole): UserRole {
  if (currentRole === "ADMIN") {
    return currentRole;
  }

  const configured = process.env.BOOTSTRAP_ADMIN_EMAILS;
  if (!configured || configured.trim().length === 0) {
    return currentRole;
  }
  const adminEmails = configured
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.includes(email.toLowerCase())) {
    return "ADMIN";
  }

  return currentRole;
}

export async function getCurrentUser() {
  const { getUser } = getKindeServerSession();
  const kindeUser = await getUser();
  const email = kindeUser?.email?.trim().toLowerCase();

  if (!email) {
    return null;
  }

  return prisma.user.findUnique({
    where: { email }
  });
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
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { role: true }
  });
  const mergedRole = resolveHighestRole(existingUser?.role ?? "VIEWER", mappedRole);
  const dbRole = resolveBootstrapAdminRole(email, mergedRole);
  const fallbackName = kindeUser?.email?.split("@")[0] ?? "Kinde User";
  const resolvedName = `${firstName} ${lastName}`.trim() || kindeUser?.username || fallbackName;

  // NOTE: Current Prisma model has no `kindeId` unique column yet.
  // Upsert is therefore keyed by `email` until schema is extended.
  return prisma.user.upsert({
    where: { email },
    update: {
      name: resolvedName,
      role: dbRole
    },
    create: {
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
