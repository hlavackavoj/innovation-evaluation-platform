import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runCommunicationAnalysis } from "@/lib/email/analyzer-pipeline";

export async function POST(request: NextRequest) {
  const cronSecret = process.env.EMAIL_SYNC_CRON_SECRET;
  const authHeader = request.headers.get("authorization") || "";

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
