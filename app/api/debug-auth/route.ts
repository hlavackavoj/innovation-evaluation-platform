import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { getUser, getRoles, getClaim } = getKindeServerSession();
  const [kindeUser, kindeRoles, rolesClaim] = await Promise.all([
    getUser(),
    getRoles(),
    getClaim("roles", "id_token")
  ]);

  const email = kindeUser?.email?.trim().toLowerCase() ?? null;

  if (!email) {
    return NextResponse.json(
      {
        authenticated: false,
        error: "No authenticated user email in session."
      },
      { status: 401 }
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      updatedAt: true
    }
  });

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
    dbUser
  });
}
