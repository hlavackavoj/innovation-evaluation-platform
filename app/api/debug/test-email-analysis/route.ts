import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/authorization";
import { runMockEmailEnrichmentTest } from "@/lib/email/analyzer-pipeline";
import type { NormalizedEmailMessage } from "@/lib/email/types";

function buildMockMessage(input: {
  id: string;
  threadId: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  subject: string;
  bodyText: string;
}): NormalizedEmailMessage {
  const now = new Date();

  return {
    provider: "GMAIL",
    providerMessageId: input.id,
    providerThreadId: input.threadId,
    providerParentMessageId: undefined,
    internetMessageId: `<${input.id}@debug.local>`,
    subject: input.subject,
    direction: "inbound",
    participants: {
      from: [{ email: input.fromEmail, name: input.fromName }],
      to: [{ email: input.toEmail, name: "CRM User" }],
      cc: [],
      bcc: []
    },
    sentAt: now,
    snippet: input.bodyText.slice(0, 120),
    bodyText: input.bodyText
  };
}

async function handleRequest() {
  const user = await requireCurrentUser();

  const existingContact = await prisma.contact.findFirst({
    where: {
      email: {
        not: null
      }
    },
    orderBy: {
      updatedAt: "desc"
    },
    select: {
      id: true,
      email: true,
      name: true
    }
  });

  const emailForExisting = existingContact?.email ?? "existing.person@known-company.cz";

  if (!existingContact) {
    await prisma.contact.create({
      data: {
        name: "Existing Person",
        email: emailForExisting,
        role: "Research Contact"
      }
    });
  }

  const baseToken = Date.now();
  const messages: NormalizedEmailMessage[] = [
    buildMockMessage({
      id: `debug-existing-${baseToken}`,
      threadId: `debug-thread-existing-${baseToken}`,
      fromEmail: emailForExisting,
      fromName: existingContact?.name || "Existing Person",
      toEmail: "owner@innovation.local",
      subject: "Aktualizace k projektu",
      bodyText: "Posílám update k projektu a příští týden můžeme zavolat."
    }),
    buildMockMessage({
      id: `debug-new-lead-${baseToken}`,
      threadId: `debug-thread-new-lead-${baseToken}`,
      fromEmail: `new.lead.${baseToken}@freshlead.cz`,
      fromName: "New Lead",
      toEmail: "owner@innovation.local",
      subject: "Dotaz na nabídku",
      bodyText: "Pošlete mi prosím nabídku do pátku. Potřebujeme to interně schválit."
    }),
    buildMockMessage({
      id: `debug-new-domain-${baseToken}`,
      threadId: `debug-thread-new-domain-${baseToken}`,
      fromEmail: `cto.${baseToken}@unknown-domain-lab.cz`,
      fromName: "Domain Creator",
      toEmail: "owner@innovation.local",
      subject: "Možnost spolupráce",
      bodyText: "Rádi bychom otevřeli spolupráci. Prosím navrhněte další kroky a termín meetingu."
    })
  ];

  const before = {
    organizations: await prisma.organization.count(),
    contacts: await prisma.contact.count(),
    activities: await prisma.activity.count(),
    tasks: await prisma.task.count()
  };

  const result = await runMockEmailEnrichmentTest({
    userId: user.id,
    messages
  });

  const after = {
    organizations: await prisma.organization.count(),
    contacts: await prisma.contact.count(),
    activities: await prisma.activity.count(),
    tasks: await prisma.task.count()
  };

  return NextResponse.json({
    simulatedEmails: messages.length,
    enrichmentResult: result,
    createdInDb: {
      organizations: after.organizations - before.organizations,
      contacts: after.contacts - before.contacts,
      activities: after.activities - before.activities,
      tasks: after.tasks - before.tasks
    }
  });
}

export async function GET() {
  return handleRequest();
}

export async function POST() {
  return handleRequest();
}
