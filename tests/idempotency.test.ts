import test from "node:test";
import assert from "node:assert/strict";
import { dedupeProviderMessages } from "@/lib/email/idempotency";

test("dedupeProviderMessages keeps first unique providerMessageId", () => {
  const result = dedupeProviderMessages([
    {
      provider: "GMAIL",
      providerMessageId: "x1",
      sentAt: new Date(),
      participants: { from: [], to: [], cc: [], bcc: [] },
      direction: "unknown"
    },
    {
      provider: "GMAIL",
      providerMessageId: "x1",
      sentAt: new Date(),
      participants: { from: [], to: [], cc: [], bcc: [] },
      direction: "unknown"
    },
    {
      provider: "OUTLOOK",
      providerMessageId: "x2",
      sentAt: new Date(),
      participants: { from: [], to: [], cc: [], bcc: [] },
      direction: "unknown"
    }
  ]);

  assert.equal(result.length, 2);
  assert.deepEqual(result.map((item) => item.providerMessageId), ["x1", "x2"]);
});
