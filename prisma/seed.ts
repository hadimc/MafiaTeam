import bcrypt from "bcryptjs";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  EXIT_CARDS,
  HOUSE_RULES,
  SCENARIO_PRESETS,
  defaultConfig,
  playerCount,
  roleCreates,
} from "../src/lib/catalog";
import { snapshotFromScenario } from "../src/lib/scenario";

const prisma = new PrismaClient();

type ClubUser = {
  username: string;
  displayName: string;
  displayNameEn: string;
  email?: string;
  admin?: boolean;
};

function loadClub() {
  const localPath = join(process.cwd(), "prisma/club.local.json");
  const examplePath = join(process.cwd(), "prisma/club.local.example.json");
  if (!existsSync(localPath)) {
    if (!existsSync(examplePath)) {
      throw new Error("Missing prisma/club.local.json — copy prisma/club.local.example.json");
    }
    copyFileSync(examplePath, localPath);
    console.warn("Created prisma/club.local.json from the example. Edit it; it is gitignored.");
  }
  const club = JSON.parse(readFileSync(localPath, "utf8")) as {
    password: string;
    users: ClubUser[];
  };
  if (!club.password || !club.users?.length) {
    throw new Error("prisma/club.local.json needs a password and at least one user");
  }
  return club;
}

async function main() {
  const club = loadClub();
  await prisma.exitCardDraw.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.gameAction.deleteMany();
  await prisma.statusEffect.deleteMany();
  await prisma.gamePlayer.deleteMany();
  await prisma.game.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.eventNarrator.deleteMany();
  await prisma.event.deleteMany();
  await prisma.role.deleteMany();
  await prisma.exitCard.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.houseRule.deleteMany();
  await prisma.authToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = bcrypt.hashSync(club.password, 10);
  const createdUsers = [];
  for (const member of club.users) {
    createdUsers.push(
      await prisma.user.create({
        data: {
          username: member.username,
          email: (member.email || `${member.username}@mafiateam.local`).trim().toLowerCase(),
          displayName: member.displayName,
          displayNameEn: member.displayNameEn,
          isAdmin: Boolean(member.admin),
          enabled: true,
          passwordHash,
        },
      }),
    );
  }

  const byUsername = Object.fromEntries(createdUsers.map((user) => [user.username, user]));
  const hadi = byUsername.hadi ?? createdUsers.find((user) => user.isAdmin) ?? createdUsers[0];
  let scenario10Id = "";
  let scenario14Id = "";

  for (const preset of SCENARIO_PRESETS) {
    const players = playerCount(preset.roles);
    if (preset.attendeeCount !== preset.narratorCount + players) {
      throw new Error(
        `Preset "${preset.nameEn}" attendees ${preset.attendeeCount} != ${preset.narratorCount} narrators + ${players} players`,
      );
    }
    const created = await prisma.scenario.create({
      data: {
        name: preset.name,
        nameEn: preset.nameEn,
        description: preset.notes,
        descriptionEn: preset.notesEn,
        attendeeCount: preset.attendeeCount,
        narratorCount: preset.narratorCount,
        supportedPlayerCount: players,
        configuration: JSON.stringify(defaultConfig(preset.roles)),
        roles: { create: roleCreates(preset.roles) },
        exitCards: {
          create: EXIT_CARDS.map(([key, name, nameEn, description, descriptionEn]) => ({
            key, name, nameEn, description, descriptionEn,
          })),
        },
      },
    });
    if (preset.attendeeCount === 10) scenario10Id = created.id;
    if (preset.attendeeCount === 14) scenario14Id = created.id;
  }

  const scenario10 = await prisma.scenario.findUniqueOrThrow({
    where: { id: scenario10Id },
    include: { roles: true, exitCards: true },
  });

  const tenPlayerNames = [
    "koorosh", "kamran", "peyman", "khatereh", "behrang", "babak", "nastaran", "arya", "sina",
  ];
  const tenPlayers = tenPlayerNames.map((username) => byUsername[username]).filter(Boolean);
  if (tenPlayers.length === tenPlayerNames.length) {
    await seedFinishedNight({
      slug: "friday-mafia-jul-10",
      title: "مافیای جمعه — ۱۰ ژوئیه",
      titleEn: "Friday Mafia — July 10",
      date: new Date("2026-07-10T21:00:00"),
      location: "خانه هادی",
      locationEn: "Hadi's place",
      scenario: scenario10,
      narrator: hadi,
      players: tenPlayers,
      winner: "mafia",
      startedAt: new Date("2026-07-10T21:20:00"),
      finishedAt: new Date("2026-07-10T23:40:00"),
    });

    await seedFinishedNight({
      slug: "friday-mafia-aug-7",
      title: "مافیای جمعه — ۷ اوت",
      titleEn: "Friday Mafia — August 7",
      date: new Date("2026-08-07T21:00:00"),
      location: "خانه پیمان",
      locationEn: "Peyman's place",
      scenario: scenario10,
      narrator: hadi,
      players: [...tenPlayers].reverse(),
      winner: "citizen",
      startedAt: new Date("2026-08-07T21:15:00"),
      finishedAt: new Date("2026-08-07T23:55:00"),
    });
  }

  const event = await prisma.event.create({
    data: {
      slug: "friday-mafia-aug-21",
      title: "مافیای جمعه — ۲۱ اوت",
      titleEn: "Friday Mafia — August 21",
      date: new Date("2026-08-21T21:00:00"),
      location: "خانه هادی",
      locationEn: "Hadi's place",
      status: "registration_open",
      createdById: hadi.id,
      scenarioId: scenario14Id || scenario10Id,
      narrators: { create: [{ userId: hadi.id }] },
    },
  });

  await prisma.eventRegistration.create({
    data: { eventId: event.id, userId: hadi.id, narratorVolunteer: true },
  });

  const playerUsernames = [
    "koorosh", "kamran", "mahboobeh", "peyman", "khatereh", "behrang", "mandana",
    "babak", "nastaran", "arya", "sina", "razi", "akbar",
  ];
  for (const username of playerUsernames) {
    const user = byUsername[username];
    if (!user) continue;
    await prisma.eventRegistration.create({
      data: { eventId: event.id, userId: user.id },
    });
  }

  await prisma.houseRule.createMany({
    data: HOUSE_RULES.map((rule, i) => ({
      title: rule.title,
      titleEn: rule.titleEn,
      body: rule.body,
      bodyEn: rule.bodyEn,
      sortOrder: i + 1,
    })),
  });

  console.log(`Seeded ${club.users.length} club members from prisma/club.local.json`);
  console.log(`Seeded ${SCENARIO_PRESETS.length} scenarios (10–18 attendees)`);
  console.log(`Temp password: (see prisma/club.local.json)`);
  console.log(`Admin: ${hadi.username}`);
  console.log("Open: /events/friday-mafia-aug-21");
}

