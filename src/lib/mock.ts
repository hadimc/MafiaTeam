export type Faction = "citizen" | "mafia" | "independent";
export type PlayerStatus = "alive" | "eliminated";

export type MockPlayer = {
  id: string;
  seat: number;
  name: { fa: string; en: string };
  role: { fa: string; en: string };
  faction: Faction;
  status: PlayerStatus;
};

export const mockEvent = {
  slug: "friday-mafia-aug-21",
  title: { fa: "مافیای جمعه — ۲۱ اوت", en: "Friday Mafia — August 21" },
  date: { fa: "جمعه ۲۱ اوت، ۲۱:۰۰", en: "Friday Aug 21, 9:00 PM" },
  location: { fa: "خانه علی", en: "Ali's place" },
  status: { fa: "نقش‌ها توزیع شد", en: "Roles assigned" },
  narrator: { fa: "هادی", en: "Hadi" },
  scenario: {
    name: { fa: "۱۴ نفره — کلاسیک", en: "14-player classic" },
    counts: { mafia: 4, citizen: 9, independent: 1 },
  },
};

export const mockPlayers: MockPlayer[] = [
  { id: "1", seat: 1, name: { fa: "علی", en: "Ali" }, role: { fa: "کارآگاه", en: "Detective" }, faction: "citizen", status: "alive" },
  { id: "2", seat: 2, name: { fa: "سارا", en: "Sara" }, role: { fa: "پدرخوانده", en: "Godfather" }, faction: "mafia", status: "alive" },
  { id: "3", seat: 3, name: { fa: "رضا", en: "Reza" }, role: { fa: "لئون", en: "Leon" }, faction: "citizen", status: "alive" },
  { id: "4", seat: 4, name: { fa: "مینا", en: "Mina" }, role: { fa: "جک", en: "Jack" }, faction: "independent", status: "alive" },
  { id: "5", seat: 5, name: { fa: "امیر", en: "Amir" }, role: { fa: "دکتر", en: "Doctor" }, faction: "citizen", status: "alive" },
  { id: "6", seat: 6, name: { fa: "ندا", en: "Neda" }, role: { fa: "مافیای ساده", en: "Mafioso" }, faction: "mafia", status: "alive" },
  { id: "7", seat: 7, name: { fa: "بهرام", en: "Bahram" }, role: { fa: "شهروند", en: "Villager" }, faction: "citizen", status: "eliminated" },
  { id: "8", seat: 8, name: { fa: "لیلا", en: "Leila" }, role: { fa: "شهروند", en: "Villager" }, faction: "citizen", status: "alive" },
  { id: "9", seat: 9, name: { fa: "کامران", en: "Kamran" }, role: { fa: "مافیای ساده", en: "Mafioso" }, faction: "mafia", status: "alive" },
  { id: "10", seat: 10, name: { fa: "زهرا", en: "Zahra" }, role: { fa: "شهروند", en: "Villager" }, faction: "citizen", status: "alive" },
  { id: "11", seat: 11, name: { fa: "سینا", en: "Sina" }, role: { fa: "شهروند", en: "Villager" }, faction: "citizen", status: "alive" },
  { id: "12", seat: 12, name: { fa: "مریم", en: "Maryam" }, role: { fa: "شهروند", en: "Villager" }, faction: "citizen", status: "alive" },
  { id: "13", seat: 13, name: { fa: "پوریا", en: "Pouria" }, role: { fa: "مافیای ساده", en: "Mafioso" }, faction: "mafia", status: "alive" },
  { id: "14", seat: 14, name: { fa: "نرگس", en: "Narges" }, role: { fa: "شهروند", en: "Villager" }, faction: "citizen", status: "alive" },
];

export const mockNightOrder = [
  { id: "jack", name: { fa: "جک", en: "Jack" }, prompt: { fa: "هدف نفرین را انتخاب کن", en: "Choose a curse target" } },
  { id: "mafia", name: { fa: "تیم مافیا", en: "Mafia team" }, prompt: { fa: "قربانی شب را انتخاب کنید", en: "Choose tonight's kill" } },
  { id: "doctor", name: { fa: "دکتر", en: "Doctor" }, prompt: { fa: "چه کسی را نجات می‌دهی؟", en: "Who do you protect?" } },
  { id: "detective", name: { fa: "کارآگاه", en: "Detective" }, prompt: { fa: "استعلام بگیر", en: "Choose a player to investigate" } },
  { id: "leon", name: { fa: "لئون", en: "Leon" }, prompt: { fa: "شلیک می‌کنی؟ هدف را انتخاب کن", en: "Shoot? Choose a target" } },
];

export const mockExitCards = [
  { n: 1, name: { fa: "افشای هویت", en: "Reveal identity" } },
  { n: 2, name: { fa: "دستبند", en: "Handcuffs" } },
  { n: 3, name: { fa: "سکوت", en: "Silence" } },
  { n: 4, name: { fa: "شلیک آخر", en: "Last shot" } },
  { n: 5, name: { fa: "قدرت ویژه", en: "Special ability" } },
];

export const mockLog = [
  { day: 1, phase: "day", text: { fa: "بهرام با ۷ رأی حذف شد", en: "Bahram eliminated with 7 votes" } },
  { day: 1, phase: "day", text: { fa: "بهرام کارت «سکوت» کشید", en: "Bahram drew Silence" } },
  { day: 1, phase: "night", text: { fa: "مافیا امیر را هدف گرفت", en: "Mafia targeted Amir" } },
  { day: 1, phase: "night", text: { fa: "دکتر رضا را نجات داد", en: "Doctor protected Reza" } },
  { day: 1, phase: "night", text: { fa: "کارآگاه مینا را استعلام کرد — منفی", en: "Detective checked Mina — negative" } },
];

export const mockUsers = [
  "هادی", "علی", "سارا", "رضا", "مینا", "امیر", "ندا", "بهرام",
  "لیلا", "کامران", "زهرا", "سینا", "مریم", "پوریا", "نرگس",
  "آرمان", "شیدا", "کیان", "هستی", "نیما",
];

export const myRole = mockPlayers[2]; // Reza / Leon — player reveal demo
