# MafiaTeam

Mobile-first companion for organizing and narrating in-person Mafia nights.

## License

MafiaTeam is licensed under **[PolyForm Noncommercial 1.0.0](LICENSE)** ([SPDX](https://spdx.org/licenses/PolyForm-Noncommercial-1.0.0.html)).

You may run, study, and adapt it for a personal or club Mafia night. Keep the license and the `Required Notice` with any copy.

You may **not** sell it, publish it on an app store or marketplace, or otherwise use it commercially without a separate license. To request one, [open an issue](https://github.com/hadimc/MafiaTeam/issues).

## Run

```bash
npm install
cp prisma/club.local.example.json prisma/club.local.json
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo seed login: username `host`, password `ChangeMe123`. The example roster is fictional. Put your own group in `prisma/club.local.json` — that file is gitignored and must not be committed.

Do not commit `.env`, `.env.local`, or SQLite databases either.

## Seed and invites

`npx prisma db seed` loads members from `prisma/club.local.json`. Registration is invite-only. As admin, open `/admin/users` to invite people, disable accounts, or send a password-reset link. With SMTP configured, that button emails the user; a copyable link is still shown as backup. Placeholder `@mafiateam.local` addresses are not emailed.

Sample event: `/events/friday-mafia-aug-21`.

As narrator, open the event, finalize the scenario, then **Deal roles**. Players get a full-screen facedown card (hold to peek). The narrator board is `/games/:id/narrator`.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Direct pushes are for **invited collaborators** only. Everyone else should fork and open a pull request from that fork.
