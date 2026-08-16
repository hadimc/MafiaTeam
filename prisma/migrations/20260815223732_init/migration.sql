-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "displayNameEn" TEXT NOT NULL DEFAULT '',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "locationEn" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'registration_open',
    "narratorId" TEXT,
    "scenarioId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Event_narratorId_fkey" FOREIGN KEY ("narratorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Event_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "narratorVolunteer" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "supportedPlayerCount" INTEGER NOT NULL,
    "configuration" TEXT NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "faction" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "nightOrder" INTEGER NOT NULL DEFAULT 0,
    "abilities" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Role_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExitCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "effectJson" TEXT NOT NULL DEFAULT '{}',
    "requiresTarget" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ExitCard_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "scenarioSnapshot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "currentDay" INTEGER NOT NULL DEFAULT 0,
    "currentPhase" TEXT NOT NULL DEFAULT 'lobby',
    "nightStep" INTEGER NOT NULL DEFAULT 0,
    "speakerIndex" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "winningFaction" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Game_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GamePlayer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "roleKey" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "roleNameEn" TEXT NOT NULL,
    "faction" TEXT NOT NULL,
    "roleDescription" TEXT NOT NULL,
    "roleDescriptionEn" TEXT NOT NULL,
    "alive" BOOLEAN NOT NULL DEFAULT true,
    "revealedAt" DATETIME,
    "eliminatedAt" DATETIME,
    "eliminationReason" TEXT,
    CONSTRAINT "GamePlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GamePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GameAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorPlayerId" TEXT,
    "targetPlayerId" TEXT,
    "actionType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "messageEn" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "reversed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameAction_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameAction_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GameAction_actorPlayerId_fkey" FOREIGN KEY ("actorPlayerId") REFERENCES "GamePlayer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GameAction_targetPlayerId_fkey" FOREIGN KEY ("targetPlayerId") REFERENCES "GamePlayer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "voteType" TEXT NOT NULL,
    "targetPlayerId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    CONSTRAINT "Vote_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vote_targetPlayerId_fkey" FOREIGN KEY ("targetPlayerId") REFERENCES "GamePlayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExitCardDraw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "exitCardId" TEXT,
    "cardKey" TEXT NOT NULL,
    "cardName" TEXT NOT NULL,
    "cardNameEn" TEXT NOT NULL,
    "drawNumber" INTEGER NOT NULL,
    "drawnAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExitCardDraw_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExitCardDraw_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "GamePlayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExitCardDraw_exitCardId_fkey" FOREIGN KEY ("exitCardId") REFERENCES "ExitCard" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StatusEffect" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "gamePlayerId" TEXT NOT NULL,
    "effectType" TEXT NOT NULL,
    "startsAtPhase" TEXT NOT NULL,
    "endsAtPhase" TEXT,
    "sourceActionId" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "StatusEffect_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StatusEffect_gamePlayerId_fkey" FOREIGN KEY ("gamePlayerId") REFERENCES "GamePlayer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GamePlayer_gameId_userId_key" ON "GamePlayer"("gameId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "GamePlayer_gameId_seatNumber_key" ON "GamePlayer"("gameId", "seatNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_gameId_dayNumber_voteType_targetPlayerId_key" ON "Vote"("gameId", "dayNumber", "voteType", "targetPlayerId");
