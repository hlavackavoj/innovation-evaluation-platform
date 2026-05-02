import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import type { UserRole } from "@prisma/client";
import { ensureUserInDb } from "@/lib/auth";

export type PermissionResult =
  | {
      allowed: true;
      source: "kinde" | "db-role" | "system";
      role?: string;
    }
  | {
      allowed: false;
      reason: "unauthenticated" | "missing_permission" | "unknown";
      source?: "kinde" | "db-role" | "default-deny";
      role?: string;
    };

export type CrmPermission = "crm:modify" | "crm:manage_templates";

type PermissionClaimLike = { key?: string | null; name?: string | null; value?: unknown };

const crmPermissionMap: Record<CrmPermission, string[]> = {
  "crm:modify": ["crm:write", "crm:modify", "crm.records.write", "projects:create", "projects:write"],
  "crm:manage_templates": ["crm:admin", "crm:templates:write", "templates:write"]
};

function collectPermissionKeys(value: unknown): string[] {
  if (!value) return [];

  if (typeof value === "string") {
    return value
      .split(/[\s,]+/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectPermissionKeys(item));
  }

  if (typeof value === "object") {
    const permission = value as PermissionClaimLike;
    const direct = [permission.key, permission.name]
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.toLowerCase());
    return [...direct, ...collectPermissionKeys(permission.value)];
  }

  return [];
}

function hasDbRolePermission(role: UserRole, permission: CrmPermission) {
  if (permission === "crm:manage_templates") {
    return role === "ADMIN" || role === "MANAGER";
  }

  return role === "ADMIN" || role === "MANAGER" || role === "EVALUATOR";
}

function hasKindePermission(permissionKeys: string[], permission: CrmPermission) {
  const accepted = crmPermissionMap[permission];
  return accepted.some((key) => permissionKeys.includes(key));
}

function logMissingPermission(email: string, permission: CrmPermission, permissionKeys: string[]) {
  console.warn("[auth] Missing Kinde CRM permission", {
    email,
    permission,
    permissionKeys
  });
}

export async function checkCrmPermission(permission: CrmPermission): Promise<PermissionResult> {
  try {
    const { getUser, getClaim } = getKindeServerSession();
    const [kindeUser, accessTokenPermissions, idTokenPermissions, dbUser] = await Promise.all([
      getUser(),
      getClaim("permissions", "access_token"),
      getClaim("permissions", "id_token"),
      ensureUserInDb()
    ]);

    if (!kindeUser || !dbUser) {
      return {
        allowed: false,
        reason: "unauthenticated",
        source: "default-deny"
      };
    }

    if (hasDbRolePermission(dbUser.role, permission)) {
      return {
        allowed: true,
        source: "db-role",
        role: dbUser.role
      };
    }

    const permissionKeys = [
      ...new Set([
        ...collectPermissionKeys(accessTokenPermissions?.value),
        ...collectPermissionKeys(idTokenPermissions?.value)
      ])
    ];

    if (hasKindePermission(permissionKeys, permission)) {
      return {
        allowed: true,
        source: "kinde",
        role: dbUser.role
      };
    }

    if (kindeUser.email) {
      logMissingPermission(kindeUser.email, permission, permissionKeys);
    }

    return {
      allowed: false,
      reason: "missing_permission",
      source: "default-deny",
      role: dbUser.role
    };
  } catch {
    return {
      allowed: false,
      reason: "unknown",
      source: "default-deny"
    };
  }
}
