ALTER TABLE "User" ADD COLUMN "kindeId" TEXT;
CREATE UNIQUE INDEX "User_kindeId_key" ON "User"("kindeId");
