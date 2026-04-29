import type { EmailFetchFilter, NormalizedEmailMessage } from "@/lib/email/types";

type GraphParticipant = {
  emailAddress?: {
    name?: string;
    address?: string;
  };
};

type GraphMessage = {
  id: string;
  conversationId?: string;
  internetMessageId?: string;
  subject?: string;
  bodyPreview?: string;
  body?: {
    contentType?: string;
    content?: string;
  };
  from?: GraphParticipant;
  toRecipients?: GraphParticipant[];
  ccRecipients?: GraphParticipant[];
  bccRecipients?: GraphParticipant[];
  receivedDateTime?: string;
};

function participant(item?: GraphParticipant) {
  const email = item?.emailAddress?.address?.trim().toLowerCase();
  if (!email) return null;
  return {
    email,
    name: item?.emailAddress?.name?.trim() || undefined
  };
}

function participants(items?: GraphParticipant[]) {
  return (items ?? []).map(participant).filter(Boolean) as Array<{ email: string; name?: string }>;
}

function graphFilter(filter: EmailFetchFilter) {
  const conditions: string[] = [];

  if (filter.from) {
    conditions.push(`receivedDateTime ge ${filter.from.toISOString()}`);
  }

  if (filter.to) {
    conditions.push(`receivedDateTime le ${filter.to.toISOString()}`);
  }

  return conditions.join(" and ");
}

export async function fetchOutlookMessages(accessToken: string, filter: EmailFetchFilter): Promise<NormalizedEmailMessage[]> {
  const query = new URLSearchParams({
    $top: String(filter.limit ?? 50),
    $select:
      "id,conversationId,internetMessageId,subject,bodyPreview,body,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime",
    $orderby: "receivedDateTime desc"
  });

  const filterQuery = graphFilter(filter);
  if (filterQuery) query.set("$filter", filterQuery);

  const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Microsoft Graph error (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as { value?: GraphMessage[] };

  return (payload.value ?? []).map((message) => {
    const from = participant(message.from);

    return {
      provider: "OUTLOOK",
      providerMessageId: message.id,
      providerThreadId: message.conversationId,
      internetMessageId: message.internetMessageId,
      subject: message.subject,
      snippet: message.bodyPreview,
      sentAt: message.receivedDateTime ? new Date(message.receivedDateTime) : new Date(),
      participants: {
        from: from ? [from] : [],
        to: participants(message.toRecipients),
        cc: participants(message.ccRecipients),
        bcc: participants(message.bccRecipients)
      },
      direction: "unknown",
      bodyText: message.body?.content
    };
  });
}
