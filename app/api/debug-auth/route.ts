import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveRoleFromSources, resolveBootstrapAdminRole } from "@/lib/auth";

export async function GET() {
  const { getUser, getRoles, getClaim } = getKindeServerSession();
  const [kindeUser, kindeRoles, rolesClaim] = await Promise.all([
    getUser(),
    getRoles(),
    getClaim("roles", "id_token")
  ]);

  const kindeId = kindeUser?.id?.trim() ?? null;
  const email = kindeUser?.email?.trim().toLowerCase() ?? null;

  if (!kindeId && !email) {
    return NextResponse.json(
      { authenticated: false, error: "No authenticated user identity in session." },
      { status: 401 }
    );
  }

  const dbUser = await prisma.user.findFirst({
    where: kindeId
      ? {
          OR: [{ kindeId }, ...(email ? [{ email }] : [])]
        }
      : {
          email: email ?? undefined
        },
    select: { id: true, email: true, role: true, updatedAt: true }
  });

  if (!dbUser || dbUser.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. ADMIN role required." },
      { status: 403 }
    );
  }

  const mappedFromKinde = resolveRoleFromSources(kindeRoles, rolesClaim?.value);
  const resolvedDbRole = resolveBootstrapAdminRole(email ?? "", mappedFromKinde);

  return NextResponse.json({
    authenticated: true,
    sessionUser: {
      id: kindeUser?.id ?? null,
      email,
      givenName: kindeUser?.given_name ?? null,
      familyName: kindeUser?.family_name ?? null
    },
    kinde: {
      rolesFromGetRoles: kindeRoles ?? null,
      rolesClaimFromIdToken: rolesClaim?.value ?? null
    },
    mappingTrace: {
      mappedFromKinde,
      bootstrapAdminMatch: resolvedDbRole !== mappedFromKinde,
      resolvedDbRole
    },
    dbUser
  });
}
