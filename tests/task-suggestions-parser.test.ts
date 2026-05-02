import test from "node:test";
import assert from "node:assert/strict";
import { matchSuggestedProjectToExisting, parseGeminiTaskSuggestionOutput } from "@/lib/email/analyzer-pipeline";

test("parseGeminiTaskSuggestionOutput parses projects/tasks and deduplicates projects", () => {
  const parsed = parseGeminiTaskSuggestionOutput(
    JSON.stringify({
      projects: [
        { name: "Spinout AI", confidence: 0.88, reason: "mentioned in thread", likelyExisting: true },
        { name: " spinout ai ", confidence: 0.4, reason: "duplicate", likelyExisting: false }
      ],
      tasks: [
        {
          title: "Prepare pilot proposal",
          description: "Draft proposal",
          priority: "HIGH",
          deadline: "2026-05-20",
          contactEmail: "lead@example.com",
          projectName: "Spinout AI",
          confidence: 0.76,
          reason: "explicit ask"
        }
      ]
    })
  );

  assert.equal(parsed.projects.length, 1);
  assert.equal(parsed.projects[0]?.name, "Spinout AI");
  assert.equal(parsed.tasks.length, 1);
  assert.equal(parsed.tasks[0]?.priority, "HIGH");
  assert.equal(parsed.tasks[0]?.deadlineIso, "2026-05-20");
});

test("matchSuggestedProjectToExisting prefers exact then fuzzy", () => {
  const known = [
    { id: "p1", title: "Quantum Spinout" },
    { id: "p2", title: "Bio Materials Project" }
  ];

  assert.equal(matchSuggestedProjectToExisting("Quantum Spinout", known), "p1");
  assert.equal(matchSuggestedProjectToExisting("Bio Materials", known), "p2");
  assert.equal(matchSuggestedProjectToExisting("Unknown", known), null);
});
