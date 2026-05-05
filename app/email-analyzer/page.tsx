import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { AuthorizationError, buildAccessibleProjectWhere, canAccessAllProjects, requireCurrentUser } from "@/lib/authorization";
import { getCurrentUserEmailConnections } from "@/lib/email/connections";
import { analyzeCommunicationAction, disconnectConnectionAction } from "@/app/email-analyzer/actions";
import { ConnectGmailButton } from "@/components/ConnectGmailButton";
import { EnrichmentPanel } from "@/app/email-analyzer/enrichment-panel";
import { parseAnalysisMetadata } from "@/lib/email/analysis-metadata";
import { parseEmailSyncSummary } from "@/lib/email/sync-summary";

function isMissingActivityAnalysisMetadataColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybe = error as { code?: unknown; meta?: { column?: unknown } };
  return maybe.code === "P2022" && maybe.meta?.column === "Activity.analysisMetadata";
}

export default async function EmailAnalyzerPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  let user;
  try {
    user = await requireCurrentUser();
  } catch (error) {
    if (error instanceof AuthorizationError) {
      redirect("/login");
    }
    throw error;
  }

  const [projects, contacts, connections] = await Promise.all([
    prisma.project.findMany({
      where: {
        OR: [{ ownerUserId: user.id }, { ownerUserId: null }]
      },
      orderBy: { title: "asc" },
      select: { id: true, title: true }
    }),
    prisma.contact.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true }
    }),
    getCurrentUserEmailConnections()
  ]);

  const activityWhere = canAccessAllProjects(user)
    ? { type: "EMAIL" as const }
    : {
        type: "EMAIL" as const,
        OR: [
          {
            userId: user.id
          },
          {
            project: buildAccessibleProjectWhere(user)
          }
        ]
      };

  const recentInsights = await (async () => {
    try {
      return await prisma.activity.findMany({
        where: activityWhere,
        orderBy: {
          activityDate: "desc"
        },
        take: 12,
        select: {
          id: true,
          note: true,
          bodyContent: true,
          activityDate: true,
          projectId: true,
          project: {
            select: {
              id: true,
              title: true
            }
          },
          analysisMetadata: true
        }
      });
    } catch (error) {
      if (!isMissingActivityAnalysisMetadataColumn(error)) {
        throw error;
      }

      const fallbackRows = await prisma.activity.findMany({
        where: activityWhere,
        orderBy: {
          activityDate: "desc"
        },
        take: 12,
        select: {
          id: true,
          note: true,
          bodyContent: true,
          activityDate: true,
          projectId: true,
          project: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      return fallbackRows.map((row) => ({
        ...row,
        analysisMetadata: null
      }));
    }
  })();

  const readFirst = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const jobId = readFirst(resolvedSearchParams?.jobId);
  const toast = readFirst(resolvedSearchParams?.toast);
  const error = readFirst(resolvedSearchParams?.error);
  const provider = readFirst(resolvedSearchParams?.provider);

  const initialJob = jobId
    ? await prisma.emailSyncJob.findFirst({
        where: {
          id: jobId,
          userId: user.id
        },
        select: {
          summary: true
        }
      })
    : null;

  const initialSummary = parseEmailSyncSummary(initialJob?.summary ?? null);
  const aiRecommendations = recentInsights
    .map((item) => {
      const metadata = parseAnalysisMetadata(item.analysisMetadata);
      if (!metadata) return null;

      return {
        activityId: item.id,
        activityDate: item.activityDate.toISOString(),
        summary: item.note,
        sourceText: item.bodyContent ?? item.note,
        projectId: item.projectId,
        projectTitle: item.project?.title ?? null,
        intentCategory: metadata.intentCategory,
        actionItems: metadata.actionItems,
        gapAnalysisQuestions: metadata.gapAnalysisQuestions,
        sentimentScore: metadata.sentimentScore,
        isUrgent: metadata.isUrgent,
        suggestedProjectStage: metadata.suggestedProjectStage,
        calendarProposals: metadata.calendarProposals,
        suggestedActions: metadata.suggestedActions,
        followUpQuestions: metadata.followUpQuestions,
        analysisStatus: metadata.analysisStatus
      };
    })
    .filter(
      (item): item is NonNullable<typeof item> =>
        !!item &&
        (item.suggestedActions.length > 0 ||
          item.followUpQuestions.length > 0 ||
          item.sentimentScore !== null ||
          item.intentCategory !== null ||
          item.actionItems.length > 0 ||
          item.gapAnalysisQuestions.length > 0 ||
          item.analysisStatus === "UNASSIGNED_PROJECT")
    );

  return (
    <Shell
      title="Email Analyzer"
      description="Importujte korespondenci, přiřaďte k výzkumným projektům a generujte výzkumné milníky."
      actions={<ConnectGmailButton returnPath="/email-analyzer" />}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr,340px]">
        <EnrichmentPanel
          projects={projects}
          contacts={contacts}
          analyzeAction={analyzeCommunicationAction}
          initialSummary={initialSummary}
          aiRecommendations={aiRecommendations}
        />

        <Card>
          <CardHeader>
            <CardTitle>Connected Providers</CardTitle>
            <CardDescription>Least-privilege read access for Gmail mailboxes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {toast === "provider-connected" && (
              <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Gmail account connected successfully.
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {error === "oauth_provider_error" && "OAuth provider returned an error during authorization."}
                {error === "missing_oauth_code" && "OAuth callback is missing authorization code/state."}
                {error === "oauth_callback_failed" && "OAuth callback failed. Try reconnecting Gmail."}
                {error === "oauth_state_expired" && "OAuth session expired. Retry and finish Google consent within 10 minutes."}
                {error === "oauth_state_invalid" && "OAuth state validation failed (possible stale tab or invalid signature)."}
                {error === "oauth_provider_mismatch" && "OAuth provider mismatch in callback state."}
                {error === "oauth_redirect_uri_mismatch" && "Google OAuth redirect URI mismatch. Check Google Console redirect URL."}
                {error === "oauth_invalid_grant" && "Authorization code is invalid or already used. Retry Gmail connect."}
                {error === "oauth_missing_access_token" && "Token response did not include access token."}
                {error === "oauth_token_exchange_failed" && "Token exchange with provider failed."}
                {error === "oauth_profile_fetch_failed" && "Connected, but failed to fetch Gmail profile."}
                {error === "provider_disabled" &&
                  (provider === "outlook"
                    ? "Outlook OAuth is currently deferred. Gmail is the only supported provider right now."
                    : "This provider is currently disabled.")}
                {![
                  "oauth_provider_error",
                  "missing_oauth_code",
                  "oauth_callback_failed",
                  "oauth_state_expired",
                  "oauth_state_invalid",
                  "oauth_provider_mismatch",
                  "oauth_redirect_uri_mismatch",
                  "oauth_invalid_grant",
                  "oauth_missing_access_token",
                  "oauth_token_exchange_failed",
                  "oauth_profile_fetch_failed",
                  "provider_disabled"
                ].includes(error) && "Unknown error. Check server logs for details."}
              </div>
            )}

            {connections.length === 0 && (
              <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">
                No providers connected yet.
              </p>
            )}

            {connections.map((connection) => (
              <div key={connection.id} className="rounded-lg border border-zinc-200 p-3">
                <p className="text-sm font-medium text-zinc-900">{connection.provider}</p>
                <p className="text-xs text-zinc-500">{connection.emailAddress || "No mailbox detected"}</p>
                <p className="text-xs text-zinc-400">Status: {connection.status}</p>
                <form action={disconnectConnectionAction} className="mt-2">
                  <input type="hidden" name="provider" value={connection.provider.toLowerCase()} />
                  <input type="hidden" name="connectionId" value={connection.id} />
                  <Button type="submit" variant="outline" size="sm">
                    Disconnect
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
