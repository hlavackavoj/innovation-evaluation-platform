import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/login-form";
import { auth } from "@/lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const session = await auth();

  if (session?.user) {
    redirect(searchParams?.callbackUrl || "/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.16),_transparent_35%),linear-gradient(180deg,_#fafafa_0%,_#f4f4f5_100%)] px-6 py-10">
      <Card className="w-full max-w-md border-zinc-200 shadow-xl shadow-zinc-200/50">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            Secure access to the Innovation Evaluation Platform CRM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <LoginForm callbackUrl={searchParams?.callbackUrl} />
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900">
            Seed users can sign in with their existing email and the shared demo password
            {" "}
            <code className="font-semibold">demo12345</code>.
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
