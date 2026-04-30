import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { canAccessAllProjects, requireCurrentUser } from "@/lib/authorization";

export default async function OrganizationDetailPage({ params }: { params: { id: string } }) {
  const user = await requireCurrentUser();

  const organization = await prisma.organization.findFirst({
    where: {
      id: params.id,
      ...(canAccessAllProjects(user) ? {} : { projects: { some: { ownerUserId: user.id } } })
    },
    include: {
      contacts: true,
      projects: true
    }
  });

  if (!organization) notFound();

  return (
    <Shell title={organization.name} description="Organization detail">
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-700">
          <p><strong>Type:</strong> {organization.type}</p>
          <p><strong>Website/domain:</strong> {organization.website ?? "-"}</p>
          <p><strong>Contacts:</strong> {organization.contacts.length}</p>
          <p><strong>Projects:</strong> {organization.projects.length > 0 ? organization.projects.map((project) => (
            <span key={project.id} className="mr-2 inline-block"><Link href={`/projects/${project.id}`} className="text-indigo-600 hover:text-indigo-700">{project.title}</Link></span>
          )) : "-"}</p>
        </CardContent>
      </Card>
    </Shell>
  );
}
