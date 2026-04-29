import { EmailConnectionStatus, type EmailProvider } from "@prisma/client";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

type UpsertConnectionInput = {
  userId: string;
  provider: EmailProvider;
  externalAccountId: string;
  emailAddress?: string;
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds?: number;
  scopes: string[];
};

export async function upsertEmailConnection(input: UpsertConnectionInput) {
  const tokenExpiresAt =
    typeof input.expiresInSeconds === "number" && input.expiresInSeconds > 0
      ? new Date(Date.now() + input.expiresInSeconds * 1000)
      : null;

  const existing = await prisma.emailAccount.findUnique({
    where: {
      provider_externalAccountId: {
        provider: input.provider,
        externalAccountId: input.externalAccountId
      }
    }
  });

  if (existing && existing.userId !== input.userId) {
    throw new Error("Mailbox account is already linked to a different user.");
  }

  if (!existing) {
    return prisma.emailAccount.create({
      data: {
        userId: input.userId,
        provider: input.provider,
        externalAccountId: input.externalAccountId,
        emailAddress: input.emailAddress,
        encryptedAccessToken: encryptSecret(input.accessToken),
        encryptedRefreshToken: input.refreshToken ? encryptSecret(input.refreshToken) : null,
        tokenExpiresAt,
        scopes: input.scopes,
        status: EmailConnectionStatus.ACTIVE,
        lastError: null
      }
    });
  }

  return prisma.emailAccount.update({
    where: { id: existing.id },
    data: {
      emailAddress: input.emailAddress,
      encryptedAccessToken: encryptSecret(input.accessToken),
      encryptedRefreshToken: input.refreshToken ? encryptSecret(input.refreshToken) : undefined,
      tokenExpiresAt,
      scopes: input.scopes,
      status: EmailConnectionStatus.ACTIVE,
      lastError: null
    }
  });
}

export async function listUserEmailConnections(userId: string) {
  return prisma.emailAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      provider: true,
      emailAddress: true,
      status: true,
      tokenExpiresAt: true,
      lastSyncedAt: true,
      lastError: true,
      createdAt: true
    }
  });
}

export async function disconnectEmailConnection(userId: string, provider: EmailProvider, connectionId?: string) {
  const where = connectionId
    ? { id: connectionId, userId, provider }
    : { userId, provider, status: EmailConnectionStatus.ACTIVE };

  await prisma.emailAccount.updateMany({
    where,
    data: {
      status: EmailConnectionStatus.REVOKED,
      encryptedAccessToken: encryptSecret("revoked"),
      encryptedRefreshToken: null,
      tokenExpiresAt: null,
      lastError: null
    }
  });
}

export async function getDecryptedConnection(connectionId: string) {
  const connection = await prisma.emailAccount.findUnique({
    where: { id: connectionId }
  });

  if (!connection) {
    return null;
  }

  return {
    ...connection,
    accessToken: decryptSecret(connection.encryptedAccessToken),
    refreshToken: connection.encryptedRefreshToken
      ? decryptSecret(connection.encryptedRefreshToken)
      : undefined
  };
}

export async function updateConnectionToken(connectionId: string, accessToken: string, expiresInSeconds?: number) {
  return prisma.emailAccount.update({
    where: { id: connectionId },
    data: {
      encryptedAccessToken: encryptSecret(accessToken),
      tokenExpiresAt:
        typeof expiresInSeconds === "number" && expiresInSeconds > 0
          ? new Date(Date.now() + expiresInSeconds * 1000)
          : null,
      status: EmailConnectionStatus.ACTIVE,
      lastError: null
    }
  });
}
