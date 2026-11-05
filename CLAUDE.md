# CLAUDE.md

## Project

npm workspaces monorepo. Each service is in `services/<name>/`. TypeScript 6.0 on Node.js 24, ESM only.

## Commands (run from the repository root)

- `npm run check`: format check, lint, typecheck, and test. Run it before you finish any change.
- `npm run dev -w @agent-foundry/example`: run the example service with reload.
- `npm run format`: fix formatting.
- `npm run test:mutation`: Stryker mutation testing, local only. Run it after you add or change logic in `src/`. A surviving mutant means a missing test: add the test. Do not lower the 80% threshold.
- Git hooks: pre-commit runs `lint-staged`; pre-push runs `npm run check`. Do not use `--no-verify`. Fix the failure.
- After `npm install <pkg>`, make sure that `package-lock.json` still lists `@rolldown/binding-*` for all platforms. If they are gone (npm bug 4828), delete `node_modules` and `package-lock.json`, then run `npm install`.
- `npm run test:integration`: build, then start the real server and test it over HTTP. CI runs it on pull requests only. Run it locally when you change `src/server.ts`, `src/config.ts`, or startup and shutdown code.

## Git workflow

- Never commit or push directly to `master`. All changes go through a pull request.
- Create a branch from an up-to-date `master` for each change. Use a short kebab-case name.
- Keep one topic in each pull request.
- Before you open a pull request, make sure that `npm run check` passes. For startup or shutdown changes, also run `npm run test:integration`.
- The pull request description must have a summary and a test plan.
- Wait for the CI `check` and `integration` jobs to pass. Do not merge a pull request with a failed check.
- Do not merge pull requests. A person reviews and merges them.

## Type-safety rules

- Do not weaken `tsconfig.base.json` or `eslint.config.js` to make a change pass.
- Do not use `any`, non-null assertions (`!`), `@ts-ignore`, or `@ts-nocheck`. Use `unknown` and narrow it.
- Validate all external input (HTTP, env, files, queues) with a Zod schema. Derive types with `z.infer`.
- Define Fastify routes with Zod schemas for `body`, `params`, `querystring`, and `response`.
- Indexed access returns `T | undefined` (`noUncheckedIndexedAccess`). Handle the `undefined` case.

## Conventions

- Relative imports use the `.ts` extension (for example `./config.ts`). `tsc` rewrites them to `.js` at build time.
- Only erasable TypeScript syntax (`erasableSyntaxOnly`): no `enum`, no `namespace`, no parameter properties. Node runs `src/*.ts` directly in dev.
- `buildApp()` in `src/app.ts` must not listen on a port. Tests use `app.inject()`.
- Pin dependency versions exactly (`npm install --save-exact`).
- TypeScript stays on 6.0.x until `typescript-eslint` supports 7.x.
