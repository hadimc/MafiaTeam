import type { Faction } from "@/engine";

export type CatalogRole = {
  key: string;
  name: string;
  nameEn: string;
  faction: Faction;
  dealable: boolean;
  nightOrder: number;
  summaryEn: string;
  description: string;
  descriptionEn: string;
};

export const CATALOG_ROLES: CatalogRole[] = [
  {
    key: "host",
    name: "خدا",
    nameEn: "Host",
    faction: "citizen",
    dealable: false,
    nightOrder: 0,
    summaryEn: "Narrates and runs the table",
    description: "گردانندگی اصلی بازی",
    descriptionEn: "Leads the table, calls night actions, and announces results.",
  },
  {
    key: "assistant",
    name: "دستیار",
    nameEn: "Assistant",
    faction: "citizen",
    dealable: false,
    nightOrder: 0,
    summaryEn: "Helps the host",
    description: "شبها به نظم بازی کمک میکند. روزها به زمان بندی.",
    descriptionEn: "Helps with night order and daytime timing. Does not receive a secret role.",
  },
  {
    key: "watson",
    name: "دکتر واتسون",
    nameEn: "Dr. Watson",
    faction: "citizen",
    dealable: true,
    nightOrder: 3,
    summaryEn: "Saves a player at night",
    description: "هر شب می‌تواند یک نفر را از حمله مافیا نجات دهد. در طول بازی تنها یک‌بار می‌تواند خود را نجات دهد.",
    descriptionEn: "Each night may protect one player from the Mafia shot. May self-save only once.",
  },
  {
    key: "leon",
    name: "لئون",
    nameEn: "Leon",
    faction: "citizen",
    dealable: true,
    nightOrder: 4,
    summaryEn: "Two night shots and a vest",
    description: "دو تیر شب دارد. اگر به مافیا بزند حذف می‌شود؛ اگر به شهروند بزند خودش خارج می‌شود. یک جلیقه برای یک حمله شبانه دارد.",
    descriptionEn: "Two night shots. A Mafia hit kills them; a citizen hit kills Leon. Independents are immune. Godfather needs two shots. Has one vest.",
  },
  {
    key: "kane",
    name: "همشهری کین",
    nameEn: "Citizen Kane",
    faction: "citizen",
    dealable: true,
    nightOrder: 5,
    summaryEn: "One coupon; Mafia mark means Kane leaves next night",
    description: "فقط یک کوپن دارد. یک‌بار شب با یک بازیکن می‌نشیند. اگر شهروند یا مستقل باشد اتفاقی نمی‌افتد و کوپن مصرف می‌شود. اگر مافیا باشد، کین شب بعد از بازی خارج می‌شود.",
    descriptionEn: "One coupon. Once, sits with a player. Citizen or independent: nothing happens, coupon is spent. Mafia: Kane leaves the following night.",
  },
  {
    key: "detective",
    name: "کارآگاه",
    nameEn: "Detective",
    faction: "citizen",
    dealable: true,
    nightOrder: 5,
    summaryEn: "Checks if a player is Mafia",
    description: "هر شب می‌تواند استعلام یک بازیکن را بگیرد تا بفهمد او مافیا است یا خیر.",
    descriptionEn: "Each night investigates one player. Godfather and independents read negative.",
  },
  {
    key: "constantine",
    name: "کنستانتین",
    nameEn: "Constantine",
    faction: "citizen",
    dealable: true,
    nightOrder: 6,
    summaryEn: "Returns one eliminated player",
    description: "تنها یک‌بار می‌تواند یک بازیکن حذف‌شده را برگرداند، به‌شرطی که نقش او افشا نشده باشد.",
    descriptionEn: "Once, returns an eliminated player whose role was not revealed.",
  },
  {
    key: "mayor",
    name: "شهردار",
    nameEn: "Mayor",
    faction: "citizen",
    dealable: true,
    nightOrder: 0,
    summaryEn: "Overrides an elimination vote",
    description: "یک‌بار در رأی خروج می‌تواند نتیجه را ملغی کند یا یک‌طرفه به یک مدافع رأی خروج بدهد.",
    descriptionEn: "Once, during the elimination vote, may cancel the result or force one defender out.",
  },
  {
    key: "gunner",
    name: "تفنگدار",
    nameEn: "Gunner",
    faction: "citizen",
    dealable: true,
    nightOrder: 7,
    summaryEn: "Hands out day guns",
    description: "دو فشنگ مشقی و یک جنگی دارد. شب تفنگ را به یک بازیکن می‌دهد برای شلیک روز بعد.",
    descriptionEn: "Two blank rounds and one live. At night, gives a gun to a player for the next day’s challenge shot.",
  },
  {
    key: "villager",
    name: "شهر ساده",
    nameEn: "Citizen",
    faction: "citizen",
    dealable: true,
    nightOrder: 0,
    summaryEn: "No night action",
    description: "نقشی در شب ندارد ولی در روز بسیار کمک‌رسان است.",
    descriptionEn: "No night ability. Votes and discusses with the town.",
  },
  {
    key: "godfather",
    name: "پدرخوانده",
    nameEn: "Godfather",
    faction: "mafia",
    dealable: true,
    nightOrder: 2,
    summaryEn: "Leads the Mafia shot",
    description: "هر شب یک نفر را برای حذف انتخاب می‌کند. جلیقه دارد. استعلام او منفی است. حس ششم برای سلاخی دارد.",
    descriptionEn: "Chooses the night kill. Has a vest. Reads as town to the Detective. Sixth sense: Cancel, Wrong, or Correct — Correct removes the guessed player.",
  },
  {
    key: "saul",
    name: "ساول گودمن",
    nameEn: "Saul Goodman",
    faction: "mafia",
    dealable: true,
    nightOrder: 2,
    summaryEn: "May recruit a plain citizen",
    description: "یک‌بار می‌تواند یک شهروند ساده را به مافیا جذب کند. اگر نقش‌دار باشد جذب نمی‌شود.",
    descriptionEn: "Once, may recruit a plain citizen. If the target has a special role, it fails. On a buy night, Mafia does not shoot.",
  },
  {
    key: "lecter",
    name: "دکتر لکتر",
    nameEn: "Dr. Lecter",
    faction: "mafia",
    dealable: true,
    nightOrder: 2,
    summaryEn: "Protects Mafia from Leon",
    description: "هر شب می‌تواند یکی از مافیا را از حمله حرفه‌ای نجات دهد. یک‌بار می‌تواند خود را نجات دهد.",
    descriptionEn: "Each night may save one Mafia member from a professional shot. Self-save only once.",
  },
  {
    key: "matador",
    name: "ماتادور",
    nameEn: "Matador",
    faction: "mafia",
    dealable: true,
    nightOrder: 2,
    summaryEn: "Blocks a night ability",
    description: "هر شب می‌تواند توانایی یک بازیکن را برای آن شب غیرفعال کند.",
    descriptionEn: "Each night may disable one player’s ability for that night.",
  },
  {
    key: "mafioso",
    name: "مافیای ساده",
    nameEn: "Mafioso",
    faction: "mafia",
    dealable: true,
    nightOrder: 2,
    summaryEn: "Votes with the Mafia",
    description: "همفکری با مافیا برای شلیک شب. توانایی خاصی ندارد.",
    descriptionEn: "Wakes with Mafia at night. No special ability.",
  },
  {
    key: "jack",
    name: "جک گنجشکه",
    nameEn: "Jack Sparrow",
    faction: "independent",
    dealable: true,
    nightOrder: 1,
    summaryEn: "Moves a curse each night",
    description: "هر شب یک نفر را طلسم می‌کند. شب‌ها نامیرا است. با رأی روز بیرون نمی‌رود؛ نقشش شو می‌شود.",
    descriptionEn: "Each night curses a new living player. Night-immune. A day vote reveals him instead of eliminating him, and the curse freezes.",
  },
  {
    key: "nostradamus",
    name: "نوستراداموس",
    nameEn: "Nostradamus",
    faction: "independent",
    dealable: true,
    nightOrder: 1,
    summaryEn: "Picks a side on night one",
    description: "در شب معارفه سه نفر را انتخاب می‌کند. اگر دو یا بیشتر مافیا باشند ناچار با مافیا است.",
    descriptionEn: "On intro night, points at three players. If two or more are Mafia, he must join Mafia. Otherwise he chooses a side. Night-immune. Mafia do not open eyes with him.",
  },
  {
    key: "zodiac",
    name: "زودیاک",
    nameEn: "Zodiac",
    faction: "independent",
    dealable: true,
    nightOrder: 1,
    summaryEn: "Shoots anyone every other night; immune to night kills",
    description:
      "در شب‌های زوج (۲، ۴، ...) توسط گرداننده بیدار می‌شود و می‌تواند به یک بازیکن از هر ساید (شهروند یا مافیا) شلیک کرده و او را از بازی خارج کند. در برابر شلیک شب مافیا یا حرفه‌ای (لئون) نامیرا است. اگر به اشتباه به دکتر واتسون شلیک کند، قابلیتش خنثی و خودش از بازی خارج می‌شود. تنها با رأی روز یا گلوله جنگیِ گرفته‌شده از تفنگ‌دار از بازی خارج می‌شود.",
    descriptionEn:
      "On even nights (2, 4, ...) the narrator wakes the Zodiac to shoot one player from either side, eliminating them. Immune to the Mafia’s night shot and Leon’s shot. Misfiring on Dr. Watson neutralizes the ability and kills the Zodiac instead. Can only be removed by a day vote or the Gunner’s real round.",
  },
];

