CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'COMPLETED', 'DISMISSED');

CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "suggestedRole" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Recommendation_projectId_ruleKey_key" ON "Recommendation"("projectId", "ruleKey");

ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
