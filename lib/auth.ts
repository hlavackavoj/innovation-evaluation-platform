import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapKindeRolesToAppRole } from "@/lib/kinde-roles";

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
  const { getUser, getClaim } = getKindeServerSession();
  const [kindeUser, rolesClaim] = await Promise.all([getUser(), getClaim("roles", "id_token")]);
  const email = kindeUser?.email?.trim().toLowerCase();

  if (!email) {
    return null;
  }

  const fullName = `${kindeUser?.given_name ?? ""} ${kindeUser?.family_name ?? ""}`.trim();
  const fallbackName = kindeUser?.email?.split("@")[0] ?? "Kinde User";
  const resolvedName = fullName || kindeUser?.username || fallbackName;
  const mappedRole = mapKindeRolesToAppRole(rolesClaim?.value) as UserRole;

  return prisma.user.upsert({
    where: { email },
    update: {
      name: resolvedName,
      role: mappedRole
    },
    create: {
      email,
      name: resolvedName,
      role: mappedRole
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  });
}
