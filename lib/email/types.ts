import type { EmailProvider } from "@prisma/client";

export type EmailDirection = "inbound" | "outbound" | "unknown";

export type NormalizedEmailParticipant = {
  email: string;
  name?: string;
};

export type NormalizedEmailParticipants = {
  from: NormalizedEmailParticipant[];
  to: NormalizedEmailParticipant[];
  cc: NormalizedEmailParticipant[];
  bcc: NormalizedEmailParticipant[];
};

export type NormalizedEmailMessage = {
  provider: EmailProvider;
  providerMessageId: string;
  providerThreadId?: string;
  providerParentMessageId?: string;
  internetMessageId?: string;
  subject?: string;
  snippet?: string;
  sentAt: Date;
  participants: NormalizedEmailParticipants;
  direction: EmailDirection;
  bodyText?: string;
};

export type EmailFetchFilter = {
  from?: Date;
  to?: Date;
  query?: string;
  limit?: number;
};

export type ProviderConnection = {
  id: string;
  provider: EmailProvider;
  accessToken: string;
  refreshToken?: string;
  emailAddress?: string;
};
