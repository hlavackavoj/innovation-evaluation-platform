import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { UserRole } from "@prisma/client";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Navigation } from "@/components/navigation";
import { mapKindeRolesToAppRole } from "@/lib/kinde-roles";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Innovation Evaluation Platform",
  description: "CRM for university and innovation-center pipeline management"
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const { isAuthenticated, getUser, getClaim } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  let currentUser: { name: string; role: UserRole } | null = null;

  if (authenticated) {
    const [kindeUser, rolesClaim] = await Promise.all([
      getUser(),
      getClaim("roles", "id_token")
    ]);
    const email = kindeUser?.email?.trim().toLowerCase();

    if (email) {
      const fullName = `${kindeUser?.given_name ?? ""} ${kindeUser?.family_name ?? ""}`.trim();
      const fallbackName = kindeUser?.email?.split("@")[0] ?? "Kinde User";
      const resolvedName = fullName || kindeUser?.username || fallbackName;
      const mappedRole = mapKindeRolesToAppRole(rolesClaim?.value) as UserRole;

      const user = await prisma.user.upsert({
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
          name: true,
          role: true
        }
      });

      currentUser = user;
    }
  }

  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-zinc-50 font-sans antialiased">
        {currentUser ? <Navigation userName={currentUser.name} userRole={currentUser.role} /> : null}
        {currentUser ? <main className="mx-auto max-w-7xl px-6 py-8">{children}</main> : children}
      </body>
    </html>
  );
}
