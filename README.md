# agent-foundry

A reference repository for a software development workflow with three AI agents in [Claude Code](https://claude.com/claude-code): a **taskmaster**, a **builder**, and a **reviewer**.

Use it in one of two ways:

- Start a new project from this repository. The agents, the quality gates, and the GitHub rules are ready to use. See [Use this repository as a template](#use-this-repository-as-a-template).
- Copy the workflow into an existing project. Copy `.claude/agents/` and `.github/labels.json`, and add the rules that your project needs to its `CLAUDE.md`.

The code in `services/` is a small example service (TypeScript, Fastify, Zod). It is not the product. It gives the agents a real project with strict checks to work on.

## The workflow

Each agent runs in a separate Claude Code session. The sessions share only GitHub and git. Thus the reviewer does not know the assumptions that the builder made, and it must verify the change from the issue, the code, and the tests.

| Agent      | Mandate                                                                                                     | Can change code | Start it with                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------ |
| taskmaster | Reads the issues, adds acceptance criteria, sets priorities, and tells you what builders do next.           | No              | `claude --agent taskmaster`                            |
| builder    | Does one issue in its own worktree. Opens a pull request and continues until all CI checks pass.            | Yes             | `claude --agent builder -w issue-12 "work on #12"`     |
| reviewer   | Does an independent review of a pull request (posts on GitHub) or a local branch (reports in the terminal). | No              | `claude --agent reviewer -w review-14 "review PR #14"` |

The mandates are in [`.claude/agents/`](.claude/agents/). They are generic: they point to `CLAUDE.md` for the commands and rules of the project.

### One issue, from start to merge

1. You write an issue, or ask the taskmaster to write one.
2. The taskmaster adds acceptance criteria, a priority (`P1`, `P2`, `P3`), and the label `ready`.
3. A builder takes the `ready` issue with the highest priority and changes its label to `in-progress`. It works in its own worktree, so many builders can work in parallel.
4. The builder opens a pull request with `Closes #N` and waits until the `check`, `integration`, and `mutation` jobs pass.
5. The reviewer reviews the pull request and sets the label `changes-requested` or `agent-approved`. On `changes-requested`, the builder fixes the findings and the reviewer reviews again.
6. A person reviews and merges the pull request. No agent merges.

The agents use your GitHub account, and GitHub does not let an author approve their own pull request. Thus the reviewer posts comment reviews and shows its verdict with a label. Your approval stays the real approval.

### Why the guardrails matter

Agents work without supervision only when the repository enforces the rules. This repository enforces them in three places:

- `CLAUDE.md` gives the rules to every agent session.
- `npm run check`, the git hooks, and CI find errors: format, lint, strict types, complexity, coverage, and mutation score.
- The `protect-default-branch` ruleset blocks a merge without a pull request and passing CI jobs.

Session worktrees (`claude -w`) are in `.claude/worktrees/`. Git, Prettier, and ESLint ignore that directory.

## Layout

| Path                    | Content                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `services/example/`     | Example HTTP service (Fastify + Zod)                        |
| `tsconfig.base.json`    | Shared strict TypeScript settings. All services extend it.  |
| `eslint.config.js`      | Shared lint rules (`typescript-eslint` strict-type-checked) |
| `.github/workflows/`    | CI: format, lint, type check, test, build                   |
| `.claude/agents/`       | Mandates of the taskmaster, builder, and reviewer agents    |
| `.github/labels.json`   | Issue and pull request labels that the agents use           |
| `scripts/setup-repo.sh` | Applies the GitHub settings, rulesets, and labels           |

## Prerequisites

- Node.js 24 (see `.nvmrc`)
- npm 11.21.2 or later in 11.x (see `devEngines` in `package.json`). To upgrade: `npm install -g npm@11`

## Commands

Run these from the repository root.

```sh
npm install          # install all workspaces
npm run check        # format check + lint + typecheck + unit tests with coverage gate
npm run test:integration  # build, then test the real server process (CI runs it on PRs)
npm run test:mutation     # mutation testing with Stryker (CI runs it on PRs)
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

### Quality gates

`npm run check` and CI fail when one of these gates fails:

| Gate                  | Limit                                                      | Configured in                      |
| --------------------- | ---------------------------------------------------------- | ---------------------------------- |
| Cyclomatic complexity | 10 or less for each function (ESLint `complexity` rule)    | `eslint.config.js`                 |
| Unit test coverage    | 90% or more for lines, statements, functions, and branches | `services/<name>/vitest.config.ts` |

- `npm run test:coverage` runs the unit tests with coverage. `npm run test` runs them without coverage, so a run of one test file does not fail the gate.
- Coverage includes `src/**/*.ts` except `src/server.ts`. Only the integration tests cover `src/server.ts`.
- HTML report: `services/<name>/coverage/index.html`.

### Mutation testing

`npm run test:mutation` runs [Stryker](https://stryker-mutator.io/) on `services/*/src`. Stryker makes small changes (mutants) to the code and runs the unit tests for each one. A mutant that no test detects shows a test gap.

- CI runs it on pull requests only, as the `mutation` job. It is not in the git hooks. CI has no incremental file, so it tests all mutants.
- Fails if the mutation score is below 80%.
- The TypeScript checker removes mutants that do not compile, so strict types do not raise the score.
- Incremental: a second run tests only mutants in changed code. A full run takes approximately 20 s, an incremental run approximately 5 s.
- `src/server.ts` is not mutated. Only the integration tests cover it.
- HTML report: `services/<name>/reports/mutation/index.html`.

## GitHub repository setup

`scripts/setup-repo.sh` applies the GitHub settings that are stored in this repository:

| File                         | Applies                                                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/repo-settings.json` | Repository settings. Now: delete the head branch after each merge.                                                                                                               |
| `.github/labels.json`        | Labels for the agent workflow. An existing label with the same name is updated.                                                                                                  |
| `.github/rulesets/*.json`    | Rulesets. `protect-default-branch` requires a pull request with passing `check`, `integration`, and `mutation` jobs, and blocks force-pushes and deletion of the default branch. |

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
