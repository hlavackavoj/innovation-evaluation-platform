import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runCommunicationAnalysis } from "@/lib/email/analyzer-pipeline";
import { verifySignedSyncRequest } from "@/lib/security/sync-auth";

export async function POST(request: NextRequest) {
  const cronSecret = process.env.EMAIL_SYNC_CRON_SECRET;
  const verification = verifySignedSyncRequest({
    secret: cronSecret,
    timestamp: request.headers.get("x-sync-timestamp"),
    nonce: request.headers.get("x-sync-nonce"),
    signature: request.headers.get("x-sync-signature"),
    source: request.headers.get("x-forwarded-for") || request.ip || "unknown"
  });

  if (!verification.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: verification.status });
  }

  const settings = await prisma.projectEmailAutomationSetting.findMany({
    where: { enabled: true },
    include: {
      project: true
    }
  });

  let processed = 0;
  for (const setting of settings) {
    if (!setting.project.ownerUserId) continue;

    await runCommunicationAnalysis({
      userId: setting.project.ownerUserId,
      projectId: setting.projectId,
      direction: "all"
    });

    processed += 1;
  }

  return NextResponse.json({ processed });
}
