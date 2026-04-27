import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/project-form";
import { Shell } from "@/components/shell";
import { updateProjectAction } from "@/app/projects/actions";
import { getProjectById, getProjectFormData } from "@/lib/data";

export default async function EditProjectPage({ params }: { params: { id: string } }) {
  const [project, formData] = await Promise.all([getProjectById(params.id), getProjectFormData()]);

  if (!project) {
    notFound();
  }

  const action = updateProjectAction.bind(null, project.id);

  return (
    <Shell title={`Edit ${project.title}`} description="Update the project record while keeping business rules and recommendation logic outside the form layer.">
      <ProjectForm action={action} project={project} organizations={formData.organizations} users={formData.users} submitLabel="Save changes" />
    </Shell>
  );
}
