---
work_package_id: WP01
title: Tooling foundation
dependencies: []
requirement_refs:

- C-003

- C-009

- FR-023

planning_base_branch: feat/demo-shop
merge_target_branch: feat/demo-shop
branch_strategy: Planning artifacts for this mission were generated on feat/demo-shop. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/demo-shop unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-demo-shop-01M5QW5Y
base_commit: f0231ff2967f510e15867234cfbd5b9c586874e4
created_at: '2026-10-24T22:22:50.673353+00:00'
subtasks:

- T001

- T002

- T003

- T004

- T005

- T006

phase: Phase 1 - Setup
history:

- at: '2026-10-24T21:50:34Z'

  actor: system

  action: Prompt generated via /spec-kitty.tasks

agent_profile: node-norris
authoritative_surface: package.json
create_intent:

- package.json

- pnpm-workspace.yaml

- pnpm-lock.yaml

- .node-version

- tsconfig.json

- eslint.config.js

- AGENTS.md

- site/src/globals.d.ts

execution_mode: code_change
model: ''
owned_files:

- package.json

- pnpm-workspace.yaml

- pnpm-lock.yaml

- .node-version

- tsconfig.json

- eslint.config.js

- .gitignore

- AGENTS.md

- site/src/globals.d.ts

role: implementer
tags: []
task_type: implement
tracker_refs: []
---



# Work Package Prompt: WP01 – Tooling foundation



## ⚡ Do This First: Load Agent Profile



Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter (or any user-defined profile), and behave according to its guidance before parsing the rest of this prompt.



- **Profile**: `node-norris`

- **Role**: `implementer`

- **Agent/tool**: `claude`



If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.



---



## ⚠️ IMPORTANT: Review Feedback



- **Has review feedback?** Check the `review_ref` field in the event log (`spec-kitty agent tasks status --mission demo-shop-01M5QW5Y`) or the Activity Log below.

- **You must address all feedback** before your work is complete. Feedback items are your TODO list.

- **Report progress** in the Activity Log as you address each item.



---



## Markdown Formatting



Wrap HTML/XML tags in backticks: `` `<div>` ``, `` `<script>` ``. Use language identifiers in code blocks.



---



## Objectives & Success Criteria



Set up the fixed toolchain the Charter allows (C-009, decisions `…6ARX` and `…01ZF4`) so that every later WP works the same way:



- `pnpm install --frozen-lockfile` succeeds on a clean clone using **pnpm 10** (pinned by `packageManager`) on **Node 24 LTS** (pinned by `.node-version` and `engines`).

- Dev dependencies are exactly: `vite`, `typescript`, `eslint`, `@eslint/js`, `typescript-eslint`, `@types/node`. **No runtime dependencies.** Nothing else (no tsx, husky, gitleaks, test framework, prettier).

- `pnpm lint` (`eslint .`) and `pnpm exec tsc --noEmit` both exit 0 on this WP's tree.

- Every R-08 lint rule is demonstrated to fire on a scratch file (which is then deleted, never committed).

- `AGENTS.md` records the tooling, the installed versions and the exact gate commands verbatim from `contracts/gates-cli.md` (FR-023).

- No GTM container ID, key or secret-like value appears in any file (C-003).



## Context & Constraints



Read before starting:



- `.kittify/charter/charter.md`: QDR-001 (provenance), QDR-002 (approved stack), QDR-003 (minimal gates), QDR-004 (no secrets), Terminology Canon.

- `kitty-specs/demo-shop-01M5QW5Y/plan.md`: Technical Context, Project Structure, IC-01.

- `kitty-specs/demo-shop-01M5QW5Y/research.md`: R-08 (lint rules), R-11 (runner/hook), supply-chain table.

- `kitty-specs/demo-shop-01M5QW5Y/contracts/gates-cli.md`: the command table you copy into `AGENTS.md`.

- Decision `DM-01M5QYJ3YM1435E0GJEG301ZF4`: `@types/node` is allowed as a type-only dev dependency.



