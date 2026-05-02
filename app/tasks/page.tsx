import Link from "next/link";
import { CheckSquare, Plus } from "lucide-react";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { getTasks } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { acceptSuggestedTaskAction, createTaskAction, rejectSuggestedTaskAction, updateSuggestedTaskAction } from "@/app/tasks/actions";

export default async function TasksPage() {
  const [tasks, projects, contacts] = await Promise.all([
    getTasks(),
    prisma.project.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.contact.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <Shell
      title="Čekající milníky"
      description="Operativní follow-up across all research projects — who owns what and when it should happen."
    >
      {/* Create Task */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Plus size={14} />
          </div>
          <p className="text-sm font-semibold text-zinc-900">Nový úkol</p>
        </div>
        <form action={createTaskAction} className="grid gap-2 sm:grid-cols-2">
          <input
            name="title"
            required
            placeholder="Název úkolu *"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:col-span-2"
          />
          <select
            name="projectId"
            required
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
          >
            <option value="">Vybrat projekt *</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <select name="priority" className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700">
            <option value="MEDIUM">Priorita: Střední</option>
            <option value="LOW">Priorita: Nízká</option>
            <option value="HIGH">Priorita: Vysoká</option>
            <option value="URGENT">Priorita: Urgentní</option>
          </select>
          <input
            name="dueDate"
            type="date"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
          />
          <input
            name="description"
            placeholder="Popis (volitelné)"
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 sm:col-span-2"
          >
            Vytvořit úkol
          </button>
        </form>
      </div>

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
                  {task.contact && (
                    <p className="mt-1 text-xs text-zinc-400">
                      Contact{" "}
                      <Link href={`/contacts/${task.contact.id}`} className="font-medium text-indigo-600 hover:text-indigo-700">
                        {task.contact.name}
                      </Link>
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <StatusBadge value={task.priority} />
                  <StatusBadge value={task.status} />
                  <StatusBadge value={task.suggestionStatus} />
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                Due {formatDate(task.dueDate)} · Assigned to {task.assignedTo?.name ?? "Unassigned"}
              </p>
              {task.suggestionStatus === "SUGGESTED" && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-amber-900">Suggested task review</p>
                  <form action={updateSuggestedTaskAction} className="grid gap-2 sm:grid-cols-2">
                    <input type="hidden" name="taskId" value={task.id} />
                    <input name="title" defaultValue={task.title} className="rounded border border-zinc-200 p-2 text-sm" />
                    <select name="priority" defaultValue={task.priority} className="rounded border border-zinc-200 p-2 text-sm">
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                    <input name="dueDate" type="date" defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""} className="rounded border border-zinc-200 p-2 text-sm" />
                    <select name="projectId" defaultValue={task.project.id} className="rounded border border-zinc-200 p-2 text-sm">
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.title}</option>
                      ))}
                    </select>
                    <select name="contactId" defaultValue={task.contactId ?? ""} className="rounded border border-zinc-200 p-2 text-sm">
                      <option value="">No contact</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>{contact.name}</option>
                      ))}
                    </select>
                    <input name="description" defaultValue={task.description ?? ""} placeholder="Description" className="rounded border border-zinc-200 p-2 text-sm sm:col-span-2" />
                    <button type="submit" className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white">Save draft</button>
                  </form>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <form action={acceptSuggestedTaskAction} className="flex gap-2">
                      <input type="hidden" name="taskId" value={task.id} />
                      <select name="projectId" defaultValue={task.project.id} className="w-full rounded border border-zinc-200 p-2 text-sm">
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>{project.title}</option>
                        ))}
                      </select>
                      <button type="submit" className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white">Accept</button>
                    </form>
                    <form action={acceptSuggestedTaskAction} className="flex gap-2">
                      <input type="hidden" name="taskId" value={task.id} />
                      <input name="newProjectTitle" placeholder="Or create new project" className="w-full rounded border border-zinc-200 p-2 text-sm" />
                      <button type="submit" className="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white">Create + Accept</button>
                    </form>
                  </div>
                  <form action={rejectSuggestedTaskAction} className="mt-2">
                    <input type="hidden" name="taskId" value={task.id} />
                    <button type="submit" className="rounded border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700">
                      Reject
                    </button>
                  </form>
                </div>
              )}
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
