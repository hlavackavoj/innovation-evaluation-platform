import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Shell } from "@/components/shell";
import { StatusBadge } from "@/components/status-badge";
import { getDashboardData } from "@/lib/data";

export default async function DashboardPage() {
  const { stats, recentProjects } = await getDashboardData();

  return (
    <Shell
      title="Dashboard"
      description="A concise university CRM view of pipeline activity, validation load, and high-potential opportunities."
      actions={<Link href="/projects/new" className={buttonVariants({})}>Create project</Link>}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-3">
              <Badge className={stat.accent}>{stat.label}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight text-ink">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Latest portfolio activity with a quick signal on pipeline stage and the first linked contact.</CardDescription>
            </div>
            <Link href="/projects" className={buttonVariants({ variant: "outline", size: "sm" })}>
              View all projects
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Current stage</TableHead>
                  <TableHead>Primary contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentProjects.map((project) => {
                  const primaryContact = project.contacts[0]?.contact;

                  return (
                    <TableRow key={project.id} className="bg-white">
                      <TableCell>
                        <Link href={`/projects/${project.id}`} className="font-semibold text-ink hover:text-tealCore">
                          {project.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={project.stage} />
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {primaryContact ? `${primaryContact.name} (${primaryContact.role})` : "No linked contact"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </Shell>
  );
}
