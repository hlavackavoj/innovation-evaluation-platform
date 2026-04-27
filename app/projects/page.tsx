import Link from "next/link";
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
      description="Every project in the university or innovation-center pipeline, with owners, stage, and next-step visibility."
      actions={<Link href="/projects/new" className={buttonVariants({})}>New project</Link>}
    >
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-card">
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
              <TableRow key={project.id} className="bg-white">
                <TableCell>
                  <Link href={`/projects/${project.id}`} className="font-semibold text-ink hover:text-tealCore">
                    {project.title}
                  </Link>
                  <p className="mt-1 max-w-md text-slate-600">{project.description}</p>
                </TableCell>
                <TableCell>
                  <StatusBadge value={project.stage} />
                </TableCell>
                <TableCell>
                  <StatusBadge value={project.priority} />
                </TableCell>
                <TableCell className="text-slate-600">{formatEnumLabel(project.potentialLevel)}</TableCell>
                <TableCell className="text-slate-600">{project.owner?.name ?? "Unassigned"}</TableCell>
                <TableCell className="text-slate-600">{formatDate(project.nextStepDueDate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Shell>
  );
}
