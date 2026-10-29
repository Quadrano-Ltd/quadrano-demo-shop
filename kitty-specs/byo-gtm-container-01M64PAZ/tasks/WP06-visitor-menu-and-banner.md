---
work_package_id: WP06
title: Visitor menu, banner and layout
dependencies:
- WP03
- WP04
- WP05
requirement_refs:
- FR-005
- FR-006
- FR-007
- FR-008
- FR-009
- FR-010
- FR-012
- FR-017
- FR-020
- FR-021
- FR-022
- FR-024
- C-009
planning_base_branch: feat/byo-gtm-container
merge_target_branch: feat/byo-gtm-container
branch_strategy: Planning artifacts for this mission were generated on feat/byo-gtm-container. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/byo-gtm-container unless the human explicitly redirects the landing branch.
subtasks:
- T022
- T023
- T024
- T025
- T026
- T027
- T028
phase: Phase 3 - User stories
history:
- at: '2026-10-29T22:01:50Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: site/src/menu/
create_intent:
- site/src/menu/visitor-menu.ts
- site/src/menu/banner.ts
execution_mode: code_change
model: ''
owned_files:
- site/src/menu/visitor-menu.ts
- site/src/menu/banner.ts
- site/src/ui/layout.ts
- site/src/ui/styles.css
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP06 – Visitor menu, banner and layout

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

This is the visitor-facing heart of the mission (User Stories 1, 2 and 4):

- a **banner** above the header on every page while the visitor's container is active: "Using your container GTM-XXXXXXX" (their ID) with a reset (FR-009, FR-010);
- a floating, labelled **"Demo menu"** button on every page, opening an accessible, non-modal disclosure panel (FR-005, FR-020) with:
  1. **path 1**: "Show me the output with the pre-built container" (FR-010, User Story 2);
  2. **path 2**: "Let me bring my own GTM container": ID input, Save, refusal message, storage-unavailable note, reset when active, and the visitor instructions (FR-006, FR-007, FR-012, FR-024);
  3. **Event playground**: WP05's `mountPlayground` (FR-014);
- mounted **once** per page by `renderLayout`, and working at **360 px** wide (FR-021).

Nothing here pushes to the data layer except a playground press (FR-017). Nothing here contains verdict wording (FR-022).

**Done when**: on all 5 pages, by keyboard alone, you can open the menu, save a well-formed ID (page reloads into the visitor state with the banner), see a malformed ID refused with nothing saved, reset from the banner and from the menu, use path 1, press playground buttons, and close with Escape with focus back on the button; at 360 px nothing overflows; `pnpm gates` passes.

## Context & Constraints

- **Read first**: `contracts/visitor-menu.md` (structure, behaviour table, copy, layout: **the spec for this WP**), `contracts/container-choice.md` ("Page code may rely on"), `data-model.md` "Visitor menu state" and path transitions, `research.md` R-04 (storage), R-06 (disclosure pattern, why not a modal), R-07.
- **APIs you consume**:
  - `site/src/container/active-container.ts` (WP03): `isContainerId`.
  - `site/src/container/visitor-storage.ts` (WP03): `probe(): boolean`, `save(id): 'saved' | 'unavailable'`, `clear(): 'cleared' | 'unavailable'`.
  - `site/src/menu/playground.ts` (WP05): `mountPlayground(container, announce)`.
  - `<html>` attributes set by the head loader (WP04) before any module runs: `data-container-source` (`visitor` | `shop` | `none`), `data-visitor-container` (only when `visitor`), `data-storage="unavailable"` (only when storage threw).
  - `site/src/ui/layout.ts` (existing): `renderLayout(page, heading)` builds header, main, footer and a polite live region, then `app.replaceChildren(header, main, footer, live)`; `announce(message)`.
- **Lint for `site/**`**: no verdict wording in string literals or templates (✓ ✗ ⚠ ✅ ❌; pass/passed/passes; fail/failed/fails/failure; valid; invalid; whole words, case-insensitive). So the copy says "doesn't look like a container ID", **never** "invalid". Variable names may use any words. No Console, no network, no `dataLayer`.
- **Address**: never read the address to get or set a container (FR-013). `window.location.reload()` after save or clear is fine; it doesn't read anything.
- **Never** use `innerHTML` with the visitor's ID; always `textContent`.
- **Secrets**: the only ID-shaped literal allowed in source is `GTM-XXXXXXX` (it appears in the refusal copy).
- **Terminology**: UI text says "container", "Attribute" where needed; avoid "BYO GTM", "custom container", "test events", "parameter", "field".

