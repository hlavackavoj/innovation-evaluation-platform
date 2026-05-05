import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  normalizeDeadlineToIsoForReferenceDate,
  parseAnalyzerOutput
} from "@/lib/email/analyzer-pipeline";

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

test("normalizeDeadlineToIso parses Czech relative phrase 'do pátku' deterministically", () => {
  const referenceDate = new Date("2026-05-04T09:00:00.000Z");
  assert.equal(normalizeDeadlineToIsoForReferenceDate("do pátku", referenceDate), "2026-05-08");
});

test("normalizeDeadlineToIso parses English relative phrase 'next Friday' deterministically", () => {
  const referenceDate = new Date("2026-05-04T09:00:00.000Z");
  assert.equal(normalizeDeadlineToIsoForReferenceDate("next Friday", referenceDate), "2026-05-15");
});

test("normalizeDeadlineToIso parses Czech absolute dotted format '10.5.'", () => {
  const referenceDate = new Date("2026-05-04T09:00:00.000Z");
  assert.equal(normalizeDeadlineToIsoForReferenceDate("10.5.", referenceDate), "2026-05-10");
});

test("normalizeDeadlineToIso keeps ambiguous slash date '5/10' as null", () => {
  const referenceDate = new Date("2026-05-04T09:00:00.000Z");
  assert.equal(normalizeDeadlineToIsoForReferenceDate("5/10", referenceDate), null);
});

test("parseAnalyzerOutput fixture scenarios keep explicit intentCategory mapping", () => {
  const fixturesDir = path.resolve(process.cwd(), "tests/fixtures/email-analyzer");
  const fixtureFiles = fs
    .readdirSync(fixturesDir)
    .filter((name) => name !== "czech-regression-emails.json")
    .filter((name) => name.endsWith(".json"))
    .sort();

  assert.equal(fixtureFiles.length, 8);

  for (const fileName of fixtureFiles) {
    const fixtureRaw = fs.readFileSync(path.join(fixturesDir, fileName), "utf8");
    const fixture = JSON.parse(fixtureRaw) as {
      intentCategory: "MEETING" | "PROPOSAL" | "FEEDBACK" | "ADMIN";
      summary: string;
    };
    const parsed = parseAnalyzerOutput(fixtureRaw);

    assert.equal(parsed.intentCategory, fixture.intentCategory, `fixture ${fileName}`);
    assert.equal(parsed.summary, fixture.summary, `fixture ${fileName}`);
  }
});
