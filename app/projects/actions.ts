"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ProjectStage } from "@prisma/client";
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
  const stage = formData.get("stage") as ProjectStage | null;

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