## Branch Strategy

- **Planning base branch**: `feat/byo-gtm-container`
- **Final merge target**: `feat/byo-gtm-container`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP06 --agent <name> --mission byo-gtm-container-01M64PAZ
```

---

## Subtasks & Detailed Guidance

### Subtask T022 – `banner.ts`

**Purpose**: The visitor always knows which container is running (FR-009) and can get back (FR-010).

**Steps**:

1. Export a small reader shared with the menu (put it in `banner.ts` and import it in `visitor-menu.ts`, or duplicate the three lines; your call):

   ```ts
   export interface ContainerState {
     readonly source: 'visitor' | 'shop' | 'none';
     readonly visitorId: string | null;   // only if source is visitor AND isContainerId
     readonly storageUnavailable: boolean;
   }
   export function readContainerState(root: HTMLElement = document.documentElement): ContainerState;
   ```

   Treat an unknown `data-container-source` as `none`. Re-check `data-visitor-container` with `isContainerId`. If that fails, act as `shop` (never display an unchecked string).

2. `export function createVisitorBanner(state: ContainerState): HTMLElement | null`, returning `null` unless `source === 'visitor'`:

   ```html
   <div class="visitor-banner" role="region" aria-label="Container">
     <p class="visitor-banner__text">Using your container GTM-XXXXXXX</p>   <!-- textContent = `Using your container ${id}` -->
     <button type="button" class="visitor-banner__reset">Reset to the shop's container</button>
   </div>
   ```

3. Reset click: `clear()` → `'cleared'` → `window.location.reload()`; `'unavailable'` → set the text to "This browser wouldn't let the shop remove your container ID. Clear this site's data to reset." and move focus to the text (give it `tabindex="-1"`).

**Validation**: with a visitor state, the banner text uses the exact ID; reset reloads into `shop`.

### Subtask T023 – Menu shell and disclosure accessibility

**Purpose**: FR-005 and FR-020, using the disclosure pattern from R-06.

**Steps**:

1. `export function mountVisitorMenu(announce: (message: string) => void): void` in `visitor-menu.ts`.
   - If `document.getElementById('visitor-menu')` already exists, **return** (idempotent: a second call adds no second button and no duplicate listeners).
2. Build, then append to `document.body` (outside `#app`, so `renderLayout`'s `replaceChildren` never removes it):

   ```html
   <aside class="visitor-menu-host" aria-label="Demo menu">
     <button type="button" class="visitor-menu__toggle"
             aria-expanded="false" aria-controls="visitor-menu">Demo menu</button>
     <section id="visitor-menu" class="visitor-menu" hidden aria-labelledby="visitor-menu-title">
       <h2 id="visitor-menu-title" tabindex="-1">Demo menu</h2>
       <button type="button" class="visitor-menu__close">Close</button>
       <p class="visitor-menu__status"><!-- which container is in use --></p>
       <!-- path 1 group, path 2 group, playground group (T024–T026) -->
     </section>
   </aside>
   ```

   The `<aside>` landmark keeps the floating controls inside a landmark, so axe's region checks (WP10) don't flag them.
3. Open: remove `hidden`, set `aria-expanded="true"`, focus the `h2`.
4. Close (toggle while open, Close button, Escape): set `hidden`, `aria-expanded="false"`, focus the toggle.
5. Escape: one `keydown` listener on the `<aside>` (covers the panel and the toggle). If `event.key === 'Escape'` and the panel is open, close. Don't listen on `document`.
6. Outside clicks do **not** close the panel (R-06: a stray tap on a phone must not lose state).
7. Status line (neutral copy):
   - `visitor`: `In use: your container ${id}`
   - `shop`: `In use: the shop's pre-built container`
   - `none`: `In use: no container on this build`
8. Opening, closing and Escape push nothing (FR-017).

### Subtask T024 – Path 1

**Steps**:

1. Group: `<h3>Show me the output with the pre-built container</h3>` is optional. Required: a button with exactly that text, plus a message `<p>` with `role="status"`.
2. Click:
   - `source === 'visitor'`: `clear()` → `'cleared'` → reload (same as reset); `'unavailable'` → the clear-unavailable copy in the message.
   - otherwise: message "You're using the shop's pre-built container." No reload, no storage write.
