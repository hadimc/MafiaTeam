# MafiaTeam — App Maker Recipe

Source of truth for rebuilding or extending MafiaTeam. Distilled from the original product spec plus every later product decision.

**What it is:** a mobile-first web app for an invite-only group that organizes in-person Mafia nights (usually 9–18 attendees).

Three jobs:

1. **Organize events** (invite-only club, join/leave, share a link)
2. **Deal roles privately** (hold-to-flip card; nobody else sees your role)
3. **Assist the narrator live** (phone in hand, one/two taps, ordered night/day steps, record only what matters)

Players use it before the game and once to see their card. The **narrator** uses it the whole night. Paper notes should not be needed.

**Success:** a group arrives with phones and eye masks; MafiaTeam handles attendance, scenario, deal, night resolution, public announcements, and winner.

---

## Users and views (not signup roles)

Signup has **no** Admin / Narrator / Player picker.

| Identity | How it is chosen | What they see |
|---|---|---|
| **Member** | Every logged-in user | Member dashboard + event page + own role card |
| **Admin** | `isAdmin` flag; switcher in the header | Completely different context: Users, Events, Scenarios, Rules |
| **Narrator vs Player** | Per event, among **attendees** | `Attendees = Narrator(s) + Players`. One or two narrators. Switch with a button until locked. |

Admin and Member menus must look like a **full context switch**, not two similar tabs.

---

## Language and design

- **App chrome is English LTR**, modern, dark, cinematic, large touch targets.
- **Farsi appears on:** role cards (EN + FA name + one-line EN description), exit cards, some narrator night/day **spoken lines** (small RTL).
- Visual refs: App Store “Mafia Game” / “Mafia Cards” — playing-card feel, not clutter.
- Password fields: show/hide eye icon (login, invite/reset, profile, admin user editor).
- Titles: first-letter capital (`Upcoming Event`, `Club Records`).
- Copy: **Citizen** not Town; **Upcoming Event** not New Event; **Open game** not Open table; **Face-off** not Face change.

---

## Access model

- **Invitation only.** Admin invites; user sets password from a link. Admin can reset, enable/disable.
- Members have a **Profile** page: name, email (needs current password), password change.
- Club roster + temp passwords live in a **gitignored local file** (`prisma/club.local.json`), not in git.
- Roles are **server-enforced**. A player never receives another player’s role payload.

---

## Event lifecycle (setup vs live table)

**Event page = setup.** Live narrator table exists only after deal / `in_progress`.

```
Admin creates event (name, date, optional time/location)
  → shareable URL  /events/{slug}
  → members Join / Leave
  → attendees toggle Narrator ↔ Player  (while scenario is OPEN)
  → narrator picks a scenario matching player count (can edit roles) → Finalize
  → switch Narrator/Player LOCKED  (unless narrator re-opens scenario)
  → narrator Deals / distributes roles
  → players: full-screen facedown card; HOLD to flip (EN+FA, art, one-line)
  → switch Narrator/Player LOCKED hard  (unless narrator stops game and re-opens)
  → narrator Opens Game  → live stage clock
  → Day 0 → Night 0 → Day 1 → Night 1 → …
  → Game Over (winner) → Past Event
```

### Locks

- Scenario open: anyone joined can switch narrator/player.
- Scenario finalized: no switch unless narrator re-opens.
- Cards dealt: no switch; game has started. Stop game + re-open to undo.

**Live updates:** player views must update when narrator finalizes or deals — **no refresh**.

**Roster UI:** compact summary (icons + count) on the event/game view; tap → full list page → back.

**Create event is Admin-only.** Admin shares the event link. Members do not host a create form.

Going **Prev** on stages does **not** undo logs, except: going back from **Day N+1 into Night N undoes that night’s resolution**.

---

## Member dashboard (order)

1. **Upcoming Event** (compact card; join via event)
2. **Records** — one view, toggle Club vs Individual (Individual has extra Wins tile). Four icon tiles.
3. **Past Events** — one button → list page → open an event (results)
4. **Club table** (roster)

Stats: games played, wins by faction, per-user records.

---

## Admin dashboard

Header is the yellow section switcher; **no extra page title**.

- **Users** — CRUD, invite, reset link, enable/disable
- **Events**
  - Button: Create a new event → form
  - Upcoming Events — **must show share link**; Admin can **remove upcoming** (warning)
  - Past Events — Admin can **remove from history** (warning); can **view** (member event view)
- **Scenarios** — CRUD/clone; unique name; tied to an attendee count; multiple scenarios can share the same count
- **Rules** — house rules CRUD

