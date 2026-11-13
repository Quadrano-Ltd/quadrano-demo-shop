---
work_package_id: WP03
title: Results section in the Demo menu
dependencies:
- WP02
requirement_refs:
- FR-001
- FR-002
- FR-004
- FR-006
- FR-010
- FR-012
- FR-013
- FR-016
- NFR-001
- NFR-002
planning_base_branch: feat/on-page-results-mirror
merge_target_branch: feat/on-page-results-mirror
branch_strategy: Planning artifacts for this mission were generated on feat/on-page-results-mirror. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/on-page-results-mirror unless the human explicitly redirects the landing branch.
subtasks:
- T013
- T014
- T015
- T016
- T017
- T018
- T019
phase: Phase 3 - The view
agent: ''
history:
- at: '2026-11-12T20:26:16Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: site/src/menu/
create_intent:
- site/src/menu/results.ts
- site/src/results/results-setting.ts
execution_mode: code_change
model: ''
owned_files:
- site/src/menu/results.ts
- site/src/results/results-setting.ts
- site/src/menu/visitor-menu.ts
- site/src/ui/styles.css
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP03 – Results section in the Demo menu

## ⚡ Do This First: Load Agent Profile

Use the `/spk-charter-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## ⚠️ IMPORTANT: Review Feedback

- **Has review feedback?** Check the `review_ref` field in the event log (`spec-kitty agent tasks status --mission on-page-results-mirror-01M78JHF`) or the Activity Log below.
- **You must address all feedback** before your work is complete.
- **Report progress** in the Activity Log as you address each item.

---

## Markdown Formatting

Wrap HTML/XML tags in backticks. Use language identifiers in code blocks.

---

## Objectives & Success Criteria

Add the **Results** section to the Demo menu, directly under the Event playground (FR-001). It holds:

- a switch that turns the view on and off, with a note (FR-004)
- when the view is on: one of two empty-state messages (FR-010), or the rows, newest first (FR-001, FR-002)
- a status region of its own that announces each new result without moving focus (FR-013)

Also update two pieces of guidance copy in the menu so nobody is told only to open a Console (FR-016).

**Done when**:

- With the view off, the section holds the heading, the switch and its note, and nothing else.
- With `?results=on` and Quadrano on the page, each playground press adds exactly one row at the top, and its text is what WP02 captured.
- Turning the switch off loads the address without `results` and the Console methods are native again.
- Every string from the Console is set with `textContent`.
- Nothing in this WP makes a push.
- `pnpm gates` passes.

## Context & Constraints

- **Read first**: `contracts/results-view.md` (the spec for this WP), `data-model.md` ("What Results shows" and the state diagram), `research.md` R-03, R-07, R-09, R-10.
- **Pattern to follow**: `site/src/menu/playground.ts`, mounted by `site/src/menu/visitor-menu.ts`. One module, one `mount…` function, a double-mount guard.
- **The page interface** (from WP02): `window.__demoShopResults`, typed in `site/src/globals.d.ts` as `DemoShopResults`. It exists only when the view is on. `<html data-results-view="on">` says the view is on; `<html data-results-storage="unavailable">` says the setting couldn't be stored.
- **The shop never judges (C-006, FR-014)**: no verdict mark and no verdict wording in any file here. Row text comes only from the entries. Lint enforces this.
- **No Console use** in these files. Only `console-mirror.ts` may use the Console.
- **No pushes (FR-012)**: `results.ts` and `results-setting.ts` don't import `site/src/datalayer/push.ts` and never mention `dataLayer`.
- **The capture file is not importable**: it is an inline script with no exports. The storage key is therefore written a second time in `results-setting.ts`. WP04's check keeps the two equal.

### Fixed names (the e2e work packages rely on these)

| Thing | Element and name |
|---|---|
| Section | `section.visitor-menu__group.results` |
| Heading | `h3` with text `Results` |
| Switch | `input#results-switch` with `type="checkbox"` and `role="switch"` |
| Switch label | `label[for="results-switch"]`, text `Show Quadrano's output on this page` |
| Note | `p#results-switch-note.results__note` |
| Empty state | `p.results__empty` |
| List | `ul.results__list` |
| Row | `li.results__row` |
| Result | `details.results__result` inside the row |
| Result header | `summary.results__header` |
| Problem line | `p.results__line` |
| Pushed text | `pre.results__pushed` |
| Plain line | `p.results__plain` inside the row |
| Status region | `p#results-status.visually-hidden` with `role="status"`, a child of `.visitor-menu-host`, outside `#visitor-menu` |

