"use server";

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

export async function createContactAction(formData: FormData) {
  const user = await requireCurrentUser();
  assertCanManageRecords(user);

  const name = formData.get("name")?.toString().trim();
  const role = formData.get("role")?.toString().trim();

  if (!name || !role) {
    throw new Error("Name and role are required.");
  }

  await prisma.contact.create({
    data: {
      name,
      role,
      email: getOptionalString(formData, "email"),
      phone: getOptionalString(formData, "phone"),
      organizationId: getOptionalString(formData, "organizationId"),
      notes: getOptionalString(formData, "notes")
    }
  });

  revalidatePath("/contacts");
  revalidatePath("/organizations");
  redirect("/contacts");
}

export async function updateContactAction(contactId: string, formData: FormData) {
  const user = await requireCurrentUser();
  assertCanManageRecords(user);

  const name = formData.get("name")?.toString().trim();
  const role = formData.get("role")?.toString().trim();

  if (!name || !role) {
    throw new Error("Name and role are required.");
  }

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
    }
  });

  if (!contact) {
    throw new Error("Contact not found or access denied.");
  }

  await prisma.contact.update({
    where: { id: contactId },
    data: {
      name,
      role,
      email: getOptionalString(formData, "email"),
      phone: getOptionalString(formData, "phone"),
      organizationId: getOptionalString(formData, "organizationId"),
      notes: getOptionalString(formData, "notes")
    }
  });

  revalidatePath("/contacts");
  revalidatePath("/organizations");
  redirect("/contacts");
}