Admin on an event (even if not narrator): **close game**, **change winner** (including after close), **reset** (warning), **open narrator table**.

---

## Scenarios

Not hardcoded. Stored data. Seed presets for **10–18 attendees**. Admin can still CRUD.

Each scenario:

- Name, description, player count
- Roles: name, faction (`Citizen` / `Mafia` / `Independent`), quantity, description, abilities, night order
- Snapshot into the Game at start so later edits do not rewrite history

If a **role is not in the scenario at all**: omit the night/day line entirely.

If the role **is in the scenario** but that player is out and **not publicly revealed**: narrator **still says the line** (do not leak info).

If an **Independent is already publicly out**: skip their night line.

---

## Player role reveal

Full-screen facedown card. **Hold** to flip. Show:

- Role art
- English + Farsi name
- One-line English description
- Faction

After reveal, players generally close the app.

---

## Narrator live UI

Phone-first. Large targets. One/two taps. Structured picks, never free text.

**Inside a game, hide Admin/Member header.** Sticky header is:

`Prev` | **Day N / Night N** | `Next`

Plus **Exit** back to the event/console.

Universal timers only (easy to tap, not tied to a speaker):

- **1 minute**
- **30 seconds**

Do **not** track per-player speaking turns, challenge counts, or vote tallies.

Narrator can always **manually add/remove people from the table** (override the engine). Most night actions have **Cancel** for mis-taps.

Game Over / Reset need **warnings**. After close: winner + high-level stats. Past games keep overall stats.

---

## Stage clock

`Day 0 → Night 0 → Day 1 → Night 1 → Day 2 → …`

### Day 0 (intro)

Speaking only. No night inquiry, no status inquiry, no face-off later that night.

### Night 0 (intro night)

- **No introduction step** as a recorded action
- **No face-off**
- **Jack curse:** record who is cursed; curse **does not take effect yet**. Jack must pick a **new** living player every later night. When the unused list is empty, **reset the cycle** over remaining players. Curse is on the **person**, not the role (face-off does not move the curse).
- **Mafia:** intro only — show like-order; **no clicks**
- **Town:** thumbs-up order, including **simple citizen (شهروند ساده)**; **no clicks**

### Day 1+

Clicks **explain** the step unless recording is listed.

| Step | Record? | Notes |
|---|---|---|
| Night result (Day 2+) | View | Public: who leaves / who returns. Private night-end report has **why**. Independents leaving are named. |
| Status inquiry (Day 2+) | Record that it was used | Max **2** per game. Report counts of out Mafia / Citizen / Independent. |
| Speaking & Challenge | No | Merged one step. 1 min speak / 30s challenge. Optional; max one challenge per person per day from Day 1. |
| Day shot | If used | Optional gun; bullet is spent either way. |
| Defense vote | No vote counts | Threshold conceptually: half minus 1. |
| Defense | No | 1 min. Multi-defender → devil option. |
| Elimination vote | No vote counts | If Mayor in game: midday sleep (eyes closed). One defender: half minus 1. Multi: highest out. |
| Mayor coupon | **Yes** | One coupon all game: cancel the vote or force one exit. After use, hide this step later days. |
| Exit lottery | If tie | Full-screen Blue/Green hold-to-flip. |
| Exit card | If someone exits by vote | Full-screen EN+FA card; drawn card leaves the deck. |
| Remove players | **Yes** | Tap who leaves. Ability leaves with them. |

### Night 1+

**Face-off:** not on Night 0. At most **one** per night: pick **one outside** + **one inside**; swap roles. Cancel **same night only**; later nights do not show it. Jack curse stays on the person.

**Mafia** (narrator recites the full mafia script if those roles exist in scenario, to avoid leaking who is seated):

- **Main action — exactly one of:** Shot **or** Sixth Sense (only if Godfather alive) **or** Purchase (only if Saul alive)
- Lecter save (if Lecter in game / alive)
- Matador disable (if Matador in game / alive)

**Sixth Sense:** `Cancel` / `Wrong` / `Correct`. **Correct** removes the guessed player at night end (narrator-confirmed). Pending pick removes nobody. If Godfather is out, Sixth Sense is unavailable.

**Town** (record where noted):

- Watson save — record target. **Self-save once** (then they drop off the self-save list). Others unlimited.
- Leon shot — record target; **Cancel** allowed. Do not resolve instantly.
- Kane mark — **one coupon**. Citizen: coupon spent, nothing else. Mafia: Kane leaves **the following night**. Cancel exists.
- Constantine / gunner / etc. per scenario
- Detective night: **wake line only**, no inquiry record

