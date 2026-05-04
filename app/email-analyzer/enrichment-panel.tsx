"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CalendarDays, Check, Copy, Loader2, Pencil, Trash2 } from "lucide-react";
import { ProjectPriority } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptSuggestedTaskAction, createTaskFromAiSuggestion, deleteContact, deleteOrganizationAction, deleteTask } from "@/app/email-analyzer/actions";
import { useRouter } from "next/navigation";
import type { CalendarProposal, SuggestedAction } from "@/lib/email/analysis-metadata";
import { buildGoogleCalendarUrl, buildGoogleCalendarAllDayUrl, buildIcsContent, buildIcsAllDayContent } from "@/lib/email/calendar-utils";

type SelectItem = { id: string; title: string };
type SelectContactItem = { id: string; name: string; email: string | null };

type CreatedEntities = {
  contacts: Array<{ id: string; name: string; email: string; organizationName: string | null }>;
  tasks: Array<{
    id: string;
    title: string;
    priority: ProjectPriority;
    suggestionStatus?: string;
    contactId: string | null;
    contactName: string | null;
    projectId?: string | null;
    projectTitle?: string | null;
  }>;
  organizations: Array<{ id: string; domain: string }>;
  suggestedProjects?: Array<{ name: string; matchedProjectId: string | null; confidence: number; reason: string }>;
};

