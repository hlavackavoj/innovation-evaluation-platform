import {
  ActivityType,
  EmailConnectionStatus,
  OrganizationType,
  type EmailProvider,
  type Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fetchProviderMessages, computeBodyHash } from "@/lib/email/provider-client";
import { dedupeProviderMessages } from "@/lib/email/idempotency";
import { getDecryptedConnection, updateConnectionToken } from "@/lib/email/token-store";
import { refreshAccessToken } from "@/lib/email/oauth-service";
import { resolveProjectAssignment } from "@/lib/email/project-resolution";

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
    return existing.id;
  }

  const created = await prisma.organization.create({
    data: {
      name: guessOrganizationName(domain),
      type: OrganizationType.COMPANY,
      website: domain
    },
    select: {
      id: true
    }
  });

  return created.id;
}

async function resolveContact(email: string, name?: string) {
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
      projectIds: existing.projectLinks.map((link) => link.projectId)
    };
  }

  const domain = extractDomain(email);
  const organizationId = domain ? await resolveOrganizationByDomain(domain) : null;

  const created = await prisma.contact.create({
    data: {
      name: guessContactName(email, name),
      email,
      role: "External Email Contact",
      organizationId
    },
    select: {
      id: true
    }
  });

  return {
    contactId: created.id,
    projectIds: [] as string[]
  };
}

async function resolveProjectIdForActivity(userId: string, contactProjectIds: string[], organizationId?: string | null) {
  const projectByOrg = organizationId
    ? await prisma.project.findFirst({
        where: {
          organizationId,
          ownerUserId: userId
        },
        orderBy: {
          updatedAt: "desc"
        },
        select: {
          id: true
        }
      })
    : null;

  const userOwnedProject = await prisma.project.findFirst({
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
  return resolveProjectAssignment({
    contactProjectIds,
    organizationProjectId: projectByOrg?.id ?? null,
    userOwnedProjectId: userOwnedProject?.id ?? null
  }).projectId;
}

export async function runPostConnectInitialSync(input: {
  userId: string;
  provider: EmailProvider;
  connectionId: string;
  maxMessages?: number;
}) {
  const connection = await getDecryptedConnection(input.connectionId);

  if (!connection || connection.userId !== input.userId || connection.provider !== input.provider) {
    return { imported: 0, activities: 0, leadsCreated: 0 };
  }

  if (connection.status !== EmailConnectionStatus.ACTIVE) {
    return { imported: 0, activities: 0, leadsCreated: 0 };
  }

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

  const messages = dedupeProviderMessages(
    await fetchProviderMessages(connection.provider, accessToken, {
      limit: input.maxMessages ?? 50
    })
  );

  let imported = 0;
  let activities = 0;
  let leadsCreated = 0;
  let unassigned = 0;

  for (const message of messages) {
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
        direction: message.direction,
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
        direction: message.direction,
        participants: message.participants as Prisma.InputJsonValue,
        sentAt: message.sentAt,
        snippet: message.snippet,
        bodyText: message.bodyText,
        bodyHash: computeBodyHash(message),
        hasBody: !!message.bodyText
      }
    });

    imported += 1;

    const sender = message.participants.from[0];
    if (!sender?.email) {
      continue;
    }

    const userMailbox = connection.emailAddress?.toLowerCase();
    const senderEmail = sender.email.toLowerCase();

    if (userMailbox && senderEmail === userMailbox) {
      continue;
    }

    const beforeCount = await prisma.contact.count({
      where: {
        email: {
          equals: senderEmail,
          mode: "insensitive"
        }
      }
    });

    const { contactId, projectIds } = await resolveContact(senderEmail, sender.name);

    if (beforeCount === 0) {
      leadsCreated += 1;
    }

    const contact = await prisma.contact.findUnique({
      where: {
        id: contactId
      },
      select: {
        organizationId: true
      }
    });

    const projectId = await resolveProjectIdForActivity(input.userId, projectIds, contact?.organizationId);

    if (!projectId) {
      unassigned += 1;
      await prisma.activity.upsert({
        where: {
          emailMessageId: persistedMessage.providerMessageId
        },
        create: {
          projectId: null,
          userId: input.userId,
          type: ActivityType.EMAIL,
          note: message.snippet?.trim() || message.subject?.trim() || `Imported email from ${senderEmail} (unassigned)`,
          emailMessageId: persistedMessage.providerMessageId,
          emailParentId: persistedMessage.providerParentMessageId,
          analysisMetadata: {
            analysisStatus: "UNASSIGNED_PROJECT",
            reason: "No contact/organization/user-owned project match.",
            processedAt: new Date().toISOString()
          } satisfies Prisma.InputJsonValue,
          activityDate: persistedMessage.sentAt
        },
        update: {
          projectId: null,
          userId: input.userId,
          note: message.snippet?.trim() || message.subject?.trim() || `Imported email from ${senderEmail} (unassigned)`,
          emailParentId: persistedMessage.providerParentMessageId,
          analysisMetadata: {
            analysisStatus: "UNASSIGNED_PROJECT",
            reason: "No contact/organization/user-owned project match.",
            processedAt: new Date().toISOString()
          } satisfies Prisma.InputJsonValue,
          activityDate: persistedMessage.sentAt
        }
      });
      activities += 1;
      continue;
    }

    const note = message.snippet?.trim() || message.subject?.trim() || `Imported email from ${senderEmail}`;

    await prisma.activity.upsert({
      where: {
        emailMessageId: persistedMessage.providerMessageId
      },
      create: {
        projectId,
        userId: input.userId,
        type: ActivityType.EMAIL,
        note,
        emailMessageId: persistedMessage.providerMessageId,
        emailParentId: persistedMessage.providerParentMessageId,
        activityDate: persistedMessage.sentAt
      },
      update: {
        projectId,
        userId: input.userId,
        note,
        emailParentId: persistedMessage.providerParentMessageId,
        activityDate: persistedMessage.sentAt
      }
    });

    const alreadyLinked = await prisma.projectContact.findUnique({
      where: {
        projectId_contactId: {
          projectId,
          contactId
        }
      }
    });

    if (!alreadyLinked) {
      await prisma.projectContact.create({
        data: {
          projectId,
          contactId
        }
      });
    }

    activities += 1;
  }

  await prisma.emailAccountConnection.update({
    where: {
      id: connection.id
    },
    data: {
      lastSyncedAt: new Date(),
      lastError: null
    }
  });

  if (unassigned > 0) {
    console.warn("[post-connect-sync] Unassigned emails imported", {
      connectionId: connection.id,
      userId: input.userId,
      unassignedEmails: unassigned
    });
  }

  return {
    imported,
    activities,
    leadsCreated,
    unassigned
  };
}
