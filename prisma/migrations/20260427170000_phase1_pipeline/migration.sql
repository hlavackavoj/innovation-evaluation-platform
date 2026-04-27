CREATE TYPE "ProjectStage_new" AS ENUM ('DISCOVERY', 'VALIDATION', 'MVP', 'SCALING', 'SPIN_OFF');

ALTER TABLE "Project"
ADD COLUMN "stage_new" "ProjectStage_new" NOT NULL DEFAULT 'DISCOVERY';

UPDATE "Project"
SET "stage_new" = CASE
  WHEN "stage" IN ('NEW_LEAD', 'INITIAL_SCREENING', 'NEED_MORE_INFO', 'ARCHIVED') THEN 'DISCOVERY'::"ProjectStage_new"
  WHEN "stage" = 'EVALUATION' THEN 'VALIDATION'::"ProjectStage_new"
  WHEN "stage" = 'SUPPORT_PLAN' THEN 'MVP'::"ProjectStage_new"
  WHEN "stage" = 'ACTIVE_SUPPORT' THEN 'SCALING'::"ProjectStage_new"
  WHEN "stage" = 'SPIN_OFF_CANDIDATE' THEN 'SPIN_OFF'::"ProjectStage_new"
  ELSE 'DISCOVERY'::"ProjectStage_new"
END;

ALTER TABLE "Project" DROP COLUMN "stage";
ALTER TABLE "Project" RENAME COLUMN "stage_new" TO "stage";
DROP TYPE "ProjectStage";
ALTER TYPE "ProjectStage_new" RENAME TO "ProjectStage";

CREATE TYPE "ProjectPotentialLevel_new" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

ALTER TABLE "Project"
ADD COLUMN "potential_level" "ProjectPotentialLevel_new" NOT NULL DEFAULT 'LOW';

UPDATE "Project"
SET "potential_level" = CASE
  WHEN "potential" = 'HIGH' THEN 'HIGH'::"ProjectPotentialLevel_new"
  WHEN "potential" = 'MEDIUM' THEN 'MEDIUM'::"ProjectPotentialLevel_new"
  ELSE 'LOW'::"ProjectPotentialLevel_new"
END;

ALTER TABLE "Project" DROP COLUMN "potential";
DROP TYPE "ProjectPotential";
ALTER TYPE "ProjectPotentialLevel_new" RENAME TO "ProjectPotentialLevel";