Key constraints:



- **Node runs `.ts` files directly** via native type stripping (gate scripts in WP02, `verify-scenarios.ts` in WP04). So TypeScript must be **erasable-only** (no `enum`, no `namespace`, no parameter properties), type-only imports must use `import type`, and relative imports must carry the `.ts` extension. The tsconfig enforces this.

- The repo root contains Spec Kitty material (`.kittify/`, `kitty-specs/`, `.claude/`, `.github/agents/`) and **lane worktrees under `.worktrees/`**. Lint and type-check must not crawl any of it.

- Terminology: in comments and docs say "Attribute" for a key in a pushed event, never "parameter", "property" or "field" for domain concepts.



## Branch Strategy



- **Strategy**: Planning artifacts were generated on feat/demo-shop; completed changes must merge back into feat/demo-shop.

- **Planning base branch**: feat/demo-shop

- **Merge target branch**: feat/demo-shop

- Execution worktrees are allocated per computed lane from `lanes.json`; start with `spec-kitty agent action implement WP01 --agent claude`.



## Subtasks & Detailed Guidance



### Subtask T001 – `package.json`, `.node-version`, `packageManager`, scripts



- **Purpose**: Pin the runtime and package manager, and declare every script the contracts name so later WPs only add files.

- **Steps**:

  1. Create `.node-version` with the current Node **24** LTS version (e.g. `24.15.0`; check with `node --version` and the Node release schedule; do not move to Node 26 before the talk, per research).

  2. Create `package.json`:

     - `"name": "quadrano-demo-shop"`, `"private": true`, `"type": "module"`.

     - `"engines": { "node": ">=24 <25" }`.

     - `"packageManager": "pnpm@10.<minor>.<patch>"`: the newest pnpm **10.x** release that is at least 7 days old and **≥ 10.16** (the release that introduced `minimumReleaseAge`). Verify with `npm view pnpm@10 version --json` and `npm view pnpm time --json`.

     - `"scripts"` exactly as below (from `contracts/gates-cli.md` and plan):

       ```json

       {

         "dev": "vite",

         "build": "tsc --noEmit && vite build",

         "preview": "vite preview",

         "lint": "eslint .",

         "gates": "node scripts/gates.ts",

         "verify:scenarios": "node scripts/verify-scenarios.ts",

         "prepare": "git config core.hooksPath .githooks"

       }

       ```

     - No `dependencies` key. `devDependencies` are added by T002.

  3. Activate the pinned pnpm: `corepack enable` then `corepack prepare --activate` (or rely on pnpm's own `manage-package-manager-versions`). Confirm `pnpm --version` prints 10.x **inside the repo**. The machine's global pnpm is 12.x, so this check matters.

- **Files**: `package.json`, `.node-version` (new).

- **Notes**:

  - `gates` and `verify:scenarios` point at files created by WP02 and WP04, so running them now fails with "module not found". That is expected.

  - `vite` / `vite build` will not succeed until WP06 adds `vite.config.ts` and pages. That is also expected; do not add placeholder pages (they would collide with WP06's ownership).

  - `prepare` runs on `pnpm install` and sets `core.hooksPath` for the whole repository, including every worktree. `.githooks/` does not exist until WP02, so git simply finds no hook. Record this in the Activity Log.



### Subtask T002 – `pnpm-workspace.yaml` supply-chain settings, install dev deps, lockfile



- **Purpose**: Install the dev toolchain safely (directive 051 / research supply-chain table).

- **Steps**:

  1. Create `pnpm-workspace.yaml` **before** installing:

     ```yaml

     # Supply-chain settings (research.md, supply-chain table). Single-package repo; no packages: list.

     minimumReleaseAge: 10080   # minutes = 7 days; refuse versions younger than this

     onlyBuiltDependencies: []  # no dependency lifecycle scripts; add esbuild only if Vite proves to need it

     ```

     If your pnpm 10 version rejects a workspace file without `packages`, add `packages: ['.']`, or put the settings where pnpm 10 documents them, and note which in `AGENTS.md`.

  2. Check there is no `.npmrc` adding registries. If you create one, it must not add registries or tokens.

  3. Install by exact package name (watch for typosquats; it is `typescript-eslint`, not a look-alike):

     ```bash

     pnpm add -D vite typescript eslint @eslint/js typescript-eslint @types/node

     ```

     Let `minimumReleaseAge` pick versions. Pin `@types/node` to the **24.x** line (`@types/node@24`). Do not hand-edit versions to anything younger than 7 days.

  4. Confirm `pnpm install` printed no "ignored build scripts" warning for a package you need. Current esbuild ships platform binaries as optional dependencies and needs no postinstall. If `vite` fails later because esbuild's postinstall was blocked, add `esbuild` to `onlyBuiltDependencies` and record it in `AGENTS.md` (research A7).

  5. Commit `pnpm-lock.yaml`. CI uses `--frozen-lockfile`.

- **Files**: `pnpm-workspace.yaml`, `pnpm-lock.yaml` (new); `package.json` (devDependencies).

- **Validation**: `pnpm install --frozen-lockfile` on a fresh clone succeeds; `pnpm ls --depth 0` lists exactly the six packages.



### Subtask T003 – `tsconfig.json`



- **Purpose**: One type-check configuration for `site/src`, `scripts` and `vite.config.ts` that also enforces Node-strippable syntax.

- **Steps**: Create `tsconfig.json` along these lines (adjust only with a recorded reason):

  ```jsonc

  {

    "compilerOptions": {

      "target": "ES2023",

      "lib": ["ES2023", "DOM", "DOM.Iterable"],

      "module": "ESNext",

      "moduleResolution": "bundler",

      "types": ["node", "vite/client"],

      "strict": true,

      "noUncheckedIndexedAccess": true,

      "exactOptionalPropertyTypes": true,

      "noImplicitOverride": true,

      "noFallthroughCasesInSwitch": true,

      "verbatimModuleSyntax": true,

      "erasableSyntaxOnly": true,

      "allowImportingTsExtensions": true,

      "noEmit": true,

      "isolatedModules": true,

      "skipLibCheck": true

    },

    "include": ["site/src/**/*.ts", "scripts/**/*.ts", "vite.config.ts"]

  }

  ```

- **Notes**:

  - `erasableSyntaxOnly` needs TypeScript ≥ 5.8; the installed version will be newer.

  - With only `site/src/globals.d.ts` present (T005), `tsc --noEmit` has an input and passes. Without it, tsc errors with "No inputs were found", which is the reason T005 exists here.

  - `vite.config.ts` is listed even though WP06 creates it. A missing include pattern match is not an error.

  - `eslint.config.js` stays out of tsc; ESLint handles it with type-checking disabled (T004).

- **Parallel?**: Yes, with T004/T005.



### Subtask T004 – `eslint.config.js` with R-08 rules, each proven to fire



- **Purpose**: Close FR-017 (no shop verdicts / no Console), FR-016 (single `dataLayer` writer) and NFR-004 (no extra network) **by construction** (research R-08).

- **Steps**:

  1. Flat config in `eslint.config.js` (ESM, since `"type": "module"`), using `@eslint/js` recommended plus `typescript-eslint` `recommendedTypeChecked` with `parserOptions.projectService: true` and `tsconfigRootDir: import.meta.dirname`.

  2. **Global ignores** (first config object, `ignores` only): `dist/**`, `node_modules/**`, `.worktrees/**`, `.kittify/**`, `kitty-specs/**`, `.claude/**`, `.github/**`, `.agents/**`, `kitty-ops/**`, and every other tool directory listed in `.gitignore`'s Spec Kitty block that could contain JS. **`.worktrees/` is critical**: without it, `eslint .` in the main checkout lints every lane worktree.

  3. Apply `tseslint.configs.disableTypeChecked` to `**/*.js` (i.e. `eslint.config.js` itself).

  4. Rules scoped to `site/**/*.ts`:

     - `no-console: "error"` (FR-017).

     - `no-restricted-syntax` with these selectors:

       - String literals: `Literal[value=/[✓✗⚠✅❌]|\b(pass(ed|es)?|fail(ed|s|ure)?|valid|invalid)\b/i]`, message "Shop text must not contain verdict wording (FR-017)".

       - Template literals: `TemplateElement[value.raw=/…same…/i]`, same message.

       - Network APIs: `CallExpression[callee.name='fetch']`, `NewExpression[callee.name='XMLHttpRequest']`, `NewExpression[callee.name='WebSocket']`, `NewExpression[callee.name='EventSource']`, `MemberExpression[property.name='sendBeacon']`, message "No network requests from shop code (NFR-004)".

     - `no-restricted-globals` / `no-restricted-properties`: forbid `dataLayer` (global) and `window.dataLayer` / `globalThis.dataLayer` property access, message "Only site/src/datalayer/push.ts may touch dataLayer (FR-016)".

     - `no-restricted-imports`: forbid `node:*` and bare Node built-ins in `site/` (browser code).

  5. An override for `site/src/datalayer/push.ts` only that turns the `dataLayer` restrictions **off** (keep the console and verdict rules on).

  6. Rules for `scripts/**/*.ts`: recommended type-checked only. `no-console` stays **off** there because gate scripts print.

- **Prove each rule fires** (Charter: "a check that can never fail is removed"). Create a scratch file such as `site/src/__lint_probe.ts` containing one violation per rule: `console.log(1)`; a string with a verdict tick character; a string containing the word `failed`; a template literal with `invalid`; `fetch('/x')`; `navigator.sendBeacon('/x')`; `window.dataLayer`; `import fs from 'node:fs'`. Run `pnpm lint`, confirm each produces its error, paste the rule IDs into the Activity Log, then **delete the probe file**. Also confirm the same `window.dataLayer` line in a scratch `site/src/datalayer/push.ts` is allowed, then delete it too, because WP04 owns that file.

- **Files**: `eslint.config.js` (new).

- **Notes**: The verdict regex intentionally does not ban the word "correct", which is a scenario label.



### Subtask T005 – `.gitignore` additions and `site/src/globals.d.ts`



- **Purpose**: Keep build output, env files and dependencies out of git (QDR-004), and give tsc a first input.

- **Steps**:

  1. **Append** a new section to the end of `.gitignore`. Do not edit the Spec Kitty auto-managed block:

     ```gitignore

     # Demo shop

     node_modules/

     dist/

     .vite/

     .env

     .env.*

     *.log

     ```

     `.env.*` covers `.env.local`, which developers may use for a local container ID (R-01).

  2. Create `site/src/globals.d.ts` declaring the global data layer type, so `push.ts` (WP04) can type it without `any`:

     ```ts

     // The GA4-style data layer. Created by the inline head script on every page before GTM loads (FR-002).

     // Only site/src/datalayer/push.ts writes to it (FR-016, enforced by lint).

     interface Window {

       dataLayer?: unknown[];

     }

     ```

     If `verbatimModuleSyntax`/isolated modules complain, add `export {};` and wrap in `declare global { … }`.

- **Validation**: `git status` after `pnpm install` shows no `node_modules/`; `pnpm exec tsc --noEmit` exits 0.



### Subtask T006 – `AGENTS.md`



- **Purpose**: FR-023 requires the tooling and exact gate commands to be visible in the repo (Charter "fixed at specification time").

- **Steps**: Create `AGENTS.md` with these sections (plain English, short):

  1. **Stack**: Node 24 LTS (`.node-version`), pnpm 10 (`packageManager`), Vite multi-page (root `site/`, output `dist/`), TypeScript (erasable-only, run directly by Node for scripts), ESLint flat config. List the six dev dependencies **with the installed versions** from the lockfile. State that there are no runtime dependencies, and that anything new needs a Charter amendment (QDR-002/QDR-007). Reference decisions `…6ARX` and `…01ZF4`.

  2. **Commands**: copy the table from `contracts/gates-cli.md` verbatim (`pnpm lint`, `pnpm build`, `pnpm gates`, `pnpm gates --pre-push`, `pnpm gates --ci`, `pnpm verify:scenarios`, `pnpm preview`) plus `pnpm dev`.

  3. **Gates**: order lint → build → no-secrets → provenance; pre-push hook via `core.hooksPath` (set by `prepare`); never use `--no-verify`; CI workflow `.github/workflows/gates.yml`.

  4. **Secrets and IDs**: the GTM container ID exists only as the Cloudflare Pages build variable `VITE_GTM_CONTAINER_ID`. For local runs, use a gitignored `.env.local`. The only container-ID-shaped string allowed in the repo is the documentation placeholder `GTM-XXXXXXX`.

  5. **Provenance denylist**: `QUADRANO_DENYLIST_PATH`, else `~/.quadrano/provenance-denylist.txt`. It is never in the repo, and the gate fails without it. In CI it comes from the `PROVENANCE_DENYLIST` secret.

  6. **Supply chain**: `minimumReleaseAge` 7 days, `onlyBuiltDependencies: []` (and any later addition with reason), lockfile committed, CI `--frozen-lockfile`, Actions pinned by SHA.

  7. **Deploy**: Cloudflare Pages Git integration. Production branch `main`, build `pnpm build`, output `dist`. `main` changes only by PR with the gates check green (decision `…5JXSCJ`).

  8. **Code rules**: `.ts` import extensions; erasable syntax only; only `site/src/datalayer/push.ts` touches `dataLayer`; no Console output or verdict wording in `site/`; Terminology Canon ("Attribute").

- **Files**: `AGENTS.md` (new).

- **Notes**: Do not name any prior venture or third-party private source anywhere (QDR-001). Keep it factual; WP07 may append first-deploy findings.



## Definition of Done



- [ ] `.node-version`, `package.json` (scripts exactly as T001), `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.json`, `eslint.config.js`, `site/src/globals.d.ts`, `AGENTS.md` committed; `.gitignore` section appended.

- [ ] `pnpm --version` in the repo is 10.x; `node --version` is 24.x.

- [ ] Exactly six dev dependencies, zero runtime dependencies.

- [ ] `pnpm lint` and `pnpm exec tsc --noEmit` exit 0.

- [ ] Activity Log lists each R-08 rule ID observed firing on the deleted probe file.

- [ ] No probe or scratch files committed; no container-ID-shaped or secret-like strings anywhere.



## Risks & Mitigations



| Risk | Mitigation |

|---|---|

| Global pnpm 12 used instead of pinned pnpm 10, producing a lockfile in the wrong format | Check `pnpm --version` inside the repo before installing; use corepack |

| `eslint .` lints `.worktrees/` and is extremely slow or fails | Global ignore for `.worktrees/**` (T004 step 2) |

| Type-aware lint fails on `eslint.config.js` | `disableTypeChecked` for `**/*.js` |

| `minimumReleaseAge` picks nothing for a brand-new major | Accept the older version it picks; never bypass |

| `prepare` changes repo-wide git config | Expected and documented (plan R-11); no hooks exist until WP02 |



## Review Guidance



- Diff `package.json` scripts against `contracts/gates-cli.md`, character for character.

- Confirm no extra dependencies and no `dependencies` block.

- Run `pnpm lint` yourself with a one-line `console.log` in a scratch `site/src/x.ts` to confirm FR-017 enforcement, then delete it.

- Confirm `AGENTS.md` versions match `pnpm-lock.yaml`.

- Charter checklist items 3 (provenance), 4 (no secrets), 7 (terminology).



## Activity Log



> Entries in chronological order (oldest first). Append only. Format: `- YYYY-MM-DDTHH:MM:SSZ – <agent_id> – <action>`. Timestamp from `date -u "+%Y-%m-%dT%H:%M:%SZ"`.



- 2026-10-24T21:50:34Z – system – Prompt created.

