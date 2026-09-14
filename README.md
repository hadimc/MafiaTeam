# MafiaTeam

Mobile-first companion for organizing and narrating in-person Mafia nights.

## Run

```bash
npm install
cp prisma/club.local.example.json prisma/club.local.json
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seed logins

Club members and the shared temp password live in `prisma/club.local.json` (gitignored, not pushed). Copy `prisma/club.local.example.json` and edit it, then seed:

```bash
npx prisma db seed
```

Registration is invite-only. As admin, open `/admin/users` to invite people, disable accounts, or send a password-reset link. With SMTP configured, that button emails the user; a copyable link is still shown as backup. Placeholder `@mafiateam.local` addresses are not emailed.

Sample event: `/events/friday-mafia-aug-21`.

As narrator, open the event, finalize the scenario, then **Deal roles**. Players get a full-screen facedown card (hold to peek). The narrator board is `/games/:id/narrator`.

## License

MafiaTeam is **[PolyForm Noncommercial 1.0.0](LICENSE)**.

You may run and adapt it for a personal or club Mafia night. Keep the license and copyright notice with any copy.

You may **not** sell it, put it on an app store or marketplace, or otherwise use it to make money without a separate commercial license. To request one, [open an issue](https://github.com/hadimc/MafiaTeam/issues).

Do not commit `prisma/club.local.json`, `.env`, or `.env.local` — those stay local.