3. Optionally, one line under the button telling people to open the browser Console to see the output. Keep it neutral and verdict-free.

### Subtask T025 – Path 2 form, refusal and save

**Purpose**: FR-006, FR-007, data-model path transitions.

**Steps**:

1. Group heading `<h3>Let me bring my own GTM container</h3>`, then:

   ```html
   <form class="visitor-menu__form" novalidate>
     <label for="visitor-container-id">Your container ID</label>
     <input id="visitor-container-id" name="container-id" type="text"
            autocomplete="off" spellcheck="false" autocapitalize="characters"
            aria-describedby="visitor-container-message">
     <button type="submit">Save</button>
     <p id="visitor-container-message" aria-live="polite"></p>
   </form>
   ```

   - `novalidate` and no `pattern`/`required`: the browser's own validation bubble would replace the contract's message.
   - `autocapitalize="characters"` only helps phone keyboards; it doesn't change the rule that the stored ID must already be upper-case.
2. Submit handler (`event.preventDefault()` first):
   - `const value = input.value;`: **no trim, no case change** (spec Edge Cases).
   - `!isContainerId(value)` → message = refusal copy (T026); `input.setAttribute('aria-invalid', 'true')`; keep focus in the input; save nothing; no reload.
   - else `save(value)`:
     - `'saved'` → `window.location.reload()`;
     - `'unavailable'` → show the storage-unavailable note and disable the form (T026).
   - On the next `input` event, remove `aria-invalid` and clear the message.
3. When `source === 'visitor'`, show above the form: `Your container ${id} is in use.` and a **"Reset to the shop's container"** button with the same behaviour as the banner reset (FR-010: "a reset in the banner **and in the menu**"). Saving a different ID replaces it.
4. No push anywhere in this flow (FR-017).

### Subtask T026 – Storage-unavailable note and path 2 instructions

**Steps**:

1. On first open of the panel (not at page load, to avoid storage writes on every page), work out availability: `state.storageUnavailable || !probe()`. If unavailable:
   - disable the input and the Save button (`disabled`);
   - show the note: **"Bringing your own container isn't available in this browser, because it blocks site storage. You can still use the pre-built container and the event playground."**
2. Refusal copy (FR-007), exactly: **"That doesn't look like a container ID. Enter it exactly as GTM shows it, for example GTM-XXXXXXX: `GTM-` and then 4 to 10 capital letters or digits."** (Render the backticked part as plain text or `<code>`.)
3. Instructions (FR-024, default: assumes spike run 2 shows the container runs in Preview) as an `<ol>`:
   1. Create an empty container in your own GTM account.
   2. Enter its ID here and save.
   3. On quadrano.com/local, build a Specification and copy its snippet.
   4. In your container, add a Custom HTML tag with the snippet, triggered on All Pages.
   5. Start Preview on this shop. You don't need to publish.
   6. Open the browser Console and use the event playground.
4. **Keep step 5 in its own named constant**, for example `const PREVIEW_STEP = "Start Preview on this shop. You don't need to publish.";` with a comment pointing to `docs/spike/preview-spike.md` run 2. If the spike shows the container doesn't run unpublished, WP11 swaps it for "Submit and publish your container, then reload this page." Only this string changes.
5. "quadrano.com/local" is plain text, or a link to `https://quadrano.com/local` with `rel="noopener"`. A link isn't a network request from shop code, so lint is fine.
6. Run every string through the verdict check by eye: no "valid", "invalid", "pass", "fail", no ✓ ✗.

### Subtask T027 – Mount from `layout.ts`

**Steps**:

1. In `renderLayout`, after building `header`:

   ```ts
   const banner = createVisitorBanner(readContainerState());
   app.replaceChildren(...(banner === null ? [] : [banner]), header, main, footer, live);
   mountVisitorMenu(announce);
   ```

   - Banner first, **before** `<header>`, in normal flow (contract).
   - `mountVisitorMenu` is idempotent (T023 step 1).
2. Keep `syncScenarioLinks(document)` after mounting so any internal link in the menu (there should be none) would carry the scenario.
3. No page entry module (`site/src/pages/*.ts`) changes (plan "Structure Decision").
4. The thank-you page pushes `purchase` **before** calling `renderLayout`. Don't change that order.

