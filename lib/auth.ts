import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { prisma } from "@/lib/prisma";

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
