import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runCommunicationAnalysis } from "@/lib/email/analyzer-pipeline";
import { verifySignedSyncRequest } from "@/lib/security/sync-auth";

export async function POST(request: NextRequest) {
  const cronSecret = process.env.EMAIL_SYNC_CRON_SECRET;
  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (!cronSecret) {
    return NextResponse.json({ error: "Server misconfigured: EMAIL_SYNC_CRON_SECRET is missing." }, { status: 500 });
  }

  if (bearerToken && bearerToken === cronSecret) {
    return runSyncBatch();
  }

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

  return runSyncBatch();
}

async function runSyncBatch() {
  const settings = await prisma.projectEmailAutomationSetting.findMany({
    where: { enabled: true },
    include: {
      project: true
    }
  });

  let processed = 0;
  let failed = 0;
  let skipped = 0;
  const results: Array<{
    projectId: string;
    userId: string;
    status: "processed" | "failed" | "skipped";
    reason?: string;
    jobId?: string;
    error?: string;
  }> = [];

  for (const setting of settings) {
    if (!setting.project.ownerUserId) continue;

    try {
      const outcome = await runCommunicationAnalysis({
        userId: setting.project.ownerUserId,
        projectId: setting.projectId,
        direction: "all",
        trigger: "SCHEDULED"
      });

      if ("skipped" in outcome && outcome.skipped) {
        skipped += 1;
        results.push({
          projectId: setting.projectId,
          userId: setting.project.ownerUserId,
          status: "skipped",
          reason: outcome.reason,
          jobId: outcome.jobId
        });
        continue;
      }

      processed += 1;
      results.push({
        projectId: setting.projectId,
        userId: setting.project.ownerUserId,
        status: "processed",
        jobId: outcome.jobId
      });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        projectId: setting.projectId,
        userId: setting.project.ownerUserId,
        status: "failed",
        error: message
      });
      console.error("[email-sync-cron] Project sync failed", {
        projectId: setting.projectId,
        userId: setting.project.ownerUserId,
        error: message
      });
    }
  }

  return NextResponse.json({ processed, failed, skipped, totalCandidates: settings.length, results });
}
