"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

const inputClass =
  "w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-zinc-400";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const email = formData.get("email")?.toString().trim() ?? "";
        const password = formData.get("password")?.toString() ?? "";

        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl: callbackUrl || "/"
        });

        setPending(false);

        if (!result || result.error) {
          setError("Invalid email or password.");
          return;
        }

        router.push(result.url || callbackUrl || "/");
        router.refresh();
      }}
    >
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Email</span>
        <input type="email" name="email" required autoComplete="email" className={inputClass} />
      </label>
      <label>
        <span className="mb-1.5 block text-xs font-medium text-zinc-500">Password</span>
        <input type="password" name="password" required autoComplete="current-password" className={inputClass} />
      </label>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <LockKeyhole size={14} />
            Sign in
          </>
        )}
      </Button>
    </form>
  );
}
