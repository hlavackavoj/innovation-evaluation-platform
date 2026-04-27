import {
  BusinessReadiness,
  ProjectPotentialLevel,
  ProjectPriority,
  ProjectStage,
  TeamStrength
} from "@prisma/client";

type ProjectMutationInput = {
  title: string;
  description: string;
  field: string | null;
  stage: ProjectStage;
  priority: ProjectPriority;
  potentialLevel: ProjectPotentialLevel;
  ipStatus: string | null;
  teamStrength: TeamStrength | null;
  businessReadiness: BusinessReadiness | null;
  nextStep: string | null;
  nextStepDueDate: Date | null;
  organizationId: string | null;
  ownerUserId: string | null;
  lastContactAt: Date | null;
};

function parseOptionalString(value: FormDataEntryValue | null) {
  const parsed = value?.toString().trim();
  return parsed ? parsed : null;
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  const parsed = parseOptionalString(value);
  return parsed ? new Date(parsed) : null;
}

export function parseProjectFormData(formData: FormData): ProjectMutationInput {
  const title = formData.get("title")?.toString().trim();
  const description = formData.get("description")?.toString().trim();

  if (!title || !description) {
    throw new Error("Project title and description are required.");
  }

  return {
    title,
    description,
    field: parseOptionalString(formData.get("field")),
    stage: formData.get("stage") as ProjectStage,
    priority: formData.get("priority") as ProjectPriority,
    potentialLevel: formData.get("potentialLevel") as ProjectPotentialLevel,
    ipStatus: parseOptionalString(formData.get("ipStatus")),
    teamStrength: (parseOptionalString(formData.get("teamStrength")) as TeamStrength | null) ?? null,
    businessReadiness:
      (parseOptionalString(formData.get("businessReadiness")) as BusinessReadiness | null) ?? null,
    nextStep: parseOptionalString(formData.get("nextStep")),
    nextStepDueDate: parseOptionalDate(formData.get("nextStepDueDate")),
    organizationId: parseOptionalString(formData.get("organizationId")),
    ownerUserId: parseOptionalString(formData.get("ownerUserId")),
    lastContactAt: parseOptionalDate(formData.get("lastContactAt"))
  };
}
