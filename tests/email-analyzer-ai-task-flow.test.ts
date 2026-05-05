import test from "node:test";
import assert from "node:assert/strict";
import { resolveSuggestedActionDueDateIso } from "@/lib/email/calendar-utils";
import { prisma } from "@/lib/prisma";
import { createTaskFromAiSuggestionForUser } from "@/app/email-analyzer/actions";

test("AI recommendation flow resolves due date and persists it via createTaskFromAiSuggestion", async (t) => {
  const runId = `it-ai-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `${runId}@example.com`;

  let user: { id: string };
  try {
    user = await prisma.user.create({
      data: {
        name: "Integration Tester",
        email,
        role: "MANAGER"
      },
      select: { id: true }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Can't reach database server")) {
      t.skip("Integration test skipped: database server is not reachable in this environment.");
      return;
    }
    throw error;
  }

  const project = await prisma.project.create({
    data: {
      title: `Integration Project ${runId}`,
      description: "Test project",
      ownerUserId: user.id
    },
    select: { id: true }
  });

  const activity = await prisma.activity.create({
    data: {
      projectId: project.id,
      userId: user.id,
      type: "EMAIL",
      note: "Imported email",
      activityDate: new Date("2026-05-04T09:00:00.000Z")
    },
    select: { id: true }
  });

  t.after(async () => {
    await prisma.task.deleteMany({ where: { projectId: project.id } });
    await prisma.activity.deleteMany({ where: { id: activity.id } });
    await prisma.project.deleteMany({ where: { id: project.id } });
    await prisma.user.deleteMany({ where: { id: user.id } });
  });

  const referenceEmailIso = "2026-05-04T09:00:00.000Z";
  const dueDateIso = resolveSuggestedActionDueDateIso({ dueDays: 3 }, referenceEmailIso);

  assert.ok(dueDateIso);

  const result = await createTaskFromAiSuggestionForUser(user.id, {
    activityId: activity.id,
    actionType: "SCHEDULE_MEETING",
    title: "Naplánovat interview",
    dueDateIso
  });

  const createdTask = await prisma.task.findUnique({
    where: { id: result.id },
    select: { dueDate: true, sourceActivityId: true }
  });

  assert.ok(createdTask);
  assert.equal(createdTask?.sourceActivityId, activity.id);
  assert.equal(createdTask?.dueDate?.toISOString(), "2026-05-07T09:00:00.000Z");
});