type SeedUser = { id: string };
type SeedScenario = {
  id: string;
  name: string;
  nameEn: string;
  supportedPlayerCount: number;
  configuration: string;
  version: number;
  roles: {
    key: string;
    name: string;
    nameEn: string;
    faction: string;
    description: string;
    descriptionEn: string;
    quantity: number;
    nightOrder: number;
  }[];
  exitCards: {
    id: string;
    key: string;
    name: string;
    nameEn: string;
    description: string;
    descriptionEn: string;
  }[];
};

async function seedFinishedNight(input: {
  slug: string;
  title: string;
  titleEn: string;
  date: Date;
  location: string;
  locationEn: string;
  scenario: SeedScenario;
  narrator: SeedUser;
  players: SeedUser[];
  winner: "citizen" | "mafia" | "independent";
  startedAt: Date;
  finishedAt: Date;
}) {
  const pool = input.scenario.roles.flatMap((role) => Array.from({ length: role.quantity }, () => role));
  if (pool.length !== input.players.length) {
    throw new Error(`${input.slug}: ${pool.length} roles vs ${input.players.length} players`);
  }

  const event = await prisma.event.create({
    data: {
      slug: input.slug,
      title: input.title,
      titleEn: input.titleEn,
      date: input.date,
      location: input.location,
      locationEn: input.locationEn,
      status: "finished",
      createdById: input.narrator.id,
      scenarioId: input.scenario.id,
      narrators: { create: [{ userId: input.narrator.id }] },
    },
  });

  await prisma.eventRegistration.create({
    data: { eventId: event.id, userId: input.narrator.id, narratorVolunteer: true },
  });
  for (const player of input.players) {
    await prisma.eventRegistration.create({ data: { eventId: event.id, userId: player.id } });
  }

  const snapshot = snapshotFromScenario(input.scenario);
  await prisma.game.create({
    data: {
      eventId: event.id,
      scenarioSnapshot: JSON.stringify(snapshot),
      status: "finished",
      currentPhase: "game_over",
      currentDay: 3,
      winningFaction: input.winner,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      players: {
        create: input.players.map((player, i) => {
          const role = pool[i];
          return {
            userId: player.id,
            seatNumber: i + 1,
            roleKey: role.key,
            roleName: role.name,
            roleNameEn: role.nameEn,
            faction: role.faction,
            roleDescription: role.description,
            roleDescriptionEn: role.descriptionEn,
            alive: true,
          };
        }),
      },
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
