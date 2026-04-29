"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, Users, Building2, CheckSquare, FileStack, Mail, LogOut } from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/projects", label: "Projects", icon: FolderKanban, exact: false },
  { href: "/contacts", label: "Contacts", icon: Users, exact: false },
  { href: "/organizations", label: "Organizations", icon: Building2, exact: false },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, exact: false },
  { href: "/email-analyzer", label: "Email Analyzer", icon: Mail, exact: false },
  { href: "/templates", label: "Templates", icon: FileStack, exact: false }
];

export function Navigation({ userName, userRole }: { userName: string; userRole: UserRole }) {
  const pathname = usePathname();
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
              <span className="text-[10px] font-bold leading-none text-white">IEP</span>
            </div>
            <span className="hidden text-sm font-semibold text-zinc-900 sm:block">Launchpad</span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {links.map(({ href, label, icon: Icon, exact }) => {
              const isActive = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  )}
                >
                  <Icon size={14} className="shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500 sm:block">
            {userRole}
          </span>
          <LogoutLink className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800">
            <LogOut size={12} />
            Sign out
          </LogoutLink>
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700"
            title={userName}
          >
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