type AnalysisResult = {
  jobId?: string;
  importedEmails: number;
  matchedContacts: number;
  suggestedContacts: number;
  generatedTasks: number;
  unassignedEmails: number;
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

type AiRecommendation = {
  activityId: string;
  activityDate: string;
  summary: string;
  projectId: string | null;
  projectTitle: string | null;
  intentCategory: "MEETING" | "PROPOSAL" | "FEEDBACK" | "ADMIN" | null;
  actionItems: Array<{
    task: string;
    deadline: string | null;
    assigneeSuggestion: string | null;
  }>;
  gapAnalysisQuestions: string[];
  sentimentScore: number | null;
  isUrgent: boolean;
  suggestedProjectStage: string | null;
  calendarProposals: CalendarProposal[];
  suggestedActions: SuggestedAction[];
  followUpQuestions: string[];
  analysisStatus: "UNASSIGNED_PROJECT" | "PENDING" | "ANALYZED" | null;
};

export function EnrichmentPanel({
  projects,
  contacts,
  analyzeAction,
  initialSummary,
  aiRecommendations
}: {
  projects: SelectItem[];
  contacts: SelectContactItem[];
  analyzeAction: (formData: FormData) => Promise<AnalysisResult>;
  initialSummary: AnalysisResult | null;
  aiRecommendations: AiRecommendation[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isSavingRecommendationTask, startSaveRecommendationTaskTransition] = useTransition();
  const [useTestData, setUseTestData] = useState(false);
  const [summary, setSummary] = useState<AnalysisResult | null>(initialSummary);
  const [testError, setTestError] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [recommendationMessage, setRecommendationMessage] = useState<string | null>(null);
  const [copiedQuestion, setCopiedQuestion] = useState<string | null>(null);
  const [feed, setFeed] = useState<CreatedEntities>(
    initialSummary?.createdEntities ?? { contacts: [], tasks: [], organizations: [] }
  );
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<ProjectPriority>(ProjectPriority.MEDIUM);
  const [editDueDate, setEditDueDate] = useState("");
  const [isAccepting, startAcceptTransition] = useTransition();
  const [acceptMessage, setAcceptMessage] = useState<string | null>(null);

  const hasResults = useMemo(
    () => !!summary && (summary.importedEmails > 0 || feed.contacts.length > 0 || feed.tasks.length > 0 || feed.organizations.length > 0),
    [feed.contacts.length, feed.organizations.length, feed.tasks.length, summary]
  );

  const hasAiRecommendations = aiRecommendations.length > 0;
  const contactActionItems = (summary?.matchedContacts ?? 0) + (summary?.suggestedContacts ?? 0);
  const intentLabels: Record<NonNullable<AiRecommendation["intentCategory"]>, string> = {
    MEETING: "Meeting",
    PROPOSAL: "Proposal",
    FEEDBACK: "Feedback",
    ADMIN: "Admin"
  };

  const getSentimentStyle = (score: number | null) => {
    if (score === null) return "border-zinc-200 bg-white";
    if (score < 4) return "border-rose-200 bg-rose-50";
    if (score < 7) return "border-amber-200 bg-amber-50";
    return "border-emerald-200 bg-emerald-50";
  };

  const resolveDueDateIso = (action: SuggestedAction) => {
    if (action.proposedDateTime) {
      const proposed = new Date(action.proposedDateTime);
      if (!Number.isNaN(proposed.getTime())) {
        return proposed.toISOString();
      }
    }

    if (action.deadline) {
      const deadline = new Date(action.deadline);
      if (!Number.isNaN(deadline.getTime())) {
        return deadline.toISOString();
      }
    }

    if (typeof action.dueDays === "number") {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + action.dueDays);
      return dueDate.toISOString();
    }

    return null;
  };

  const runAnalysis = (formData: FormData) => {
    startTransition(async () => {
      try {
        setTestError(null);
        setDeleteMessage(null);
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
            unassignedEmails: 0,
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
        setDeleteMessage("Kontakt byl smazán.");
      }
      if (type === "task") {
        await deleteTask(id);
        setFeed((prev) => ({ ...prev, tasks: prev.tasks.filter((item) => item.id !== id) }));
        setDeleteMessage("Úkol byl smazán.");
      }
      if (type === "organization") {
        await deleteOrganizationAction(id);
        setFeed((prev) => ({ ...prev, organizations: prev.organizations.filter((item) => item.id !== id) }));
        setDeleteMessage("Organizace byla smazána.");
      }
      router.refresh();
    });
  };

  const saveSuggestedActionAsTask = (recommendation: AiRecommendation, action: SuggestedAction) => {
    if (!recommendation.projectId) return;

    startSaveRecommendationTaskTransition(async () => {
      try {
        setRecommendationMessage(null);
        await createTaskFromAiSuggestion({
          activityId: recommendation.activityId,
          actionType: action.type,
          title: action.title,
          description: action.description,
          dueDateIso: resolveDueDateIso(action)
        });
        setRecommendationMessage(`Úkol "${action.title}" byl uložen do Tasks.`);
        router.refresh();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Nepodařilo se uložit doporučený úkol.";
        setRecommendationMessage(message);
      }
    });
  };

  const openTaskEdit = (task: CreatedEntities["tasks"][number]) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription("");
    setEditPriority(task.priority);
    setEditDueDate("");
    setAcceptMessage(null);
  };

  const cancelTaskEdit = () => {
    setEditingTaskId(null);
  };

  const saveAcceptedTask = (taskId: string) => {
    startAcceptTransition(async () => {
      try {
        await acceptSuggestedTaskAction({
          taskId,
          title: editTitle,
          description: editDescription || null,
          priority: editPriority,
          dueDateIso: editDueDate || null
        });
        setFeed((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === taskId ? { ...t, title: editTitle, priority: editPriority, suggestionStatus: "ACCEPTED" } : t
          )
        }));
        setEditingTaskId(null);
        setAcceptMessage(`Úkol "${editTitle}" byl přijat a uložen.`);
        router.refresh();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Nepodařilo se přijmout úkol.";
        setAcceptMessage(message);
      }
    });
  };

  const downloadIcs = (proposal: CalendarProposal) => {
    const ics = proposal.proposedDateTimeIso
      ? buildIcsContent(proposal.title, proposal.proposedDateTimeIso)
      : buildIcsAllDayContent(proposal.title, proposal.allDayDateIso!);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meeting-${(proposal.proposedDateTimeIso ?? proposal.allDayDateIso ?? "event").slice(0, 10)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openGoogleCalendar = (proposal: CalendarProposal) => {
    const url = proposal.proposedDateTimeIso
      ? buildGoogleCalendarUrl(proposal.title, proposal.proposedDateTimeIso)
      : buildGoogleCalendarAllDayUrl(proposal.title, proposal.allDayDateIso!);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyQuestion = async (question: string) => {
    try {
      await navigator.clipboard.writeText(question);
      setCopiedQuestion(question);
      window.setTimeout(() => setCopiedQuestion((prev) => (prev === question ? null : prev)), 1800);
    } catch {
      setCopiedQuestion(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Analyzovat korespondenci</CardTitle>
          <CardDescription>Filtrujte e-maily a spusťte analýzu komunikace napříč poskytovateli.</CardDescription>
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
                <option value="ALL">Vše</option>
                <option value="GMAIL">Gmail</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium text-zinc-500">Direction</span>
              <select name="direction" className="w-full rounded-lg border border-zinc-200 p-2 text-sm" disabled={useTestData}>
                <option value="all">Vše</option>
                <option value="inbound">Příchozí</option>
                <option value="outbound">Odchozí</option>
              </select>
            </label>

            <label className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
              <input type="checkbox" checked={useTestData} onChange={(event) => setUseTestData(event.target.checked)} />
              Simulovat testovací data (volá /api/debug/test-email-analysis)
            </label>

            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {useTestData ? "Spustit testovací analýzu" : "Analyzovat korespondenci"}
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
              <p>Importované e-maily: <strong>{summary.importedEmails}</strong></p>
              <p>Nalezené kontakty: <strong>{summary.matchedContacts}</strong></p>
              <p>Navržené nové kontakty: <strong>{summary.suggestedContacts}</strong></p>
              <p>Kontaktní akce ke kontrole: <strong>{contactActionItems}</strong></p>
              <p>Vygenerované úkoly: <strong>{summary.generatedTasks}</strong></p>
              <p>Nepřiřazené e-maily: <strong>{summary.unassignedEmails ?? 0}</strong></p>
              {summary.suggestedContacts > 0 && (
                <p className="mt-1 text-amber-700">
                  Navržené kontakty vyžadují přiřazení k projektu — viz sekce Výsledky analýzy.
                </p>
              )}
              {(summary.unassignedEmails ?? 0) > 0 && (
                <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-800">
                  Některé e-maily nebyly možné spolehlivě přiřadit k projektu. Z bezpečnostních důvodů nebyly přiřazeny k
                  náhodnému projektu a čekají na ruční triage.
                </div>
              )}
              {summary.importedEmails === 0 && (
                <p className="mt-2 text-zinc-600">
                  Žádné e-maily neodpovídají filtrům. Zkuste rozšířit datum nebo odebrat filtr kontaktu.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {hasAiRecommendations && (
        <section className="space-y-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <h3 className="text-sm font-semibold text-zinc-900">AI doporučení z komunikace</h3>
            <p className="text-xs text-zinc-600">Doporučení z analýzy komunikace uložené v databázi.</p>
          </div>

          {recommendationMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              {recommendationMessage}
            </div>
          )}

          <div className="space-y-3">
            {aiRecommendations.map((recommendation) => (
              <div
                key={recommendation.activityId}
                className={`rounded-lg border p-3 ${getSentimentStyle(recommendation.sentimentScore)}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500">
                      {new Date(recommendation.activityDate).toLocaleString("cs-CZ")}
                    </p>
                    <p className="line-clamp-2 text-sm text-zinc-800">{recommendation.summary}</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Projekt:{" "}
                      {recommendation.projectId ? (
                        <Link
                          href={`/projects/${recommendation.projectId}`}
                          className="font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          {recommendation.projectTitle ?? "Otevřít projekt"}
                        </Link>
                      ) : (
                        "Unlinked"
                      )}
                    </p>
                    {recommendation.analysisStatus === "UNASSIGNED_PROJECT" && (
                      <p className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                        Nepřiřazeno k projektu · Vyžaduje ruční přiřazení
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-zinc-600">
                    <p>Sentiment: {recommendation.sentimentScore ?? "N/A"}/10</p>
                    <p>Urgent: {recommendation.isUrgent ? "Yes" : "No"}</p>
                    <p>Stage: {recommendation.suggestedProjectStage ?? "N/A"}</p>
                  </div>
                </div>
                {recommendation.intentCategory && (
                  <div className="mt-2">
                    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-700">
                      Intent: {intentLabels[recommendation.intentCategory]}
                    </span>
                  </div>
                )}

                {recommendation.actionItems.length > 0 && (
                  <div className="mt-3 space-y-2 rounded-md border border-zinc-200 bg-white p-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Akční kroky</p>
                    {recommendation.actionItems.map((item, index) => (
                      <div key={`${recommendation.activityId}-action-item-${index}`} className="rounded border border-zinc-200 px-2 py-1.5">
                        <p className="text-sm text-zinc-900">{item.task}</p>
                        {(item.deadline || item.assigneeSuggestion) && (
                          <p className="text-xs text-zinc-500">
                            {item.deadline ? `Deadline: ${item.deadline}` : ""}
                            {item.deadline && item.assigneeSuggestion ? " · " : ""}
                            {item.assigneeSuggestion ? `Doporučený řešitel: ${item.assigneeSuggestion}` : ""}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {recommendation.suggestedActions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {recommendation.suggestedActions.map((action, index) => (
                      <div key={`${recommendation.activityId}-${action.type}-${index}`} className="rounded-md border border-zinc-200 bg-white p-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-900">{action.title}</p>
                            <p className="text-xs text-zinc-600">{action.description}</p>
                            {action.proposedDateTime && (
                              <p className="text-xs text-zinc-500">Navržený termín: {action.proposedDateTime}</p>
                            )}
                            {action.deadline && <p className="text-xs text-zinc-500">Deadline: {action.deadline}</p>}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!recommendation.projectId || isSavingRecommendationTask}
                            onClick={() => saveSuggestedActionAsTask(recommendation, action)}
                          >
                            {isSavingRecommendationTask ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Uložit do Task
                          </Button>
                        </div>
                        {!recommendation.projectId && (
                          <p className="mt-1 text-xs text-amber-700">Nejdříve přiřaď e-mail projektu (Unlinked).</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {recommendation.calendarProposals.length > 0 && (
                  <div className="mt-3 space-y-2 rounded-md border border-indigo-100 bg-indigo-50 p-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Navržené termíny</p>
                    {recommendation.calendarProposals.map((proposal, index) => (
                      <div key={`${recommendation.activityId}-cal-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded border border-indigo-200 bg-white px-2 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-900 truncate">{proposal.title}</p>
                            <p className="text-xs text-zinc-500">
                              {proposal.proposedDateTimeIso
                                ? new Date(proposal.proposedDateTimeIso).toLocaleString("cs-CZ")
                                : proposal.allDayDateIso
                                  ? new Date(proposal.allDayDateIso).toLocaleDateString("cs-CZ")
                                  : null}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => downloadIcs(proposal)}
                          >
                            ICS
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => openGoogleCalendar(proposal)}
                          >
                            Google Kalendář
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {recommendation.followUpQuestions.length > 0 && (
                  <div className="mt-3 space-y-2 rounded-md border border-zinc-200 bg-white p-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Follow-up otázky</p>
                    {recommendation.followUpQuestions.map((question, index) => (
                      <div key={`${recommendation.activityId}-q-${index}`} className="flex items-start justify-between gap-2">
                        <p className="text-sm text-zinc-800">{question}</p>
                        <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => copyQuestion(question)}>
                          {copiedQuestion === question ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                          {copiedQuestion === question ? "Zkopírováno" : "Kopírovat"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {recommendation.gapAnalysisQuestions.length > 0 && (
                  <div className="mt-3 space-y-2 rounded-md border border-zinc-200 bg-white p-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Otázky k doplnění</p>
                    {recommendation.gapAnalysisQuestions.map((question, index) => (
                      <p key={`${recommendation.activityId}-gap-question-${index}`} className="text-sm text-zinc-800">
                        {question}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {hasResults && (
        <section className="space-y-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <h3 className="text-sm font-semibold text-zinc-900">Výsledky analýzy</h3>
            <p className="text-xs text-zinc-600">Záznamy vytvořené během poslední analýzy korespondence.</p>
          </div>

          {isDeleting && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              Mažu záznam…
            </div>
          )}

          {deleteMessage && !isDeleting && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{deleteMessage}</div>
          )}

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
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={isDeleting}
                    onClick={() => onDelete("contact", contact.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Smazat
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
              {acceptMessage && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-900">{acceptMessage}</div>
              )}
              {feed.tasks.length === 0 && <p className="text-sm text-zinc-500">Žádné nové úkoly.</p>}
              {feed.tasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-zinc-200 p-2">
                  {editingTaskId === task.id ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Upravit & přijmout úkol</p>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded border border-zinc-300 p-1.5 text-sm"
                        placeholder="Název úkolu"
                      />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full rounded border border-zinc-300 p-1.5 text-sm"
                        rows={2}
                        placeholder="Popis (volitelné)"
                      />
                      <div className="flex gap-2">
                        <select
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value as ProjectPriority)}
                          className="rounded border border-zinc-300 p-1.5 text-sm"
                        >
                          {Object.values(ProjectPriority).map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="rounded border border-zinc-300 p-1.5 text-sm"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={isAccepting || !editTitle.trim()}
                          onClick={() => saveAcceptedTask(task.id)}
                        >
                          {isAccepting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                          Uložit
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={cancelTaskEdit}>
                          Zrušit
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link href={`/tasks/${task.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                          {task.title}
                        </Link>
                        <p className="text-xs text-zinc-500">
                          {task.priority} ·{" "}
                          {task.contactId ? (
                            <Link href={`/contacts/${task.contactId}`} className="text-indigo-600 hover:text-indigo-700">
                              {task.contactName ?? "Kontakt"}
                            </Link>
                          ) : (
                            "Bez kontaktu"
                          )}{" "}
                          ·{" "}
                          <span className={task.suggestionStatus === "SUGGESTED" ? "text-amber-700 font-medium" : "text-emerald-700"}>
                            {task.suggestionStatus ?? "SUGGESTED"}
                          </span>
                        </p>
                        {task.projectId && (
                          <p className="text-xs text-zinc-500">
                            <Link href={`/projects/${task.projectId}`} className="text-indigo-600 hover:text-indigo-700">
                              {task.projectTitle ?? "Project"}
                            </Link>
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {(task.suggestionStatus === "SUGGESTED" || !task.suggestionStatus) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8"
                            disabled={isDeleting}
                            onClick={() => openTaskEdit(task)}
                          >
                            <Pencil className="mr-1 h-4 w-4" />
                            Přijmout
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          disabled={isDeleting}
                          onClick={() => onDelete("task", task.id)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Smazat
                        </Button>
                      </div>
                    </div>
                  )}
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
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={isDeleting}
                    onClick={() => onDelete("organization", organization.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Smazat
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          </div>
        </section>
      )}
    </div>
  );
}
