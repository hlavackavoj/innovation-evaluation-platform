"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export async function deleteContactAction(contactId: string) {
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

export async function deleteTaskAction(taskId: string) {
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
