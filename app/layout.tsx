import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Navigation } from "@/components/navigation";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Innovation Evaluation Platform",
  description: "CRM MVP for university and innovation-center projects"
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <Navigation />
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-6 rounded-2xl border border-amber-200 bg-sand px-4 py-3 text-sm text-slate-700">
            Demo access mode: signed in as <span className="font-semibold">{currentUser?.name ?? "Seed user"}</span>. The
            user model is role-ready; full authentication is intentionally deferred for the next iteration.
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
