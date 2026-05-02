import test from "node:test";
import assert from "node:assert/strict";
import { parseAnalyzerOutput } from "@/lib/email/analyzer-pipeline";

test("parseAnalyzerOutput returns fallback on invalid json", () => {
  const parsed = parseAnalyzerOutput("not-json");
  assert.equal(parsed.summary.includes("fallback"), true);
  assert.equal(parsed.nextSteps.length, 0);
  assert.equal(parsed.sentimentScore, 5);
  assert.equal(parsed.isUrgent, false);
  assert.equal(parsed.suggestedActions.length, 0);
});

test("parseAnalyzerOutput parses valid json", () => {
  const parsed = parseAnalyzerOutput(
    JSON.stringify({
      summary: "Conversation progressed.",
      themes: ["IP"],
      risks: ["No NDA"],
      nextSteps: [{ title: "Send NDA", dueDays: 2 }],
      sentimentScore: 3,
      isUrgent: true,
      suggestedProjectStage: "VALIDATION",
      suggestedActions: [
        {
          type: "DRAFT_RESPONSE",
          title: "Draft NDA statement",
          description: "Prepare response for legal.",
          deadline: "2026-05-05",
          dueDays: 2
        }
      ],
      followUpQuestions: ["Who approves legal statements?", "What scope should NDA cover?", "When is signing needed?"]
    })
  );

  assert.equal(parsed.summary, "Conversation progressed.");
  assert.equal(parsed.nextSteps[0]?.title, "Send NDA");
  assert.equal(parsed.sentimentScore, 3);
  assert.equal(parsed.isUrgent, true);
  assert.equal(parsed.suggestedProjectStage, "VALIDATION");
  assert.equal(parsed.suggestedActions[0]?.type, "DRAFT_RESPONSE");
  assert.equal(parsed.followUpQuestions.length, 3);
});
