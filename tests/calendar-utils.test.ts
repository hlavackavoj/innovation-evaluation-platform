import test from "node:test";
import assert from "node:assert/strict";
import { resolveSuggestedActionDueDateIso } from "@/lib/email/calendar-utils";

test("resolveSuggestedActionDueDateIso uses reference email timestamp for dueDays", () => {
  const dueDateIso = resolveSuggestedActionDueDateIso(
    {
      dueDays: 2
    },
    "2026-05-04T09:00:00.000Z"
  );

  assert.equal(dueDateIso, "2026-05-06T09:00:00.000Z");
});

test("resolveSuggestedActionDueDateIso prefers explicit proposedDateTime", () => {
  const dueDateIso = resolveSuggestedActionDueDateIso(
    {
      proposedDateTime: "2026-05-13T10:00:00+02:00",
      dueDays: 5
    },
    "2026-05-04T09:00:00.000Z"
  );

  assert.equal(dueDateIso, "2026-05-13T08:00:00.000Z");
});
