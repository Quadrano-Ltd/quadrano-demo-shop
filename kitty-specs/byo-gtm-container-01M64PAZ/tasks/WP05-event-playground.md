---
work_package_id: WP05
title: Event playground module
dependencies: []
requirement_refs:
- FR-014
- FR-015
- FR-016
- FR-018
- NFR-005
- C-003
planning_base_branch: feat/byo-gtm-container
merge_target_branch: feat/byo-gtm-container
branch_strategy: Planning artifacts for this mission were generated on feat/byo-gtm-container. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/byo-gtm-container unless the human explicitly redirects the landing branch.
subtasks:
- T018
- T019
- T020
- T021
phase: Phase 3 - User stories
history:
- at: '2026-10-29T22:01:50Z'
  actor: system
  action: Prompt generated via /spec-kitty.tasks
agent_profile: frontend-freddy
authoritative_surface: site/src/menu/playground.ts
create_intent:
- site/src/menu/playground.ts
execution_mode: code_change
model: ''
owned_files:
- site/src/menu/playground.ts
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# Work Package Prompt: WP05 – Event playground module

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

Build `site/src/menu/playground.ts`: a function that renders the **event playground** (7 buttons) into a container element given to it. Each press makes **exactly one** existing push through `push.ts`, so shapes are unchanged by construction (FR-014, FR-015, FR-016, C-003).

WP06 imports this module and mounts it inside the visitor menu panel. This WP doesn't touch the menu, layout or styles. Develop and check it by mounting into a scratch element (T021).

**Done when**:
- `mountPlayground(container, announce)` renders 7 native buttons in the contract's order with the contract's labels;
- each press adds exactly `[{ ecommerce: null }, <event>]` to `window.dataLayer` (2 entries), with the documented shape;
- a press changes nothing else: not the address, the scenario switcher, the basket, the order store or storage;
- mounting twice into the same container doesn't duplicate buttons or listeners;
- `pnpm gates` passes.

## Context & Constraints

- **Read first**: `contracts/playground-pushes.md` (the whole file is the spec), `data-model.md` "Playground push", `research.md` R-07 (beside the switcher, not absorbing it).
- **Push contract** (single source of every shape): `kitty-specs/demo-shop-01M5QW5Y/contracts/datalayer-pushes.md`.
- **APIs you consume** (read the real files):
  - `site/src/datalayer/push.ts`: `pushAddToCart(line: PushLine)`, `pushPurchase({ transactionId, lines, scenario })`. It's the **only** `dataLayer` writer (lint enforces this). It pushes `{ ecommerce: null }` and then the event.
  - `site/src/datalayer/events.ts`: `newTransactionId()`, `type PushLine` (`itemId`, `name`, `pricePence`, `quantity`).
  - `site/src/datalayer/scenarios.ts`: `SCENARIOS` (sorted by talk-script order; each has `id`, `label`), `type ScenarioId`.
  - `site/src/shop/catalogue.ts`: `getProductOrHero`, `HERO_PRODUCT_ID`.
- **Lint rules for `site/**`**: no `dataLayer` access outside `push.ts`; no Console; no network; no verdict wording in string literals or templates (✓ ✗ ⚠ ✅ ❌, pass/passed/passes, fail/failed/fails/failure, valid, invalid; case-insensitive, whole words). Scenario labels already avoid these.
- **No import of `site/src/ui/layout.ts`**: `layout.ts` will import the menu (WP06), which imports this file. Take `announce` as a parameter to avoid an import cycle.
- **NFR-005**: any push in at most 2 interactions (open menu, press button). So the buttons must be directly visible in the playground section, not nested behind another disclosure or a select.

## Branch Strategy

- **Planning base branch**: `feat/byo-gtm-container`
- **Final merge target**: `feat/byo-gtm-container`
- Execution worktrees are allocated per computed lane from `lanes.json`. This WP has no dependencies and can start immediately.

```bash
spec-kitty agent action implement WP05 --agent <name> --mission byo-gtm-container-01M64PAZ
```

---

## Subtasks & Detailed Guidance

### Subtask T018 – Button model

**Purpose**: A data list of 7 entries, derived so a future scenario can't be missing (contract: "Buttons 2 to 7 come from iterating `SCENARIOS` in order").

**Steps**:

1. Build the hero line once:

   ```ts
   function heroLine(): PushLine {
     const hero = getProductOrHero(HERO_PRODUCT_ID);
     return { itemId: hero.itemId, name: hero.name, pricePence: hero.pricePence, quantity: 1 };
   }
   ```

   This gives `SKU-1001`, `Stoneware Mug`, `1299`, `1`, so purchase `value` is `12.99`, matching the contract's example messages.

2. Model:

   ```ts
   interface PlaygroundEntry {
     readonly label: string;
     readonly press: () => void;
   }

   function entries(): readonly PlaygroundEntry[] {
     const line = heroLine();
     return [
       { label: 'add_to_cart', press: () => pushAddToCart(line) },
       ...SCENARIOS.map((scenario) => ({
         label: `purchase · ${scenario.label}`,
         press: () =>
           pushPurchase({ transactionId: newTransactionId(), lines: [line], scenario: scenario.id }),
       })),
     ];
   }
   ```

