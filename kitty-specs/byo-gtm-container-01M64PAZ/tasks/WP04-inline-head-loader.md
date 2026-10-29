---
work_package_id: WP04
title: Inline head loader
dependencies:
- WP03
requirement_refs:
- FR-001
- FR-002
- FR-003
- FR-004
- FR-012
planning_base_branch: feat/byo-gtm-container
merge_target_branch: feat/byo-gtm-container
branch_strategy: Planning artifacts for this mission were generated on feat/byo-gtm-container. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/byo-gtm-container unless the human explicitly redirects the landing branch.
subtasks:
- T013
- T014
- T015
- T016
- T017
phase: Phase 2 - Foundation
history:
- at: '2026-10-29T22:01:50Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: vite.config.ts
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- vite.config.ts
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP04 – Inline head loader

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

Change the existing `quadrano-gtm` plugin in `vite.config.ts` so that every page loads **exactly one** container, chosen **before any page module runs** (FR-001, FR-002):

- `<!-- gtm:head -->` is replaced by one inline classic `<script>` built from: the type-stripped source of `site/src/container/active-container.ts` (WP03), the shop's ID as a JSON literal or `null`, and loader glue that reads `localStorage`, sets the `<html>` attributes and runs the standard GTM snippet with the chosen ID (contract "Inline head script").
- The loader is **always** emitted now, even with no shop ID, because a visitor may bring their own (spec Edge Cases: "Shop's own container ID missing … a saved visitor ID still works").
- `<!-- gtm:body -->` stays exactly as today: a `<noscript>` iframe with the **shop's** ID only, or nothing (FR-004).
- The build **fails** if the inlined code is not self-contained (R-01).

**Done when**: `pnpm build` works with and without `VITE_GTM_CONTAINER_ID`; each built page has one loader right after the `dataLayer` initialiser; in a browser the right single `gtm.js` request is made in each state (T017); `pnpm dev` still serves pages; `pnpm gates` passes.

## Context & Constraints

- **Read first**: `contracts/container-choice.md` (the full section "Inline head script" is the spec for this WP), `research.md` R-01 (how and why), plan sequence diagram, `data-model.md` "Active container".
- **Current file**: `vite.config.ts` has `gtm(id)` building `headSnippet` and `bodySnippet` strings, `replaceMarker` (throws if a marker is missing or duplicated), and `CONTAINER_ID` (a copy of the pattern). Every page in `site/` has `<script>window.dataLayer = window.dataLayer || [];</script>` immediately followed by `<!-- gtm:head -->`, and `<!-- gtm:body -->` first in `<body>`. Do not change the HTML files.
- **Secrets (QDR-004, FR-003)**: the shop's ID comes only from `VITE_GTM_CONTAINER_ID` (via `loadEnv` or `process.env`), never written into the repo. Never log the ID's value. For local checks, the allowlisted placeholder `GTM-XXXXXXX` is format-correct and safe to type.
- **Address (FR-013)**: the glue must never read `location`, `document.referrer`, `URLSearchParams` or anything else from the address. `vite.config.ts` isn't covered by WP03's lint override, so reviewers check this by eye; the T014 guard checks the inlined rules.
- **No `dataLayer` writes** except the GTM snippet's standard `gtm.start` push, which already exists today (plan "Post-design re-check").
- **NFR-004**: no extra request; the loader is inline and should stay small (a few hundred bytes plus the rules).

## Branch Strategy

