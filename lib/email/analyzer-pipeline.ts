import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ActivityType,
  EmailSyncJobStatus,
  Prisma,
  PipelineStage,
  ProjectPriority,
  TaskSuggestionStatus,
  TaskStatus
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchProviderMessages, computeBodyHash } from "@/lib/email/provider-client";
import { getDecryptedConnection, updateConnectionToken } from "@/lib/email/token-store";
import { refreshAccessToken } from "@/lib/email/oauth-service";
import { matchEmailToProject } from "@/lib/email/matching";
import { resolveProjectAssignment } from "@/lib/email/project-resolution";
import { detectPhaseFromText } from "@/lib/email/phase-triggers";
import type { EmailDirection, EmailFetchFilter } from "@/lib/email/types";
import { dedupeProviderMessages } from "@/lib/email/idempotency";
import type { NormalizedEmailMessage } from "@/lib/email/types";
import type { UniversityPhaseSuggestion } from "@/lib/constants";
import type { CalendarProposal } from "@/lib/email/analysis-metadata";
import { getGeminiApiKey } from "@/lib/env";

type AnalyzerOutput = {
  summary: string;
  intentCategory: "MEETING" | "PROPOSAL" | "FEEDBACK" | "ADMIN";
  themes: string[];
  risks: string[];
  nextSteps: Array<{ title: string; dueDays: number }>;
  actionItems: Array<{
    task: string;
    deadline: string | null;
    assigneeSuggestion: string | null;
  }>;
  sentimentScore: number;
  isUrgent: boolean;
  suggestedProjectStage: PipelineStage | null;
  suggestedUniversityPhase: UniversityPhaseSuggestion | null;
  meetingDatetimes: string[];
  suggestedActions: Array<{
    type: "SCHEDULE_MEETING" | "DRAFT_RESPONSE";
    title: string;
    description: string;
    proposedDateTime: string | null;
    deadline: string | null;
    dueDays: number | null;
  }>;
  followUpQuestions: string[];
};

type SuggestedProjectCandidate = {
  name: string;
  confidence: number;
  reason: string;
  likelyExisting: boolean;
  matchedProjectId: string | null;
};

type SuggestedTaskCandidate = {
  title: string;
  description: string | null;
  priority: ProjectPriority;
  deadlineIso: string | null;
  contactEmail: string | null;
  projectName: string | null;
  projectRef: string | null;
  confidence: number;
  reason: string;
};

type GeminiTaskSuggestionOutput = {
  projects: SuggestedProjectCandidate[];
  tasks: SuggestedTaskCandidate[];
};

const INTENT_CATEGORIES = new Set<AnalyzerOutput["intentCategory"]>([
  "MEETING",
  "PROPOSAL",
  "FEEDBACK",
  "ADMIN"
]);
const GEMINI_THROTTLE_MS = 4000;
const GEMINI_MAX_RETRIES = 3;
const GEMINI_RETRY_FALLBACK_MS = 10_000;
let lastGeminiCallAt = 0;

const WEEKDAY_ALIASES = new Map<string, number>([
  ["monday", 1],
  ["mon", 1],
  ["pondeli", 1],
  ["tuesday", 2],
  ["tue", 2],
  ["tues", 2],
  ["utery", 2],
  ["wednesday", 3],
  ["wed", 3],
  ["streda", 3],
  ["thursday", 4],
  ["thu", 4],
  ["thur", 4],
  ["thurs", 4],
  ["ctvrtek", 4],
  ["friday", 5],
  ["fri", 5],
  ["patek", 5],
  ["patku", 5],
  ["saturday", 6],
  ["sat", 6],
  ["sobota", 6],
  ["sunday", 0],
  ["sun", 0],
  ["nedele", 0]
]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown): boolean {
  const candidate = error as { status?: number; response?: { status?: number }; message?: string } | undefined;
  if (candidate?.status === 429) return true;
  if (candidate?.response?.status === 429) return true;
  if (typeof candidate?.message === "string" && candidate.message.includes("429")) return true;
  return false;
}

function parseRetryDelayMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value >= 1000 ? value : value * 1000;
  }
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    const seconds = trimmed.match(/^(\d+(?:\.\d+)?)s$/);
    if (seconds) {
      return Math.max(1, Math.ceil(Number(seconds[1]) * 1000));
    }
    const millis = trimmed.match(/^(\d+)ms$/);
    if (millis) {
      return Math.max(1, Number(millis[1]));
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric >= 1000 ? numeric : numeric * 1000;
    }
  }
  return null;
}

function extractRetryDelayMs(error: unknown): number | null {
  const candidate = error as
    | {
        retryDelay?: unknown;
        response?: { data?: { error?: { details?: Array<{ retryDelay?: unknown }> } } };
      }
    | undefined;
  const direct = parseRetryDelayMs(candidate?.retryDelay);
  if (direct) return direct;
  const detail = candidate?.response?.data?.error?.details?.find((item) => item?.retryDelay != null)?.retryDelay;
  return parseRetryDelayMs(detail);
}

async function generateContentWithRetry(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  payload: Parameters<ReturnType<GoogleGenerativeAI["getGenerativeModel"]>["generateContent"]>[0]
) {
  for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt += 1) {
    const waitBeforeCall = Math.max(0, GEMINI_THROTTLE_MS - (Date.now() - lastGeminiCallAt));
    if (waitBeforeCall > 0) {
      await sleep(waitBeforeCall);
    }

    try {
      lastGeminiCallAt = Date.now();
      return await model.generateContent(payload);
    } catch (error) {
      if (!isRateLimitError(error) || attempt >= GEMINI_MAX_RETRIES) {
        throw error;
      }
      const retryDelayMs = extractRetryDelayMs(error) ?? GEMINI_RETRY_FALLBACK_MS;
      await sleep(retryDelayMs);
    }
  }
  throw new Error("Gemini retry handler reached an unexpected state.");
}

function extractDomain(email?: string | null): string | null {
  if (!email) return null;
  const [, rawDomain] = email.toLowerCase().split("@");
  if (!rawDomain) return null;
  return rawDomain.trim() || null;
}