export const DEALABLE_ROLES = CATALOG_ROLES.filter((role) => role.dealable);
export const CATALOG_BY_KEY = Object.fromEntries(CATALOG_ROLES.map((role) => [role.key, role]));

const MAFIA_KEYS = new Set(["godfather", "saul", "lecter", "matador", "mafioso"]);
const NIGHT_SEQUENCE = [
  "nostradamus",
  "jack",
  "zodiac",
  "mafia",
  "watson",
  "leon",
  "kane",
  "detective",
  "constantine",
  "gunner",
] as const;

export function nightOrderFromQuantities(qty: Record<string, number>) {
  return NIGHT_SEQUENCE.filter((key) => {
    if (key === "mafia") {
      return Object.entries(qty).some(([roleKey, n]) => n > 0 && MAFIA_KEYS.has(roleKey));
    }
    return (qty[key] ?? 0) > 0;
  });
}

export function nightStepLabel(stepKey: string) {
  if (stepKey === "mafia") return "Mafia team";
  return CATALOG_BY_KEY[stepKey]?.nameEn ?? stepKey;
}

export function defaultConfig(qty: Record<string, number>) {
  return {
    speakSeconds: 60,
    challengeSeconds: 30,
    defenseSeconds: 60,
    challengesPerDay: 1,
    statusInquiries: 2,
    nightOrder: nightOrderFromQuantities(qty),
  };
}

