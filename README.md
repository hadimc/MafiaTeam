# MafiaTeam

Mobile-first companion for organizing and narrating in-person Mafia nights.

## Run

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Seed logins

Password for everyone: `mafia123`

| Username / email | Role |
| --- | --- |
| `hadi` / `hadi@mafiateam.local` | Admin |
| `ali` / `ali@mafiateam.local` | Player |

Registration is invite-only. As admin, open `/admin/users` to invite people, disable accounts, or send a password-reset link. Without SMTP, copy the generated link and send it yourself.

Sample event: `/events/friday-mafia-aug-21` (14 players already registered).

As **hadi**, open the event and tap **توزیع نقش‌ها**. Then:

- Narrator board: `/games/:id/narrator`
- As **ali**, sign in and reveal your private role
