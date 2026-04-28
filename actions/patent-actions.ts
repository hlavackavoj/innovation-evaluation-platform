"use server";

import { ActivityType, PipelineStage, ProjectPriority, TaskStatus, type Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireProjectAccess } from "@/lib/authorization";
import { analyzePatentEmail, type PatentEmailAnalysis } from "@/lib/ai-service";
import { prisma } from "@/lib/prisma";

type ProcessPatentEmailInput = {
  projectId: string;
  subject: string;
  content: string;
  emailMessageId: string;
  emailParentId?: string | null;
};

function normalizePhase(phase: string): PipelineStage {
  const value = phase.toLowerCase();

  if (value.includes("discover") || value.includes("screen") || value.includes("lead")) {
    return PipelineStage.DISCOVERY;
  }

  if (value.includes("valid") || value.includes("evaluat") || value.includes("info")) {
    return PipelineStage.VALIDATION;
  }

  if (value.includes("mvp") || value.includes("prototype") || value.includes("pilot") || value.includes("support")) {
    return PipelineStage.MVP;
  }

  if (value.includes("scal") || value.includes("growth")) {
    return PipelineStage.SCALING;
  }

  if (value.includes("spin") || value.includes("licens") || value.includes("formation")) {
    return PipelineStage.SPIN_OFF;
  }

  return PipelineStage.DISCOVERY;
}

function getTaskPriority(deadlineDays: number): ProjectPriority {
  if (deadlineDays <= 3) {
    return ProjectPriority.URGENT;
  }

  if (deadlineDays <= 7) {
    return ProjectPriority.HIGH;
  }

  if (deadlineDays <= 14) {
    return ProjectPriority.MEDIUM;
  }

  return ProjectPriority.LOW;
}

function buildTaskDescription(analysis: PatentEmailAnalysis, assignee: string) {
  return `Generated from patent communication analysis.\n\nAI summary: ${analysis.summary}\nSuggested assignee: ${assignee}`;
}

export async function processPatentEmailAction(input: ProcessPatentEmailInput) {
  const { user, project } = await requireProjectAccess(input.projectId, { write: true });

  if (!input.subject.trim() || !input.content.trim() || !input.emailMessageId.trim()) {
    throw new Error("subject, content, and emailMessageId are required.");
  }

  const aiAnalysis = await analyzePatentEmail(input.content, input.subject);
  const stage = normalizePhase(aiAnalysis.phase);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.create({
      data: {
        projectId: project.id,
        userId: user.id,
        type: ActivityType.EMAIL,
        note: `${input.subject}\n\n${input.content}`,
        emailMessageId: input.emailMessageId.trim(),
        emailParentId: (input.emailParentId ?? aiAnalysis.isResponseTo)?.trim() || null,
        aiAnalysis: aiAnalysis as Prisma.InputJsonValue,
        activityDate: now
      }
    });

    const tasks = await Promise.all(
      aiAnalysis.tasks.map((task) => {
        const dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + task.deadlineDays);

        return tx.task.create({
          data: {
            projectId: project.id,
            assignedToUserId: project.ownerUserId,
            sourceActivityId: activity.id,
            title: task.title,
            description: buildTaskDescription(aiAnalysis, task.assignee),
            status: TaskStatus.TODO,
            priority: getTaskPriority(task.deadlineDays),
            dueDate
          }
        });
      })
    );

    await tx.project.update({
      where: { id: project.id },
      data: {
        stage,
        lastContactAt: now
      }
    });

    return { activity, tasks, stage };
  });

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath(`/projects/${project.id}`);

  return {
    activityId: result.activity.id,
    taskIds: result.tasks.map((task) => task.id),
    stage: result.stage,
    aiAnalysis
  };
}
