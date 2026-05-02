"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { type ProjectPriority } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteContact, deleteOrganizationAction, deleteTask } from "@/app/email-analyzer/actions";
import { useRouter } from "next/navigation";

type SelectItem = { id: string; title: string };
type SelectContactItem = { id: string; name: string; email: string | null };

type CreatedEntities = {
  contacts: Array<{ id: string; name: string; email: string; organizationName: string | null }>;
  tasks: Array<{ id: string; title: string; priority: ProjectPriority; contactId: string | null; contactName: string | null }>;
  organizations: Array<{ id: string; domain: string }>;
};

type AnalysisResult = {
  jobId?: string;
  importedEmails: number;
  matchedContacts: number;
  suggestedContacts: number;
  generatedTasks: number;
  createdEntities?: CreatedEntities;
};

type TestApiResponse = {
  error?: string;
  message?: string;
  hint?: string;
  enrichmentResult: {
    importedEmails: number;
    matchedContacts: number;
    suggestedContacts: number;
    generatedTasks: number;
    createdEntities: CreatedEntities;
  };
};

export function EnrichmentPanel({
  projects,
  contacts,
  analyzeAction,
  initialSummary
}: {
  projects: SelectItem[];
  contacts: SelectContactItem[];
  analyzeAction: (formData: FormData) => Promise<AnalysisResult>;
  initialSummary: AnalysisResult | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [useTestData, setUseTestData] = useState(false);
  const [summary, setSummary] = useState<AnalysisResult | null>(initialSummary);
  const [testError, setTestError] = useState<string | null>(null);
  const [feed, setFeed] = useState<CreatedEntities>(
    initialSummary?.createdEntities ?? { contacts: [], tasks: [], organizations: [] }
  );

  const hasResults = useMemo(
    () => !!summary && (summary.importedEmails > 0 || feed.contacts.length > 0 || feed.tasks.length > 0 || feed.organizations.length > 0),
    [feed.contacts.length, feed.organizations.length, feed.tasks.length, summary]
  );

  const runAnalysis = (formData: FormData) => {
    startTransition(async () => {
      try {
        setTestError(null);
        if (useTestData) {
          const response = await fetch("/api/debug/test-email-analysis", { method: "POST" });
          if (!response.ok) {
            const errorPayload = (await response.json().catch(() => null)) as Partial<TestApiResponse> | null;
            const message = errorPayload?.message || "Test analysis failed.";
            const hint = errorPayload?.hint ? ` ${errorPayload.hint}` : "";
            throw new Error(`${message}${hint}`);
          }
          const payload = (await response.json()) as TestApiResponse;
          const result: AnalysisResult = {
            importedEmails: payload.enrichmentResult.importedEmails,
            matchedContacts: payload.enrichmentResult.matchedContacts,
            suggestedContacts: payload.enrichmentResult.suggestedContacts,
            generatedTasks: payload.enrichmentResult.generatedTasks,
            createdEntities: payload.enrichmentResult.createdEntities
          };
          setSummary(result);
          setFeed(result.createdEntities ?? { contacts: [], tasks: [], organizations: [] });
          router.refresh();
          return;
        }

        const result = await analyzeAction(formData);
        setSummary(result);
        setFeed(result.createdEntities ?? { contacts: [], tasks: [], organizations: [] });
        router.refresh();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unexpected test error.";
        setTestError(message);
        console.error("Email analyzer run failed:", error);
      }
    });
  };

  const onDelete = (type: "contact" | "task" | "organization", id: string) => {
    const accepted = window.confirm("Opravdu chcete smazat tento záznam?");
    if (!accepted) return;

    startDeleteTransition(async () => {
      if (type === "contact") {
        await deleteContact(id);
        setFeed((prev) => ({ ...prev, contacts: prev.contacts.filter((item) => item.id !== id) }));
      }
      if (type === "task") {
        await deleteTask(id);
        setFeed((prev) => ({ ...prev, tasks: prev.tasks.filter((item) => item.id !== id) }));
      }
      if (type === "organization") {
        await deleteOrganizationAction(id);
        setFeed((prev) => ({ ...prev, organizations: prev.organizations.filter((item) => item.id !== id) }));
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Analyze Communication</CardTitle>
          <CardDescription>Filter emails and run provider-agnostic communication analysis.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={runAnalysis} className="grid gap-4 sm:grid-cols-2">
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
              <select name="provider" className="w-full rounded-lg border border-zinc-200 p-2 text-sm" disabled={useTestData}>
                <option value="ALL">All</option>
                <option value="GMAIL">Gmail</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-zinc-500">Direction</span>
              <select name="direction" className="w-full rounded-lg border border-zinc-200 p-2 text-sm" disabled={useTestData}>
                <option value="all">All</option>
                <option value="inbound">Inbound</option>
                <option value="outbound">Outbound</option>
              </select>
            </label>

            <label className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              <input type="checkbox" checked={useTestData} onChange={(event) => setUseTestData(event.target.checked)} />
              Simulovat testovací data (volá /api/debug/test-email-analysis)
            </label>

            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {useTestData ? "Spustit testovací analýzu" : "Analyze Communication"}
              </Button>
            </div>
          </form>

          {testError && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {testError}
            </div>
          )}

          {summary && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              <p>Imported emails: <strong>{summary.importedEmails}</strong></p>
              <p>Matched contacts: <strong>{summary.matchedContacts}</strong></p>
              <p>Suggested new contacts: <strong>{summary.suggestedContacts}</strong></p>
              <p>Generated tasks: <strong>{summary.generatedTasks}</strong></p>
              {summary.importedEmails === 0 && (
                <p className="mt-2 text-zinc-600">
                  No emails matched the current filters. Try removing contact filter or widening date range.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {hasResults && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nově vytvořené kontakty</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {feed.contacts.length === 0 && <p className="text-sm text-zinc-500">Žádné nové kontakty.</p>}
              {feed.contacts.map((contact) => (
                <div key={contact.id} className="flex items-start justify-between gap-2 rounded-lg border border-zinc-200 p-2">
                  <div className="min-w-0">
                    <Link href={`/contacts/${contact.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                      {contact.name}
                    </Link>
                    <p className="text-xs text-zinc-500">{contact.organizationName ?? "Bez organizace"} · {contact.email}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={isDeleting}
                    onClick={() => onDelete("contact", contact.id)}
                  >
                    <Trash2 className="h-4 w-4 text-zinc-500" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detekované úkoly</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {feed.tasks.length === 0 && <p className="text-sm text-zinc-500">Žádné nové úkoly.</p>}
              {feed.tasks.map((task) => (
                <div key={task.id} className="flex items-start justify-between gap-2 rounded-lg border border-zinc-200 p-2">
                  <div className="min-w-0">
                    <Link href={`/tasks/${task.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                      {task.title}
                    </Link>
                    <p className="text-xs text-zinc-500">{task.priority} · {task.contactId ? (
                      <Link href={`/contacts/${task.contactId}`} className="text-indigo-600 hover:text-indigo-700">{task.contactName ?? "Kontakt"}</Link>
                    ) : "Bez kontaktu"}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={isDeleting}
                    onClick={() => onDelete("task", task.id)}
                  >
                    <Trash2 className="h-4 w-4 text-zinc-500" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nové organizace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {feed.organizations.length === 0 && <p className="text-sm text-zinc-500">Žádné nové organizace.</p>}
              {feed.organizations.map((organization) => (
                <div key={organization.id} className="flex items-start justify-between gap-2 rounded-lg border border-zinc-200 p-2">
                  <div className="min-w-0">
                    <Link href={`/organizations/${organization.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                      {organization.domain}
                    </Link>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={isDeleting}
                    onClick={() => onDelete("organization", organization.id)}
                  >
                    <Trash2 className="h-4 w-4 text-zinc-500" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
