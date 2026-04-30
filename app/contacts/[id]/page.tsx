import { notFound } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { buildAccessibleProjectWhere, canAccessAllProjects, requireCurrentUser } from "@/lib/authorization";

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const user = await requireCurrentUser();

  const contact = await prisma.contact.findFirst({
    where: {
      id: params.id,
      ...(canAccessAllProjects(user)
        ? {}
        : {
            projectLinks: {
              some: {
                project: buildAccessibleProjectWhere(user)
              }
            }
          })
    },
    include: {
      organization: true,
      projectLinks: {
        include: {
          project: true
        }
      }
    }
  });

  if (!contact) notFound();

  return (
    <Shell title={contact.name} description="Contact detail">
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-700">
          <p><strong>Email:</strong> {contact.email ?? "-"}</p>
          <p><strong>Role:</strong> {contact.role}</p>
          <p><strong>Organization:</strong> {contact.organization ? <Link href={`/organizations/${contact.organization.id}`} className="text-indigo-600 hover:text-indigo-700">{contact.organization.name}</Link> : "-"}</p>
          <p><strong>Projects:</strong> {contact.projectLinks.length > 0 ? contact.projectLinks.map((link) => link.project.title).join(", ") : "-"}</p>
        </CardContent>
      </Card>
    </Shell>
  );
}
