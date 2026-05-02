import { PipelineStage } from "@prisma/client";
import type { UniversityPhaseSuggestion } from "@/lib/constants";

export type SuggestedActionType = "SCHEDULE_MEETING" | "DRAFT_RESPONSE";

export type SuggestedAction = {
  type: SuggestedActionType;
  title: string;
  description: string;
  proposedDateTime: string | null;
  deadline: string | null;
  dueDays: number | null;
};

export type ParsedAnalysisMetadata = {
  sentimentScore: number | null;
  isUrgent: boolean;
  suggestedProjectStage: PipelineStage | null;
  suggestedUniversityPhase: UniversityPhaseSuggestion | null;
  meetingDatetimes: string[];
  suggestedActions: SuggestedAction[];
  followUpQuestions: string[];
};

const STAGES = new Set<PipelineStage>(Object.values(PipelineStage));
const ACTION_TYPES = new Set<SuggestedActionType>(["SCHEDULE_MEETING", "DRAFT_RESPONSE"]);
const UNIVERSITY_PHASES = new Set<UniversityPhaseSuggestion>(["IDEATION", "CONTRACTING", "IMPLEMENTATION", "DELIVERY"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseSentimentScore(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? Math.round(value)
      : typeof value === "string"
        ? Math.round(Number(value))
        : NaN;

  if (Number.isNaN(parsed)) return null;
  return Math.max(1, Math.min(10, parsed));
}

function parseDueDays(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? Math.round(value)
      : typeof value === "string"
        ? Math.round(Number(value))
        : NaN;

  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

function parseSuggestedProjectStage(value: unknown): PipelineStage | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (!normalized) return null;
  return STAGES.has(normalized as PipelineStage) ? (normalized as PipelineStage) : null;
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

function parseSuggestedActions(value: unknown): SuggestedAction[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const row = asRecord(item);
      if (!row) return null;
      const rawType =
        typeof row.type === "string"
          ? row.type.trim().toUpperCase()
          : typeof row.actionType === "string"
            ? row.actionType.trim().toUpperCase()
            : "";
      if (!ACTION_TYPES.has(rawType as SuggestedActionType)) return null;

      const title = typeof row.title === "string" ? row.title.trim() : "";
      const description =
        typeof row.description === "string"
          ? row.description.trim()
          : typeof row.details === "string"
            ? row.details.trim()
            : "";
      const proposedDateTimeRaw =
        typeof row.proposedDateTime === "string"
          ? row.proposedDateTime.trim()
          : typeof row.proposedAt === "string"
            ? row.proposedAt.trim()
            : "";
      const proposedDateTime =
        proposedDateTimeRaw && !Number.isNaN(new Date(proposedDateTimeRaw).getTime())
          ? proposedDateTimeRaw
          : null;
      const deadline = typeof row.deadline === "string" ? row.deadline.trim() || null : null;

      return {
        type: rawType as SuggestedActionType,
        title:
          title ||
          (rawType === "SCHEDULE_MEETING" ? "Naplánovat meeting podle e-mailu" : "Připravit draft odpovědi"),
        description:
          description ||
          (rawType === "SCHEDULE_MEETING"
            ? "AI detekovala požadavek na meeting."
            : "AI detekovala požadavek na statement/odpověď."),
        proposedDateTime,
        deadline,
        dueDays: parseDueDays(row.dueDays)
      } satisfies SuggestedAction;
    })
    .filter((item): item is SuggestedAction => !!item);
}

function parseFollowUpQuestions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
}

export function parseAnalysisMetadata(value: unknown): ParsedAnalysisMetadata | null {
  const data = asRecord(value);
  if (!data) return null;

  return {
    sentimentScore: parseSentimentScore(data.sentimentScore),
    isUrgent: Boolean(data.isUrgent),
    suggestedProjectStage: parseSuggestedProjectStage(data.suggestedProjectStage),
    suggestedUniversityPhase: parseSuggestedUniversityPhase(data.suggestedUniversityPhase),
    meetingDatetimes: parseMeetingDatetimes(data.meetingDatetimes),
    suggestedActions: parseSuggestedActions(data.suggestedActions),
    followUpQuestions: parseFollowUpQuestions(data.followUpQuestions)
  };
}