3. Expected labels, in order (from the contract):
   1. `add_to_cart`
   2. `purchase · Correct`
   3. `purchase · 1 · Missing value`
   4. `purchase · 2 · Value as text`
   5. `purchase · 3 · Wrong-case key`
   6. `purchase · 4 · Lower-case currency`
   7. `purchase · Spare · Bad transaction ID`

**Notes**:
- `newTransactionId()` is called **per press**, inside `press`, not once at build time.
- The scenario is fixed per button and **independent** of `?scenario=` and the header switcher (R-07). Don't read `currentScenario()`.

### Subtask T019 – `mountPlayground`

**Purpose**: Render the section and wire one listener per button.

**Steps**:

1. Public API:

   ```ts
   /**
    * Renders the event playground into `container`: one button per existing push
    * (FR-014). Each press makes exactly one push through push.ts (FR-015). Safe to
    * call twice: the second call does nothing.
    */
   export function mountPlayground(
     container: HTMLElement,
     announce: (message: string) => void,
   ): void;
   ```

2. Structure (WP06 provides the surrounding `<section>` and heading "Event playground"; this function renders the list):

   ```html
   <p class="playground__intro">Each button makes one push to the data layer.</p>
   <ul class="playground__list">
     <li><button type="button" class="playground__button">add_to_cart</button></li>
     …7 items…
   </ul>
   ```

   - Native `<button type="button">`, text content only (`textContent`, never `innerHTML`).
   - One `click` listener per button. Native buttons fire `click` for Enter and Space, so don't add key handlers (that would double-push).
3. Intro copy: keep it neutral and short. No verdict words. Use "push" and "data layer"; never "test event", "parameter" or "field".

### Subtask T020 – Announce, no side effects, double-mount guard

**Steps**:

1. After calling `entry.press()`, call `announce(\`Pushed ${entry.label}\`)`. The contract wording is "Pushed <button label>", neutral, no verdict.
2. Double-mount guard: if `container.dataset.playgroundMounted === 'true'`, return immediately; otherwise set it before rendering. (WP06 also mounts once, but this guard makes a double push impossible from this module.)
3. Side-effect audit. Confirm the module:
   - doesn't import `switcher/*`, `shop/basket-store.ts`, `shop/order-store.ts`, `container/*`;
   - doesn't call `history.*` or touch `location`;
   - doesn't read or write storage;
   - doesn't reference `dataLayer` (lint will catch it).
4. Don't `preventDefault` or `stopPropagation` anything; nothing to prevent on a `type="button"`.

### Subtask T021 – Manual data layer check

**Purpose**: Evidence before WP06 wires it in and WP09 automates it.

**Steps** (scratch only; do **not** commit the scratch wiring):

1. Temporarily, in a page entry module (for example `site/src/pages/listing.ts`), mount into a scratch `<div>` appended to `<main>`, with `announce` from `layout.ts`. Revert before committing; that file isn't owned by this WP.
2. `pnpm dev`, open the listing page, open DevTools Console, then for each button:
   - `const before = window.dataLayer.length;` press the button; `window.dataLayer.slice(before)`
   - expect exactly 2 entries: `{ ecommerce: null }` and the event.
3. Compare each event with the contract file:
   - `add_to_cart`: `currency: 'GBP'`, `value: 12.99`, one item `SKU-1001` / `Stoneware Mug` / `12.99` / `1`.
   - `purchase · Correct`: `transaction_id` matching `T-` and 6 digits, `currency: 'GBP'`, `value: 12.99`, same item.
   - Each broken scenario differs from the correct purchase in exactly one way (missing `value`; `value: '12.99'` string; `transaction_ID` key; `currency: 'gbp'`; `transaction_id: '12345'`).
4. Confirm the address bar, the header Scenario select and the basket badge didn't change after 7 presses.
5. Mount twice into the same element → still 7 buttons; one press → 2 entries.
6. Record results in the Activity Log (a compact table: button, entries added, shape checked).
7. Revert the scratch wiring; `pnpm gates` passes.

---

## Definition of Done

- [ ] `site/src/menu/playground.ts` exports `mountPlayground(container, announce)`.
- [ ] 7 buttons, contract labels and order, derived from `SCENARIOS`.
- [ ] Each press: exactly 2 data layer entries, documented shape; announcement "Pushed <label>".
- [ ] No side effects; double-mount safe; no layout import.
- [ ] Scratch wiring reverted; `pnpm gates` passes.
- [ ] `spec-kitty agent tasks mark-status T018 T019 T020 T021 --status done --mission byo-gtm-container-01M64PAZ`.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Double push from duplicate listeners | Dataset guard; click listener only |
| Scenario leakage from the address | Fixed scenario per button; no `currentScenario()` |
| Import cycle with `layout.ts` | `announce` injected |
| Verdict words in copy | Lint; neutral wording |

## Review Guidance

- Labels and calls match `contracts/playground-pushes.md` table rows 1 to 7.
- `newTransactionId()` is called per press.
- No imports beyond `datalayer/*` and `shop/catalogue.ts`.

## Activity Log

- 2026-10-29T22:01:50Z – system – Prompt generated via /spec-kitty.tasks
