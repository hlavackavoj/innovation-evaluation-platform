import type { CalendarProposal } from "@/lib/email/analysis-metadata";

export type PrintableEmailInsight = {
  activityDateIso: string;
  sourceText: string;
  projectTitle: string | null;
  analysisStatus: "UNASSIGNED_PROJECT" | "PENDING" | "ANALYZED" | null;
  sentimentScore: number | null;
  isUrgent: boolean;
  stage: string | null;
  taskSummary: string | null;
  dueDate: string | null;
  calendarProposals: CalendarProposal[];
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function safeText(text: string | null | undefined): string {
  const value = decodeHtmlEntities((text ?? "").trim());
  return value || "Neuvedeno";
}

export function buildEmailTaskPrintReport(items: PrintableEmailInsight[]): string {
  return items
    .map((item, index) => {
      const calendarSuggestion =
        item.calendarProposals[0]?.proposedDateTimeIso ??
        item.calendarProposals[0]?.allDayDateIso ??
        (item.calendarProposals.length > 0 ? "needs scheduling" : "Bez návrhu");
      const projectLabel =
        item.projectTitle ?? (item.analysisStatus === "UNASSIGNED_PROJECT" ? "Nepřiřazeno k projektu" : "Není přiřazeno");
      const sentimentLabel = item.sentimentScore === null ? "Nezjištěno" : `${item.sentimentScore}/10`;
      const priorityLabel = item.isUrgent ? "critical" : "normal";
      const stageLabel = item.stage ?? "Neurčeno";
      const taskSummary = safeText(item.taskSummary);
      const dueDate = item.dueDate ?? "Bez termínu";

      return [
        `Email #${index + 1}`,
        `Datum (Europe/Prague): ${new Date(item.activityDateIso).toLocaleString("cs-CZ", { timeZone: "Europe/Prague" })}`,
        `Text: ${safeText(item.sourceText)}`,
        `Projekt: ${projectLabel}`,
        `Sentiment: ${sentimentLabel}`,
        `Priorita: ${priorityLabel}`,
        `Stage: ${stageLabel}`,
        `Task summary: ${taskSummary}`,
        `Due date: ${dueDate}`,
        `Calendar suggestion: ${calendarSuggestion}`
      ].join("\n");
    })
    .join("\n\n");
}
