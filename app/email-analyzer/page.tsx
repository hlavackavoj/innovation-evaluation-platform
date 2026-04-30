import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { AuthorizationError, requireCurrentUser } from "@/lib/authorization";
import { getCurrentUserEmailConnections } from "@/lib/email/connections";
import { analyzeCommunicationAction, disconnectConnectionAction } from "@/app/email-analyzer/actions";
import { ConnectGmailButton } from "@/components/ConnectGmailButton";

export default async function EmailAnalyzerPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect("/login");
    }
    throw error;
  }

  const [projects, contacts, connections] = await Promise.all([
    prisma.project.findMany({
      where: {
        OR: [{ ownerUserId: user.id }, { ownerUserId: null }]
      },
      orderBy: { title: "asc" },
      select: { id: true, title: true }
    }),
    prisma.contact.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true }
    }),
    getCurrentUserEmailConnections()
  ]);

  const readFirst = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const readNumber = (value: string | string[] | undefined) => {
    const raw = readFirst(value);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const imported = readNumber(searchParams?.imported);
  const matched = readNumber(searchParams?.matched);
  const suggested = readNumber(searchParams?.suggested);
  const generated = readNumber(searchParams?.generated);
  const jobId = readFirst(searchParams?.jobId);
  const toast = readFirst(searchParams?.toast);
  const error = readFirst(searchParams?.error);

  return (
    <Shell
      title="Email Analyzer"
      description="Import Gmail communication, match to CRM projects, and generate tasks."
      actions={
        <ConnectGmailButton returnPath="/email-analyzer" />
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr,340px]">
        <Card>
          <CardHeader>
            <CardTitle>Analyze Communication</CardTitle>
            <CardDescription>Filter emails and run provider-agnostic communication analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            {toast === "provider-connected" && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Gmail account connected successfully.
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {error === "oauth_provider_error" && "OAuth provider returned an error during authorization."}
                {error === "missing_oauth_code" && "OAuth callback is missing authorization code/state."}
                {error === "oauth_callback_failed" && "OAuth callback failed. Try reconnecting Gmail."}
                {error === "provider_disabled" && "This provider is currently disabled."}
                {!["oauth_provider_error", "missing_oauth_code", "oauth_callback_failed", "provider_disabled"].includes(
                  error
                ) && "Unknown error. Check server logs for details."}
              </div>
            )}

            <form action={analyzeCommunicationAction} className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium text-zinc-500">Project (optional)</span>
                <select name="projectId" className="w-full rounded-lg border border-zinc-200 p-2 text-sm">
                  <option value="">All projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-zinc-500">Contact email</span>
                <input
                  name="contactEmail"
                  list="contact-emails"
                  placeholder="name@university.edu"
                  className="w-full rounded-lg border border-zinc-200 p-2 text-sm"
                />
                <datalist id="contact-emails">
                  {contacts
                    .filter((c) => !!c.email)
                    .map((contact) => (
                      <option key={contact.id} value={contact.email || ""}>
                        {contact.name}
                      </option>
                    ))}
                </datalist>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-zinc-500">Date from</span>
                <input type="date" name="dateFrom" className="w-full rounded-lg border border-zinc-200 p-2 text-sm" />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-zinc-500">Date to</span>
                <input type="date" name="dateTo" className="w-full rounded-lg border border-zinc-200 p-2 text-sm" />
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-zinc-500">Provider</span>
                <select name="provider" className="w-full rounded-lg border border-zinc-200 p-2 text-sm">
                  <option value="ALL">All</option>
                  <option value="GMAIL">Gmail</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-medium text-zinc-500">Direction</span>
                <select name="direction" className="w-full rounded-lg border border-zinc-200 p-2 text-sm">
                  <option value="all">All</option>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </select>
              </label>

              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit">Analyze Communication</Button>
              </div>
            </form>

            {jobId && (
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                <p>Imported emails: <strong>{imported}</strong></p>
                <p>Matched contacts: <strong>{matched}</strong></p>
                <p>Suggested new contacts: <strong>{suggested}</strong></p>
                <p>Generated tasks: <strong>{generated}</strong></p>
                {imported === 0 && (
                  <p className="mt-2 text-zinc-600">
                    No emails matched the current filters. Try removing contact filter or widening date range.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected Providers</CardTitle>
            <CardDescription>Least-privilege read access for Gmail mailboxes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {connections.length === 0 && (
              <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">
                No providers connected yet.
              </p>
            )}

            {connections.map((connection) => (
              <div key={connection.id} className="rounded-lg border border-zinc-200 p-3">
                <p className="text-sm font-medium text-zinc-900">{connection.provider}</p>
                <p className="text-xs text-zinc-500">{connection.emailAddress || "No mailbox detected"}</p>
                <p className="text-xs text-zinc-400">Status: {connection.status}</p>
                <form action={disconnectConnectionAction} className="mt-2">
                  <input type="hidden" name="provider" value={connection.provider.toLowerCase()} />
                  <input type="hidden" name="connectionId" value={connection.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Disconnect
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
