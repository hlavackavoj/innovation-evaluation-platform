import type { NormalizedEmailMessage } from "@/lib/email/types";

export function dedupeProviderMessages(messages: NormalizedEmailMessage[]) {
  const seen = new Set<string>();
  const output: NormalizedEmailMessage[] = [];

  for (const message of messages) {
    if (seen.has(message.providerMessageId)) {
      continue;
    }

    seen.add(message.providerMessageId);
    output.push(message);
  }

  return output;
}
