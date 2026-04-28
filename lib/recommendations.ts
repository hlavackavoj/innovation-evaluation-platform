import {
  BusinessReadiness,
  PipelineStage,
  ProjectPotentialLevel,
  RecommendationStatus,
  Template,
  TeamStrength
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSignedFileUrl } from "@/lib/supabase-storage";

export type RecommendationDefinition = {
  ruleKey: string;
  title: string;
  description: string;
  suggestedRole: string;
};

export type TemplateLink = Pick<Template, "id" | "name" | "description" | "storagePath" | "targetStage"> & {
  fileUrl: string;
};

export type RecommendationWithTemplates<TRecommendation> = TRecommendation & {
  primaryTemplate: TemplateLink | null;
  templates: TemplateLink[];
};

type RecommendationInput = {
  stage: PipelineStage;
  ipStatus: string | null;
  businessReadiness: BusinessReadiness | null;
  teamStrength: TeamStrength | null;
  nextStep: string | null;
  lastContactAt: Date | null;
  potentialLevel: ProjectPotentialLevel;
};

const stageRecommendations: Record<PipelineStage, RecommendationDefinition[]> = {
  DISCOVERY: [
    {
      ruleKey: "stage:discovery:market-size",
      title: "Perform market size analysis",
      description:
        "Estimate the addressable market, segment size, and urgency of the problem so the innovation center can judge whether the opportunity merits deeper support.",
      suggestedRole: "Industry expert"
    },
    {
      ruleKey: "stage:discovery:target-audience",
      title: "Identify primary target audience",
      description:
        "Define the first customer segment, its unmet need, and the initial decision-maker profile before the project advances to validation.",
      suggestedRole: "Startup mentor"
    }
  ],
  VALIDATION: [
    {
      ruleKey: "stage:validation:interviews",
      title: "Conduct 10 stakeholder interviews",
      description:
        "Run a structured set of interviews with potential users, buyers, or institutional partners to confirm the problem, urgency, and expected workflow fit.",
      suggestedRole: "Startup mentor"
    },
    {
      ruleKey: "stage:validation:mvp-scope",
      title: "Draft MVP feature list",
      description:
        "Convert the strongest evidence into a lean MVP scope that the team can test quickly with a realistic pilot or proof-of-value plan.",
      suggestedRole: "Evaluator"
    }
  ],
  MVP: [
    {
      ruleKey: "stage:mvp:analytics",
      title: "Set up analytics tracking",
      description:
        "Define how adoption, usage, and drop-off will be measured so the first pilot generates evidence instead of only anecdotal feedback.",
      suggestedRole: "Technical lead"
    },
    {
      ruleKey: "stage:mvp:success-metrics",
      title: "Define success metrics for pilot",
      description:
        "Agree on measurable pilot outcomes, owners, and review cadence before the MVP is exposed to external users or institutional partners.",
      suggestedRole: "Product lead"
    }
  ],
  SCALING: [
    {
      ruleKey: "stage:scaling:business-development",
      title: "Build partnership pipeline",
      description:
        "Create a prioritized list of commercial, clinical, or institutional partners to support distribution, pilots, and repeatable growth.",
      suggestedRole: "Business Developer"
    },
    {
      ruleKey: "stage:scaling:investor-readiness",
      title: "Prepare investor readiness materials",
      description:
        "Package traction, milestones, and the support narrative into materials suitable for investors, grant panels, or strategic partners.",
      suggestedRole: "Investor"
    }
  ],
  SPIN_OFF: [
    {
      ruleKey: "stage:spin-off:company-roadmap",
      title: "Formalize spin-off roadmap",
      description:
        "Plan the legal, ownership, and operational milestones required to move from supported project to formal spin-off entity.",
      suggestedRole: "Technology transfer officer"
    },
    {
      ruleKey: "stage:spin-off:ip-transfer",
      title: "Confirm legal and IP transfer plan",
      description:
        "Resolve IP transfer or licensing, founder responsibilities, and governance checkpoints before launch decisions are finalized.",
      suggestedRole: "IP lawyer"
    }
  ]
};

