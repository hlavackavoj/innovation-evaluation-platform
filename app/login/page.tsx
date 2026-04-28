import { redirect } from "next/navigation";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { buttonVariants } from "@/components/ui/button";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const { isAuthenticated } = getKindeServerSession();

  if (await isAuthenticated()) {
    redirect(searchParams?.callbackUrl || "/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_35%),linear-gradient(180deg,_#fafafa_0%,_#f4f4f5_100%)] px-6 py-10">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-xl shadow-zinc-200/50">
        <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-500">Secure access to the Innovation Evaluation Platform CRM.</p>
        <LoginLink
          postLoginRedirectURL={searchParams?.callbackUrl || "/"}
          className={`${buttonVariants({})} mt-6 inline-flex w-full justify-center`}
        >
          Continue with Kinde
        </LoginLink>
      </div>
    </main>
  );
}
