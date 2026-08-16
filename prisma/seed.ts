import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const users = [
  ["hadi", "هادی", "Hadi", true],
  ["ali", "علی", "Ali", false],
  ["sara", "سارا", "Sara", false],
  ["reza", "رضا", "Reza", false],
  ["mina", "مینا", "Mina", false],
  ["amir", "امیر", "Amir", false],
  ["neda", "ندا", "Neda", false],
  ["bahram", "بهرام", "Bahram", false],
  ["leila", "لیلا", "Leila", false],
  ["kamran", "کامران", "Kamran", false],
  ["zahra", "زهرا", "Zahra", false],
  ["sina", "سینا", "Sina", false],
  ["maryam", "مریم", "Maryam", false],
  ["pouria", "پوریا", "Pouria", false],
  ["narges", "نرگس", "Narges", false],
  ["arman", "آرمان", "Arman", false],
  ["shida", "شیدا", "Shida", false],
  ["kian", "کیان", "Kian", false],
  ["hasti", "هستی", "Hasti", false],
  ["nima", "نیما", "Nima", false],
] as const;

const exitCards = [
  ["reveal", "افشای هویت", "Reveal identity", "نقش خود را علنی می‌کند.", "Reveals their own role."],
  ["handcuffs", "دستبند", "Handcuffs", "یک بازیکن را تا شب بعد محدود می‌کند.", "Restricts a player until next night."],
  ["silence", "سکوت", "Silence", "یک بازیکن حق صحبت ندارد.", "A player cannot speak."],
  ["last_shot", "شلیک آخر", "Last shot", "قبل از خروج یک شلیک دارد.", "May take one shot before leaving."],
  ["special", "قدرت ویژه", "Special ability", "اثر سناریو بعداً تعریف می‌شود.", "Scenario-specific effect, defined later."],
] as const;

async function main() {
  await prisma.exitCardDraw.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.gameAction.deleteMany();
  await prisma.statusEffect.deleteMany();
  await prisma.gamePlayer.deleteMany();
  await prisma.game.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.role.deleteMany();
  await prisma.exitCard.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.authToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = bcrypt.hashSync("mafia123", 10);
  const createdUsers = [];
  for (const [username, displayName, displayNameEn, isAdmin] of users) {
    createdUsers.push(
      await prisma.user.create({
        data: {
          username,
          email: `${username}@mafiateam.local`,
          displayName,
          displayNameEn,
          isAdmin,
          enabled: true,
          passwordHash,
        },
      }),
    );
  }

  const hadi = createdUsers[0];

  const scenario14 = await prisma.scenario.create({
    data: {
      name: "۱۴ نفره — کلاسیک",
      nameEn: "14-player classic",
      description: "۴ مافیا، ۹ شهروند، ۱ مستقل",
      descriptionEn: "4 Mafia, 9 Citizens, 1 Independent",
      supportedPlayerCount: 14,
      configuration: JSON.stringify({
        speakSeconds: 60,
        challengeSeconds: 30,
        defenseSeconds: 60,
        challengesPerDay: 1,
        statusInquiries: 2,
        nightOrder: ["jack", "mafia", "doctor", "detective", "leon"],
      }),
      roles: {
        create: [
          role("godfather", "پدرخوانده", "Godfather", "mafia", "رهبر مافیا. برای کارآگاه منفی دیده می‌شود.", "Mafia lead. Reads as town to the Detective.", 1, 2),
          role("mafioso", "مافیای ساده", "Mafioso", "mafia", "عضو عادی مافیا.", "Standard mafia member.", 3, 2),
          role("detective", "کارآگاه", "Detective", "citizen", "هر شب یک نفر را استعلام می‌کند.", "Investigates one player each night.", 1, 4),
          role("doctor", "دکتر", "Doctor", "citizen", "هر شب یک نفر را نجات می‌دهد.", "Protects one player each night.", 1, 3),
          role("leon", "لئون", "Leon", "citizen", "تعداد محدودی شلیک در شب دارد.", "Limited night shots.", 1, 5),
          role("villager", "شهروند", "Villager", "citizen", "رأی می‌دهد و بحث می‌کند.", "Votes and discusses.", 6, 0),
          role("jack", "جک", "Jack", "independent", "مستقل. شب اول هدف نفرین را انتخاب می‌کند.", "Independent. Chooses a curse target on night one.", 1, 1),
        ],
      },
      exitCards: { create: exitCards.map(([key, name, nameEn, description, descriptionEn]) => ({ key, name, nameEn, description, descriptionEn })) },
    },
  });

  await prisma.scenario.create({
    data: {
      name: "۹ نفره",
      nameEn: "9-player",
      description: "۳ مافیا، ۵ شهروند، ۱ مستقل",
      descriptionEn: "3 Mafia, 5 Citizens, 1 Independent",
      supportedPlayerCount: 9,
      configuration: JSON.stringify({
        speakSeconds: 60,
        challengeSeconds: 30,
        defenseSeconds: 60,
        challengesPerDay: 1,
        statusInquiries: 2,
        nightOrder: ["jack", "mafia", "doctor", "detective"],
      }),
      roles: {
        create: [
          role("godfather", "پدرخوانده", "Godfather", "mafia", "رهبر مافیا.", "Mafia lead.", 1, 2),
          role("mafioso", "مافیای ساده", "Mafioso", "mafia", "عضو عادی مافیا.", "Standard mafia member.", 2, 2),
          role("detective", "کارآگاه", "Detective", "citizen", "استعلام شب.", "Night investigate.", 1, 4),
          role("doctor", "دکتر", "Doctor", "citizen", "نجات شب.", "Night protect.", 1, 3),
          role("villager", "شهروند", "Villager", "citizen", "رأی و بحث.", "Vote and talk.", 3, 0),
          role("jack", "جک", "Jack", "independent", "مستقل.", "Independent.", 1, 1),
        ],
      },
      exitCards: { create: exitCards.map(([key, name, nameEn, description, descriptionEn]) => ({ key, name, nameEn, description, descriptionEn })) },
    },
  });

  const event = await prisma.event.create({
    data: {
      slug: "friday-mafia-aug-21",
      title: "مافیای جمعه — ۲۱ اوت",
      titleEn: "Friday Mafia — August 21",
      date: new Date("2026-08-21T21:00:00"),
      location: "خانه علی",
      locationEn: "Ali's place",
      status: "registration_open",
      narratorId: hadi.id,
      scenarioId: scenario14.id,
      createdById: hadi.id,
    },
  });

  const playerUsernames = [
    "ali", "sara", "reza", "mina", "amir", "neda", "bahram",
    "leila", "kamran", "zahra", "sina", "maryam", "pouria", "narges",
  ];
  for (const username of playerUsernames) {
    const user = createdUsers.find((u) => u.username === username)!;
    await prisma.eventRegistration.create({
      data: { eventId: event.id, userId: user.id },
    });
  }

  console.log("Seeded 20 users (password: mafia123)");
  console.log("Admin / narrator: hadi");
  console.log("Sample player: ali");
  console.log("Event: /events/friday-mafia-aug-21");
}

function role(
  key: string,
  name: string,
  nameEn: string,
  faction: string,
  description: string,
  descriptionEn: string,
  quantity: number,
  nightOrder: number,
) {
  return { key, name, nameEn, faction, description, descriptionEn, quantity, nightOrder };
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