### Copy (exact)

| Where | Text |
|---|---|
| Switch label | `Show Quadrano's output on this page` |
| Note, normal | `The page reloads when you change this.` |
| Note, storage blocked and view off | `This browser blocks site storage, so this view can't be remembered. Open the shop from the talk's link to see it on one page.` |
| Empty, banner not seen | `Quadrano hasn't loaded in this browser. On a phone, the likely cause is a content blocker stopping GTM.` |
| Empty, banner seen | `No output yet` |

## Branch Strategy

- **Planning base branch**: `feat/on-page-results-mirror`
- **Final merge target**: `feat/on-page-results-mirror`
- Execution worktrees are allocated per computed lane from `lanes.json`.

```bash
spec-kitty agent action implement WP03 --agent <name> --mission on-page-results-mirror-01M78JHF
```

---

## Subtasks & Detailed Guidance

### Subtask T013 – `results-setting.ts`: storage and address helpers

**Purpose**: Keep every storage access guarded and in one place, and give "off" an address that can't turn the view back on (research R-03).

**Steps**:

1. Create `site/src/results/results-setting.ts`:

   ```ts
   /**
    * The Results view setting as the menu uses it (FR-004, research R-03).
    * The inline capture script (console-mirror.ts) reads the same key before
    * any module runs; it can't be imported, so the key is repeated here and
    * `pnpm verify:results` keeps the two equal.
    */

   export const RESULTS_VIEW_KEY = 'demo-shop:results-view';
   export const RESULTS_PARAM = 'results';

   /** True when the setting can be read. Reads only; writes nothing. */
   export function canReadSetting(): boolean {
     try {
       window.sessionStorage.getItem(RESULTS_VIEW_KEY);
       return true;
     } catch {
       return false;
     }
   }

   /** Remember the view as on. */
   export function rememberOn(): 'saved' | 'unavailable' {
     try {
       const storage = window.sessionStorage;
       storage.setItem(RESULTS_VIEW_KEY, 'on');
       return storage.getItem(RESULTS_VIEW_KEY) === 'on' ? 'saved' : 'unavailable';
     } catch {
       return 'unavailable';
     }
   }

   /** Forget the setting. Never throws. */
   export function forget(): void {
     try {
       window.sessionStorage.removeItem(RESULTS_VIEW_KEY);
     } catch {
       // Nothing was stored, so there is nothing to forget.
     }
   }

   /** The current address with every `results` parameter removed. */
   export function addressWithoutResults(): string {
     const url = new URL(window.location.href);
     url.searchParams.delete(RESULTS_PARAM);
     return url.pathname + url.search + url.hash;
   }
   ```

2. `canReadSetting()` only reads. A write at page load would change storage with the view off, which FR-005 rules out.
3. This file isn't under `site/src/container/**`, so reading `location` is allowed by lint. It must never mention the container key.

**Files**: `site/src/results/results-setting.ts` (new, about 50 lines)

**Validation**:
- [ ] `/?results=on&scenario=correct#x` → `addressWithoutResults()` is `/?scenario=correct#x`.
- [ ] `/basket/` → `/basket/`.
- [ ] No function throws when `sessionStorage` throws.

### Subtask T014 – `results.ts`: switch, note and the storage-blocked state

**Purpose**: FR-004 and FR-006. The visitor decides; the view is off until they choose.

**Steps**:

1. Create `site/src/menu/results.ts` exporting one function:

   ```ts
   export function mountResults(section: HTMLElement, statusHost: HTMLElement): void
   ```

   `section` is the Results `section` (the caller adds the heading, as it does for the playground). `statusHost` is the menu host, where the status region goes (T017). Guard against a second mount with `section.dataset.resultsMounted`, as `mountPlayground` does.

2. Read the state once at mount:

   ```ts
   const root = document.documentElement;
   const viewOn = root.getAttribute('data-results-view') === 'on';
   const storageBlocked = viewOn
     ? root.getAttribute('data-results-storage') === 'unavailable'
     : !canReadSetting();
   ```

