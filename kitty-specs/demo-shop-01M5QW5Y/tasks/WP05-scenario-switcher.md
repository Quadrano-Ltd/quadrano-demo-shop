---
work_package_id: WP05
title: Scenario switcher control
dependencies:
- WP04
requirement_refs:
- FR-013
- FR-014
- FR-015
- NFR-002
- NFR-005
planning_base_branch: feat/demo-shop
merge_target_branch: feat/demo-shop
branch_strategy: Planning artifacts for this mission were generated on feat/demo-shop. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/demo-shop unless the human explicitly redirects the landing branch.
subtasks:
- T023
- T024
- T025
- T026
phase: Phase 3 - User stories
history:
- at: '2026-10-24T21:50:34Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: site/src/switcher/switcher.ts
create_intent:
- site/src/switcher/switcher.ts
execution_mode: code_change
model: ''
owned_files:
- site/src/switcher/switcher.ts
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP05 – Scenario switcher control

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter (or any user-defined profile), and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## ⚠️ IMPORTANT: Review Feedback

- **Has review feedback?** Check the `review_ref` field in the event log (`spec-kitty agent tasks status --mission demo-shop-01M5QW5Y`) or the Activity Log below.
- **You must address all feedback** before your work is complete.
- **Report progress** in the Activity Log as you address each item.

---

## Markdown Formatting

Wrap HTML/XML tags in backticks. Use language identifiers in code blocks.

---

## Objectives & Success Criteria

The presenter must be able to stage any scenario on cue (US3, NFR-002: two interactions or fewer). This WP builds the **on-page control** as a self-contained module that WP06's layout mounts in every page header.

- A native `<select>` labelled **"Scenario"**, options in talk-script order (correct, 1–4, spare), with the current URL's scenario selected (FR-014).
- Changing it updates the address with `history.pushState`, rewrites internal links to carry the new scenario, and announces the change with a DOM event. It makes **no data layer push** (FR-015).
- Back/forward (`popstate`) re-syncs the control and links (edge case "Browser back/forward between scenarios").
- On mount, a missing or unknown `?scenario=` is normalised to `correct` with `replaceState` (FR-013, US3 scenario 3).
- Keyboard operable with a visible focus indicator (NFR-005). A native control gives this for free; keep it native.

## Context & Constraints

- `kitty-specs/demo-shop-01M5QW5Y/contracts/scenario-url.md`: **acceptance source** (link format, control behaviour, two-interaction rule).
- `spec.md`: US3 acceptance scenarios 1–4; FR-013, FR-014, FR-015; NFR-002, NFR-005.
- `research.md`: R-04 (scenario lives only in the URL; links rewritten; `replaceState` normalisation).
- Uses WP04's modules: `site/src/datalayer/scenarios.ts` (`SCENARIOS`, `ScenarioId`, `isScenarioId`) and `site/src/switcher/scenario-url.ts` (`currentScenario`, `normaliseAddress`, `withScenario`, `SCENARIO_PARAM`). Read their exports before you start. If something you need is missing, add a small local helper here rather than editing WP04's files. If it really belongs there, note it in the Activity Log for a follow-up.
- **Must not import `site/src/datalayer/push.ts`**, and must not reference `dataLayer` at all (lint forbids it outside `push.ts`).
- No storage (sessionStorage or localStorage) for the scenario. The URL is the single source (R-04).
- No Console output, and no verdict wording in labels or text (FR-017, lint).
- Relative imports with `.ts` extension; erasable syntax only.

## Branch Strategy

- **Strategy**: Planning artifacts were generated on feat/demo-shop; completed changes must merge back into feat/demo-shop.
- **Planning base branch**: feat/demo-shop
- **Merge target branch**: feat/demo-shop
- Execution worktrees are allocated per computed lane from `lanes.json`; start with `spec-kitty agent action implement WP05 --agent claude`.

## Public API (what WP06 will call)

```ts
/** Renders the Scenario control into `container` and wires URL sync. Call once per page, after the header exists. */
export function mountScenarioSwitcher(container: HTMLElement): void;

/** Rewrites every internal link under `root` to carry the current scenario. Pages call this after rendering dynamic content. */
export function syncScenarioLinks(root?: ParentNode): void;

/** Name of the DOM event dispatched on `document` after the scenario changes (by the control or by back/forward). detail: { id: ScenarioId } */
export const SCENARIO_CHANGE_EVENT = 'scenariochange';
```

Document these at the top of the file. WP06 relies on them exactly.

## Subtasks & Detailed Guidance

### Subtask T023 – Render the native `<select>`

- **Steps**:
  1. In `mountScenarioSwitcher(container)`, create:
     ```html
     <label class="scenario-switcher">
       <span class="scenario-switcher__label">Scenario</span>
       <select id="scenario-select" name="scenario"> …options… </select>
     </label>
     ```
     Build it with `document.createElement` and `textContent`, not `innerHTML` with interpolation. The labels are ours, but this keeps the habit safe.
  2. One `<option>` per entry in `SCENARIOS` (already sorted by `order`): `value = id`, text = `label` (e.g. `1 · Missing value`, `Spare · Bad transaction ID`). The order is correct, then 1–4, then the spare (US3 scenario 4).
  3. Optionally group with `<optgroup label="Talk script">` / `<optgroup label="Spare">` using `talkScript`. The flat order must still read correct, 1, 2, 3, 4, spare.
  4. Select the option matching `normaliseAddress()` (see T025; it runs first on mount).
