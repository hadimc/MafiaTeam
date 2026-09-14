# Contributing

Thanks for wanting to help. This repo is public to read and fork. Direct access to the origin is invite-only.

## Who can do what

| You are | How you contribute |
|---|---|
| **Invited collaborator / maintainer** | Push a branch on this repo and open a pull request. Maintainers review and merge. |
| **Everyone else** | [Fork](https://github.com/hadimc/MafiaTeam/fork) the repo, push to **your fork**, then open a pull request against `main`. Do not expect write access on this repository. |

Do not open a PR from a clone of `hadimc/MafiaTeam` unless you were invited as a collaborator. GitHub will reject pushes from accounts that are not collaborators.

## Maintainers

Maintainers are invited people who review PRs, triage issues, and keep `main` healthy. They are listed in [CODEOWNERS](.github/CODEOWNERS).

If you want to be a collaborator, ask a maintainer — do not add yourself.

## Pull requests

1. Branch from up-to-date `main`.
2. Keep the change focused. Match the style of nearby files.
3. Do not commit secrets: `prisma/club.local.json`, `.env`, `.env.local`, SQLite databases, or real club rosters.
4. Use the fictional demo roster in `prisma/club.local.example.json` for screenshots and seed data.
5. Open the PR against `hadimc/MafiaTeam` `main`. Fork PRs should use **compare across forks**.

## Local run

```bash
npm install
cp prisma/club.local.example.json prisma/club.local.json
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Demo login after seed: `host` / `ChangeMe123`.

## License

Contributions are accepted under [PolyForm Noncommercial 1.0.0](LICENSE). Commercial or marketplace use of this project still needs a separate license from the copyright holder.