3. Build the switch: a wrapper `div.results__switch`, the checkbox, its label and the note. Set `role="switch"`, `aria-describedby="results-switch-note"`, and `checked = viewOn`.
4. On `change`:

   ```ts
   if (toggle.checked) {
     if (rememberOn() === 'saved') {
       window.location.reload();
       return;
     }
     showBlocked();          // uncheck, disable, blocked note
     return;
   }
   forget();
   const next = addressWithoutResults();
   const current =
     window.location.pathname + window.location.search + window.location.hash;
   if (next === current) {
     window.location.reload();
   } else {
     window.location.replace(next);
   }
   ```

   Why two branches for "off": a plain reload would re-read `?results=on` and turn the view straight back on. And assigning an address that differs only by nothing (same URL with a `#hash`) may not reload at all. `replace` keeps the `?results=on` address out of the Back history.

5. Storage states:

   | View | Storage | Switch | Note |
   |---|---|---|---|
   | off | fine | unchecked, enabled | normal |
   | off | blocked | unchecked, **disabled** | blocked |
   | on | fine | checked, enabled | normal |
   | on (by link) | blocked | checked, enabled; turning it off works as in step 4 | normal |

6. With the view off, stop here: the section holds the heading (from the caller), the switch and the note, and nothing else. No list, no empty state, no status region content.

**Files**: `site/src/menu/results.ts` (new)

**Validation**:
- [ ] View off: toggling on writes the key and reloads; after the reload the switch is checked.
- [ ] View on by `/?results=on`: toggling off lands on `/` (plus any `scenario`), with the key removed and the switch unchecked.
- [ ] View on by switch on `/basket/`: toggling off reloads `/basket/`.
- [ ] The label is clickable and toggles the switch; the note is announced as its description.

**Edge cases**:
- The scenario switcher adds `?scenario=correct` to the address with `replaceState` at page load. `addressWithoutResults()` keeps it, which is right.
- A failed `rememberOn()` (storage readable but not writable): uncheck, disable, show the blocked note. No reload.
- The checkbox is checked from the attribute, not from storage, so "on by link with storage blocked" shows as on.

### Subtask T015 – Empty states and listening

**Purpose**: FR-010. Tell the attendee why they see nothing.

**Steps**:

