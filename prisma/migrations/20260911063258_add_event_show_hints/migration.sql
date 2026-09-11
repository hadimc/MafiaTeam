-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "locationEn" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'registration_open',
    "showHints" BOOLEAN NOT NULL DEFAULT false,
    "scenarioId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Event_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Event" ("createdAt", "createdById", "date", "id", "location", "locationEn", "scenarioId", "slug", "status", "title", "titleEn") SELECT "createdAt", "createdById", "date", "id", "location", "locationEn", "scenarioId", "slug", "status", "title", "titleEn" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");
CREATE TABLE "new_Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "attendeeCount" INTEGER NOT NULL,
    "narratorCount" INTEGER NOT NULL DEFAULT 1,
    "supportedPlayerCount" INTEGER NOT NULL,
    "configuration" TEXT NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_Scenario" ("active", "attendeeCount", "configuration", "description", "descriptionEn", "id", "name", "nameEn", "narratorCount", "supportedPlayerCount", "version") SELECT "active", "attendeeCount", "configuration", "description", "descriptionEn", "id", "name", "nameEn", "narratorCount", "supportedPlayerCount", "version" FROM "Scenario";
DROP TABLE "Scenario";
ALTER TABLE "new_Scenario" RENAME TO "Scenario";
CREATE UNIQUE INDEX "Scenario_nameEn_key" ON "Scenario"("nameEn");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
