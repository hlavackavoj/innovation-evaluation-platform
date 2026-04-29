import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ActivityType,
  EmailSyncJobStatus,
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

type AnalyzerOutput = {
  summary: string;
  themes: string[];
  risks: string[];
  nextSteps: Array<{ title: string; dueDays: number }>;
};

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
  nextSteps: [{ title: "Book startup mentor call", dueDays: 5 }]
};

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
            const rawDue = step.dueDays;
            const dueDays =
              typeof rawDue === "number"
                ? Math.round(rawDue)
                : typeof rawDue === "string"
                  ? Math.round(Number(rawDue))
                  : NaN;

            if (!title || Number.isNaN(dueDays) || dueDays < 0) {
              return null;
            }

            return { title, dueDays };
          })
          .filter((step): step is { title: string; dueDays: number } => !!step)
      : [];

    if (!summary) {
      throw new Error("invalid");
    }

    return {
      summary,
      themes,
      risks,
      nextSteps
    };
  } catch {
    return {
      summary: "Analyzer fallback: structured extraction unavailable for this message.",
      themes: [],
      risks: [],
      nextSteps: []
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
      nextSteps: []
    };
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = [
    "Analyze CRM communication and return strict JSON.",
    "Extract themes, risks, and actionable next steps.",
    JSON.stringify(OUTPUT_EXAMPLE),
    `Subject: ${subject}`,
    `Body: ${bodyText}`
  ].join("\n\n");

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

    let importedEmails = 0;
    let matchedContacts = 0;
    let suggestedContacts = 0;
    let generatedTasks = 0;
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

        importedEmails += 1;

        if (!project) {
          continue;
        }

        const match = matchEmailToProject(project, project.contacts, keywordAliases, message);

        if (!match.matched) continue;

        await prisma.projectEmailLink.upsert({
          where: {
            projectId_emailMessageId: {
              projectId: project.id,
              emailMessageId: persistedMessage.id
            }
          },
          create: {
            projectId: project.id,
            emailMessageId: persistedMessage.id,
            confidence: match.confidence,
            reason: match.reason
          },
          update: {
            confidence: match.confidence,
            reason: match.reason
          }
        });

        matchedContacts += match.reason === "contact_email_exact" ? 1 : 0;

        const joinedText = [message.subject || "", message.snippet || "", message.bodyText || ""].join("\n").trim();

        const analysis = await analyzeText(message.subject || "(no subject)", joinedText);

        for (const theme of analysis.themes) themes.add(theme);
        for (const risk of analysis.risks) risks.add(risk);
        for (const step of analysis.nextSteps) nextSteps.add(step.title);

        const activity = await prisma.activity.upsert({
          where: {
            emailMessageId: persistedMessage.providerMessageId
          },
          create: {
            projectId: project.id,
            userId: input.userId,
            type: ActivityType.EMAIL,
            note: analysis.summary,
            emailMessageId: persistedMessage.providerMessageId,
            emailParentId: persistedMessage.providerParentMessageId,
            aiAnalysis: analysis as Prisma.InputJsonValue,
            activityDate: persistedMessage.sentAt
          },
          update: {
            note: analysis.summary,
            emailParentId: persistedMessage.providerParentMessageId,
            aiAnalysis: analysis as Prisma.InputJsonValue,
            activityDate: persistedMessage.sentAt
          }
        });

        for (const step of analysis.nextSteps) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + step.dueDays);

          await prisma.task.create({
            data: {
              projectId: project.id,
              assignedToUserId: project.ownerUserId,
              sourceActivityId: activity.id,
              title: step.title,
              description: "Generated from imported communication analysis.",
              status: TaskStatus.TODO,
              priority: step.dueDays <= 3 ? ProjectPriority.HIGH : ProjectPriority.MEDIUM,
              dueDate
            }
          });

          generatedTasks += 1;
        }
      }

      await prisma.emailAccountConnection.update({
        where: { id: connection.id },
        data: { lastSyncedAt: new Date(), lastError: null }
      });
    }

    const summary = {
      importedEmails,
      matchedContacts,
      suggestedContacts,
      generatedTasks,
      themes: [...themes],
      risks: [...risks],
      nextSteps: [...nextSteps]
    };

    await prisma.$transaction([
      prisma.emailSyncJob.update({
        where: { id: job.id },
        data: {
          status: EmailSyncJobStatus.COMPLETED,
          importedEmails,
          matchedContacts,
          suggestedContacts,
          generatedTasks,
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