export type ScenarioPreset = {
  attendeeCount: number;
  narratorCount: number;
  name: string;
  nameEn: string;
  notes: string;
  notesEn: string;
  roles: Record<string, number>;
};

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    attendeeCount: 10,
    narratorCount: 1,
    name: "۱۰ نفره — پدرخوانده و جک",
    nameEn: "10 attendees — Godfather & Jack",
    notes: "سناریوی اصلی مافیا پدرخوانده - جک",
    notesEn: "Core Godfather–Jack table",
    roles: { godfather: 1, saul: 1, matador: 1, watson: 1, leon: 1, kane: 1, constantine: 1, villager: 1, jack: 1 },
  },
  {
    attendeeCount: 11,
    narratorCount: 1,
    name: "۱۱ نفره — کارآگاه به‌جای کین",
    nameEn: "11 attendees — Detective for Kane",
    notes: "شهر+۱ — جاگذاری کارآگاه به‌جای کین",
    notesEn: "Town +1: Detective replaces Kane",
    roles: { godfather: 1, saul: 1, matador: 1, watson: 1, leon: 1, detective: 1, constantine: 1, villager: 2, jack: 1 },
  },
  {
    attendeeCount: 12,
    narratorCount: 1,
    name: "۱۲ نفره — شهردار",
    nameEn: "12 attendees — Mayor",
    notes: "مافیا+۱ — جاگذاری شهردار به‌جای شهر ساده",
    notesEn: "Mafia +1 and Mayor in place of a plain citizen",
    roles: {
      godfather: 1, saul: 1, matador: 1, mafioso: 1,
      watson: 1, leon: 1, kane: 1, constantine: 1, mayor: 1, villager: 1, jack: 1,
    },
  },
  {
    attendeeCount: 13,
    narratorCount: 1,
    name: "۱۳ نفره — لکتر به‌جای ماتادور",
    nameEn: "13 attendees — Lecter for Matador",
    notes: "شهر+۱ — جاگذاری لکتر به‌جای مافیا ساده",
    notesEn: "Town +1: Lecter replaces Matador",
    roles: {
      godfather: 1, saul: 1, lecter: 1, mafioso: 1,
      watson: 1, leon: 1, kane: 1, constantine: 1, mayor: 1, villager: 2, jack: 1,
    },
  },
  {
    attendeeCount: 14,
    narratorCount: 1,
    name: "۱۴ نفره — کارآگاه به‌جای کین",
    nameEn: "14 attendees — Detective for Kane",
    notes: "شهر+۱ — جاگذاری کارآگاه به‌جای کین",
    notesEn: "Town +1: Detective replaces Kane",
    roles: {
      godfather: 1, saul: 1, lecter: 1, mafioso: 1,
      watson: 1, leon: 1, detective: 1, constantine: 1, mayor: 1, villager: 3, jack: 1,
    },
  },
  {
    attendeeCount: 15,
    narratorCount: 2,
    name: "۱۵ نفره — دو راوی",
    nameEn: "15 attendees — Two narrators",
    notes: "دستیار خدا",
    notesEn: "Same as 14, with a host assistant",
    roles: {
      godfather: 1, saul: 1, lecter: 1, mafioso: 1,
      watson: 1, leon: 1, detective: 1, constantine: 1, mayor: 1, villager: 3, jack: 1,
    },
  },
  {
    attendeeCount: 16,
    narratorCount: 2,
    name: "۱۶ نفره — نوستراداموس و تفنگدار",
    nameEn: "16 attendees — Nostradamus & Gunner",
    notes: "نوستراداموس — جاگذاری تفنگدار به‌جای شهر ساده",
    notesEn: "Adds Nostradamus; Gunner replaces a plain citizen",
    roles: {
      godfather: 1, saul: 1, lecter: 1, mafioso: 1,
      watson: 1, leon: 1, detective: 1, constantine: 1, mayor: 1, gunner: 1, villager: 2,
      jack: 1, nostradamus: 1,
    },
  },
  {
    attendeeCount: 17,
    narratorCount: 2,
    name: "۱۷ نفره — ماتادور به‌جای مافیا ساده",
    nameEn: "17 attendees — Matador for Mafioso",
    notes: "شهر+۱ — جاگذاری ماتادور به‌جای مافیا ساده",
    notesEn: "Town +1: Matador replaces a mafioso",
    roles: {
      godfather: 1, saul: 1, lecter: 1, matador: 1,
      watson: 1, leon: 1, detective: 1, constantine: 1, mayor: 1, gunner: 1, villager: 3,
      jack: 1, nostradamus: 1,
    },
  },
  {
    attendeeCount: 18,
    narratorCount: 2,
    name: "۱۸ نفره — پنج مافیا",
    nameEn: "18 attendees — Five Mafia",
    notes: "شهر+۱، مافیا+۱، حذف نوستراداموس",
    notesEn: "Town +1, Mafia +1, Nostradamus out",
    roles: {
      godfather: 1, saul: 1, lecter: 1, matador: 1, mafioso: 1,
      watson: 1, leon: 1, detective: 1, constantine: 1, mayor: 1, gunner: 1, villager: 4,
      jack: 1,
    },
  },
];

