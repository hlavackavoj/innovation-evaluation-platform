"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ProjectPriority, TaskSuggestionStatus, TaskStatus } from "@prisma/client";
import { buildAccessibleProjectWhere, canAccessAllProjects, requireCurrentUser } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { runCommunicationAnalysis } from "@/lib/email/analyzer-pipeline";
import { disconnectProviderForCurrentUser } from "@/lib/email/connections";

function parseDate(input: FormDataEntryValue | null) {
  if (!input) return undefined;
  const value = input.toString().trim();
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}

export async function analyzeCommunicationAction(formData: FormData) {
  const user = await requireCurrentUser();

  const providerRaw = formData.get("provider")?.toString() || "ALL";
  const directionRaw = formData.get("direction")?.toString() || "all";

  const result = await runCommunicationAnalysis({
    userId: user.id,
    projectId: formData.get("projectId")?.toString() || undefined,
    provider: providerRaw === "ALL" ? undefined : (providerRaw as "GMAIL" | "OUTLOOK"),
    direction: directionRaw as "all" | "inbound" | "outbound",
    dateFrom: parseDate(formData.get("dateFrom")),
    dateTo: parseDate(formData.get("dateTo")),
    contactEmail: formData.get("contactEmail")?.toString() || undefined
  });

  return result;
}

export async function disconnectConnectionAction(formData: FormData) {
  const provider = formData.get("provider")?.toString();
  const connectionId = formData.get("connectionId")?.toString();

  if (!provider) {
    throw new Error("Provider is required.");
  }

  await disconnectProviderForCurrentUser(provider, connectionId);
  revalidatePath("/email-analyzer");
  redirect("/email-analyzer?toast=provider-disconnected");
}

export async function deleteContact(contactId: string) {
  const user = await requireCurrentUser();
  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      ...(canAccessAllProjects(user)
        ? {}
        : {
            projectLinks: {
              some: {
                project: buildAccessibleProjectWhere(user)
              }
            }
          })
    },
    select: { id: true }
  });

  if (!contact) {
    throw new Error("Contact not found or access denied.");
  }

  await prisma.contact.delete({
    where: {
      id: contactId
    }
  });
}

export async function deleteTask(taskId: string) {
  const user = await requireCurrentUser();
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      project: canAccessAllProjects(user) ? {} : { ownerUserId: user.id }
    },
    select: { id: true }
  });

  if (!task) {
    throw new Error("Task not found or access denied.");
  }

  await prisma.task.delete({
    where: {
      id: taskId
    }
  });
}

export async function deleteOrganizationAction(organizationId: string) {
  const user = await requireCurrentUser();
  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      ...(canAccessAllProjects(user)
        ? {}
        : {
            OR: [
              {
                projects: {
                  some: {
                    ownerUserId: user.id
                  }
                }
              },
              {
                contacts: {
                  some: {
                    projectLinks: {
                      some: {
                        project: {
                          ownerUserId: user.id
                        }
                      }
                    }
                  }
                }
              }
            ]
          })
    },
    select: { id: true }
  });

  if (!organization) {
    throw new Error("Organization not found or access denied.");
  }

  await prisma.organization.delete({
    where: {
      id: organizationId
    }
  });
}

type CreateAiSuggestedTaskInput = {
  activityId: string;
  actionType: "SCHEDULE_MEETING" | "DRAFT_RESPONSE";
  title: string;
  description?: string;
  dueDateIso?: string | null;
};

export async function createTaskFromAiSuggestion(input: CreateAiSuggestedTaskInput) {
  const user = await requireCurrentUser();
  const activity = await prisma.activity.findFirst({
    where: {
      id: input.activityId,
      OR: canAccessAllProjects(user)
        ? undefined
        : [
            {
              userId: user.id
            },
            {
              project: {
                ownerUserId: user.id
              }
            }
          ]
    },
    select: {
      id: true,
      projectId: true,
      note: true
    }
  });

  if (!activity) {
    throw new Error("Activity not found or access denied.");
  }

  if (!activity.projectId) {
    throw new Error("Cannot create task from an unlinked email. Assign the email to a project first.");
  }

  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) {
    throw new Error("Task title is required.");
  }

  const dueDate = input.dueDateIso ? new Date(input.dueDateIso) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) {
    throw new Error("Invalid due date.");
  }

  const task = await prisma.task.create({
    data: {
      projectId: activity.projectId,
      sourceActivityId: activity.id,
      title: trimmedTitle,
      description:
        input.description?.trim() ||
        `Created from AI recommendation (${input.actionType}) on imported communication.`,
      status: TaskStatus.TODO,
      priority: input.actionType === "SCHEDULE_MEETING" ? ProjectPriority.HIGH : ProjectPriority.MEDIUM,
      dueDate
    },
    select: {
      id: true
    }
  });

  revalidatePath("/email-analyzer");
  revalidatePath("/tasks");
  revalidatePath("/");
  revalidatePath(`/projects/${activity.projectId}`);

  return task;
}

export async function assignActivityToProjectAction(formData: FormData) {
  const user = await requireCurrentUser();
  const activityId = formData.get("activityId")?.toString().trim();
  const projectId = formData.get("projectId")?.toString().trim();

  if (!activityId || !projectId) {
    throw new Error("Missing activity or project ID.");
  }

  const activity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      OR: canAccessAllProjects(user)
        ? undefined
        : [
            {
              userId: user.id
            },
            {
              project: {
                ownerUserId: user.id
              }
            }
          ]
    },
    select: {
      id: true
    }
  });

  if (!activity) {
    throw new Error("Activity not found or access denied.");
  }

  const targetProject = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...buildAccessibleProjectWhere(user)
    },
    select: {
      id: true
    }
  });

  if (!targetProject) {
    throw new Error("Project not found or access denied.");
  }

  await prisma.activity.update({
    where: {
      id: activityId
    },
    data: {
      projectId: targetProject.id
    }
  });

  revalidatePath("/");
  revalidatePath("/email-analyzer");
  revalidatePath(`/projects/${targetProject.id}`);
}

type AcceptSuggestedTaskInput = {
  taskId: string;
  title: string;
  description?: string | null;
  priority: ProjectPriority;
  dueDateIso?: string | null;
};

export async function acceptSuggestedTaskAction(input: AcceptSuggestedTaskInput) {
  const user = await requireCurrentUser();
  const task = await prisma.task.findFirst({
    where: {
      id: input.taskId,
      suggestionStatus: TaskSuggestionStatus.SUGGESTED,
      project: canAccessAllProjects(user) ? {} : { ownerUserId: user.id }
    },
    select: { id: true, projectId: true }
  });

  if (!task) {
    throw new Error("Task not found, already accepted, or access denied.");
  }

  const trimmedTitle = input.title.trim();
  if (!trimmedTitle) throw new Error("Task title is required.");

  const dueDate = input.dueDateIso ? new Date(input.dueDateIso) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) throw new Error("Invalid due date.");

  await prisma.task.update({
    where: { id: task.id },
    data: {
      title: trimmedTitle,
      description: input.description?.trim() || null,
      priority: input.priority,
      dueDate,
      suggestionStatus: TaskSuggestionStatus.ACCEPTED
    }
  });

  revalidatePath("/email-analyzer");
  revalidatePath("/tasks");
  revalidatePath("/");
  revalidatePath(`/projects/${task.projectId}`);
}

// Backward-compatible aliases for any existing imports.
export const deleteContactAction = deleteContact;
export const deleteTaskAction = deleteTask;