- **Planning base branch**: `feat/byo-gtm-container`
- **Final merge target**: `feat/byo-gtm-container`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP04 --agent <name> --mission byo-gtm-container-01M64PAZ
```

---

## Subtasks & Detailed Guidance

### Subtask T013 – Read and type-strip `active-container.ts`

**Purpose**: One source for the rules, used inline (here) and as a module (WP06).

**Steps**:

1. Import Vite's oxc transform: `import { defineConfig, loadEnv, transformWithOxc, type Plugin } from 'vite';`. Confirm the export exists in the installed Vite 8.3.4 (`node -e "import('vite').then(v => console.log(typeof v.transformWithOxc))"`). If it doesn't, fall back to Node's built-in `stripTypeScriptTypes` from `node:module` (no new dependency) and note this in the Activity Log.
2. Add a constant for the rules file: `const RULES_FILE = resolve(import.meta.dirname, 'site/src/container/active-container.ts');`
3. Write an async helper:

   ```ts
   async function buildRulesScript(): Promise<string> {
     const source = await readFile(RULES_FILE, 'utf8');
     const { code } = await transformWithOxc(source, RULES_FILE, { lang: 'ts', sourcemap: false });
     return code.replace(/^export\s+(?=(?:const|function)\b)/gm, '');
   }
   ```

   `export type` lines disappear with type stripping. Only `export const` and `export function` remain, and the regex drops the keyword.
4. Memoise the promise inside the plugin (`let rules: Promise<string> | undefined`) so the five pages don't re-transform. In dev, re-reading on server restart is enough.
5. Use the pattern from the rules file for the shop ID too, so there is one pattern. Either import `isContainerId` from `./site/src/container/active-container.ts` (Vite's config loader bundles it; `allowImportingTsExtensions` is on), or keep the local `CONTAINER_ID` with a comment saying it must equal `CONTAINER_ID_PATTERN`. Prefer the import.

### Subtask T014 – Self-contained guards

**Purpose**: R-01: "the plugin fails the build if the transformed output still contains `import` or `export`". It's a cheap guard against the file stopping being self-contained.

**Steps**: after T013's transform, throw a clear `Error` (build fails) if any of these match the code:

| Check | Regex (suggested) | Error message |
|---|---|---|
| Leftover module syntax | `/^\s*(?:import|export)\b/m` and `/\bimport\s*\(/` | `active-container.ts must stay self-contained (no import/export after inlining)` |
| Script-breaking text | `/<\/script/i` | `active-container.ts must not contain a closing script tag` |
| Address access | `/\blocation\s*[.[]|\breferrer\b|\bURLSearchParams\b/` | `active-container.ts must never read the page address (FR-013)` |
| Expected names present | each of `VISITOR_CONTAINER_KEY`, `chooseContainer` declared | `active-container.ts no longer declares <name>` |

**Prove each guard** (scratch, not committed): temporarily add `import x from './y.ts';` to the rules file, run `pnpm build`, see it fail with your message; revert. Do the same for a `</script>` inside a comment. Record both in the Activity Log.

**Notes**: if the address guard trips on a **comment** in the rules file, the comment is the problem. Tell the WP03 owner, or make a recorded one-line out-of-map edit to reword it. Don't weaken the regex.

### Subtask T015 – Emit the inline loader

**Purpose**: The contract's five steps, in order, in one classic script.

**Steps**:

1. Shop ID: `const shopId = isContainerId(trimmed) ? trimmed : null;` (keep today's `trim()` of the env value; that's the hosting environment, not visitor input).
2. Build the script string. Plain ES2017-compatible glue; `var` is fine:

   ```ts
   const glue = `
   var shopId = ${JSON.stringify(shopId)};
   var raw = null, storageOk = true;
   try { raw = window.localStorage.getItem(VISITOR_CONTAINER_KEY); } catch (e) { storageOk = false; }
   var choice = chooseContainer({ raw: raw, storageOk: storageOk, shopId: shopId, now: Date.now() });
   if (choice.removeSaved) { try { window.localStorage.removeItem(VISITOR_CONTAINER_KEY); } catch (e) {} }
   var root = document.documentElement;
   root.setAttribute('data-container-source', choice.source);
   if (choice.source === 'visitor' && choice.id) { root.setAttribute('data-visitor-container', choice.id); }
   if (!storageOk) { root.setAttribute('data-storage', 'unavailable'); }
   if (choice.id) {
     (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',choice.id);
   }`;
   const headScript = `<script>(function(){${rulesCode}\n${glue}\n})();</script>`;
   ```

   - The GTM snippet body is today's, unchanged, except that `i` is now the runtime `choice.id` instead of an interpolated literal.
   - The ID reaching the URL has passed `CONTAINER_ID_PATTERN` (inside `chooseContainer`), so it's safe in the URL (contract step 5).
   - Wrapping everything in an IIFE keeps the rules' names (`chooseContainer`, etc.) out of the global scope.
3. `transformIndexHtml.handler` becomes `async`, awaits the memoised rules, and replaces `HEAD_MARKER` with `headScript` via `replaceMarker` (keep its "exactly one marker" check).
4. Optionally collapse whitespace in `glue` to keep the inline script compact. Don't minify the rules with a regex: the ID pattern contains `/`.

**Edge cases to reason through (write them in the Activity Log)**:
- Storage getter throws → `storageOk=false` → shop's or none, `data-storage="unavailable"`, nothing removed.
- Saved value expired → removed, shop's loads.
- No shop ID, no saved ID → `data-container-source="none"`, no request (as today).
- Visitor saved the shop's own ID → `visitor`, one request.

### Subtask T016 – Body marker, warnings, comments

**Steps**:

1. `bodySnippet` unchanged in behaviour: `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=…">` with the **shop's** ID only, or `''`. Without JavaScript there's no visitor ID, so this is right (FR-004).
2. Update the `configResolved` warning: `'VITE_GTM_CONTAINER_ID is not set or not a container ID; pages load no container unless a visitor brings their own.'` Never print the value.
3. Update the file's header comment: FR-001 (one container per page) and FR-002 (chosen before the first push) of this mission, R-01, and that the rules live in `site/src/container/active-container.ts`.

### Subtask T017 – Manual build check

**Purpose**: Evidence before WP08 automates it.

**Steps** (record outcomes in the Activity Log; never paste a real ID):

1. `pnpm build` with no env var → warning printed; open `dist/index.html`: the loader script is present right after the `dataLayer` initialiser; no `<noscript>` iframe.
2. `VITE_GTM_CONTAINER_ID=GTM-XXXXXXX pnpm build` (PowerShell: `$env:VITE_GTM_CONTAINER_ID='GTM-XXXXXXX'; pnpm build`) → the loader contains `"GTM-XXXXXXX"` as `shopId`; `<noscript>` iframe present.
3. `pnpm preview`, open DevTools Network filtered by `googletagmanager`:
   - fresh profile → one request `gtm.js?id=GTM-XXXXXXX`; `<html data-container-source="shop">`.
   - in Console: `localStorage.setItem('demo-shop:visitor-container', JSON.stringify({ id: 'GTM-' + 'TEST123', savedAt: Date.now() }))`, reload → one request for the visitor's ID and **none** for the shop's; `data-container-source="visitor"`, `data-visitor-container` set.
   - set `savedAt: Date.now() - 86400000`, reload → shop's request only; key removed.
   - set the value to `'junk'`, reload → shop's request only; key removed.
   - add `?gtm=` plus any ID to the address → no change (FR-013).
4. `pnpm dev` → the loader is present in served HTML.
5. `pnpm gates` passes; `dist/` is not committed.

---

## Definition of Done

- [ ] Loader emitted on all 5 pages, before any module script, in all three states.
- [ ] Guards proven to fail the build.
- [ ] `<noscript>` still shop-only.
- [ ] No address access; no logging of IDs.
- [ ] `pnpm gates` passes.
- [ ] `spec-kitty agent tasks mark-status T013 T014 T015 T016 T017 --status done --mission byo-gtm-container-01M64PAZ`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Two `gtm.js` requests | One code path calls the snippet, only with `choice.id`; T017 network check; WP08 automates it ×10 |
| Choice made too late | Classic inline script at the marker position; no `async`/`defer`/`type="module"` on it |
| Rules drift between head and menu | Same source file; build guard |
| `transformWithOxc` output shape differs (e.g. adds `"use strict"`, keeps comments) | Inspect the output once; guards key on real syntax |
| Dev server breaks on async handler | `pnpm dev` check in T017 |

## Review Guidance

- Read the generated `<script>` in `dist/index.html` end to end.
- Confirm nothing reads the address, the shop ID is never logged, and the body marker is shop-only.
- Confirm the build fails on the guard probes (ask for the Activity Log evidence).

## Activity Log

- 2026-10-29T22:01:50Z – system – Prompt generated via /spec-kitty.tasks
