import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ActivityType,
  EmailSyncJobStatus,
  PipelineStage,
  ProjectPriority,
  TaskStatus,
  type Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchProviderMessages, computeBodyHash } from "@/lib/email/provider-client";
import { getDecryptedConnection, updateConnectionToken } from "@/lib/email/token-store";
import { refreshAccessToken } from "@/lib/email/oauth-service";
import { matchEmailToProject } from "@/lib/email/matching";
import type { EmailDirection, EmailFetchFilter } from "@/lib/email/types";
import { dedupeProviderMessages } from "@/lib/email/idempotency";
import type { NormalizedEmailMessage } from "@/lib/email/types";

type AnalyzerOutput = {
  summary: string;
  themes: string[];
  risks: string[];
  nextSteps: Array<{ title: string; dueDays: number }>;
  sentimentScore: number;
  isUrgent: boolean;
  suggestedProjectStage: PipelineStage | null;
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
  organizationId: string | null
): Promise<string | null> {
  if (!organizationId) return null;

  const project = await prisma.project.findFirst({
    where: { organizationId },
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
  if (explicitProjectId) {
    return explicitProjectId;
  }

  if (contactProjectIds.length > 0) {
    return contactProjectIds[0];
  }

  const orgMatch = await matchProjectForSender(organizationId ?? null);
  if (orgMatch) {
    return orgMatch;
  }

  const fallbackProject = await prisma.project.findFirst({
    where: {
      OR: [{ ownerUserId: userId }, { ownerUserId: null }]
    },
    orderBy: {
      updatedAt: "desc"
    },
    select: {
      id: true
    }
  });

  return fallbackProject?.id;
}

export type AnalyzeCommunicationInput = {
  userId: string;
  projectId?: string;
  provider?: "GMAIL" | "OUTLOOK";
  direction?: "all" | EmailDirection;
  dateFrom?: Date;
  dateTo?: Date;
  contactEmail?: string;
};

const OUTPUT_EXAMPLE = {
  summary: "Short factual summary of communication.",
  themes: ["IP", "market validation"],
  risks: ["Missing IP status"],
  nextSteps: [{ title: "Book startup mentor call", dueDays: 5 }],
  sentimentScore: 7,
  isUrgent: false,
  suggestedProjectStage: "DISCOVERY",
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

function sanitizeJson(text: string) {
  const trimmed = text.trim();

  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export function parseAnalyzerOutput(raw: string): AnalyzerOutput {
  try {
    const parsed = JSON.parse(sanitizeJson(raw)) as unknown;

    if (!parsed || typeof parsed !== "object") {
      throw new Error("invalid");
    }

    const value = parsed as Record<string, unknown>;

    const summary = typeof value.summary === "string" ? value.summary.trim() : "";
    const themes = Array.isArray(value.themes) ? value.themes.filter((v): v is string => typeof v === "string") : [];
    const risks = Array.isArray(value.risks) ? value.risks.filter((v): v is string => typeof v === "string") : [];
    const nextSteps = Array.isArray(value.nextSteps)
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
            const proposedDateTime =
              typeof action.proposedDateTime === "string" ? action.proposedDateTime.trim() || null : null;
            const deadline = typeof action.deadline === "string" ? action.deadline.trim() || null : null;
            const dueDays = parseDueDays(action.dueDays);

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
    const followUpQuestions = Array.isArray(value.followUpQuestions)
      ? value.followUpQuestions
          .filter((question): question is string => typeof question === "string")
          .map((question) => question.trim())
          .filter(Boolean)
          .slice(0, 3)
      : [];

    if (!summary) {
      throw new Error("invalid");
    }

    return {
      summary,
      themes,
      risks,
      nextSteps,
      sentimentScore,
      isUrgent,
      suggestedProjectStage,
      suggestedActions,
      followUpQuestions
    };
  } catch {
    return {
      summary: "Analyzer fallback: structured extraction unavailable for this message.",
      themes: [],
      risks: [],
      nextSteps: [],
      sentimentScore: 5,
      isUrgent: false,
      suggestedProjectStage: null,
      suggestedActions: [],
      followUpQuestions: []
    };
  }
}

async function analyzeText(subject: string, bodyText: string): Promise<AnalyzerOutput> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    return {
      summary: "Analyzer skipped: GOOGLE_AI_API_KEY is missing.",
      themes: [],
      risks: [],
      nextSteps: [],
      sentimentScore: 5,
      isUrgent: false,
      suggestedProjectStage: null,
      suggestedActions: [],
      followUpQuestions: []
    };
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
  const systemPrompt = [
    "You are an email CRM analyzer. Return strict JSON only.",
    "Classify and extract action proposals for operations teams.",
    "Detect these scenarios when present:",
    "1) Meeting Request: propose action type SCHEDULE_MEETING and include proposedDateTime if available.",
    "2) Request for Statement: propose action type DRAFT_RESPONSE and include deadline if available.",
    "3) Project Proposal: provide exactly 3 followUpQuestions that help qualification and CRM intake.",
    "Metadata requirements:",
    "- sentimentScore: integer 1-10",
    "- isUrgent: boolean (true if message implies deadline/time pressure)",
    "- suggestedProjectStage: one of DISCOVERY, VALIDATION, MVP, SCALING, SPIN_OFF or null",
    "- suggestedActions: array of objects with fields type, title, description, proposedDateTime, deadline, dueDays"
  ].join("\n");
  const userPrompt = [
    "Analyze CRM communication and return strict JSON.",
    "Extract themes, risks, actionable next steps, and suggested actions metadata.",
    JSON.stringify(OUTPUT_EXAMPLE),
    `Subject: ${subject}`,
    `Body: ${bodyText}`
  ].join("\n\n");
  const prompt = [systemPrompt, userPrompt].join("\n\n");

  const response = await model.generateContent({
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

type PersistEmailContext = {
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
  };
  createdEntities: {
    contacts: Array<{ id: string; name: string; email: string; organizationName: string | null }>;
    organizations: Array<{ id: string; domain: string }>;
    tasks: Array<{
      id: string;
      title: string;
      priority: ProjectPriority;
      contactId: string | null;
      contactName: string | null;
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
    const senderResolution = await resolveOrCreateContact(senderEmail, sender.name);
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
    return;
  }

  const joinedText = [message.subject || "", message.snippet || "", message.bodyText || ""].join("\n").trim();
  const data = await analyzeText(message.subject || "(no subject)", joinedText);
  console.log("AI Analysis Result:", data);

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
    suggestedActions: data.suggestedActions,
    followUpQuestions: data.followUpQuestions,
    processedAt: new Date().toISOString()
  };

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

  for (const step of data.nextSteps) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + step.dueDays);

    const createdTask = await prisma.task.create({
      data: {
        projectId: projectIdForActivity,
        contactId: senderContactId,
        assignedToUserId: null,
        sourceActivityId: activity.id,
        title: step.title,
        description: "Generated from imported communication analysis.",
        status: TaskStatus.TODO,
        priority: step.dueDays <= 3 ? ProjectPriority.HIGH : ProjectPriority.MEDIUM,
        dueDate
      }
    });
    context.createdEntities.tasks.push({
      id: createdTask.id,
      title: createdTask.title,
      priority: createdTask.priority,
      contactId: senderContactId,
      contactName: sender?.name?.trim() || null
    });

    context.stats.generatedTasks += 1;
  }
}

export async function runCommunicationAnalysis(input: AnalyzeCommunicationInput) {
  const job = await prisma.emailSyncJob.create({
    data: {
      userId: input.userId,
      projectId: input.projectId,
      trigger: "MANUAL",
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
      createdActivities: 0
    };
    const createdEntities = {
      contacts: [] as Array<{ id: string; name: string; email: string; organizationName: string | null }>,
      organizations: [] as Array<{ id: string; domain: string }>,
      tasks: [] as Array<{
        id: string;
        title: string;
        priority: ProjectPriority;
        contactId: string | null;
        contactName: string | null;
      }>
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
        await updateConnectionToken(connection.id, refreshed.access_token, refreshed.expires_in);
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

      for (const message of messages) {
        const fromParticipant = message.participants.from[0]?.email?.toLowerCase();
        const userEmail = connection.emailAddress?.toLowerCase();
        const direction: EmailDirection =
          fromParticipant && userEmail
            ? fromParticipant === userEmail
              ? "outbound"
              : "inbound"
            : "unknown";

        if (input.direction && input.direction !== "all" && direction !== input.direction) {
          continue;
        }
        await processEmailMessageForEnrichment(
          {
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
      createdEntities,
      themes: [...themes],
      risks: [...risks],
      nextSteps: [...nextSteps]
    };

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
      createdActivities: 0
    };
    const createdEntities = {
      contacts: [] as Array<{ id: string; name: string; email: string; organizationName: string | null }>,
      organizations: [] as Array<{ id: string; domain: string }>,
      tasks: [] as Array<{
        id: string;
        title: string;
        priority: ProjectPriority;
        contactId: string | null;
        contactName: string | null;
      }>
    };
    const themes = new Set<string>();
    const risks = new Set<string>();
    const nextSteps = new Set<string>();

    for (const message of input.messages) {
      await processEmailMessageForEnrichment(
        {
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
