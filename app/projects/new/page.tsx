import { ProjectForm } from "@/components/project-form";
import { Shell } from "@/components/shell";
import { getProjectFormData } from "@/lib/data";
import { createProjectAction } from "@/app/projects/actions";

export default async function NewProjectPage() {
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