function isOlderThanThirtyDays(value: Date | null) {
  if (!value) {
    return false;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return value < thirtyDaysAgo;
}

function buildProjectRecommendations(project: RecommendationInput): RecommendationDefinition[] {
  const recommendations = [...stageRecommendations[project.stage]];

  if (!project.ipStatus || !project.ipStatus.trim()) {
    recommendations.push({
      ruleKey: "condition:missing-ip-status",
      title: "Clarify IP status",
      description:
        "Confirm ownership of the research output, protection options, and the internal university path before the project progresses further.",
      suggestedRole: "IP lawyer"
    });
  }

  if (
    project.teamStrength === TeamStrength.TECHNICAL_ONLY ||
    project.businessReadiness === BusinessReadiness.WEAK
  ) {
    recommendations.push({
      ruleKey: "condition:business-capability-gap",
      title: "Strengthen business capability",
      description:
        "Bring in commercial support to shape the business model, early customer discovery, and a credible route from research output to market use.",
      suggestedRole: "Business mentor"
    });
  }

  if (!project.nextStep || !project.nextStep.trim()) {
    recommendations.push({
      ruleKey: "condition:missing-next-step",
      title: "Define the next milestone",
      description:
        "Set the immediate next step, assign an owner, and choose a deadline so the project record can drive operational follow-up.",
      suggestedRole: "Project manager"
    });
  }

  if (isOlderThanThirtyDays(project.lastContactAt)) {
    recommendations.push({
      ruleKey: "condition:stale-contact",
      title: "Reconnect with the project team",
      description:
        "Reach out to confirm the latest project status, unblock missing information, and keep the CRM record aligned with real progress.",
      suggestedRole: "Project manager"
    });
  }

  if (
    project.potentialLevel === ProjectPotentialLevel.HIGH &&
    project.stage !== PipelineStage.SCALING &&
    project.stage !== PipelineStage.SPIN_OFF
  ) {
    recommendations.push({
      ruleKey: "condition:high-potential-support-plan",
      title: "Prepare a support plan",
      description:
        "High-potential opportunities should move with a clearer support plan, milestone risks, and coordinated stakeholders from the innovation center.",
      suggestedRole: "Innovation manager"
    });
  }

  return recommendations;
}

export async function getProjectRecommendations(
  project: RecommendationInput
): Promise<RecommendationWithTemplates<RecommendationDefinition>[]> {
  const [recommendations, templates] = await Promise.all([
    Promise.resolve(buildProjectRecommendations(project)),
    getStageTemplates(project.stage)
  ]);

  return attachTemplatesToRecommendations(recommendations, templates);
}

type SyncRecommendationInput = RecommendationInput & {
  id: string;
  recommendations: {
    id: string;
    ruleKey: string;
    status: RecommendationStatus;
  }[];
};

export async function syncProjectRecommendations(project: SyncRecommendationInput) {
  const expectedRecommendations = buildProjectRecommendations(project);
  const expectedKeys = new Set(expectedRecommendations.map((item) => item.ruleKey));
  const existingByKey = new Map(project.recommendations.map((item) => [item.ruleKey, item]));

  const upsertOperations = expectedRecommendations.map((item) => {
    const existing = existingByKey.get(item.ruleKey);

    if (!existing) {
      return prisma.recommendation.create({
        data: {
          projectId: project.id,
          ruleKey: item.ruleKey,
          title: item.title,
          description: item.description,
          suggestedRole: item.suggestedRole
        }
      });
    }

    if (existing.status === RecommendationStatus.COMPLETED) {
      return Promise.resolve();
    }

    return prisma.recommendation.update({
      where: {
        id: existing.id
      },
      data: {
        title: item.title,
        description: item.description,
        suggestedRole: item.suggestedRole,
        status: RecommendationStatus.PENDING
      }
    });
  });

  const stalePendingIds = project.recommendations
    .filter((item) => item.status === RecommendationStatus.PENDING && !expectedKeys.has(item.ruleKey))
    .map((item) => item.id);

  await Promise.all([
    ...upsertOperations,
    stalePendingIds.length > 0
      ? prisma.recommendation.updateMany({
          where: {
            id: {
              in: stalePendingIds
            }
          },
          data: {
            status: RecommendationStatus.DISMISSED
          }
        })
      : Promise.resolve()
  ]);
}

export async function getStageTemplates(stage: PipelineStage): Promise<TemplateLink[]> {
  const templates = await prisma.template.findMany({
    where: {
      targetStage: stage
    },
    orderBy: [{ createdAt: "asc" }]
  });

  return Promise.all(
    templates.map(async (template) => ({
      ...template,
      fileUrl: await createSignedFileUrl(template.storagePath)
    }))
  );
}

export function attachTemplatesToRecommendations<TRecommendation extends object>(
  recommendations: TRecommendation[],
  templates: TemplateLink[]
): RecommendationWithTemplates<TRecommendation>[] {
  const primaryTemplate = templates[0] ?? null;

  return recommendations.map((recommendation) => ({
    ...recommendation,
    primaryTemplate,
    templates
  }));
}
