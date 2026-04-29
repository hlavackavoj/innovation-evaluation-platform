import type { EmailProvider } from "@prisma/client";
import type { EmailFetchFilter, NormalizedEmailMessage } from "@/lib/email/types";
import { fetchGmailMessages, hashBody } from "@/lib/email/providers/gmail-client";
import { fetchOutlookMessages } from "@/lib/email/providers/outlook-client";

export async function fetchProviderMessages(
  provider: EmailProvider,
  accessToken: string,
  filter: EmailFetchFilter
): Promise<NormalizedEmailMessage[]> {
  if (provider === "GMAIL") {
    return fetchGmailMessages(accessToken, filter);
  }

  return fetchOutlookMessages(accessToken, filter);
}

export function computeBodyHash(message: NormalizedEmailMessage) {
  return hashBody(message.bodyText);
}