**Ability steal:** if Mafia takes a citizen’s ability that night, that player **cannot act**; show it clearly on that player.

---

## Night resolution (end of night, not on each click)

Removals are computed **at night end**. Watson can still save a mafia shot. Narrator can override.

Private **Night Result** at end of night: why anyone leaves or returns (catch mistakes).

Public **Day briefing**: only who leaves / who returns. If an Independent left, name them.

**Leon shot outcomes** (engine, overridable):

| Target | Result |
|---|---|
| Citizen | Leon leaves |
| Godfather with shield | shield stripped |
| Jack | nothing |
| Zodiac with shield | shield stripped |
| Mafia/Zodiac without shield | they leave unless Lecter saved |

**Lecter:** self-save **once**, like Watson.

**Kane:** citizen mark = spent; mafia mark = Kane out **next night**.

**Jack:** if Jack is **already out**, removing the curse victim does **not** put Jack on Would Leave again.

When Godfather leaves → no Sixth Sense. When Saul leaves → no Purchase. Same pattern for other role-gated actions.

---

## Win / close

Configurable, but house default:

- **Citizens** win when all Mafia and Independent (if any) are out.
- **Mafia** win when Independent is out **and** mafia count ≥ citizen count.
- **Independent** win is scenario-specific (survive vs remaining sides).

Narrator confirms Game Over + winner. Admin can close, change winner, or reset (warnings). Past event: high-level stats.

---

## What the original spec asked for that this product dropped

Keep these out unless someone explicitly brings them back:

- Per-player speaking queue + auto-advance + challenge usage tracking
- Recording defense/elimination **vote numbers**
- Auto-forced phase machine (narrator always confirms Next/Prev)
- Signup role picker
- Member-created events
- PostgreSQL (this club is tiny; SQLite on a volume is enough)
- Full bilingual app chrome (English chrome, Farsi on cards/lines only)

Keep from the original spec: invitation club, shareable event URL, scenario-as-data, role snapshot, private reveal, narrator companion, public vs private night reports, undo/cancel, server-side role secrecy, mobile-first dark cinematic UI.

---

## Stack (as built)

- Next.js + React + TypeScript + Tailwind
- Prisma + **SQLite**
- Simple hashed credentials
- Deploy: **Fly.io**, always-on small VM (cold start otherwise ~20s), SQLite on a volume
- Club size: ~20 people, ~1 game/month

---

## Prompt-by-prompt product changelog

Use this if an agent needs *why* a rule exists:

1. **Foundation spec** — organize, deal, narrate; Admin / Player / Narrator; events; scenarios; timers; votes; exit cards; night log; morning script; win engine; RTL; dark cinematic.
2. **Admin first** — user CRUD, invite-only, reset, enable/disable; then rules/scenarios.
3. **English chrome** — only cards (later also some narrator lines) in Farsi.
4. **Identity split** — Admin vs Member views; narrator/player is per event; attendees = narrators + players.
5. **Scenarios from spreadsheet** — presets by player count; admin CRUD; clone/edit roles.
6. **Member home** — Join, past events, club/individual stats.
7. **Pre-game flow** — join/leave; toggle narrator; finalize; deal; hold-to-flip; live refresh; compact roster; local gitignored club file.
8. **Locks** — finalize locks switch; deal locks harder; re-open to unlock.
9. **Narrator stages** — Day 0 / Night 0 / Day 1… from the house day/night task list (Farsi source).
10. **Timers** — only global 1:00 and 0:30.
11. **Night 0** — no intro action; record Jack curse without effect; mafia/town likes only.
12. **Days** — no vote capture; Mayor coupon; full-screen lottery + exit cards; then remove-players.
13. **Day 2+** — night report + 2 inquiries.
14. **Face-off** — one inside + one outside; Night 1+ only; cancel same night.
15. **Night engine** — one mafia main action; Watson/Leon/Kane/Lecter rules; resolve at night end; narrator override; skip missing-role lines; keep lines for hidden-out roles.
16. **Ability gating** — GF out → no sixth sense; Saul out → no purchase; stolen ability → that player skips the night.
17. **Admin ops** — create events only; share upcoming links; remove upcoming and past; close/change winner/reset; no member New Event.
18. **Dashboard polish** — upcoming/records/past/club order; mixed record tiles; compact upcoming card; Citizen naming.
19. **Night refinements** — Lecter self-save once; detective no night click; Kane delay; independents skip line; sixth sense Cancel/Wrong/Correct; Jack already-out no re-remove.
20. **Member profile** + password show/hide.
21. **Host** — small always-on Fly app; seed scenarios/rules/users (first names); import past Aug 9 games.
