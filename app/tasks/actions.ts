"use server";

import { revalidatePath } from "next/cache";
import { ProjectPriority, TaskStatus, TaskSuggestionStatus } from "@prisma/client";
import { buildAccessibleProjectWhere, canAccessAllProjects, requireCurrentUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

function parseSafeDate(value: FormDataEntryValue | null): Date | null {
  if (!value) return null;
  const raw = value.toString().trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid deadline date.");
  }
  return parsed;
}

function parsePriority(value: FormDataEntryValue | null): ProjectPriority {
  const raw = value?.toString().trim().toUpperCase();
  if (raw === ProjectPriority.LOW || raw === ProjectPriority.HIGH || raw === ProjectPriority.URGENT) {
    return raw;
  }
  return ProjectPriority.MEDIUM;
}

async function getAccessibleTask(taskId: string) {
  const user = await requireCurrentUser();
  return prisma.task.findFirst({
    where: {
      id: taskId,
      project: canAccessAllProjects(user) ? {} : buildAccessibleProjectWhere(user)
    }
  });
}

export async function createTaskAction(formData: FormData) {
  const user = await requireCurrentUser();

  const projectId = formData.get("projectId")?.toString().trim();
  if (!projectId) throw new Error("Missing projectId.");

  const project = await prisma.project.findFirst({
    where: { id: projectId, ...(canAccessAllProjects(user) ? {} : buildAccessibleProjectWhere(user)) },
    select: { id: true }
  });
  if (!project) throw new Error("Project not found or access denied.");

  const title = formData.get("title")?.toString().trim();
  if (!title) throw new Error("Task title is required.");

  const description = formData.get("description")?.toString().trim() || null;
  const dueDate = parseSafeDate(formData.get("dueDate"));
  const priority = parsePriority(formData.get("priority"));

  await prisma.task.create({
    data: {
      projectId,
      title,
      description,
      dueDate,
      priority,
      status: TaskStatus.TODO,
      suggestionStatus: TaskSuggestionStatus.ACCEPTED
    }
  });

  revalidatePath("/tasks");
  revalidatePath(`/projects/${projectId}`);
}

export async function updateSuggestedTaskAction(formData: FormData) {
  const taskId = formData.get("taskId")?.toString().trim();
  if (!taskId) throw new Error("Missing taskId.");

  const task = await getAccessibleTask(taskId);
  if (!task) throw new Error("Task not found or access denied.");

  const title = formData.get("title")?.toString().trim();
  if (!title) throw new Error("Task title is required.");

  const description = formData.get("description")?.toString().trim() || null;
  const dueDate = parseSafeDate(formData.get("dueDate"));
  const priority = parsePriority(formData.get("priority"));
  const projectId = formData.get("projectId")?.toString().trim() || null;
  const contactId = formData.get("contactId")?.toString().trim() || null;

  const user = await requireCurrentUser();
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, ...(canAccessAllProjects(user) ? {} : buildAccessibleProjectWhere(user)) },
      select: { id: true }
    });
    if (!project) throw new Error("Target project not found or access denied.");
  }

  await prisma.task.update({
    where: { id: task.id },
    data: {
      title,
      description,
      dueDate,
      priority,
      projectId: projectId ?? task.projectId,
      contactId
    }
  });

  revalidatePath("/tasks");
}

export async function rejectSuggestedTaskAction(formData: FormData) {
  const taskId = formData.get("taskId")?.toString().trim();
  if (!taskId) throw new Error("Missing taskId.");

  const task = await getAccessibleTask(taskId);
  if (!task) throw new Error("Task not found or access denied.");

  await prisma.task.update({
    where: { id: task.id },
    data: {
      suggestionStatus: TaskSuggestionStatus.REJECTED
    }
  });

  revalidatePath("/tasks");
}

export async function acceptSuggestedTaskAction(formData: FormData) {
  const taskId = formData.get("taskId")?.toString().trim();
  if (!taskId) throw new Error("Missing taskId.");

  const task = await getAccessibleTask(taskId);
  if (!task) throw new Error("Task not found or access denied.");

  const projectId = formData.get("projectId")?.toString().trim() || null;
  const newProjectTitle = formData.get("newProjectTitle")?.toString().trim() || null;

  const user = await requireCurrentUser();

  await prisma.$transaction(async (tx) => {
    let targetProjectId = projectId;

    if (targetProjectId) {
      const project = await tx.project.findFirst({
        where: {
          id: targetProjectId,
          ...(canAccessAllProjects(user) ? {} : buildAccessibleProjectWhere(user))
        },
        select: { id: true }
      });
      if (!project) throw new Error("Target project not found or access denied.");
    }

    if (!targetProjectId && newProjectTitle) {
      const created = await tx.project.create({
        data: {
          title: newProjectTitle,
          description: "Created from communication task suggestion",
          ownerUserId: user.id
        },
        select: { id: true }
      });
      targetProjectId = created.id;
    }

    await tx.task.update({
      where: { id: task.id },
      data: {
        projectId: targetProjectId ?? task.projectId,
        suggestionStatus: TaskSuggestionStatus.ACCEPTED
      }
    });
  });

  revalidatePath("/tasks");
  revalidatePath("/projects");
}
