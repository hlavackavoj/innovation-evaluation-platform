import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { Navigation } from "@/components/navigation";
import { getCurrentUser } from "@/lib/auth";
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
  const currentUser = await getCurrentUser();

  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-zinc-50 font-sans antialiased">
        {currentUser ? <Navigation userName={currentUser.name} userRole={currentUser.role} /> : null}
        {currentUser ? <main className="mx-auto max-w-7xl px-6 py-8">{children}</main> : children}
      </body>
    </html>
  );
}
