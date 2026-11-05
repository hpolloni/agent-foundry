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
npm run check        # format check + lint + typecheck + test (same as CI)
npm run build        # compile every service to dist/
npm run format       # apply Prettier
```

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

## GitHub repository setup

`scripts/setup-repo.sh` applies the rulesets in `.github/rulesets/` to the GitHub repository.
The `protect-master` ruleset blocks direct pushes, force-pushes, and deletion of `master`.
Each change must come through a pull request, and the CI `check` job must pass.

```sh
gh auth login -h github.com        # once; you need admin permission on the repo
scripts/setup-repo.sh --dry-run    # show what will change
scripts/setup-repo.sh              # create or update the rulesets
```

To change a rule, edit the JSON file in a pull request, then run the script again.

## Add a new service

1. Copy `services/example/` to `services/<name>/`.
2. Change `name` in its `package.json` to `@agent-foundry/<name>`.
3. Run `npm install` from the root.
