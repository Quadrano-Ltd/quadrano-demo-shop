---
work_package_id: WP03
title: Container choice rules and storage
dependencies:
- WP01
requirement_refs:
- FR-006
- FR-011
- FR-012
- FR-013
- C-001
- C-005
planning_base_branch: feat/byo-gtm-container
merge_target_branch: feat/byo-gtm-container
branch_strategy: Planning artifacts for this mission were generated on feat/byo-gtm-container. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/byo-gtm-container unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-byo-gtm-container-01M64PAZ
base_commit: 4790f1d1bd4897f523c6d6548d41cdcedd85c825
created_at: '2026-10-29T23:00:51.231936+00:00'
subtasks:
- T008
- T009
- T010
- T011
- T012
phase: Phase 2 - Foundation
history:
- at: '2026-10-29T22:01:50Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: site/src/container/
create_intent:
- site/src/container/active-container.ts
- site/src/container/visitor-storage.ts
execution_mode: code_change
model: ''
owned_files:
- site/src/container/active-container.ts
- site/src/container/visitor-storage.ts
- eslint.config.js
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP03 – Container choice rules and storage

## ⚡ Do This First: Load Agent Profile

Use the `/spk-charter-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
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

Write the single source of truth for "which container does this page load?" and a storage wrapper that never throws.

- `site/src/container/active-container.ts`: **pure** rules, **self-contained** (no imports), because WP04 inlines its source into every page's `<head>` and WP06 imports it as a module. Public surface exactly as `contracts/container-choice.md` lists.
- `site/src/container/visitor-storage.ts`: `probe()`, `save(id)`, `clear()`, each returning a result instead of throwing (research R-04). **No in-memory fallback.**
- `eslint.config.js`: forbid reading the page address in `site/src/container/**` (research R-05, FR-013), and ignore the e2e output folders that WP07 introduces.

**Done when**: `pnpm lint` and `pnpm build` pass; a quick Node run of the pure functions (T010 validation) gives the documented answers; `active-container.ts` contains no `import`, and only top-level `export const`, `export function` and `export type` declarations.

## Context & Constraints

- **Read first**: `contracts/container-choice.md` (public surface, "Not allowed"), `data-model.md` ("Saved container ID", "Active container"), `research.md` R-01 (rules for the file), R-02, R-03 (validity), R-04 (storage failure), R-05 (address never chooses).
- **Requirements**: FR-006 (pattern), FR-011 (24 h expiry), FR-012 (storage failure falls back), FR-013 and C-005 (address can never set a container), C-001 (browser only).
- **Code rules** (`AGENTS.md`): relative imports carry `.ts`; erasable syntax only (no `enum`, `namespace`, parameter properties); no Console output and no verdict wording in `site/` (lint). Verdict wording means the symbols ✓ ✗ ⚠ ✅ ❌ and the words pass(ed/es), fail(ed/s/ure), valid, invalid, **in string literals and templates**. Identifiers are fine, but avoid these words in strings and error messages.
- **The basket's `site/src/shop/storage.ts` is deliberately not reused**: it is `sessionStorage` with an in-memory fallback. A memory-only save would look as if it worked, and the next page would load the shop's container (R-04).
- **Secrets (FR-019)**: no container-ID-shaped literal except `GTM-XXXXXXX` in any file, including comments. When you try the functions, build IDs at run time: `['GTM', 'ABC123'].join('-')`.
- WP04 consumes `active-container.ts` by reading its **source text**. Anything you write there runs inline in `<head>` before any module.

## Branch Strategy

- **Planning base branch**: `feat/byo-gtm-container`
- **Final merge target**: `feat/byo-gtm-container`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP03 --agent <name> --mission byo-gtm-container-01M64PAZ
```

---

## Subtasks & Detailed Guidance

### Subtask T008 – Constants and `isContainerId`

**Purpose**: One definition of the key, pattern and lifetime, shared by the head loader, the menu and the checks.

**Steps**:

1. Create `site/src/container/active-container.ts` with a header comment explaining: self-contained by design; inlined into `<head>` by the `quadrano-gtm` plugin; no imports; no references to names outside the file other than ECMAScript built-ins (`JSON`, `Object`, `Number`, `Array`); never reads the page address.
2. Constants:

   ```ts
   export const VISITOR_CONTAINER_KEY = 'demo-shop:visitor-container';
   export const CONTAINER_ID_PATTERN = /^GTM-[A-Z0-9]{4,10}$/;
   export const SAVED_ID_LIFETIME_MS = 86_400_000; // 24 h (FR-011)
   ```

3. Guard:

   ```ts
   /** True only for an ID entered exactly as GTM shows it (no trimming, no case change). */
   export function isContainerId(value: unknown): value is string {
     return typeof value === 'string' && CONTAINER_ID_PATTERN.test(value);
   }
   ```

   The regex has no `g` flag, so `.test` has no `lastIndex` state. Keep it that way.

**Notes**:
- Do not trim or upper-case. `gtm-abc123` is refused by design (spec Edge Cases).
- Type predicates (`value is string`) are erasable; fine.

### Subtask T009 – `parseSavedContainer` and `serialiseSavedContainer`

**Purpose**: Turn a raw stored string into "the visitor's ID" or "absent", never throwing (R-03).

**Steps**:

1. `serialiseSavedContainer(id: string, now: number): string` returns `JSON.stringify({ id, savedAt: now })`. Key order `id`, then `savedAt`.
2. `parseSavedContainer(raw: string | null, now: number): string | null`. Return the ID only if **all** hold, otherwise `null`:
   - `raw` is a string;
   - `JSON.parse(raw)` succeeds (wrap in `try/catch`; return `null` on throw);
   - the result is a non-null object and not an array;
   - it has **exactly** the keys `id` and `savedAt` (`Object.keys(obj).length === 2` and both present as own keys);
   - `isContainerId(obj.id)`;
   - `Number.isInteger(obj.savedAt)` (this also rules out `NaN`, `Infinity`, strings);
   - `const age = now - obj.savedAt; age >= 0 && age < SAVED_ID_LIFETIME_MS`.

   A value dated in the future (`age < 0`) is absent: it can't be used to dodge expiry.

3. Keep it readable; a sequence of early `return null` is fine.

**Edge cases to have in mind** (WP07's `verify:container` will check them; try them yourself now):

| Raw | Result |
|---|---|
| `null` | `null` |
| `''`, `'not json'`, `'null'`, `'[]'`, `'42'` | `null` |
| well-formed, `savedAt = now` | the ID |
| well-formed, `savedAt = now - SAVED_ID_LIFETIME_MS + 1` | the ID |
| well-formed, `savedAt = now - SAVED_ID_LIFETIME_MS` | `null` (exactly 24 h is expired) |
| well-formed, `savedAt = now + 1` | `null` |
| extra key (`{"id":…,"savedAt":…,"x":1}`) | `null` |
| `savedAt` as string or `1.5` | `null` |
| lower-case `id` | `null` |

### Subtask T010 – `chooseContainer`

**Purpose**: The pure decision the head loader runs once per page (data-model state diagram).

**Steps**:

1. Signature, exactly as the contract:

   ```ts
   export type ContainerSource = 'visitor' | 'shop' | 'none';

   export function chooseContainer(input: {
     raw: string | null;
     storageOk: boolean;
     shopId: string | null;
     now: number;
   }): { source: ContainerSource; id: string | null; removeSaved: boolean };
   ```

2. Logic:

   ```ts
   const shop = isContainerId(input.shopId) ? input.shopId : null;
   if (input.storageOk && input.raw !== null) {
     const visitor = parseSavedContainer(input.raw, input.now);
     if (visitor !== null) {
       return { source: 'visitor', id: visitor, removeSaved: false };
     }
     return shop !== null
       ? { source: 'shop', id: shop, removeSaved: true }
       : { source: 'none', id: null, removeSaved: true };
   }
   return shop !== null
     ? { source: 'shop', id: shop, removeSaved: false }
     : { source: 'none', id: null, removeSaved: false };
   ```

   - `storageOk === false` never removes and never picks the visitor (R-04).
   - The shop ID is re-checked with the pattern, so a malformed build-time value can never reach a URL.
   - The visitor may enter the shop's own ID; that is a normal visitor ID (spec Edge Cases). Exactly one container still loads.

3. **Self-containment checklist** for the whole file:
   - [ ] no `import` statement;
   - [ ] only top-level `export const`, `export function`, `export type`; no `export default`, no `export { … }` lists, no re-exports;
   - [ ] no reference to `window`, `document`, `localStorage`, `location`, `history`, `navigator` (the loader glue in WP04 does storage and DOM; this file stays pure);
   - [ ] no `</script` sequence anywhere, including comments;
   - [ ] no helper that a bundler might rename across files.

**Validation** (scratch, not committed): with Node 24's type stripping,

```bash
node --input-type=module -e "
const m = await import('./site/src/container/active-container.ts');
const id = ['GTM', 'ABC123'].join('-');
const now = Date.now();
console.log(m.chooseContainer({ raw: m.serialiseSavedContainer(id, now), storageOk: true, shopId: null, now }));
console.log(m.chooseContainer({ raw: 'junk', storageOk: true, shopId: ['GTM','SHOP1'].join('-'), now }));
console.log(m.chooseContainer({ raw: null, storageOk: false, shopId: null, now }));
"
```

Expect `visitor` with the ID; `shop` with `removeSaved: true`; `none` with `removeSaved: false`.

### Subtask T011 – `visitor-storage.ts`

**Purpose**: The only module that writes the saved ID. Every function catches everything, because in some locked-down browsers even reading the `window.localStorage` property throws (R-04).

**Steps**:

1. Create `site/src/container/visitor-storage.ts`:

   ```ts
   import {
     VISITOR_CONTAINER_KEY,
     isContainerId,
     serialiseSavedContainer,
   } from './active-container.ts';

   const PROBE_KEY = 'demo-shop:storage-probe';

   /** Write, read back and remove a probe key. False on any throw or mismatch. */
   export function probe(): boolean { … }

   /** Save a container ID with the current time. Caller has checked isContainerId(id). */
   export function save(id: string): 'saved' | 'unavailable' { … }

   /** Remove the saved ID. */
   export function clear(): 'cleared' | 'unavailable' { … }
   ```

2. `probe()`: inside one `try`, get `window.localStorage`, `setItem(PROBE_KEY, token)`, `getItem` and compare, `removeItem`. Return the comparison. `catch { return false; }`.
3. `save(id)`:
   - if `!isContainerId(id)`, `throw new Error('save expects a container ID')`: a programming error, as `toAmount` does in `events.ts`. The menu (WP06) never calls it otherwise.
   - inside `try`: `const value = serialiseSavedContainer(id, Date.now())`, `setItem`, then `getItem(VISITOR_CONTAINER_KEY) === value ? 'saved' : 'unavailable'`.
   - `catch { return 'unavailable'; }`.
4. `clear()`: inside `try`: `removeItem`, then `getItem(...) === null ? 'cleared' : 'unavailable'`; `catch { return 'unavailable'; }`.
5. No module-level state, no memory fallback, no Console output, no address access.

**Notes**:
- Error text must avoid verdict words (lint). "save expects a container ID" is fine.
- This file **may** import (it is never inlined). It must still not read the address (T012's lint covers the folder).

### Subtask T012 – ESLint override and ignores

**Purpose**: Make FR-013 mechanically enforced in this folder (R-05; Charter 1.1.0 mechanism), and keep lint from scanning e2e build output.

**Steps**:

1. In `eslint.config.js`, add `'.e2e-dist/**'`, `'test-results/**'`, `'playwright-report/**'` and `'blob-report/**'` to the top-level `ignores` array (WP07 creates these folders; ignoring them now avoids a later edit to this file).
2. Add a config object for `files: ['site/src/container/**/*.ts']`. **Important**: in flat config, a later object's rule *replaces* the earlier object's options for the same rule; it doesn't merge. So this object must **repeat** the `dataLayer` restrictions and add the new ones:

   ```js
   const addressRestrictionMessage =
     'The page address never chooses a container (FR-013, C-005)';

   {
     files: ['site/src/container/**/*.ts'],
     rules: {
       'no-restricted-globals': [
         'error',
         ...dataLayerRestrictions['no-restricted-globals'].slice(1),
         { name: 'location', message: addressRestrictionMessage },
         { name: 'URLSearchParams', message: addressRestrictionMessage },
         { name: 'URL', message: addressRestrictionMessage },
       ],
       'no-restricted-properties': [
         'error',
         ...dataLayerRestrictions['no-restricted-properties'].slice(1),
         { object: 'window', property: 'location', message: addressRestrictionMessage },
         { object: 'document', property: 'location', message: addressRestrictionMessage },
         { object: 'document', property: 'URL', message: addressRestrictionMessage },
         { object: 'document', property: 'documentURI', message: addressRestrictionMessage },
         { object: 'document', property: 'referrer', message: addressRestrictionMessage },
         { object: 'globalThis', property: 'location', message: addressRestrictionMessage },
       ],
     },
   },
   ```

   Place it **after** the `site/**/*.ts` block so it wins for this folder.

3. Prove the rule fires: temporarily add `const x = location.search;` to `visitor-storage.ts`, run `pnpm lint`, see the FR-013 message, then remove it. Also confirm a temporary `window.dataLayer` reference in the folder still errors with the FR-016 message (proves you didn't drop the existing restriction). Record both in the Activity Log.

**Validation**:
- [ ] `pnpm lint` passes on the real files.
- [ ] Both temporary probes produced the expected errors and were removed.

---

## Definition of Done

- [ ] `active-container.ts` and `visitor-storage.ts` exist with the contract's public surface.
- [ ] Self-containment checklist (T010) satisfied.
- [ ] Lint override present and proven; ignores added.
- [ ] `pnpm gates` passes.
- [ ] No ID-shaped literal except `GTM-XXXXXXX`.
- [ ] `spec-kitty agent tasks mark-status T008 T009 T010 T011 T012 --status done --mission byo-gtm-container-01M64PAZ`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| An `import` or outside reference sneaks into `active-container.ts` and breaks the head loader | T010 checklist; WP04's build guard fails loudly |
| Lint override silently drops the `dataLayer` restriction for the folder | Repeat the restriction; T012 step 3 proves it |
| Exactly-24-hours boundary off by one | `age < SAVED_ID_LIFETIME_MS` (strict); table in T009 |
| A future-dated value dodges expiry | `age >= 0` check |
| `localStorage` getter throws | Every access inside `try` |

## Review Guidance

- Diff the exported names and signatures against `contracts/container-choice.md` exactly.
- Read `active-container.ts` as if it were plain JS pasted into a `<script>`: would it run alone?
- Check `chooseContainer` against the data-model state diagram, all four paths.
- Check no file in `site/src/container/` reads the address.

## Activity Log

- 2026-10-29T22:01:50Z – system – Prompt generated via /spec-kitty.tasks
