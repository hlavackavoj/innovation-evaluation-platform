"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function AuthSignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
    >
      <LogOut size={12} />
      Sign out
    </button>
  );
}