export const HOUSE_RULES = [
  {
    titleEn: "Night report",
    bodyEn: "From day two, the host announces night results: deaths and any public reveals.",
    title: "شرح نتایج شب",
    body: "خدا نتیجه عملیات شب (از جمله کشته‌گان و شو شده‌ها) را شرح می‌دهد. از روز دوم.",
  },
  {
    titleEn: "Status inquiry",
    bodyEn: "From day two, if a majority asks, the host says how many living players remain on each side (town, Mafia, independent). Only two inquiries per game.",
    title: "استعلام",
    body: "در صورت اکثریت آرا، خدا تعداد بازیکنان هر ساید را می‌گوید. از روز دوم. فقط ۲ استعلام در بازی.",
  },
  {
    titleEn: "Speaking turn",
    bodyEn: "Each living player gets about 60 seconds to talk, starting on introduction day.",
    title: "صحبت",
    body: "هر بازیکن در نوبت خود فرصت دارد تحلیل و دفاع کند. زمان ۱ دقیقه. از روز معارفه.",
  },
  {
    titleEn: "Challenge",
    bodyEn: "During a speech, a player may take a 30-second challenge. Optional. Max one given and one received per player per day, starting the day after intro.",
    title: "چالش",
    body: "در حین صحبت، فردی می‌تواند ۳۰ ثانیه چالش بگیرد. حداکثر یک چالش برای هر نفر در هر روز.",
  },
  {
    titleEn: "Defense vote",
    bodyEn: "After speeches, players vote who must defend. Threshold is half the living players minus one.",
    title: "رأی دفاع",
    body: "پس از صحبت‌ها رأی می‌دهند چه کسی به دفاع برود. حداقل رأی: نصف منهای ۱.",
  },
  {
    titleEn: "Defense",
    bodyEn: "Defenders get about 60 seconds. If more than one qualifies, a duel option is available.",
    title: "دفاع",
    body: "مدافعان ۱ دقیقه فرصت دارند. در صورت بودن بیشتر از یک مدافع، آپشن دوئل هست.",
  },
  {
    titleEn: "Elimination vote",
    bodyEn: "After defense, vote to eliminate. If the Mayor is in play, this vote is done eyes-closed. One defender: half minus one. Several defenders: highest tally leaves.",
    title: "رأی خروج",
    body: "پس از دفاع، رأی خروج. اگر شهردار باشد با خواب نیمروز. یک مدافع: نصف منهای ۱. چند مدافع: بیشترین رأی خارج می‌شود.",
  },
  {
    titleEn: "Exit cards",
    bodyEn: "A player eliminated by day vote draws a remaining exit card (Beautiful Mind, Silence of the Lambs, Handcuffs, Reveal, Face-off).",
    title: "کارت خروج",
    body: "خارج‌شونده رأی روز از کارت‌های خروج مانده کارت می‌کشد.",
  },
];

