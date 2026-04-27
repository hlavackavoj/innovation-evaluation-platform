"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PipelineStage, ProjectPriority, RecommendationStatus, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseProjectFormData } from "@/lib/project-form";

export async function createProjectAction(formData: FormData) {
  const data = parseProjectFormData(formData);

  const project = await prisma.project.create({
    data
  });

  revalidatePath("/");
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}

export async function updateProjectAction(projectId: string, formData: FormData) {
  const data = parseProjectFormData(formData);

  await prisma.project.update({
    where: { id: projectId },
    data
  });

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function updateProjectStageAction(projectId: string, formData: FormData) {
  const stage = formData.get("stage") as PipelineStage | null;

  if (!stage) {
    throw new Error("Project stage is required.");
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      stage
    }
  });

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function convertRecommendationToTaskAction(projectId: string, formData: FormData) {
  const recommendationId = formData.get("recommendationId")?.toString();

  if (!recommendationId) {
    throw new Error("Recommendation id is required.");
  }

  const recommendation = await prisma.recommendation.findFirst({
    where: {
      id: recommendationId,
      projectId,
      status: RecommendationStatus.PENDING
    },
    include: {
      project: true
    }
  });

  if (!recommendation) {
    throw new Error("Recommendation not found.");
  }

  await prisma.$transaction([
    prisma.task.create({
      data: {
        projectId,
        assignedToUserId: recommendation.project.ownerUserId,
        title: recommendation.title,
        description: `${recommendation.description}\n\nSuggested role: ${recommendation.suggestedRole}`,
        status: TaskStatus.TODO,
        priority:
          recommendation.suggestedRole === "IP lawyer" || recommendation.suggestedRole === "Project manager"
            ? ProjectPriority.HIGH
            : ProjectPriority.MEDIUM
      }
    }),
    prisma.recommendation.update({
      where: {
        id: recommendationId
      },
      data: {
        status: RecommendationStatus.COMPLETED
      }
    })
  ]);

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}?toast=recommendation-converted`);
}
