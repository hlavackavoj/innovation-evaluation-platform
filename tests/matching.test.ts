import test from "node:test";
import assert from "node:assert/strict";
import { matchEmailToProject } from "@/lib/email/matching";
import type { NormalizedEmailMessage } from "@/lib/email/types";

const baseMessage: NormalizedEmailMessage = {
  provider: "GMAIL",
  providerMessageId: "m1",
  sentAt: new Date("2026-01-01T10:00:00Z"),
  participants: {
    from: [{ email: "founder@example.edu" }],
    to: [{ email: "advisor@uni.cz" }],
    cc: [],
    bcc: []
  },
  direction: "inbound",
  subject: "Quantum project update",
  snippet: "pilot status"
};

test("matches exact contact email", () => {
  const result = matchEmailToProject(
    { title: "Quantum Spin-off" },
    [
      {
        projectId: "p1",
        contactId: "c1",
        contact: {
          id: "c1",
          name: "Founder",
          email: "founder@example.edu",
          phone: null,
          role: "CEO",
          notes: null,
          organizationId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          organization: null
        }
      }
    ],
    [],
    baseMessage
  );

  assert.equal(result.matched, true);
  assert.equal(result.reason, "contact_email_exact");
});

test("matches keyword alias when contact/domain miss", () => {
  const result = matchEmailToProject(
    { title: "Quantum Spin-off" },
    [],
    ["pilot status"],
    baseMessage
  );

  assert.equal(result.matched, true);
  assert.equal(result.reason, "keyword_alias");
});
