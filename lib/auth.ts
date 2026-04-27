import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  return prisma.user.findFirst({
    orderBy: {
      createdAt: "asc"
    }
  });
}
