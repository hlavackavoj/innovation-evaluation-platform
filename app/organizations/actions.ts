"use server";

import { OrganizationType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  assertCanManageRecords,
  buildAccessibleProjectWhere,
  canAccessAllProjects,
  requireCurrentUser
} from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

function getOptionalString(formData: FormData, name: string) {
  return formData.get(name)?.toString().trim() || null;
}

export async function createOrganizationAction(formData: FormData) {
  const user = await requireCurrentUser();
  assertCanManageRecords(user);

  const name = formData.get("name")?.toString().trim();
  const type = formData.get("type") as OrganizationType | null;

  if (!name || !type) {
    throw new Error("Name and type are required.");
  }

  await prisma.organization.create({
    data: {
      name,
      type,
      website: getOptionalString(formData, "website"),
      notes: getOptionalString(formData, "notes")
    }
  });

  revalidatePath("/organizations");
  revalidatePath("/contacts");
  redirect("/organizations");
}

export async function updateOrganizationAction(organizationId: string, formData: FormData) {
  const user = await requireCurrentUser();
  assertCanManageRecords(user);

  const name = formData.get("name")?.toString().trim();
  const type = formData.get("type") as OrganizationType | null;

  if (!name || !type) {
    throw new Error("Name and type are required.");
  }

  const organization = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      ...(canAccessAllProjects(user)
        ? {}
        : {
            projects: {
              some: buildAccessibleProjectWhere(user)
            }
          })
    }
  });

  if (!organization) {
    throw new Error("Organization not found or access denied.");
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name,
      type,
      website: getOptionalString(formData, "website"),
      notes: getOptionalString(formData, "notes")
    }
  });

  revalidatePath("/organizations");
  revalidatePath("/contacts");
  redirect("/organizations");
}
