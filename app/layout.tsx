import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { UserRole } from "@prisma/client";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Navigation } from "@/components/navigation";
import { ensureUserInDb } from "@/lib/auth";
import { assertRequiredServerEnv, getMissingKindeEnv } from "@/lib/env";
import { isPrismaConnectivityError } from "@/lib/prisma-errors";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Innovation Evaluation Platform",
  description: "CRM for university and innovation-center pipeline management",
  icons: {
    icon: "/favicon.png"
  }
};

export const dynamic = "force-dynamic";

const hasRequiredKindeEnv = getMissingKindeEnv().length === 0;

function isNextRedirectError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeDigest = (error as { digest?: unknown }).digest;
  return typeof maybeDigest === "string" && maybeDigest.startsWith("NEXT_REDIRECT");
}

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  try {
    assertRequiredServerEnv();

    let currentUser: { name: string; role: UserRole } | null = null;
    let databaseUnavailable = false;
    const { isAuthenticated } = getKindeServerSession();
    const authenticated = await isAuthenticated();

    // Never call Prisma/Kinde user profile when the request is unauthenticated.
    if (authenticated && hasRequiredKindeEnv) {
      try {
        currentUser = await ensureUserInDb();
      } catch (error) {
        if (!isPrismaConnectivityError(error)) {
          throw error;
        }

        databaseUnavailable = true;
        console.error("[layout] Database is temporarily unavailable. Rendering without user navigation.", error);
      }
    }
    return (
      <html lang="en" className={inter.variable}>
        <body className="bg-zinc-50 font-sans antialiased">
          {!hasRequiredKindeEnv ? (
            <div className="mx-auto mt-6 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Auth konfigurace není kompletní (`KINDE_*` proměnné). Aplikace běží v omezeném režimu bez přihlášení.
            </div>
          ) : null}
          {databaseUnavailable ? (
            <div className="mx-auto mt-6 max-w-3xl rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Databáze je dočasně nedostupná. Aplikace běží v omezeném režimu.
            </div>
          ) : null}
          {currentUser ? <Navigation userName={currentUser.name} userRole={currentUser.role} /> : null}
          {currentUser ? <main className="mx-auto max-w-7xl px-6 py-8">{children}</main> : children}
        </body>
      </html>
    );
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

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
