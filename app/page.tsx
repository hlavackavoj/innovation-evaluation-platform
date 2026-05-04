import Link from "next/link";
import { redirect } from "next/navigation";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { AlertTriangle, FolderKanban, ClipboardList, ArrowRight, Activity, Target, BookOpen, Zap, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardData } from "@/lib/data";
import { formatDate, formatEnumLabel } from "@/lib/format";
import { parseAnalysisMetadata } from "@/lib/email/analysis-metadata";
import { assignActivityToProjectAction } from "@/app/email-analyzer/actions";
import { parseVault } from "@/lib/obsidian/parser";

const statIcons: Record<string, LucideIcon> = {
  "Výzkumné projekty": FolderKanban,
  "Čekající milníky": ClipboardList
};

const statColors: Record<string, { bg: string; icon: string }> = {
  "Výzkumné projekty": { bg: "bg-indigo-50", icon: "text-indigo-600" },
  "Čekající milníky": { bg: "bg-rose-50", icon: "text-rose-600" }
};

export default async function DashboardPage({
  searchParams
}: {
  searchParams?: { pending_approval?: string };
}) {
  const { isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    redirect("/login?callbackUrl=/");
  }

  const { stats, projectsByStage, recentActivities, assignableProjects, urgentTasks } = await getDashboardData();
  const vault = parseVault();

  const showPendingApproval = searchParams?.pending_approval === "1";

  return (
    <Shell
      title="Dashboard"
      description="Přehled inovačního portfolia, čekající milníky a poslední komunikace s výzkumnými partnery."
      actions={
        <Link href="/projects/new" className={buttonVariants({})}>
          New project
        </Link>
      }
    >
      {showPendingApproval ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Čekejte na schválení přístupu
        </div>
      ) : null}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map((stat) => {
          const Icon = statIcons[stat.label] ?? FolderKanban;
          const colors = statColors[stat.label] ?? { bg: "bg-zinc-50", icon: "text-zinc-500" };
          return (
            <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{stat.label}</span>
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors.bg}`}>
                  <Icon size={15} className={colors.icon} />
                </div>
              </div>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Urgentní milníky */}
      {urgentTasks.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 shadow-sm">
          <div className="border-b border-amber-100 p-5">
            <p className="text-sm font-semibold text-zinc-900">Výzkumné milníky — Čekající akce</p>
            <p className="mt-0.5 text-xs text-zinc-500">Úkoly s vysokou prioritou vyžadující pozornost.</p>
          </div>
          <div className="divide-y divide-amber-100">
            {urgentTasks.map((task) => {
              const isUrgent = task.priority === "URGENT";
              return (
                <div key={task.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isUrgent ? "bg-rose-100" : "bg-amber-100"}`}>
                    {isUrgent
                      ? <AlertTriangle size={11} className="text-rose-600" />
                      : <Target size={11} className="text-amber-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="text-sm font-medium text-zinc-900 hover:text-indigo-600"
                      >
                        {task.title}
                      </Link>
                      {task.dueDate && (
                        <time className="shrink-0 text-xs text-zinc-400">{formatDate(task.dueDate)}</time>
                      )}
                    </div>
                    {task.project && (
                      <p className="mt-0.5 text-xs text-zinc-500">
                        <Link href={`/projects/${task.project.id}`} className="font-medium text-indigo-600 hover:text-indigo-700">
                          {task.project.title}
                        </Link>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
        {/* Fáze výzkumného portfolia */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-5">
            <p className="text-sm font-semibold text-zinc-900">Fáze výzkumného portfolia</p>
            <p className="mt-0.5 text-xs text-zinc-500">Rozložení projektů v inovačním portfoliu.</p>
          </div>
          <div className="divide-y divide-zinc-100">
            {projectsByStage.map((item) => (
              <div key={item.stage} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <StatusBadge value={item.stage} />
                    <span className="text-xs text-zinc-500">{item.count} projects</span>
                  </div>
                  <span className="text-xs font-medium text-zinc-600">{item.share}%</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-1 rounded-full bg-indigo-500 transition-all duration-500"
                    style={{ width: `${item.share}%` }}
                  />
                </div>
              </div>
            ))}
            {projectsByStage.every((s) => s.count === 0) && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                  <FolderKanban size={18} className="text-zinc-400" />
                </div>
                <p className="mt-3 text-sm font-medium text-zinc-600">Žádné projekty</p>
                <p className="mt-1 text-xs text-zinc-400">Vytvořte první projekt pro zobrazení portfolia.</p>
                <Link href="/projects/new" className={buttonVariants({ size: "sm", className: "mt-4" })}>
                  Create project
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Poslední komunikace */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 p-5">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Poslední komunikace</p>
              <p className="mt-0.5 text-xs text-zinc-500">Poslední aktivita v projektech.</p>
            </div>
            <Link
              href="/projects"
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              All projects <ArrowRight size={12} />
            </Link>
          </div>

          {recentActivities.length > 0 ? (
            <div className="divide-y divide-zinc-100">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                      <Activity size={11} className="text-indigo-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-zinc-900">{formatEnumLabel(activity.type)}</p>
                        <time className="shrink-0 text-xs text-zinc-400">{formatDate(activity.activityDate)}</time>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {activity.project ? (
                          <Link
                            href={`/projects/${activity.project.id}`}
                            className="font-medium text-indigo-600 hover:text-indigo-700"
                          >
                            {activity.project.title}
                          </Link>
                        ) : (
                          <span className="text-zinc-400">Unlinked</span>
                        )}
                        {" · "}
                        {activity.user?.name ?? "System"}
                      </p>
                      {(() => {
                        const metadata = parseAnalysisMetadata(activity.analysisMetadata);
                        if (!metadata) return null;
                        return (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                              Sentiment {metadata.sentimentScore === null ? "Nezjištěno" : `${metadata.sentimentScore}/10`}
                            </span>
                            <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                              Urgent {metadata.isUrgent ? "yes" : "no"}
                            </span>
                            {metadata.suggestedProjectStage && (
                              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                                {metadata.suggestedProjectStage}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      {!activity.project && activity.type === "EMAIL" && (
                        <form action={assignActivityToProjectAction} className="mt-2 flex items-center gap-2">
                          <input type="hidden" name="activityId" value={activity.id} />
                          <select
                            name="projectId"
                            defaultValue=""
                            className="h-8 min-w-[170px] rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-700"
                            required
                          >
                            <option value="" disabled>
                              Přiřadit k projektu
                            </option>
                            {assignableProjects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.title}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="h-8 rounded-md border border-zinc-200 px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                          >
                            Uložit
                          </button>
                        </form>
                      )}
                      {activity.note && (
                        <p className="mt-1.5 line-clamp-2 text-xs text-zinc-500">{activity.note}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                <Activity size={18} className="text-zinc-400" />
              </div>
              <p className="mt-3 text-sm font-medium text-zinc-600">Zatím žádná komunikace</p>
              <p className="mt-1 text-xs text-zinc-400">Aktivita se zobrazí po přiřazení komunikace k projektům.</p>
            </div>
          )}
        </div>
      </div>

      {/* Vault Insights — Znalostní báze */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4 bg-gradient-to-r from-zinc-900 to-zinc-950">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-900/50 border border-indigo-800/40">
              <BookOpen size={13} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Znalostní báze</p>
              <p className="text-[11px] font-mono text-zinc-600">docs/obsidian/ · {vault.stats.totalNotes} poznámek · {vault.stats.totalLinks} odkazů</p>
            </div>
          </div>
          <Link
            href="/knowledge"
            className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Celá mapa <ArrowRight size={12} />
          </Link>
        </div>

        <div className="grid divide-y divide-zinc-800/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          {/* Immediate actions */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Zap size={11} className="text-indigo-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Immediate next steps</span>
            </div>
            {vault.immediateActions.length > 0 ? (
              <ol className="space-y-1.5">
                {vault.immediateActions.slice(0, 3).map((action, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-zinc-800 text-[9px] font-bold text-zinc-500">
                      {i + 1}
                    </span>
                    <span className="text-xs text-zinc-300 leading-snug">{action}</span>
                  </li>
                ))}
                {vault.immediateActions.length > 3 && (
                  <li className="text-[11px] text-zinc-600 pl-6">
                    + {vault.immediateActions.length - 3} dalších
                  </li>
                )}
              </ol>
            ) : (
              <p className="text-xs text-zinc-600">Žádné immediate akce nalezeny.</p>
            )}
          </div>

          {/* Open questions + tech debt counts */}
          <div className="px-5 py-4">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Stav dokumentace</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Open questions</span>
                <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-xs text-rose-400">
                  {vault.stats.totalOpenQuestions}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Technical debt</span>
                <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-xs text-amber-400">
                  {vault.stats.totalTechDebt}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Next step sekce</span>
                <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-xs text-emerald-400">
                  {vault.nextSteps.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Calendar candidates</span>
                <span className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-xs text-indigo-400">
                  {vault.stats.totalNotes > 0 ? vault.calendarCandidates.length : 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
