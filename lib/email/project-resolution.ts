export type ProjectResolutionInput = {
  explicitProjectId?: string | null;
  contactProjectIds?: string[];
  organizationProjectId?: string | null;
  userOwnedProjectId?: string | null;
};

export type ProjectResolutionResult = {
  projectId: string | null;
  resolution: "explicit" | "contact" | "organization" | "user_owned" | "unassigned";
};

export function resolveProjectAssignment(input: ProjectResolutionInput): ProjectResolutionResult {
  if (input.explicitProjectId) {
    return { projectId: input.explicitProjectId, resolution: "explicit" };
  }

  if (input.contactProjectIds && input.contactProjectIds.length > 0) {
    return { projectId: input.contactProjectIds[0], resolution: "contact" };
  }

  if (input.organizationProjectId) {
    return { projectId: input.organizationProjectId, resolution: "organization" };
  }

  if (input.userOwnedProjectId) {
    return { projectId: input.userOwnedProjectId, resolution: "user_owned" };
  }

  return { projectId: null, resolution: "unassigned" };
}
