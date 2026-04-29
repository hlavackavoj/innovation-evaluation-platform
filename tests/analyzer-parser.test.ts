import test from "node:test";
import assert from "node:assert/strict";
import { parseAnalyzerOutput } from "@/lib/email/analyzer-pipeline";

test("parseAnalyzerOutput returns fallback on invalid json", () => {
  const parsed = parseAnalyzerOutput("not-json");
  assert.equal(parsed.summary.includes("fallback"), true);
  assert.equal(parsed.nextSteps.length, 0);
});

test("parseAnalyzerOutput parses valid json", () => {
  const parsed = parseAnalyzerOutput(
    JSON.stringify({
      summary: "Conversation progressed.",
      themes: ["IP"],
      risks: ["No NDA"],
      nextSteps: [{ title: "Send NDA", dueDays: 2 }]
    })
  );

  assert.equal(parsed.summary, "Conversation progressed.");
  assert.equal(parsed.nextSteps[0]?.title, "Send NDA");
});
