import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { getProjects } from "@/lib/data";
import { formatDate, formatEnumLabel } from "@/lib/format";

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <Shell
      title="Projects"
      description="Every project in the pipeline with owners, stage, and next-step visibility."
      actions={
        <Link href="/projects/new" className={buttonVariants({})}>
          New project
        </Link>
      }
    >
      {projects.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Potential</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Next step due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium text-zinc-900 hover:text-indigo-600 transition-colors"
                    >
                      {project.title}
                    </Link>
                    <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-zinc-400">{project.description}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={project.stage} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={project.priority} />
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">{formatEnumLabel(project.potentialLevel)}</TableCell>
                  <TableCell className="text-sm text-zinc-500">{project.owner?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-zinc-500">{formatDate(project.nextStepDueDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-white py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <FolderKanban size={20} className="text-zinc-400" />
          </div>
          <p className="mt-4 text-sm font-semibold text-zinc-700">No projects yet</p>
          <p className="mt-1 text-sm text-zinc-500">Create your first project to start tracking your pipeline.</p>
          <Link href="/projects/new" className={buttonVariants({ className: "mt-6" })}>
            Create project
          </Link>
        </div>
      )}
    </Shell>
  );
}