### Subtask T028 – Styles

**Purpose**: FR-021, NFR-003, visible focus (FR-020), existing look.

**Steps** (append to `site/src/ui/styles.css`, using the existing custom properties `--ink`, `--brand`, `--paper`, `--line`, `--focus`, `--wash`):

1. Toggle: `position: fixed; right: max(1rem, env(safe-area-inset-right)); bottom: max(1rem, env(safe-area-inset-bottom)); min-width: 44px; min-height: 44px; z-index: 10;` brand background, paper text, visible text.
2. Panel: `position: fixed; right: 1rem; bottom: 5rem; width: min(24rem, 100vw - 2rem); max-height: calc(100dvh - 6rem); overflow-y: auto; overflow-wrap: anywhere; z-index: 10;` paper background, line border, padding, shadow.
3. **`.visitor-menu[hidden] { display: none; }`**: any `display` you set on `.visitor-menu` would otherwise override the `hidden` attribute.
4. Playground list: no bullets; buttons full width, stacked, at least 44 px tall.
5. Banner: normal flow, `display: flex; flex-wrap: wrap; gap; align-items: center;` contrasting background (for example `--brand-deep` with `--paper` text), the ID never overflows (`overflow-wrap: anywhere`).
6. Leave room so the fixed toggle never covers the last footer line or a page's main button at 360 px: for example `.site-footer { padding-bottom: 5rem; }` or `body { padding-bottom: … }`.
7. Focus: `:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }` on the toggle, close, path buttons, input, Save, reset and playground buttons. The `h2` gets focus programmatically. Give it an outline too, or a clear visual cue.
8. Colour contrast at least 4.5:1 for text (check with DevTools). `prefers-reduced-motion`: no transitions needed; add none.
9. Check at 360 px wide in DevTools device mode on all 5 pages, menu open and closed, banner shown: `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.

---

## Manual end-to-end check (record in the Activity Log)

With `$env:VITE_GTM_CONTAINER_ID='GTM-XXXXXXX'; pnpm build; pnpm preview`:

1. Fresh profile, listing page: no banner; Tab to "Demo menu"; Enter opens; focus on heading; Escape closes; focus back on the toggle.
2. Path 2, type `gtm-abcd` → refusal, `aria-invalid`, nothing in `localStorage`.
3. Type a well-formed ID built in the Console (`'GTM-' + 'TEST123'`, pasted) → Save → reload → banner shows it on all 5 pages; Network shows only that container.
4. Banner reset → reload → no banner; shop's container back.
5. Save again, then path 1 → reload → shop's container.
6. In DevTools, block storage (Application → Storage → simulate, or an init override) → the note shows, input disabled.
7. Watch `window.dataLayer.length` across steps 1–6 → unchanged; a playground press → +2.
8. 360 px checks (T028 step 9).

---

## Definition of Done

- [ ] `banner.ts`, `visitor-menu.ts` created; `layout.ts`, `styles.css` updated.
- [ ] Behaviour table in `contracts/visitor-menu.md`: every row implemented.
- [ ] Copy matches the contract exactly; lint passes (no verdict wording).
- [ ] Idempotent mount; Escape and focus return work.
- [ ] Manual end-to-end check recorded.
- [ ] `pnpm gates` passes.
- [ ] `spec-kitty agent tasks mark-status T022 T023 T024 T025 T026 T027 T028 --status done --mission byo-gtm-container-01M64PAZ`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `display` on `.visitor-menu` overrides `[hidden]` | Explicit `[hidden] { display: none }` |
| Focus lost after close | Always focus the toggle in `close()` |
| Unchecked attribute displayed | `isContainerId` re-check; `textContent` only |
| Toggle covers content at 360 px | Bottom padding; WP10 layout spec |
| Verdict words in copy | Lint + contract copy verbatim |
| Path 2 copy changes after spike | Isolated `PREVIEW_STEP` constant |

## Review Guidance

- Walk the contract's behaviour table row by row in a browser.
- Grep `site/src/menu/` for `innerHTML` (must be none) and for `location.` (only `reload()`).
- Confirm no push except via the playground.

## Activity Log

- 2026-10-29T22:01:50Z – system – Prompt generated via /spec-kitty.tasks
