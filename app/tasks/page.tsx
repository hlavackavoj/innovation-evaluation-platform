import Link from "next/link";
import { CheckSquare } from "lucide-react";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { getTasks } from "@/lib/data";
import { formatDate } from "@/lib/format";

export default async function TasksPage() {
  const tasks = await getTasks();

  return (
    <Shell
      title="Tasks"
      description="Operational follow-up across all projects — who owns what and when it should happen."
    >
      {tasks.length > 0 ? (
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-card"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{task.title}</p>
                  {task.description && (
                    <p className="mt-1 text-sm text-zinc-500">{task.description}</p>
                  )}
                  <p className="mt-2 text-xs text-zinc-400">
                    Project{" "}
                    <Link href={`/projects/${task.project.id}`} className="font-medium text-indigo-600 hover:text-indigo-700">
                      {task.project.title}
                    </Link>
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <StatusBadge value={task.priority} />
                  <StatusBadge value={task.status} />
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                Due {formatDate(task.dueDate)} · Assigned to {task.assignedTo?.name ?? "Unassigned"}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <CheckSquare size={20} className="text-zinc-400" />
          </div>
          <p className="mt-4 text-sm font-semibold text-zinc-700">No tasks yet</p>
          <p className="mt-1 text-sm text-zinc-500">Convert recommendations to tasks from a project page.</p>
        </div>
      )}
    </Shell>
  );
}
