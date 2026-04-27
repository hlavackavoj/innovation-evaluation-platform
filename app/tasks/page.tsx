import Link from "next/link";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { getTasks } from "@/lib/data";
import { formatDate } from "@/lib/format";

export default async function TasksPage() {
  const tasks = await getTasks();

  return (
    <Shell
      title="Tasks"
      description="The operational follow-up list across projects, surfacing who owns what and when it should happen."
    >
      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-lg font-semibold text-ink">{task.title}</p>
                <p className="mt-2 text-sm text-slate-600">{task.description ?? "No task description"}</p>
                <p className="mt-4 text-sm text-slate-500">
                  Project{" "}
                  <Link href={`/projects/${task.project.id}`} className="font-medium text-tealCore">
                    {task.project.title}
                  </Link>
                </p>
              </div>
              <div className="flex gap-2">
                <StatusBadge value={task.priority} />
                <StatusBadge value={task.status} />
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Due {formatDate(task.dueDate)} · Assigned to {task.assignedTo?.name ?? "Unassigned"}
            </p>
          </div>
        ))}
      </div>
    </Shell>
  );
}
