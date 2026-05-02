import { ProjectForm } from "@/components/project-form";
import { PermissionDenied } from "@/components/permission-denied";
import { Shell } from "@/components/shell";
import { getProjectFormData } from "@/lib/data";
import { createProjectAction } from "@/app/projects/actions";
import { checkCrmPermission } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/authorization";
import { redirect } from "next/navigation";

export default async function NewProjectPage() {
  const user = await requireCurrentUser().catch(() => null);
  if (!user) {
    redirect("/api/auth/login");
  }

  const permission = await checkCrmPermission("crm:modify");
  if (!permission.allowed) {
    return (
      <Shell
        title="Create Project"
        description="Only users with CRM write access can create new projects."
      >
        <PermissionDenied title="You cannot create projects" description="Your account currently has read-only CRM access." />
      </Shell>
    );
  }

  const { organizations, users } = await getProjectFormData();

  return (
    <Shell
      title="Create Project"
      description="Add a new research, startup, or spin-off candidate to the CRM with enough structure for pipeline and recommendation workflows."
    >
      <ProjectForm action={createProjectAction} organizations={organizations} users={users} submitLabel="Create project" />
    </Shell>
  );
}
