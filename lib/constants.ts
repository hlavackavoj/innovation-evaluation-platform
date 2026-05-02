import {
  ActivityType,
  BusinessReadiness,
  OrganizationType,
  PipelineStage,
  ProjectPotentialLevel,
  ProjectPriority,
  TaskStatus,
  TeamStrength,
  UserRole
} from "@prisma/client";

export const pipelineStages: PipelineStage[] = [
  PipelineStage.DISCOVERY,
  PipelineStage.VALIDATION,
  PipelineStage.MVP,
  PipelineStage.SCALING,
  PipelineStage.SPIN_OFF
];

export const projectStageOptions = [...pipelineStages];
export const projectPriorityOptions = Object.values(ProjectPriority);
export const projectPotentialLevelOptions = Object.values(ProjectPotentialLevel);
export const activityTypeOptions = Object.values(ActivityType);
export const taskStatusOptions = Object.values(TaskStatus);
export const teamStrengthOptions = Object.values(TeamStrength);
export const businessReadinessOptions = Object.values(BusinessReadiness);
export const organizationTypeOptions = Object.values(OrganizationType);
export const userRoleOptions = Object.values(UserRole);

export const stageDescriptions: Record<PipelineStage, string> = {
  DISCOVERY: "Early discovery work to clarify the opportunity, team readiness, and first institutional fit.",
  VALIDATION: "Evidence gathering is underway to test demand, problem urgency, and solution fit.",
  MVP: "The team is shaping an MVP plan, pilot scope, and support package for the next milestone.",
  SCALING: "The project has traction and is preparing for broader rollout, partnerships, or investment readiness.",
  SPIN_OFF: "The opportunity is ready for formal spin-off planning, governance, and launch decisions."
};

export type UniversityPhaseSuggestion = "IDEATION" | "CONTRACTING" | "IMPLEMENTATION" | "DELIVERY";

export const universityPhaseLabels: Record<UniversityPhaseSuggestion, string> = {
  IDEATION: "Ideace",
  CONTRACTING: "Smluvní zajištění",
  IMPLEMENTATION: "Realizace",
  DELIVERY: "Odevzdání výsledků"
};

export const universityPhaseDescriptions: Record<UniversityPhaseSuggestion, string> = {
  IDEATION: "Nový nápad nebo koncept, počáteční zájem o výzkumný nebo inovační projekt.",
  CONTRACTING: "Grantové žádosti, NDA, partnerské smlouvy, schválení rozpočtu nebo podepisování.",
  IMPLEMENTATION: "Aktivní práce na projektu, milníky, průběžné zprávy nebo probíhající spolupráce.",
  DELIVERY: "Předání výsledků, závěrečné zprávy, příprava spin-off nebo uzavření projektu."
};

export const pipelineStageToUniversityPhase: Record<PipelineStage, UniversityPhaseSuggestion> = {
  DISCOVERY: "IDEATION",
  VALIDATION: "IDEATION",
  MVP: "IMPLEMENTATION",
  SCALING: "IMPLEMENTATION",
  SPIN_OFF: "DELIVERY"
};
