# agent-foundry

Monorepo for agent-foundry services. TypeScript on Node.js 24, with strict type checks.

## Layout

| Path                 | Content                                                     |
| -------------------- | ----------------------------------------------------------- |
| `services/example/`  | Example HTTP service (Fastify + Zod)                        |
| `tsconfig.base.json` | Shared strict TypeScript settings. All services extend it.  |
| `eslint.config.js`   | Shared lint rules (`typescript-eslint` strict-type-checked) |
| `.github/workflows/` | CI: format, lint, type check, test, build                   |

## Prerequisites

- Node.js 24 (see `.nvmrc`)
- npm 11

## Commands

Run these from the repository root.

```sh
npm install          # install all workspaces
npm run check        # format check + lint + typecheck + unit tests
npm run test:integration  # build, then test the real server process (CI runs it on PRs)
npm run build        # compile every service to dist/
npm run format       # apply Prettier
```

## Git hooks

`npm install` installs two git hooks with `simple-git-hooks`:

| Hook       | Runs                                                     | Time      |
| ---------- | -------------------------------------------------------- | --------- |
| pre-commit | Prettier and ESLint on staged files only (`lint-staged`) | 1 to 3 s  |
| pre-push   | `npm run check`: format, lint, typecheck, and all tests  | 5 to 10 s |

The hooks help you find errors before CI. They do not enforce the rules. CI enforces them.
To skip a hook in an emergency, use `git commit --no-verify` or `git push --no-verify`.
If you change the hook configuration in `package.json`, run `npm run prepare`.

## Example service

```sh
cp services/example/.env.example services/example/.env
npm run dev -w @agent-foundry/example          # http://localhost:3000, reloads on change
curl localhost:3000/healthz
curl -X POST localhost:3000/v1/greetings -H 'content-type: application/json' -d '{"name":"Ada"}'
```

### Endpoints

| Method | Path            | Description                     |
| ------ | --------------- | ------------------------------- |
| GET    | `/healthz`      | Liveness probe                  |
| GET    | `/readyz`       | Readiness probe                 |
| POST   | `/v1/greetings` | Example validated JSON endpoint |

### Configuration

| Variable    | Default   | Description                       |
| ----------- | --------- | --------------------------------- |
| `HOST`      | `0.0.0.0` | Bind address                      |
| `PORT`      | `3000`    | Listen port                       |
| `LOG_LEVEL` | `info`    | Pino log level (`silent` to mute) |

The service validates configuration at startup and exits on an invalid value.

## Tests

| Suite       | Location                       | How it works                                             | Runs in                                              |
| ----------- | ------------------------------ | -------------------------------------------------------- | ---------------------------------------------------- |
| Unit        | `services/*/test/*.test.ts`    | In-process, with `app.inject()`. No network.             | `npm run check`, CI (all)                            |
| Integration | `services/*/test/integration/` | Starts `dist/server.js` on a free port. Real HTTP calls. | `npm run test:integration`, CI on pull requests only |

## GitHub repository setup

`scripts/setup-repo.sh` applies the GitHub settings that are stored in this repository:

| File                         | Applies                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/repo-settings.json` | Repository settings. Now: delete the head branch after each merge.                                                                                                  |
| `.github/rulesets/*.json`    | Rulesets. `protect-default-branch` requires a pull request with passing `check` and `integration` jobs, and blocks force-pushes and deletion of the default branch. |

```sh
gh auth login                      # once; you need admin permission on the repo
scripts/setup-repo.sh --dry-run    # show what will change
scripts/setup-repo.sh              # apply the settings and rulesets
```

The script finds the GitHub repository from the `origin` remote, so it works in any copy of this repository. To choose a different repository, use `--repo OWNER/NAME`.
The script is safe to run more than once. To change a setting or a rule, edit the JSON file in a pull request, then run the script again.
Rulesets need a public repository or a paid plan. On a private repository on GitHub Free, the script skips the rulesets with a warning.

## Use this repository as a template

1. Copy the repository, or use it as a GitHub template.
2. Change `name` in the root `package.json`. Change the `@agent-foundry/` scope in `services/*/package.json`, `README.md`, and `CLAUDE.md`.
3. Run `npm install` to update `package-lock.json` and install the git hooks.
4. Push to GitHub, then run `scripts/setup-repo.sh`.

CI and the ruleset use the default branch of the new repository. Both `main` and `master` work without changes.

## Add a new service

1. Copy `services/example/` to `services/<name>/`.
2. Change `name` in its `package.json` to `@agent-foundry/<name>`.
3. Run `npm install` from the root.
