---
work_package_id: WP07
title: Verification tooling
dependencies:
- WP01
- WP03
requirement_refs:
- FR-019
- C-002
- C-007
planning_base_branch: feat/byo-gtm-container
merge_target_branch: feat/byo-gtm-container
branch_strategy: Planning artifacts for this mission were generated on feat/byo-gtm-container. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/byo-gtm-container unless the human explicitly redirects the landing branch.
subtasks:
- T029
- T030
- T031
- T032
- T033
- T034
phase: Phase 4 - Verification
history:
- at: '2026-10-29T22:01:50Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: scripts/
create_intent:
- scripts/lib/secret-scan.ts
- scripts/verify-container.ts
- playwright.config.ts
- e2e/fixtures.ts
- e2e/smoke.spec.ts
execution_mode: code_change
model: ''
owned_files:
- scripts/lib/secret-scan.ts
- scripts/no-secrets.ts
- scripts/verify-container.ts
- playwright.config.ts
- e2e/fixtures.ts
- e2e/smoke.spec.ts
- package.json
- pnpm-lock.yaml
- tsconfig.json
- .gitignore
- AGENTS.md
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP07 – Verification tooling

## ⚡ Do This First: Load Agent Profile

Use the `/spk-charter-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `implementer-ivan`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## ⚠️ IMPORTANT: Review Feedback

- **Has review feedback?** Check the `review_ref` field in the event log (`spec-kitty agent tasks status --mission byo-gtm-container-01M64PAZ`) or the Activity Log below.
- **You must address all feedback** before your work is complete.
- **Report progress** in the Activity Log as you address each item.

---

## Markdown Formatting

Wrap HTML/XML tags in backticks. Use language identifiers in code blocks.

---

## Objectives & Success Criteria

Give the mission its proof machinery without weakening anything (plan IC-05, research R-08, R-10):

1. **Secret scanner made importable, not weakened** (FR-019): move `scanText` into `scripts/lib/secret-scan.ts`; `no-secrets.ts` behaves byte-for-byte the same.
2. **`pnpm verify:container`** (non-gate): the pure choice rules, at least 10 malformed IDs (SC-003), expiry and tamper cases, and proof that the scanner still flags a real-looking ID built at run time and accepts `GTM-XXXXXXX`.
3. **Playwright and axe** as dev-only dependencies (approved by Charter 1.1.0, WP01), with the five supply-chain controls re-checked against the real lockfile.
4. **`playwright.config.ts`** building to the gitignored `.e2e-dist/` with a run-time shop ID; **`e2e/fixtures.ts`** shared by WP08 to WP10: googletagmanager.com intercepted and counted, every other external request blocked.
5. **`AGENTS.md`** records the new commands, dependencies and the explicit browser install.

**Done when**: `pnpm gates` passes with unchanged no-secrets output; `pnpm verify:container` prints only `ok` lines; `pnpm exec playwright install chromium` then `pnpm test:e2e` runs the smoke spec green with zero external requests; the lockfile adds only the expected packages.

## Context & Constraints

- **Read first**: `research.md` R-08 (supply chain table and controls 1–5, contested findings A-1 to A-4), R-10 (test design without real IDs), `quickstart.md`, plan "Technical Context" (`Testing` line), `contracts/container-choice.md`.
- **Gates are unchanged** (QDR-003): don't add `test:e2e` or `verify:container` to `scripts/gates.ts` or CI.
- **Secrets (FR-019, QDR-004)**: no container-ID-shaped literal except `GTM-XXXXXXX` in any tracked file. The scanner regex is `\bGTM-[A-Z0-9]{4,10}\b` (case-sensitive). Build every other ID at run time, for example `['GTM', 'SHOPE2E'].join('-')`, or `'GTM-' + suffix`. Malformed examples like `GTM-` followed by something ending in punctuation can **still match** the scanner (the word boundary sits before the punctuation), so build those at run time too.
- **Supply chain** (`pnpm-workspace.yaml`): `minimumReleaseAge: 10080`, `onlyBuiltDependencies: []` stays empty. CI uses `--frozen-lockfile`. Browser binaries: an explicit command only, never in `install`/`prepare`/CI/gates (A-1).
- **Existing style**: `scripts/verify-scenarios.ts` is the model for `verify-container.ts` (a `checks` array, `ok <name>` / `not ok <name>: <message>`, exit 1 on any failure). `scripts/lib/report.ts` has `finding`, `finish`, `mask`.
- **`eslint.config.js`** is owned by WP03, which already ignores `.e2e-dist/**`, `test-results/**`, `playwright-report/**` and `blob-report/**`. If that's missing when you start, tell the reviewer; don't edit it here.
- Node 24 runs `.ts` scripts directly (type stripping): erasable syntax only, `.ts` import extensions.

## Branch Strategy

- **Planning base branch**: `feat/byo-gtm-container`
- **Final merge target**: `feat/byo-gtm-container`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP07 --agent <name> --mission byo-gtm-container-01M64PAZ
```

---

## Subtasks & Detailed Guidance

### Subtask T029 – Extract `scanText` into `scripts/lib/secret-scan.ts`

**Purpose**: `verify:container` needs to call the real scanner, not a copy (R-10).

**Steps**:

1. **Before** touching anything, capture baselines: `node scripts/no-secrets.ts` and `node scripts/no-secrets.ts --history`, stderr and exit code, into scratch files outside the repo.
2. Create `scripts/lib/secret-scan.ts` and move into it, unchanged: `GTM_ALLOWLIST`, the `Pattern` interface, the `patterns` array. Export:

   ```ts
   export const GTM_ALLOWLIST = 'GTM-XXXXXXX';
   /** Returns one finding text per match, formatted exactly as no-secrets prints it. */
   export function scanText(location: string, text: string): string[];
   ```

   Each returned string is exactly what `finding` received before: `` `${location}:${lineNumber} ${pattern.name} (${mask(matched)})` `` (import `mask` from `./report.ts`).
3. `no-secrets.ts`: import `scanText`; at each former call site, `for (const text of scanText(location, content)) finding('no-secrets', text);`. Nothing else changes: same file walk, same ranges, same `--history`, same `finish`.
4. Re-run both commands and diff against the baselines; they must be identical. Record in the Activity Log.

**Watch out**: the patterns use the `g` flag with `matchAll` (fine, no shared `lastIndex`). `requireKeyword` has no `g`; keep it that way, or `.test` becomes stateful across calls.

### Subtask T030 – `scripts/verify-container.ts`

**Purpose**: Fast, deterministic proof of the rules (SC-003, FR-011, FR-012 logic, FR-019).

**Steps**:

1. Imports: `node:assert/strict`, `node:crypto` (`randomInt`), everything public from `../site/src/container/active-container.ts`, and `scanText`, `GTM_ALLOWLIST` from `./lib/secret-scan.ts`.
2. ID builders (no literals):

   ```ts
   const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
   function suffix(length: number): string { /* randomInt over ALNUM */ }
   function containerId(length = 7): string {
     let id: string;
     do { id = ['GTM', suffix(length)].join('-'); } while (id === GTM_ALLOWLIST);
     return id;
   }
   ```

3. Checks (each a named entry; mirror `verify-scenarios.ts` output):

   | Name | Asserts |
   |---|---|
   | `constants` | key `demo-shop:visitor-container`; lifetime `86_400_000`; pattern source `^GTM-[A-Z0-9]{4,10}$` |
   | `well-formed IDs accepted` | lengths 4, 7, 10; digits-only and letters-only suffixes |
   | `malformed IDs refused (≥10)` | at least these, all built at run time: too short (`'GTM-' + suffix(3)`), too long (`'GTM-' + suffix(11)`), lower-case prefix (`'gtm-' + suffix(6)`), lower-case suffix, wrong prefix (`'UA-' + digits`), GA4 shape (`'G-' + suffix(8)`), leading space, trailing space, inner space, hyphen inside suffix, trailing `!`, underscore separator, no separator, empty string; plus non-strings `null`, `undefined`, `123`, `{}`. Assert the count is ≥ 10 |
   | `parse: valid and boundary` | `savedAt = now` → ID; `now - lifetime + 1` → ID; `now - lifetime` → null; `now + 1` → null |
   | `parse: tampered` | `null`, `''`, `'junk'`, `'null'`, `'[]'`, `'42'`, extra key, missing key, `savedAt` string, `savedAt` `1.5`, `savedAt` `NaN` (via raw JSON text `{"id":"…","savedAt":null}`), lower-case id → all null |
   | `serialise round-trip` | `parseSavedContainer(serialiseSavedContainer(id, now), now) === id`; key order `id`, `savedAt` |
   | `choose: matrix` | (valid raw, ok, shop) → visitor, no removal; (junk raw, ok, shop) → shop, removal; (junk, ok, no shop) → none, removal; (null, ok, shop) → shop, no removal; (valid raw, **storage not ok**, shop) → shop, no removal; (any, ok, malformed shop id) → none |
   | `scanner still flags a real-looking ID` | `scanText('fixture', \`id: ${containerId()}\`)` has length 1 and its text contains `gtm-container-id` and the masked form (first 4 chars then `*`) |
   | `scanner accepts the placeholder` | `scanText('fixture', GTM_ALLOWLIST)` is empty |
   | `rules file is self-contained` | read `site/src/container/active-container.ts` as text: no line starting with `import`; no `location.`/`referrer`/`URLSearchParams` |

4. Exit non-zero if any check fails.
5. `package.json` script: `"verify:container": "node scripts/verify-container.ts"`.

**Validation**: `pnpm verify:container` → all `ok`. Then deliberately break one thing in a scratch copy (for example change `<` to `<=` in the lifetime check) and confirm a `not ok` line, then revert.

### Subtask T031 – Dev dependencies and supply-chain record

**Purpose**: DIRECTIVE_051 controls, re-checked against the real lockfile (R-08 "The review of the dependency work package re-checks controls 4 and 5").

**Steps**:

1. `pnpm add -D @playwright/test@1.64.1 @axe-core/playwright@4.14.0`. `package.json` gets caret ranges, as the other dev deps have. **No** runtime dependency.
2. Review `git diff pnpm-lock.yaml`. The only expected new packages are `@playwright/test`, `playwright`, `playwright-core`, `@axe-core/playwright`, `axe-core` and the optional `fsevents`. Anything else → stop, record it, ask the Product Owner (QDR-006).
3. Record for each package: the resolved tarball host (must be `registry.npmjs.org`) and `integrity` from the lockfile.
4. Run `pnpm audit` and check the GitHub Advisory Database for these exact versions (for example `gh api "/advisories?ecosystem=npm&affects=playwright@1.64.1"`, and the same for each package). Record the results.
5. Confirm no install scripts ran (`pnpm install` output shows no lifecycle scripts; `onlyBuiltDependencies` still `[]`).
6. `pnpm install --frozen-lockfile` passes from clean.

### Subtask T032 – `playwright.config.ts`, `e2e/fixtures.ts`, `e2e/smoke.spec.ts`

**Purpose**: One place for the run-time IDs, the GTM stub and the helpers that WP08 to WP10 use.

**Steps**:

1. `e2e/fixtures.ts` exports:

   ```ts
   export const SHOP_CONTAINER_ID = ['GTM', 'SHOPE2E'].join('-');
   export const visitorContainerId = (tag = 'VISIT01'): string => ['GTM', tag].join('-');
   export const STORAGE_KEY = 'demo-shop:visitor-container';
   export const LIFETIME_MS = 86_400_000;
   export const PAGES = ['/', '/product/', '/basket/', '/checkout/', '/thank-you/'] as const;

   export function savedValue(id: string, savedAt: number): string; // JSON.stringify({ id, savedAt })

   export interface GtmRecorder {
     readonly ids: string[];      // `id` query of each gtm.js request, in order
     readonly external: string[]; // any other blocked external URL
     reset(): void;
   }

   export const test: TestType<…>; // base.extend with an auto `gtm` fixture
   export { expect } from '@playwright/test';

   export async function seedSaved(page: Page, gtm: GtmRecorder, value: string): Promise<void>;
   export async function blockStorage(page: Page): Promise<void>;      // addInitScript making the localStorage getter throw
   export async function pushedEntries(page: Page): Promise<unknown[]>; // window.dataLayer minus entries whose event starts with 'gtm.'
   export async function openMenu(page: Page): Promise<void>;          // click "Demo menu", wait for the panel
   ```

2. The `gtm` fixture uses `context.route('**/*', …)`:
   - `127.0.0.1` / `localhost` → `route.continue()`;
   - `https://www.googletagmanager.com/gtm.js?…` → push `new URL(url).searchParams.get('id')` to `ids`; `route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })`;
   - anything else → push to `external`; `route.abort()`.

   No real network, ever (A-3).
3. `seedSaved`: `goto('/')`, `page.evaluate(([k, v]) => localStorage.setItem(k, v), [STORAGE_KEY, value])`, then `gtm.reset()`, so the next navigation's requests are counted alone.
4. `blockStorage`: `page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError'); } }); })`. This runs before the inline head script.
5. `playwright.config.ts`:
   - `testDir: 'e2e'`, `outputDir: 'test-results'`, `reporter: 'list'`, `retries: 0`, `forbidOnly: !!process.env.CI`, `use.baseURL: 'http://127.0.0.1:4173'`, `trace: 'retain-on-failure'`.
   - Projects: `chromium` (Desktop Chrome, `testIgnore: /container\.spec\.ts/`) and `container-x10` (Desktop Chrome, `testMatch: /container\.spec\.ts/`, **`repeatEach: 10`**, NFR-001).
   - `webServer`: build to `.e2e-dist` with `VITE_GTM_CONTAINER_ID` = `SHOP_CONTAINER_ID` (import it from `./e2e/fixtures.ts`), then `vite preview` on `127.0.0.1:4173 --strictPort`. **Vite resolves `--outDir` relative to the Vite root (`site/`)**, so compute an absolute path (`resolve(import.meta.dirname, '.e2e-dist')`), quote it in the command, and check the output really lands in `<repo>/.e2e-dist/`. Use `vite build` directly (skip `tsc`). `reuseExistingServer: false`, `timeout: 120_000`.
6. `e2e/smoke.spec.ts`: `/` loads; `gtm.ids` equals `[SHOP_CONTAINER_ID]`; `gtm.external` is empty; `<html data-container-source="shop">`.

### Subtask T033 – `tsconfig.json`, `.gitignore`, `test:e2e`

**Steps**:

1. `tsconfig.json` `include` gains `"e2e/**/*.ts"` and `"playwright.config.ts"`. `pnpm build` runs `tsc --noEmit`, so these now type-check. Fix any errors in your files; strict options stay on.
2. `.gitignore` under "# Demo shop": `.e2e-dist/`, `test-results/`, `playwright-report/`, `blob-report/`.
3. `package.json` script: `"test:e2e": "playwright test"`.
4. `pnpm lint` must pass on `e2e/**` and `playwright.config.ts` (type-checked rules apply; await every promise).

### Subtask T034 – `AGENTS.md`

**Steps**:

1. Dev dependencies table: add `@playwright/test` and `@axe-core/playwright` with resolved versions, and a line: "Approved as dev-only, non-gate tooling by Charter 1.1.0 (`DM-01M64TAJ14KYVH94V2RCQPC8AY`)."
2. Commands table: rows for `pnpm verify:container` (choice rules, malformed IDs, expiry and tamper, scanner still fires; not a gate) and `pnpm test:e2e` (Playwright + axe; googletagmanager.com stubbed; builds to `.e2e-dist/`; not a gate).
3. A short **Browser install** paragraph: `pnpm exec playwright install chromium`, run by hand once per machine. It downloads from Playwright's CDN, outside the lockfile, and is never run by `install`, CI or the gates.
4. Supply chain section: one sentence noting the five controls were re-checked at install (date, `pnpm audit` result, advisory check result).
5. Secrets and IDs section: "Tests build container IDs at run time; the only ID-shaped literal in the repo is `GTM-XXXXXXX`."

---

## Definition of Done

- [ ] no-secrets output identical before and after (both modes), recorded.
- [ ] `pnpm verify:container` green; a deliberate break shows `not ok`.
- [ ] Lockfile adds only the expected packages; audit and advisory results recorded.
- [ ] Smoke spec green; `external` empty.
- [ ] `.e2e-dist/` and test output folders ignored and not committed.
- [ ] `AGENTS.md` updated.
- [ ] `pnpm gates` passes.
- [ ] `spec-kitty agent tasks mark-status T029 T030 T031 T032 T033 T034 --status done --mission byo-gtm-container-01M64PAZ`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Scanner behaviour changes in the refactor | Baseline diff in T029 |
| An ID-shaped literal in a test or fixture | Run-time builders only; the gate catches the rest |
| Unexpected transitive packages | T031 step 2; stop and escalate |
| Browser download during install | Explicit command only; documented |
| `.e2e-dist` lands under `site/` | Absolute path; verify location |

## Review Guidance

- Diff `scripts/no-secrets.ts`: only the extraction; same output (ask for the baseline diff).
- Read `pnpm-lock.yaml` additions yourself (controls 4 and 5).
- Grep the new files for `GTM-` followed by an upper-case letter or digit: only `GTM-XXXXXXX` may appear.

## Activity Log

- 2026-10-29T22:01:50Z – system – Prompt generated via /spec-kitty.tasks
