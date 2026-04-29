"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/authorization";
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

  redirect(
    `/email-analyzer?jobId=${result.jobId}&imported=${result.importedEmails}&matched=${result.matchedContacts}&suggested=${result.suggestedContacts}&generated=${result.generatedTasks}`
  );
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