function normalizeWebsiteDomain(website?: string | null): string | null {
  if (!website) return null;

  try {
    const url = website.startsWith("http") ? new URL(website) : new URL(`https://${website}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return website
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      ?.toLowerCase() || null;
  }
}

function guessOrganizationName(domain: string): string {
  const base = domain.split(".")[0] || domain;
  return base
    .split(/[-_]/g)
    .filter(Boolean)
    .map((chunk) => chunk[0].toUpperCase() + chunk.slice(1))
    .join(" ");
}

function guessContactName(email: string, fallbackName?: string): string {
  if (fallbackName?.trim()) return fallbackName.trim();

  const localPart = email.split("@")[0] || email;
  return localPart
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0].toUpperCase() + chunk.slice(1))
    .join(" ");
}

async function resolveOrganizationByDomain(domain: string) {
  const organizations = await prisma.organization.findMany({
    where: {
      website: {
        not: null
      }
    },
    select: {
      id: true,
      website: true
    }
  });

  const existing = organizations.find((org) => normalizeWebsiteDomain(org.website) === domain);
  if (existing) {
    return { organizationId: existing.id, created: false, name: null as string | null, domain: null as string | null };
  }

  const created = await prisma.organization.create({
    data: {
      name: guessOrganizationName(domain),
      type: "COMPANY",
      website: domain
    },
    select: {
      id: true
    }
  });

  return { organizationId: created.id, created: true, name: guessOrganizationName(domain), domain };
}

async function resolveOrCreateContact(email: string, name?: string) {
  const existing = await prisma.contact.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive"
      }
    },
    include: {
      projectLinks: {
        select: {
          projectId: true
        }
      }
    }
  });

  if (existing) {
    return {
      contactId: existing.id,
      contactName: existing.name,
      contactEmail: existing.email,
      organizationId: existing.organizationId,
      organizationName: null as string | null,
      organizationDomain: null as string | null,
      projectIds: existing.projectLinks.map((link) => link.projectId),
      createdContact: false,
      createdOrganization: false
    };
  }

  const domain = extractDomain(email);
  const organization = domain ? await resolveOrganizationByDomain(domain) : null;

  const created = await prisma.contact.create({
    data: {
      name: guessContactName(email, name),
      email,
      role: "External Email Contact",
      organizationId: organization?.organizationId ?? null
    },
    select: {
      id: true
    }
  });

  return {
    contactId: created.id,
    contactName: guessContactName(email, name),
    contactEmail: email,
    organizationId: organization?.organizationId ?? null,
    organizationName: organization?.name ?? null,
    organizationDomain: organization?.domain ?? null,
    projectIds: [] as string[],
    createdContact: true,
    createdOrganization: organization?.created ?? false
  };
}

/**
 * Finds the most recently updated project linked to a given organization.
 * Used for automatic email-to-project matching when no explicit project is provided.
 */
export async function matchProjectForSender(
  organizationId: string | null,
  userId: string
): Promise<string | null> {
  if (!organizationId) return null;

  const project = await prisma.project.findFirst({
    where: {
      organizationId,
      ownerUserId: userId
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true }
  });

  return project?.id ?? null;
}

async function resolveProjectIdForActivity(
  userId: string,
  explicitProjectId?: string,
  contactProjectIds: string[] = [],
  organizationId?: string | null
) {
  const orgMatch = await matchProjectForSender(organizationId ?? null, userId);
  const userProject = await prisma.project.findFirst({
    where: {
      ownerUserId: userId
    },
    orderBy: {
      updatedAt: "desc"
    },
    select: {
      id: true
    }
  });
  const resolution = resolveProjectAssignment({
    explicitProjectId,
    contactProjectIds,
    organizationProjectId: orgMatch,
    userOwnedProjectId: userProject?.id ?? null
  });
  return resolution.projectId;
}

export type AnalyzeCommunicationInput = {
  userId: string;
  projectId?: string;
  provider?: "GMAIL" | "OUTLOOK";
  direction?: "all" | EmailDirection;
  dateFrom?: Date;
  dateTo?: Date;
  contactEmail?: string;
  trigger?: "MANUAL" | "SCHEDULED";
};

const OUTPUT_EXAMPLE = {
  summary: "Short factual summary of communication.",
  intentCategory: "PROPOSAL",
  themes: ["IP", "market validation"],
  risks: ["Missing IP status"],
  nextSteps: [{ title: "Book startup mentor call", dueDays: 5 }],
  actionItems: [
    {
      task: "Share first draft statement of work",
      deadline: "2026-05-06",
      assignee_suggestion: "Alice"
    }
  ],
  sentimentScore: 7,
  isUrgent: false,
  suggestedProjectStage: "DISCOVERY",
  suggestedUniversityPhase: "CONTRACTING",
  meetingDatetimes: ["2026-05-05T13:00:00Z"],
  suggestedActions: [
    {
      type: "SCHEDULE_MEETING",
      title: "Schedule intro meeting",
      description: "Sender requested a meeting this week.",
      proposedDateTime: "2026-05-05T13:00:00Z",
      deadline: null,
      dueDays: 2
    },
    {
      type: "DRAFT_RESPONSE",
      title: "Draft statement for procurement team",
      description: "Prepare response with requested compliance statement.",
      proposedDateTime: null,
      deadline: "2026-05-07",
      dueDays: 3
    }
  ],
  followUpQuestions: [
    "What budget range has been approved for this proposal?",
    "Who are the decision-makers and what is the target decision date?",
    "Which pilot scope and success metrics are expected in the first 90 days?"
  ]
};

const PIPELINE_STAGES = new Set<PipelineStage>(Object.values(PipelineStage));
const UNIVERSITY_PHASES = new Set<UniversityPhaseSuggestion>(["IDEATION", "CONTRACTING", "IMPLEMENTATION", "DELIVERY"]);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameCalendarDate(date: Date, year: number, monthIndex: number, day: number): boolean {
  return date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day;
}

function parseIntentCategory(value: unknown): AnalyzerOutput["intentCategory"] | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return INTENT_CATEGORIES.has(normalized as AnalyzerOutput["intentCategory"])
    ? (normalized as AnalyzerOutput["intentCategory"])
    : null;
}

function parseDueDaysFromIsoDate(deadline: string | null, referenceDate: Date): number | null {
  if (!deadline) return null;
  const parsed = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const diffMs = startOfDay(parsed).getTime() - startOfDay(referenceDate).getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  return diffDays < 0 ? null : diffDays;
}

function getWeekdayTarget(normalizedText: string): number | null {
  const tokens = new Set(normalizedText.match(/[a-z0-9]+/g) ?? []);
  for (const [alias, weekday] of WEEKDAY_ALIASES.entries()) {
    if (tokens.has(alias)) return weekday;
  }
  return null;
}

function resolveWeekdayDate(rawValue: string, referenceDate: Date): string | null {
  const normalized = normalizeText(rawValue);
  const targetWeekday = getWeekdayTarget(normalized);
  if (targetWeekday === null) return null;

  const currentWeekday = referenceDate.getDay();
  let delta = (targetWeekday - currentWeekday + 7) % 7;
  if (/\b(next|pristi|nasledujici)\b/.test(normalized)) {
    delta = delta === 0 ? 7 : delta + 7;
  }

  const resolved = startOfDay(referenceDate);
  resolved.setDate(resolved.getDate() + delta);
  return toIsoDate(resolved);
}

function parseAbsoluteDate(rawValue: string, referenceDate: Date): string | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const isoDateMatch = trimmed.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoDateMatch) return isoDateMatch[1];

  const dottedMatch = trimmed.match(/\b(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\b/);
  if (dottedMatch) {
    const day = Number(dottedMatch[1]);
    const month = Number(dottedMatch[2]);
    const rawYear = dottedMatch[3];
    const year = rawYear ? Number(rawYear.length === 2 ? `20${rawYear}` : rawYear) : referenceDate.getFullYear();
    const monthIndex = month - 1;
    const date = new Date(year, monthIndex, day);
    if (!Number.isNaN(date.getTime()) && isSameCalendarDate(date, year, monthIndex, day)) return toIsoDate(date);
  }

  const slashMatch = trimmed.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slashMatch) {
    const first = Number(slashMatch[1]);
    const second = Number(slashMatch[2]);
    const rawYear = slashMatch[3];
    const year = rawYear ? Number(rawYear.length === 2 ? `20${rawYear}` : rawYear) : referenceDate.getFullYear();

    // Slash dates are locale-ambiguous. Only parse when unambiguous:
    // - DD/MM when first > 12
    // - MM/DD when second > 12
    // If both are <= 12, keep null to avoid silently wrong deadlines.
    if (first > 12 && second <= 12) {
      const monthIndex = second - 1;
      const date = new Date(year, monthIndex, first);
      if (!Number.isNaN(date.getTime()) && isSameCalendarDate(date, year, monthIndex, first)) return toIsoDate(date);
    }
    if (second > 12 && first <= 12) {
      const monthIndex = first - 1;
      const day = second;
      const date = new Date(year, monthIndex, day);
      if (!Number.isNaN(date.getTime()) && isSameCalendarDate(date, year, monthIndex, day)) return toIsoDate(date);
    }

    return null;
  }

  const nativeDate = new Date(trimmed);
  if (!Number.isNaN(nativeDate.getTime())) return toIsoDate(nativeDate);

  return null;
}

function normalizeDeadlineToIso(value: unknown, referenceDate: Date): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = normalizeText(trimmed);
  if (normalized === "today" || normalized === "dnes") {
    return toIsoDate(startOfDay(referenceDate));
  }
  if (normalized === "tomorrow" || normalized === "zitra") {
    const result = startOfDay(referenceDate);
    result.setDate(result.getDate() + 1);
    return toIsoDate(result);
  }
  if (normalized === "day after tomorrow" || normalized === "pozitri") {
    const result = startOfDay(referenceDate);
    result.setDate(result.getDate() + 2);
    return toIsoDate(result);
  }

  const weekdayDate = resolveWeekdayDate(trimmed, referenceDate);
  if (weekdayDate) return weekdayDate;

  return parseAbsoluteDate(trimmed, referenceDate);
}

// Test-only export for deterministic parser regression tests.
export function normalizeDeadlineToIsoForReferenceDate(value: unknown, referenceDate: Date): string | null {
  return normalizeDeadlineToIso(value, referenceDate);
}

function parseActionItems(value: unknown, referenceDate: Date): AnalyzerOutput["actionItems"] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => {
      const taskCandidate =
        typeof item.task === "string"
          ? item.task
          : typeof item.title === "string"
            ? item.title
            : typeof item.description === "string"
              ? item.description
              : "";
      const task = taskCandidate.trim();
      if (!task) return null;

      const deadlineCandidate =
        typeof item.deadline === "string"
          ? item.deadline
          : typeof item.dueDate === "string"
            ? item.dueDate
            : typeof item.due === "string"
              ? item.due
              : "";
      const assigneeCandidate =
        typeof item.assignee_suggestion === "string"
          ? item.assignee_suggestion
          : typeof item.assigneeSuggestion === "string"
            ? item.assigneeSuggestion
            : typeof item.assignee === "string"
              ? item.assignee
              : typeof item.owner === "string"
                ? item.owner
                : "";

      return {
        task,
        deadline: normalizeDeadlineToIso(deadlineCandidate, referenceDate),
        assigneeSuggestion: assigneeCandidate.trim() || null
      };
    })
    .filter((item): item is AnalyzerOutput["actionItems"][number] => !!item);
}

function inferIntentCategory(
  summary: string,
  themes: string[],
  followUpQuestions: string[],
  suggestedActions: AnalyzerOutput["suggestedActions"]
): AnalyzerOutput["intentCategory"] {
  const merged = normalizeText([summary, ...themes, ...suggestedActions.map((action) => action.title)].join(" "));
  const hasFeedbackSignals = /(feedback|revision|review|comment|approve|approval|pripomink|zpetn|upravit|schval)/.test(
    merged
  );
  const hasAdminSignals = /(invoice|billing|access|credential|login|admin|faktura|pristup|technick)/.test(merged);
  const hasProposalSignals =
    /(proposal|scope|budget|pricing|price|quote|rfp|statement of work|sow|pilot|project intake|zadani|rozpocet|nabidka)/.test(
      merged
    ) || followUpQuestions.length > 0;

  if (suggestedActions.some((action) => action.type === "SCHEDULE_MEETING")) return "MEETING";
  if (followUpQuestions.length >= 3) return "PROPOSAL";
  if (hasProposalSignals && !hasAdminSignals) return "PROPOSAL";
  if (hasFeedbackSignals) return "FEEDBACK";
  if (hasAdminSignals) return "ADMIN";
  return "FEEDBACK";
}

function parseDueDays(value: unknown): number | null {
  const dueDays =
    typeof value === "number"
      ? Math.round(value)
      : typeof value === "string"
        ? Math.round(Number(value))
        : NaN;

  if (Number.isNaN(dueDays) || dueDays < 0) return null;
  return dueDays;
}

function parseSentimentScore(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? Math.round(value)
      : typeof value === "string"
        ? Math.round(Number(value))
        : NaN;

  if (Number.isNaN(parsed)) return 5;
  return Math.max(1, Math.min(10, parsed));
}

function parseSuggestedProjectStage(value: unknown): PipelineStage | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;
  return PIPELINE_STAGES.has(normalized as PipelineStage) ? (normalized as PipelineStage) : null;
}

function parseSuggestedUniversityPhase(value: unknown): UniversityPhaseSuggestion | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;
  return UNIVERSITY_PHASES.has(normalized as UniversityPhaseSuggestion) ? (normalized as UniversityPhaseSuggestion) : null;
}

function parseMeetingDatetimes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => v && !Number.isNaN(new Date(v).getTime()));
}

function normalizeDateTimeToIso(value: unknown, referenceDate: Date): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

  const asDateOnly = normalizeDeadlineToIso(trimmed, referenceDate);
  if (!asDateOnly) return null;
  return `${asDateOnly}T09:00:00.000Z`;
}

function buildCalendarProposals(
  suggestedActions: AnalyzerOutput["suggestedActions"],
  referenceDate: Date
): CalendarProposal[] {
  return suggestedActions
    .map((action) => {
      const proposedDateTimeIso = normalizeDateTimeToIso(action.proposedDateTime, referenceDate);
      const allDayDateIso =
        !proposedDateTimeIso && action.deadline ? normalizeDeadlineToIso(action.deadline, referenceDate) : null;

      if (!proposedDateTimeIso && !allDayDateIso) {
        return null;
      }

      return {
        actionType: action.type,
        title: action.title,
        proposedDateTimeIso,
        allDayDateIso,
        timezone: "UTC"
      } satisfies CalendarProposal;
    })
    .filter((item): item is CalendarProposal => !!item);
}

function sanitizeJson(text: string) {
  const trimmed = text.trim();

  // Already valid JSON — fast path
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }

  // Extract from markdown code block (```json … ``` or ``` … ```) anywhere in response
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    const inner = codeBlockMatch[1].trim();
    if (inner.startsWith("{") || inner.startsWith("[")) {
      return inner;
    }
  }

  // JSON embedded in prose — find outermost braces
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function parseConfidence(value: unknown): number {
  const raw = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (Number.isNaN(raw)) return 0.5;
  return Math.max(0, Math.min(1, raw));
}

function parsePriority(value: unknown): ProjectPriority {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (normalized === ProjectPriority.LOW || normalized === ProjectPriority.HIGH || normalized === ProjectPriority.URGENT) {
    return normalized;
  }
  return ProjectPriority.MEDIUM;
}

function normalizeProjectName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseGeminiTaskSuggestionOutput(raw: string): GeminiTaskSuggestionOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitizeJson(raw)) as unknown;
  } catch (error) {
    console.error("[email-enrichment] Invalid Gemini task suggestion JSON", {
      error: error instanceof Error ? error.message : String(error),
      raw: raw.slice(0, 500)
    });
    return { projects: [], tasks: [] };
  }
  if (!parsed || typeof parsed !== "object") {
    return { projects: [], tasks: [] };
  }

  const payload = parsed as Record<string, unknown>;
  const rawProjects = Array.isArray(payload.projects) ? payload.projects : [];
  const rawTasks = Array.isArray(payload.tasks) ? payload.tasks : [];
  const dedupe = new Set<string>();

  const projects: SuggestedProjectCandidate[] = rawProjects
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row) => {
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!name) return null;
      const key = normalizeProjectName(name);
      if (dedupe.has(key)) return null;
      dedupe.add(key);
      const candidate: SuggestedProjectCandidate = {
        name,
        confidence: parseConfidence(row.confidence),
        reason: typeof row.reason === "string" ? row.reason.trim() : "Detected from communication",
        likelyExisting: Boolean(row.likelyExisting),
        matchedProjectId: null
      };
      return candidate;
    })
    .filter((row): row is SuggestedProjectCandidate => !!row);

  const tasks = rawTasks
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row) => {
      const title = typeof row.title === "string" ? row.title.trim() : "";
      if (!title) return null;
      return {
        title,
        description: typeof row.description === "string" ? row.description.trim() || null : null,
        priority: parsePriority(row.priority),
        deadlineIso: normalizeDeadlineToIso(row.deadline, new Date()),
        contactEmail: typeof row.contactEmail === "string" ? row.contactEmail.trim().toLowerCase() || null : null,
        projectName: typeof row.projectName === "string" ? row.projectName.trim() || null : null,
        projectRef: typeof row.projectRef === "string" ? row.projectRef.trim() || null : null,
        confidence: parseConfidence(row.confidence),
        reason: typeof row.reason === "string" ? row.reason.trim() : "Detected from communication"
      };
    })
    .filter((row): row is SuggestedTaskCandidate => !!row);

  return { projects, tasks };
}

export function parseAnalyzerOutput(raw: string): AnalyzerOutput {
  const referenceDate = new Date();

  try {
    const parsed = JSON.parse(sanitizeJson(raw)) as unknown;

    if (!parsed || typeof parsed !== "object") {
      throw new Error("invalid");
    }

    const value = parsed as Record<string, unknown>;

    const summary = typeof value.summary === "string" ? value.summary.trim() : "";
    const themes = Array.isArray(value.themes) ? value.themes.filter((v): v is string => typeof v === "string") : [];
    const risks = Array.isArray(value.risks) ? value.risks.filter((v): v is string => typeof v === "string") : [];
    const actionItemsFromModel = parseActionItems(value.actionItems, referenceDate);
    let nextSteps = Array.isArray(value.nextSteps)
      ? value.nextSteps
          .filter((step): step is Record<string, unknown> => !!step && typeof step === "object")
          .map((step) => {
            const title = typeof step.title === "string" ? step.title.trim() : "";
            const dueDays = parseDueDays(step.dueDays);

            if (!title || dueDays === null) {
              return null;
            }

            return { title, dueDays };
          })
          .filter((step): step is { title: string; dueDays: number } => !!step)
      : [];

    const sentimentScore = parseSentimentScore(value.sentimentScore);
    const isUrgent = typeof value.isUrgent === "boolean" ? value.isUrgent : false;
    const suggestedProjectStage = parseSuggestedProjectStage(value.suggestedProjectStage);
    const suggestedUniversityPhase = parseSuggestedUniversityPhase(value.suggestedUniversityPhase);
    const meetingDatetimes = parseMeetingDatetimes(value.meetingDatetimes);
    const suggestedActions = Array.isArray(value.suggestedActions)
      ? value.suggestedActions
          .filter((action): action is Record<string, unknown> => !!action && typeof action === "object")
          .map((action) => {
            const rawType = typeof action.type === "string" ? action.type.trim().toUpperCase() : "";
            if (rawType !== "SCHEDULE_MEETING" && rawType !== "DRAFT_RESPONSE") {
              return null;
            }

            const title = typeof action.title === "string" ? action.title.trim() : "";
            if (!title) return null;

            const description = typeof action.description === "string" ? action.description.trim() : "";
            const proposedDateTime = normalizeDateTimeToIso(action.proposedDateTime, referenceDate);
            const deadline = normalizeDeadlineToIso(action.deadline, referenceDate);
            const dueDays = parseDueDays(action.dueDays) ?? parseDueDaysFromIsoDate(deadline, referenceDate);

            return {
              type: rawType,
              title,
              description:
                description ||
                (rawType === "SCHEDULE_MEETING"
                  ? "AI detected a meeting request."
                  : "AI detected a statement/response request."),
              proposedDateTime,
              deadline,
              dueDays
            } as AnalyzerOutput["suggestedActions"][number];
          })
          .filter((action): action is AnalyzerOutput["suggestedActions"][number] => !!action)
      : [];

    const questionsFromFollowUp = Array.isArray(value.followUpQuestions)
      ? value.followUpQuestions
          .filter((question): question is string => typeof question === "string")
          .map((question) => question.trim())
          .filter(Boolean)
      : [];
    const questionsFromGap = Array.isArray(value.gapAnalysisQuestions)
      ? value.gapAnalysisQuestions
          .filter((question): question is string => typeof question === "string")
          .map((question) => question.trim())
          .filter(Boolean)
      : [];
    const mergedQuestions = [...questionsFromGap, ...questionsFromFollowUp].filter(
      (question, index, list) => list.indexOf(question) === index
    );

    const intentCategory =
      parseIntentCategory(value.intentCategory) ??
      inferIntentCategory(summary, themes, mergedQuestions, suggestedActions);
    const followUpQuestions =
      intentCategory === "PROPOSAL"
        ? [
            ...mergedQuestions,
            "What budget range has been approved for this project?",
            "What target timeline and decision date should we plan for?",
            "What scope and success criteria are required for phase one?"
          ].slice(0, 3)
        : mergedQuestions.slice(0, 3);

    const actionItems =
      actionItemsFromModel.length > 0
        ? actionItemsFromModel
        : suggestedActions.map((action) => ({
            task: action.title,
            deadline:
              action.deadline ??
              (typeof action.proposedDateTime === "string"
                ? normalizeDeadlineToIso(action.proposedDateTime, referenceDate)
                : null),
            assigneeSuggestion: null
          }));

    if (nextSteps.length === 0) {
      nextSteps = actionItems
        .map((item) => {
          const dueDays = parseDueDaysFromIsoDate(item.deadline, referenceDate);
          if (dueDays === null) return null;
          return { title: item.task, dueDays };
        })
        .filter((item): item is { title: string; dueDays: number } => !!item);
    }

    if (!summary) {
      throw new Error("invalid");
    }

    return {
      summary,
      intentCategory,
      themes,
      risks,
      nextSteps,
      actionItems,
      sentimentScore,
      isUrgent,
      suggestedProjectStage,
      suggestedUniversityPhase,
      meetingDatetimes,
      suggestedActions,
      followUpQuestions
    };
  } catch (error) {
    console.error("parseAnalyzerOutput failed, using fallback", {
      error: error instanceof Error ? error.message : String(error),
      raw: raw.slice(0, 500)
    });
    return {
      summary: "Analyzer fallback: structured extraction unavailable for this message.",
      intentCategory: "ADMIN",
      themes: [],
      risks: [],
      nextSteps: [],
      actionItems: [],
      sentimentScore: 5,
      isUrgent: false,
      suggestedProjectStage: null,
      suggestedUniversityPhase: null,
      meetingDatetimes: [],
      suggestedActions: [],
      followUpQuestions: []
    };
  }
}

async function analyzeText(subject: string, bodyText: string): Promise<AnalyzerOutput> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return {
      summary: "Analyzer skipped: missing Gemini API key (GOOGLE_API_KEY or GEMINI_API_KEY).",
      intentCategory: "ADMIN",
      themes: [],
      risks: [],
      nextSteps: [],
      actionItems: [],
      sentimentScore: 5,
      isUrgent: false,
      suggestedProjectStage: null,
      suggestedUniversityPhase: null,
      meetingDatetimes: [],
      suggestedActions: [],
      followUpQuestions: []
    };
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
  const analysisDate = toIsoDate(new Date());
  const systemPrompt = [
    "You are an email CRM analyzer for a university innovation platform. Return strict JSON only.",
    "Classify each email into exactly one intentCategory: MEETING, PROPOSAL, FEEDBACK, ADMIN.",
    "Extract actionItems array with fields task, deadline, assignee_suggestion.",
    "Convert relative deadlines like 'do pátku', 'by Friday', 'tomorrow' to ISO date YYYY-MM-DD using analysis_date.",
    "For PROPOSAL intent return exactly 3 followUpQuestions focused on missing CRM intake info (budget, timeline, scope/success criteria).",
    "Scenario guidance:",
    "1) MEETING: detect request for time slot and add SCHEDULE_MEETING suggested action with full ISO 8601 proposedDateTime.",
    "2) PROPOSAL: detect new project discussion (scope/price/offer/grant).",
    "3) FEEDBACK: detect response to delivered work, revisions, approval comments.",
    "4) ADMIN: detect invoice/access/login/technical operations communication.",
    "University project phase detection (suggestedUniversityPhase):",
    "- IDEATION: email discusses a new idea, concept, or initial interest in a research/innovation project.",
    "- CONTRACTING: email involves grant applications, NDAs, partnership agreements, budget approval, or signing.",
    "- IMPLEMENTATION: active project work, milestones, progress reports, or ongoing collaboration.",
    "- DELIVERY: results handover, final reports, spin-off preparation, or project closure.",
    "- Set null if university phase context is unclear.",
    "Meeting datetime extraction (meetingDatetimes):",
    "- Extract all proposed meeting/call times as full ISO 8601 strings (e.g. 2026-05-05T13:00:00Z).",
    "- Use the analysis_date timezone context; if only a date is mentioned, use T09:00:00Z as default time.",
    "- Return empty array [] if no specific meeting time is proposed.",
    "Task ranking signals:",
    "- isUrgent: true if grant deadline, contract signing, or critical milestone is implied.",
    "Metadata requirements and allowed values:",
    "- sentimentScore: integer 1-10",
    "- isUrgent: boolean (true if message implies deadline/time pressure)",
    "- suggestedProjectStage: one of DISCOVERY, VALIDATION, MVP, SCALING, SPIN_OFF or null",
    "- suggestedUniversityPhase: one of IDEATION, CONTRACTING, IMPLEMENTATION, DELIVERY or null",
    "- meetingDatetimes: array of ISO 8601 datetime strings",
    "- suggestedActions: array of objects with fields type, title, description, proposedDateTime (ISO 8601 full datetime), deadline, dueDays"
  ].join("\n");
  const userPrompt = [
    "Analyze CRM communication and return strict JSON.",
    "Extract themes, risks, actionable next steps, intent category, action items, and gap-analysis questions.",
    JSON.stringify(OUTPUT_EXAMPLE),
    `analysis_date: ${analysisDate}`,
    `Subject: ${subject}`,
    `Body: ${bodyText}`
  ].join("\n\n");
  const prompt = [systemPrompt, userPrompt].join("\n\n");

  const response = await generateContentWithRetry(model, {
    generationConfig: {
      responseMimeType: "application/json"
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ]
  });

  return parseAnalyzerOutput(response.response.text());
}

async function analyzeTaskSuggestionsWithGemini(params: {
  subject: string;
  bodyText: string;
  senderEmail: string | null;
  knownProjects: Array<{ id: string; title: string }>;
}): Promise<GeminiTaskSuggestionOutput> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return { projects: [], tasks: [] };

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = [
    "Return strict JSON only.",
    "Extract project and task proposals from CRM communication.",
    "projects[] fields: name, likelyExisting, confidence (0..1), reason",
    "tasks[] fields: title, description, priority (LOW|MEDIUM|HIGH|URGENT), deadline, contactEmail, projectName, projectRef, confidence (0..1), reason",
    "Rules:",
    "- Detect one or multiple projects if present.",
    "- If unsure about existing project match, keep confidence low and set explicit reason.",
    "- deadline must be parseable date phrase or null.",
    `Known projects: ${params.knownProjects.map((p) => `${p.id}:${p.title}`).join(" | ")}`,
    `Sender email: ${params.senderEmail ?? "unknown"}`,
    `Subject: ${params.subject}`,
    `Body: ${params.bodyText.slice(0, 5000)}`
  ].join("\n");

  const response = await generateContentWithRetry(model, {
    generationConfig: { responseMimeType: "application/json" },
    contents: [{ role: "user", parts: [{ text: prompt }] }]
  });

  return parseGeminiTaskSuggestionOutput(response.response.text());
}

export function matchSuggestedProjectToExisting(
  suggestedName: string | null,
  knownProjects: Array<{ id: string; title: string }>
): string | null {
  if (!suggestedName) return null;
  const normalized = normalizeProjectName(suggestedName);
  const exact = knownProjects.find((project) => normalizeProjectName(project.title) === normalized);
  if (exact) return exact.id;
  const partial = knownProjects.find((project) => normalizeProjectName(project.title).includes(normalized) || normalized.includes(normalizeProjectName(project.title)));
  return partial?.id ?? null;
}

function applyUniversityTaskPriority(
  suggestion: Pick<SuggestedTaskCandidate, "title" | "description" | "reason" | "priority">
): ProjectPriority {
  const signalText = normalizeText([suggestion.title, suggestion.description ?? "", suggestion.reason].join(" "));
  if (/(grant deadline|deadline for grant|uzaverka grantu|grantova uzaverka)/.test(signalText)) {
    return ProjectPriority.URGENT;
  }
  if (/(research milestone|milestone|vyzkumny milnik|milnik vyzkumu)/.test(signalText)) {
    if (suggestion.priority === ProjectPriority.LOW || suggestion.priority === ProjectPriority.MEDIUM) {
      return ProjectPriority.HIGH;
    }
  }
  return suggestion.priority;
}

async function createSuggestedTaskIfMissing(params: {
  activityId: string;
  projectId: string;
  contactId: string | null;
  syncJobId: string | null;
  suggestion: SuggestedTaskCandidate;
}) {
  const dueDate = params.suggestion.deadlineIso ? new Date(params.suggestion.deadlineIso) : null;
  const normalizedDueDate = dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate : null;

  try {
    return await prisma.task.create({
      data: {
        projectId: params.projectId,
        contactId: params.contactId,
        sourceSyncJobId: params.syncJobId,
        assignedToUserId: null,
        sourceActivityId: params.activityId,
        title: params.suggestion.title,
        description: params.suggestion.description,
        status: TaskStatus.TODO,
        priority: applyUniversityTaskPriority(params.suggestion),
        dueDate: normalizedDueDate,
        suggestionStatus: TaskSuggestionStatus.SUGGESTED,
        suggestionConfidence: params.suggestion.confidence,
        suggestionReason: params.suggestion.reason,
        suggestionMetadata: params.suggestion as Prisma.InputJsonValue
      },
      include: {
        project: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return null;
    }
    throw error;
  }
}

function resolveSuggestedProjectId(
  suggestion: Pick<SuggestedTaskCandidate, "projectName" | "projectRef">,
  knownProjects: Array<{ id: string; title: string }>,
  fallbackProjectId: string
): string {
  const byName = matchSuggestedProjectToExisting(suggestion.projectName, knownProjects);
  if (byName) return byName;
  const byRef = matchSuggestedProjectToExisting(suggestion.projectRef, knownProjects);
  if (byRef) return byRef;
  return fallbackProjectId;
}

type PersistEmailContext = {
  jobId: string;
  userId: string;
  projectId?: string;
  keywordAliases: string[];
  stats: {
    importedEmails: number;
    matchedContacts: number;
    suggestedContacts: number;
    generatedTasks: number;
    createdOrganizations: number;
    createdContacts: number;
    createdActivities: number;
    unassignedEmails: number;
  };
  createdEntities: {
    contacts: Array<{ id: string; name: string; email: string; organizationName: string | null }>;
    organizations: Array<{ id: string; domain: string }>;
    tasks: Array<{
      id: string;
      title: string;
      priority: ProjectPriority;
      suggestionStatus: TaskSuggestionStatus;
      contactId: string | null;
      contactName: string | null;
      projectId: string | null;
      projectTitle: string | null;
    }>;
    suggestedProjects: Array<{
      name: string;
      matchedProjectId: string | null;
      confidence: number;
      reason: string;
    }>;
  };
  themes: Set<string>;
  risks: Set<string>;
  nextSteps: Set<string>;
};

async function processEmailMessageForEnrichment(
  context: PersistEmailContext,
  connection: { id: string; provider: "GMAIL" | "OUTLOOK"; emailAddress?: string | null },
  message: NormalizedEmailMessage,
  projectForMatching: Prisma.ProjectGetPayload<{
    include: {
      contacts: { include: { contact: { include: { organization: true } } } };
      emailAutomationSetting: true;
    };
  }> | null
) {
  const fromParticipant = message.participants.from[0]?.email?.toLowerCase();
  const userEmail = connection.emailAddress?.toLowerCase();
  const direction: EmailDirection =
    fromParticipant && userEmail
      ? fromParticipant === userEmail
        ? "outbound"
        : "inbound"
      : "unknown";

  const persistedMessage = await prisma.emailMessage.upsert({
    where: {
      providerMessageId: message.providerMessageId
    },
    create: {
      accountConnectionId: connection.id,
      provider: connection.provider,
      providerMessageId: message.providerMessageId,
      providerThreadId: message.providerThreadId,
      providerParentMessageId: message.providerParentMessageId,
      internetMessageId: message.internetMessageId,
      subject: message.subject,
      direction,
      participants: message.participants as Prisma.InputJsonValue,
      sentAt: message.sentAt,
      snippet: message.snippet,
      bodyText: message.bodyText,
      bodyHash: computeBodyHash(message),
      hasBody: !!message.bodyText
    },
    update: {
      providerThreadId: message.providerThreadId,
      providerParentMessageId: message.providerParentMessageId,
      subject: message.subject,
      direction,
      participants: message.participants as Prisma.InputJsonValue,
      sentAt: message.sentAt,
      snippet: message.snippet,
      bodyText: message.bodyText,
      bodyHash: computeBodyHash(message),
      hasBody: !!message.bodyText
    }
  });

  context.stats.importedEmails += 1;

  let senderContactId: string | null = null;
  let senderOrganizationId: string | null = null;
  let senderProjectIds: string[] = [];
  const sender = message.participants.from[0];
  if (sender?.email) {
    const senderEmail = sender.email.toLowerCase();
    // Skip contact creation for the account owner's own email to avoid self-contact pollution.
    // Test exception: emails that only partially resemble the user email are still allowed.
    const isOwnEmail = userEmail != null && senderEmail === userEmail;
    const senderResolution = isOwnEmail ? null : await resolveOrCreateContact(senderEmail, sender.name);
    if (senderResolution) {
    senderContactId = senderResolution.contactId;
    senderOrganizationId = senderResolution.organizationId;
    senderProjectIds = senderResolution.projectIds;

    if (senderResolution.createdContact) {
      context.stats.suggestedContacts += 1;
      context.stats.createdContacts += 1;
      context.createdEntities.contacts.push({
        id: senderResolution.contactId,
        name: senderResolution.contactName || guessContactName(senderEmail, sender.name),
        email: senderResolution.contactEmail ?? senderEmail,
        organizationName: senderResolution.organizationName
      });
    }
    if (senderResolution.createdOrganization) {
      context.stats.createdOrganizations += 1;
      if (senderResolution.organizationId && senderResolution.organizationDomain) {
        context.createdEntities.organizations.push({
          id: senderResolution.organizationId,
          domain: senderResolution.organizationDomain
        });
      }
    }
    }
  }

  let matchedProjectId = context.projectId;

  if (projectForMatching) {
    const match = matchEmailToProject(
      projectForMatching,
      projectForMatching.contacts,
      context.keywordAliases,
      message
    );

    if (match.matched) {
      await prisma.projectEmailLink.upsert({
        where: {
          projectId_emailMessageId: {
            projectId: projectForMatching.id,
            emailMessageId: persistedMessage.id
          }
        },
        create: {
          projectId: projectForMatching.id,
          emailMessageId: persistedMessage.id,
          confidence: match.confidence,
          reason: match.reason
        },
        update: {
          confidence: match.confidence,
          reason: match.reason
        }
      });

      matchedProjectId = projectForMatching.id;
      context.stats.matchedContacts += match.reason === "contact_email_exact" ? 1 : 0;
    }
  }

  const projectIdForActivity = await resolveProjectIdForActivity(
    context.userId,
    matchedProjectId,
    senderProjectIds,
    senderOrganizationId
  );

  if (!projectIdForActivity) {
    context.stats.unassignedEmails += 1;
    await prisma.activity.upsert({
      where: {
        emailMessageId: persistedMessage.providerMessageId
      },
      create: {
        projectId: null,
        userId: context.userId,
        type: ActivityType.EMAIL,
        note: message.snippet?.trim() || message.subject?.trim() || "Imported email (unassigned project)",
        bodyContent: message.bodyText ?? null,
        emailMessageId: persistedMessage.providerMessageId,
        emailParentId: persistedMessage.providerParentMessageId,
        aiAnalysis: Prisma.JsonNull,
        analysisMetadata: {
          analysisStatus: "UNASSIGNED_PROJECT",
          reason: "No explicit/contact/organization/user-owned project match.",
          direction,
          processedAt: new Date().toISOString()
        } satisfies Prisma.InputJsonValue,
        activityDate: persistedMessage.sentAt
      },
      update: {
        projectId: null,
        userId: context.userId,
        note: message.snippet?.trim() || message.subject?.trim() || "Imported email (unassigned project)",
        bodyContent: message.bodyText ?? null,
        emailParentId: persistedMessage.providerParentMessageId,
        aiAnalysis: Prisma.JsonNull,
        analysisMetadata: {
          analysisStatus: "UNASSIGNED_PROJECT",
          reason: "No explicit/contact/organization/user-owned project match.",
          direction,
          processedAt: new Date().toISOString()
        } satisfies Prisma.InputJsonValue,
        activityDate: persistedMessage.sentAt
      }
    });
    context.stats.createdActivities += 1;
    return;
  }

  const joinedText = [message.subject || "", message.snippet || "", message.bodyText || ""].join("\n").trim();
  let data: AnalyzerOutput;
  try {
    data = await analyzeText(message.subject || "(no subject)", joinedText);
  } catch (error) {
    await prisma.activity.upsert({
      where: {
        emailMessageId: persistedMessage.providerMessageId
      },
      create: {
        projectId: projectIdForActivity,
        userId: context.userId,
        type: ActivityType.EMAIL,
        note: "AI analysis pending: rate limited or temporary model failure.",
        bodyContent: message.bodyText ?? null,
        emailMessageId: persistedMessage.providerMessageId,
        emailParentId: persistedMessage.providerParentMessageId,
        aiAnalysis: Prisma.JsonNull,
        analysisMetadata: {
          analysisStatus: "PENDING",
          analysisError: error instanceof Error ? error.message : String(error),
          direction,
          processedAt: new Date().toISOString()
        } satisfies Prisma.InputJsonValue,
        activityDate: persistedMessage.sentAt
      },
      update: {
        note: "AI analysis pending: rate limited or temporary model failure.",
        bodyContent: message.bodyText ?? null,
        emailParentId: persistedMessage.providerParentMessageId,
        aiAnalysis: Prisma.JsonNull,
        analysisMetadata: {
          analysisStatus: "PENDING",
          analysisError: error instanceof Error ? error.message : String(error),
          direction,
          processedAt: new Date().toISOString()
        } satisfies Prisma.InputJsonValue,
        activityDate: persistedMessage.sentAt
      }
    });
    context.stats.createdActivities += 1;
    return;
  }
  for (const theme of data.themes) context.themes.add(theme);
  for (const risk of data.risks) context.risks.add(risk);
  for (const step of data.nextSteps) context.nextSteps.add(step.title);

  const analysisMetadata: Prisma.InputJsonValue = {
    themes: data.themes,
    risks: data.risks,
    direction,
    autoMatchedByOrganization: !context.projectId && !!senderOrganizationId,
    sentimentScore: data.sentimentScore,
    isUrgent: data.isUrgent,
    suggestedProjectStage: data.suggestedProjectStage,
    suggestedUniversityPhase: data.suggestedUniversityPhase ?? detectPhaseFromText(joinedText),
    meetingDatetimes: data.meetingDatetimes,
    intentCategory: data.intentCategory,
    actionItems: data.actionItems,
    suggestedActions: data.suggestedActions,
    calendarProposals: buildCalendarProposals(data.suggestedActions, new Date()),
    gapAnalysisQuestions: data.followUpQuestions,
    followUpQuestions: data.followUpQuestions,
    processedAt: new Date().toISOString()
  };
  const generatedTaskCandidates =
    data.nextSteps.length > 0 ? data.nextSteps.length : data.suggestedActions.length;

  const fallbackCandidateTasks = data.nextSteps.map((step) => ({
    title: step.title,
    description: "Generated from imported communication analysis.",
    priority: step.dueDays <= 3 ? ProjectPriority.HIGH : ProjectPriority.MEDIUM,
    deadlineIso: (() => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + step.dueDays);
      return dueDate.toISOString();
    })(),
    contactEmail: sender?.email?.toLowerCase() ?? null,
    projectName: null,
    projectRef: null,
    confidence: 0.65,
    reason: "Derived from next steps in communication analysis"
  }));

  const activity = await prisma.activity.upsert({
    where: {
      emailMessageId: persistedMessage.providerMessageId
    },
    create: {
      projectId: projectIdForActivity,
      userId: context.userId,
      type: ActivityType.EMAIL,
      note: data.summary,
      bodyContent: message.bodyText ?? null,
      emailMessageId: persistedMessage.providerMessageId,
      emailParentId: persistedMessage.providerParentMessageId,
      aiAnalysis: data as Prisma.InputJsonValue,
      analysisMetadata,
      activityDate: persistedMessage.sentAt
    },
    update: {
      note: data.summary,
      bodyContent: message.bodyText ?? null,
      emailParentId: persistedMessage.providerParentMessageId,
      aiAnalysis: data as Prisma.InputJsonValue,
      analysisMetadata,
      activityDate: persistedMessage.sentAt
    }
  });
  context.stats.createdActivities += 1;

  try {
    const knownProjects = await prisma.project.findMany({
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
      take: 200
    });
    const geminiSuggestions = await analyzeTaskSuggestionsWithGemini({
      subject: message.subject || "(no subject)",
      bodyText: joinedText,
      senderEmail: sender?.email ?? null,
      knownProjects
    });

    for (const project of geminiSuggestions.projects) {
      const matchedProjectId = matchSuggestedProjectToExisting(project.name, knownProjects);
      context.createdEntities.suggestedProjects.push({
        name: project.name,
        matchedProjectId,
        confidence: project.confidence,
        reason: project.reason
      });
    }

    const candidateTasks = geminiSuggestions.tasks.length > 0 ? geminiSuggestions.tasks : fallbackCandidateTasks;

    for (const suggestion of candidateTasks) {
      const resolvedProjectId = resolveSuggestedProjectId(
        { projectName: suggestion.projectName, projectRef: suggestion.projectRef },
        knownProjects,
        projectIdForActivity
      );
      const contactEmail = suggestion.contactEmail?.toLowerCase().trim() || null;
      const suggestionContact = contactEmail
        ? await prisma.contact.findFirst({
            where: { email: { equals: contactEmail, mode: "insensitive" } },
            select: { id: true }
          })
        : null;
      const task = await createSuggestedTaskIfMissing({
        activityId: activity.id,
        projectId: resolvedProjectId,
        contactId: suggestionContact?.id ?? senderContactId,
        syncJobId: context.jobId === "mock-job" ? null : context.jobId,
        suggestion
      });
      if (!task) {
        continue;
      }

      context.stats.generatedTasks += 1;
      context.createdEntities.tasks.push({
        id: task.id,
        title: task.title,
        priority: task.priority,
        suggestionStatus: task.suggestionStatus,
        contactId: suggestionContact?.id ?? senderContactId,
        contactName: sender?.name?.trim() || null,
        projectId: task.project.id,
        projectTitle: task.project.title
      });
    }
  } catch (error) {
    console.error("[email-enrichment] Task suggestion generation failed", {
      providerMessageId: message.providerMessageId,
      error: error instanceof Error ? error.message : String(error),
      fallbackTaskCandidates: generatedTaskCandidates
    });
    if (fallbackCandidateTasks.length === 0) {
      return;
    }
    for (const suggestion of fallbackCandidateTasks) {
      const task = await createSuggestedTaskIfMissing({
        activityId: activity.id,
        projectId: projectIdForActivity,
        contactId: senderContactId,
        syncJobId: context.jobId === "mock-job" ? null : context.jobId,
        suggestion
      });
      if (!task) {
        continue;
      }
      context.stats.generatedTasks += 1;
      context.createdEntities.tasks.push({
        id: task.id,
        title: task.title,
        priority: task.priority,
        suggestionStatus: task.suggestionStatus,
        contactId: senderContactId,
        contactName: sender?.name?.trim() || null,
        projectId: task.project.id,
        projectTitle: task.project.title
      });
    }
  }
}

export async function runCommunicationAnalysis(input: AnalyzeCommunicationInput) {
  const trigger = input.trigger ?? "MANUAL";
  const staleThreshold = new Date(Date.now() - 30 * 60 * 1000);

  await prisma.emailSyncJob.updateMany({
    where: {
      userId: input.userId,
      projectId: input.projectId ?? null,
      status: EmailSyncJobStatus.RUNNING,
      startedAt: {
        lt: staleThreshold
      }
    },
    data: {
      status: EmailSyncJobStatus.FAILED,
      error: "Marked as failed by watchdog due to stale RUNNING state.",
      finishedAt: new Date()
    }
  });

  const runningJob = await prisma.emailSyncJob.findFirst({
    where: {
      userId: input.userId,
      projectId: input.projectId ?? null,
      status: EmailSyncJobStatus.RUNNING
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true
    }
  });

  if (runningJob) {
    return {
      jobId: runningJob.id,
      skipped: true as const,
      reason: "sync_already_running",
      importedEmails: 0,
      matchedContacts: 0,
      suggestedContacts: 0,
      generatedTasks: 0,
      createdOrganizations: 0,
      createdContacts: 0,
      createdActivities: 0,
      unassignedEmails: 0,
      createdEntities: {
        contacts: [],
        organizations: [],
        tasks: [],
        suggestedProjects: []
      },
      themes: [],
      risks: [],
      nextSteps: []
    };
  }

  const job = await prisma.emailSyncJob.create({
    data: {
      userId: input.userId,
      projectId: input.projectId,
      trigger,
      status: EmailSyncJobStatus.RUNNING,
      filterProvider: input.provider,
      filterDirection: input.direction && input.direction !== "all" ? input.direction : null,
      filterFrom: input.dateFrom,
      filterTo: input.dateTo,
      filterContactEmail: input.contactEmail,
      startedAt: new Date()
    }
  });

  try {
    const connectionWhere: Prisma.EmailAccountConnectionWhereInput = {
      userId: input.userId,
      status: "ACTIVE"
    };

    if (input.provider) {
      connectionWhere.provider = input.provider;
    }

    const connections = await prisma.emailAccountConnection.findMany({
      where: connectionWhere,
      include: {
        user: true
      }
    });

    const stats = {
      importedEmails: 0,
      matchedContacts: 0,
      suggestedContacts: 0,
      generatedTasks: 0,
      createdOrganizations: 0,
      createdContacts: 0,
      createdActivities: 0,
      unassignedEmails: 0
    };
    const createdEntities = {
      contacts: [] as Array<{ id: string; name: string; email: string; organizationName: string | null }>,
      organizations: [] as Array<{ id: string; domain: string }>,
      tasks: [] as Array<{
        id: string;
        title: string;
        priority: ProjectPriority;
        suggestionStatus: TaskSuggestionStatus;
        contactId: string | null;
        contactName: string | null;
        projectId: string | null;
        projectTitle: string | null;
      }>,
      suggestedProjects: [] as Array<{ name: string; matchedProjectId: string | null; confidence: number; reason: string; }>
    };
    const themes = new Set<string>();
    const risks = new Set<string>();
    const nextSteps = new Set<string>();

    const project = input.projectId
      ? await prisma.project.findUnique({
          where: { id: input.projectId },
          include: {
            contacts: {
              include: {
                contact: {
                  include: {
                    organization: true
                  }
                }
              }
            },
            emailAutomationSetting: true
          }
        })
      : null;

    const keywordAliases = project?.emailAutomationSetting?.keywordAliases ?? [];

    for (const connectionRef of connections) {
      const connection = await getDecryptedConnection(connectionRef.id);
      if (!connection) continue;
      let accessToken = connection.accessToken;

      if (
        connection.tokenExpiresAt &&
        connection.refreshToken &&
        connection.tokenExpiresAt.getTime() <= Date.now() + 60_000
      ) {
        const refreshed = await refreshAccessToken(connection.provider, connection.refreshToken);
        accessToken = refreshed.access_token;
        await updateConnectionToken(
          connection.id,
          refreshed.access_token,
          refreshed.expires_in,
          connection.updatedAt
        );
      }

      const filter: EmailFetchFilter = {
        from: input.dateFrom,
        to: input.dateTo,
        limit: 50
      };

      if (input.contactEmail) {
        filter.query = input.contactEmail;
      }

      const messages = dedupeProviderMessages(
        await fetchProviderMessages(connection.provider, accessToken, filter)
      );

      const scopedMessages = messages.filter((message) => {
        const fromParticipant = message.participants.from[0]?.email?.toLowerCase();
        const userEmail = connection.emailAddress?.toLowerCase();
        const direction: EmailDirection =
          fromParticipant && userEmail
            ? fromParticipant === userEmail
              ? "outbound"
              : "inbound"
            : "unknown";

        if (input.direction && input.direction !== "all" && direction !== input.direction) return false;
        return true;
      });

      for (let index = 0; index < scopedMessages.length; index += 1) {
        const message = scopedMessages[index];
        console.log(`[AI Analysis] Processing email ${index + 1} of ${scopedMessages.length}...`);
        await processEmailMessageForEnrichment(
          {
            jobId: job.id,
            userId: input.userId,
            projectId: input.projectId,
            keywordAliases,
            stats,
            createdEntities,
            themes,
            risks,
            nextSteps
          },
          {
            id: connection.id,
            provider: connection.provider,
            emailAddress: connection.emailAddress
          },
          message,
          project
        );

        if (index < scopedMessages.length - 1) {
          await sleep(GEMINI_THROTTLE_MS);
        }
      }

      await prisma.emailAccountConnection.update({
        where: { id: connection.id },
        data: { lastSyncedAt: new Date(), lastError: null }
      });
    }

    const summary = {
      importedEmails: stats.importedEmails,
      matchedContacts: stats.matchedContacts,
      suggestedContacts: stats.suggestedContacts,
      generatedTasks: stats.generatedTasks,
      createdOrganizations: stats.createdOrganizations,
      createdContacts: stats.createdContacts,
      createdActivities: stats.createdActivities,
      unassignedEmails: stats.unassignedEmails,
      createdEntities,
      themes: [...themes],
      risks: [...risks],
      nextSteps: [...nextSteps]
    };

    if (stats.unassignedEmails > 0) {
      console.warn("[email-enrichment] Unassigned emails imported", {
        jobId: job.id,
        userId: input.userId,
        unassignedEmails: stats.unassignedEmails
      });
    }

    await prisma.$transaction([
      prisma.emailSyncJob.update({
        where: { id: job.id },
        data: {
          status: EmailSyncJobStatus.COMPLETED,
          importedEmails: stats.importedEmails,
          matchedContacts: stats.matchedContacts,
          suggestedContacts: stats.suggestedContacts,
          generatedTasks: stats.generatedTasks,
          summary: summary as Prisma.InputJsonValue,
          finishedAt: new Date()
        }
      }),
      prisma.auditLog.create({
        data: {
          userId: input.userId,
          action: "email.analysis.imported",
          entityType: "EmailSyncJob",
          entityId: job.id,
          metadata: summary as Prisma.InputJsonValue
        }
      })
    ]);

    return {
      jobId: job.id,
      ...summary
    };
  } catch (error) {
    await prisma.emailSyncJob.update({
      where: { id: job.id },
      data: {
        status: EmailSyncJobStatus.FAILED,
        error: error instanceof Error ? error.message : String(error),
        finishedAt: new Date()
      }
    });

    throw error;
  }
}

export async function runMockEmailEnrichmentTest(input: {
  userId: string;
  projectId?: string;
  messages: NormalizedEmailMessage[];
}) {
  const tempConnection = await prisma.emailAccountConnection.create({
    data: {
      userId: input.userId,
      provider: "GMAIL",
      emailAddress: "debug-sync@innovation.local",
      externalAccountId: `debug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      encryptedAccessToken: "debug",
      scopes: ["debug"],
      status: "ACTIVE"
    }
  });

  try {
    const project = input.projectId
      ? await prisma.project.findUnique({
          where: { id: input.projectId },
          include: {
            contacts: {
              include: {
                contact: {
                  include: {
                    organization: true
                  }
                }
              }
            },
            emailAutomationSetting: true
          }
        })
      : null;

    const keywordAliases = project?.emailAutomationSetting?.keywordAliases ?? [];
    const stats = {
      importedEmails: 0,
      matchedContacts: 0,
      suggestedContacts: 0,
      generatedTasks: 0,
      createdOrganizations: 0,
      createdContacts: 0,
      createdActivities: 0,
      unassignedEmails: 0
    };
    const createdEntities = {
      contacts: [] as Array<{ id: string; name: string; email: string; organizationName: string | null }>,
      organizations: [] as Array<{ id: string; domain: string }>,
      tasks: [] as Array<{
        id: string;
        title: string;
        priority: ProjectPriority;
        suggestionStatus: TaskSuggestionStatus;
        contactId: string | null;
        contactName: string | null;
        projectId: string | null;
        projectTitle: string | null;
      }>,
      suggestedProjects: [] as Array<{ name: string; matchedProjectId: string | null; confidence: number; reason: string; }>
    };
    const themes = new Set<string>();
    const risks = new Set<string>();
    const nextSteps = new Set<string>();

    for (const message of input.messages) {
      await processEmailMessageForEnrichment(
        {
          jobId: "mock-job",
          userId: input.userId,
          projectId: input.projectId,
          keywordAliases,
          stats,
          createdEntities,
          themes,
          risks,
          nextSteps
        },
        {
          id: tempConnection.id,
          provider: tempConnection.provider,
          emailAddress: tempConnection.emailAddress
        },
        message,
        project
      );
    }

    return {
      ...stats,
      createdEntities,
      themes: [...themes],
      risks: [...risks],
      nextSteps: [...nextSteps]
    };
  } finally {
    await prisma.emailAccountConnection.delete({
      where: {
        id: tempConnection.id
      }
    });
  }
}