1. Only when the view is on. Read `const state = window.__demoShopResults;`. If it is `undefined` although the attribute says on (it shouldn't happen), treat it as "banner not seen, no entries" and don't throw.
2. Create one `p.results__empty` and one `ul.results__list`.
3. Write a `render()` function that decides what shows, from `data-model.md`:

   | `bannerSeen` | rows | Shown |
   |---|---|---|
   | false | none | the "hasn't loaded" message |
   | true | none | `No output yet` |
   | either | 1 or more | the list; the message element is removed from the section |

4. Register the one listener: `state.listen(sync)`. `sync` adds rows for new entries (T016), then calls `render()`. `listen` calls it once at once if anything arrived before the module mounted (research R-10); also call `render()` once yourself after registering, so the first empty state shows even when nothing has arrived.
5. The first message gives way to the second as soon as the banner arrives, with no reload. That is just `sync` running again.

**Files**: `site/src/menu/results.ts`

**Validation**:
- [ ] `?results=on` with no Quadrano on the page (no `VITE_GTM_CONTAINER_ID`, or the offline build with no snippet): the "hasn't loaded" message.
- [ ] Offline build with a snippet stored: `No output yet`.
- [ ] In the first case, run `console.info('%cQuadrano%c · x · Console format v1', '', '')` in the Console: the message changes to `No output yet` at once.

**Edge cases**:
- On a slow connection an attendee may briefly see "hasn't loaded" before GTM arrives. The section updates itself. This is accepted (research R-10).
- `sync` is called from inside a Console wrapper. Keep it small, and never let it throw past its own `try`/`catch`.

### Subtask T016 – Rows

**Purpose**: FR-001, FR-002, FR-003. One row per entry, newest first, with the runtime's text and nothing else.

**Steps**:

1. Track the last entry already shown by **object identity**:

   ```ts
   let lastShown: DemoShopResultEntry | null = null;

   function sync(): void {
     const entries = state.entries;
     const from = lastShown === null ? 0 : entries.indexOf(lastShown) + 1;
     for (let index = from; index < entries.length; index += 1) {
       const entry = entries[index];
       if (entry !== undefined) {
         list.prepend(rowFor(entry));
         lastShown = entry;
       }
     }
     while (list.children.length > 50) {
       list.lastElementChild?.remove();
     }
     render();
   }
   ```

   If `lastShown` has been dropped from `entries`, `indexOf` gives `-1` and `from` is `0`. That can't happen in practice (the listener runs after every change), and the result would be repeated rows, so add a guard: when `indexOf` is `-1` and `lastShown` isn't `null`, clear the list first.

2. `rowFor(entry)` for a result (`kind: 'group'`):

   ```html
   <li class="results__row">
     <details class="results__result">
       <summary class="results__header">…header…</summary>
       <p class="results__line">…line 1…</p>
       <p class="results__line">…line 2…</p>
       <pre class="results__pushed">…pushed…</pre>
     </details>
   </li>
   ```

   - One `p.results__line` per entry in `lines`, in order. None when `lines` is empty.
   - The `pre` only when `pushed` isn't `null`.
   - Rows start collapsed. Each `details` opens and closes on its own; don't close others.

3. `rowFor(entry)` for a plain line (`kind: 'line'`): `<li class="results__row"><p class="results__plain">…text…</p></li>`. No `details` (research R-07).
4. **Every string is set with `textContent`.** Never `innerHTML`, `insertAdjacentHTML` or `outerHTML`. A pushed value that looks like markup must show as text and add no element (spec, Edge Cases).
5. Prepending keeps existing rows and their open state untouched. Don't re-render the whole list.

**Files**: `site/src/menu/results.ts`

**Validation**:
- [ ] Press `add_to_cart` then `purchase · 1 · Missing value`: the purchase row is first.
- [ ] Expand the second row, press another button: the second row is still expanded.
- [ ] Row text against the Console, for one push with problems and one with none.
- [ ] In the Console: `console.groupCollapsed('%c?%c %s','','','<img src=x onerror=alert(1)>'); console.groupEnd();` → the row shows that text literally; `document.querySelector('.results img')` is `null`.
- [ ] A 51st entry leaves 50 rows.

### Subtask T017 – Status region; announce without moving focus

**Purpose**: FR-013, SC-007 (research R-09).

**Steps**:

1. Only when the view is on, create `p#results-status` with class `visually-hidden` and `role="status"`, and append it to `statusHost` (the `aside.visitor-menu-host`). It must sit **outside** `#visitor-menu`: a region inside a hidden panel isn't announced, and results from shop actions arrive while the menu is closed.
2. Don't use the layout's live region or the `announce` function passed to the menu. The playground writes "Pushed …" there on the same press, and one message would overwrite the other.
3. For each new entry, set the region to the entry's header (result) or text (plain line). Clear it first so a repeated header is announced again:

   ```ts
   status.textContent = '';
   status.textContent = text;
   ```

4. Entries that were already there when the module mounted are shown at once, but only the **newest** is announced. One announcement, not a burst.
5. Never call `focus()` anywhere in this module. Never scroll the panel.

**Files**: `site/src/menu/results.ts`

**Validation**:
- [ ] Focus a playground button, press Enter: `#results-status` holds the new header and `document.activeElement` is still the button.
- [ ] With the menu closed, add something to the basket on the product page (shop's container path): the region still updates.
- [ ] View off: `#results-status` doesn't exist.

### Subtask T018 – Mount in `visitor-menu.ts`; guidance copy

**Purpose**: FR-001 (place) and FR-016 (menu guidance).

**Steps**:

1. In `site/src/menu/visitor-menu.ts`, import `mountResults` from `./results.ts`.
2. After the playground section is built, build the Results section the same way:

   ```ts
   // Results (on-page results mirror, FR-001): repeats the runtime's Console output.
   const results = document.createElement('section');
   results.className = 'visitor-menu__group results';
   const resultsHeading = document.createElement('h3');
   resultsHeading.textContent = 'Results';
   results.append(resultsHeading);
   ```

3. Add it to the panel directly after the playground:

   ```ts
   panel.append(title, close, status, path1, path2, playground, results);
   host.append(toggle, panel);
   mountResults(results, host);
   ```

   Call `mountResults` after `host.append(toggle, panel)` so the status region lands after the panel in the host.

4. Change two strings, exactly as `contracts/results-view.md` gives them:

   | Constant | New text |
   |---|---|
   | `PATH_1_HINT` | `Open the browser Console to see the output. On a phone, turn on Results below.` |
   | last entry of `INSTRUCTION_STEPS` | `Open the browser Console, or turn on Results below, and use the event playground.` |

5. Change nothing else in this file. Opening and closing the menu must still make no push and move focus as they do today.

**Files**: `site/src/menu/visitor-menu.ts`

**Validation**:
- [ ] The Results section is the last group in the panel, directly under the Event playground.
- [ ] Both strings read as above.
- [ ] `pnpm test:e2e` still passes as it stands (no existing test asserts the two old strings; confirm with a search before you run it).

### Subtask T019 – Styles

**Purpose**: NFR-001 and NFR-002. Nothing overflows at 360 px; controls are easy to hit.

**Steps**:

1. Add a block to `site/src/ui/styles.css` after the playground rules:

   | Selector | What it needs |
   |---|---|
   | `.results__switch` | flex row, wraps, `gap`, `min-height: 44px`, items centred |
   | `#results-switch` | at least 24 × 24 px; keeps the browser's focus ring (add it to the `:focus-visible` rule list if it has none) |
   | `.results__note`, `.results__empty` | margin as `.visitor-menu__note`; colour from existing variables |
   | `.results__list` | no bullets, no padding, column with a gap |
   | `.results__row` | a border or background from existing variables so rows read as separate |
   | `.results__header` | `min-height: 44px`, `cursor: pointer`, `overflow-wrap: anywhere` |
   | `.results__line`, `.results__plain` | `overflow-wrap: anywhere`, small margin |
   | `.results__pushed` | `white-space: pre-wrap`, `overflow-wrap: anywhere`, `margin: 0`, `max-width: 100%`, a smaller font size |

2. `pre` defaults to `white-space: pre`, which overflows on a phone. `pre-wrap` is what makes long pushed objects wrap inside the menu.
3. Use only the existing custom properties (`--paper`, `--line`, `--ink`, `--muted`, `--focus`, `--wash`). Check any muted text against its background for 4.5:1 contrast.
4. `summary` needs a visible focus ring. Add `summary:focus-visible` to the existing focus-ring rule if the browser default isn't visible against the panel.

**Files**: `site/src/ui/styles.css`

**Validation**:
- [ ] At 360 px wide, with 5 results and 2 expanded: `document.documentElement.scrollWidth - document.documentElement.clientWidth` is `0`.
- [ ] A pushed value of 300 characters with no spaces wraps inside the panel.
- [ ] Tab reaches the switch and each `summary`; each shows a focus ring; Enter and Space toggle a row.

---

## Definition of Done

- [ ] Section, names and copy match the tables above.
- [ ] Off: heading, switch, note only.
- [ ] On: both empty states, rows newest first, plain-line rows, limit of 50.
- [ ] Switch on and off behave as in T014, including with `?results=on` in the address and with storage blocked.
- [ ] Status region outside the panel; focus never moved.
- [ ] `textContent` only; no markup from Console text.
- [ ] No import of `push.ts`; no `dataLayer`; no Console use.
- [ ] Two guidance strings changed.
- [ ] `pnpm gates` passes; the existing `pnpm test:e2e` still passes.
- [ ] `spec-kitty agent tasks mark-status T013 T014 T015 T016 T017 T018 T019 --status done --mission on-page-results-mirror-01M78JHF`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| "Off" with a plain reload while the address carries `?results=on` | `addressWithoutResults()` and the two-branch navigation in T014 |
| Announcements overwrite the playground's | Own status region (T017) |
| Markup from a pushed value rendered | `textContent` only; T016 validation |
| Rows lose their open state on each new result | Prepend only; never re-render |
| A storage write with the view off | `canReadSetting()` only reads |
| The fixed names drift from what the e2e WPs expect | The table in this prompt is the contract; change it only with a note to WP05 to WP07 |

## Review Guidance

- Search the three new or changed `.ts` files for `innerHTML`, `insertAdjacentHTML`, `focus(`, `dataLayer` and `console`. Expect none in `results.ts` and `results-setting.ts`.
- Check the copy against `contracts/results-view.md` character by character.
- With `?results=on`, turn the switch off and confirm the address no longer has `results` and `console.log` is native.
- Check the section at 360 px with long text.
- Re-run `pnpm gates` and `pnpm test:e2e` yourself.

## Activity Log

- 2026-11-12T20:26:16Z – system – Prompt generated via /spec-kitty.tasks
