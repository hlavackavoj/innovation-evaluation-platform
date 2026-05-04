import { ProjectPriority } from "@prisma/client";

export type ParsedCreatedEntities = {
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

export type ParsedEmailSyncSummary = {
  importedEmails: number;
  matchedContacts: number;
  suggestedContacts: number;
  generatedTasks: number;
  unassignedEmails: number;
  createdEntities: ParsedCreatedEntities;
};

function parsePriority(value: unknown): ProjectPriority {
  if (value === ProjectPriority.HIGH || value === ProjectPriority.MEDIUM || value === ProjectPriority.LOW) {
    return value;
  }
  return ProjectPriority.MEDIUM;
}

function parseNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseEmailSyncSummary(summary: unknown): ParsedEmailSyncSummary | null {
  if (!summary || typeof summary !== "object") {
    return null;
  }

  const data = summary as Record<string, unknown>;
  const created = (data.createdEntities as Record<string, unknown> | undefined) ?? {};
  const contactsRaw = Array.isArray(created.contacts) ? created.contacts : [];
  const tasksRaw = Array.isArray(created.tasks) ? created.tasks : [];
  const organizationsRaw = Array.isArray(created.organizations) ? created.organizations : [];

  return {
    importedEmails: parseNumber(data.importedEmails),
    matchedContacts: parseNumber(data.matchedContacts),
    suggestedContacts: parseNumber(data.suggestedContacts),
    generatedTasks: parseNumber(data.generatedTasks),
    unassignedEmails: parseNumber(data.unassignedEmails),
    createdEntities: {
      contacts: contactsRaw.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          id: String(row.id ?? ""),
          name: String(row.name ?? row.email ?? "Unknown contact"),
          email: String(row.email ?? ""),
          organizationName: typeof row.organizationName === "string" ? row.organizationName : null
        };
      }),
      tasks: tasksRaw.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          id: String(row.id ?? ""),
          title: String(row.title ?? "Untitled task"),
          priority: parsePriority(row.priority),
          suggestionStatus: String(row.suggestionStatus ?? "SUGGESTED"),
          contactId: typeof row.contactId === "string" ? row.contactId : null,
          contactName: typeof row.contactName === "string" ? row.contactName : null,
          projectId: typeof row.projectId === "string" ? row.projectId : null,
          projectTitle: typeof row.projectTitle === "string" ? row.projectTitle : null
        };
      }),
      organizations: organizationsRaw.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          id: String(row.id ?? ""),
          domain: String(row.domain ?? row.website ?? "unknown-domain")
        };
      })
    }
  };
}

export function getUnassignedEmailsCount(summary: unknown): number {
  return parseEmailSyncSummary(summary)?.unassignedEmails ?? 0;
}
