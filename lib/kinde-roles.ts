type KindeRoleLike = { key?: unknown; name?: unknown };

type KindeRolesClaim =
  | string
  | string[]
  | KindeRoleLike
  | KindeRoleLike[]
  | { value?: unknown }
  | null
  | undefined;

export type AppAccessRole = "ADMIN" | "EVALUATOR" | "USER";

function toRoleKeys(value: unknown): string[] {
  if (!value) return [];

  if (typeof value === "string") {
    return [value.toLowerCase()];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") return [item.toLowerCase()];
        if (item && typeof item === "object") {
          const role = item as KindeRoleLike;
          const key = typeof role.key === "string" ? role.key : undefined;
          const name = typeof role.name === "string" ? role.name : undefined;
          return [key, name].filter((x): x is string => Boolean(x)).map((x) => x.toLowerCase());
        }
        return [];
      })
      .filter(Boolean);
  }

  if (typeof value === "object") {
    const record = value as { value?: unknown; key?: unknown; name?: unknown };

    if (record.value !== undefined) {
      return toRoleKeys(record.value);
    }

    const key = typeof record.key === "string" ? record.key.toLowerCase() : null;
    const name = typeof record.name === "string" ? record.name.toLowerCase() : null;
    return [key, name].filter((x): x is string => Boolean(x));
  }

  return [];
}

export function extractKindeRoleKeys(claim: KindeRolesClaim): string[] {
  return [...new Set(toRoleKeys(claim))];
}

export function mapKindeRolesToAppRole(claim: KindeRolesClaim): AppAccessRole {
  const roles = extractKindeRoleKeys(claim);

  if (roles.includes("admin")) {
    return "ADMIN";
  }

  if (roles.includes("evaluator")) {
    return "EVALUATOR";
  }

  return "USER";
}

export function hasProjectsAccessByKindeRole(claim: KindeRolesClaim): boolean {
  const role = mapKindeRolesToAppRole(claim);
  return role === "ADMIN" || role === "EVALUATOR";
}
