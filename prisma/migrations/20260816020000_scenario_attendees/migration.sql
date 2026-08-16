-- AlterTable
ALTER TABLE "Scenario" ADD COLUMN "attendeeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Scenario" ADD COLUMN "narratorCount" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "Scenario_nameEn_key" ON "Scenario"("nameEn");