- **Notes**: Use a stable `id`, because WP06's CSS and the review steps refer to `#scenario-select`. The label text is exactly "Scenario" (contract).

### Subtask T024 – Change handling: `pushState`, link rewriting, event

- **Steps**:
  1. On the select's `change` event:
     - Read `select.value`; ignore it if `!isScenarioId(value)` (cannot happen with our options, but stay defensive).
     - Build the new URL from `location.pathname + location.search + location.hash` via `withScenario(…, id)` and call `history.pushState({ scenario: id }, '', newUrl)`. That adds a history entry, so Back returns to the previous scenario (contract).
     - Call `syncScenarioLinks(document)`.
     - Dispatch `new CustomEvent(SCENARIO_CHANGE_EVENT, { detail: { id } })` on `document`. Pages listen to update any visible "active scenario" text (WP06 checkout).
  2. `syncScenarioLinks(root = document)`:
     - For each `a[href]` under `root` whose `getAttribute('href')` starts with `/` (path-absolute internal link), set `href = withScenario(rawHref, currentScenario())`.
     - Skip `href` values starting with `//` (protocol-relative, external), `#`, `mailto:` or a full URL. The shop has no external links, but be strict.
     - Idempotent: running twice gives the same result, because `withScenario` replaces an existing param.
  3. Absolutely **no** `dataLayer` interaction and no call into `push.ts` (FR-015). Switching must leave `window.dataLayer.length` unchanged.
- **Edge cases**: Selecting the already-active option fires no `change`, so nothing happens. That is fine.

### Subtask T025 – `popstate` sync and normalisation on mount

- **Steps**:
  1. At the start of `mountScenarioSwitcher`, call `normaliseAddress()` from WP04. It rewrites a missing or unknown param to `correct` via `replaceState`. Use the returned id as the initial selection.
  2. Register **one** `popstate` listener per page (guard with a module-level flag if `mountScenarioSwitcher` were ever called twice). It should:
     - Read `currentScenario()`. If the URL now lacks a valid param (e.g. user edited it), call `normaliseAddress()`.
     - Set `select.value` to it, call `syncScenarioLinks(document)`, and dispatch `SCENARIO_CHANGE_EVENT`.
  3. `popstate` must not trigger a page reload or a push.
- **Notes**: On cross-page navigation, the next page reads its own URL on load, so no extra state is needed. Bookmarks such as `/checkout/?scenario=wrong-case-key` work because the mount reads the URL (US3 scenario 1).

### Subtask T026 – Isolated keyboard and no-push verification

- **Purpose**: Prove the control works before WP06 integrates it. WP06 owns all HTML pages, so use a **scratch page that you never commit**.
- **Steps**:
  1. Create a temporary `site/__switcher-probe.html` with a `<header id="h">` and a few links (`/`, `/checkout/`, `/product/?id=SKU-1001`). Include an inline `<script>window.dataLayer = window.dataLayer || [];</script>` and a module script that imports `mountScenarioSwitcher` and mounts into `#h`. Run `pnpm exec vite site` (or `pnpm dev` if WP06's config already exists in your lane; it won't on this lane, so pass `site` as the root) and open `/__switcher-probe.html`.
  2. Check, and record results in the Activity Log:
     - Opening with no param → address becomes `?scenario=correct` and history length does not grow (`history.length` before and after).
     - Opening with `?scenario=nonsense` → normalised to `correct`, control shows "Correct".
     - Opening with `?scenario=wrong-case-key` → control shows "3 · Wrong-case key".
     - Option order reads Correct, 1, 2, 3, 4, Spare.
     - Choosing each option → address updates, links carry the new value (inspect `href`s), and `window.dataLayer.length` stays `0` throughout (FR-015).
     - Back/Forward → control and links follow the address.
     - Keyboard only: Tab to the control (a visible focus ring; the browser default is acceptable until WP06 styles it), change with arrow keys/Enter, Tab onwards.
     - `document.addEventListener('scenariochange', e => …)` in the DevTools console receives `{ id }` on each change.
  3. **Delete the probe page.** Confirm `git status` shows only `site/src/switcher/switcher.ts`.
- **Notes**: If `vite site` without a config complains, a one-off `pnpm exec vite --root site` is fine; don't create `vite.config.ts` (WP06 owns it).

## Definition of Done

- [ ] `site/src/switcher/switcher.ts` exports `mountScenarioSwitcher`, `syncScenarioLinks`, `SCENARIO_CHANGE_EVENT` with doc comments.
- [ ] No import of `push.ts`; no `dataLayer`; no storage; no `console`.
- [ ] T026 checks all observed and logged; the probe page is deleted.
- [ ] `pnpm lint` and `pnpm exec tsc --noEmit` pass.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Switching accidentally pushes | No import of `push.ts`; T026 watches `dataLayer.length` |
| Duplicate `popstate` listeners | Module-level guard |
| Links lose `?id=` when rewritten | `withScenario` preserves other params (WP04); T026 checks the product link |
| Custom-styled control breaks keyboard access | Keep native `<select>`; style only (WP06) |

## Review Guidance

- Read `switcher.ts` top to bottom for any path to `dataLayer`.
- Re-run the T026 checks quickly with a probe page of your own, then delete it.
- Confirm option order and exact labels against data-model.md.
- Confirm normalisation uses `replaceState` and changes use `pushState`.

## Activity Log

> Entries in chronological order (oldest first). Append only. Format: `- YYYY-MM-DDTHH:MM:SSZ – <agent_id> – <action>`.

- 2026-10-24T21:50:34Z – system – Prompt created.