export const EXIT_CARDS = [
  ["mind", "ذهن زیبا", "Beautiful Mind", "حدس نقش نوستراداموس، جک، یا طلسم جک.", "Guess Nostradamus, Jack, or Jack’s curse."],
  ["silence", "سکوت بره‌ها", "Silence of the Lambs", "دو نفر را برای روز بعد ساکت می‌کند.", "Silences two players for the next day."],
  ["handcuffs", "دستبند", "Handcuffs", "توانایی یک نفر را برای امشب می‌گیرد.", "Blocks one player’s night ability."],
  ["reveal", "افشای نقش", "Reveal role", "خارج‌شونده باید نقش دقیق خود را بگوید.", "Must announce their exact role."],
  ["face", "تغییر چهره", "Face-off", "کارت خود را مخفیانه با یک حاضر عوض می‌کند.", "Secretly swaps cards with another living player."],
] as const;

export function roleCreates(qty: Record<string, number>) {
  return Object.entries(qty)
    .filter(([, n]) => n > 0)
    .map(([key, quantity]) => {
      const role = CATALOG_BY_KEY[key];
      if (!role?.dealable) throw new Error(`Unknown role ${key}`);
      return {
        key: role.key,
        name: role.name,
        nameEn: role.nameEn,
        faction: role.faction,
        description: role.description,
        descriptionEn: role.descriptionEn,
        quantity,
        nightOrder: role.nightOrder,
      };
    });
}

export function parseRoleQuantities(formData: FormData) {
  const qty: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("qty_")) continue;
    const roleKey = key.slice(4);
    const n = Math.max(0, Number(value) || 0);
    if (CATALOG_BY_KEY[roleKey]?.dealable) qty[roleKey] = n;
  }
  return qty;
}

export function roleImage(key: string) {
  return `/roles/${key}.jpg`;
}

export function playerCount(qty: Record<string, number>) {
  return Object.entries(qty).reduce((sum, [key, n]) => {
    return CATALOG_BY_KEY[key]?.dealable ? sum + n : sum;
  }, 0);
}

export function maxQuantity(key: string) {
  if (key === "host" || key === "assistant") return 1;
  if (key === "villager") return 12;
  if (key === "mafioso") return 6;
  return 1;
}
