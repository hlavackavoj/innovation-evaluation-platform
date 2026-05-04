import test from "node:test";
import assert from "node:assert/strict";
import { parseAnalysisMetadata } from "@/lib/email/analysis-metadata";

test("parseAnalysisMetadata parses valid metadata with new fields", () => {
  const parsed = parseAnalysisMetadata({
    intentCategory: "MEETING",
    actionItems: [
      { task: "Schedule project sync", deadline: "2026-06-01", assigneeSuggestion: "Project manager" },
      { task: "Prepare agenda", deadline: null, assignee_suggestion: "Research lead" }
    ],
    gapAnalysisQuestions: ["What is the IP ownership model?", "Who approves procurement?"]
  });

  assert.ok(parsed);
  assert.equal(parsed?.intentCategory, "MEETING");
  assert.equal(parsed?.actionItems.length, 2);
  assert.equal(parsed?.actionItems[0]?.task, "Schedule project sync");
  assert.equal(parsed?.actionItems[1]?.assigneeSuggestion, "Research lead");
  assert.deepEqual(parsed?.gapAnalysisQuestions, ["What is the IP ownership model?", "Who approves procurement?"]);
});

test("parseAnalysisMetadata maps unknown intentCategory to null", () => {
  const parsed = parseAnalysisMetadata({
    intentCategory: "RANDOM_INTENT"
  });

  assert.ok(parsed);
  assert.equal(parsed?.intentCategory, null);
});

test("parseAnalysisMetadata ignores malformed actionItems and invalid tasks", () => {
  const parsed = parseAnalysisMetadata({
    actionItems: [
      null,
      {},
      { task: "  " },
      { task: "Create risk register", deadline: 12345, assigneeSuggestion: "  " },
      { task: "Assign legal owner", deadline: "2026-06-15", assigneeSuggestion: "Legal team" }
    ]
  });

  assert.ok(parsed);
  assert.equal(parsed?.actionItems.length, 2);
  assert.equal(parsed?.actionItems[0]?.task, "Create risk register");
  assert.equal(parsed?.actionItems[0]?.deadline, null);
  assert.equal(parsed?.actionItems[0]?.assigneeSuggestion, null);
  assert.equal(parsed?.actionItems[1]?.deadline, "2026-06-15");
});

test("parseAnalysisMetadata filters malformed or empty gapAnalysisQuestions", () => {
  const parsed = parseAnalysisMetadata({
    gapAnalysisQuestions: ["", "  ", "Need customer validation evidence", 12, null]
  });

  assert.ok(parsed);
  assert.deepEqual(parsed?.gapAnalysisQuestions, ["Need customer validation evidence"]);
});

test("parseAnalysisMetadata returns safe defaults for legacy payloads", () => {
  const parsed = parseAnalysisMetadata({
    sentimentScore: 7,
    isUrgent: false
  });

  assert.ok(parsed);
  assert.equal(parsed?.intentCategory, null);
  assert.deepEqual(parsed?.actionItems, []);
  assert.deepEqual(parsed?.gapAnalysisQuestions, []);
});
