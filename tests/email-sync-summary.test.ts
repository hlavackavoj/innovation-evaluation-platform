import test from "node:test";
import assert from "node:assert/strict";
import { getUnassignedEmailsCount, parseEmailSyncSummary } from "@/lib/email/sync-summary";

test("parseEmailSyncSummary returns null for nullish/invalid summary", () => {
  assert.equal(parseEmailSyncSummary(null), null);
  assert.equal(parseEmailSyncSummary("legacy"), null);
});

test("parseEmailSyncSummary defaults unassignedEmails to 0 for legacy payloads", () => {
  const parsed = parseEmailSyncSummary({
    importedEmails: 5,
    matchedContacts: 2,
    suggestedContacts: 1,
    generatedTasks: 3
  });

  assert.ok(parsed);
  assert.equal(parsed?.unassignedEmails, 0);
});

test("getUnassignedEmailsCount safely reads modern and legacy payloads", () => {
  assert.equal(getUnassignedEmailsCount({ unassignedEmails: 4 }), 4);
  assert.equal(getUnassignedEmailsCount({ importedEmails: 7 }), 0);
  assert.equal(getUnassignedEmailsCount(undefined), 0);
});
