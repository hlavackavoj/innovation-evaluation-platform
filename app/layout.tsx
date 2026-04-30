import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { UserRole } from "@prisma/client";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Navigation } from "@/components/navigation";
import { ensureUserInDb } from "@/lib/auth";
import { assertRequiredServerEnv } from "@/lib/env";
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
  try {
    assertRequiredServerEnv();

    let currentUser: { name: string; role: UserRole } | null = null;
    const { isAuthenticated } = getKindeServerSession();
    const authenticated = await isAuthenticated();

    // Never call Prisma/Kinde user profile when the request is unauthenticated.
    if (authenticated) {
      currentUser = await ensureUserInDb();
    }
    return (
      <html lang="en" className={inter.variable}>
        <body className="bg-zinc-50 font-sans antialiased">
          {currentUser ? <Navigation userName={currentUser.name} userRole={currentUser.role} /> : null}
          {currentUser ? <main className="mx-auto max-w-7xl px-6 py-8">{children}</main> : children}
        </body>
      </html>
    );
  } catch (error) {
    console.error("CRITICAL_LAYOUT_ERROR:", error);
    return (
      <html lang="en" className={inter.variable}>
        <body className="bg-zinc-50 font-sans antialiased">
          <div className="mx-auto mt-10 max-w-xl rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            A server configuration error occurred. Please contact support.
          </div>
        </body>
      </html>
    );
  }
}
