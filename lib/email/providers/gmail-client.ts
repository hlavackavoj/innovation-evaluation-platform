import { createHash } from "crypto";
import type { EmailFetchFilter, NormalizedEmailMessage } from "@/lib/email/types";

type GmailMessageList = {
  id: string;
  threadId: string;
};

type GmailMessagePayload = {
  id: string;
  threadId: string;
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
  };
};

function decodeGmailBase64(input?: string): string {
  if (!input) return "";
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function extractHeader(headers: Array<{ name: string; value: string }> | undefined, name: string): string | undefined {
  const match = headers?.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return match?.value;
}

function parseParticipants(line?: string) {
  if (!line) return [];

  return line
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/(.*)<(.+)>/);

      if (match) {
        return { name: match[1]?.trim().replace(/^"|"$/g, ""), email: match[2].trim().toLowerCase() };
      }

      return { email: part.replace(/^"|"$/g, "").toLowerCase() };
    });
}

function getBodyText(payload?: GmailMessagePayload["payload"]) {
  if (!payload) return undefined;

  const direct = decodeGmailBase64(payload.body?.data);
  if (direct) return direct;

  for (const part of payload.parts ?? []) {
    if (part.mimeType?.includes("text/plain")) {
      const decoded = decodeGmailBase64(part.body?.data);
      if (decoded) return decoded;
    }
  }

  return undefined;
}

function buildQuery(filter: EmailFetchFilter): string {
  const parts: string[] = [];

  if (filter.query) parts.push(filter.query);
  if (filter.from) parts.push(`after:${Math.floor(filter.from.getTime() / 1000)}`);
  if (filter.to) parts.push(`before:${Math.floor(filter.to.getTime() / 1000)}`);

  return parts.join(" ").trim();
}

async function fetchJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail API error (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchGmailMessages(accessToken: string, filter: EmailFetchFilter): Promise<NormalizedEmailMessage[]> {
  const query = new URLSearchParams({
    maxResults: String(filter.limit ?? 50),
    q: buildQuery(filter)
  });
  const list = await fetchJson<{ messages?: GmailMessageList[] }>(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${query.toString()}`,
    accessToken
  );

  const messages: NormalizedEmailMessage[] = [];

  for (const item of list.messages ?? []) {
    const message = await fetchJson<GmailMessagePayload>(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`,
      accessToken
    );

    const headers = message.payload?.headers ?? [];
    const from = parseParticipants(extractHeader(headers, "From"));
    const to = parseParticipants(extractHeader(headers, "To"));
    const cc = parseParticipants(extractHeader(headers, "Cc"));

    const bodyText = getBodyText(message.payload);
    const sentAt = message.internalDate ? new Date(Number(message.internalDate)) : new Date();

    messages.push({
      provider: "GMAIL",
      providerMessageId: message.id,
      providerThreadId: message.threadId,
      internetMessageId: extractHeader(headers, "Message-ID"),
      providerParentMessageId: extractHeader(headers, "In-Reply-To"),
      subject: extractHeader(headers, "Subject"),
      snippet: message.snippet,
      sentAt,
      participants: {
        from,
        to,
        cc,
        bcc: []
      },
      direction: "unknown",
      bodyText
    });
  }

  return messages;
}

export function hashBody(bodyText?: string) {
  if (!bodyText) return undefined;
  return createHash("sha256").update(bodyText).digest("hex");
}
