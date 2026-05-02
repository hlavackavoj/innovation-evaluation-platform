import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { canAccessAllProjects, requireCurrentUser } from "@/lib/authorization";
import { formatDate } from "@/lib/format";

function isMissingTaskContactIdColumn(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: unknown; meta?: { column?: unknown } };
  return maybe.code === "P2022" && maybe.meta?.column === "Task.contactId";
}

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const user = await requireCurrentUser();

  const task = await (async () => {
    try {
      return await prisma.task.findFirst({
        where: {
          id: params.id,
          project: canAccessAllProjects(user) ? {} : { ownerUserId: user.id }
        },
        include: {
          project: true,
          contact: true
        }
      });
    } catch (error) {
      if (!isMissingTaskContactIdColumn(error)) {
        throw error;
      }

      const rows = await prisma.$queryRawUnsafe<Array<{
        id: string;
        title: string;
        description: string | null;
        status: string;
        priority: string;
        dueDate: Date | null;
        suggestionStatus: string;
        projectId: string;
        projectTitle: string;
      }>>(
        `SELECT t."id", t."title", t."description", t."status", t."priority", t."dueDate", 'ACCEPTED' as "suggestionStatus", p."id" as "projectId", p."title" as "projectTitle"
         FROM "Task" t JOIN "Project" p ON p."id" = t."projectId"
         WHERE t."id" = ${JSON.stringify(params.id)} ${canAccessAllProjects(user) ? "" : `AND p."ownerUserId" = ${JSON.stringify(user.id)}`}
         LIMIT 1`
      );

      const row = rows[0];
      if (!row) return null;
      return {
        ...row,
        project: { id: row.projectId, title: row.projectTitle },
        contact: null
      } as never;
    }
  })();

  if (!task) notFound();

  return (
    <Shell title={task.title} description="Task detail">
      <Card>
        <CardHeader>
          <CardTitle>Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-700">
          <p><strong>Status:</strong> {task.status}</p>
          <p><strong>Suggestion:</strong> {task.suggestionStatus}</p>
          <p><strong>Priority:</strong> {task.priority}</p>
          <p><strong>Project:</strong> <Link href={`/projects/${task.project.id}`} className="text-indigo-600 hover:text-indigo-700">{task.project.title}</Link></p>
          <p><strong>Contact:</strong> {task.contact ? <Link href={`/contacts/${task.contact.id}`} className="text-indigo-600 hover:text-indigo-700">{task.contact.name}</Link> : "-"}</p>
          <p><strong>Due date:</strong> {formatDate(task.dueDate)}</p>
          <p><strong>Description:</strong> {task.description ?? "-"}</p>
        </CardContent>
      </Card>
    </Shell>
  );
}
