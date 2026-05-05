import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseAnalyzerOutput } from "@/lib/email/analyzer-pipeline";
import { buildEmailTaskPrintReport } from "@/lib/email/print-report";

type FixtureEmail = {
  id: string;
  emailTimestampIso: string;
  text: string;
};

const fixturesPath = path.resolve(process.cwd(), "tests/fixtures/email-analyzer/czech-regression-emails.json");
const fixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf8")) as FixtureEmail[];

function parseFromText(text: string, emailTimestampIso: string) {
  return parseAnalyzerOutput(
    JSON.stringify({
      summary: text,
      themes: [],
      risks: [],
      nextSteps: [],
      sentimentScore: 6,
      actionItems: []
    }),
    new Date(emailTimestampIso)
  );
}

test("critical login incident is urgent and maps to support stage", () => {
  const email = fixtures.find((item) => item.id === "critical-login-incident");
  assert.ok(email);
  const parsed = parseFromText(email.text, email.emailTimestampIso);
  assert.equal(parsed.isUrgent, true);
  assert.equal(parsed.suggestedProjectStage, "SCALING");
});

test("invoice email maps payment task and due date to end of week", () => {
  const email = fixtures.find((item) => item.id === "invoice-payment");
  assert.ok(email);
  const parsed = parseAnalyzerOutput(
    JSON.stringify({
      summary: email.text,
      themes: ["finance", "invoice"],
      risks: [],
      nextSteps: [],
      sentimentScore: 6,
      actionItems: [{ task: "Zpracovat fakturu / proplatit", deadline: "do konce týdne" }]
    }),
    new Date(email.emailTimestampIso)
  );
  assert.equal(parsed.actionItems[0]?.task.includes("fakturu"), true);
  assert.equal(parsed.actionItems[0]?.deadline, "2026-05-08");
});

test("Stripe meeting email creates calendar intent", () => {
  const email = fixtures.find((item) => item.id === "stripe-next-wednesday");
  assert.ok(email);
  const parsed = parseFromText(email.text, email.emailTimestampIso);
  const scheduleAction = parsed.suggestedActions.find((item) => item.type === "SCHEDULE_MEETING");
  assert.ok(scheduleAction);
});

test("'příští středa v 10:00' resolves against email timestamp", () => {
  const email = fixtures.find((item) => item.id === "stripe-next-wednesday");
  assert.ok(email);
  const parsed = parseFromText(email.text, email.emailTimestampIso);
  const scheduleAction = parsed.suggestedActions.find((item) => item.type === "SCHEDULE_MEETING");
  assert.equal(scheduleAction?.proposedDateTime?.startsWith("2026-05-13T10:00:00"), true);
});

test("print output includes analyzed fields without misleading N/A", () => {
  const report = buildEmailTaskPrintReport([
    {
      activityDateIso: "2026-05-04T09:00:00.000Z",
      sourceText: "Ahoj &lt;team&gt;, prosím o update.",
      projectTitle: null,
      analysisStatus: "UNASSIGNED_PROJECT",
      sentimentScore: 7,
      isUrgent: false,
      stage: "VALIDATION",
      taskSummary: "Čekáme na PDF poznámky",
      dueDate: "2026-05-08",
      calendarProposals: [
        {
          actionType: "SCHEDULE_MEETING",
          title: "Stripe sync",
          proposedDateTimeIso: "2026-05-13T10:00:00+02:00",
          allDayDateIso: null,
          timezone: "Europe/Prague"
        }
      ]
    }
  ]);
  assert.equal(report.includes("Projekt: Nepřiřazeno k projektu"), true);
  assert.equal(report.includes("Sentiment: 7/10"), true);
  assert.equal(report.includes("Calendar suggestion: 2026-05-13T10:00:00+02:00"), true);
  assert.equal(report.includes("<team>"), true);
});

test("analysis output keeps sentiment/stage populated for analyzed scenarios", () => {
  const email = fixtures.find((item) => item.id === "design-feedback");
  assert.ok(email);
  const parsed = parseFromText(email.text, email.emailTimestampIso);
  assert.notEqual(parsed.sentimentScore, null);
  assert.notEqual(parsed.suggestedProjectStage, null);
});
