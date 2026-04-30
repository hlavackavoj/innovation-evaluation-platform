import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { canAccessAllProjects, requireCurrentUser } from "@/lib/authorization";
import { formatDate } from "@/lib/format";

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const user = await requireCurrentUser();

  const task = await prisma.task.findFirst({
    where: {
      id: params.id,
      project: canAccessAllProjects(user) ? {} : { ownerUserId: user.id }
    },
    include: {
      project: true,
      contact: true
    }
  });

  if (!task) notFound();

  return (
    <Shell title={task.title} description="Task detail">
      <Card>
        <CardHeader>
          <CardTitle>Task</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-700">
          <p><strong>Status:</strong> {task.status}</p>
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
