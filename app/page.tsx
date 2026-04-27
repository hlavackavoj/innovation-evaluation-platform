import Link from "next/link";
import { FolderKanban, ClipboardList, ArrowRight, Activity, type LucideIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardData } from "@/lib/data";
import { formatDate, formatEnumLabel } from "@/lib/format";

const statIcons: Record<string, LucideIcon> = {
  "Total Projects": FolderKanban,
  "Pending Tasks": ClipboardList
};

const statColors: Record<string, { bg: string; icon: string }> = {
  "Total Projects": { bg: "bg-indigo-50", icon: "text-indigo-600" },
  "Pending Tasks": { bg: "bg-rose-50", icon: "text-rose-600" }
};

export default async function DashboardPage() {
  const { stats, projectsByStage, recentActivities } = await getDashboardData();

  return (
    <Shell
      title="Dashboard"
      description="Portfolio flow, pending follow-up, and the latest activity across your innovation pipeline."
      actions={
        <Link href="/projects/new" className={buttonVariants({})}>
          New project
        </Link>
      }
    >
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

      <div className="grid gap-5 xl:grid-cols-[1.1fr,0.9fr]">
        {/* Pipeline distribution */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-5">
            <p className="text-sm font-semibold text-zinc-900">Projects by Stage</p>
            <p className="mt-0.5 text-xs text-zinc-500">Portfolio distribution across the innovation pipeline.</p>
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
                <p className="mt-3 text-sm font-medium text-zinc-600">No projects yet</p>
                <p className="mt-1 text-xs text-zinc-400">Create your first project to see pipeline data.</p>
                <Link href="/projects/new" className={buttonVariants({ size: "sm", className: "mt-4" })}>
                  Create project
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 p-5">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Recent Activity</p>
              <p className="mt-0.5 text-xs text-zinc-500">Latest project touchpoints.</p>
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
                        <Link
                          href={`/projects/${activity.project.id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          {activity.project.title}
                        </Link>
                        {" · "}
                        {activity.user?.name ?? "System"}
                      </p>
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
              <p className="mt-3 text-sm font-medium text-zinc-600">No activity yet</p>
              <p className="mt-1 text-xs text-zinc-400">Activity will appear here as your projects progress.</p>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
