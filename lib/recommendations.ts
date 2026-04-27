import { BusinessReadiness, ProjectStage } from "@prisma/client";

export type Recommendation = {
  id: string;
  title: string;
  description: string;
  priority: "medium" | "high";
  suggestedRoles: string[];
};

type RecommendationInput = {
  stage: ProjectStage;
  ipStatus: string | null;
  businessReadiness: BusinessReadiness | null;
};

export function getProjectRecommendations(project: RecommendationInput): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (project.stage === ProjectStage.VALIDATION) {
    recommendations.push({
      id: "validation-evidence",
      title: "Run structured validation interviews",
      description:
        "The project is in Validation, so the immediate focus should be evidence: customer interviews, problem confirmation, and early adoption signals.",
      priority: "medium",
      suggestedRoles: ["Evaluator", "Startup mentor"]
    });
  }

  if (project.stage === ProjectStage.MVP) {
    recommendations.push({
      id: "mvp-design",
      title: "Define MVP pilot scope",
      description:
        "Move the team toward an MVP package with a clear pilot use case, success metrics, and responsibilities across the university support team.",
      priority: "medium",
      suggestedRoles: ["Product lead", "Innovation manager"]
    });
  }

  if (!project.ipStatus || !project.ipStatus.trim()) {
    recommendations.push({
      id: "ip-status-missing",
      title: "Clarify IP position",
      description:
        "IP status is still unclear. Confirm ownership, protection options, and the right internal path with the IP office before the project advances.",
      priority: "high",
      suggestedRoles: ["IP lawyer", "Technology transfer officer"]
    });
  }

  if (project.businessReadiness === BusinessReadiness.WEAK) {
    recommendations.push({
      id: "business-capability-weak",
      title: "Strengthen business capability",
      description:
        "The team still needs stronger business capability before the project can move confidently through the venture-building process.",
      priority: "medium",
      suggestedRoles: ["Business mentor", "External entrepreneur"]
    });
  }

  return recommendations;
}
